import React from 'react';
import type {
  ComponentHandleRegistry,
  FormRuntime,
  InstanceFrame,
  RendererComponentProps,
  RendererHelpers,
  RendererRuntime,
  ScopeRef,
} from '@nop-chaos/flux-core';
import {
  ComponentRegistryContext,
  FormContext,
  FormLayoutContext,
  ScopeContext,
  ValidationContext,
} from '@nop-chaos/flux-react';
import { TableCell, TableRow } from '@nop-chaos/ui';
import type { InputTableColumn, InputTableSchema } from './composite-field/composite-schemas.js';
import { instancePathEqual } from './composite-field/instance-path-equal.js';
import { ArrayItemActionButtons, useArrayItemContext } from './array-item-shared.js';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

export type InputTableRowProps = {
  itemIdentity: string;
  index: number;
  arrayPath: string;
  parentScope: ScopeRef;
  parentForm: FormRuntime | undefined;
  parentValidationOwner: import('@nop-chaos/flux-core').ValidationScopeRuntime | undefined;
  runtime: RendererRuntime;
  parentComponentRegistry: ComponentHandleRegistry | undefined;
  helpers: RendererHelpers;
  readOnly: boolean;
  removable: boolean;
  reorderable: boolean;
  totalCount: number;
  minItems: number;
  removeBlocked: boolean;
  columns: readonly InputTableColumn[];
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  item: unknown;
  itemInstancePath: readonly InstanceFrame[];
  itemRegion: RendererComponentProps<InputTableSchema>['regions']['item'];
};

function InputTableRowView(props: InputTableRowProps) {
  const {
    itemIdentity,
    index,
    arrayPath,
    parentScope,
    parentForm,
    parentValidationOwner,
    runtime,
    parentComponentRegistry,
    helpers,
    readOnly,
    removable,
    reorderable,
    totalCount,
    minItems,
    removeBlocked,
    columns,
    onRemove,
    onMoveUp,
    onMoveDown,
    item,
    itemInstancePath,
    itemRegion,
  } = props;

  const {
    itemScope,
    itemForm,
    itemValidationOwner,
    itemComponentRegistry,
    itemContent,
    itemLayout,
  } = useArrayItemContext({
    parentScope,
    parentForm,
    parentValidationOwner,
    arrayPath,
    index,
    readOnly,
    itemIdentity,
    item,
    itemInstancePath,
    itemRegion,
    parentComponentRegistry,
    runtime,
  });


  const columnCells = React.useMemo(() => {
    const templateNodes = Array.isArray(itemRegion?.templateNode)
      ? itemRegion.templateNode
      : itemRegion?.templateNode
        ? [itemRegion.templateNode]
        : null;

    if (!templateNodes || templateNodes.length === 0) {
      const columnCount = Math.max(1, columns.length);
      return (
        <TableCell key="fallback" colSpan={columnCount} data-slot="input-table-row-body">
          {itemContent}
        </TableCell>
      );
    }

    return templateNodes.map((node, i) => {
      const rendered = helpers.render(node, {
        scope: itemScope,
        instancePath: itemInstancePath,
      });
      const colWidth = columns[i]?.width;
      const colKey = columns[i]?.label ?? `col-${i}`;
      return (
        <TableCell
          key={colKey}
          data-slot="input-table-row-body"
          style={colWidth != null ? { width: colWidth } : undefined}
        >
          {asReactNode(rendered)}
        </TableCell>
      );
    });
  }, [itemRegion, helpers, itemScope, itemInstancePath, columns, itemContent]);

  return (
    <TableRow data-slot="input-table-row" data-row-index={index}>
      <FormLayoutContext.Provider value={itemLayout}>
        <FormContext.Provider value={itemForm ?? undefined}>
          <ScopeContext.Provider value={itemScope}>
            <ValidationContext.Provider value={itemValidationOwner}>
              <ComponentRegistryContext.Provider value={itemComponentRegistry}>
                {columnCells}
              </ComponentRegistryContext.Provider>
            </ValidationContext.Provider>
          </ScopeContext.Provider>
        </FormContext.Provider>
      </FormLayoutContext.Provider>
      {(reorderable || removable) && !readOnly && (
        <TableCell className="w-px whitespace-nowrap">
          <div className="flex items-center gap-1" data-slot="input-table-row-actions">
            <ArrayItemActionButtons
              dataSlot="input-table"
              noun="row"
              readOnly={readOnly}
              index={index}
              totalCount={totalCount}
              minItems={minItems}
              removeBlocked={removeBlocked}
              reorderable={reorderable}
              removable={removable}
              onRemove={onRemove}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

export const InputTableRow = React.memo(InputTableRowView, (prev, next) =>
  prev.itemIdentity === next.itemIdentity &&
  prev.index === next.index &&
  prev.arrayPath === next.arrayPath &&
  prev.parentScope === next.parentScope &&
  prev.parentForm === next.parentForm &&
  prev.parentValidationOwner === next.parentValidationOwner &&
  prev.runtime === next.runtime &&
  prev.parentComponentRegistry === next.parentComponentRegistry &&
  prev.helpers === next.helpers &&
  prev.readOnly === next.readOnly &&
  prev.removable === next.removable &&
  prev.reorderable === next.reorderable &&
  prev.totalCount === next.totalCount &&
  prev.minItems === next.minItems &&
  prev.removeBlocked === next.removeBlocked &&
  prev.columns === next.columns &&
  prev.onRemove === next.onRemove &&
  prev.onMoveUp === next.onMoveUp &&
  prev.onMoveDown === next.onMoveDown &&
  prev.item === next.item &&
  instancePathEqual(prev.itemInstancePath, next.itemInstancePath) &&
  prev.itemRegion === next.itemRegion,
);
