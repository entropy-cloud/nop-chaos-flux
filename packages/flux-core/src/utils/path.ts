import { isPlainObject } from './object.js';

const DANGEROUS_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

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

  const segments: string[] = [];
  let current = '';
  let i = 0;

  while (i < path.length) {
    const ch = path[i];

    if (ch === '[') {
      // Quoted bracket: ["..."] or ['...']
      if (i + 1 < path.length && (path[i + 1] === '"' || path[i + 1] === "'")) {
        const quote = path[i + 1];
        const closePos = path.indexOf(quote + ']', i + 2);

        if (closePos !== -1) {
          if (current) {
            segments.push(current.trim());
            current = '';
          }

          segments.push(path.slice(i + 2, closePos));
          i = closePos + 2;
          continue;
        }
      }

      // Numeric bracket: [0], [1], etc.
      const closeBracket = path.indexOf(']', i + 1);

      if (closeBracket !== -1) {
        const content = path.slice(i + 1, closeBracket);

        if (/^\d+$/.test(content)) {
          if (current) {
            segments.push(current.trim());
            current = '';
          }

          segments.push(content);
          i = closeBracket + 1;
          continue;
        }
      }

      // Unrecognized bracket pattern — treat '[' as regular character
      current += ch;
      i++;
      continue;
    }

    if (ch === '.') {
      if (current) {
        segments.push(current.trim());
        current = '';
      }

      i++;
      continue;
    }

    current += ch;
    i++;
  }

  if (current) {
    segments.push(current.trim());
  }

  const result = Object.freeze(segments.filter(Boolean));

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

export function resolveRelativePath(currentPath: string, relativePath: string): string {
  if (!relativePath.startsWith('../') && relativePath !== '..') {
    return relativePath;
  }

  const segments = parsePath(currentPath);
  let remaining = relativePath;

  while (remaining.startsWith('../') || remaining === '..') {
    if (segments.length > 0) {
      segments.pop();
    }

    if (remaining === '..') {
      remaining = '';
      break;
    }

    remaining = remaining.slice(3);
  }

  if (segments.length === 0) {
    return remaining;
  }

  return `${segments.join('.')}${remaining ? `.${remaining}` : ''}`;
}

export function getIn(input: unknown, path: string): unknown {
  if (!path) {
    return input;
  }

  return parsePath(path).reduce<unknown>((current, segment) => {
    if (DANGEROUS_PATH_SEGMENTS.has(segment)) {
      return undefined;
    }
    if (current == null || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, input);
}

export function setIn(
  input: Record<string, any>,
  path: string,
  value: unknown,
): Record<string, any> {
  if (!path) {
    return isPlainObject(value) ? value : input;
  }

  const segments = parsePath(path);
  for (const seg of segments) {
    if (DANGEROUS_PATH_SEGMENTS.has(seg)) {
      throw new Error(`Path segment '${seg}' is not allowed`);
    }
  }
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
