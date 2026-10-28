import React from 'react';
import type {
  BaseSchema,
  CompiledRuntimeValue,
  RendererComponentProps,
  RegisteredRendererDefinition,
  ScopeRef,
  ValidationRule,
} from '@nop-chaos/flux-core';
import {
    asReactNode,
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useCurrentComponentRegistry,
  useCurrentForm,
  useCurrentValidationScope,
  useRenderInstancePath,
  useRendererRuntime,
  useRenderScope,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@nop-chaos/ui';
import { PlusIcon } from 'lucide-react';
import type { InputTableColumn, InputTableSchema } from './composite-field/composite-schemas.js';
import {
  COMPOSITE_EDITOR_CAPABILITY_CONTRACTS,
} from './composite-field/composite-editor-capability-contracts.js';
import {
  useArrayContainerController,
  type UseArrayContainerControllerParams,
} from './composite-field/array-container-controller.js';
import { formFieldRules, useFieldPresentation } from '@nop-chaos/flux-renderers-form';
import { InputTableRow } from './input-table-row.js';
import {
  aggregateColumn,
  formatAggregateValue,
  isExprAggregate,
  isScalarAggregate,
  isValidSummaryBinding,
} from './input-table-summary.js';

export { InputTableRow } from './input-table-row.js';

const EMPTY_COLUMNS: InputTableColumn[] = [];

function toArrayItems(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function inputTableItemsEqual(a: unknown[] | undefined, b: unknown[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((item, i) => item === b[i]);
}

function deriveInputTableItems(raw: unknown[]): unknown[] {
  return raw;
}

function inputTableUiNewEntry(): unknown {
  return {};
}

function inputTableNewEntry(value: unknown): unknown {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

export function InputTableRenderer(props: RendererComponentProps<InputTableSchema>) {
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();
  const parentForm = useCurrentForm();
  const parentValidationOwner = useCurrentValidationScope();
  const parentComponentRegistry = useCurrentComponentRegistry();
  const parentInstancePath = useRenderInstancePath();
  const name = String(props.props.name ?? '');
  const itemKeyField =
    typeof props.props.itemKey === 'string' && props.props.itemKey.trim().length > 0
      ? props.props.itemKey.trim()
      : undefined;
  const addable = props.props.addable !== false;
  const removable = props.props.removable !== false;
  const reorderable = props.props.reorderable !== false;
  const readOnly = props.props.readOnly ?? false;
  const removeWhenHandle = props.templateNode.structuralFields?.removeWhen;
  const columns = React.useMemo<InputTableColumn[]>(
    () => (Array.isArray(props.props.columns) ? props.props.columns : EMPTY_COLUMNS),
    [props.props.columns],
  );
  const columnKeys = React.useMemo(
    () => columns.map((column, index) => column.label || `col-${index}`),
    [columns],
  );
  const showActionColumn = (reorderable || removable) && !readOnly;

  const presentation = useFieldPresentation(name, parentValidationOwner, {
    disabled: props.props.disabled === true,
    readOnly,
  });

  const itemRepeatedTemplateId = `input-table-row:${props.templateNode.templateNodeId ?? 'unknown'}`;
  const duplicateKeyWarn = React.useCallback(
    (duplicates: string[]) => {
      console.warn(
        `[InputTableRenderer] Duplicate itemKey values detected for "${name}": ${duplicates.join(', ')}. Falling back to compatibility identity for conflicting rows.`,
      );
    },
    [name],
  );
  const identity = React.useMemo(
    () => ({
      mode: 'object-key' as const,
      keyProp: itemKeyField,
      compatPrefix: 'row-',
      repeatedTemplateId: itemRepeatedTemplateId,
      buildItemInstancePath: true,
      parentInstancePath,
      onDuplicateKeys: duplicateKeyWarn,
      uiNewEntryFactory: inputTableUiNewEntry,
      newEntryFactory: inputTableNewEntry,
    }),
    [itemKeyField, itemRepeatedTemplateId, parentInstancePath, duplicateKeyWarn],
  );

  const events = React.useMemo(
    () => ({
      onAdd: () => {
        void props.events.onAdd?.();
      },
      onRemove: () => {
        void props.events.onRemove?.();
      },
      onReorder: () => {
        void props.events.onReorder?.();
      },
    }),
    [props.events],
  );

  const removeWhen = React.useMemo(
    () =>
      removeWhenHandle
        ? {
            handle: removeWhenHandle,
            disabled: readOnly || presentation.effectiveDisabled,
            evaluateCompiled: (compiled: CompiledRuntimeValue<unknown>, scope: ScopeRef) =>
              props.helpers.evaluateCompiled(compiled, scope),
          }
        : undefined,
    [removeWhenHandle, readOnly, presentation.effectiveDisabled, props.helpers],
  );

  const controllerParams: UseArrayContainerControllerParams<unknown, unknown> = {
    id: props.id,
    cid: props.meta.cid,
    type: 'input-table',
    name,
    parentForm,
    parentScope,
    isInteractive: () => !presentation.effectiveDisabled && !presentation.readOnly,
    readRawValue: toArrayItems,
    rawValuesEqual: inputTableItemsEqual,
    deriveItems: deriveInputTableItems,
    identity,
    minItemsDefault: 0,
    minItems: props.props.minItems,
    maxItems: props.props.maxItems,
    minItemsGuard: 'handler',
    validate: {
      uiAddDepth: 'subtree',
      capabilityAddDepth: 'field',
      removeDepth: 'subtree',
      removeValidateGate: 'shouldValidateOn',
    },
    uiAddMechanics: 'snapshot-replace',
    handlerReads: 'snapshot',
    syncRefOnMutate: false,
    uiMoveBounds: 'both-bounds',
    removeGate: 'capability-only',
    removeWhen,
    focusRestore: { timing: 'none', on: [] },
    events,
  };
  const controller = useArrayContainerController(controllerParams);
  const { items, itemEntries, atMaxItems, maxItems, minItems, handleAdd, handleRemove, handleMoveUp, handleMoveDown, isRemoveBlockedAt } = controller;

  // plan 785 — onRowChange: diff the previous item snapshot against the current
  // one after each controller update; dispatch { record, index, name, value }
  // for the first edited row. Add/remove change the row count and are covered
  // by onAdd/onRemove, so they do not dispatch onRowChange.
  const prevItemsSnapshotRef = React.useRef<readonly unknown[] | null>(null);
  React.useEffect(() => {
    const prev = prevItemsSnapshotRef.current;
    prevItemsSnapshotRef.current = items;
    if (!prev || prev.length !== items.length || prev === items) return;
    const changedIndex = items.findIndex((item, index) => item !== prev[index]);
    if (changedIndex === -1) return;
    const record = items[changedIndex];
    const prevRecord = prev[changedIndex];
    const changedName =
      record && typeof record === 'object' && prevRecord && typeof prevRecord === 'object'
        ? Object.keys(record as Record<string, unknown>).find(
            (key) =>
              (record as Record<string, unknown>)[key] !==
              (prevRecord as Record<string, unknown>)[key],
          )
        : undefined;
    const payload = {
      type: 'input-table:row-change',
      record,
      index: changedIndex,
      name: changedName,
      value:
        changedName !== undefined
          ? (record as Record<string, unknown>)[changedName]
          : undefined,
    };
    // Event passthrough convention (renderer-runtime.md): the payload doubles
    // as evaluationBindings so action-args templates resolve bare names.
    void props.events.onRowChange?.(payload, {
      event: payload,
      evaluationBindings: payload,
    });
  }, [items, props.events]);

  // plan 785 — summaryBinding: write the aggregated column value into the
  // parent form field whenever the table content changes (ERP 主单合计联动).
  const summaryBinding = isValidSummaryBinding(props.props.summaryBinding)
    ? props.props.summaryBinding
    : undefined;
  const lastSummaryWrittenRef = React.useRef<{ key: string; value: number } | null>(null);
  React.useEffect(() => {
    if (!summaryBinding || !parentForm) return;
    // Same skip-and-sum semantics as the visible summary row: non-numeric
    // cells are skipped; the write-back only pauses when the aggregate itself
    // is undefined (zero numeric cells for sum/avg).
    const { value } = aggregateColumn(items, summaryBinding.column, summaryBinding.agg);
    if (value === null) return;
    const key = `${summaryBinding.field}:${summaryBinding.column}:${summaryBinding.agg}:${items.length}`;
    const last = lastSummaryWrittenRef.current;
    if (last && last.key === key && last.value === value) return;
    lastSummaryWrittenRef.current = { key, value };
    parentForm.setValue(summaryBinding.field, value);
  }, [summaryBinding, parentForm, items]);

  const hasAggregateColumn = columns.some((column) => column.aggregate !== undefined);
  const summaryVisible = props.props.summaryVisible === true || hasAggregateColumn;
  const firstNonAggregateColumnIndex = columns.findIndex((column) => !column.aggregate);
  const summaryCells = React.useMemo(() => {
    if (!summaryVisible || columns.length === 0) return null;
    return columns.map((column, index) => {
      if (column.aggregate !== undefined) {
        if (isExprAggregate(column.aggregate)) {
          const scope = props.helpers.createScope({ rows: items });
          try {
            return props.helpers.evaluate<string | number>(`\${${column.aggregate.expr}}`, scope);
          } catch (error) {
            console.warn(
              `[InputTableRenderer] aggregate expr for column "${column.label ?? index}" failed to evaluate; the cell is left empty.`,
              error,
            );
            return '';
          } finally {
            props.helpers.disposeScope(scope.id);
          }
        }
        if (isScalarAggregate(column.aggregate)) {
          const { value, skipped } = aggregateColumn(items, column.name ?? '', column.aggregate);
          if (skipped > 0) {
            console.warn(
              `[InputTableRenderer] aggregate "${column.aggregate}" on column "${column.label ?? column.name}" skipped ${skipped} non-numeric cell(s).`,
            );
          }
          return formatAggregateValue(value);
        }
        return '';
      }
      if (index === firstNonAggregateColumnIndex) return t('flux.form.totalRow');
      return '';
    });
  }, [summaryVisible, columns, items, props.helpers, firstNonAggregateColumnIndex]);

  if (!props.meta.visible) {
    return null;
  }

  const interactionDisabled = presentation.effectiveDisabled || presentation.readOnly;
  const headerColumnCount = Math.max(1, columns.length);
  const footerContent = resolveRendererSlotContent(props, 'footer');

  return (
    <div className={cn('nop-input-table', 'flex flex-col gap-2', props.meta.className)}>
      <div className="overflow-x-auto" data-slot="input-table-scroll">
        <Table data-slot="input-table-table">
          <TableHeader>
            <TableRow data-slot="input-table-header">
              {columns.length > 0 ? (
                columns.map((column, index) => (
                  <TableHead
                    key={columnKeys[index]}
                    style={
                      typeof column.width === 'number' || typeof column.width === 'string'
                        ? { width: column.width as string | number }
                        : undefined
                    }
                  >
                    {column.label ?? ''}
                  </TableHead>
                ))
              ) : (
                <TableHead>{t('flux.form.value', { defaultValue: 'Value' })}</TableHead>
              )}
              {showActionColumn && (
                <TableHead
                  className="text-xs text-muted-foreground"
                  aria-label={t('flux.form.rowActions')}
                >
                  {/* ux-r12e：空操作列表头不可读——渲染与 aria 同源的标签文字
                      （原 w-px 空头在演示页读作"没有表头"） */}
                  {t('flux.form.rowActions')}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemEntries.length === 0 ? (
              <TableRow data-slot="input-table-empty-row">
                <TableCell colSpan={headerColumnCount + (showActionColumn ? 1 : 0)} className="text-center text-sm text-muted-foreground">
                  {t('flux.form.noItems', { defaultValue: 'No items' })}
                </TableCell>
              </TableRow>
            ) : (
              itemEntries.map(({ item, index, itemIdentity, itemInstancePath }) => (
                <InputTableRow
                  key={itemIdentity}
                  itemIdentity={itemIdentity}
                  index={index}
                  arrayPath={name}
                  parentScope={parentScope}
                  parentForm={parentForm}
                  parentValidationOwner={parentValidationOwner}
                  runtime={runtime}
                  parentComponentRegistry={parentComponentRegistry}
                  helpers={props.helpers}
                  readOnly={interactionDisabled}
                  removable={removable}
                  reorderable={reorderable}
                  totalCount={items.length}
                  minItems={minItems}
                  removeBlocked={isRemoveBlockedAt(index)}
                  columns={columns}
                  onRemove={handleRemove}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  item={item}
                  itemInstancePath={itemInstancePath ?? []}
                  itemRegion={props.regions.item}
                />
              ))
            )}
          </TableBody>
          {summaryVisible && summaryCells && (
            <tfoot data-slot="input-table-summary">
              <TableRow data-slot="input-table-summary-row">
                {columns.length > 0 ? (
                  summaryCells.map((cellContent, index) => (
                    <TableCell
                      key={columnKeys[index]}
                      data-slot="input-table-summary-cell"
                      style={
                        typeof columns[index].width === 'number' || typeof columns[index].width === 'string'
                          ? { width: columns[index].width as string | number }
                          : undefined
                      }
                    >
                      {cellContent}
                    </TableCell>
                  ))
                ) : (
                  <TableCell data-slot="input-table-summary-cell">{t('flux.form.totalRow')}</TableCell>
                )}
                {showActionColumn && <TableCell aria-hidden="true" />}
              </TableRow>
            </tfoot>
          )}
        </Table>
      </div>
      {addable && !interactionDisabled && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-slot="input-table-add"
            disabled={atMaxItems}
            className="w-fit"
            onClick={handleAdd}
          >
            <PlusIcon className="size-4" />
            {t('flux.form.addRow', { defaultValue: 'Add row' })}
          </Button>
          {atMaxItems && maxItems !== undefined ? (
            // [G2-R2-视角4-02] the cap disabled Add silently; announce count/cap.
            <span role="status" data-slot="input-table-max-items" className="text-xs text-muted-foreground">
              {t('flux.form.maxItemsReached', { count: items.length, max: maxItems })}
            </span>
          ) : null}
        </>
      )}
      {hasRendererSlotContent(footerContent) ? (
        <div data-slot="input-table-footer">{asReactNode(footerContent)}</div>
      ) : null}
    </div>
  );
}

export const inputTableRendererDefinition: RegisteredRendererDefinition = {
  type: 'input-table',
  displayName: 'Input Table',
  category: 'Form Advanced',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: InputTableRenderer,
  wrap: true,
  fields: [
    { key: 'name', kind: 'prop' },
    ...formFieldRules,
    { key: 'columns', kind: 'prop' },
    { key: 'itemKey', kind: 'prop' },
    { key: 'addable', kind: 'prop', valueType: 'boolean' },
    { key: 'removable', kind: 'prop', valueType: 'boolean' },
    { key: 'reorderable', kind: 'prop', valueType: 'boolean' },
    { key: 'minItems', kind: 'prop' },
    { key: 'maxItems', kind: 'prop' },
    { key: 'removeWhen', kind: 'prop', lazyEval: true, params: ['record', 'index', 'value'] },
    { key: 'readOnly', kind: 'prop' },
    { key: 'footer', kind: 'value-or-region', regionKey: 'footer' },
    { key: 'onAdd', kind: 'event' },
    { key: 'onRemove', kind: 'event' },
    { key: 'onReorder', kind: 'event' },
    { key: 'summaryVisible', kind: 'prop', valueType: 'boolean' },
    { key: 'summaryBinding', kind: 'prop' },
    { key: 'onRowChange', kind: 'event' },
    { key: 'item', kind: 'region', regionKey: 'item', params: ['index', 'value'] },
  ],
  componentCapabilityContracts: COMPOSITE_EDITOR_CAPABILITY_CONTRACTS,
  validation: {
    kind: 'field',
    valueKind: 'array',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules(schema: BaseSchema) {
      const tableSchema = schema as InputTableSchema;
      const rules: ValidationRule[] = [];
      // min/maxItems messages default to the flux.validation.* i18n templates
      // at runtime (buildValidationMessage) — same as combo/array-editor.
      if (typeof tableSchema.minItems === 'number') {
        rules.push({
          kind: 'minItems',
          value: Math.max(0, Math.floor(tableSchema.minItems)),
        });
      }
      if (typeof tableSchema.maxItems === 'number') {
        rules.push({
          kind: 'maxItems',
          value: Math.max(0, Math.floor(tableSchema.maxItems)),
        });
      }
      return rules;
    },
  },
  frameRootTag: 'div',
};
