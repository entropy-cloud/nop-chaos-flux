import type {
  EvalContext,
  ScopeDependencyCollector,
  ScopeDependencySet,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { getIn, normalizeRootPath, parsePath } from '@nop-chaos/flux-core';

export function createEvalContext(scope: ScopeRef): EvalContext {
  let materialized: Record<string, any> | undefined;

  return {
    resolve(path: string) {
      return scope.get(path);
    },
    has(path: string) {
      return scope.has(path);
    },
    materialize() {
      if (!materialized) {
        materialized = scope.materializeVisible();
      }

      return materialized;
    },
  };
}

function normalizeTrackedPath(path: string): string | undefined {
  return normalizeRootPath(path);
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
      },
    },
    finalize() {
      return {
        paths: wildcard ? ['*'] : Array.from(paths).sort(),
        wildcard,
        broadAccess,
      };
    },
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
    },
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
    'readVisible' in input &&
    typeof (input as ScopeRef).readVisible === 'function'
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

// createFormulaScope removed (plan 2026-09-28-6 P14 dead-code adjudication):
// zero production call sites; the proxy-tracking scope is superseded by the
// compiled-value evaluation pipeline (evaluate.ts + toEvalContext).

export { toEvalContext };
