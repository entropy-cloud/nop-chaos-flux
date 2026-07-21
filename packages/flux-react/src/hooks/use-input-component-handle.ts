import { useEffect, useMemo, useRef } from 'react';
import {
  createInputComponentHandle,
  type InputHandleBindings,
  type InputHandleMethod,
} from '@nop-chaos/flux-runtime';
import { useCurrentComponentRegistry } from '../context-hooks.js';

export interface UseInputComponentHandleOptions {
  id: string;
  name?: string;
  type: string;
  cid?: number;
  methods: readonly InputHandleMethod[];
  getFocusTarget: () => HTMLElement | null;
  isInteractive: () => boolean;
  isVisible: () => boolean;
  clearValue?: () => void;
  resetValue?: () => { fellBackToDefault: boolean };
  openMenu?: () => void;
  scanNow?: () => void;
  stopScan?: () => void;
  resetWasmPromise?: () => void;
}

const NOOP_BINDINGS: InputHandleBindings = {
  getFocusTarget: () => null,
  isInteractive: () => false,
  isVisible: () => true,
};

export function useInputComponentHandle(options: UseInputComponentHandleOptions) {
  const componentRegistry = useCurrentComponentRegistry();
  const bindingsRef = useRef<InputHandleBindings>(NOOP_BINDINGS);

  useEffect(() => {
    bindingsRef.current = {
      getFocusTarget: options.getFocusTarget,
      isInteractive: options.isInteractive,
      isVisible: options.isVisible,
      clearValue: options.clearValue,
      resetValue: options.resetValue,
      openMenu: options.openMenu,
      scanNow: options.scanNow,
      stopScan: options.stopScan,
      resetWasmPromise: options.resetWasmPromise,
    };
  });

  const handle = useMemo(
    () =>
      // bindingsRef is a mutable holder for invoke-time callbacks; `.current` is
      // only read inside the factory's invoke() (event-handler context), never
      // during render. The static lint rule cannot see that, so it is disabled
      // for this intentional ref-as-holder pattern.
      // eslint-disable-next-line react-hooks/refs
      createInputComponentHandle({
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
