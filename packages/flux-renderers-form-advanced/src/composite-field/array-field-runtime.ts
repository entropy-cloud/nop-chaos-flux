import type {
  FormRuntime,
  ScopeRef
} from '@nop-chaos/flux-core';
import { getIn, toRecord } from '@nop-chaos/flux-core';
import { createProjectedInlineForm } from './projected-inline-form';
import { createProjectedOwnerScope } from '../projected-owner-scope';

export function createItemScope(
  parentScope: ScopeRef,
  arrayPath: string,
  index: number,
  itemKind: 'scalar' | 'object',
  readOnly: boolean,
  itemIdentity: string
): ScopeRef {
  const itemPrefix = `${arrayPath}.${index}`;
  const itemScopePath = arrayPath
    ? `${parentScope.path}.${arrayPath}.itemsByKey.${itemIdentity}`
    : `${parentScope.path}.itemsByKey.${itemIdentity}`;

  return createProjectedOwnerScope({
    parentScope,
    scopeId: `${parentScope.id}:arr:${arrayPath}:${itemIdentity}`,
    scopePath: itemScopePath,
    readOnly,
    getValue: () => parentScope.get(itemPrefix),
    setValue: (value) => parentScope.update(itemPrefix, value),
    getExtraPayload: () => ({ index }),
    getNestedValue: (path) => parentScope.get(`${itemPrefix}.${path}`),
    hasNestedValue: (path) => parentScope.has(`${itemPrefix}.${path}`),
    setNestedValue: (path, value) => parentScope.update(`${itemPrefix}.${path}`, value),
    getAdditionalPath: (path) => parentScope.get(`${itemPrefix}.${path}`),
    hasAdditionalPath: (path) => parentScope.has(`${itemPrefix}.${path}`),
    setAdditionalPath: (path, value) => parentScope.update(`${itemPrefix}.${path}`, value),
    merge(data) {
      if (data && typeof data === 'object') {
        parentScope.merge(toRecord(data));
      }
    },
    replace(data) {
      parentScope.replace?.(data as Record<string, unknown>);
    }
  });
}

export function createItemFormProxy(
  parentForm: FormRuntime,
  arrayPath: string,
  index: number,
  itemKind: 'scalar' | 'object'
): FormRuntime {
  const itemFullPrefix = `${arrayPath}.${index}`;

  function prefixPath(path: string): string {
    if (!path) return itemFullPrefix;
    if (itemKind === 'scalar' && path === 'value') return itemFullPrefix;
    return `${itemFullPrefix}.${path}`;
  }

  return createProjectedInlineForm({
    parentForm,
    ownerRootPath: itemFullPrefix,
    prefixPath,
    scalarValueAlias: itemKind === 'scalar' ? 'value' : undefined,
    projectValues(state) {
      const rawItemValue = getIn(state.values, itemFullPrefix);
      return itemKind === 'scalar'
        ? { value: rawItemValue ?? '' }
        : ((rawItemValue ?? {}) as Record<string, unknown>);
    },
  });
}
