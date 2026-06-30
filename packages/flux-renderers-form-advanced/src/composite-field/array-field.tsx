import React from 'react';
import type {
  BaseSchema,
  FormRuntime,
  InstanceFrame,
  RendererComponentProps,
  RendererDefinition,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import {
  FormContext,
  ScopeContext,
  ValidationContext,
  useCurrentForm,
  useCurrentFormModelGeneration,
  useCurrentFormState,
  useCurrentValidationScope,
  useRenderInstancePath,
  useRenderScope,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { ArrayFieldSchema } from './composite-schemas.js';
import { formFieldRules, shouldValidateOn, useFieldPresentation } from '@nop-chaos/flux-renderers-form';
import { createItemFormProxy, createItemScope } from './array-field-runtime.js';
import { instancePathEqual } from './instance-path-equal.js';
import { isRemoveBlockedByWhen, isRemoveWhenConfigured } from './remove-when-gating.js';
import {
  buildStableObjectItemKeys,
  useCompatibilityItemKeys,
} from './composite-item-keys.js';
import {
  collectScalarArrayItemErrors,
  getScalarItemValidationMetadata,
  publishScalarArrayItemErrors,
} from './array-field-scalar-validation.js';
import { WrappedFieldAction } from '../wrapped-field-action.js';
import { createProjectedValidationRuntime } from '../detail-view/projected-validation-runtime.js';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

function toArrayItems(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function createArrayFieldRepeatedTemplateId(templateNodeId: number | undefined): string {
  return `array-field-item:${templateNodeId ?? 'unknown'}`;
}

type ArrayItemProps = {
  itemIdentity: string;
  index: number;
  arrayPath: string;
  itemKind: 'scalar' | 'object';
  parentScope: ScopeRef;
  parentForm: FormRuntime | undefined;
  parentValidationOwner: import('@nop-chaos/flux-core').ValidationScopeRuntime | undefined;
  readOnly: boolean;
  removable: boolean;
  removeBlocked: boolean;
  onRemove: (index: number) => void;
  item: unknown;
  itemInstancePath: readonly InstanceFrame[];
  itemRegion: RendererComponentProps<ArrayFieldSchema>['regions']['item'];
};

function ArrayItemView(props: ArrayItemProps) {
  const {
    itemIdentity,
    index,
    arrayPath,
    itemKind,
    parentScope,
    parentForm,
    parentValidationOwner,
    readOnly,
    removable,
    removeBlocked,
    onRemove,
    item,
    itemInstancePath,
    itemRegion,
  } = props;

  const itemScope = React.useMemo(
    () => createItemScope(parentScope, arrayPath, index, itemKind, readOnly, itemIdentity),
    [parentScope, arrayPath, index, itemKind, readOnly, itemIdentity],
  );

  const itemForm = React.useMemo(
    () => (parentForm ? createItemFormProxy(parentForm, arrayPath, index, itemKind) : parentForm),
    [parentForm, arrayPath, index, itemKind],
  );
  const itemValidationOwner = React.useMemo(() => {
    if (!parentValidationOwner) {
      return parentValidationOwner;
    }

    return createProjectedValidationRuntime(parentValidationOwner, {
      ownerRootPath: `${arrayPath}.${index}`,
      scalarValueAlias: itemKind === 'scalar' ? 'value' : undefined,
      prefixPath(path) {
        if (!path) return `${arrayPath}.${index}`;
        if (itemKind === 'scalar' && path === 'value') return `${arrayPath}.${index}`;
        return `${arrayPath}.${index}.${path}`;
      },
    });
  }, [arrayPath, index, itemKind, parentValidationOwner]);
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

  return (
    <div data-slot="array-field-item">
      <div data-slot="array-field-item-body">
        <FormContext.Provider value={itemForm ?? undefined}>
          <ScopeContext.Provider value={itemScope}>
            <ValidationContext.Provider value={itemValidationOwner}>{itemContent}</ValidationContext.Provider>
          </ScopeContext.Provider>
        </FormContext.Provider>
      </div>
      {removable && (
        <WrappedFieldAction
          variant="ghost"
          size="sm"
          className="mt-1 hover:text-destructive"
          disabled={removeBlocked}
          onClick={() => !removeBlocked && onRemove(index)}
          aria-label={t('flux.form.remove')}
        >
          {t('flux.form.remove')}
        </WrappedFieldAction>
      )}
    </div>
  );
}

export const ArrayItem = React.memo(ArrayItemView, (prev, next) => {
  return (
    prev.itemIdentity === next.itemIdentity &&
    prev.index === next.index &&
    prev.arrayPath === next.arrayPath &&
    prev.itemKind === next.itemKind &&
    prev.parentScope === next.parentScope &&
    prev.parentForm === next.parentForm &&
    prev.parentValidationOwner === next.parentValidationOwner &&
    prev.readOnly === next.readOnly &&
    prev.removable === next.removable &&
    prev.removeBlocked === next.removeBlocked &&
    prev.onRemove === next.onRemove &&
    prev.item === next.item &&
    instancePathEqual(prev.itemInstancePath, next.itemInstancePath) &&
    prev.itemRegion === next.itemRegion
  );
});

export function ArrayFieldRenderer(props: RendererComponentProps<ArrayFieldSchema>) {
  const parentScope = useRenderScope();
  const parentForm = useCurrentForm();
  const parentValidationOwner = useCurrentValidationScope();
  const parentInstancePath = useRenderInstancePath();
  const modelGeneration = useCurrentFormModelGeneration();
  const name = String(props.props.name ?? '');
  const itemKind = (props.props.itemKind ?? 'scalar') as 'scalar' | 'object';
  const itemKeyField =
    typeof props.props.itemKey === 'string' && props.props.itemKey.trim().length > 0
      ? props.props.itemKey.trim()
      : undefined;
  const addable = props.props.addable !== false;
  const removable = props.props.removable !== false;
  const readOnly = props.props.readOnly ?? false;
  const removeWhenHandle = props.templateNode.structuralFields?.removeWhen;
  const itemRepeatedTemplateId = React.useMemo(
    () => createArrayFieldRepeatedTemplateId(props.templateNode.templateNodeId),
    [props.templateNode.templateNodeId],
  );

  const presentation = useFieldPresentation(name, parentValidationOwner, {
    disabled: props.props.disabled === true,
    readOnly,
  });

  const formValue = useCurrentFormState(
    (state) =>
      parentForm ? toArrayItems(name ? getIn(state.values, name) : state.values) : undefined,
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((item, i) => item === b[i]);
    },
    { path: name || undefined },
  );
  const scopeValue = useScopeSelector(
    (scopeData) =>
      parentForm ? undefined : toArrayItems(name ? getIn(scopeData, name) : scopeData),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((item, i) => item === b[i]);
    },
    { enabled: !parentForm, paths: name ? [name] : undefined },
  );

  const items = React.useMemo(
    () => (parentForm ? formValue : scopeValue) ?? [],
    [parentForm, formValue, scopeValue],
  );
  const nextItemKeyRef = React.useRef(items.length);
  // P0-6: keep a ref to the current items so the scope-only Add/Remove handlers can read
  // the latest array WITHOUT adding `items` to their useCallback deps (which would change
  // their identity on every array mutation and re-render every memoized item — breaking
  // array-item locality, see performance-table-page array-item-locality diagnostic).
  // Sync in an effect (not during render) to satisfy react-hooks/refs; event handlers fire
  // post-commit, so itemsRef.current is always the latest committed array when they run.
  const itemsRef = React.useRef(items);
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const [compatibilityItemKeys, setCompatibilityItemKeys] = React.useState<string[]>(() =>
    items.map((_, index) => `array-item-${index}`),
  );
  const {
    keyAt: objectCompatKeyAt,
    removeAt: objectCompatRemoveAt,
    append: objectCompatAppend,
  } = useCompatibilityItemKeys(items.length, 'array-obj-');
  const objectItemKeyResolution = React.useMemo(
    () =>
      itemKind === 'object'
        ? buildStableObjectItemKeys(items, itemKeyField, objectCompatKeyAt)
        : { itemKeys: [], duplicatePreferredKeys: [] },
    [itemKind, items, itemKeyField, objectCompatKeyAt],
  );
  const itemEntries = React.useMemo(
    () =>
      items.map((item, index) => {
        const itemIdentity =
          itemKind === 'object'
            ? (objectItemKeyResolution.itemKeys[index] ?? `array-obj-${index}`)
            : (compatibilityItemKeys[index] ?? `array-item-${index}`);
        const itemInstancePath: readonly InstanceFrame[] = [
          ...(parentInstancePath ?? []),
          { repeatedTemplateId: itemRepeatedTemplateId, instanceKey: itemIdentity },
        ];

        return {
          item,
          index,
          itemIdentity,
          itemInstancePath,
        };
      }),
    [
      items,
      itemKind,
      objectItemKeyResolution.itemKeys,
      compatibilityItemKeys,
      parentInstancePath,
      itemRepeatedTemplateId,
    ],
  );
  const scalarItemField = React.useMemo(
    () =>
      itemKind === 'scalar'
        ? getScalarItemValidationMetadata(props.props.scalarItemValidation)
        : undefined,
    [itemKind, props.props.scalarItemValidation],
  );
  const scalarItemLabel = scalarItemField?.label;
  const scalarItemRequired = scalarItemField?.required === true;
  const scalarChildPaths = React.useMemo(
    () =>
      itemKind === 'scalar' && name
        ? Array.from({ length: items.length }, (_, index) => `${name}.${index}`)
        : [],
    [itemKind, items.length, name],
  );

  React.useEffect(() => {
    if (itemKind !== 'scalar') {
      return;
    }

    setCompatibilityItemKeys((current) => {
      if (current.length === items.length) {
        return current;
      }

      if (current.length < items.length) {
        return [
          ...current,
          ...Array.from(
            { length: items.length - current.length },
            () => `array-item-${nextItemKeyRef.current++}`,
          ),
        ];
      }

      return current.slice(0, items.length);
    });
  }, [itemKind, items.length]);

  React.useEffect(() => {
    if (itemKind !== 'object' || objectItemKeyResolution.duplicatePreferredKeys.length === 0) {
      return;
    }

    console.warn(
      `[ArrayFieldRenderer] Duplicate itemKey values detected for "${name}": ${objectItemKeyResolution.duplicatePreferredKeys.join(', ')}. Falling back to compatibility index identity for conflicting items.`,
    );
  }, [itemKind, name, objectItemKeyResolution.duplicatePreferredKeys]);

  function handleAdd() {
    const newItem = itemKind === 'scalar' ? '' : {};

    if (itemKind === 'scalar') {
      const nextItemKey = `array-item-${nextItemKeyRef.current++}`;
      setCompatibilityItemKeys((current) => [...current, nextItemKey]);
    } else {
      objectCompatAppend();
    }

    if (parentForm) {
      parentForm.appendValue(name, newItem);
      if (shouldValidateOn(name, parentForm, 'change')) {
        void parentForm.validateSubtree(name, 'change');
      }
    } else {
      // P0-6: scope-only mode (no parent form) — write the next array back to the
      // owning scope instead of silently no-op'ing. Aligns with combo/input-table.
      parentScope.update(name, [...itemsRef.current, newItem]);
    }
  }

  const removeBlockedByIndex = React.useMemo(() => {
    if (!isRemoveWhenConfigured(removeWhenHandle)) {
      return null;
    }
    return items.map((item, index) => {
      const itemIdentity =
        itemKind === 'object'
          ? (objectItemKeyResolution.itemKeys[index] ?? `legacy-index:${index}`)
          : (compatibilityItemKeys[index] ?? `array-item-${index}`);
      const itemScope = createItemScope(
        parentScope,
        name,
        index,
        itemKind,
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
    items,
    itemKind,
    objectItemKeyResolution.itemKeys,
    compatibilityItemKeys,
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

  const handleRemove = React.useCallback((index: number) => {
    if (isRemoveBlockedAt(index)) {
      return;
    }
    if (itemKind === 'scalar') {
      setCompatibilityItemKeys((current) =>
        current.filter((_, currentIndex) => currentIndex !== index),
      );
    } else {
      objectCompatRemoveAt(index);
    }

    if (parentForm) {
      parentForm.removeValue(name, index);
      if (shouldValidateOn(name, parentForm, 'change')) {
        void parentForm.validateSubtree(name, 'change');
      }
    } else {
      // P0-6: scope-only mode — drop the item and write the next array back to scope.
      parentScope.update(
        name,
        itemsRef.current.filter((_, currentIndex) => currentIndex !== index),
      );
    }
  }, [isRemoveBlockedAt, itemKind, name, parentForm, parentScope, objectCompatRemoveAt]);

  React.useLayoutEffect(() => {
    if (!parentForm || !name || itemKind !== 'scalar' || scalarChildPaths.length === 0) {
      return;
    }

    const childLabel = scalarItemLabel && scalarItemLabel.length > 0 ? scalarItemLabel : 'Item';
    const registrations = scalarChildPaths.map((path) => {
      const index = Number(path.slice(name.length + 1));

      return parentForm.registerField({
        path,
        getValue() {
          return itemsRef.current[index];
        },
        async validate() {
          return collectScalarArrayItemErrors({
            items: itemsRef.current,
            arrayPath: name,
            childPaths: [path],
            childLabel,
            required: scalarItemRequired,
          });
        },
      });
    });

    return () => {
      for (const registration of registrations) {
        registration.unregister();
      }
    };
  }, [itemKind, modelGeneration, name, parentForm, scalarChildPaths, scalarItemLabel, scalarItemRequired]);

  React.useEffect(() => {
    if (!parentForm || !name || itemKind !== 'scalar') {
      return;
    }

    const childLabel = scalarItemLabel && scalarItemLabel.length > 0 ? scalarItemLabel : 'Item';
    const sourceId = `array-field:${parentForm.id}:${name}`;
    const childOwnerId = `${parentForm.id}:${name}:array-field`;

    parentForm.registerChildContract({
      childOwnerId,
      mode: 'recurse-submit',
      active: true,
      unregister() {
        parentForm.unregisterChildContract(childOwnerId);
      },
      getState() {
        const errors = collectScalarArrayItemErrors({
          items: itemsRef.current,
          arrayPath: name,
          childPaths: scalarChildPaths,
          childLabel,
          required: scalarItemRequired,
        });
        return {
          ready: true,
          validating: false,
          valid: errors.length === 0,
          hasErrors: errors.length > 0,
        };
      },
      async triggerValidation() {
        const errors = publishScalarArrayItemErrors({
          form: parentForm,
          sourceId,
          childPaths: scalarChildPaths,
          items: itemsRef.current,
          arrayPath: name,
          childLabel,
          required: scalarItemRequired,
        });
        return {
          ok: errors.length === 0,
          errors,
        };
      },
    });

    return () => {
      parentForm.unregisterChildContract(childOwnerId);
      parentForm.applyExternalErrors({ sourceId, errors: [], replace: true });
    };
  }, [itemKind, name, parentForm, scalarChildPaths, scalarItemLabel, scalarItemRequired]);

  return (
    <div
      className={cn('nop-array-field', props.meta.className)}
      data-slot="field-control"
    >
      <div data-slot="array-field-body">
        {itemEntries.map(({ item, index, itemIdentity, itemInstancePath }) => {
          return (
            <ArrayItem
              key={itemIdentity}
              itemIdentity={itemIdentity}
              index={index}
              arrayPath={name}
              itemKind={itemKind}
              parentScope={parentScope}
              parentForm={parentForm}
              parentValidationOwner={parentValidationOwner}
              readOnly={readOnly || presentation.effectiveDisabled}
              removable={removable && !readOnly && !presentation.effectiveDisabled}
              removeBlocked={isRemoveBlockedAt(index)}
              onRemove={handleRemove}
              item={item}
              itemInstancePath={itemInstancePath}
              itemRegion={props.regions.item}
            />
          );
        })}
        {addable && !readOnly && !presentation.effectiveDisabled && (
          <WrappedFieldAction variant="outline" size="sm" onClick={handleAdd}>
            {t('flux.form.addItem')}
          </WrappedFieldAction>
        )}
      </div>
    </div>
  );
}

export const arrayFieldRendererDefinition: RendererDefinition = {
  type: 'array-field',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: ArrayFieldRenderer,
  wrap: true,
  fields: [
    { key: 'name', kind: 'prop' },
    ...formFieldRules,
    { key: 'itemKind', kind: 'prop' },
    { key: 'itemKey', kind: 'prop' },
    { key: 'addable', kind: 'prop' },
    { key: 'removable', kind: 'prop' },
    { key: 'removeWhen', kind: 'prop', lazyEval: true, params: ['record', 'index', 'value'] },
    { key: 'readOnly', kind: 'prop' },
    { key: 'scalarItemValidation', kind: 'prop' },
    { key: 'item', kind: 'region', regionKey: 'item', params: ['index', 'value'] },
  ],
  validation: {
    kind: 'field',
    valueKind: 'array',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    getChildFieldPathPrefix() {
      return false;
    },
    collectRules() {
      return [];
    },
  },
  frameRootTag: 'div',
  authoringTransform(context) {
    if (context.schema.type !== 'array-field') {
      return context.schema;
    }

    const schema = context.schema as ArrayFieldSchema & { scalarItemValidation?: unknown };
    if (schema.itemKind !== 'scalar') {
      return schema;
    }

    const item = Array.isArray(schema.item) ? schema.item[0] : schema.item;
    const scalarItemValidation = getScalarItemValidationMetadata(item);
    if (!scalarItemValidation) {
      return schema;
    }

    return {
      ...schema,
      scalarItemValidation,
    };
  },
};
