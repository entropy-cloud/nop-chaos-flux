import React from 'react';
import type {
  BaseSchema,
  FormRuntime,
  InstanceFrame,
  RendererComponentProps,
  RendererDefinition,
  ScopeRef,
  ValidationRule,
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import {
  FormContext,
  ScopeContext,
  ValidationContext,
  useCompositeFieldHandle,
  useCurrentForm,
  useCurrentFormState,
  useCurrentValidationScope,
  useRenderInstancePath,
  useRenderScope,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import type { InputTableColumn, InputTableSchema } from './composite-field/composite-schemas.js';
import { createItemFormProxy, createItemScope } from './composite-field/array-field-runtime.js';
import { createProjectedValidationRuntime } from './detail-view/projected-validation-runtime.js';
import {
  isRemoveBlockedByWhen,
  isRemoveWhenConfigured,
} from './composite-field/remove-when-gating.js';
import {
  COMPOSITE_EDITOR_CAPABILITY_CONTRACTS,
  COMPOSITE_EDITOR_METHODS,
} from './composite-field/composite-editor-capability-contracts.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@nop-chaos/ui';
import { formFieldRules, shouldValidateOn, useFieldPresentation } from '@nop-chaos/flux-renderers-form';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

const EMPTY_ITEMS: unknown[] = [];
const EMPTY_COLUMNS: InputTableColumn[] = [];

function toArrayItems(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function buildObjectArrayItemKeys(
  items: unknown[],
  itemKeyField?: string,
): { itemKeys: string[]; duplicatePreferredKeys: string[] } {
  const preferredKeys = items.map((item, sourceIndex) => {
    if (isRecord(item)) {
      const explicitValue = itemKeyField ? getIn(item, itemKeyField) : undefined;
      const compatibilityValue = explicitValue ?? item.__rowKey ?? item.id;
      if (compatibilityValue !== null && compatibilityValue !== undefined && compatibilityValue !== '') {
        return String(compatibilityValue);
      }
    }
    return `row-index:${sourceIndex}`;
  });

  const counts = new Map<string, number>();
  for (const key of preferredKeys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return {
    itemKeys: preferredKeys.map((preferredKey, sourceIndex) =>
      (counts.get(preferredKey) ?? 0) > 1 ? `row-index:${sourceIndex}` : preferredKey,
    ),
    duplicatePreferredKeys: Array.from(counts.entries())
      .filter(([key, count]) => count > 1 && !key.startsWith('row-index:'))
      .map(([key]) => key),
  };
}

type InputTableRowProps = {
  itemIdentity: string;
  index: number;
  arrayPath: string;
  parentScope: ScopeRef;
  parentForm: FormRuntime | undefined;
  parentValidationOwner: import('@nop-chaos/flux-core').ValidationScopeRuntime | undefined;
  readOnly: boolean;
  removable: boolean;
  reorderable: boolean;
  totalCount: number;
  minItems: number;
  columnCount: number;
  removeBlocked: boolean;
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
    readOnly,
    removable,
    reorderable,
    totalCount,
    minItems,
    columnCount,
    removeBlocked,
    onRemove,
    onMoveUp,
    onMoveDown,
    item,
    itemInstancePath,
    itemRegion,
  } = props;

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

  const canRemove = totalCount > minItems;
  const canRemoveNow = canRemove && !removeBlocked;
  const canMoveUp = index > 0;
  const canMoveDown = index < totalCount - 1;

  return (
    <TableRow className="nop-input-table__row" data-slot="input-table-row" data-row-index={index}>
      <TableCell>
        <FormContext.Provider value={itemForm ?? undefined}>
          <ScopeContext.Provider value={itemScope}>
            <ValidationContext.Provider value={itemValidationOwner}>
              <div className="contents" data-slot="input-table-row-body">
                {itemContent}
              </div>
            </ValidationContext.Provider>
          </ScopeContext.Provider>
        </FormContext.Provider>
      </TableCell>
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
      {/* columnCount reserves invisible grid tracks so the row body's cell grid
          aligns with the header even when action buttons are absent. */}
      {Array.from({ length: Math.max(0, columnCount - 1) }, (_, i) => (
        <React.Fragment key={i} />
      ))}
    </TableRow>
  );
}

const InputTableRow = React.memo(InputTableRowView, (prev, next) =>
  prev.itemIdentity === next.itemIdentity &&
  prev.index === next.index &&
  prev.arrayPath === next.arrayPath &&
  prev.parentScope === next.parentScope &&
  prev.parentForm === next.parentForm &&
  prev.parentValidationOwner === next.parentValidationOwner &&
  prev.readOnly === next.readOnly &&
  prev.removable === next.removable &&
  prev.reorderable === next.reorderable &&
  prev.totalCount === next.totalCount &&
  prev.minItems === next.minItems &&
  prev.columnCount === next.columnCount &&
  prev.removeBlocked === next.removeBlocked &&
  prev.onRemove === next.onRemove &&
  prev.onMoveUp === next.onMoveUp &&
  prev.onMoveDown === next.onMoveDown &&
  prev.item === next.item &&
  prev.itemRegion === next.itemRegion,
);

export function InputTableRenderer(props: RendererComponentProps<InputTableSchema>) {
  const parentScope = useRenderScope();
  const parentForm = useCurrentForm();
  const parentValidationOwner = useCurrentValidationScope();
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

  const objectItemKeyResolution = React.useMemo(
    () => buildObjectArrayItemKeys(itemsArray, itemKeyField),
    [itemsArray, itemKeyField],
  );
  const itemRepeatedTemplateId = `input-table-row:${props.templateNode.templateNodeId ?? 'unknown'}`;
  const itemEntries = React.useMemo(
    () =>
      itemsArray.map((item, index) => {
        const itemIdentity = objectItemKeyResolution.itemKeys[index] ?? `row-index:${index}`;
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
      `[InputTableRenderer] Duplicate rowKey values detected for "${name}": ${objectItemKeyResolution.duplicatePreferredKeys.join(', ')}. Falling back to index identity for conflicting rows.`,
    );
  }, [name, objectItemKeyResolution.duplicatePreferredKeys]);

  const atMaxItems = maxItems !== undefined && itemsArray.length >= maxItems;

  const removeWhenHandle = props.templateNode.structuralFields?.removeWhen;
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
    writeValue([...itemsArray, {}]);
    void props.events.onAdd?.();
  }, [atMaxItems, itemsArray, props.events, writeValue]);

  const handleRemove = React.useCallback(
    (index: number) => {
      if (index < 0 || index >= itemsArray.length || itemsArray.length <= minItems) {
        return;
      }
      if (isRemoveBlockedAt(index)) {
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
    [itemsArray, minItems, name, parentForm, props.events, writeValue, compatRemoveAt, isRemoveBlockedAt],
  );

  const handleMove = React.useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0 || from >= itemsArray.length || to >= itemsArray.length) {
        return;
      }
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
    [itemsArray, name, parentForm, props.events, writeValue],
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
                  readOnly={interactionDisabled}
                  removable={removable}
                  reorderable={reorderable}
                  totalCount={itemsArray.length}
                  minItems={minItems}
                  columnCount={headerColumnCount}
                  removeBlocked={isRemoveBlockedAt(index)}
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
