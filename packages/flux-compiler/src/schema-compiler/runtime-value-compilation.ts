import type {
  ArrayValueState,
  CompiledRuntimeValue,
  EvalContext,
  ObjectValueState,
  RendererEnv,
  RuntimeValueState,
  ValueEvaluationResult,
} from '@nop-chaos/flux-core';
import { isPlainObject, shallowEqual } from '@nop-chaos/flux-core';

function isCompiledRuntimeValue(value: unknown): value is CompiledRuntimeValue<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    ((value as { kind?: unknown }).kind === 'static' ||
      (value as { kind?: unknown }).kind === 'dynamic') &&
    'isStatic' in value &&
    'node' in value
  );
}

function createStaticRuntimeValue<T>(value: T): CompiledRuntimeValue<T> {
  return {
    kind: 'static',
    isStatic: true,
    node: { kind: 'static-node', value },
    value,
  };
}

function createStateRootForValue(value: CompiledRuntimeValue<unknown>): RuntimeValueState<unknown>['root'] {
  if (value.kind === 'dynamic') {
    return value.createState().root;
  }

  return {
    kind: 'leaf-state',
    initialized: false,
  };
}

function evaluateValueWithState<T>(
  value: CompiledRuntimeValue<T>,
  context: EvalContext,
  env: RendererEnv,
  stateRoot: RuntimeValueState<unknown>['root'],
): ValueEvaluationResult<T> {
  if (value.kind === 'static') {
    return {
      value: value.value,
      changed: false,
      reusedReference: true,
    };
  }

  return value.exec(context, env, { root: stateRoot } as RuntimeValueState<T>);
}

export function compileRuntimeValueTree<T = unknown>(
  value: T,
): CompiledRuntimeValue<T> {
  if (isCompiledRuntimeValue(value)) {
    return value as CompiledRuntimeValue<T>;
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => compileRuntimeValueTree(item));
    if (items.every((item) => item.kind === 'static')) {
      const staticItems = items as Array<Extract<CompiledRuntimeValue<unknown>, { kind: 'static' }>>;
      return createStaticRuntimeValue(staticItems.map((item) => item.value) as T);
    }

    const arrayNode = {
      kind: 'array-node' as const,
      items: items.map((item) => item.node),
    };

    return {
      kind: 'dynamic',
      isStatic: false,
      node: arrayNode,
      createState() {
        return {
          root: {
            kind: 'array-state',
            initialized: false,
            items: items.map((item) => createStateRootForValue(item)),
          },
        };
      },
      exec(context: EvalContext, env: RendererEnv, state?: RuntimeValueState<T>) {
        const resolvedState =
          state?.root.kind === 'array-state'
            ? (state as RuntimeValueState<T> & { root: ArrayValueState<unknown[]> })
            : ({
                root: {
                  kind: 'array-state',
                  initialized: false,
                  items: items.map((item) => createStateRootForValue(item)),
                },
              } as RuntimeValueState<T> & { root: ArrayValueState<unknown[]> });
        const stateRoot = resolvedState.root;

        if (stateRoot.items.length !== items.length) {
          stateRoot.items = items.map((item) => createStateRootForValue(item));
          stateRoot.initialized = false;
        }

        let anyChildChanged = false;
        const nextValue = items.map((item, index) => {
          const result = evaluateValueWithState(item, context, env, stateRoot.items[index]);
          if (result.changed) {
            anyChildChanged = true;
          }
          return result.value;
        });

        if (!anyChildChanged && stateRoot.initialized && stateRoot.lastValue) {
          return {
            value: stateRoot.lastValue as T,
            changed: false,
            reusedReference: true,
          };
        }

        if (stateRoot.initialized && stateRoot.lastValue && shallowEqual(stateRoot.lastValue, nextValue)) {
          return {
            value: stateRoot.lastValue as T,
            changed: false,
            reusedReference: true,
          };
        }

        stateRoot.initialized = true;
        stateRoot.lastValue = nextValue;

        return {
          value: nextValue as T,
          changed: true,
          reusedReference: false,
        };
      },
    } as CompiledRuntimeValue<T>;
  }

  if (isPlainObject(value)) {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);
    const entries = Object.fromEntries(
      keys.map((key) => [key, compileRuntimeValueTree(record[key])]),
    ) as Record<string, CompiledRuntimeValue<unknown>>;

    if (keys.every((key) => entries[key].kind === 'static')) {
      const staticEntries = entries as Record<
        string,
        Extract<CompiledRuntimeValue<unknown>, { kind: 'static' }>
      >;
      return createStaticRuntimeValue(
        Object.fromEntries(keys.map((key) => [key, staticEntries[key].value])) as T,
      );
    }

    const objectNode = {
      kind: 'object-node' as const,
      keys,
      entries: Object.fromEntries(keys.map((key) => [key, entries[key].node])),
    };

    return {
      kind: 'dynamic',
      isStatic: false,
      node: objectNode,
      createState() {
        return {
          root: {
            kind: 'object-state',
            initialized: false,
            entries: Object.fromEntries(
              keys.map((key) => [key, createStateRootForValue(entries[key])]),
            ),
          },
        };
      },
      exec(context: EvalContext, env: RendererEnv, state?: RuntimeValueState<T>) {
        const resolvedState =
          state?.root.kind === 'object-state'
            ? (state as RuntimeValueState<T> & { root: ObjectValueState<unknown> })
            : ({
                root: {
                  kind: 'object-state',
                  initialized: false,
                  entries: Object.fromEntries(
                    keys.map((key) => [key, createStateRootForValue(entries[key])]),
                  ),
                },
              } as RuntimeValueState<T> & { root: ObjectValueState<unknown> });
        const stateRoot = resolvedState.root;

        const currentKeys = Object.keys(stateRoot.entries);
        const needsRebuild =
          keys.some((key) => !(key in stateRoot.entries)) || currentKeys.some((key) => !keys.includes(key));
        if (needsRebuild) {
          stateRoot.entries = Object.fromEntries(
            keys.map((key) => [key, createStateRootForValue(entries[key])]),
          );
          stateRoot.initialized = false;
        }

        let anyChildChanged = false;
        const nextValue: Record<string, unknown> = {};
        for (const key of keys) {
          const result = evaluateValueWithState(entries[key], context, env, stateRoot.entries[key]);
          if (result.changed) {
            anyChildChanged = true;
          }
          nextValue[key] = result.value;
        }

        if (!anyChildChanged && stateRoot.initialized && stateRoot.lastValue) {
          return {
            value: stateRoot.lastValue as T,
            changed: false,
            reusedReference: true,
          };
        }

        if (stateRoot.initialized && stateRoot.lastValue && shallowEqual(stateRoot.lastValue, nextValue)) {
          return {
            value: stateRoot.lastValue as T,
            changed: false,
            reusedReference: true,
          };
        }

        stateRoot.initialized = true;
        stateRoot.lastValue = nextValue;

        return {
          value: nextValue as T,
          changed: true,
          reusedReference: false,
        };
      },
    } as CompiledRuntimeValue<T>;
  }

  return createStaticRuntimeValue(value);
}
