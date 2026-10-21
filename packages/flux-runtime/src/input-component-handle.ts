import type { ComponentHandle } from '@nop-chaos/flux-core';

// plan 667 M9b: `undo` (pop stroke stack) and `export` (return PNG data URL)
// extend the signature field's handle surface.
export type InputHandleMethod = 'clear' | 'reset' | 'focus' | 'open' | 'scanNow' | 'stopScan' | 'resetWasmPromise' | 'undo' | 'export';

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
  /** Signature: pop the stroke stack and redraw. No-op on an empty stack. */
  undo?(): void;
  /** Signature: return the current PNG data URL, or undefined when empty. */
  export?(): string | undefined;
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
          case 'undo': {
            if (!bindings.isInteractive()) {
              return { ok: true, skipped: true };
            }
            bindings.undo?.();
            return { ok: true };
          }
          case 'export': {
            if (!bindings.isVisible()) {
              return { ok: false, code: 'not-visible' };
            }
            const exported = bindings.export?.();
            return { ok: true, value: exported };
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
