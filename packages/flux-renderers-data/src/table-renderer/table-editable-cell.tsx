import { useEffect, useId, useRef, useState } from 'react';
import type { ActionSchema, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { useRendererEnv } from '@nop-chaos/flux-react';
import { Checkbox, Input, NativeSelect, NativeSelectOption, Spinner } from '@nop-chaos/ui';
import type {
  TableCellEditableConfig,
  TableCellEditableOption,
  TableColumnSchema,
  TableSchema,
} from '../schemas.js';
import { createDraftScopeStore, isExplicitActionFailure } from './table-quick-edit-controller.js';
import { warnOnce } from './warn-once.js';

const EDITABLE_EDITORS = new Set(['text', 'number', 'select', 'date', 'checkbox']);

export interface ResolvedTableEditableConfig {
  editor: 'text' | 'number' | 'select' | 'date' | 'checkbox';
  options: TableCellEditableOption[];
  required: boolean;
}

/**
 * D1 G-D: resolve the column-level cell-edit declaration. `undefined` = the
 * cell stays read-only (undeclared / invalid editor / missing column name) —
 * each fallback carries a one-time dev warn.
 */
export function resolveTableEditableConfig(
  column: TableColumnSchema,
): ResolvedTableEditableConfig | undefined {
  const declared = column.editable;
  if (declared === undefined || declared === false || declared === null) {
    return undefined;
  }

  if (!column.name) {
    warnOnce(
      'gd-cell-edit-no-name',
      `[flux:table] gd-cell-edit-no-name: editable column without a "name" stays read-only.`,
    );
    return undefined;
  }

  if (declared === true) {
    return { editor: 'text', options: [], required: false };
  }

  const config = declared as TableCellEditableConfig;
  if (config.editor !== undefined && !EDITABLE_EDITORS.has(config.editor)) {
    warnOnce(
      'gd-cell-edit-no-editor',
      `[flux:table] gd-cell-edit-no-editor: editable editor "${String(config.editor)}" has no matching editor; the column falls back to read-only.`,
    );
    return undefined;
  }

  const options = Array.isArray(config.options)
    ? config.options.filter(
        (option): option is TableCellEditableOption =>
          Boolean(option) && typeof option === 'object' && !Array.isArray(option),
      )
    : [];

  return {
    editor: config.editor ?? 'text',
    options,
    required: config.required === true,
  };
}

/**
 * Field-override draft row scope for the one-shot cell save dispatch — the
 * same field/$slot.record override semantics as the quickEdit controller's
 * draftRowScope (CX-10: the action reads the edited value without mutating the
 * row before the save is confirmed).
 */
function createCellDraftScope(
  rowScope: ScopeRef,
  field: string,
  recordOverride: Record<string, unknown>,
): ScopeRef {
  const draftScopeStore = createDraftScopeStore(() => ({
    ...rowScope.readVisible(),
    ...recordOverride,
    $slot: {
      ...((rowScope.readVisible().$slot as Record<string, unknown> | undefined) ?? {}),
      record: recordOverride,
    },
  }));

  return {
    ...rowScope,
    store: draftScopeStore.store,
    get(path: string) {
      if (path === field || path === `$slot.record.${field}`) {
        return recordOverride[field];
      }
      if (path === '$slot') {
        const slot = rowScope.get('$slot') as { record: unknown; index: number } | undefined;
        return { ...(slot ?? {}), record: recordOverride };
      }
      if (path === '$slot.record') {
        return recordOverride;
      }
      return rowScope.get(path);
    },
    has(path: string) {
      if (
        path === field ||
        path === `$slot.record.${field}` ||
        path === '$slot' ||
        path === '$slot.record'
      ) {
        return true;
      }
      return rowScope.has(path);
    },
    readOwn() {
      const own = rowScope.readOwn();
      return {
        ...own,
        [field]: recordOverride[field],
        $slot: {
          ...((own.$slot as Record<string, unknown> | undefined) ?? {}),
          record: recordOverride,
        },
      };
    },
    readVisible() {
      const visible = rowScope.readVisible();
      return {
        ...visible,
        [field]: recordOverride[field],
        $slot: {
          ...((visible.$slot as Record<string, unknown> | undefined) ?? {}),
          record: recordOverride,
        },
      };
    },
    materializeVisible() {
      const visible = rowScope.materializeVisible();
      return {
        ...visible,
        [field]: recordOverride[field],
        $slot: {
          ...((visible.$slot as Record<string, unknown> | undefined) ?? {}),
          record: recordOverride,
        },
      };
    },
    update(path: string, value: unknown) {
      if (path === field || path === `$slot.record.${field}`) {
        recordOverride[field] = value;
        draftScopeStore.publish({ paths: [field, '$slot.record'], kind: 'update' });
        return;
      }
      rowScope.update(path, value);
    },
  };
}

export interface TableEditableCellProps {
  column: TableColumnSchema;
  rowScope: ScopeRef;
  record: Record<string, unknown>;
  helpers: RendererComponentProps<TableSchema>['helpers'];
  quickSaveAction?: ActionSchema;
  quickSaveItemAction?: ActionSchema;
}

export function TableEditableCell(props: TableEditableCellProps) {
  const { column, rowScope, record, helpers, quickSaveAction, quickSaveItemAction } = props;
  const env = useRendererEnv();
  const field = column.name!;
  const config = resolveTableEditableConfig(column)!;
  const saveAction = quickSaveItemAction ?? quickSaveAction;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  // 20-04: stable association between both editor branches and the error span
  // (aria-describedby needs a real id — the error text alone is a visual-only
  // channel otherwise).
  const errorId = useId();
  // Local display override after a successful commit — the default cell reads
  // the (identity-stable) record object, so the committed value must be kept
  // here for the navigation state to render the new value.
  const [committedValue, setCommittedValue] = useState<unknown>(undefined);
  const saveGenerationRef = useRef(0);
  const lastRecordRef = useRef(record);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Honest reset: an upstream record swap invalidates the local commit mirror.
  if (record !== lastRecordRef.current) {
    lastRecordRef.current = record;
    if (committedValue !== undefined) {
      setCommittedValue(undefined);
    }
  }

  useEffect(() => {
    return () => {
      saveGenerationRef.current += 1;
    };
  }, []);

  const rawValue = getIn(record, field);
  const displayValue =
    committedValue !== undefined ? String(committedValue ?? '') : String(rawValue ?? '');

  const focusNavigationState = () => {
    containerRef.current?.focus();
  };

  const beginEdit = () => {
    if (config.editor === 'checkbox') {
      return;
    }
    setDraft(rawValue == null ? '' : String(rawValue));
    setError(undefined);
    setEditing(true);
  };

  const parseDraft = (): { value: unknown } | { error: string } => {
    if (config.editor === 'number') {
      const text = draft.trim();
      if (text === '') {
        return config.required ? { error: t('flux.table.editableRequired') } : { value: null };
      }
      const numeric = Number(text);
      if (!Number.isFinite(numeric)) {
        return { error: t('flux.table.editableInvalidNumber') };
      }
      return { value: numeric };
    }
    if (config.editor === 'select') {
      if (draft === '') {
        return config.required ? { error: t('flux.table.editableRequired') } : { value: null };
      }
      const matched = config.options.find((option) => String(option.value) === draft);
      return { value: matched ? matched.value : draft };
    }
    if (config.editor === 'date') {
      if (draft === '' && config.required) {
        return { error: t('flux.table.editableRequired') };
      }
      return { value: draft };
    }
    if (draft === '' && config.required) {
      return { error: t('flux.table.editableRequired') };
    }
    return { value: draft };
  };

  const commit = async (): Promise<void> => {
    const parsed = parseDraft();
    if ('error' in parsed) {
      // gd-cell-edit-invalid: commit blocked, error surfaced, editing state kept.
      setError(parsed.error);
      return;
    }

    const nextValue = parsed.value;
    const current = committedValue !== undefined ? committedValue : rawValue;
    const unchanged =
      nextValue === null
        ? current == null || current === ''
        : String(nextValue) === String(current ?? '');
    if (unchanged) {
      setEditing(false);
      setError(undefined);
      focusNavigationState();
      return;
    }

    if (!saveAction) {
      // Pure client-side channel: scope write, zero dispatch, zero events.
      rowScope.update(field, nextValue);
      setCommittedValue(nextValue);
      setEditing(false);
      setError(undefined);
      focusNavigationState();
      return;
    }

    const generation = ++saveGenerationRef.current;
    setSaving(true);
    setError(undefined);
    // H20同构: snapshot the override record at save start so a record mutation
    // mid-await cannot poison the merged result.
    const recordSnapshot = { ...record, [field]: nextValue };
    try {
      const result = await helpers.dispatch(saveAction, {
        scope: createCellDraftScope(rowScope, field, recordSnapshot),
      });
      if (saveGenerationRef.current !== generation) {
        return;
      }
      if (isExplicitActionFailure(result)) {
        throw result.error ?? new Error('Save action returned ok=false');
      }
      const existingSlot = rowScope.get('$slot') as { record: unknown; index: number } | undefined;
      rowScope.merge({
        ...recordSnapshot,
        $slot: {
          ...(existingSlot ?? {}),
          record: recordSnapshot,
          index: existingSlot?.index ?? 0,
        },
      });
      setCommittedValue(nextValue);
      setEditing(false);
      focusNavigationState();
    } catch (caught) {
      if (saveGenerationRef.current !== generation) {
        return;
      }
      // gd-cell-edit-save-fail: notify + keep the draft and the editing state.
      env.notify?.(
        'warning',
        caught instanceof Error && caught.message ? caught.message : t('flux.common.saveFailed'),
      );
      setError(caught instanceof Error && caught.message ? caught.message : undefined);
    } finally {
      if (saveGenerationRef.current === generation) {
        setSaving(false);
      }
    }
  };

  const cancel = () => {
    // gd-cell-edit-cancel: rollback to the pre-edit value, zero writes, zero dispatches.
    setEditing(false);
    setDraft('');
    setError(undefined);
    focusNavigationState();
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      void commit();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    }
  };

  const toggleCheckbox = (checked: boolean) => {
    // 22-01: the checkbox editor shares the sibling editors' `disabled={saving}`
    // in-flight gate — a second toggle (rapid click / keydown repeat) while a
    // save is pending must not dispatch a second save.
    if (saving) {
      return;
    }
    const commitToggle = async () => {
      if (!saveAction) {
        rowScope.update(field, checked);
        setCommittedValue(checked);
        return;
      }
      const generation = ++saveGenerationRef.current;
      setSaving(true);
      const recordSnapshot = { ...record, [field]: checked };
      try {
        const result = await helpers.dispatch(saveAction, {
          scope: createCellDraftScope(rowScope, field, recordSnapshot),
        });
        if (saveGenerationRef.current !== generation) {
          return;
        }
        if (isExplicitActionFailure(result)) {
          throw result.error ?? new Error('Save action returned ok=false');
        }
        const existingSlot = rowScope.get('$slot') as
          | { record: unknown; index: number }
          | undefined;
        rowScope.merge({
          ...recordSnapshot,
          $slot: {
            ...(existingSlot ?? {}),
            record: recordSnapshot,
            index: existingSlot?.index ?? 0,
          },
        });
        setCommittedValue(checked);
      } catch (caught) {
        if (saveGenerationRef.current !== generation) {
          return;
        }
        env.notify?.(
          'warning',
          caught instanceof Error && caught.message ? caught.message : t('flux.common.saveFailed'),
        );
      } finally {
        if (saveGenerationRef.current === generation) {
          setSaving(false);
        }
      }
    };
    void commitToggle();
  };

  if (config.editor === 'checkbox') {
    // Checkbox specialization: the toggle gesture IS the edit+commit (two-state
    // collapse — no persistent editing state).
    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- the cell wrapper owns the keyboard relay (Enter/F2/Space toggle) and click stopPropagation; the inner Checkbox is the native interactive element
      <span
        ref={containerRef}
        data-slot="table-editable-cell"
        data-editor="checkbox"
        data-saving={saving || undefined}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'F2' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            toggleCheckbox(!rawValue);
          } else {
            event.stopPropagation();
          }
        }}
      >
        <Checkbox
          checked={Boolean(rawValue)}
          aria-label={typeof column.label === 'string' ? column.label : field}
          onCheckedChange={(checked) => toggleCheckbox(checked === true)}
          onClick={(event) => event.stopPropagation()}
          disabled={saving}
        />
      </span>
    );
  }

  if (!editing) {
    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- navigation-state cell: span is keyboard-reachable (tabIndex=0) with Enter/F2 click-equivalent handlers; role stays generic until the edit state mounts the native editor control
      <span
        ref={containerRef}
        data-slot="table-editable-cell"
        data-editor={config.editor}
        tabIndex={0}
        aria-label={typeof column.label === 'string' ? column.label : field}
        onClick={(event) => {
          event.stopPropagation();
          beginEdit();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'F2') {
            event.preventDefault();
            event.stopPropagation();
            beginEdit();
          }
        }}
      >
        {displayValue}
      </span>
    );
  }

  const editor =
    config.editor === 'select' ? (
      <NativeSelect
        name={`editable-cell-${field}`}
        value={draft}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- entering the edit state must land focus in the editor (two-state machine contract)
        autoFocus
        aria-label={typeof column.label === 'string' ? column.label : field}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={handleEditorKeyDown}
        disabled={saving}
      >
        {!config.required ? <NativeSelectOption value="">-</NativeSelectOption> : null}
        {config.options.map((option) => (
          <NativeSelectOption key={String(option.value)} value={String(option.value)}>
            {option.label ?? String(option.value)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    ) : (
      <Input
        name={`editable-cell-${field}`}
        type={config.editor === 'number' ? 'number' : config.editor === 'date' ? 'date' : 'text'}
        value={draft}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- entering the edit state must land focus in the editor (two-state machine contract)
        autoFocus
        aria-label={typeof column.label === 'string' ? column.label : field}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={handleEditorKeyDown}
        disabled={saving}
      />
    );

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- edit-state wrapper: click stopPropagation keeps the edit intent from bubbling to the row; keyboard is owned by the focused editor control inside
    <span
      data-slot="table-editable-cell"
      data-editor={config.editor}
      data-editing="true"
      data-saving={saving || undefined}
      onClick={(event) => event.stopPropagation()}
    >
      {editor}
      {saving ? (
        <span
          data-slot="table-editable-saving"
          role="status"
          aria-live="polite"
          className="ml-1 inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <Spinner className="size-3" aria-hidden="true" />
        </span>
      ) : null}
      {error ? (
        <span
          data-slot="table-editable-error"
          id={errorId}
          role="alert"
          className="ml-1 text-xs text-destructive"
        >
          {error}
        </span>
      ) : null}
    </span>
  );
}
