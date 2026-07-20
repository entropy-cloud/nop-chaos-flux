import { useEffect, useRef, useState } from 'react';
import { Trash2Icon, UploadCloudIcon, XIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  ActionResult,
  ActionSchema,
  RendererComponentProps,
} from '@nop-chaos/flux-core';
import { useInputComponentHandle, useRenderScope, useRendererRuntime } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn } from '@nop-chaos/ui';
import {
  formFieldRules,
  useFormFieldController,
} from '@nop-chaos/flux-renderers-form';
import {
  normalizeUploadValue,
  readUploadValue,
  type UploadItemState,
  type UploadResultItem,
  type UploadValueMode,
} from './upload-schemas.js';

const FILE_FIELD_METHODS = ['clear', 'focus'] as const;

const UPLOAD_CAPABILITY_CONTRACTS = [
  {
    handle: 'clear',
    displayName: 'Clear',
    description: 'Clear the uploaded file value to undefined.',
  },
  {
    handle: 'focus',
    displayName: 'Focus',
    description: 'Focus the upload trigger.',
  },
] as const;

export interface UploadFieldRenderOptions {
  kind: 'file' | 'image';
  marker: string;
  /**
   * Optional preview node for a successfully uploaded item (image thumbnail).
   * When omitted, the default file-row rendering is used.
   */
  renderPreview?: (item: UploadResultItem) => ReactNode;
}

function resolveValueMode(
  raw: unknown,
  multiple: boolean,
): UploadValueMode {
  if (raw === 'url' || raw === 'object' || raw === 'array') {
    return raw;
  }
  return multiple ? 'array' : 'url';
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function readResultItem(result: ActionResult): UploadResultItem | undefined {
  const data = result.data;
  if (data && typeof data === 'object') {
    const candidate = data as Record<string, unknown>;
    if (typeof candidate.url === 'string') {
      return { ...candidate, url: candidate.url } as UploadResultItem;
    }
    // Some hosts wrap the payload under a `data`/`result` key.
    const inner = candidate.data ?? candidate.result;
    if (inner && typeof inner === 'object' && typeof (inner as { url?: unknown }).url === 'string') {
      return inner as UploadResultItem;
    }
  }
  if (typeof data === 'string' && data) {
    return { url: data };
  }
  return undefined;
}

function toUploadError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error) {
    return error;
  }
  return t('flux.form.uploadFailed');
}

/**
 * Shared upload field for input-file / input-image. The renderer never performs
 * the upload itself: it dispatches the host `uploadAction` (an action
 * reference) per selected file and writes the bridged result back to the field
 * value. No request is issued at mount (request-sink constraint — design §9).
 */
