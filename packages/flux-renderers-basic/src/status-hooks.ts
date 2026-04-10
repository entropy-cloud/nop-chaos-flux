import { useEffect } from 'react';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { publishOwnerStatus } from '@nop-chaos/flux-runtime';

export function useStatusPathPublication<TSummary>(scope: ScopeRef | undefined, statusPath: string | undefined, summary: TSummary) {
  useEffect(() => {
    publishOwnerStatus(scope, statusPath, summary);
  }, [scope, statusPath, summary]);
}
