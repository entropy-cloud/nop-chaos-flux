import { useLayoutEffect, useMemo, useRef } from 'react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { createReadonlyScopeBinding } from '@nop-chaos/flux-react';
import type { CrudStatusSummary } from './crud-schema.js';

/**
 * 22-04: identity-stable `$crud` binding dedicated to the embedded query form.
 * The form reads this binding as its parentScope, and a churning identity
 * would re-create the form runtime on every crud state change and drop the
 * uncommitted draft. Reads stay live through the latest-ref indirection;
 * general `$crud` reactivity keeps flowing through the per-render crudScope
 * the renderer builds for everything else.
 */
export function useCrudQueryFormScope(
  scope: ScopeRef,
  selectionField: string,
  summary: CrudStatusSummary,
  selectedRowKeys: string[],
): ScopeRef {
  const summaryRef = useRef(summary);
  const selectionRef = useRef(selectedRowKeys);
  useLayoutEffect(() => {
    summaryRef.current = summary;
    selectionRef.current = selectedRowKeys;
  });
  return useMemo(
    () =>
      createReadonlyScopeBinding(
        scope,
        '$crud',
        // eslint-disable-next-line react-hooks/refs -- getters run at expression-evaluation time, not render time; the binding must keep reading the latest committed summary (form-runtime parentScope is captured once)
        () => summaryRef.current,
        // eslint-disable-next-line react-hooks/refs -- same evaluation-time read as above
        () => ({ [selectionField]: selectionRef.current }),
      ),
    [scope, selectionField],
  );
}
