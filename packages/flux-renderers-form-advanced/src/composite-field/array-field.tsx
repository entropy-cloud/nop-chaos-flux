import React from 'react';
import type {
  BaseSchema,
  FormRuntime,
  InstanceFrame,
  RendererComponentProps,
  RendererDefinition,
  ScopeRef
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import {
  useCurrentForm,
  useCurrentFormModelGeneration,
  useCurrentFormState,
  useRenderInstancePath,
  useRenderScope,
  useScopeSelector
} from '@nop-chaos/flux-react';
import { FormContext, ScopeContext } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button } from '@nop-chaos/ui';
import type { ArrayFieldSchema } from './composite-schemas';
import {
  formLabelFieldRule,
  useFieldPresentation
} from '@nop-chaos/flux-renderers-form';
import { createItemFormProxy, createItemScope } from './array-field-runtime';

function toArrayItems(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function createArrayFieldRepeatedTemplateId(templateNodeId: number | undefined): string {
  return `array-field-item:${templateNodeId ?? 'unknown'}`;
}

function resolvePreferredObjectArrayItemKey(item: unknown, sourceIndex: number, itemKeyField?: string): string {
  if (isRecord(item)) {
    const explicitValue = itemKeyField ? getIn(item, itemKeyField) : undefined;
    const compatibilityValue = explicitValue ?? item.__rowKey ?? item.id;

    if (compatibilityValue !== null && compatibilityValue !== undefined && compatibilityValue !== '') {
      return String(compatibilityValue);
    }
  }

  return `legacy-index:${sourceIndex}`;
}

function buildObjectArrayItemKeys(items: unknown[], itemKeyField?: string): {
  itemKeys: string[];
  duplicatePreferredKeys: string[];
} {
  const preferredKeys = items.map((item, sourceIndex) => resolvePreferredObjectArrayItemKey(item, sourceIndex, itemKeyField));
  const counts = new Map<string, number>();

  for (const key of preferredKeys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return {
    itemKeys: preferredKeys.map((preferredKey, sourceIndex) =>
      (counts.get(preferredKey) ?? 0) > 1 ? `legacy-index:${sourceIndex}` : preferredKey
    ),
    duplicatePreferredKeys: Array.from(counts.entries())
      .filter(([key, count]) => count > 1 && !key.startsWith('legacy-index:'))
      .map(([key]) => key)
  };
}

function ArrayItem(props: {
  itemIdentity: string;
  index: number;
  arrayPath: string;
  itemKind: 'scalar' | 'object';
  parentScope: ScopeRef;
  parentForm: FormRuntime | undefined;
  readOnly: boolean;
  removable: boolean;
  onRemove: (index: number) => void;
  renderItem: () => React.ReactNode;
}) {
  const { itemIdentity, index, arrayPath, itemKind, parentScope, parentForm, readOnly, removable, onRemove, renderItem } = props;

  const itemScope = React.useMemo(
    () => createItemScope(parentScope, arrayPath, index, itemKind, readOnly, itemIdentity),
    [parentScope, arrayPath, index, itemKind, readOnly, itemIdentity]
  );

  const itemForm = React.useMemo(
    () => (parentForm ? createItemFormProxy(parentForm, arrayPath, index, itemKind) : parentForm),
    [parentForm, arrayPath, index, itemKind]
  );

  return (
    <div data-slot="array-field-item">
      <div data-slot="array-field-item-body">
        <FormContext.Provider value={itemForm ?? undefined}>
          <ScopeContext.Provider value={itemScope}>
            {renderItem()}
          </ScopeContext.Provider>
        </FormContext.Provider>
      </div>
      {removable && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => onRemove(index)}
        >
          {t('flux.form.remove')}
        </Button>
      )}
    </div>
  );
}

function getScalarItemFieldSchema(schema: ArrayFieldSchema): BaseSchema | undefined {
  const item = Array.isArray(schema.item) ? schema.item[0] : schema.item;

  if (!item || Array.isArray(item) || typeof item !== 'object') {
    return undefined;
  }

  return item as BaseSchema;
}

