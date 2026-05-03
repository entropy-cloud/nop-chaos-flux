import { useEffect, useRef } from 'react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { publishOwnerStatus } from '@nop-chaos/flux-runtime';

interface PublishedStatusTarget {
  scope: ScopeRef;
  statusPath: string;
}

function shallowEqualSummary(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord);
  const bKeys = Object.keys(bRecord);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every((key) => Object.is(aRecord[key], bRecord[key]));
}

function samePublishedTarget(
  a: PublishedStatusTarget | undefined,
  b: PublishedStatusTarget | undefined,
): boolean {
  if (!a || !b) {
    return a === b;
  }

  return a.statusPath === b.statusPath && a.scope.id === b.scope.id;
}

export function useStatusPathPublication<TSummary>(
  scope: ScopeRef | undefined,
  statusPath: string | undefined,
  summary: TSummary,
) {
  const publishedTargetRef = useRef<PublishedStatusTarget | undefined>(undefined);
  const publishedSummaryRef = useRef<TSummary | undefined>(undefined);

  useEffect(() => {
    const nextTarget = scope && statusPath ? { scope, statusPath } : undefined;
    const targetChanged = !samePublishedTarget(publishedTargetRef.current, nextTarget);
    const summaryChanged = !shallowEqualSummary(publishedSummaryRef.current, summary);

    if (publishedTargetRef.current && targetChanged) {
      publishOwnerStatus(
        publishedTargetRef.current.scope,
        publishedTargetRef.current.statusPath,
        undefined,
      );
    }

    if (nextTarget && (targetChanged || summaryChanged)) {
      publishOwnerStatus(nextTarget.scope, nextTarget.statusPath, summary);
    }

    publishedTargetRef.current = nextTarget;
    publishedSummaryRef.current = summary;
  }, [scope, statusPath, summary]);

  useEffect(() => {
    return () => {
      if (publishedTargetRef.current) {
        publishOwnerStatus(
          publishedTargetRef.current.scope,
          publishedTargetRef.current.statusPath,
          undefined,
        );
      }
    };
  }, []);
}
