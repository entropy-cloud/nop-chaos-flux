/**
 * JsonTreePatch 生成与回放（design: docs/components/page-designer/design-architecture.md §7.1）。
 *
 * `diffSchemaInput(prev, next)` 返回 prev→next 的最小树 patch 集（结构化相同返回 `null`）；
 * `applyTreePatches(doc, patches)` 顺序回放（纯函数，不就地修改入参）。
 * 对称性：`applyTreePatches(applyTreePatches(doc, forward), inverse)` 深等于 `doc`，
 * 其中 `inverse = diffSchemaInput(next, prev)` 由同一算法构造（INV-F：全部作用于授权态）。
 *
 * 数组策略：公共前缀/后缀裁剪后，中段差分——纯插入逐个 `add`、纯删除倒序 `remove`、
 * 单元素位移（LCS = n-1，画布拖拽的典型形状）折叠为一条 `move`，其余 remove+add。
 * 对象策略：键级 add/remove/递归。其余形态整体 `replace`。
 */

import type { SchemaInput } from '@nop-chaos/flux-core';
import type { JsonTreePatch } from './types.js';
import { formatJsonPointer, isPlainObject } from './round-trip.js';

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => key in b && deepEqual(a[key], b[key]));
  }
  return false;
}

function parsePointer(pointer: string): (string | number)[] {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) {
    throw new Error(`invalid JSON pointer: ${pointer}`);
  }
  return pointer
    .slice(1)
    .split('/')
    .map((token) => {
      const unescaped = token.replace(/~1/g, '/').replace(/~0/g, '~');
      return /^\d+$/.test(unescaped) ? Number(unescaped) : unescaped;
    });
}

interface ContainerLookup {
  container: Record<string, unknown> | unknown[];
  token: string | number;
}

function resolveParent(root: unknown, pointer: string): ContainerLookup {
  const tokens = parsePointer(pointer);
  if (tokens.length === 0) {
    throw new Error('cannot resolve parent of root');
  }
  const last = tokens.pop() as string | number;
  let current: unknown = root;
  for (const token of tokens) {
    current = Array.isArray(current) ? current[token as number] : (current as Record<string, unknown>)[token as string];
    if (current === null || typeof current !== 'object') {
      throw new Error(`path not found while resolving parent of ${pointer}`);
    }
  }
  if (Array.isArray(current)) {
    if (typeof last !== 'number') throw new Error(`array index expected in ${pointer}`);
    return { container: current, token: last };
  }
  return { container: current as Record<string, unknown>, token: last };
}

function singleMoveIndex(prev: unknown[], next: unknown[]): { from: number; to: number } | null {
  const n = prev.length;
  let first = -1;
  for (let i = 0; i < n; i += 1) {
    if (!deepEqual(prev[i], next[i])) {
      first = i;
      break;
    }
  }
  if (first === -1) return null;
  for (let from = first + 1; from < n; from += 1) {
    if (!deepEqual(prev[from], next[first])) continue;
    // 模拟 RFC6902 move（先 remove from，再 insert to）：结果须与 next 一致。
    const moved = prev.filter((_, i) => i !== from);
    moved.splice(first, 0, prev[from]);
    if (moved.every((item, i) => deepEqual(item, next[i]))) {
      return { from, to: first };
    }
  }
  return null;
}

