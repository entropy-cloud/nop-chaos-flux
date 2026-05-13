import type { ScopeRef } from '@nop-chaos/flux-core';
import { useStatusPathPublication as useStableStatusPathPublication } from '@nop-chaos/flux-react';

export function useStatusPathPublication<TSummary>(
  scope: ScopeRef | undefined,
  statusPath: string | undefined,
  summary: TSummary,
) {
  useStableStatusPathPublication(scope, statusPath, summary);
}
