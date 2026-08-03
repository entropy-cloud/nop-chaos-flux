import React from 'react';
import type {
  BaseSchema,
  InstanceFrame,
  RendererComponentProps,
  RendererDefinition,
  ValidationRule,
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import {
  useCompositeFieldHandle,
  useCurrentComponentRegistry,
  useCurrentForm,
  useCurrentFormState,
  useCurrentValidationScope,
  useRenderInstancePath,
  useRenderScope,
  useRendererRuntime,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@nop-chaos/ui';
import { PlusIcon } from 'lucide-react';
import type { InputTableColumn, InputTableSchema } from './composite-field/composite-schemas.js';
import { createItemScope } from './composite-field/array-field-runtime.js';
import {
  buildStableObjectItemKeys,
  useCompatibilityItemKeys,
} from './composite-field/composite-item-keys.js';
import { isRemoveBlockedByWhen, isRemoveWhenConfigured } from './composite-field/remove-when-gating.js';
import {
  COMPOSITE_EDITOR_CAPABILITY_CONTRACTS,
  COMPOSITE_EDITOR_METHODS,
} from './composite-field/composite-editor-capability-contracts.js';
import { formFieldRules, shouldValidateOn, useFieldPresentation } from '@nop-chaos/flux-renderers-form';
import { InputTableRow } from './input-table-row.js';

export { InputTableRow } from './input-table-row.js';

const EMPTY_ITEMS: unknown[] = [];
const EMPTY_COLUMNS: InputTableColumn[] = [];

function toArrayItems(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function InputTableRenderer(props: RendererComponentProps<InputTableSchema>) {
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();
  const parentForm = useCurrentForm();
  const parentValidationOwner = useCurrentValidationScope();
  const parentComponentRegistry = useCurrentComponentRegistry();
  const parentInstancePath = useRenderInstancePath();
  const name = String(props.props.name ?? '');
  const hasName = name.length > 0;
  const itemKeyField =
    typeof props.props.rowKey === 'string' && props.props.rowKey.trim().length > 0
      ? props.props.rowKey.trim()
      : undefined;
  const addable = props.props.addable !== false;
  const removable = props.props.removable !== false;
  const reorderable = props.props.reorderable !== false;
  const readOnly = props.props.readOnly ?? false;
  const minItems =
    typeof props.props.minItems === 'number' && Number.isFinite(props.props.minItems)
      ? Math.max(0, Math.floor(props.props.minItems))
      : 0;
  const maxItems =
    typeof props.props.maxItems === 'number' && Number.isFinite(props.props.maxItems)
      ? Math.max(0, Math.floor(props.props.maxItems))
      : undefined;
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

  const formValue = useCurrentFormState(
    (state) => (parentForm && hasName ? toArrayItems(getIn(state.values, name)) : undefined),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((item, i) => item === b[i]);
    },
    { enabled: Boolean(parentForm && hasName), path: hasName ? name : undefined },
  );
  const scopeValue = useScopeSelector(
    (scopeData) =>
      parentForm || !hasName ? undefined : toArrayItems(getIn(scopeData, name)),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((item, i) => item === b[i]);
    },
    { enabled: Boolean(!parentForm && hasName), fallback: undefined, paths: hasName ? [name] : undefined },
  );
  const items = parentForm ? formValue : scopeValue;
  const itemsArray = React.useMemo(() => items ?? EMPTY_ITEMS, [items]);

  const {
    keyAt: compatKeyAt,
    removeAt: compatRemoveAt,
    append: compatAppend,
    move: compatMove,
  } = useCompatibilityItemKeys(itemsArray.length, 'row-');
  const objectItemKeyResolution = React.useMemo(
    () => buildStableObjectItemKeys(itemsArray, itemKeyField, compatKeyAt),
    [itemsArray, itemKeyField, compatKeyAt],
  );
  const itemRepeatedTemplateId = `input-table-row:${props.templateNode.templateNodeId ?? 'unknown'}`;
  const itemEntries = React.useMemo(
    () =>
      itemsArray.map((item, index) => {
        const itemIdentity = objectItemKeyResolution.itemKeys[index];
        const itemInstancePath: readonly InstanceFrame[] = [
          ...(parentInstancePath ?? []),
          { repeatedTemplateId: itemRepeatedTemplateId, instanceKey: itemIdentity },
        ];
        return { item, index, itemIdentity, itemInstancePath };
      }),
    [itemsArray, objectItemKeyResolution.itemKeys, parentInstancePath, itemRepeatedTemplateId],
  );

  React.useEffect(() => {
    if (objectItemKeyResolution.duplicatePreferredKeys.length === 0) {
      return;
    }
    console.warn(
      `[InputTableRenderer] Duplicate rowKey values detected for "${name}": ${objectItemKeyResolution.duplicatePreferredKeys.join(', ')}. Falling back to compatibility identity for conflicting rows.`,
    );
  }, [name, objectItemKeyResolution.duplicatePreferredKeys]);

  const atMaxItems = maxItems !== undefined && itemsArray.length >= maxItems;

  const removeBlockedByIndex = React.useMemo(() => {
    if (!isRemoveWhenConfigured(removeWhenHandle)) {
      return null;
    }
    return itemsArray.map((_, index) => {
      const itemIdentity = objectItemKeyResolution.itemKeys[index];
      const itemScope = createItemScope(
        parentScope,
        name,
        index,
        'object',
        readOnly || presentation.effectiveDisabled,
        itemIdentity,
      );
      return isRemoveBlockedByWhen({
        removeWhenHandle,
        itemScope,
        evaluateCompiled: (compiled, scope) => props.helpers.evaluateCompiled(compiled, scope),
      });
    });
  }, [
    removeWhenHandle,
    itemsArray,
    objectItemKeyResolution.itemKeys,
    parentScope,
    name,
    readOnly,
    presentation.effectiveDisabled,
    props.helpers,
  ]);

  const isRemoveBlockedAt = React.useCallback(
    (index: number) => Boolean(removeBlockedByIndex?.[index]),
    [removeBlockedByIndex],
  );

  const writeValue = React.useCallback(
    (next: unknown[]) => {
      if (parentForm && name) {
        if (!parentForm.isTouched(name)) {
          parentForm.touchField(name);
        }
        parentForm.setValue(name, next);
        if (shouldValidateOn(name, parentForm, 'change')) {
          void parentForm.validateSubtree(name, 'change');
        }
        return;
      }
      parentScope.update(name, next);
    },
    [name, parentForm, parentScope],
  );

  const handleAdd = React.useCallback(() => {
    if (atMaxItems) {
      return;
    }
    compatAppend();
    writeValue([...itemsArray, {}]);
    void props.events.onAdd?.();
  }, [atMaxItems, itemsArray, props.events, writeValue, compatAppend]);

  const handleRemove = React.useCallback(
    (index: number) => {
      if (index < 0 || index >= itemsArray.length || itemsArray.length <= minItems) {
        return;
      }
      compatRemoveAt(index);
      if (parentForm && name) {
        parentForm.removeValue(name, index);
        if (shouldValidateOn(name, parentForm, 'change')) {
          void parentForm.validateSubtree(name, 'change');
        }
      } else {
        writeValue(itemsArray.filter((_, i) => i !== index));
      }
      void props.events.onRemove?.();
    },
    [itemsArray, minItems, name, parentForm, props.events, writeValue, compatRemoveAt],
  );

  const handleMove = React.useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0 || from >= itemsArray.length || to >= itemsArray.length) {
        return;
      }
      compatMove(from, to);
      if (parentForm && name) {
        parentForm.moveValue(name, from, to);
        if (shouldValidateOn(name, parentForm, 'change')) {
          void parentForm.validateField(name, 'change');
        }
      } else {
        const next = itemsArray.slice();
        const [moved] = next.splice(from, 1);
        if (moved) {
          next.splice(to, 0, moved);
        }
        writeValue(next);
      }
      void props.events.onReorder?.();
    },
    [itemsArray, name, parentForm, props.events, writeValue, compatMove],
  );

  const handleMoveUp = React.useCallback((index: number) => handleMove(index, index - 1), [handleMove]);
  const handleMoveDown = React.useCallback((index: number) => handleMove(index, index + 1), [handleMove]);

  useCompositeFieldHandle({
    id: props.id,
    name: name || undefined,
    type: 'input-table',
    cid: props.meta.cid,
    methods: COMPOSITE_EDITOR_METHODS,
    isInteractive: () => !presentation.effectiveDisabled && !presentation.readOnly,
    addItem: (value) => {
      if (atMaxItems) {
        return { skipped: true };
      }
      const newRow = value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
      compatAppend();
      if (parentForm && name) {
        parentForm.appendValue(name, newRow);
        if (shouldValidateOn(name, parentForm, 'change')) {
          void parentForm.validateField(name, 'change');
        }
      } else {
        writeValue([...itemsArray, newRow]);
      }
      void props.events.onAdd?.();
      return { index: itemsArray.length };
    },
    removeItem: (index) => {
      if (index < 0 || index >= itemsArray.length) {
        return { outOfBounds: true };
      }
      if (itemsArray.length <= minItems) {
        return { skipped: true };
      }
      if (isRemoveBlockedAt(index)) {
        return { skipped: true };
      }
      compatRemoveAt(index);
      if (parentForm && name) {
        parentForm.removeValue(name, index);
        if (shouldValidateOn(name, parentForm, 'change')) {
          void parentForm.validateSubtree(name, 'change');
        }
      } else {
        writeValue(itemsArray.filter((_, i) => i !== index));
      }
      void props.events.onRemove?.();
      return {};
    },
    moveItem: (from, to) => {
      if (from < 0 || from >= itemsArray.length || to < 0 || to >= itemsArray.length) {
        return { outOfBounds: true };
      }
      if (from === to) {
        return {};
      }
      compatMove(from, to);
      if (parentForm && name) {
        parentForm.moveValue(name, from, to);
        if (shouldValidateOn(name, parentForm, 'change')) {
          void parentForm.validateField(name, 'change');
        }
      } else {
        const next = itemsArray.slice();
        const [moved] = next.splice(from, 1);
        if (moved) {
          next.splice(to, 0, moved);
        }
        writeValue(next);
      }
      void props.events.onReorder?.();
      return {};
    },
  });

  if (!props.meta.visible) {
    return null;
  }

  const interactionDisabled = presentation.effectiveDisabled || presentation.readOnly;
  const headerColumnCount = Math.max(1, columns.length);

  return (
    <div className={cn('nop-input-table', 'flex flex-col gap-2', props.meta.className)} data-slot="field-control">
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
              {showActionColumn && <TableHead className="w-px" aria-label="row actions" />}
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
                  totalCount={itemsArray.length}
                  minItems={minItems}
                  removeBlocked={isRemoveBlockedAt(index)}
                  columns={columns}
                  onRemove={handleRemove}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  item={item}
                  itemInstancePath={itemInstancePath}
                  itemRegion={props.regions.item}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {addable && !interactionDisabled && (
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
      )}
    </div>
  );
}

