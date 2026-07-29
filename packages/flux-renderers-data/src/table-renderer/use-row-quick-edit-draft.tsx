import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActionSchema, RendererComponentProps, ScopeChange, ScopeRef, ScopeStore } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Spinner } from '@nop-chaos/ui';
import type { TableSchema } from '../schemas.js';

function isExplicitActionFailure(result: unknown): result is { ok: false; error?: unknown } {
  return (
    typeof result === 'object' && result !== null && 'ok' in result && (result as { ok?: unknown }).ok === false
  );
}

function toDraftValue(record: Record<string, unknown>, field: string) {
  const value = record[field];
  return value == null ? '' : String(value);
}

function createDraftScopeStore(getSnapshot: () => Record<string, unknown>) {
  let revision = 0;
  const listeners = new Set<(change: ScopeChange) => void>();
  const store: ScopeStore<Record<string, unknown>> = {
    getSnapshot: () => getSnapshot(),
    getLastChange: () => ({ paths: ['*'], kind: 'replace' as const, revision }),
    setSnapshot: () => { throw new Error('Cannot set snapshot on quick-edit draft scope store'); },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
  return {
    store,
    publish(paths: string[]) {
      revision += 1;
      const change: ScopeChange = { paths, kind: 'update' as const, revision };
      for (const listener of listeners) listener(change);
    },
  };
}

export interface RowQuickEditDraftApi {
  getFieldValue(field: string): string;
  setFieldValue(field: string, value: string): void;
  isFieldDirty(field: string): boolean;
  isRowDirty: boolean;
  saving: boolean;
  draftRowScope: ScopeRef;
  runSave(): Promise<void>;
  cancelEditing(): void;
}

const RowQuickEditDraftContext = createContext<RowQuickEditDraftApi | null>(null);

export function useRowQuickEditDraftContext(): RowQuickEditDraftApi | null {
  return useContext(RowQuickEditDraftContext);
}

export { RowQuickEditDraftContext };

export interface UseRowQuickEditDraftInput {
  record: Record<string, unknown>;
  rowScope: ScopeRef;
  helpers: RendererComponentProps<TableSchema>['helpers'];
  saveAction?: ActionSchema;
  onSaveError?: (error: unknown) => void;
}

export function useRowQuickEditDraft(input: UseRowQuickEditDraftInput): RowQuickEditDraftApi {
  const { record, rowScope, helpers, saveAction, onSaveError } = input;

  const draftRecordRef = useRef<Record<string, unknown>>({ ...record });
  const savedRecordRef = useRef<Record<string, unknown>>({ ...record });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const saveGenerationRef = useRef(0);

  const [draftVersion, setDraftVersion] = useState(0);

  const draftScopeStore = useMemo(
    () => createDraftScopeStore(() => ({
      ...rowScope.readVisible(),
      ...draftRecordRef.current,
      $slot: {
        ...(rowScope.readVisible().$slot as Record<string, unknown> || {}),
        record: draftRecordRef.current,
      },
    })),
    [rowScope],
  );

  const draftRowScope = useMemo<ScopeRef>(
    () => ({
      ...rowScope,
      store: draftScopeStore.store,
      get(path: string) {
        if (path in draftRecordRef.current) return draftRecordRef.current[path];
        if (path === '$slot.record') return draftRecordRef.current;
        if (path.startsWith('$slot.record.')) {
          const key = path.slice('$slot.record.'.length);
          return draftRecordRef.current[key];
        }
        return rowScope.get(path);
      },
      has(path: string) {
        if (path in draftRecordRef.current) return true;
        if (path === '$slot.record' || path.startsWith('$slot.record.')) return true;
        return rowScope.has(path);
      },
      readOwn() {
        const own = rowScope.readOwn();
        return {
          ...own,
          ...draftRecordRef.current,
          $slot: {
            ...(own.$slot as Record<string, unknown> || {}),
            record: draftRecordRef.current,
          },
        };
      },
      readVisible() {
        const visible = rowScope.readVisible();
        return {
          ...visible,
          ...draftRecordRef.current,
          $slot: {
            ...(visible.$slot as Record<string, unknown> || {}),
            record: draftRecordRef.current,
          },
        };
      },
      materializeVisible() {
        const visible = rowScope.materializeVisible();
        return {
          ...visible,
          ...draftRecordRef.current,
          $slot: {
            ...(visible.$slot as Record<string, unknown> || {}),
            record: draftRecordRef.current,
          },
        };
      },
      update(path: string, value: unknown) {
        if (path in draftRecordRef.current) {
          draftRecordRef.current = { ...draftRecordRef.current, [path]: value };
          draftScopeStore.publish([path, '$slot.record']);
          setDraftVersion((v) => v + 1);
          return;
        }
        if (path === '$slot.record' && typeof value === 'object' && value !== null) {
          draftRecordRef.current = value as Record<string, unknown>;
          draftScopeStore.publish(['$slot.record']);
          setDraftVersion((v) => v + 1);
          return;
        }
        rowScope.update(path, value);
      },
    }),
    [draftScopeStore, rowScope],
  );

  useEffect(() => {
    draftRecordRef.current = { ...record };
    savedRecordRef.current = { ...record };
    draftScopeStore.publish(['$slot.record']);
  }, [draftScopeStore, record]);

  const getFieldValue = useCallback((field: string): string => {
    return toDraftValue(draftRecordRef.current, field);
  }, []);

  const setFieldValue = useCallback((field: string, value: string) => {
    draftRecordRef.current = { ...draftRecordRef.current, [field]: value };
    draftScopeStore.publish([field, '$slot.record']);
    setDraftVersion((v) => v + 1);
  }, [draftScopeStore]);

  const isFieldDirty = useCallback((field: string): boolean => {
    const saved = toDraftValue(savedRecordRef.current, field);
    const current = toDraftValue(draftRecordRef.current, field);
    return current !== saved;
  }, []);

  const isRowDirty = useMemo(() => {
    void draftVersion;
    const savedKeys = Object.keys(savedRecordRef.current);
    const draftKeys = Object.keys(draftRecordRef.current);
    const allKeys = new Set([...savedKeys, ...draftKeys]);
    for (const key of allKeys) {
      if (!Object.is(draftRecordRef.current[key], savedRecordRef.current[key])) return true;
    }
    return false;
  }, [draftVersion]);

  const cancelEditing = useCallback(() => {
    draftRecordRef.current = { ...savedRecordRef.current };
    draftScopeStore.publish(['$slot.record']);
    setDraftVersion((v) => v + 1);
  }, [draftScopeStore]);

  const runSave = useCallback(async () => {
    if (!saveAction || !isRowDirty || savingRef.current) return;
    savingRef.current = true;
    const generation = ++saveGenerationRef.current;
    setSaving(true);
    const recordSnapshot = { ...draftRecordRef.current };
    try {
      const result = await helpers.dispatch(saveAction, { scope: draftRowScope });
      if (saveGenerationRef.current !== generation) return;
      if (isExplicitActionFailure(result)) {
        throw result.error ?? new Error('Save action returned ok=false');
      }
      const committedRecord = recordSnapshot;
      const existingSlot = rowScope.get('$slot') as { record: unknown; index: number } | undefined;
      rowScope.merge({
        ...committedRecord,
        $slot: { ...(existingSlot ?? {}), record: committedRecord, index: existingSlot?.index ?? 0 },
      });
      savedRecordRef.current = { ...committedRecord };
      draftRecordRef.current = { ...committedRecord };
      draftScopeStore.publish(['$slot.record']);
    } catch (error) {
      if (saveGenerationRef.current !== generation) return;
      onSaveError?.(error);
    } finally {
      if (saveGenerationRef.current === generation) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }, [draftRowScope, draftScopeStore, helpers, isRowDirty, onSaveError, rowScope, saveAction]);

  return {
    getFieldValue,
    setFieldValue,
    isFieldDirty,
    isRowDirty,
    saving,
    draftRowScope,
    runSave,
    cancelEditing,
  };
}

export interface RowQuickEditSaveBarProps {
  rowDraft: RowQuickEditDraftApi;
}

export function RowQuickEditSaveBar({ rowDraft }: RowQuickEditSaveBarProps) {
  if (!rowDraft.isRowDirty && !rowDraft.saving) return null;

  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- onClick is stopPropagation only; real interaction is the inner <Button> elements */
    <div
      data-slot="table-row-save-bar"
      className="flex items-center gap-2"
      onClick={(event) => event.stopPropagation()}
    >
      {rowDraft.saving ? (
        <div
          data-slot="table-quick-edit-saving"
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Spinner className="size-4" aria-hidden="true" />
          <span>{t('flux.common.saving')}</span>
        </div>
      ) : (
        <>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!rowDraft.isRowDirty || rowDraft.saving}
            onClick={() => void rowDraft.runSave()}
          >
            {t('flux.common.save')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={rowDraft.saving}
            onClick={rowDraft.cancelEditing}
          >
            {t('flux.common.cancel')}
          </Button>
        </>
      )}
    </div>
  );
}
