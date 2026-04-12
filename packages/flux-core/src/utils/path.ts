import { isPlainObject } from './object';

const MAX_PARSE_PATH_CACHE_SIZE = 1000;
const parsePathCache = new Map<string, readonly string[]>();

function rememberParsedPath(path: string, segments: readonly string[]) {
  if (parsePathCache.has(path)) {
    parsePathCache.delete(path);
  }

  parsePathCache.set(path, segments);

  if (parsePathCache.size <= MAX_PARSE_PATH_CACHE_SIZE) {
    return;
  }

  const oldestKey = parsePathCache.keys().next().value;

  if (typeof oldestKey === 'string') {
    parsePathCache.delete(oldestKey);
  }
}

export function parsePath(path: string): string[] {
  if (!path) {
    return [];
  }

  const cached = parsePathCache.get(path);

  if (cached !== undefined) {
    return [...cached];
  }

  const normalized = path.replace(/\[(\d+)\]/g, '.$1');
  const result = Object.freeze(normalized
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean));

  rememberParsedPath(path, result);

  return [...result];
}

export function normalizeRootPath(path: string): string | undefined {
  if (path === '*') {
    return '*';
  }

  const segments = parsePath(path);

  if (segments.length === 0) {
    return undefined;
  }

  return segments[0];
}

export function normalizeRootPaths(paths: readonly string[]): string[] {
  let wildcard = false;
  const roots = new Set<string>();

  for (const path of paths) {
    const root = normalizeRootPath(path);

    if (!root) {
      continue;
    }

    if (root === '*') {
      wildcard = true;
      break;
    }

    roots.add(root);
  }

  return wildcard ? ['*'] : Array.from(roots).sort();
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
