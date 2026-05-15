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
  type SummaryVersion =
    | TSummary
    | {
        keys: readonly string[];
        values: readonly unknown[];
      };

  const summaryVersionEqual = (left: SummaryVersion, right: SummaryVersion): boolean => {
    if (Object.is(left, right)) {
      return true;
    }

    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') {
      return false;
    }

    const leftRecord = left as { keys?: readonly string[]; values?: readonly unknown[] };
    const rightRecord = right as { keys?: readonly string[]; values?: readonly unknown[] };
    if (!leftRecord.keys || !rightRecord.keys || !leftRecord.values || !rightRecord.values) {
      return false;
    }

    if (leftRecord.keys.length !== rightRecord.keys.length) {
      return false;
    }

    for (let index = 0; index < leftRecord.keys.length; index += 1) {
      if (leftRecord.keys[index] !== rightRecord.keys[index]) {
        return false;
      }
      if (!Object.is(leftRecord.values[index], rightRecord.values[index])) {
        return false;
      }
    }

    return true;
  };

  const buildSummaryVersion = (summary: TSummary): SummaryVersion => {
    if (!summary || typeof summary !== 'object') {
      return summary;
    }

    const record = summary as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return {
      keys,
      values: keys.map((key) => record[key]),
    };
  };

  let lastVersionedSummary: TSummary | undefined;
  let lastStableSummaryVersion: SummaryVersion | undefined;

  const getSummaryVersion = (summary: TSummary): SummaryVersion => {
    if (
      lastStableSummaryVersion !== undefined &&
      lastVersionedSummary !== undefined &&
      Object.is(lastVersionedSummary, summary)
    ) {
      return lastStableSummaryVersion;
    }

    const nextVersion = buildSummaryVersion(summary);
    if (
      lastStableSummaryVersion !== undefined &&
      summaryVersionEqual(lastStableSummaryVersion, nextVersion)
    ) {
      lastVersionedSummary = summary;
      return lastStableSummaryVersion;
    }

    lastVersionedSummary = summary;
    lastStableSummaryVersion = nextVersion;
    return nextVersion;
  };
  const buildOwnSnapshot = () => ({
    ...scope.readOwn(),
    [bindingKey]: getSummary(),
  });
  const { readSnapshot, store } = createProjectedScopeStore(scope, buildOwnSnapshot, () =>
    getSummaryVersion(getSummary()),
  );

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
      const summaryVersion = getSummaryVersion(summary);
      if (
        cachedVisible &&
        lastParentVisible === parentVisible &&
        summaryVersionEqual(lastSummaryVersionForVisible as SummaryVersion, summaryVersion)
      ) {
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
      const summaryVersion = getSummaryVersion(summary);
      if (
        cachedMat &&
        lastParentMat === parentMat &&
        summaryVersionEqual(lastSummaryVersionForMat as SummaryVersion, summaryVersion)
      ) {
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
