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
  getExtraBindings?: () => Record<string, unknown>,
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

  const buildSummaryVersion = <T,>(value: T): SummaryVersion => {
    if (!value || typeof value !== 'object') {
      return value as unknown as SummaryVersion;
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return {
      keys,
      values: keys.map((key) => record[key]),
    };
  };

  let lastVersionedSummary: TSummary | undefined;
  let lastStableSummaryVersion: SummaryVersion | undefined;
  let lastVersionedExtra: Record<string, unknown> | undefined;
  let lastStableExtraVersion: SummaryVersion | undefined;

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
  const EMPTY_EXTRA_VERSION: SummaryVersion = { keys: [], values: [] };
  const getExtraVersion = (extra: Record<string, unknown> | undefined): SummaryVersion => {
    if (!extra || Object.keys(extra).length === 0) {
      return EMPTY_EXTRA_VERSION;
    }

    if (
      lastStableExtraVersion !== undefined &&
      lastVersionedExtra !== undefined &&
      Object.is(lastVersionedExtra, extra)
    ) {
      return lastStableExtraVersion;
    }

    const nextVersion = buildSummaryVersion(extra);
    if (
      lastStableExtraVersion !== undefined &&
      summaryVersionEqual(lastStableExtraVersion, nextVersion)
    ) {
      lastVersionedExtra = extra;
      return lastStableExtraVersion;
    }

    lastVersionedExtra = extra;
    lastStableExtraVersion = nextVersion;
    return nextVersion;
  };
  const buildOwnSnapshot = () => ({
    ...scope.readOwn(),
    [bindingKey]: getSummary(),
    ...(getExtraBindings ? getExtraBindings() : {}),
  });
  const toVersionParts = (version: SummaryVersion): { keys: string[]; values: unknown[] } => {
    const candidate = version as { keys?: readonly string[]; values?: readonly unknown[] };
    return {
      keys: Array.isArray(candidate.keys) ? [...candidate.keys] : [],
      values: Array.isArray(candidate.values) ? [...candidate.values] : [],
    };
  };
  let lastCombinedSummaryVersion: SummaryVersion | undefined;
  let lastCombinedExtraVersion: SummaryVersion | undefined;
  let lastCombinedVersion: SummaryVersion | undefined;
  const getCombinedVersion = (): SummaryVersion => {
    const summaryVersion = getSummaryVersion(getSummary());
    const extraVersion = getExtraVersion(getExtraBindings?.());
    if (
      lastCombinedVersion &&
      Object.is(lastCombinedSummaryVersion, summaryVersion) &&
      Object.is(lastCombinedExtraVersion, extraVersion)
    ) {
      return lastCombinedVersion;
    }
    const summaryParts = toVersionParts(summaryVersion);
    const extraParts = toVersionParts(extraVersion);
    lastCombinedSummaryVersion = summaryVersion;
    lastCombinedExtraVersion = extraVersion;
    lastCombinedVersion = {
      keys: [...summaryParts.keys, ...extraParts.keys],
      values: [...summaryParts.values, ...extraParts.values],
    } as SummaryVersion;
    return lastCombinedVersion;
  };
  const { readSnapshot, store } = createProjectedScopeStore(scope, buildOwnSnapshot, () =>
    getCombinedVersion(),
  );

  let lastParentVisible: Record<string, any> | undefined;
  let lastSummaryVersionForVisible: unknown;
  let lastExtraVersionForVisible: unknown;
  let cachedVisible: Record<string, any> | undefined;

  let lastParentMat: Record<string, any> | undefined;
  let lastSummaryVersionForMat: unknown;
  let lastExtraVersionForMat: unknown;
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

      if (getExtraBindings) {
        const extra = getExtraBindings();
        if (path in extra) {
          return extra[path];
        }
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

      if (getExtraBindings) {
        const extra = getExtraBindings();
        if (path in extra) {
          return true;
        }
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
      const extraBindings = getExtraBindings ? getExtraBindings() : undefined;
      const extraVersion = getExtraVersion(extraBindings);
      if (
        cachedVisible &&
        lastParentVisible === parentVisible &&
        summaryVersionEqual(lastSummaryVersionForVisible as SummaryVersion, summaryVersion) &&
        summaryVersionEqual(lastExtraVersionForVisible as SummaryVersion, extraVersion)
      ) {
        return cachedVisible;
      }
      lastParentVisible = parentVisible;
      lastSummaryVersionForVisible = summaryVersion;
      lastExtraVersionForVisible = extraVersion;
      const overlay = Object.create(parentVisible) as Record<string, any>;
      overlay[bindingKey] = summary;
      if (extraBindings) {
        for (const [key, value] of Object.entries(extraBindings)) {
          overlay[key] = value;
        }
      }
      cachedVisible = overlay;
      return cachedVisible;
    },
    materializeVisible() {
      const parentMat = scope.materializeVisible();
      const summary = getSummary();
      const summaryVersion = getSummaryVersion(summary);
      const extraBindings = getExtraBindings ? getExtraBindings() : undefined;
      const extraVersion = getExtraVersion(extraBindings);
      if (
        cachedMat &&
        lastParentMat === parentMat &&
        summaryVersionEqual(lastSummaryVersionForMat as SummaryVersion, summaryVersion) &&
        summaryVersionEqual(lastExtraVersionForMat as SummaryVersion, extraVersion)
      ) {
        return cachedMat;
      }
      lastParentMat = parentMat;
      lastSummaryVersionForMat = summaryVersion;
      lastExtraVersionForMat = extraVersion;
      cachedMat = {
        ...parentMat,
        [bindingKey]: summary,
        ...(extraBindings ?? {}),
      };
      return cachedMat;
    },
  };
}
