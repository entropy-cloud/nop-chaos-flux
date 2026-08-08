import { useScopeSelector } from '@nop-chaos/flux-react';

export function useLiveCount() {
  return useScopeSelector((state) => state.items.length);
}
