import { useMemo, useRef } from 'react';
import type { ActionSchema, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@nop-chaos/ui';
import type { TableColumnQuickEditConfig, TableColumnSchema, TableSchema } from '../schemas';
import { useTableQuickEditController } from './table-quick-edit-controller';

interface ResolvedTableQuickEditConfig {
  mode: 'inline' | 'dialog';
  saveImmediately: boolean;
  body?: TableColumnQuickEditConfig['body'];
}

export function resolveTableQuickEditConfig(
  column: TableColumnSchema,
): ResolvedTableQuickEditConfig | undefined {
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

  const saveAction = quickSaveItemAction ?? quickSaveAction;
  const mode = config?.mode ?? 'inline';
  const {
    draftValue,
    saving,
    dialogOpen,
    dirty,
    markBodyDirty,
    closeDialog,
    openDialog,
    handleInlineValueChange,
    handleDialogOpenChange,
    runSave,
  } = useTableQuickEditController({
    field,
    record,
    rowScope,
    helpers,
    saveAction,
    hasCustomBody,
  });

  const editorNode = hasCustomBody ? (
    helpers.render(config.body!, { scope: rowScope, pathSuffix: `quickEdit.${field ?? 'custom'}` })
  ) : (
    <Input
      name={`quick-edit-${field}`}
      value={draftValue}
      aria-label={typeof column.label === 'string' ? column.label : field}
      onChange={(event) => handleInlineValueChange(event.target.value)}
    />
  );

  if (mode === 'dialog') {
    return (
      <div data-slot="table-quick-edit" onClick={(event) => event.stopPropagation()}>
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <Button type="button" variant="outline" size="sm" onClick={openDialog}>
            {typeof column.label === 'string' ? column.label : t('flux.common.save')}
          </Button>
          <DialogContent data-slot="table-quick-edit-dialog" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>
                {typeof column.label === 'string' ? column.label : (field ?? t('flux.common.save'))}
              </DialogTitle>
            </DialogHeader>
            <DialogBody data-slot="table-quick-edit-dialog-body" onChangeCapture={markBodyDirty}>
              {editorNode}
            </DialogBody>
            <DialogFooter showCloseButton={false}>
              <Button type="button" variant="outline" onClick={closeDialog}>
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
      onChangeCapture={markBodyDirty}
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!dirty || saving}
          onClick={() => void runSave()}
        >
          {t('flux.common.save')}
        </Button>
      ) : null}
    </div>
  );
}
