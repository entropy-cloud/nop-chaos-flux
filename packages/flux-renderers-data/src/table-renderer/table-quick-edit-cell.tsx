import { useMemo, useRef } from 'react';
import type { ActionSchema, RendererComponentProps, ScopeRef } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { useRendererEnv } from '@nop-chaos/flux-react';
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
import type { TableColumnQuickEditConfig, TableColumnSchema, TableSchema } from '../schemas.js';
import { useTableQuickEditController } from './table-quick-edit-controller.js';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

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
  if (
    !column.name &&
    config.body === undefined &&
    !(column as Record<string, unknown>).quickEditBodyRegionKey
  ) {
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
  regions: RendererComponentProps<TableSchema>['regions'];
  quickSaveAction?: ActionSchema;
  quickSaveItemAction?: ActionSchema;
}

export function TableQuickEditCell(props: TableQuickEditCellProps) {
  const { column, rowScope, record, helpers, regions, quickSaveAction, quickSaveItemAction } = props;
  const env = useRendererEnv();
  const config = useMemo(() => resolveTableQuickEditConfig(column), [column]);
  const field = column.name;
  const containerRef = useRef<HTMLDivElement>(null);
  const quickEditBodyRegion =
    typeof column.quickEditBodyRegionKey === 'string' ? regions[column.quickEditBodyRegionKey] : undefined;
  const hasCustomBody = config?.body !== undefined || Boolean(quickEditBodyRegion);

  const saveAction = quickSaveItemAction ?? quickSaveAction;
  const mode = config?.mode ?? 'inline';
  const {
    draftValue,
    draftRowScope,
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
    onSaveError(error) {
      env.notify?.(
        'warning',
        error instanceof Error && error.message ? error.message : t('flux.common.saveFailed'),
      );
    },
  });

  const editorNode = hasCustomBody ? (
    quickEditBodyRegion
      ? asReactNode(
          quickEditBodyRegion.render({
            scope: draftRowScope,
            pathSuffix: `quickEdit.${field ?? 'custom'}`,
          }),
        )
      : config?.body
        ? asReactNode(
            helpers.render(config.body, {
              scope: draftRowScope,
              pathSuffix: `quickEdit.${field ?? 'custom'}`,
            }),
          )
        : null
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
