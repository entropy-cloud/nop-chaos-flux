import { getIn, parsePath, type ScopeRef } from '@nop-chaos/flux-core';
import { createProjectedScopeStore } from './projected-scope-store.js';

export function publishOwnerStatus<TSummary>(
  scope: ScopeRef | undefined,
  statusPath: string | undefined,
  summary: TSummary,
): void {
  if (!scope || !statusPath) {
    return;
  }

  scope.update(statusPath, summary);
}

export function createReadonlyScopeBinding<TSummary>(
  scope: ScopeRef,
  bindingKey: string,
  getSummary: () => TSummary,
): ScopeRef {
  const getSummaryVersion = () => {
    const summary = getSummary();

    if (!summary || typeof summary !== 'object') {
      return summary;
    }

    const record = summary as Record<string, unknown>;
    return JSON.stringify(Object.keys(record).sort().map((key) => [key, record[key]]));
  };
  const buildOwnSnapshot = () => ({
    ...scope.readOwn(),
    [bindingKey]: getSummary(),
  });
  const { readSnapshot, store } = createProjectedScopeStore(scope, buildOwnSnapshot, getSummaryVersion);

  let lastParentVisible: Record<string, any> | undefined;
  let lastSummaryVersionForVisible: unknown;
  let cachedVisible: Record<string, any> | undefined;

  let lastParentMat: Record<string, any> | undefined;
  let lastSummaryVersionForMat: unknown;
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
      const summaryVersion = getSummaryVersion();
      if (cachedVisible && lastParentVisible === parentVisible && lastSummaryVersionForVisible === summaryVersion) {
        return cachedVisible;
      }
      lastParentVisible = parentVisible;
      lastSummaryVersionForVisible = summaryVersion;
      const overlay = Object.create(parentVisible) as Record<string, any>;
      overlay[bindingKey] = summary;
      cachedVisible = overlay;
      return cachedVisible;
    },
    materializeVisible() {
      const parentMat = scope.materializeVisible();
      const summary = getSummary();
      const summaryVersion = getSummaryVersion();
      if (cachedMat && lastParentMat === parentMat && lastSummaryVersionForMat === summaryVersion) {
        return cachedMat;
      }
      lastParentMat = parentMat;
      lastSummaryVersionForMat = summaryVersion;
      cachedMat = {
        ...parentMat,
        [bindingKey]: summary,
      };
      return cachedMat;
    },
  };
}
