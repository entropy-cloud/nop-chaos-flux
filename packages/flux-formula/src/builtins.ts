import { dateHelper } from './date-helper';
import { registerFunction, registerNamespace, getBuiltinsInstalled, setBuiltinsInstalled } from './registry';

function flattenNumericArgs(args: unknown[]): number[] {
  const flattened = args.flatMap((value) => (Array.isArray(value) ? value : [value]));
  return flattened
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
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

  if ((left == null && right == null) || (left == null && right == undefined) || (left == undefined && right == null)) {
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

export function installBuiltins(): void {
  if (getBuiltinsInstalled()) return;
  setBuiltinsInstalled(true);

  registerNamespace('$Math', Math);
  registerNamespace('$JSON', JSON);
  registerNamespace('$Date', dateHelper);

  registerFunction('IF', (condition: () => unknown, whenTrue: () => unknown, whenFalse?: () => unknown) => {
    return condition() ? whenTrue() : whenFalse?.() ?? null;
  }, { invoke: 'lazy' });

  registerFunction('SWITCH', (expr: () => unknown, ...branches: Array<() => unknown>) => {
    const value = expr();
    for (let index = 0; index + 1 < branches.length; index += 2) {
      if (customEquals(value, branches[index]())) {
        return branches[index + 1]();
      }
    }

    return branches.length % 2 === 1 ? branches[branches.length - 1]() : null;
  }, { invoke: 'lazy' });

  registerFunction('SUM', (...args: unknown[]) => flattenNumericArgs(args).reduce((sum, value) => sum + value, 0));
  registerFunction('AVG', (...args: unknown[]) => {
    const values = flattenNumericArgs(args);
    return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
  });
  registerFunction('COUNT', (input: unknown) => (Array.isArray(input) ? input.length : 0));
  registerFunction('ARRAYMAP', (input: unknown, iteratee: (value: unknown, index: number, array: unknown[]) => unknown) => {
    return toArray(input as unknown[]).map((value, index, array) => iteratee(value, index, array));
  });
  registerFunction('ARRAYFILTER', (input: unknown, predicate: (value: unknown, index: number, array: unknown[]) => unknown) => {
    return toArray(input as unknown[]).filter((value, index, array) => Boolean(predicate(value, index, array)));
  });
  registerFunction('ARRAYFIND', (input: unknown, predicate: (value: unknown, index: number, array: unknown[]) => unknown) => {
    return toArray(input as unknown[]).find((value, index, array) => Boolean(predicate(value, index, array)));
  });
  registerFunction('ARRAYFINDINDEX', (input: unknown, predicate: (value: unknown, index: number, array: unknown[]) => unknown) => {
    return toArray(input as unknown[]).findIndex((value, index, array) => Boolean(predicate(value, index, array)));
  });
  registerFunction('ARRAYSOME', (input: unknown, predicate: (value: unknown, index: number, array: unknown[]) => unknown) => {
    return toArray(input as unknown[]).some((value, index, array) => Boolean(predicate(value, index, array)));
  });
  registerFunction('ARRAYEVERY', (input: unknown, predicate: (value: unknown, index: number, array: unknown[]) => unknown) => {
    return toArray(input as unknown[]).every((value, index, array) => Boolean(predicate(value, index, array)));
  });
  registerFunction('ARRAYINCLUDES', (input: unknown, item: unknown) => {
    return toArray(input as unknown[]).some((value) => customEquals(value, item) || Object.is(value, item));
  });
  registerFunction('CONCAT', (...arrays: unknown[]) => arrays.flatMap((value) => (Array.isArray(value) ? value : [value])));
  registerFunction('UNIQ', (input: unknown) => Array.from(new Set(toArray(input as unknown[]))));
  registerFunction('COMPACT', (input: unknown) => toArray(input as unknown[]).filter(Boolean));
  registerFunction('LEN', (input: unknown) => toStringValue(input).length);
  registerFunction('CONCATENATE', (...args: unknown[]) => args.map(toStringValue).join(''));
  registerFunction('TRIM', (input: unknown) => toStringValue(input).trim());
  registerFunction('UPPER', (input: unknown) => toStringValue(input).toUpperCase());
  registerFunction('LOWER', (input: unknown) => toStringValue(input).toLowerCase());
  registerFunction('REPLACE', (input: unknown, search: unknown, replacement: unknown) => {
    return toStringValue(input).split(toStringValue(search)).join(toStringValue(replacement));
  });
  registerFunction('SPLIT', (input: unknown, separator: unknown) => toStringValue(input).split(toStringValue(separator)));
  registerFunction('JOIN', (input: unknown, separator?: unknown) => toArray(input as unknown[]).join(separator == null ? ',' : String(separator)));
  registerFunction('CONTAINS', (input: unknown, search: unknown) => toStringValue(input).includes(toStringValue(search)));
  registerFunction('ISEMPTY', (input: unknown) => {
    if (input == null) {
      return true;
    }
    if (Array.isArray(input) || typeof input === 'string') {
      return input.length === 0;
    }
    return false;
  });
  registerFunction('INT', (input: unknown) => Math.trunc(Number(input)));
  registerFunction('MOD', (left: unknown, right: unknown) => Number(left) % Number(right));
  registerFunction('RAND', () => Math.random());
  registerFunction('PI', () => Math.PI);
}

export { customEquals };
