import React from 'react';
import type {
  BaseSchema,
  CompiledFormValidationModel,
  FormRuntime,
  FormStoreApi,
  FormStoreState,
  RendererComponentProps,
  RendererDefinition,
  ScopeRef
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { useCurrentForm, useRenderScope } from '@nop-chaos/flux-react';
import { FormContext, ScopeContext } from '@nop-chaos/flux-react';
import type { ObjectFieldSchema } from './composite-schemas';
import { formLabelFieldRule, useFieldPresentation } from '../field-utils';
import { FieldHint, FieldLabel } from './shared';
import { resolveFieldLabelContent } from '../field-utils';

function createPrefixedValidationModel(
  model: CompiledFormValidationModel | undefined,
  prefix: string
): CompiledFormValidationModel | undefined {
  if (!model?.nodes) return undefined;
  const prefixDot = `${prefix}.`;
  const newNodes: Record<string, any> = {};

  newNodes[''] = { path: '', kind: 'form', rules: [], children: [], parent: undefined };

  for (const [key, node] of Object.entries(model.nodes)) {
    if (key === prefix) {
      const relKey = '';
      newNodes[relKey] = {
        ...node,
        path: relKey,
        parent: undefined,
        children: node.children
          .filter((c) => c.startsWith(prefixDot))
          .map((c) => c.slice(prefixDot.length))
      };
    } else if (key.startsWith(prefixDot)) {
      const relKey = key.slice(prefixDot.length);
      const relParent = node.parent?.startsWith(prefixDot)
        ? node.parent.slice(prefixDot.length)
        : node.parent === prefix
          ? ''
          : '';
      newNodes[relKey] = {
        ...node,
        path: relKey,
        parent: relParent,
        children: node.children
          .filter((c) => c.startsWith(prefixDot))
          .map((c) => c.slice(prefixDot.length))
      };
    }
  }

  const order = (model.order ?? [])
    .filter((p) => p.startsWith(prefixDot))
    .map((p) => p.slice(prefixDot.length));

  return {
    ...model,
    nodes: newNodes,
    order,
    validationOrder: order
  };
}

function createPrefixedStore(parentStore: FormStoreApi, prefix: string): FormStoreApi {
  const prefixDot = `${prefix}.`;
  let lastParentState: FormStoreState | undefined;
  let lastProjectedState: FormStoreState | undefined;

  function projectState(state: FormStoreState): FormStoreState {
    if (state === lastParentState && lastProjectedState !== undefined) {
      return lastProjectedState;
    }

    const subObject = (getIn(state.values, prefix) ?? {}) as Record<string, unknown>;

    const errors: Record<string, any> = {};
    for (const [key, val] of Object.entries(state.errors)) {
      if (key.startsWith(prefixDot)) {
        const relKey = key.slice(prefixDot.length);
        errors[relKey] = (val as any[]).map((e: any) => ({
          ...e,
          path: typeof e.path === 'string' && e.path.startsWith(prefixDot) ? e.path.slice(prefixDot.length) : e.path,
          ownerPath: typeof e.ownerPath === 'string' && e.ownerPath.startsWith(prefixDot) ? e.ownerPath.slice(prefixDot.length) : e.ownerPath
        }));
      } else if (key === prefix) {
        errors[''] = (val as any[]).map((e: any) => ({
          ...e,
          path: typeof e.path === 'string' && e.path === prefix ? '' : e.path,
          ownerPath: typeof e.ownerPath === 'string' && e.ownerPath === prefix ? '' : e.ownerPath
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

function createPrefixedFormProxy(parentForm: FormRuntime, prefix: string): FormRuntime {
  function prefixPath(path: string): string {
    if (!path || !prefix) return path;
    return `${prefix}.${path}`;
  }

  const prefixedStore = createPrefixedStore(parentForm.store, prefix);
  const prefixedValidation = createPrefixedValidationModel(parentForm.validation, prefix);

  const proxy: FormRuntime = {
    ...parentForm,
    get store() {
      return prefixedStore;
    },
    get validation() {
      return prefixedValidation;
    },
    get lifecycleState() {
      return parentForm.lifecycleState;
    },
    get modelGeneration() {
      return parentForm.modelGeneration;
    },
    get scopeId() {
      return parentForm.scopeId;
    },
    get rootPath() {
      return parentForm.rootPath;
    },
    get canSubmit() {
      return parentForm.canSubmit;
    },
    get allTouched() {
      return parentForm.allTouched;
    },
    isPathOwned(path) {
      return parentForm.isPathOwned(prefixPath(path));
    },
    getFieldState(path) {
      return parentForm.getFieldState(prefixPath(path));
    },
    validateAt(path, reason) {
      return parentForm.validateAt(prefixPath(path), reason);
    },
    validateField(path, reason) {
      return parentForm.validateField(prefixPath(path), reason);
    },
    getField(path) {
      return parentForm.getField(prefixPath(path));
    },
    getDependents(path) {
      return parentForm.getDependents(prefixPath(path));
    },
    findByPrefix(path) {
      return parentForm.findByPrefix(prefixPath(path));
    },
    getChildren(path) {
      return parentForm.getChildren(prefixPath(path));
    },
    getError(path) {
      return parentForm.getError(prefixPath(path));
    },
    isValidating(path) {
      return parentForm.isValidating(prefixPath(path));
    },
    isTouched(path) {
      return parentForm.isTouched(prefixPath(path));
    },
    isDirty(path) {
      return parentForm.isDirty(prefixPath(path));
    },
    isVisited(path) {
      return parentForm.isVisited(prefixPath(path));
    },
    touchField(path) {
      parentForm.touchField(prefixPath(path));
    },
    visitField(path) {
      parentForm.visitField(prefixPath(path));
    },
    clearErrors(path) {
      parentForm.clearErrors(path ? prefixPath(path) : path);
    },
    setValue(name, value) {
      parentForm.setValue(prefixPath(name), value);
    },
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
    notifyFieldHidden(path, hidden) {
      parentForm.notifyFieldHidden(prefixPath(path), hidden);
    },
    validateSubtree(path, reason) {
      return parentForm.validateSubtree(prefixPath(path), reason);
    }
  };

  return proxy;
}

function createObjectFieldChildScope(parentScope: ScopeRef, name: string): ScopeRef {
  const prefix = name ? `${name}.` : '';

  const childScope: ScopeRef = {
    id: `${parentScope.id}:obj:${name}`,
    path: `${parentScope.path}.${name}`,
    parent: parentScope.parent,
    store: parentScope.store,
    get value() {
      return this.read();
    },
    get(path) {
      if (!path) return parentScope.get(name);
      return parentScope.get(`${prefix}${path}`);
    },
    has(path) {
      if (!path) return parentScope.has(name);
      return parentScope.has(`${prefix}${path}`);
    },
    readOwn() {
      return parentScope.readOwn();
    },
    read() {
      return parentScope.read();
    },
    update(path, value) {
      if (!path) {
        parentScope.update(name, value);
        return;
      }
      parentScope.update(`${prefix}${path}`, value);
    },
    merge(data) {
      parentScope.merge(data);
    },
    replace(data) {
      parentScope.replace?.(data);
    }
  };

  return childScope;
}

export function ObjectFieldRenderer(props: RendererComponentProps<ObjectFieldSchema>) {
  const parentScope = useRenderScope();
  const parentForm = useCurrentForm();
  const name = String(props.props.name ?? props.schema.name ?? '');
  const readOnly = Boolean(props.props.readOnly ?? props.schema.readOnly);

  const presentation = useFieldPresentation(name, parentForm, {
    disabled: props.meta.disabled,
    readOnly
  });

  const labelContent = resolveFieldLabelContent(props);
  const bodyContent = resolveRendererSlotContent(props, 'body');

  const childScope = React.useMemo(
    () => (name ? createObjectFieldChildScope(parentScope, name) : parentScope),
    [parentScope, name]
  );

  const childForm = React.useMemo(
    () => (name && parentForm ? createPrefixedFormProxy(parentForm, name) : parentForm),
    [parentForm, name]
  );

  return (
    <div
      className={`nop-field nop-object-field ${presentation.className}`}
      data-field-visited={presentation['data-field-visited']}
      data-field-touched={presentation['data-field-touched']}
      data-field-dirty={presentation['data-field-dirty']}
      data-field-invalid={presentation['data-field-invalid']}
    >
      <FieldLabel content={labelContent} />
      <div className="nop-object-field-body">
        <FormContext.Provider value={childForm ?? undefined}>
          <ScopeContext.Provider value={childScope}>
            {bodyContent}
          </ScopeContext.Provider>
        </FormContext.Provider>
      </div>
      <FieldHint
        errorMessage={presentation.fieldState.error?.message}
        showError={presentation.showError}
      />
    </div>
  );
}

export const objectFieldRendererDefinition: RendererDefinition = {
  type: 'object-field',
  component: ObjectFieldRenderer,
  regions: ['body'],
  fields: [formLabelFieldRule],
  validation: {
    kind: 'field',
    valueKind: 'object',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules(_schema: BaseSchema) {
      return [];
    },
    getChildFieldPathPrefix(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    }
  }
};
