import type { ComponentHandle } from '@nop-chaos/flux-core';

export type CompositeFieldHandleMethod = 'addItem' | 'removeItem' | 'moveItem';

export interface CompositeFieldHandleOpResult {
  skipped?: boolean;
  outOfBounds?: boolean;
  index?: number;
}

export interface CompositeFieldHandleBindings {
  addItem?: (value: unknown) => CompositeFieldHandleOpResult;
  removeItem?: (index: number) => CompositeFieldHandleOpResult;
  moveItem?: (from: number, to: number) => CompositeFieldHandleOpResult;
  isInteractive: () => boolean;
}

export interface CompositeFieldHandleBindingsHolder {
  current: CompositeFieldHandleBindings;
}

export interface CreateCompositeFieldHandleInput {
  id: string;
  name?: string;
  type: string;
  methods: readonly CompositeFieldHandleMethod[];
  bindingsHolder: CompositeFieldHandleBindingsHolder;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function createCompositeFieldHandle(
  input: CreateCompositeFieldHandleInput,
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
      invoke(method, payload) {
        const bindings = bindingsHolder.current;

        if (!bindings.isInteractive()) {
          return { ok: true, skipped: true };
        }

        switch (method) {
          case 'addItem': {
            const value = payload?.value;
            const result = bindings.addItem?.(value);
            if (result?.outOfBounds) {
              return { ok: false, code: 'index-out-of-bounds' };
            }
            if (result?.skipped) {
              return { ok: true, skipped: true };
            }
            return { ok: true, data: { index: result?.index } };
          }
          case 'removeItem': {
            const index = payload?.index;
            if (!isFiniteNumber(index)) {
              return { ok: false, code: 'index-out-of-bounds' };
            }
            const result = bindings.removeItem?.(index);
            if (result?.outOfBounds) {
              return { ok: false, code: 'index-out-of-bounds' };
            }
            if (result?.skipped) {
              return { ok: true, skipped: true };
            }
            return { ok: true };
          }
          case 'moveItem': {
            const from = payload?.from;
            const to = payload?.to;
            if (!isFiniteNumber(from) || !isFiniteNumber(to)) {
              return { ok: false, code: 'index-out-of-bounds' };
            }
            if (from === to) {
              return { ok: true, skipped: true };
            }
            const result = bindings.moveItem?.(from, to);
            if (result?.outOfBounds) {
              return { ok: false, code: 'index-out-of-bounds' };
            }
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
