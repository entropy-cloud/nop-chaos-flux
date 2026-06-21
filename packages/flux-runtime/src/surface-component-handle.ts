import type { ComponentHandle } from '@nop-chaos/flux-core';

export type SurfaceHandleMethod = 'open' | 'close' | 'toggle';

export interface SurfaceHandleBindings {
  isControlled(): boolean;
  isOpen(): boolean;
  setOpen(open: boolean): void;
}

export interface SurfaceHandleBindingsHolder {
  current: SurfaceHandleBindings;
}

export interface CreateSurfaceComponentHandleInput {
  id: string;
  kind: 'dialog' | 'drawer';
  methods: readonly SurfaceHandleMethod[];
  bindingsHolder: SurfaceHandleBindingsHolder;
}

export function createSurfaceComponentHandle(
  input: CreateSurfaceComponentHandleInput,
): ComponentHandle {
  const { id, kind, methods, bindingsHolder } = input;
  return {
    id,
    type: kind,
    capabilities: {
      hasMethod(method) {
        return (methods as readonly string[]).includes(method);
      },
      listMethods() {
        return methods;
      },
      invoke(method) {
        const bindings = bindingsHolder.current;
        if (bindings.isControlled()) {
          return { ok: true, skipped: true };
        }
        switch (method) {
          case 'open': {
            if (bindings.isOpen()) {
              return { ok: true, skipped: true };
            }
            bindings.setOpen(true);
            return { ok: true };
          }
          case 'close': {
            if (!bindings.isOpen()) {
              return { ok: true, skipped: true };
            }
            bindings.setOpen(false);
            return { ok: true };
          }
          case 'toggle': {
            bindings.setOpen(!bindings.isOpen());
            return { ok: true };
          }
          default:
            return {
              ok: false,
              error: new Error(`Unsupported ${kind} handle method: ${method}`),
            };
        }
      },
    },
  };
}
