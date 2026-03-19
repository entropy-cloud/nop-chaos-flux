import type { ValidationError } from '@nop-chaos/amis-schema';

function isNumericPathSegment(segment: string | undefined): boolean {
  return typeof segment === 'string' && /^\d+$/.test(segment);
}

export function transformArrayIndexedPath(
  path: string,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined
): string | undefined {
  if (path === arrayPath) {
    return path;
  }

  const prefix = `${arrayPath}.`;

  if (!path.startsWith(prefix)) {
    return path;
  }

  const remainder = path.slice(prefix.length);
  const [indexSegment, ...rest] = remainder.split('.');

  if (!isNumericPathSegment(indexSegment)) {
    return path;
  }

  const nextIndex = transformIndex(Number(indexSegment));

  if (nextIndex === undefined) {
    return undefined;
  }

  return [arrayPath, String(nextIndex), ...rest].filter(Boolean).join('.');
}

export function remapBooleanState(
  input: Record<string, boolean>,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined
): Record<string, boolean> {
  const next: Record<string, boolean> = {};

  for (const [path, value] of Object.entries(input)) {
    const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

    if (nextPath) {
      next[nextPath] = value;
    }
  }

  return next;
}

export function remapErrorState(
  input: Record<string, ValidationError[]>,
  arrayPath: string,
  transformIndex: (index: number) => number | undefined
): Record<string, ValidationError[]> {
  const next: Record<string, ValidationError[]> = {};

  for (const [path, errors] of Object.entries(input)) {
    const nextPath = transformArrayIndexedPath(path, arrayPath, transformIndex);

    if (!nextPath) {
      continue;
    }

    const nextErrors: ValidationError[] = [];

    for (const error of errors) {
      const mappedPath = transformArrayIndexedPath(error.path, arrayPath, transformIndex);

      if (!mappedPath) {
        continue;
      }

      const mappedOwnerPath = error.ownerPath
        ? transformArrayIndexedPath(error.ownerPath, arrayPath, transformIndex) ?? error.ownerPath
        : error.ownerPath;
      const mappedRelatedPaths = error.relatedPaths?.map((relatedPath) => {
        const fullRelatedPath = relatedPath.includes('.') || !path.startsWith(arrayPath) ? relatedPath : `${arrayPath}.${relatedPath}`;
        const mappedRelatedPath = transformArrayIndexedPath(fullRelatedPath, arrayPath, transformIndex);

        if (!mappedRelatedPath) {
          return relatedPath;
        }

        return relatedPath.includes('.') || !mappedRelatedPath.startsWith(`${arrayPath}.`)
          ? mappedRelatedPath
          : mappedRelatedPath.slice(arrayPath.length + 1);
      });

      nextErrors.push({
        ...error,
        path: mappedPath,
        ownerPath: mappedOwnerPath,
        relatedPaths: mappedRelatedPaths
      });
    }

    if (nextErrors.length > 0) {
      next[nextPath] = nextErrors;
    }
  }

  return next;
}

export function clampInsertIndex(index: number, length: number): number {
  if (index < 0) {
    return 0;
  }

  if (index > length) {
    return length;
  }

  return index;
}

export function clampArrayIndex(index: number, length: number): number {
  if (length === 0) {
    return 0;
  }

  if (index < 0) {
    return 0;
  }

  if (index >= length) {
    return length - 1;
  }

  return index;
}

export function insertArrayValue(input: unknown[], index: number, value: unknown): unknown[] {
  const next = input.slice();
  next.splice(clampInsertIndex(index, next.length), 0, value);
  return next;
}

export function removeArrayValue(input: unknown[], index: number): unknown[] {
  if (input.length === 0) {
    return input.slice();
  }

  const next = input.slice();
  next.splice(clampArrayIndex(index, next.length), 1);
  return next;
}

export function moveArrayValue(input: unknown[], from: number, to: number): unknown[] {
  if (input.length <= 1) {
    return input.slice();
  }

  const next = input.slice();
  const fromIndex = clampArrayIndex(from, next.length);
  const toIndex = clampArrayIndex(to, next.length);

  if (fromIndex === toIndex) {
    return next;
  }

  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function swapArrayValue(input: unknown[], a: number, b: number): unknown[] {
  if (input.length <= 1) {
    return input.slice();
  }

  const next = input.slice();
  const first = clampArrayIndex(a, next.length);
  const second = clampArrayIndex(b, next.length);

  if (first === second) {
    return next;
  }

  [next[first], next[second]] = [next[second], next[first]];
  return next;
}
