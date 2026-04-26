export function isPlainObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function toPositiveNumber(value: unknown, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

export function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

export function shallowEqualRecords(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => Object.is(a[key], b[key]));
}

export function shallowEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }

  if (Array.isArray(left) !== Array.isArray(right)) {
    return false;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => Object.is(value, right[index]));
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => Object.is((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
}