function diffValue(prev: unknown, next: unknown, path: string, patches: JsonTreePatch[]): void {
  if (deepEqual(prev, next)) return;

  if (Array.isArray(prev) && Array.isArray(next)) {
    let start = 0;
    while (start < prev.length && start < next.length && deepEqual(prev[start], next[start])) start += 1;
    let endPrev = prev.length;
    let endNext = next.length;
    while (endPrev > start && endNext > start && deepEqual(prev[endPrev - 1], next[endNext - 1])) {
      endPrev -= 1;
      endNext -= 1;
    }
    const prevMid = prev.slice(start, endPrev);
    const nextMid = next.slice(start, endNext);

    if (prevMid.length === 0) {
      for (let k = 0; k < nextMid.length; k += 1) {
        patches.push({ op: 'add', path: formatJsonPointer(path, start + k), value: nextMid[k] });
      }
      return;
    }
    if (nextMid.length === 0) {
      for (let k = prevMid.length - 1; k >= 0; k -= 1) {
        patches.push({ op: 'remove', path: formatJsonPointer(path, start + k) });
      }
      return;
    }
    if (prevMid.length === nextMid.length) {
      const move = singleMoveIndex(prevMid, nextMid);
      if (move) {
        patches.push({
          op: 'move',
          from: formatJsonPointer(path, start + move.from),
          path: formatJsonPointer(path, start + move.to),
        });
        return;
      }
    }
    for (let k = prevMid.length - 1; k >= 0; k -= 1) {
      patches.push({ op: 'remove', path: formatJsonPointer(path, start + k) });
    }
    for (let k = 0; k < nextMid.length; k += 1) {
      patches.push({ op: 'add', path: formatJsonPointer(path, start + k), value: nextMid[k] });
    }
    return;
  }

  if (isPlainObject(prev) && isPlainObject(next)) {
    for (const key of Object.keys(prev)) {
      if (!(key in next)) {
        patches.push({ op: 'remove', path: formatJsonPointer(path, key) });
      }
    }
    for (const key of Object.keys(next)) {
      if (!(key in prev)) {
        patches.push({ op: 'add', path: formatJsonPointer(path, key), value: next[key] });
      } else {
        diffValue(prev[key], next[key], formatJsonPointer(path, key), patches);
      }
    }
    return;
  }

  patches.push({ op: 'replace', path, value: next });
}

/** prev→next 增量；结构化相同返回 `null`。 */
export function diffSchemaInput(prev: SchemaInput, next: SchemaInput): JsonTreePatch[] | null {
  const patches: JsonTreePatch[] = [];
  diffValue(prev, next, '', patches);
  return patches.length > 0 ? patches : null;
}

function applyPatch(root: unknown, patch: JsonTreePatch): unknown {
  if (patch.path === '') {
    if (patch.op === 'replace') {
      return structuredClone(patch.value);
    }
    throw new Error(`unsupported root operation: ${patch.op}`);
  }
  if (patch.op === 'add') {
    const { container, token } = resolveParent(root, patch.path);
    if (Array.isArray(container)) {
      const index = token as number;
      if (index < 0 || index > container.length) {
        throw new Error(`add index out of range: ${patch.path}`);
      }
      container.splice(index, 0, structuredClone(patch.value));
    } else {
      container[token as string] = structuredClone(patch.value);
    }
    return root;
  }
  if (patch.op === 'remove') {
    const { container, token } = resolveParent(root, patch.path);
    if (Array.isArray(container)) {
      const index = token as number;
      if (index < 0 || index >= container.length) {
        throw new Error(`remove index out of range: ${patch.path}`);
      }
      container.splice(index, 1);
    } else {
      delete container[token as string];
    }
    return root;
  }
  if (patch.op === 'replace') {
    const { container, token } = resolveParent(root, patch.path);
    if (Array.isArray(container)) {
      const index = token as number;
      if (index < 0 || index >= container.length) {
        throw new Error(`replace index out of range: ${patch.path}`);
      }
      container[index] = structuredClone(patch.value);
    } else {
      container[token as string] = structuredClone(patch.value);
    }
    return root;
  }
  // op === 'move'（RFC6902 语义：先 remove from，再 add path）
  const { container: fromContainer, token: fromToken } = resolveParent(root, patch.from);
  const fromArray = Array.isArray(fromContainer) ? fromContainer : null;
  if (!fromArray) throw new Error(`move source must be array: ${patch.from}`);
  const fromIndex = fromToken as number;
  if (fromIndex < 0 || fromIndex >= fromArray.length) {
    throw new Error(`move source index out of range: ${patch.from}`);
  }
  const [moved] = fromArray.splice(fromIndex, 1);
  const { container: toContainer, token: toToken } = resolveParent(root, patch.path);
  const toArray = Array.isArray(toContainer) ? toContainer : null;
  if (!toArray) throw new Error(`move target must be array: ${patch.path}`);
  const toIndex = toToken as number;
  if (toIndex < 0 || toIndex > toArray.length) {
    throw new Error(`move target index out of range: ${patch.path}`);
  }
  toArray.splice(toIndex, 0, moved);
  return root;
}

/** 顺序回放 patch 集（克隆入参；非法 path 抛错，由 editor-core 捕获降级）。 */
export function applyTreePatches(doc: SchemaInput, patches: JsonTreePatch[]): SchemaInput {
  let current: unknown = structuredClone(doc);
  for (const patch of patches) {
    current = applyPatch(current, patch);
  }
  return current as SchemaInput;
}

export { deepEqual };
