/**
 * tree-patch / round-trip 边界补充测试：非法 path 抛错、指针转义、缺省分支。
 */

import { describe, expect, it } from 'vitest';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { applyTreePatches } from './tree-patch.js';
import { escapeJsonPointerToken, unescapeJsonPointerToken } from './round-trip.js';

describe('applyTreePatches 错误路径（editor-core 捕获降级的上游）', () => {
  const doc = { type: 'page', body: [{ n: 1 }], meta: {} } as unknown as SchemaInput;

  it('add index out of range throws', () => {
    expect(() => applyTreePatches(doc, [{ op: 'add', path: '/body/9', value: 1 }])).toThrow(/out of range/);
  });

  it('add on array with non-numeric token throws', () => {
    expect(() => applyTreePatches(doc, [{ op: 'add', path: '/body/x', value: 1 }])).toThrow(/array index expected/);
  });

  it('remove/replace index out of range throws', () => {
    expect(() => applyTreePatches(doc, [{ op: 'remove', path: '/body/3' }])).toThrow(/out of range/);
    expect(() => applyTreePatches(doc, [{ op: 'replace', path: '/body/3', value: 1 }])).toThrow(/out of range/);
  });

  it('intermediate path not found throws', () => {
    expect(() => applyTreePatches(doc, [{ op: 'remove', path: '/nope/deep' }])).toThrow(/path not found/);
  });

  it('move source/target must be arrays', () => {
    expect(() => applyTreePatches(doc, [{ op: 'move', from: '/meta', path: '/body/0' }])).toThrow(/source must be array/);
    expect(() => applyTreePatches(doc, [{ op: 'move', from: '/body/0', path: '/meta' }])).toThrow(/target must be array/);
  });

  it('move source/target index out of range throws', () => {
    expect(() => applyTreePatches(doc, [{ op: 'move', from: '/body/5', path: '/body/0' }])).toThrow(/source index out of range/);
    expect(() => applyTreePatches(doc, [{ op: 'move', from: '/body/0', path: '/body/5' }])).toThrow(/target index out of range/);
  });

  it('root add/remove/move unsupported', () => {
    expect(() => applyTreePatches(doc, [{ op: 'add', path: '', value: 1 }])).toThrow(/unsupported root operation/);
  });

  it('resolveParent of root via move/from throws "cannot resolve parent"', () => {
    expect(() => applyTreePatches(doc, [{ op: 'move', from: '', path: '/body/0' }])).toThrow(/cannot resolve parent of root/);
    expect(() => applyTreePatches(doc, [{ op: 'move', from: 'invalid', path: '/body/0' }])).toThrow(/invalid JSON pointer/);
  });

  it('replace on a valid array index applies in place', () => {
    const target = { type: 'page', body: ['a', 'b'] } as unknown as SchemaInput;
    const next = applyTreePatches(target, [{ op: 'replace', path: '/body/1', value: 'c' }]);
    expect((next as Record<string, unknown>).body).toEqual(['a', 'c']);
  });
});

describe('JSON Pointer token 转义', () => {
  it('escapes ~ first then /, and unescapes inversely', () => {
    expect(escapeJsonPointerToken('a~b/c')).toBe('a~0b~1c');
    expect(unescapeJsonPointerToken('a~0b~1c')).toBe('a~b/c');
    expect(unescapeJsonPointerToken(escapeJsonPointerToken('~/~//'))).toBe('~/~//');
  });
});
