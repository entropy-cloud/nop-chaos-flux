import { useEffect, useMemo } from 'react';
import type { ComponentHandleRegistry } from '@nop-chaos/flux-core';
import { useCurrentComponentRegistry } from './hooks.js';

export function useResolvedContainer(
  containerId: string | undefined,
  componentRegistry: ComponentHandleRegistry | undefined,
): HTMLElement | null {
  return useMemo(
    () => resolveContainerElement(containerId, componentRegistry),
    [containerId, componentRegistry],
  );
}

export function useContainerDomRegistration(
  containerId: string | undefined,
  elementRef: React.RefObject<HTMLElement | null>,
) {
  const componentRegistry = useCurrentComponentRegistry();

  useEffect(() => {
    if (!containerId || !componentRegistry || !elementRef.current) {
      return;
    }

    return componentRegistry.register({
      id: containerId,
      type: 'container',
      ref: elementRef.current,
      capabilities: {
        invoke() {
          return { ok: true };
        },
      },
    });
  }, [containerId, componentRegistry, elementRef]);
}

export function resolveContainerElement(
  containerId: string | undefined,
  componentRegistry: ComponentHandleRegistry | undefined,
): HTMLElement | null {
  if (!containerId || !componentRegistry) {
    return null;
  }

  try {
    const byId = componentRegistry.resolve({ componentId: containerId });
    if (byId?.ref instanceof HTMLElement) {
      return byId.ref;
    }

    const byName = componentRegistry.resolve({ componentName: containerId });
    if (byName?.ref instanceof HTMLElement) {
      return byName.ref;
    }
  } catch {
    // resolve throws if componentName is ambiguous — fall through
  }

  return null;
}
