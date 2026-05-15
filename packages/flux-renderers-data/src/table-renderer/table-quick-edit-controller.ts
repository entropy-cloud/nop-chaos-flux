import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActionSchema, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
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
  const lastFieldRef = useRef(field);
  const lastRecordValueRef = useRef(initialValue);

  useEffect(() => {
    const nextValue = toOptionalDraftValue(record, field);
    const fieldChanged = lastFieldRef.current !== field;
    const valueChanged = lastRecordValueRef.current !== nextValue;

    lastFieldRef.current = field;
    lastRecordValueRef.current = nextValue;

    if (!fieldChanged && !valueChanged) {
      return;
    }

    setDraftValue(nextValue);
    setSavedValue(nextValue);
    setBodyDirty(false);
    setDialogOpen(false);
    setSaveError(undefined);
  }, [field, record]);

  const dirty = hasCustomBody ? bodyDirty : draftValue !== savedValue;

  const markBodyDirty = useCallback(() => {
    if (hasCustomBody) {
      setBodyDirty(true);
    }
  }, [hasCustomBody]);

  const restoreSavedValue = useCallback(() => {
    if (field) {
      rowScope.update(`record.${field}`, savedValue);
    }

    if (hasCustomBody) {
      setBodyDirty(false);
      return;
    }

    setDraftValue(savedValue);
  }, [field, hasCustomBody, rowScope, savedValue]);

  const openDialog = useCallback(() => {
    setDraftValue(savedValue);
    if (field) {
      rowScope.update(`record.${field}`, savedValue);
    }
    setDialogOpen(true);
  }, [field, rowScope, savedValue]);

  const closeDialog = useCallback(() => {
    restoreSavedValue();
    setDialogOpen(false);
  }, [restoreSavedValue]);

  const handleInlineValueChange = useCallback(
    (nextValue: string) => {
      setDraftValue(nextValue);
      if (field) {
        rowScope.update(`record.${field}`, nextValue);
      }
    },
    [field, rowScope],
  );

  const runSave = useCallback(async () => {
    if (!saveAction || !dirty || savingRef.current) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setSaveError(undefined);
    try {
      const result = await helpers.dispatch(saveAction, { scope: rowScope });
      if (isExplicitActionFailure(result)) {
        throw result.error ?? new Error('Save action returned ok=false');
      }
      const nextSavedValue = field
        ? toOptionalDraftValue((rowScope.get('record') as Record<string, unknown>) ?? record, field)
        : draftValue;
      lastRecordValueRef.current = nextSavedValue;
      setSavedValue(nextSavedValue);
      setDraftValue(nextSavedValue);
      setBodyDirty(false);
      setDialogOpen(false);
    } catch (error) {
      setSaveError(error);
      onSaveError?.(error);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [dirty, draftValue, field, helpers, onSaveError, record, rowScope, saveAction]);

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
