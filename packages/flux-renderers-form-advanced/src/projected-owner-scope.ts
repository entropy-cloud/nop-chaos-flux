import type { ScopeRef } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { createProjectedScopeHelpers } from './detail-view/projected-scope.js';

interface CreateProjectedOwnerScopeOptions {
  parentScope: ScopeRef;
  scopeId: string;
  scopePath: string;
  readOnly: boolean;
  getValue: () => unknown;
  setValue: (value: unknown) => void;
  getExtraPayload?: () => Record<string, unknown>;
  getNestedValue?: (path: string) => unknown;
  hasNestedValue?: (path: string) => boolean;
  setNestedValue?: (path: string, value: unknown) => void;
  getAdditionalPath?: (path: string) => unknown;
  hasAdditionalPath?: (path: string) => boolean;
  setAdditionalPath?: (path: string, value: unknown) => void;
  merge: (data: unknown) => void;
  replace: (data: unknown) => void;
}

function hasOwnKey(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

export function createProjectedOwnerScope(options: CreateProjectedOwnerScopeOptions): ScopeRef {
  const {
    parentScope,
    scopeId,
    scopePath,
    readOnly,
    getValue,
    setValue,
    getExtraPayload,
    getNestedValue,
    hasNestedValue,
    setNestedValue,
    getAdditionalPath,
    hasAdditionalPath,
    setAdditionalPath,
    merge,
    replace,
  } = options;

  const buildPayload = () => ({
    value: getValue(),
    readOnly,
    ...(getExtraPayload?.() ?? {}),
  });
  const { readSnapshot, store } = createProjectedScopeHelpers(parentScope, buildPayload);

  return {
    id: scopeId,
    path: scopePath,
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
        return getValue();
      }

      if (path === 'readOnly') {
        return readOnly;
      }

      const extraPayload = getExtraPayload?.();
      if (extraPayload && hasOwnKey(extraPayload, path)) {
        return extraPayload[path];
      }

      if (path.startsWith('value.')) {
        const nestedPath = path.slice('value.'.length);
        return getNestedValue ? getNestedValue(nestedPath) : getIn(getValue(), nestedPath);
      }

      return getAdditionalPath?.(path);
    },
    has(path) {
      if (!path || path === 'value' || path === 'readOnly') {
        return true;
      }

      const extraPayload = getExtraPayload?.();
      if (extraPayload && hasOwnKey(extraPayload, path)) {
        return true;
      }

      if (path.startsWith('value.')) {
        const nestedPath = path.slice('value.'.length);
        if (hasNestedValue) {
          return hasNestedValue(nestedPath);
        }

        const nestedValue = getNestedValue
          ? getNestedValue(nestedPath)
          : getIn(getValue(), nestedPath);
        return nestedValue !== undefined;
      }

      return hasAdditionalPath?.(path) ?? false;
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
        setValue(value);
        return;
      }

      if (path.startsWith('value.')) {
        setNestedValue?.(path.slice('value.'.length), value);
        return;
      }

      setAdditionalPath?.(path, value);
    },
    merge,
    replace,
  };
}
