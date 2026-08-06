import type { FluxActionEvent, ScopeRef } from '@nop-chaos/flux-core';

export function createTableEventContext(
  payload: Record<string, unknown>,
  args: {
    event?: FluxActionEvent;
    scope: ScopeRef;
  },
) {
  // CX-10 / bug-83 family convention: schema event dispatches carry a second
  // dispatch-arg ctx { event, evaluationBindings, scope } so action args
  // templates can read payload keys as bare bindings. One-shot event payloads
  // must NOT be upgraded into runtime-owned child scopes (they would accumulate
  // in ownedScopeDisposers); the bindings overlay provides the same visibility.
  return {
    event: args.event,
    evaluationBindings: payload,
    scope: args.scope,
  };
}
