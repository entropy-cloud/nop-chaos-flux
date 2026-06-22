import { useEffect, useMemo, useRef } from 'react';
import {
  createCompositeFieldHandle,
  type CompositeFieldHandleBindings,
  type CompositeFieldHandleMethod,
  type CompositeFieldHandleOpResult,
} from '@nop-chaos/flux-runtime';
import { useCurrentComponentRegistry } from '../context-hooks.js';

export interface UseCompositeFieldHandleOptions {
  id: string;
  name?: string;
  type: string;
  cid?: number;
  methods: readonly CompositeFieldHandleMethod[];
  addItem?: (value: unknown) => CompositeFieldHandleOpResult;
  removeItem?: (index: number) => CompositeFieldHandleOpResult;
  moveItem?: (from: number, to: number) => CompositeFieldHandleOpResult;
  isInteractive: () => boolean;
}

const NOOP_BINDINGS: CompositeFieldHandleBindings = {
  isInteractive: () => false,
};

export function useCompositeFieldHandle(options: UseCompositeFieldHandleOptions) {
  const componentRegistry = useCurrentComponentRegistry();
  const bindingsRef = useRef<CompositeFieldHandleBindings>(NOOP_BINDINGS);

  useEffect(() => {
    bindingsRef.current = {
      addItem: options.addItem,
      removeItem: options.removeItem,
      moveItem: options.moveItem,
      isInteractive: options.isInteractive,
    };
  });

  const handle = useMemo(
    () =>
      // bindingsRef is a mutable holder for invoke-time callbacks; `.current` is
      // only read inside the factory's invoke() (event-handler context), never
      // during render. The static lint rule cannot see that, so it is disabled
      // for this intentional ref-as-holder pattern.
      // eslint-disable-next-line react-hooks/refs
      createCompositeFieldHandle({
        id: options.id,
        name: options.name,
        type: options.type,
        methods: options.methods,
        bindingsHolder: bindingsRef,
      }),
    [options.id, options.name, options.type, options.methods],
  );

  useEffect(() => {
    if (!componentRegistry) {
      return;
    }
    return componentRegistry.register(handle, { cid: options.cid });
  }, [componentRegistry, handle, options.cid]);
}
