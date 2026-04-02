import type { EvalContext, ScopeRef } from '@nop-chaos/flux-core';
import { getIn, parsePath } from '@nop-chaos/flux-core';
import { createEvalContext } from './evaluate';

function isEvalContext(input: EvalContext | object): input is EvalContext {
  return (
    typeof input === 'object' &&
    input !== null &&
    'resolve' in input &&
    typeof (input as EvalContext).resolve === 'function' &&
    'has' in input &&
    typeof (input as EvalContext).has === 'function' &&
    'materialize' in input &&
    typeof (input as EvalContext).materialize === 'function'
  );
}

function createObjectEvalContext(data: object): EvalContext {
  const record = data as Record<string, any>;

  return {
    resolve(path: string) {
      return getIn(record, path);
    },
    has(path: string) {
      const segments = parsePath(path);
      let current: unknown = record;

      for (const segment of segments) {
        if (current == null || typeof current !== 'object' || !(segment in current)) {
          return false;
        }

        current = (current as Record<string, unknown>)[segment];
      }

      return true;
    },
    materialize() {
      return record;
    }
  };
}

function isScopeRef(input: unknown): input is ScopeRef {
  return (
    typeof input === 'object' &&
    input !== null &&
    'get' in input &&
    typeof (input as ScopeRef).get === 'function' &&
    'has' in input &&
    typeof (input as ScopeRef).has === 'function' &&
    'read' in input &&
    typeof (input as ScopeRef).read === 'function'
  );
}

function toEvalContext(input: EvalContext | ScopeRef | object): EvalContext {
  if (isEvalContext(input)) {
    return input;
  }
  if (isScopeRef(input)) {
    return createEvalContext(input);
  }
  return createObjectEvalContext(input);
}

function createFormulaScope(context: EvalContext): Record<string, any> {
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (typeof property !== 'string') {
          return undefined;
        }

        if (property === '__proto__') {
          return undefined;
        }

        const value = context.resolve(property);
        if (value !== undefined) return value;

        return getIn(context.materialize(), property);
      },
      has(_target, property) {
        return typeof property === 'string' ? context.has(property) : false;
      },
      ownKeys() {
        return Reflect.ownKeys(context.materialize());
      },
      getOwnPropertyDescriptor(_target, property) {
        if (typeof property !== 'string') {
          return undefined;
        }

        const materialized = context.materialize();

        if (Object.prototype.hasOwnProperty.call(materialized, property)) {
          return {
            configurable: true,
            enumerable: true,
            value: materialized[property],
            writable: false
          };
        }

        return undefined;
      }
    }
  );
}

export { toEvalContext, createFormulaScope };
