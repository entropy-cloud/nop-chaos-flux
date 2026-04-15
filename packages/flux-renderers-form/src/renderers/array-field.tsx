import React from 'react';
import type {
  BaseSchema,
  FormRuntime,
  FormStoreApi,
  FormStoreState,
  RendererComponentProps,
  RendererDefinition,
  ScopeRef
} from '@nop-chaos/flux-core';
import { getIn, createPathBinding, projectFieldStates } from '@nop-chaos/flux-core';
import {
  useCurrentForm,
  useCurrentFormModelGeneration,
  useCurrentFormState,
  useRenderScope,
  useScopeSelector
} from '@nop-chaos/flux-react';
import { FormContext, ScopeContext } from '@nop-chaos/flux-react';
import { Button, cn } from '@nop-chaos/ui';
import type { ArrayFieldSchema } from './composite-schemas';
import {
  formLabelFieldRule,
  useFieldPresentation
} from '../field-utils';
import { FieldHint, FieldLabel } from './shared';
import { resolveFieldLabelContent } from '../field-utils';
import { createProjectedScopeHelpers } from './projected-scope';

function toArrayItems(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function createItemStore(parentStore: FormStoreApi, itemFullPrefix: string, itemKind: 'scalar' | 'object'): FormStoreApi {
  const binding = createPathBinding({
    ownerRootPath: itemFullPrefix,
    scalarValueAlias: itemKind === 'scalar' ? 'value' : undefined
  });
  let lastParentState: FormStoreState | undefined;
  let lastProjectedState: FormStoreState | undefined;

  function projectState(state: FormStoreState): FormStoreState {
    if (state === lastParentState && lastProjectedState !== undefined) {
      return lastProjectedState;
    }

    const rawItemValue = getIn(state.values, itemFullPrefix);
    const subObject = itemKind === 'scalar'
      ? { value: rawItemValue ?? '' }
      : ((rawItemValue ?? {}) as Record<string, unknown>);

    const projected: FormStoreState = {
      ...state,
      values: subObject as Record<string, any>,
      fieldStates: projectFieldStates(state.fieldStates, binding)
    };

    lastParentState = state;
    lastProjectedState = projected;
    return projected;
  }

  return {
    ...parentStore,
    getState(): FormStoreState {
      return projectState(parentStore.getState());
    },
    getFieldState(path) {
      return parentStore.getFieldState(binding.toAbsolute(path));
    },
    setFieldState(path, state) {
      parentStore.setFieldState(binding.toAbsolute(path), state);
    },
    subscribe(listener) {
      return parentStore.subscribe(listener);
    },
    subscribeToPath(relativePath, listener) {
      return parentStore.subscribeToPath(binding.toAbsolute(relativePath), listener);
    },
    subscribeToSubmitting(listener) {
      return parentStore.subscribeToSubmitting(listener);
    },
    getPathState(relativePath) {
      return parentStore.getPathState(binding.toAbsolute(relativePath));
    }
  };
}

function createItemScope(
  parentScope: ScopeRef,
  arrayPath: string,
  index: number,
  itemKind: 'scalar' | 'object',
  readOnly: boolean
): ScopeRef {
  const itemPrefix = `${arrayPath}.${index}`;

  if (itemKind === 'scalar') {
    const buildPayload = () => ({
      value: parentScope.get(itemPrefix),
      index,
      readOnly
    });
    const { readSnapshot, store } = createProjectedScopeHelpers(parentScope, buildPayload);

    const itemScope: ScopeRef = {
      id: `${parentScope.id}:arr:${arrayPath}:${index}`,
      path: `${parentScope.path}.${itemPrefix}`,
      parent: parentScope.parent,
      store,
      get value() { return readSnapshot(); },
      get(path) {
        if (!path) return buildPayload();
        if (path === 'value') return parentScope.get(itemPrefix);
        if (path === 'index') return index;
        if (path === 'readOnly') return readOnly;
        return parentScope.get(`${itemPrefix}.${path}`);
      },
      has(path) {
        if (!path || path === 'value') return parentScope.has(itemPrefix);
        if (path === 'index') return true;
        if (path === 'readOnly') return true;
        return parentScope.has(`${itemPrefix}.${path}`);
      },
      readOwn() { return readSnapshot(); },
      readVisible() { return readSnapshot(); },
      materializeVisible() { return readSnapshot(); },
      update(path, value) {
        if (!path || path === 'value') {
          parentScope.update(itemPrefix, value);
        } else {
          parentScope.update(`${itemPrefix}.${path}`, value);
        }
      },
      merge(data) { parentScope.merge(data); },
      replace(data) { parentScope.replace?.(data); }
    };
    return itemScope;
  }

  const buildPayload = () => ({
    value: parentScope.get(itemPrefix),
    index,
    readOnly
  });
  const { readSnapshot, store } = createProjectedScopeHelpers(parentScope, buildPayload);

  const itemScope: ScopeRef = {
    id: `${parentScope.id}:arr:${arrayPath}:${index}`,
    path: `${parentScope.path}.${itemPrefix}`,
    parent: parentScope.parent,
    store,
    get value() {
      return readSnapshot();
    },
    readOwn() {
      return readSnapshot();
    },
    get(path) {
      if (!path) return this.readVisible();
      if (path === 'index') return index;
      if (path === 'readOnly') return readOnly;
      if (path === 'value') return parentScope.get(itemPrefix);
      return parentScope.get(`${itemPrefix}.${path}`);
    },
    has(path) {
      if (!path) return true;
      if (path === 'index') return true;
      if (path === 'readOnly' || path === 'value') return true;
      return parentScope.has(`${itemPrefix}.${path}`);
    },
    readVisible() {
      return readSnapshot();
    },
    materializeVisible() {
      return readSnapshot();
    },
    update(path, value) {
      if (!path) {
        parentScope.update(itemPrefix, value);
      } else {
        parentScope.update(`${itemPrefix}.${path}`, value);
      }
    },
    merge(data) { parentScope.merge(data); },
    replace(data) { parentScope.replace?.(data); }
  };
  return itemScope;
}

function createItemFormProxy(parentForm: FormRuntime, arrayPath: string, index: number, itemKind: 'scalar' | 'object'): FormRuntime {
  const itemFullPrefix = `${arrayPath}.${index}`;

  function prefixPath(path: string): string {
    if (!path) return itemFullPrefix;
    if (itemKind === 'scalar' && path === 'value') return itemFullPrefix;
    return `${itemFullPrefix}.${path}`;
  }

  const itemStore = createItemStore(parentForm.store, itemFullPrefix, itemKind);

  const proxy: FormRuntime = {
    ...parentForm,
    get store() { return itemStore; },
    get validation() { return parentForm.validation; },
    get lifecycleState() { return parentForm.lifecycleState; },
    get modelGeneration() { return parentForm.modelGeneration; },
    get scopeId() { return parentForm.scopeId; },
    get rootPath() { return parentForm.rootPath; },
    get canSubmit() { return parentForm.canSubmit; },
    get allTouched() { return parentForm.allTouched; },
    isPathOwned(path) { return parentForm.isPathOwned(prefixPath(path)); },
    getFieldState(path) { return parentForm.getFieldState(prefixPath(path)); },
    validateAt(path, reason) { return parentForm.validateAt(prefixPath(path), reason); },
    validateField(path, reason) { return parentForm.validateField(prefixPath(path), reason); },
    getField(path) { return parentForm.getField(prefixPath(path)); },
    getDependents(path) { return parentForm.getDependents(prefixPath(path)); },
    findByPrefix(path) { return parentForm.findByPrefix(prefixPath(path)); },
    getChildren(path) { return parentForm.getChildren(prefixPath(path)); },
    getError(path) { return parentForm.getError(prefixPath(path)); },
    isValidating(path) { return parentForm.isValidating(prefixPath(path)); },
    isTouched(path) { return parentForm.isTouched(prefixPath(path)); },
    isDirty(path) { return parentForm.isDirty(prefixPath(path)); },
    isVisited(path) { return parentForm.isVisited(prefixPath(path)); },
    touchField(path) { parentForm.touchField(prefixPath(path)); },
    visitField(path) { parentForm.visitField(prefixPath(path)); },
    clearErrors(path) { parentForm.clearErrors(path ? prefixPath(path) : undefined); },
    setValue(name, value) { parentForm.setValue(prefixPath(name), value); },
    setValues(values) {
      const prefixed: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        prefixed[prefixPath(k)] = v;
      }
      parentForm.setValues(prefixed);
    },
    registerField(registration) {
      return parentForm.registerField({
        ...registration,
        path: prefixPath(registration.path),
        childPaths: registration.childPaths?.map((cp) => prefixPath(cp))
      });
    },
    notifyFieldHidden(path, hidden) { parentForm.notifyFieldHidden(prefixPath(path), hidden); },
    validateSubtree(path, reason) { return parentForm.validateSubtree(prefixPath(path), reason); }
  };

  return proxy;
}