export function ArrayFieldRenderer(props: RendererComponentProps<ArrayFieldSchema>) {
  const parentScope = useRenderScope();
  const parentForm = useCurrentForm();
  const parentInstancePath = useRenderInstancePath();
  const modelGeneration = useCurrentFormModelGeneration();
  const name = String(props.props.name ?? '');
  const itemKind = (props.props.itemKind ?? 'scalar') as 'scalar' | 'object';
  const itemKeyField = typeof props.props.itemKey === 'string' && props.props.itemKey.trim().length > 0
    ? props.props.itemKey.trim()
    : undefined;
  const addable = props.props.addable !== false;
  const removable = props.props.removable !== false;
  const readOnly = Boolean(props.props.readOnly);
  const itemRepeatedTemplateId = React.useMemo(
    () => createArrayFieldRepeatedTemplateId(props.templateNode.templateNodeId),
    [props.templateNode.templateNodeId]
  );

  const presentation = useFieldPresentation(name, parentForm, {
    disabled: props.meta.disabled,
    readOnly
  });

  const formValue = useCurrentFormState(
    (state) => (parentForm ? toArrayItems(name ? getIn(state.values, name) : state.values) : undefined),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((item, i) => item === b[i]);
    },
    { path: name || undefined }
  );
  const scopeValue = useScopeSelector(
    (scopeData) => (parentForm ? undefined : toArrayItems(name ? getIn(scopeData, name) : scopeData)),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((item, i) => item === b[i]);
    }
  );

  const items = React.useMemo(
    () => (parentForm ? formValue : scopeValue) ?? [],
    [parentForm, formValue, scopeValue]
  );
  const nextItemKeyRef = React.useRef(items.length);
  const [compatibilityItemKeys, setCompatibilityItemKeys] = React.useState<string[]>(() =>
    items.map((_, index) => `array-item-${index}`)
  );
  const objectItemKeyResolution = React.useMemo(
    () => itemKind === 'object'
      ? buildObjectArrayItemKeys(items, itemKeyField)
      : { itemKeys: [], duplicatePreferredKeys: [] },
    [itemKind, items, itemKeyField]
  );
  const itemEntries = React.useMemo(
    () => items.map((item, index) => {
      const itemIdentity = itemKind === 'object'
        ? objectItemKeyResolution.itemKeys[index] ?? `legacy-index:${index}`
        : compatibilityItemKeys[index] ?? `array-item-${index}`;
      const itemInstancePath: readonly InstanceFrame[] = [
        ...(parentInstancePath ?? []),
        { repeatedTemplateId: itemRepeatedTemplateId, instanceKey: itemIdentity }
      ];

      return {
        item,
        index,
        itemIdentity,
        itemInstancePath
      };
    }),
    [items, itemKind, objectItemKeyResolution.itemKeys, compatibilityItemKeys, parentInstancePath, itemRepeatedTemplateId]
  );
  const scalarItemField = itemKind === 'scalar' ? getScalarItemFieldSchema(props.schema as ArrayFieldSchema) : undefined;
  const scalarChildPaths = React.useMemo(
    () => (itemKind === 'scalar' && name ? items.map((_, index) => `${name}.${index}.value`) : []),
    [itemKind, items, name]
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
          ...Array.from({ length: items.length - current.length }, () => `array-item-${nextItemKeyRef.current++}`)
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
      `[ArrayFieldRenderer] Duplicate itemKey values detected for "${name}": ${objectItemKeyResolution.duplicatePreferredKeys.join(', ')}. Falling back to compatibility index identity for conflicting items.`
    );
  }, [itemKind, name, objectItemKeyResolution.duplicatePreferredKeys]);

  function handleAdd() {
    if (parentForm) {
      const newItem = itemKind === 'scalar' ? '' : {};

      if (itemKind === 'scalar') {
        const nextItemKey = `array-item-${nextItemKeyRef.current++}`;
        setCompatibilityItemKeys((current) => [...current, nextItemKey]);
      }

      parentForm.appendValue(name, newItem);
    }
  }

  function handleRemove(index: number) {
    if (parentForm) {
      if (itemKind === 'scalar') {
        setCompatibilityItemKeys((current) => current.filter((_, currentIndex) => currentIndex !== index));
      }

      parentForm.removeValue(name, index);
      void parentForm.validateSubtree(name);
    }
  }

  React.useEffect(() => {
    if (!parentForm || !name || itemKind !== 'scalar' || scalarChildPaths.length === 0) {
      return;
    }

    const childLabel = typeof scalarItemField?.label === 'string' && scalarItemField.label
      ? scalarItemField.label
      : 'Item';
    const isRequired = Boolean(scalarItemField?.required);

    const registration = parentForm.registerField({
      path: name,
      childPaths: scalarChildPaths,
      getValue() {
        return parentForm.scope.get(name);
      },
      validateChild(path) {
        if (!isRequired) {
          return [];
        }

        const actualPath = path.endsWith('.value') ? path.slice(0, -6) : path;
        const rawValue = parentForm.scope.get(actualPath);
        const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;

        if (value !== '' && value !== undefined && value !== null) {
          return [];
        }

        return [{
          path,
          rule: 'required',
          message: `${childLabel} is required`
        }];
      }
    });

    return registration.unregister;
  }, [itemKind, modelGeneration, name, parentForm, scalarChildPaths, scalarItemField]);

  return (
    <div data-slot="field-control">
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
              readOnly={readOnly || presentation.effectiveDisabled}
              removable={removable && !readOnly && !presentation.effectiveDisabled}
              onRemove={handleRemove}
              renderItem={() =>
                props.regions.item?.render({
                  bindings: { index, value: item },
                  instancePath: itemInstancePath
                }) ?? null
              }
            />
          );
        })}
        {addable && !readOnly && !presentation.effectiveDisabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
          >
            {t('flux.form.addItem')}
          </Button>
        )}
      </div>
    </div>
  );
}

export const arrayFieldRendererDefinition: RendererDefinition = {
  type: 'array-field',
  component: ArrayFieldRenderer,
  wrap: true,
  regions: ['item'],
  fields: [
    formLabelFieldRule,
    { key: 'item', kind: 'region', regionKey: 'item', params: ['index', 'value'] }
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
    }
  }
};
