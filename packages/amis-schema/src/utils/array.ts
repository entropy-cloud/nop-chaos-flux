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
