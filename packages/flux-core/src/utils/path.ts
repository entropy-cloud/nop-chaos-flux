import { isPlainObject } from './object';

export function parsePath(path: string): string[] {
  if (!path) {
    return [];
  }

  const normalized = path.replace(/\[(\d+)\]/g, '.$1');

  return normalized
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function getIn(input: unknown, path: string): unknown {
  if (!path) {
    return input;
  }

  return parsePath(path).reduce<unknown>((current, segment) => {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, input);
}

export function setIn(input: Record<string, any>, path: string, value: unknown): Record<string, any> {
  if (!path) {
    return isPlainObject(value) ? value : input;
  }

  const segments = parsePath(path);
  const clone = Array.isArray(input) ? [...input] : { ...input };
  let cursor: any = clone;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const nextSegment = segments[index + 1];
    const shouldCreateArray = nextSegment != null && /^\d+$/.test(nextSegment);

    if (index === segments.length - 1) {
      cursor[segment] = value;
      break;
    }

    const next = cursor[segment];
    const nextClone = Array.isArray(next)
      ? [...next]
      : isPlainObject(next)
        ? { ...next }
        : shouldCreateArray
          ? []
          : {};
    cursor[segment] = nextClone;
    cursor = nextClone;
  }

  return clone;
}
