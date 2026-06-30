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
import type { ComboSchema } from './composite-field/composite-schemas.js';
import { createItemFormProxy, createItemScope } from './composite-field/array-field-runtime.js';
import { instancePathEqual } from './composite-field/instance-path-equal.js';
import { isRemoveBlockedByWhen, isRemoveWhenConfigured } from './composite-field/remove-when-gating.js';
import {
  buildStableObjectItemKeys,
  useCompatibilityItemKeys,
} from './composite-field/composite-item-keys.js';
import { createProjectedValidationRuntime } from './detail-view/projected-validation-runtime.js';
import {
  COMPOSITE_EDITOR_CAPABILITY_CONTRACTS,
  COMPOSITE_EDITOR_METHODS,
} from './composite-field/composite-editor-capability-contracts.js';
import { formFieldRules, shouldValidateOn, useFieldPresentation } from '@nop-chaos/flux-renderers-form';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

const EMPTY_ITEMS: unknown[] = [];

function toArrayItems(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

type ComboItemProps = {
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
  removeBlocked: boolean;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  item: unknown;
  itemInstancePath: readonly InstanceFrame[];
  itemRegion: RendererComponentProps<ComboSchema>['regions']['items'];
};

function ComboItemView(props: ComboItemProps) {
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
    <div className="rounded-lg border border-border bg-card p-3" data-slot="combo-item">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1" data-slot="combo-item-body">
          <FormContext.Provider value={itemForm ?? undefined}>
            <ScopeContext.Provider value={itemScope}>
              <ValidationContext.Provider value={itemValidationOwner}>{itemContent}</ValidationContext.Provider>
            </ScopeContext.Provider>
          </FormContext.Provider>
        </div>
        {(reorderable || removable) && !readOnly && (
          <div className="flex shrink-0 flex-col gap-1" data-slot="combo-item-actions">
            {reorderable && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  data-slot="combo-move-up"
                  disabled={readOnly || !canMoveUp}
                  aria-label={t('flux.form.moveUp', { defaultValue: `Move up item ${index + 1}` })}
                  onClick={() => canMoveUp && onMoveUp(index)}
                >
                  <ChevronUpIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  data-slot="combo-move-down"
                  disabled={readOnly || !canMoveDown}
                  aria-label={t('flux.form.moveDown', { defaultValue: `Move down item ${index + 1}` })}
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
                data-slot="combo-remove"
                disabled={readOnly || !canRemoveNow}
                className="hover:text-destructive"
                aria-label={t('flux.form.remove', { defaultValue: `Remove item ${index + 1}` })}
                onClick={() => canRemoveNow && onRemove(index)}
              >
                <Trash2Icon className="size-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const ComboItem = React.memo(ComboItemView, (prev, next) =>
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
  prev.removeBlocked === next.removeBlocked &&
  prev.onRemove === next.onRemove &&
  prev.onMoveUp === next.onMoveUp &&
  prev.onMoveDown === next.onMoveDown &&
  prev.item === next.item &&
  instancePathEqual(prev.itemInstancePath, next.itemInstancePath) &&
  prev.itemRegion === next.itemRegion,
);

export function ComboRenderer(props: RendererComponentProps<ComboSchema>) {
  const parentScope = useRenderScope();
  const parentForm = useCurrentForm();
  const parentValidationOwner = useCurrentValidationScope();
  const parentInstancePath = useRenderInstancePath();
  const name = String(props.props.name ?? '');
  const hasName = name.length > 0;
  const itemKeyField =
    typeof props.props.itemKey === 'string' && props.props.itemKey.trim().length > 0
      ? props.props.itemKey.trim()
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
  } = useCompatibilityItemKeys(itemsArray.length, 'combo-');
  const objectItemKeyResolution = React.useMemo(
    () => buildStableObjectItemKeys(itemsArray, itemKeyField, compatKeyAt),
    [itemsArray, itemKeyField, compatKeyAt],
  );
  const itemRepeatedTemplateId = `combo-item:${props.templateNode.templateNodeId ?? 'unknown'}`;
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
      `[ComboRenderer] Duplicate itemKey values detected for "${name}": ${objectItemKeyResolution.duplicatePreferredKeys.join(', ')}. Falling back to compatibility identity for conflicting items.`,
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
    [itemsArray, minItems, name, parentForm, props.events, writeValue, isRemoveBlockedAt, compatRemoveAt],
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
    type: 'combo',
    cid: props.meta.cid,
    methods: COMPOSITE_EDITOR_METHODS,
    isInteractive: () => !presentation.effectiveDisabled && !presentation.readOnly,
    addItem: (value) => {
      if (atMaxItems) {
        return { skipped: true };
      }
      const newItem = value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
      compatAppend();
      if (parentForm && name) {
        parentForm.appendValue(name, newItem);
        if (shouldValidateOn(name, parentForm, 'change')) {
          void parentForm.validateField(name, 'change');
        }
      } else {
        writeValue([...itemsArray, newItem]);
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

  return (
    <div className={cn('nop-combo', 'flex flex-col gap-2', props.meta.className)} data-slot="field-control">
      {itemEntries.length === 0 && (
        <p className="text-sm text-muted-foreground" data-slot="combo-empty">
          {t('flux.form.noItems', { defaultValue: 'No items' })}
        </p>
      )}
      {itemEntries.map(({ item, index, itemIdentity, itemInstancePath }) => (
        <ComboItem
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
          removeBlocked={isRemoveBlockedAt(index)}
          onRemove={handleRemove}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          item={item}
          itemInstancePath={itemInstancePath}
          itemRegion={props.regions.items}
        />
      ))}
      {addable && !interactionDisabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-slot="combo-add"
          disabled={atMaxItems}
          className="w-fit"
          onClick={handleAdd}
        >
          <PlusIcon className="size-4" />
          {t('flux.form.addItem')}
        </Button>
      )}
    </div>
  );
}

export const comboRendererDefinition: RendererDefinition = {
  type: 'combo',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: ComboRenderer,
  wrap: true,
  fields: [
    { key: 'name', kind: 'prop' },
    ...formFieldRules,
    { key: 'addable', kind: 'prop', valueType: 'boolean' },
    { key: 'removable', kind: 'prop', valueType: 'boolean' },
    { key: 'reorderable', kind: 'prop', valueType: 'boolean' },
    { key: 'minItems', kind: 'prop' },
    { key: 'maxItems', kind: 'prop' },
    { key: 'itemKey', kind: 'prop' },
    { key: 'removeWhen', kind: 'prop', lazyEval: true, params: ['record', 'index', 'value'] },
    { key: 'readOnly', kind: 'prop' },
    { key: 'onAdd', kind: 'event' },
    { key: 'onRemove', kind: 'event' },
    { key: 'onReorder', kind: 'event' },
    { key: 'items', kind: 'region', regionKey: 'items', params: ['index', 'value'] },
  ],
  componentCapabilityContracts: COMPOSITE_EDITOR_CAPABILITY_CONTRACTS,
  validation: {
    kind: 'field',
    valueKind: 'array',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules(schema: BaseSchema) {
      const comboSchema = schema as ComboSchema;
      const rules: ValidationRule[] = [];
      if (typeof comboSchema.minItems === 'number') {
        const value = Math.max(0, Math.floor(comboSchema.minItems));
        rules.push({
          kind: 'minItems',
          value,
          message:
            value <= 1
              ? `${schema.label ?? schema.name ?? 'Field'} requires at least one item`
              : `${schema.label ?? schema.name ?? 'Field'} requires at least ${value} items`,
        });
      }
      if (typeof comboSchema.maxItems === 'number') {
        const value = Math.max(0, Math.floor(comboSchema.maxItems));
        rules.push({
          kind: 'maxItems',
          value,
          message:
            value <= 1
              ? `${schema.label ?? schema.name ?? 'Field'} must contain at most one item`
              : `${schema.label ?? schema.name ?? 'Field'} must contain at most ${value} items`,
        });
      }
      return rules;
    },
  },
  frameRootTag: 'div',
};
