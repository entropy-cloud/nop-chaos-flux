import { getMessageFormatter } from '@nop-chaos/flux-core';
import { dateHelper } from './date-helper.js';
import type { FormulaRegistry } from './registry.js';

function flattenNumericArgs(args: unknown[]): number[] {
  const flattened = args.flatMap((value) => (Array.isArray(value) ? value : [value]));
  return flattened.map((value) => Number(value)).filter((value) => Number.isFinite(value));
}

function toArray<T>(input: T[] | null | undefined): T[] {
  return Array.isArray(input) ? input : [];
}

function toStringValue(input: unknown): string {
  return input == null ? '' : String(input);
}

function customEquals(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (
    (left == null && right == null) ||
    (left == null && right == undefined) ||
    (left == undefined && right == null)
  ) {
    return true;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return Number(left) === Number(right);
  }

  if (typeof left === 'string' && typeof right === 'string') {
    return left === right;
  }

  return false;
}

const DANGEROUS_KEYS_SET = new Set(['__proto__', 'constructor', 'prototype']);

function deepSanitize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(deepSanitize);
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (!DANGEROUS_KEYS_SET.has(key)) {
      result[key] = deepSanitize((value as Record<string, unknown>)[key]);
    }
  }
  return result;
}

export function installBuiltins(registry: FormulaRegistry): void {
  const snapshot = registry.getSnapshot();
  if (snapshot.functions.SUM || snapshot.namespaces.$Math || snapshot.namespaces.$JSON) return;

  registry.registerNamespace('$Math', Math);
  registry.registerNamespace('$JSON', {
    parse(text: string) {
      return deepSanitize(JSON.parse(text));
    },
    stringify: JSON.stringify.bind(JSON),
  });
  registry.registerNamespace('$Date', dateHelper);

  registry.registerFunction(
    'IF',
    (condition: () => unknown, whenTrue: () => unknown, whenFalse?: () => unknown) => {
      return condition() ? whenTrue() : (whenFalse?.() ?? null);
    },
    { invoke: 'lazy' },
  );

  registry.registerFunction(
    'SWITCH',
    (expr: () => unknown, ...branches: Array<() => unknown>) => {
      const value = expr();
      for (let index = 0; index + 1 < branches.length; index += 2) {
        if (customEquals(value, branches[index]())) {
          return branches[index + 1]();
        }
      }

      return branches.length % 2 === 1 ? branches[branches.length - 1]() : null;
    },
    { invoke: 'lazy' },
  );

  registry.registerFunction('SUM', (...args: unknown[]) =>
    flattenNumericArgs(args).reduce((sum, value) => sum + value, 0),
  );
  registry.registerFunction('AVG', (...args: unknown[]) => {
    const values = flattenNumericArgs(args);
    return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
  });
  registry.registerFunction('COUNT', (input: unknown) => (Array.isArray(input) ? input.length : 0));
  registry.registerFunction(
    'ARRAYMAP',
    (input: unknown, iteratee: (value: unknown, index: number, array: unknown[]) => unknown) => {
      return toArray(input as unknown[]).map((value, index, array) =>
        iteratee(value, index, array),
      );
    },
  );
  registry.registerFunction(
    'ARRAYFILTER',
    (input: unknown, predicate: (value: unknown, index: number, array: unknown[]) => unknown) => {
      return toArray(input as unknown[]).filter((value, index, array) =>
        Boolean(predicate(value, index, array)),
      );
    },
  );
  registry.registerFunction(
    'ARRAYFIND',
    (input: unknown, predicate: (value: unknown, index: number, array: unknown[]) => unknown) => {
      return toArray(input as unknown[]).find((value, index, array) =>
        Boolean(predicate(value, index, array)),
      );
    },
  );
  registry.registerFunction(
    'ARRAYFINDINDEX',
    (input: unknown, predicate: (value: unknown, index: number, array: unknown[]) => unknown) => {
      return toArray(input as unknown[]).findIndex((value, index, array) =>
        Boolean(predicate(value, index, array)),
      );
    },
  );
  registry.registerFunction(
    'ARRAYSOME',
    (input: unknown, predicate: (value: unknown, index: number, array: unknown[]) => unknown) => {
      return toArray(input as unknown[]).some((value, index, array) =>
        Boolean(predicate(value, index, array)),
      );
    },
  );
  registry.registerFunction(
    'ARRAYEVERY',
    (input: unknown, predicate: (value: unknown, index: number, array: unknown[]) => unknown) => {
      return toArray(input as unknown[]).every((value, index, array) =>
        Boolean(predicate(value, index, array)),
      );
    },
  );
  registry.registerFunction('ARRAYINCLUDES', (input: unknown, item: unknown) => {
    return toArray(input as unknown[]).some(
      (value) => customEquals(value, item) || Object.is(value, item),
    );
  });
  registry.registerFunction('ISARRAY', (input: unknown) => Array.isArray(input));
  registry.registerFunction('CONCAT', (...arrays: unknown[]) =>
    arrays.flatMap((value) => (Array.isArray(value) ? value : [value])),
  );
  registry.registerFunction('UNIQ', (input: unknown) => Array.from(new Set(toArray(input as unknown[]))));
  registry.registerFunction('COMPACT', (input: unknown) => toArray(input as unknown[]).filter(Boolean));
  registry.registerFunction('LEN', (input: unknown) => toStringValue(input).length);
  registry.registerFunction('CONCATENATE', (...args: unknown[]) => args.map(toStringValue).join(''));
  registry.registerFunction('TRIM', (input: unknown) => toStringValue(input).trim());
  registry.registerFunction('UPPER', (input: unknown) => toStringValue(input).toUpperCase());
  registry.registerFunction('LOWER', (input: unknown) => toStringValue(input).toLowerCase());
  registry.registerFunction('REPLACE', (input: unknown, search: unknown, replacement: unknown) => {
    return toStringValue(input).split(toStringValue(search)).join(toStringValue(replacement));
  });
  registry.registerFunction('SPLIT', (input: unknown, separator: unknown) =>
    toStringValue(input).split(toStringValue(separator)),
  );
  registry.registerFunction('JOIN', (input: unknown, separator?: unknown) =>
    toArray(input as unknown[]).join(separator == null ? ',' : String(separator)),
  );
  registry.registerFunction('CONTAINS', (input: unknown, search: unknown) =>
    toStringValue(input).includes(toStringValue(search)),
  );
  registry.registerFunction('ISEMPTY', (input: unknown) => {
    if (input == null) {
      return true;
    }
    if (Array.isArray(input) || typeof input === 'string') {
      return input.length === 0;
    }
    return false;
  });
  registry.registerFunction('INT', (input: unknown) => Math.trunc(Number(input)));
  registry.registerFunction('MOD', (left: unknown, right: unknown) => Number(left) % Number(right));
  registry.registerFunction('RAND', () => Math.random());
  registry.registerFunction('PI', () => Math.PI);

  // I3: expose the i18n sink as a formula builtin so schema authors can resolve
  // message keys (e.g. flux.common.noData) and parametrized messages inside
  // expressions. The formatter is read at call time (getMessageFormatter), so
  // the expression reflects the active locale at evaluation and is not collapsed
  // into a static literal. flux-formula already depends on flux-core
  // (package.json), and the sink is the same one consumed by validation
  // messages — no new infra.
  registry.registerFunction('t', (key: unknown, params?: unknown) => {
    const formatter = getMessageFormatter();
    return formatter(key == null ? '' : String(key), params as Record<string, unknown> | undefined);
  });
}

export { customEquals };
