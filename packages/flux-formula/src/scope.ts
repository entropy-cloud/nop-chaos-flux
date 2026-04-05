import type { EvalContext, ScopeDependencyCollector, ScopeDependencySet, ScopeRef } from '@nop-chaos/flux-core';
import { getIn, parsePath } from '@nop-chaos/flux-core';
import { createEvalContext } from './evaluate';

function normalizeTrackedPath(path: string): string | undefined {
  const segments = parsePath(path);

  if (segments.length === 0) {
    return undefined;
  }

  return segments.join('.');
}

export function createScopeDependencyCollector(): {
  collector: ScopeDependencyCollector;
  finalize(): ScopeDependencySet;
} {
  const paths = new Set<string>();
  let wildcard = false;
  let broadAccess = false;

  return {
    collector: {
      recordPath(path: string) {
        const normalized = normalizeTrackedPath(path);

        if (!normalized || wildcard) {
          return;
        }

        paths.add(normalized);
      },
      recordWildcard() {
        wildcard = true;
        broadAccess = true;
        paths.clear();
      }
    },
    finalize() {
      return {
        paths: wildcard ? ['*'] : Array.from(paths).sort(),
        wildcard,
        broadAccess
      };
    }
  };
}

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
  function wrapTrackedValue(value: unknown, basePath: string): unknown {
    if (value == null || typeof value !== 'object') {
      return value;
    }

    return new Proxy(value as Record<string, any>, {
      get(target, property) {
        if (typeof property !== 'string') {
          return Reflect.get(target, property);
        }

        if (property === '__proto__') {
          return undefined;
        }

        const nextPath = basePath ? `${basePath}.${property}` : property;
        context.collector?.recordPath(nextPath);
        return wrapTrackedValue(Reflect.get(target, property), nextPath);
      },
      has(target, property) {
        if (typeof property !== 'string') {
          return Reflect.has(target, property);
        }

        const nextPath = basePath ? `${basePath}.${property}` : property;
        context.collector?.recordPath(nextPath);
        return Reflect.has(target, property);
      },
      ownKeys(target) {
        context.collector?.recordWildcard();
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, property) {
        if (typeof property === 'string') {
          context.collector?.recordWildcard();
        }

        return Reflect.getOwnPropertyDescriptor(target, property);
      }
    });
  }

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

        context.collector?.recordPath(property);

        const value = context.resolve(property);
        if (value !== undefined) return wrapTrackedValue(value, property);

        return getIn(context.materialize(), property);
      },
      has(_target, property) {
        if (typeof property !== 'string') {
          return false;
        }

        context.collector?.recordPath(property);
        return context.has(property);
      },
      ownKeys() {
        context.collector?.recordWildcard();
        return Reflect.ownKeys(context.materialize());
      },
      getOwnPropertyDescriptor(_target, property) {
        if (typeof property !== 'string') {
          return undefined;
        }

        const materialized = context.materialize();
        context.collector?.recordWildcard();

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
