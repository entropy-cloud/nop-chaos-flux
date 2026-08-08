import { reportRuntimeHostIssue, type RendererRuntime, type ScopeRef } from '@nop-chaos/flux-core';

export function createFormLifecycleScope(
  scope: ScopeRef,
  importBindings: Readonly<Record<string, unknown>>,
  _formName: string | undefined,
  _getFormValues: () => Record<string, unknown>,
): ScopeRef {
  const hasImports = Object.keys(importBindings).length > 0;

  if (!hasImports) {
    return scope;
  }

  let visibleView: Record<string, unknown> | undefined;
  let materialized: Record<string, unknown> | undefined;

  function getDynamicBindings(): Record<string, unknown> {
    return { ...importBindings };
  }

  return {
    id: scope.id,
    path: scope.path,
    parent: scope.parent,
    store: scope.store,
    get value() {
      return this.readVisible();
    },
    get(path) {
      const bindings = getDynamicBindings();
      if (Object.prototype.hasOwnProperty.call(bindings, path)) {
        return bindings[path];
      }

      return scope.get(path);
    },
    has(path) {
      const bindings = getDynamicBindings();
      if (Object.prototype.hasOwnProperty.call(bindings, path)) {
        return true;
      }

      return scope.has(path);
    },
    readOwn() {
      return scope.readOwn();
    },
    readVisible() {
      const bindings = getDynamicBindings();
      visibleView = Object.assign(
        Object.create(scope.readVisible()) as Record<string, unknown>,
        bindings,
      );

      return visibleView as Record<string, any>;
    },
    materializeVisible() {
      const bindings = getDynamicBindings();
      materialized = {
        ...scope.materializeVisible(),
        ...bindings,
      };

      return materialized as Record<string, any>;
    },
    update(path, value) {
      scope.update(path, value);
    },
    merge(data) {
      scope.merge(data);
    },
    replace(data) {
      scope.replace?.(data);
    },
  };
}

export function resolveLifecycleWriteScope(parentScope: ScopeRef): ScopeRef {
  const visible = parentScope.readVisible();
  const parentVisible = parentScope.parent?.readVisible();
  const looksLikeSurfaceShell =
    typeof visible.dialogId === 'string' || typeof visible.drawerId === 'string';
  const parentLooksLikeSurfaceShell =
    typeof parentVisible?.dialogId === 'string' || typeof parentVisible?.drawerId === 'string';

  return looksLikeSurfaceShell && parentScope.parent && !parentLooksLikeSurfaceShell
    ? parentScope.parent
    : parentScope;
}

export function reportFormInitActionError(
  runtime: RendererRuntime,
  path: string,
  error: unknown,
  message = 'Form initAction failed',
) {
  reportRuntimeHostIssue({
    env: runtime.env,
    level: 'error',
    message,
    error,
    phase: 'action',
    path,
  });
}
