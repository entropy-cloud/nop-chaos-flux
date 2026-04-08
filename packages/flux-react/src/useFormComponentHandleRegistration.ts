import { useEffect } from 'react';
import type { ComponentHandleRegistry, FormRuntime, NodeLocator } from '@nop-chaos/flux-core';
import { createFormComponentHandle } from '@nop-chaos/flux-runtime';

export function useFormComponentHandleRegistration(
  activeForm: FormRuntime | undefined,
  activeComponentRegistry: ComponentHandleRegistry | undefined,
  cid: number | undefined,
  locator: NodeLocator | undefined
): void {
  useEffect(() => {
    if (!activeForm || !activeComponentRegistry) {
      return;
    }

    const unregister = activeComponentRegistry.register(createFormComponentHandle(activeForm), {
      cid,
      locator
    });
    return unregister;
  }, [activeComponentRegistry, activeForm, cid, locator]);
}
