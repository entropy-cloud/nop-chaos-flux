import { getIn, parsePath, type ScopeRef } from '@nop-chaos/flux-core';
import { createProjectedScopeStore } from './projected-scope-store';

export function publishOwnerStatus<TSummary>(scope: ScopeRef | undefined, statusPath: string | undefined, summary: TSummary): void {
  if (!scope || !statusPath) {
    return;
  }

  scope.update(statusPath, summary);
}

export function createReadonlyScopeBinding<TSummary>(scope: ScopeRef, bindingKey: string, getSummary: () => TSummary): ScopeRef {
  const buildOwnSnapshot = () => ({
    ...scope.readOwn(),
    [bindingKey]: getSummary()
  });
  const { readSnapshot, store } = createProjectedScopeStore(scope, buildOwnSnapshot);

  let lastParentVisible: Record<string, any> | undefined;
  let lastSummaryForVisible: TSummary | undefined;
  let cachedVisible: Record<string, any> | undefined;

  let lastParentMat: Record<string, any> | undefined;
  let lastSummaryForMat: TSummary | undefined;
  let cachedMat: Record<string, any> | undefined;

  return {
    ...scope,
    store,
    get(path) {
      const segments = parsePath(path);

      if (segments[0] === bindingKey) {
        if (segments.length === 1) {
          return getSummary();
        }

        return getIn(getSummary(), segments.slice(1).join('.'));
      }

      return scope.get(path);
    },
    has(path) {
      const segments = parsePath(path);

      if (segments[0] === bindingKey) {
        if (segments.length === 1) {
          return true;
        }

        return getIn(getSummary(), segments.slice(1).join('.')) !== undefined;
      }

      if (path === bindingKey) {
        return true;
      }

      return scope.has(path);
    },
    readOwn() {
      return readSnapshot();
    },
    readVisible() {
      const parentVisible = scope.readVisible();
      const summary = getSummary();
      if (cachedVisible && lastParentVisible === parentVisible && lastSummaryForVisible === summary) {
        return cachedVisible;
      }
      lastParentVisible = parentVisible;
      lastSummaryForVisible = summary;
      const overlay = Object.create(parentVisible) as Record<string, any>;
      overlay[bindingKey] = summary;
      cachedVisible = overlay;
      return cachedVisible;
    },
    materializeVisible() {
      const parentMat = scope.materializeVisible();
      const summary = getSummary();
      if (cachedMat && lastParentMat === parentMat && lastSummaryForMat === summary) {
        return cachedMat;
      }
      lastParentMat = parentMat;
      lastSummaryForMat = summary;
      cachedMat = {
        ...parentMat,
        [bindingKey]: summary
      };
      return cachedMat;
    }
  };
}
