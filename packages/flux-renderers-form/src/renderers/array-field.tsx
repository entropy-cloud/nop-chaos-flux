import React from 'react';
import type {
  BaseSchema,
  FormRuntime,
  FormStoreApi,
  FormStoreState,
  RendererComponentProps,
  RendererDefinition,
  RuntimeFieldRegistration,
  ScopeRef
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import {
  useCurrentForm,
  useCurrentFormModelGeneration,
  useCurrentFormState,
  useRenderScope,
  useRendererRuntime,
  useScopeSelector
} from '@nop-chaos/flux-react';
import { FormContext, ScopeContext } from '@nop-chaos/flux-react';
import { Button } from '@nop-chaos/ui';
import type { ArrayFieldSchema } from './composite-schemas';
import {
  formLabelFieldRule,
  readFieldValue,
  useFieldPresentation
} from '../field-utils';
import { FieldHint, FieldLabel } from './shared';
import { resolveFieldLabelContent } from '../field-utils';

function toArrayItems(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function createItemStore(parentStore: FormStoreApi, itemFullPrefix: string): FormStoreApi {
  const prefixDot = `${itemFullPrefix}.`;
  let lastParentState: FormStoreState | undefined;
  let lastProjectedState: FormStoreState | undefined;

  function projectState(state: FormStoreState): FormStoreState {
    if (state === lastParentState && lastProjectedState !== undefined) {
      return lastProjectedState;
    }

    const subObject = (getIn(state.values, itemFullPrefix) ?? {}) as Record<string, unknown>;

    const errors: Record<string, any> = {};
    for (const [key, val] of Object.entries(state.errors)) {
      if (key.startsWith(prefixDot)) {
        const relKey = key.slice(prefixDot.length);
        errors[relKey] = (val as any[]).map((e: any) => ({
          ...e,
          path: typeof e.path === 'string' && e.path.startsWith(prefixDot) ? e.path.slice(prefixDot.length) : e.path,
          ownerPath: typeof e.ownerPath === 'string' && e.ownerPath.startsWith(prefixDot) ? e.ownerPath.slice(prefixDot.length) : e.ownerPath
        }));
      } else if (key === itemFullPrefix) {
        errors[''] = (val as any[]).map((e: any) => ({
          ...e,
          path: typeof e.path === 'string' && e.path === itemFullPrefix ? '' : e.path,
          ownerPath: typeof e.ownerPath === 'string' && e.ownerPath === itemFullPrefix ? '' : e.ownerPath
        }));
      }
    }

    const projectBoolMap = (map: Record<string, boolean>): Record<string, boolean> => {
      const result: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(map)) {
        if (key.startsWith(prefixDot)) {
          result[key.slice(prefixDot.length)] = val;
        }
      }
      return result;
    };

    const projected = {
      ...state,
      values: subObject as Record<string, any>,
      errors,
      validating: projectBoolMap(state.validating),
      touched: projectBoolMap(state.touched),
      dirty: projectBoolMap(state.dirty),
      visited: projectBoolMap(state.visited)
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
    subscribe(listener) {
      return parentStore.subscribe(listener);
    }
  };
}

function createItemScope(
  parentScope: ScopeRef,
  arrayPath: string,
  index: number,
  itemKind: 'scalar' | 'object',
  runtime: ReturnType<typeof useRendererRuntime>
): ScopeRef {
  const itemPrefix = `${arrayPath}.${index}`;

  if (itemKind === 'scalar') {
    const itemScope: ScopeRef = {
      id: `${parentScope.id}:arr:${arrayPath}:${index}`,
      path: `${parentScope.path}.${itemPrefix}`,
      parent: parentScope.parent,
      store: parentScope.store,
      get value() { return this.read(); },
      get(path) {
        if (!path || path === 'value') return parentScope.get(itemPrefix);
        if (path === 'index') return index;
        return parentScope.get(`${itemPrefix}.${path}`);
      },
      has(path) {
        if (!path || path === 'value') return parentScope.has(itemPrefix);
        if (path === 'index') return true;
        return parentScope.has(`${itemPrefix}.${path}`);
      },
      readOwn() { return parentScope.readOwn(); },
      read() { return parentScope.read(); },
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

  const itemScope: ScopeRef = {
    id: `${parentScope.id}:arr:${arrayPath}:${index}`,
    path: `${parentScope.path}.${itemPrefix}`,
    parent: parentScope.parent,
    store: parentScope.store,
    get value() { return this.read(); },
    get(path) {
      if (!path) return parentScope.get(itemPrefix);
      if (path === 'index') return index;
      return parentScope.get(`${itemPrefix}.${path}`);
    },
    has(path) {
      if (!path) return parentScope.has(itemPrefix);
      if (path === 'index') return true;
      return parentScope.has(`${itemPrefix}.${path}`);
    },
    readOwn() { return parentScope.readOwn(); },
    read() { return parentScope.read(); },
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

function createItemFormProxy(parentForm: FormRuntime, arrayPath: string, index: number): FormRuntime {
  const itemFullPrefix = `${arrayPath}.${index}`;

  function prefixPath(path: string): string {
    if (!path) return itemFullPrefix;
    return `${itemFullPrefix}.${path}`;
  }

  const itemStore = createItemStore(parentForm.store, itemFullPrefix);

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
  removable: boolean;
  runtime: ReturnType<typeof useRendererRuntime>;
  onRemove: (index: number) => void;
  renderItem: () => React.ReactNode;
}) {
  const { index, arrayPath, itemKind, parentScope, parentForm, removable, runtime, onRemove, renderItem } = props;

  const itemScope = React.useMemo(
    () => createItemScope(parentScope, arrayPath, index, itemKind, runtime),
    [parentScope, arrayPath, index, itemKind, runtime]
  );

  const itemForm = React.useMemo(
    () => (parentForm && itemKind === 'object' ? createItemFormProxy(parentForm, arrayPath, index) : parentForm),
    [parentForm, arrayPath, index, itemKind]
  );

  return (
    <div className="nop-array-field-item grid grid-cols-[1fr_auto] gap-2 items-start">
      <div className="nop-array-field-item-body">
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

export function ArrayFieldRenderer(props: RendererComponentProps<ArrayFieldSchema>) {
  const parentScope = useRenderScope();
  const runtime = useRendererRuntime();
  const parentForm = useCurrentForm();
  const name = String(props.props.name ?? props.schema.name ?? '');
  const itemKind = (props.props.itemKind ?? props.schema.itemKind ?? 'scalar') as 'scalar' | 'object';
  const addable = props.props.addable !== false;
  const removable = props.props.removable !== false;
  const readOnly = Boolean(props.props.readOnly ?? props.schema.readOnly);
  const modelGeneration = useCurrentFormModelGeneration();

  const presentation = useFieldPresentation(name, parentForm, {
    disabled: props.meta.disabled,
    readOnly
  });

  const labelContent = resolveFieldLabelContent(props);

  const formValue = useCurrentFormState(
    (state) => (parentForm && name ? toArrayItems(getIn(state.values, name)) : undefined),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((item, i) => item === b[i]);
    }
  );
  const scopeValue = useScopeSelector(
    (scopeData) => (parentForm || !name ? undefined : toArrayItems(getIn(scopeData, name))),
    (a, b) => {
      if (a === b) return true;
      if (!a || !b || a.length !== b.length) return false;
      return a.every((item, i) => item === b[i]);
    }
  );

  const items = (parentForm ? formValue : scopeValue) ?? [];

  const itemTemplate = props.regions.item?.templateNode;

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

  return (
    <div
      className={`nop-field nop-array-field ${presentation.className}`}
      data-field-visited={presentation['data-field-visited']}
      data-field-touched={presentation['data-field-touched']}
      data-field-dirty={presentation['data-field-dirty']}
      data-field-invalid={presentation['data-field-invalid']}
    >
      <FieldLabel content={labelContent} />
      <div className="nop-array-field-body grid gap-3">
        {items.map((_item, index) => (
          <ArrayItem
            key={index}
            index={index}
            arrayPath={name}
            itemKind={itemKind}
            parentScope={parentScope}
            parentForm={parentForm}
            removable={removable && !readOnly && !presentation.effectiveDisabled}
            runtime={runtime}
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
    collectRules(_schema: BaseSchema) {
      return [];
    }
  }
};
