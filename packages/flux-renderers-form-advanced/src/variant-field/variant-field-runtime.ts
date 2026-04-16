import type {
  FormRuntime,
  FormStoreApi,
  ScopeRef
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { createProjectedScopeHelpers } from '../detail-view/projected-scope';
import { createProjectedFormRuntime, createProjectedFormStore } from '../detail-view/projected-form-runtime';

export function createVariantFormProxy(parentForm: FormRuntime, prefix: string): FormRuntime {
  function prefixPath(path: string) {
    if (!prefix) {
      return path;
    }

    return path ? `${prefix}.${path}` : prefix;
  }

  return createProjectedFormRuntime(parentForm, {
    prefixPath,
    store: createProjectedFormStore(parentForm.store, {
      ownerRootPath: prefix,
      projectValues(state) {
        const subValue = prefix ? getIn(state.values, prefix) : state.values;
        return (subValue !== undefined ? subValue : null) as FormStoreApi['getState'] extends () => infer T
          ? T extends { values: infer V } ? V : never
          : never;
      }
    }),
    supportsArrayMutations: true
  });
}

export function createVariantScope(
  parentScope: ScopeRef,
  name: string,
  activeVariant: string | undefined,
  readOnly: boolean
): ScopeRef {
  const buildPayload = () => ({
    value: parentScope.get(name),
    variant: activeVariant,
    readOnly
  });
  const { readSnapshot, store } = createProjectedScopeHelpers(parentScope, buildPayload);

  return {
    id: `${parentScope.id}:variant:${name || 'root'}`,
    path: `${parentScope.path}.${name || '$value'}`,
    parent: parentScope.parent,
    store,
    get value() {
      return readSnapshot();
    },
    get(path) {
      if (!path) {
        return buildPayload();
      }

      if (path === 'value') {
        return parentScope.get(name);
      }

      if (path === 'variant') {
        return activeVariant;
      }

      if (path === 'readOnly') {
        return readOnly;
      }

      if (path.startsWith('value.')) {
        return parentScope.get(name ? `${name}.${path.slice('value.'.length)}` : path.slice('value.'.length));
      }

      return undefined;
    },
    has(path) {
      if (!path) {
        return true;
      }

      if (path === 'value' || path === 'variant' || path === 'readOnly') {
        return true;
      }

      if (path.startsWith('value.')) {
        return parentScope.has(name ? `${name}.${path.slice('value.'.length)}` : path.slice('value.'.length));
      }

      return false;
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
        parentScope.update(name ? `${name}.${path.slice('value.'.length)}` : path.slice('value.'.length), value);
        return;
      }

      parentScope.update(path, value);
    },
    merge(data) {
      if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
        parentScope.update(name, (data as { value: unknown }).value);
        return;
      }

      if (name) {
        parentScope.update(name, data);
        return;
      }

      parentScope.merge(data);
    },
    replace(data) {
      if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
        parentScope.update(name, (data as { value: unknown }).value);
        return;
      }

      parentScope.update(name, data);
    }
  };
}
