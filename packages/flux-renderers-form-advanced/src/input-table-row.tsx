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
  useFormLayout,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, TableCell, TableRow } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronUpIcon, Trash2Icon } from 'lucide-react';
import type { InputTableColumn, InputTableSchema } from './composite-field/composite-schemas.js';
import { createItemFormProxy, createItemScope } from './composite-field/array-field-runtime.js';
import { instancePathEqual } from './composite-field/instance-path-equal.js';
import { createProjectedValidationRuntime } from './detail-view/projected-validation-runtime.js';

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

  const parentLayout = useFormLayout();

  const itemScope = React.useMemo(
    () => createItemScope(parentScope, arrayPath, index, 'object', readOnly, itemIdentity),
    [parentScope, arrayPath, index, readOnly, itemIdentity],
  );
  const itemForm = React.useMemo(
    () => (parentForm ? createItemFormProxy(parentForm, arrayPath, index, 'object') : parentForm),
    [parentForm, arrayPath, index],
  );
  const itemValidationOwner = React.useMemo(() => {
    if (!parentValidationOwner) {
      return parentValidationOwner;
    }
    return createProjectedValidationRuntime(parentValidationOwner, {
      ownerRootPath: `${arrayPath}.${index}`,
      prefixPath(path) {
        if (!path) return `${arrayPath}.${index}`;
        return `${arrayPath}.${index}.${path}`;
      },
    });
  }, [arrayPath, index, parentValidationOwner]);

  const itemComponentRegistry = React.useMemo(() => {
    if (!parentComponentRegistry) {
      return undefined;
    }
    return runtime.createComponentHandleRegistry({
      id: `${arrayPath}.${index}:input-table-row:component-registry`,
      parent: parentComponentRegistry,
    });
  }, [runtime, parentComponentRegistry, arrayPath, index]);

  React.useEffect(() => {
    const registry = itemComponentRegistry;
    return () => {
      queueMicrotask(() => {
        registry?.dispose?.();
      });
    };
  }, [itemComponentRegistry]);

  const itemContent = React.useMemo(
    () =>
      asReactNode(
        itemRegion?.render({
          scope: itemScope,
          bindings: { index, value: item },
          instancePath: itemInstancePath,
        }),
      ) ?? null,
    [index, item, itemInstancePath, itemRegion, itemScope],
  );

  // Propagate the composite-level readOnly/disabled into the row cell fields
  // through the form-layout mechanism (staticReadOnly): without this, cell
  // fields only see their own schema props and stay editable while the
  // composite chrome is locked (C3.1 P1-2).
  const itemLayout = React.useMemo(() => {
    if (readOnly) {
      return parentLayout
        ? { ...parentLayout, staticReadOnly: true }
        : { staticReadOnly: true };
    }
    return parentLayout;
  }, [parentLayout, readOnly]);

  const canRemove = totalCount > minItems;
  const canRemoveNow = canRemove && !removeBlocked;

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
  const canMoveUp = index > 0;
  const canMoveDown = index < totalCount - 1;

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
            {reorderable && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  data-slot="input-table-move-up"
                  disabled={readOnly || !canMoveUp}
                  aria-label={t('flux.form.moveUp', { defaultValue: `Move up row ${index + 1}` })}
                  onClick={() => canMoveUp && onMoveUp(index)}
                >
                  <ChevronUpIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  data-slot="input-table-move-down"
                  disabled={readOnly || !canMoveDown}
                  aria-label={t('flux.form.moveDown', { defaultValue: `Move down row ${index + 1}` })}
                  onClick={() => canMoveDown && onMoveDown(index)}
                >
                  <ChevronDownIcon className="size-4" />
                </Button>
              </>
            )}
            {removable && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                data-slot="input-table-remove"
                disabled={readOnly || !canRemoveNow}
                className="hover:text-destructive"
                aria-label={t('flux.form.remove', { defaultValue: `Remove row ${index + 1}` })}
                onClick={() => canRemoveNow && onRemove(index)}
              >
                <Trash2Icon className="size-4" />
              </Button>
            )}
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
