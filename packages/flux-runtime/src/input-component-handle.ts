import type { ComponentHandle } from '@nop-chaos/flux-core';

export type InputHandleMethod = 'clear' | 'reset' | 'focus' | 'open' | 'scanNow' | 'stopScan' | 'resetWasmPromise';

export interface InputHandleResetResult {
  fellBackToDefault: boolean;
}

export interface InputHandleBindings {
  getFocusTarget(): HTMLElement | null;
  isInteractive(): boolean;
  isVisible(): boolean;
  clearValue?(): void;
  resetValue?(): InputHandleResetResult;
  openMenu?(): void;
  scanNow?(): void;
  stopScan?(): void;
  resetWasmPromise?(): void;
}

export interface InputHandleBindingsHolder {
  current: InputHandleBindings;
}

export interface CreateInputComponentHandleInput {
  id: string;
  name?: string;
  type: string;
  methods: readonly InputHandleMethod[];
  bindingsHolder: InputHandleBindingsHolder;
}

export function createInputComponentHandle(
  input: CreateInputComponentHandleInput,
): ComponentHandle {
  const { id, name, type, methods, bindingsHolder } = input;
  return {
    id,
    name,
    type,
    capabilities: {
      hasMethod(method) {
        return (methods as readonly string[]).includes(method);
      },
      listMethods() {
        return methods;
      },
      invoke(method) {
        const bindings = bindingsHolder.current;
        switch (method) {
          case 'clear': {
            if (!bindings.isInteractive()) {
              return { ok: true, skipped: true };
            }
            bindings.clearValue?.();
            return { ok: true };
          }
          case 'reset': {
            const result = bindings.resetValue?.() ?? { fellBackToDefault: true };
            return { ok: true, fellBackToDefault: result.fellBackToDefault };
          }
          case 'focus': {
            if (!bindings.isVisible()) {
              return { ok: false, code: 'not-visible' };
            }
            const target = bindings.getFocusTarget();
            if (!target) {
              return { ok: false, code: 'not-mounted' };
            }
            target.focus();
            return { ok: true };
          }
          case 'open': {
            if (!bindings.isVisible()) {
              return { ok: false, code: 'not-visible' };
            }
            const target = bindings.getFocusTarget();
            if (!target) {
              return { ok: false, code: 'not-mounted' };
            }
            target.focus();
            bindings.openMenu?.();
            return { ok: true };
          }
          case 'scanNow': {
            bindings.scanNow?.();
            return { ok: true };
          }
          case 'stopScan': {
            bindings.stopScan?.();
            return { ok: true };
          }
          case 'resetWasmPromise': {
            bindings.resetWasmPromise?.();
            return { ok: true };
          }
          default:
            return {
              ok: false,
              error: new Error(`Unsupported ${type} handle method: ${method}`),
            };
        }
      },
    },
  };
}
