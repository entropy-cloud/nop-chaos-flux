import { useEffect, useRef } from 'react';
import type { ScopeRef } from '@nop-chaos/flux-core';

/** Mirror the resolved row source into the owner-declared `dataStatePath` (2-2). */
export function useCrudDataProjection(args: {
  dataStatePath: string | undefined;
  scope: ScopeRef | undefined;
  source: unknown[];
}): void {
  const { dataStatePath, scope, source } = args;
  useEffect(() => {
    if (!dataStatePath || !scope) {
      return;
    }
    scope.update(dataStatePath, source);
  }, [dataStatePath, scope, source]);
}

/**
 * loadAction keeps rows/total in React state (not in scope), so the `$crud`
 * projected binding — whose store only re-notifies on parent-scope writes —
 * would not propagate load-derived summary fields (e.g. `$crud.total`) to
 * subscribers after an async fetch. Bump a private scope revision on each
 * load-result change so `$crud` consumers (footer totals, statistics, etc.)
 * re-read the latest summary. The source-binding path is unaffected because
 * its data already lives in scope.
 */
export function useCrudLoadRevision(args: {
  enabled: boolean;
  scope: ScopeRef | undefined;
  loadResult: unknown;
}): void {
  const { enabled, scope, loadResult } = args;
  const loadNonceRef = useRef(0);
  useEffect(() => {
    if (!enabled || !scope) {
      return;
    }
    loadNonceRef.current += 1;
    scope.update('__crudLoadRevision', loadNonceRef.current);
  }, [enabled, scope, loadResult]);
}
