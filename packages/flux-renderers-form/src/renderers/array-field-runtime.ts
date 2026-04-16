import type {
  FormRuntime,
  ScopeRef
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { createProjectedScopeHelpers } from './projected-scope';
import { createProjectedFormRuntime, createProjectedFormStore } from './projected-form-runtime';

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

  if (itemKind === 'scalar') {
    const buildPayload = () => ({
      value: parentScope.get(itemPrefix),
      index,
      readOnly
    });
    const { readSnapshot, store } = createProjectedScopeHelpers(parentScope, buildPayload);

    return {
      id: `${parentScope.id}:arr:${arrayPath}:${itemIdentity}`,
      path: itemScopePath,
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
        if (path === 'index' || path === 'readOnly') return true;
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
  }

  const buildPayload = () => ({
    value: parentScope.get(itemPrefix),
    index,
    readOnly
  });
  const { readSnapshot, store } = createProjectedScopeHelpers(parentScope, buildPayload);

  return {
    id: `${parentScope.id}:arr:${arrayPath}:${itemIdentity}`,
    path: itemScopePath,
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
      if (path === 'index' || path === 'readOnly' || path === 'value') return true;
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

  return createProjectedFormRuntime(parentForm, {
    prefixPath,
    store: createProjectedFormStore(parentForm.store, {
      ownerRootPath: itemFullPrefix,
      scalarValueAlias: itemKind === 'scalar' ? 'value' : undefined,
      projectValues(state) {
        const rawItemValue = getIn(state.values, itemFullPrefix);
        return itemKind === 'scalar'
          ? { value: rawItemValue ?? '' }
          : ((rawItemValue ?? {}) as Record<string, unknown>);
      }
    })
  });
}
