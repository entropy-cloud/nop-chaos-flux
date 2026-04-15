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
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { FormContext, ScopeContext } from '@nop-chaos/flux-react';
import { useCurrentForm, useCurrentFormState, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { ObjectFieldSchema } from './composite-schemas';
import { formLabelFieldRule, resolveFieldLabelContent, useFieldPresentation } from '../field-utils';
import { FieldHint, FieldLabel } from './shared';
import { createProjectedScopeHelpers } from './projected-scope';

function createPrefixedStore(parentStore: FormStoreApi, prefix: string): FormStoreApi {
  const binding = createPathBinding({ ownerRootPath: prefix });
  let lastParentState: FormStoreState | undefined;
  let lastProjectedState: FormStoreState | undefined;

  function projectState(state: FormStoreState): FormStoreState {
    if (state === lastParentState && lastProjectedState !== undefined) {
      return lastProjectedState;
    }

    const subObject = (getIn(state.values, prefix) ?? {}) as Record<string, unknown>;

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

function createPrefixedFormProxy(parentForm: FormRuntime, prefix: string): FormRuntime {
  function prefixPath(path: string): string {
    if (!path || !prefix) {
      return path;
    }

    return `${prefix}.${path}`;
  }

  const prefixedStore = createPrefixedStore(parentForm.store, prefix);

  const proxy: FormRuntime = {
    ...parentForm,
    get store() {
      return prefixedStore;
    },
    get validation() {
      return parentForm.validation;
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
      for (const [key, value] of Object.entries(values)) {
        prefixed[prefixPath(key)] = value;
      }
      parentForm.setValues(prefixed);
    },
    registerField(registration) {
      return parentForm.registerField({
        ...registration,
        path: prefixPath(registration.path),
        childPaths: registration.childPaths?.map((path) => prefixPath(path))
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

function createObjectFieldChildScope(parentScope: ScopeRef, name: string, readOnly: boolean): ScopeRef {
  const prefix = name ? `${name}.` : '';
  const buildPayload = () => ({
    value: parentScope.get(name),
    readOnly
  });
  const { readSnapshot, store } = createProjectedScopeHelpers(parentScope, buildPayload);

  return {
    id: `${parentScope.id}:obj:${name}`,
    path: `${parentScope.path}.${name}`,
    parent: parentScope.parent,
    store,
    get value() {
      return readSnapshot();
    },
    get(path) {
      if (!path) return buildPayload();
      if (path === 'value') return parentScope.get(name);
      if (path === 'readOnly') return readOnly;
      if (path.startsWith('value.')) return parentScope.get(`${prefix}${path.slice('value.'.length)}`);
      return parentScope.get(`${prefix}${path}`);
    },
    has(path) {
      if (!path) return true;
      if (path === 'value' || path === 'readOnly') return true;
      if (path.startsWith('value.')) return parentScope.has(`${prefix}${path.slice('value.'.length)}`);
      return parentScope.has(`${prefix}${path}`);
    },
    readOwn() {
      return readSnapshot();
    },
    readVisible() {
      return readSnapshot();
    },
    materializeVisible() {
      return readSnapshot();
    },
    update(path, value) {
      if (!path || path === 'value') {
        parentScope.update(name, value);
        return;
      }

      if (path.startsWith('value.')) {
        parentScope.update(`${prefix}${path.slice('value.'.length)}`, value);
        return;
      }

      parentScope.update(`${prefix}${path}`, value);
    },
    merge(data) {
      if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
        parentScope.update(name, (data as { value: unknown }).value);
        return;
      }

      parentScope.merge(data);
    },
    replace(data) {
      if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
        parentScope.update(name, (data as { value: unknown }).value);
        return;
      }

      parentScope.replace?.(data);
    }
  };
}

export function ObjectFieldRenderer(props: RendererComponentProps<ObjectFieldSchema>) {
  const parentScope = useRenderScope();
  const parentForm = useCurrentForm();
  const name = String(props.props.name ?? '');
  const readOnly = Boolean(props.props.readOnly);

  const formValue = useCurrentFormState(
    (state) => (name ? getIn(state.values, name) : state.values),
    Object.is
  );
  const scopeValue = useScopeSelector((data) => (name ? getIn(data, name) : data), Object.is);
  void (parentForm ? formValue : scopeValue);

  const presentation = useFieldPresentation(name, parentForm, {
    disabled: props.meta.disabled,
    readOnly
  });

  const labelContent = resolveFieldLabelContent(props);
  const bodyContent = resolveRendererSlotContent(props, 'body');

  const childScope = React.useMemo(
    () => (name ? createObjectFieldChildScope(parentScope, name, readOnly || presentation.effectiveDisabled) : parentScope),
    [name, parentScope, presentation.effectiveDisabled, readOnly]
  );

  const childForm = React.useMemo(
    () => (name && parentForm ? createPrefixedFormProxy(parentForm, name) : parentForm),
    [parentForm, name]
  );

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
        <FormContext.Provider value={childForm ?? undefined}>
          <ScopeContext.Provider value={childScope}>
            <div data-slot="object-field-body">{bodyContent}</div>
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
    collectRules() {
      return [];
    },
    getChildFieldPathPrefix(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    }
  }
};
