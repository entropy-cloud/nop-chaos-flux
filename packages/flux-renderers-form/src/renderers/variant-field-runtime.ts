import type {
  FormRuntime,
  FormStoreApi,
  FormStoreState,
  ScopeRef
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';

export function createVariantStore(parentStore: FormStoreApi, prefix: string): FormStoreApi {
  const prefixDot = prefix ? `${prefix}.` : '';
  let lastParentState: FormStoreState | undefined;
  let lastProjectedState: FormStoreState | undefined;

  function mapPath(path: string) {
    if (!path) {
      return '';
    }

    if (path === prefix) {
      return '';
    }

    if (prefixDot && path.startsWith(prefixDot)) {
      return path.slice(prefixDot.length);
    }

    return undefined;
  }

  function projectState(state: FormStoreState): FormStoreState {
    if (state === lastParentState && lastProjectedState !== undefined) {
      return lastProjectedState;
    }

    const subValue = prefix ? getIn(state.values, prefix) : state.values;
    const values = (subValue !== undefined ? subValue : null) as FormStoreState['values'];

    const errors: Record<string, any> = {};
    for (const [key, val] of Object.entries(state.errors)) {
      const mapped = mapPath(key);
      if (mapped === undefined) continue;
      errors[mapped] = (val as any[]).map((e: any) => ({
        ...e,
        path: mapPath(typeof e.path === 'string' ? e.path : '') ?? e.path,
        ownerPath: mapPath(typeof e.ownerPath === 'string' ? e.ownerPath : '') ?? e.ownerPath
      }));
    }

    const projectBoolMap = (map: Record<string, boolean>): Record<string, boolean> => {
      const result: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(map)) {
        const mapped = mapPath(key);
        if (mapped !== undefined) {
          result[mapped] = val;
        }
      }
      return result;
    };

    const projected = {
      ...state,
      values,
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
    getState() {
      return projectState(parentStore.getState());
    },
    subscribe(listener) {
      return parentStore.subscribe(listener);
    }
  };
}

export function createVariantFormProxy(parentForm: FormRuntime, prefix: string): FormRuntime {
  function prefixPath(path: string) {
    if (!prefix) {
      return path;
    }

    return path ? `${prefix}.${path}` : prefix;
  }

  const variantStore = createVariantStore(parentForm.store, prefix);

  return {
    ...parentForm,
    get store() {
      return variantStore;
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
    clearErrors(path) { parentForm.clearErrors(path === undefined ? undefined : prefixPath(path)); },
    setValue(path, value) { parentForm.setValue(prefixPath(path), value); },
    setValues(values) {
      const prefixed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(values)) {
        prefixed[prefixPath(key)] = value;
      }
      parentForm.setValues(prefixed);
    },
    appendValue(path, value) { parentForm.appendValue(prefixPath(path), value); },
    prependValue(path, value) { parentForm.prependValue(prefixPath(path), value); },
    insertValue(path, index, value) { parentForm.insertValue(prefixPath(path), index, value); },
    removeValue(path, index) { parentForm.removeValue(prefixPath(path), index); },
    moveValue(path, from, to) { parentForm.moveValue(prefixPath(path), from, to); },
    swapValue(path, a, b) { parentForm.swapValue(prefixPath(path), a, b); },
    replaceValue(path, value) { parentForm.replaceValue(prefixPath(path), value); },
    registerField(registration) {
      return parentForm.registerField({
        ...registration,
        path: prefixPath(registration.path),
        childPaths: registration.childPaths?.map((path) => prefixPath(path))
      });
    },
    notifyFieldHidden(path, hidden) { parentForm.notifyFieldHidden(prefixPath(path), hidden); },
    validateSubtree(path, reason) { return parentForm.validateSubtree(prefixPath(path), reason); }
  };
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

  return {
    id: `${parentScope.id}:variant:${name || 'root'}`,
    path: `${parentScope.path}.${name || '$value'}`,
    parent: parentScope.parent,
    store: parentScope.store,
    get value() {
      return this.readOwn();
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
      return buildPayload();
    },
    read() {
      return buildPayload();
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
