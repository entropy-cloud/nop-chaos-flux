export function isPlainObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]';
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

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => Object.is((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
}