export const inputTableRendererDefinition: RendererDefinition = {
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
    { key: 'rowKey', kind: 'prop' },
    { key: 'addable', kind: 'prop', valueType: 'boolean' },
    { key: 'removable', kind: 'prop', valueType: 'boolean' },
    { key: 'reorderable', kind: 'prop', valueType: 'boolean' },
    { key: 'minItems', kind: 'prop' },
    { key: 'maxItems', kind: 'prop' },
    { key: 'removeWhen', kind: 'prop', lazyEval: true, params: ['record', 'index', 'value'] },
    { key: 'readOnly', kind: 'prop' },
    { key: 'onAdd', kind: 'event' },
    { key: 'onRemove', kind: 'event' },
    { key: 'onReorder', kind: 'event' },
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
      if (typeof tableSchema.minItems === 'number') {
        const value = Math.max(0, Math.floor(tableSchema.minItems));
        rules.push({
          kind: 'minItems',
          value,
          message:
            value <= 1
              ? `${schema.label ?? schema.name ?? 'Field'} requires at least one row`
              : `${schema.label ?? schema.name ?? 'Field'} requires at least ${value} rows`,
        });
      }
      if (typeof tableSchema.maxItems === 'number') {
        const value = Math.max(0, Math.floor(tableSchema.maxItems));
        rules.push({
          kind: 'maxItems',
          value,
          message:
            value <= 1
              ? `${schema.label ?? schema.name ?? 'Field'} must contain at most one row`
              : `${schema.label ?? schema.name ?? 'Field'} must contain at most ${value} rows`,
        });
      }
      return rules;
    },
  },
  frameRootTag: 'div',
};
