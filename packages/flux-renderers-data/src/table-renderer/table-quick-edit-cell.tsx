import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActionSchema, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from '@nop-chaos/ui';
import type { TableColumnQuickEditConfig, TableColumnSchema, TableSchema } from '../schemas';

interface ResolvedTableQuickEditConfig {
  mode: 'inline' | 'dialog';
  saveImmediately: boolean;
  body?: TableColumnQuickEditConfig['body'];
}

export function resolveTableQuickEditConfig(column: TableColumnSchema): ResolvedTableQuickEditConfig | undefined {
  if (!column.quickEdit) {
    return undefined;
  }

  if (column.quickEdit === true) {
    if (!column.name) {
      return undefined;
    }

    return { mode: 'inline', saveImmediately: false };
  }

  const config = column.quickEdit as TableColumnQuickEditConfig;
  if (!column.name && config.body === undefined) {
    return undefined;
  }

  return {
    mode: config.mode === 'dialog' ? 'dialog' : 'inline',
    saveImmediately: config.saveImmediately === true,
    body: config.body,
  };
}

function toDraftValue(record: Record<string, unknown>, field: string) {
  const value = record[field];
  return value == null ? '' : String(value);
}

function toOptionalDraftValue(record: Record<string, unknown>, field: string | undefined) {
  return field ? toDraftValue(record, field) : '';
}

export interface TableQuickEditCellProps {
  column: TableColumnSchema;
  rowScope: ScopeRef;
  record: Record<string, unknown>;
  helpers: RendererComponentProps<TableSchema>['helpers'];
  quickSaveAction?: ActionSchema;
  quickSaveItemAction?: ActionSchema;
}

export function TableQuickEditCell(props: TableQuickEditCellProps) {
  const { column, rowScope, record, helpers, quickSaveAction, quickSaveItemAction } = props;
  const config = useMemo(() => resolveTableQuickEditConfig(column), [column]);
  const field = column.name;
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCustomBody = config?.body !== undefined;
  const initialValue = toOptionalDraftValue(record, field);
  const [draftValue, setDraftValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [bodyDirty, setBodyDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const nextValue = toOptionalDraftValue(record, field);
    setDraftValue(nextValue);
    setSavedValue(nextValue);
    setBodyDirty(false);
    setDialogOpen(false);
  }, [field, record]);

  const saveAction = quickSaveItemAction ?? quickSaveAction;
  const dirty = hasCustomBody ? bodyDirty : draftValue !== savedValue;
  const mode = config?.mode ?? 'inline';

  function restoreSavedValue() {
    if (hasCustomBody) {
      if (field) {
        rowScope.update(`record.${field}`, savedValue);
      }
      setBodyDirty(false);
      return;
    }

    if (field) {
      rowScope.update(`record.${field}`, savedValue);
    }
    setDraftValue(savedValue);
  }

  async function runSave() {
    if (!saveAction || !dirty || saving) {
      return;
    }

    setSaving(true);
    try {
      await helpers.dispatch(saveAction, { scope: rowScope });
      const nextSavedValue = field ? toOptionalDraftValue(rowScope.get('record') as Record<string, unknown> ?? record, field) : draftValue;
      setSavedValue(nextSavedValue);
      setDraftValue(nextSavedValue);
      setBodyDirty(false);
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const editorNode = hasCustomBody ? helpers.render(config.body!, { scope: rowScope, pathSuffix: `quickEdit.${field ?? 'custom'}` }) : (
    <Input
      name={`quick-edit-${field}`}
      value={draftValue}
      aria-label={typeof column.label === 'string' ? column.label : field}
      onChange={(event) => {
        const nextValue = event.target.value;
        setDraftValue(nextValue);
        rowScope.update(`record.${field}`, nextValue);
      }}
    />
  );

  if (mode === 'dialog') {
    return (
      <div data-slot="table-quick-edit" onClick={(event) => event.stopPropagation()}>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!open && dialogOpen && saving) {
            return;
          }

          if (!open && dialogOpen && dirty) {
            restoreSavedValue();
          }

          if (open) {
            setDraftValue(savedValue);
            if (field) {
              rowScope.update(`record.${field}`, savedValue);
            }
          }

          setDialogOpen(open);
        }}>
          <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            {typeof column.label === 'string' ? column.label : t('flux.common.save')}
          </Button>
          <DialogContent data-slot="table-quick-edit-dialog" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{typeof column.label === 'string' ? column.label : field ?? t('flux.common.save')}</DialogTitle>
            </DialogHeader>
            <div
              className="py-2"
              data-slot="table-quick-edit-dialog-body"
              onChangeCapture={() => {
                if (hasCustomBody) {
                  setBodyDirty(true);
                }
              }}
            >
              {editorNode}
            </div>
            <DialogFooter showCloseButton={false}>
              <Button type="button" variant="outline" onClick={() => {
                restoreSavedValue();
                setDialogOpen(false);
              }}>
                {t('flux.common.close')}
              </Button>
              {saveAction ? (
                <Button type="button" disabled={!dirty || saving} onClick={() => void runSave()}>
                  {t('flux.common.save')}
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-2"
      data-slot="table-quick-edit"
      onClick={(event) => event.stopPropagation()}
      onChangeCapture={() => {
        if (hasCustomBody) {
          setBodyDirty(true);
        }
      }}
      onBlurCapture={(event) => {
        if (!config?.saveImmediately || mode !== 'inline') {
          return;
        }

        const nextFocusTarget = event.relatedTarget;
        if (nextFocusTarget instanceof Node && containerRef.current?.contains(nextFocusTarget)) {
          return;
        }

        void runSave();
      }}
    >
      {editorNode}
      {!config?.saveImmediately && saveAction ? (
        <Button type="button" variant="outline" size="sm" disabled={!dirty || saving} onClick={() => void runSave()}>
          {t('flux.common.save')}
        </Button>
      ) : null}
    </div>
  );
}
