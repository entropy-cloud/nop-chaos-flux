import type {
  FormRuntime,
  FormStoreApi,
  ScopeRef
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { createProjectedInlineForm } from '../composite-field/projected-inline-form';
import { createProjectedOwnerScope } from '../projected-owner-scope';

export function createVariantFormProxy(parentForm: FormRuntime, prefix: string): FormRuntime {
  function prefixPath(path: string) {
    if (!prefix) {
      return path;
    }

    return path ? `${prefix}.${path}` : prefix;
  }

  return createProjectedInlineForm({
    parentForm,
    ownerRootPath: prefix,
    prefixPath,
    projectValues(state) {
      const subValue = prefix ? getIn(state.values, prefix) : state.values;
      return (subValue !== undefined ? subValue : null) as FormStoreApi['getState'] extends () => infer T
        ? T extends { values: infer V } ? V : never
        : never;
    },
    supportsArrayMutations: true
  });
}

export function createVariantScope(
  parentScope: ScopeRef,
  name: string,
  activeVariant: string | undefined,
  readOnly: boolean
): ScopeRef {
  return createProjectedOwnerScope({
    parentScope,
    scopeId: `${parentScope.id}:variant:${name || 'root'}`,
    scopePath: `${parentScope.path}.${name || '$value'}`,
    readOnly,
    getValue: () => parentScope.get(name),
    setValue: (value) => parentScope.update(name, value),
    getExtraPayload: () => ({ variant: activeVariant }),
    getNestedValue: (path) => parentScope.get(name ? `${name}.${path}` : path),
    hasNestedValue: (path) => parentScope.has(name ? `${name}.${path}` : path),
    setNestedValue: (path, value) => parentScope.update(name ? `${name}.${path}` : path, value),
    setAdditionalPath: (path, value) => parentScope.update(path, value),
    merge(data) {
      if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
        parentScope.update(name, (data as { value: unknown }).value);
        return;
      }

      if (name) {
        parentScope.update(name, data);
        return;
      }

      if (data && typeof data === 'object') {
        parentScope.merge(data as Record<string, unknown>);
      }
    },
    replace(data) {
      if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
        parentScope.update(name, (data as { value: unknown }).value);
        return;
      }

      parentScope.update(name, data);
    }
  });
}
