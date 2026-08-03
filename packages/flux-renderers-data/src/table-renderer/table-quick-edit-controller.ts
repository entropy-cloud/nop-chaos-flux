import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActionSchema, RendererComponentProps, ScopeChange, ScopeRef, ScopeStore } from '@nop-chaos/flux-core';
import type { TableSchema } from '../schemas.js';

function areRecordsEqual(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => {
    const leftValue = left[key];
    const rightValue = right[key];

    if (leftValue === rightValue) {
      return true;
    }

    if (
      leftValue &&
      rightValue &&
      typeof leftValue === 'object' &&
      typeof rightValue === 'object' &&
      !Array.isArray(leftValue) &&
      !Array.isArray(rightValue)
    ) {
      return areRecordsEqual(
        leftValue as Record<string, unknown>,
        rightValue as Record<string, unknown>,
      );
    }

    if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
      return (
        leftValue.length === rightValue.length &&
        leftValue.every((item, index) => Object.is(item, rightValue[index]))
      );
    }

    return Object.is(leftValue, rightValue);
  });
}

function createDraftScopeStore(getSnapshot: () => Record<string, unknown>): {
  store: ScopeStore<Record<string, unknown>>;
  publish(change: ScopeChange): void;
} {
  let lastChange: ScopeChange = { paths: ['*'], kind: 'replace', revision: 0 };
  let revision = 0;
  const listeners = new Set<(change: ScopeChange) => void>();

  const store: ScopeStore<Record<string, unknown>> = {
    getSnapshot() {
      return getSnapshot();
    },
    getLastChange() {
      return lastChange;
    },
    setSnapshot() {
      throw new Error('Cannot set snapshot on quick-edit draft scope store');
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return {
    store,
    publish(change) {
      revision += 1;
      lastChange = {
        paths: change.paths?.length ? change.paths : ['*'],
        kind: change.kind ?? 'update',
        sourceScopeId: change.sourceScopeId,
        revision,
      };
      for (const listener of listeners) {
        listener(lastChange);
      }
    },
  };
}

function isExplicitActionFailure(result: unknown): result is { ok: false; error?: unknown } {
  return (
    typeof result === 'object' && result !== null && 'ok' in result && (result as { ok?: unknown }).ok === false
  );
}

function toDraftValue(record: Record<string, unknown>, field: string) {
  const value = record[field];
  return value == null ? '' : String(value);
}

export function toOptionalDraftValue(record: Record<string, unknown>, field: string | undefined) {
  return field ? toDraftValue(record, field) : '';
}

export interface UseTableQuickEditControllerInput {
  field: string | undefined;
  record: Record<string, unknown>;
  rowScope: ScopeRef;
  helpers: RendererComponentProps<TableSchema>['helpers'];
  saveAction?: ActionSchema;
  hasCustomBody: boolean;
  onSaveError?: (error: unknown) => void;
}

export function useTableQuickEditController(input: UseTableQuickEditControllerInput) {
  const { field, record, rowScope, helpers, saveAction, hasCustomBody, onSaveError } = input;
  const initialValue = toOptionalDraftValue(record, field);
  const [draftValue, setDraftValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [bodyDirty, setBodyDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(undefined);
  const savingRef = useRef(false);
  const saveGenerationRef = useRef(0);
  const lastFieldRef = useRef(field);
  const lastRecordValueRef = useRef(initialValue);
  const lastRecordRef = useRef<Record<string, unknown>>({ ...record });
  const savedRecordRef = useRef<Record<string, unknown>>({ ...record });
  const draftRecordRef = useRef<Record<string, unknown>>({ ...record });
  const draftScopeStore = useMemo(
    () =>
      createDraftScopeStore(() => ({
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
        if (field && path === field) {
          return draftRecordRef.current[field];
        }
        if (path === '$slot') {
          const slot = rowScope.get('$slot') as { record: unknown; index: number } | undefined;
          return { ...(slot ?? {}), record: draftRecordRef.current };
        }
        if (path === '$slot.record') {
          return draftRecordRef.current;
        }
        if (field && path === `$slot.record.${field}`) {
          return draftRecordRef.current[field];
        }
        return rowScope.get(path);
      },
      has(path: string) {
        if (field && (path === field || path === `$slot.record.${field}`)) {
          return true;
        }
        if (path === '$slot' || path === '$slot.record') {
          return true;
        }
        return rowScope.has(path);
      },
      readOwn() {
        const own = rowScope.readOwn();
        return {
          ...own,
          ...(field ? { [field]: draftRecordRef.current[field] } : {}),
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
          ...(field ? { [field]: draftRecordRef.current[field] } : {}),
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
          ...(field ? { [field]: draftRecordRef.current[field] } : {}),
          $slot: {
            ...(visible.$slot as Record<string, unknown> || {}),
            record: draftRecordRef.current,
          },
        };
      },
      update(path: string, value: unknown) {
        if (field && path === field) {
          draftRecordRef.current = {
            ...draftRecordRef.current,
            [field]: value,
          };
          draftScopeStore.publish({ paths: [field, '$slot.record'], kind: 'update' });
          setDraftValue(toOptionalDraftValue(draftRecordRef.current, field));
          return;
        }

        if (path === '$slot.record' && typeof value === 'object' && value !== null) {
          draftRecordRef.current = value as Record<string, unknown>;
          draftScopeStore.publish({ paths: ['$slot.record'], kind: 'update' });
          if (field) {
            setDraftValue(toOptionalDraftValue(draftRecordRef.current, field));
          }
          return;
        }

        rowScope.update(path, value);
      },
    }),
    [draftScopeStore, field, rowScope],
  );

  useEffect(() => {
    const nextValue = toOptionalDraftValue(record, field);
    const fieldChanged = lastFieldRef.current !== field;
    const valueChanged = lastRecordValueRef.current !== nextValue;
    const recordChanged = !areRecordsEqual(lastRecordRef.current, record);
    const honestReset = fieldChanged || (!hasCustomBody && valueChanged) || recordChanged;

    lastFieldRef.current = field;
    lastRecordValueRef.current = nextValue;
    lastRecordRef.current = { ...record };

    if (!honestReset) {
      draftScopeStore.publish({ paths: field ? [field, '$slot.record'] : ['$slot.record'], kind: 'update' });
      return;
    }

    draftRecordRef.current = { ...record };
    savedRecordRef.current = { ...record };
    draftScopeStore.publish({ paths: field ? [field, '$slot.record'] : ['$slot.record'], kind: 'update' });
    setDraftValue(nextValue);
    setSavedValue(nextValue);
    setBodyDirty(false);
    setDialogOpen(false);
    setSaveError(undefined);
  }, [draftScopeStore, field, hasCustomBody, record]);

  const dirty = hasCustomBody ? bodyDirty : draftValue !== savedValue;

  const markBodyDirty = useCallback(() => {
    if (hasCustomBody) {
      setBodyDirty(true);
    }
  }, [hasCustomBody]);

  const restoreSavedValue = useCallback(() => {
    draftRecordRef.current = { ...savedRecordRef.current };
    draftScopeStore.publish({ paths: field ? [field, '$slot.record'] : ['$slot.record'], kind: 'update' });

    if (hasCustomBody) {
      setBodyDirty(false);
      return;
    }

    setDraftValue(savedValue);
  }, [draftScopeStore, field, hasCustomBody, savedValue]);

  const openDialog = useCallback(() => {
    setDraftValue(savedValue);
    draftRecordRef.current = { ...savedRecordRef.current };
    draftScopeStore.publish({ paths: field ? [field, '$slot.record'] : ['$slot.record'], kind: 'update' });
    setDialogOpen(true);
  }, [draftScopeStore, field, savedValue]);

  const closeDialog = useCallback(() => {
    restoreSavedValue();
    setDialogOpen(false);
  }, [restoreSavedValue]);

  const handleInlineValueChange = useCallback(
    (nextValue: string) => {
      setDraftValue(nextValue);
      if (field) {
        draftRecordRef.current = {
          ...draftRecordRef.current,
          [field]: nextValue,
        };
        draftScopeStore.publish({ paths: [field, '$slot.record'], kind: 'update' });
      }
    },
    [draftScopeStore, field],
  );

  const runSave = useCallback(async () => {
    if (!saveAction || !dirty || savingRef.current) {
      return;
    }

    savingRef.current = true;
    const generation = ++saveGenerationRef.current;
    setSaving(true);
    setSaveError(undefined);
    // H20: snapshot the draft record at save start. If `record` mutates during the
    // await (e.g. an upstream refresh resets `draftRecordRef` via the sync effect),
    // `saveGenerationRef` only guards against a *concurrent* save — it does not stop
    // the record swap. Commit the snapshot so a record mutation mid-save cannot
    // poison the result (no cross-record saving).
    const recordSnapshot = { ...draftRecordRef.current };
    try {
      const result = await helpers.dispatch(saveAction, { scope: draftRowScope });
      if (saveGenerationRef.current !== generation) {
        return;
      }
      if (isExplicitActionFailure(result)) {
        throw result.error ?? new Error('Save action returned ok=false');
      }
      const committedRecord = recordSnapshot;
      const existingSlot = rowScope.get('$slot') as { record: unknown; index: number } | undefined;
      rowScope.merge({
        ...committedRecord,
        $slot: { ...(existingSlot ?? {}), record: committedRecord, index: existingSlot?.index ?? 0 },
      });
      const nextSavedValue = field ? toOptionalDraftValue(committedRecord, field) : draftValue;
      lastRecordValueRef.current = nextSavedValue;
      savedRecordRef.current = { ...committedRecord };
      setSavedValue(nextSavedValue);
      setDraftValue(nextSavedValue);
      setBodyDirty(false);
      setDialogOpen(false);
    } catch (error) {
      if (saveGenerationRef.current !== generation) {
        return;
      }
      setSaveError(error);
      onSaveError?.(error);
    } finally {
      if (saveGenerationRef.current === generation) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }, [dirty, draftRowScope, draftValue, field, helpers, onSaveError, rowScope, saveAction]);

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open && dialogOpen && saving) {
        return;
      }

      if (!open && dialogOpen && dirty) {
        restoreSavedValue();
      }

      if (open) {
        openDialog();
        return;
      }

      setDialogOpen(false);
    },
    [dialogOpen, dirty, openDialog, restoreSavedValue, saving],
  );

  return {
    draftValue,
    draftRowScope,
    saving,
    dialogOpen,
    dirty,
    savedValue,
    saveError,
    setDialogOpen,
    markBodyDirty,
    restoreSavedValue,
    openDialog,
    closeDialog,
    handleInlineValueChange,
    handleDialogOpenChange,
    runSave,
  };
}
