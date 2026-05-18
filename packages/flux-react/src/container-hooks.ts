import { useLayoutEffect, useMemo, useRef } from 'react';
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
  const registeredRef = useRef<{
    containerId: string | undefined;
    componentRegistry: ComponentHandleRegistry | undefined;
    element: HTMLElement | null;
  }>({
    containerId: undefined,
    componentRegistry: undefined,
    element: null,
  });

  useLayoutEffect(() => {
    const element = elementRef.current;

    if (!containerId || !componentRegistry || !element) {
      registeredRef.current = {
        containerId: undefined,
        componentRegistry: undefined,
        element: null,
      };
      return;
    }

    if (
      registeredRef.current.containerId === containerId &&
      registeredRef.current.componentRegistry === componentRegistry &&
      registeredRef.current.element === element
    ) {
      return;
    }

    registeredRef.current = {
      containerId,
      componentRegistry,
      element,
    };

    return componentRegistry.register({
      id: containerId,
      type: 'container',
      ref: element,
      capabilities: {
        invoke() {
          return { ok: true };
        },
      },
    });
  });
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
