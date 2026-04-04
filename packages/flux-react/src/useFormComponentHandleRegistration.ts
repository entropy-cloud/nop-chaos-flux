import { useEffect } from 'react';
import type { ComponentHandleRegistry, CompiledSchemaNode, FormRuntime } from '@nop-chaos/flux-core';
import { createFormComponentHandle } from '@nop-chaos/flux-runtime';
import { getNodeCompiledCid } from './node-renderer-utils';

export function useFormComponentHandleRegistration(
  activeForm: FormRuntime | undefined,
  activeComponentRegistry: ComponentHandleRegistry | undefined,
  node: CompiledSchemaNode
): void {
  useEffect(() => {
    if (!activeForm || !activeComponentRegistry) {
      return;
    }

    const unregister = activeComponentRegistry.register(createFormComponentHandle(activeForm), {
      cid: getNodeCompiledCid(node)
    });
    return unregister;
  }, [activeComponentRegistry, activeForm, node]);
}
