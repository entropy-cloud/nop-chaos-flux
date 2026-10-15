import React from 'react';
import type {
  BaseSchema,
  CompiledRuntimeValue,
  FormRuntime,
  InstanceFrame,
  RendererComponentProps,
  RegisteredRendererDefinition,
  ScopeRef,
  ValidationRule,
} from '@nop-chaos/flux-core';
import {
  FormContext,
  FormLayoutContext,
  ScopeContext,
  ValidationContext,
  useCurrentForm,
  useCurrentValidationScope,
  useRenderInstancePath,
  useRenderScope,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn } from '@nop-chaos/ui';
import { PlusIcon } from 'lucide-react';
import type { ComboSchema } from './composite-field/composite-schemas.js';
import { ArrayItemActionButtons, useArrayItemContext } from './array-item-shared.js';
import { instancePathEqual } from './composite-field/instance-path-equal.js';
import {
  COMPOSITE_EDITOR_CAPABILITY_CONTRACTS,
} from './composite-field/composite-editor-capability-contracts.js';
import {
  useArrayContainerController,
  type UseArrayContainerControllerParams,
} from './composite-field/array-container-controller.js';
import { formFieldRules, useFieldPresentation } from '@nop-chaos/flux-renderers-form';

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
  columnCount?: number;
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

  const {
    itemScope,
    itemForm,
    itemValidationOwner,
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
  });

  const resolvedColumnCount =
    props.columnCount !== undefined && Number.isFinite(props.columnCount)
      ? Math.max(1, Math.floor(props.columnCount))
      : undefined;
  const showGrid = resolvedColumnCount !== undefined && resolvedColumnCount > 1;
  const bodyClassName = showGrid
    ? `min-w-0 flex-1 grid gap-2`
    : 'flex min-w-0 flex-1 flex-col gap-2';
  const bodyStyle = showGrid
    ? { display: 'grid', gridTemplateColumns: `repeat(${resolvedColumnCount}, minmax(0, 1fr))` }
    : undefined;

  return (
    <div className="rounded-lg border border-border bg-card p-3" data-slot="combo-item">
      <div className="flex items-start gap-2">
        <div className={cn(bodyClassName)} style={bodyStyle} data-slot="combo-item-body">
          <FormLayoutContext.Provider value={itemLayout}>
            <FormContext.Provider value={itemForm ?? undefined}>
              <ScopeContext.Provider value={itemScope}>
                <ValidationContext.Provider value={itemValidationOwner}>{itemContent}</ValidationContext.Provider>
              </ScopeContext.Provider>
            </FormContext.Provider>
          </FormLayoutContext.Provider>
        </div>
        {(reorderable || removable) && !readOnly && (
          <div className="flex shrink-0 flex-col gap-1" data-slot="combo-item-actions">
            <ArrayItemActionButtons
              dataSlot="combo"
              noun="item"
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

function toArrayItems(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function comboItemsEqual(a: unknown[] | undefined, b: unknown[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((item, i) => item === b[i]);
}

function deriveComboItems(raw: unknown[]): unknown[] {
  return raw;
}

function comboUiNewEntry(): unknown {
  return {};
}

function comboNewEntry(value: unknown): unknown {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

export function ComboRenderer(props: RendererComponentProps<ComboSchema>) {
  const parentScope = useRenderScope();
  const parentForm = useCurrentForm();
  const parentValidationOwner = useCurrentValidationScope();
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

  const presentation = useFieldPresentation(name, parentValidationOwner, {
    disabled: props.props.disabled === true,
    readOnly,
  });

  const itemRepeatedTemplateId = `combo-item:${props.templateNode.templateNodeId ?? 'unknown'}`;
  const duplicateKeyWarn = React.useCallback(
    (duplicates: string[]) => {
      console.warn(
        `[ComboRenderer] Duplicate itemKey values detected for "${name}": ${duplicates.join(', ')}. Falling back to compatibility identity for conflicting items.`,
      );
    },
    [name],
  );
  const identity = React.useMemo(
    () => ({
      mode: 'object-key' as const,
      keyProp: itemKeyField,
      compatPrefix: 'combo-',
      repeatedTemplateId: itemRepeatedTemplateId,
      buildItemInstancePath: true,
      parentInstancePath,
      onDuplicateKeys: duplicateKeyWarn,
      uiNewEntryFactory: comboUiNewEntry,
      newEntryFactory: comboNewEntry,
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
    type: 'combo',
    name,
    parentForm,
    parentScope,
    isInteractive: () => !presentation.effectiveDisabled && !presentation.readOnly,
    readRawValue: toArrayItems,
    rawValuesEqual: comboItemsEqual,
    deriveItems: deriveComboItems,
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
    removeGate: 'handler+capability',
    removeWhen,
    focusRestore: { timing: 'none', on: [] },
    events,
  };
  const controller = useArrayContainerController(controllerParams);
  const { items, itemEntries, atMaxItems, maxItems, minItems, handleAdd, handleRemove, handleMoveUp, handleMoveDown, isRemoveBlockedAt } = controller;

  if (!props.meta.visible) {
    return null;
  }

  const interactionDisabled = presentation.effectiveDisabled || presentation.readOnly;
  const comboColumnCount = props.props.columnCount;

  return (
    <div className={cn('nop-combo', 'flex flex-col gap-2', props.meta.className)}>
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
          totalCount={items.length}
          minItems={minItems}
          removeBlocked={isRemoveBlockedAt(index)}
          onRemove={handleRemove}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          item={item}
          itemInstancePath={itemInstancePath ?? []}
          itemRegion={props.regions.items}
          columnCount={comboColumnCount}
        />
      ))}
      {addable && !interactionDisabled && (
        <>
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
          {atMaxItems && maxItems !== undefined ? (
            // [G2-R2-视角4-02] the cap disabled Add silently; announce count/cap.
            <span role="status" data-slot="combo-max-items" className="text-xs text-muted-foreground">
              {t('flux.form.maxItemsReached', { count: items.length, max: maxItems })}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}

export const comboRendererDefinition: RegisteredRendererDefinition = {
  type: 'combo',
  displayName: 'Combo',
  category: 'Form Advanced',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: ComboRenderer,
  wrap: true,
  fields: [
    { key: 'name', kind: 'prop' },
    ...formFieldRules,
    { key: 'columnCount', kind: 'prop' },
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
        rules.push({
          kind: 'minItems',
          value: Math.max(0, Math.floor(comboSchema.minItems)),
        });
      }
      if (typeof comboSchema.maxItems === 'number') {
        rules.push({
          kind: 'maxItems',
          value: Math.max(0, Math.floor(comboSchema.maxItems)),
        });
      }
      return rules;
    },
  },
  frameRootTag: 'div',
};