function ArrayItem(props: {
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
  const { index, arrayPath, itemKind, parentScope, parentForm, readOnly, removable, onRemove, renderItem } = props;

  const itemScope = React.useMemo(
    () => createItemScope(parentScope, arrayPath, index, itemKind, readOnly),
    [parentScope, arrayPath, index, itemKind, readOnly]
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
          Remove
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
  const modelGeneration = useCurrentFormModelGeneration();
  const name = String(props.props.name ?? '');
  const itemKind = (props.props.itemKind ?? 'scalar') as 'scalar' | 'object';
  const addable = props.props.addable !== false;
  const removable = props.props.removable !== false;
  const readOnly = Boolean(props.props.readOnly);

  const presentation = useFieldPresentation(name, parentForm, {
    disabled: props.meta.disabled,
    readOnly
  });

  const labelContent = resolveFieldLabelContent(props);

  const formValue = useCurrentFormState(
    (state) => (parentForm ? toArrayItems(name ? getIn(state.values, name) : state.values) : undefined),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((item, i) => item === b[i]);
    }
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
  const scalarItemField = itemKind === 'scalar' ? getScalarItemFieldSchema(props.schema as ArrayFieldSchema) : undefined;
  const scalarChildPaths = React.useMemo(
    () => (itemKind === 'scalar' && name ? items.map((_, index) => `${name}.${index}.value`) : []),
    [itemKind, items, name]
  );

  function handleAdd() {
    if (parentForm) {
      const newItem = itemKind === 'scalar' ? '' : {};
      parentForm.appendValue(name, newItem);
    }
  }

  function handleRemove(index: number) {
    if (parentForm) {
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
    <div
      className={cn('nop-field', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-field-visited={presentation['data-field-visited']}
      data-field-touched={presentation['data-field-touched']}
      data-field-dirty={presentation['data-field-dirty']}
      data-field-invalid={presentation['data-field-invalid']}
    >
      <FieldLabel content={labelContent} />
      <div data-slot="field-control">
        <div data-slot="array-field-body">
          {items.map((_item, index) => (
            <ArrayItem
              key={index}
              index={index}
              arrayPath={name}
              itemKind={itemKind}
              parentScope={parentScope}
              parentForm={parentForm}
              readOnly={readOnly || presentation.effectiveDisabled}
              removable={removable && !readOnly && !presentation.effectiveDisabled}
              onRemove={handleRemove}
              renderItem={() => props.regions.item?.render({ bindings: { index, value: _item } }) ?? null}
            />
          ))}
          {addable && !readOnly && !presentation.effectiveDisabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAdd}
            >
              Add item
            </Button>
          )}
        </div>
      </div>
      <FieldHint
        errorMessage={presentation.fieldState.error?.message}
        showError={presentation.showError}
      />
    </div>
  );
}

export const arrayFieldRendererDefinition: RendererDefinition = {
  type: 'array-field',
  component: ArrayFieldRenderer,
  regions: ['item'],
  fields: [formLabelFieldRule],
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
