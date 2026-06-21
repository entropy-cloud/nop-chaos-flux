import { useEffect, useMemo, useRef } from 'react';
import {
  createSurfaceComponentHandle,
  type SurfaceHandleBindings,
  type SurfaceHandleMethod,
} from '@nop-chaos/flux-runtime';
import { useCurrentComponentRegistry } from '../context-hooks.js';

export interface UseSurfaceComponentHandleOptions {
  id: string;
  kind: 'dialog' | 'drawer';
  cid?: number;
  methods: readonly SurfaceHandleMethod[];
  isControlled: () => boolean;
  isOpen: () => boolean;
  setOpen: (open: boolean) => void;
}

const NOOP_BINDINGS: SurfaceHandleBindings = {
  isControlled: () => true,
  isOpen: () => false,
  setOpen: () => {},
};

export function useSurfaceComponentHandle(options: UseSurfaceComponentHandleOptions) {
  const componentRegistry = useCurrentComponentRegistry();
  const bindingsRef = useRef<SurfaceHandleBindings>(NOOP_BINDINGS);

  useEffect(() => {
    bindingsRef.current = {
      isControlled: options.isControlled,
      isOpen: options.isOpen,
      setOpen: options.setOpen,
    };
  });

  const handle = useMemo(
    () =>
      // bindingsRef is a mutable holder for invoke-time callbacks; `.current` is
      // only read inside the factory's invoke() (event-handler context), never
      // during render. The static lint rule cannot see that, so it is disabled
      // for this intentional ref-as-holder pattern.
      // eslint-disable-next-line react-hooks/refs
      createSurfaceComponentHandle({
        id: options.id,
        kind: options.kind,
        methods: options.methods,
        bindingsHolder: bindingsRef,
      }),
    [options.id, options.kind, options.methods],
  );

  useEffect(() => {
    if (!componentRegistry) {
      return;
    }
    return componentRegistry.register(handle, { cid: options.cid });
  }, [componentRegistry, handle, options.cid]);
}