export function UploadFieldRenderer(
  props: RendererComponentProps,
  options: UploadFieldRenderOptions,
) {
  const name = String(props.props.name ?? '');
  const multiple = props.props.multiple === true;
  const accept =
    typeof props.props.accept === 'string' && props.props.accept
      ? props.props.accept
      : undefined;
  const maxFiles =
    typeof props.props.maxFiles === 'number' && props.props.maxFiles > 0
      ? Math.floor(props.props.maxFiles)
      : undefined;
  const maxSize =
    typeof props.props.maxSize === 'number' && props.props.maxSize > 0
      ? props.props.maxSize
      : undefined;
  const valueMode = resolveValueMode(props.props.valueMode, multiple);
  const buttonText =
    typeof props.props.buttonText === 'string' && props.props.buttonText
      ? props.props.buttonText
      : multiple
        ? t('flux.form.uploadFiles')
        : t('flux.form.uploadFile');
  const uploadAction = props.props.uploadAction as ActionSchema | ActionSchema[] | undefined;
  const deleteAction = props.props.deleteAction as ActionSchema | ActionSchema[] | undefined;
  const placeholder =
    typeof props.props.placeholder === 'string' && props.props.placeholder
      ? props.props.placeholder
      : undefined;

  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();

  const { value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });

  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [items, setItems] = useState<UploadItemState[]>([]);
  const [missingAction, setMissingAction] = useState(false);

  // G11: track mount state and in-flight upload abort controllers so that
  // unmounting the field (a) cancels pending uploads via their abort signal and
  // (b) prevents any late `onChange` write into the now-unmounted field.
  const mountedRef = useRef(true);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  useEffect(() => {
    // `abortControllersRef.current` is never reassigned (the Map is mutated in
    // place), so capturing it here is equivalent to reading `.current` at
    // cleanup time and satisfies the exhaustive-deps ref-stability check.
    const controllers = abortControllersRef.current;
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const controller of controllers.values()) {
        controller.abort();
      }
      controllers.clear();
    };
  }, []);

  const errorId = name ? `${name}-error` : undefined;
  const interactive = presentation.interactive;

  useInputComponentHandle({
    id: props.id,
    name,
    type: options.kind === 'image' ? 'input-image' : 'input-file',
    cid: props.meta.cid,
    methods: FILE_FIELD_METHODS,
    getFocusTarget: () => triggerRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => clearAll(),
  });

  // Mirror handlers so useInputComponentHandle stays stable without re-creating it.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // The field value is the source of truth, but parallel uploads must not race
  // on the reactive `value` closure. We mirror the latest committed value into
  // a ref and update it synchronously inside commitItems so concurrent uploads
  // accumulate correctly (each read+append+commit block is synchronous).
  const latestValueRef = useRef<unknown>(value);
  latestValueRef.current = value;

  function commitItems(successItems: UploadResultItem[]) {
    const next = normalizeUploadValue(successItems, valueMode, multiple);
    latestValueRef.current = next;
    handlersRef.current.onChange(next);
  }

  function existingItems(): UploadResultItem[] {
    return readUploadValue(value, multiple);
  }

  function committedItems(): UploadResultItem[] {
    return readUploadValue(latestValueRef.current, multiple);
  }

  async function performUpload(file: File, id: string) {
    if (!uploadAction) {
      setMissingAction(true);
      setItems((prev) =>
        prev.map((entry) =>
          entry.id === id
            ? {
                status: 'error',
                id,
                name: file.name,
                message: t('flux.form.uploadActionMissing'),
              }
            : entry,
        ),
      );
      return;
    }

    setMissingAction(false);
    const uploadScope = runtime.createChildScope(parentScope, {
      __uploadFile: { name: file.name, size: file.size, type: file.type },
      __uploadFileRef: file,
    });

    const controller = new AbortController();
    abortControllersRef.current.set(id, controller);

    try {
      const result: ActionResult = await props.helpers.dispatch(uploadAction, {
        scope: uploadScope,
        signal: controller.signal,
      });
      // G11: cancellation (user cancel or field unmount) aborts the controller.
      // Treat an aborted upload as cancelled regardless of how the dispatcher
      // settled the action, so the pending entry is removed and no value is written.
      if (!mountedRef.current) {
        return;
      }
      if (controller.signal.aborted) {
        setItems((prev) => prev.filter((entry) => entry.id !== id));
        return;
      }
      if (!result.ok || result.cancelled) {
        throw new Error(
          typeof result.error === 'string'
            ? result.error
            : (result.error as { message?: string } | undefined)?.message ??
              t('flux.form.uploadFailed'),
        );
      }
      const item = readResultItem(result);
      if (!item) {
        throw new Error(t('flux.form.uploadNoResult'));
      }
      const successItems = multiple ? [...committedItems(), item] : [item];
      setItems((prev) =>
        prev.map((entry) =>
          entry.id === id ? { status: 'done', id, name: file.name, item } : entry,
        ),
      );
      commitItems(successItems);
      void props.events.onUploadSuccess?.({
        type: 'upload-success',
        file: { name: file.name, size: file.size, type: file.type },
        item,
      });
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      if (controller.signal.aborted || isAbortError(error)) {
        setItems((prev) => prev.filter((entry) => entry.id !== id));
        return;
      }
      setItems((prev) =>
        prev.map((entry) =>
          entry.id === id
            ? { status: 'error', id, name: file.name, message: toUploadError(error) }
            : entry,
        ),
      );
      void props.events.onUploadError?.({
        type: 'upload-error',
        file: { name: file.name, size: file.size, type: file.type },
        error: toUploadError(error),
      });
    } finally {
      abortControllersRef.current.delete(id);
      runtime.disposeScope(uploadScope.id);
    }
  }

  function cancelUpload(id: string) {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
    }
  }

  function rejectFile(file: File, reason: string) {
    void props.events.onReject?.({
      type: 'reject',
      file: { name: file.name, size: file.size, type: file.type },
      reason,
    });
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return;
    }
    let selected = Array.from(fileList);

    // Client-side maxSize validation (U6).
    if (maxSize !== undefined) {
      const oversized: File[] = [];
      const valid: File[] = [];
      for (const file of selected) {
        if (file.size > maxSize) {
          oversized.push(file);
          rejectFile(file, t('flux.form.fileTooLarge', { defaultValue: 'File exceeds maximum size' }));
        } else {
          valid.push(file);
        }
      }
      selected = valid;
      if (selected.length === 0) {
        if (inputRef.current) {
          try { inputRef.current.value = ''; } catch { /* best-effort */ }
        }
        return;
      }
    }

    if (!multiple) {
      selected = selected.slice(0, 1);
      setItems([]);
    } else if (maxFiles) {
      const remaining = Math.max(0, maxFiles - committedItems().length);
      selected = selected.slice(0, remaining);
    }

    const newEntries: UploadItemState[] = selected.map((file) => ({
      status: 'pending',
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
    }));
    setItems((prev) => (multiple ? [...prev, ...newEntries] : newEntries));
    handlersRef.current.onFocus();

    await Promise.all(
      selected.map((file, index) => performUpload(file, newEntries[index]!.id)),
    );

    if (inputRef.current) {
      try {
        inputRef.current.value = '';
      } catch {
        // Some test/non-browser environments mark `value` read-only; resetting
        // is a best-effort UX nicety (re-selecting the same file), not required.
      }
    }
  }

  async function removeExisting(index: number) {
    const item = committedItems()[index];

    void props.events.onDelete?.({
      type: 'delete',
      file: item ? { name: item.name, url: item.url, size: item.size } : undefined,
    });

    if (deleteAction && item) {
      const deleteScope = runtime.createChildScope(parentScope, {
        __deleteFile: { name: item.name, url: item.url, size: item.size },
      });
      try {
        const result: ActionResult = await props.helpers.dispatch(deleteAction, {
          scope: deleteScope,
        });
        if (result.ok) {
          void props.events.onDeleteSuccess?.({
            type: 'delete-success',
            file: { name: item.name, url: item.url, size: item.size },
          });
        } else {
          void props.events.onDeleteFail?.({
            type: 'delete-fail',
            file: { name: item.name, url: item.url, size: item.size },
            error: typeof result.error === 'string' ? result.error : 'Delete failed',
          });
        }
      } catch (error) {
        void props.events.onDeleteFail?.({
          type: 'delete-fail',
          file: { name: item.name, url: item.url, size: item.size },
          error: error instanceof Error ? error.message : 'Delete failed',
        });
      } finally {
        runtime.disposeScope(deleteScope.id);
      }
    }

    // H26: read from the committed-value ref (consistent with commitItems) so a
    // removal landing in the commit→re-render window does not operate on a stale
    // reactive `value` snapshot and lose/revive a just-completed upload.
    const next = committedItems().filter((_, idx) => idx !== index);
    commitItems(next);
  }

  function clearAll() {
    setItems([]);
    commitItems([]);
  }

  const existing = existingItems();
  const pending = items.filter((entry) => entry.status === 'pending');
  const errored = items.filter((entry) => entry.status === 'error');
  const showList = existing.length > 0 || items.length > 0;

  return (
    <div
      className={cn(options.marker, 'flex flex-col gap-2', props.meta.className)}
      data-slot="upload-field-control"
      data-upload-kind={options.kind}
      data-has-value={existing.length > 0 ? '' : undefined}
      data-pending={pending.length > 0 ? '' : undefined}
      data-error={errored.length > 0 ? '' : undefined}
      data-invalid={presentation.showError ? '' : undefined}
    >
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        multiple={multiple}
        accept={accept}
        data-testid={`${options.marker}-input`}
        onChange={(event) => {
          void handleFiles(event.target.files);
        }}
      />

      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        disabled={!interactive}
        aria-label={buttonText}
        aria-invalid={presentation.showError ? true : undefined}
        aria-describedby={presentation.showError ? errorId : undefined}
        data-testid={`${options.marker}-trigger`}
        onClick={() => inputRef.current?.click()}
      >
        <UploadCloudIcon className="size-4" />
        {buttonText}
      </Button>

      {placeholder && !showList ? (
        <p className="text-xs text-muted-foreground">{placeholder}</p>
      ) : null}

      {missingAction && !uploadAction ? (
        <p
          data-testid={`${options.marker}-missing-action`}
          className="text-xs text-destructive"
          role="alert"
        >
          {t('flux.form.uploadActionMissing')}
        </p>
      ) : null}

      {showList ? (
        <ul
          className={cn(
            'flex flex-col gap-1.5',
            options.kind === 'image' && multiple && 'flex-row flex-wrap',
          )}
          data-testid={`${options.marker}-list`}
        >
          {existing.map((entry, index) => (
            <li
              key={`existing-${entry.url}-${entry.name ?? ''}-${entry.size ?? ''}`}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-sm"
              data-testid={`${options.marker}-item`}
              data-item-status="done"
            >
              {options.renderPreview ? (
                options.renderPreview(entry)
              ) : (
                <span className="truncate" data-slot="upload-item-name">
                  {entry.name ?? entry.url}
                </span>
              )}
              {interactive ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${entry.name ?? entry.url}`}
                  data-testid={`${options.marker}-remove-${index}`}
                  onClick={() => removeExisting(index)}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
          {items.map((entry) => {
            if (entry.status === 'done') {
              return null;
            }
            return (
              <li
                key={entry.id}
                className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-2 py-1 text-sm"
                data-testid={`${options.marker}-item`}
                data-item-status={entry.status}
              >
                <span className="truncate">{entry.name}</span>
                {entry.status === 'pending' ? (
                  <>
                    <span
                      className="ml-auto text-xs text-muted-foreground"
                      data-slot="upload-pending"
                    >
                      {t('flux.form.uploading')}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('flux.form.cancel', { defaultValue: `Cancel ${entry.name}` })}
                      data-testid={`${options.marker}-cancel-${entry.id}`}
                      data-slot="upload-cancel"
                      onClick={() => cancelUpload(entry.id)}
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  </>
                ) : (
                  <span
                    className="ml-auto text-xs text-destructive"
                    data-slot="upload-error"
                  >
                    {entry.message}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {existing.length > 0 && interactive ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start text-xs"
          data-testid={`${options.marker}-clear`}
          onClick={clearAll}
        >
          {t('flux.form.clear')}
        </Button>
      ) : null}
    </div>
  );
}

export {
  FILE_FIELD_METHODS,
  UPLOAD_CAPABILITY_CONTRACTS,
  formFieldRules as uploadSharedFieldRules,
};
