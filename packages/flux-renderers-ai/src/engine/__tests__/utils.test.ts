import { describe, it, expect } from 'vitest';
import { combineDeltaData } from '../utils.js';

describe('combineDeltaData', () => {
  it('concatenates two strings', () => {
    expect(combineDeltaData('Hello', ' world')).toBe('Hello world');
  });

  it('concatenates partial content deltas', () => {
    let acc = '';
    acc = combineDeltaData(acc, 'Hel');
    acc = combineDeltaData(acc, 'lo');
    expect(acc).toBe('Hello');
  });

  it('merges objects recursively (nested string concat)', () => {
    const target = { a: 'x', nested: { s: '1' } };
    combineDeltaData(target, { nested: { s: '2' }, b: 'new' });
    expect(target).toEqual({ a: 'x', nested: { s: '12' }, b: 'new' });
  });

  it('merges OpenAI tool_calls arrays by index', () => {
    const target = {
      tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '{"ci' } }],
    };
    const source = {
      tool_calls: [{ index: 0, function: { arguments: 'ty":"SF"}' } }],
    };
    combineDeltaData(target, source);
    expect(target.tool_calls).toHaveLength(1);
    expect(target.tool_calls[0]).toEqual({
      index: 0,
      id: 'call_1',
      type: 'function',
      function: { name: 'get_weather', arguments: '{"city":"SF"}' },
    });
  });

  it('appends new index entries to an indexed array', () => {
    const target: { tool_calls: unknown[] } = {
      tool_calls: [{ index: 0, id: 'a', type: 'function', function: { name: 'f', arguments: '{}' } }],
    };
    combineDeltaData(target, {
      tool_calls: [{ index: 1, id: 'b', type: 'function', function: { name: 'g', arguments: '{}' } }],
    });
    expect(target.tool_calls).toHaveLength(2);
    expect((target.tool_calls[1] as { id: string }).id).toBe('b');
  });

  it('concatenates plain arrays without index fields', () => {
    const target: { items: string[] } = { items: ['a'] };
    combineDeltaData(target, { items: ['b', 'c'] });
    expect(target.items).toEqual(['a', 'b', 'c']);
  });

  it('never overwrites the `type` field once set', () => {
    const target: { type: string; text: string } = { type: 'text', text: 'a' };
    combineDeltaData(target, { type: 'image_url', text: 'b' });
    expect(target.type).toBe('text');
    expect(target.text).toBe('ab');
  });

  it('assigns new fields directly (deep cloned for objects)', () => {
    const target: Record<string, unknown> = { keep: 1 };
    const sourceObj = { nested: { v: 1 } };
    combineDeltaData(target, { added: sourceObj });
    expect(target.added).toEqual({ nested: { v: 1 } });
    // Mutating the source afterwards must not leak into target.
    sourceObj.nested.v = 999;
    expect((target.added as { nested: { v: number } }).nested.v).toBe(1);
  });

  it('returns target unchanged when source is null/undefined', () => {
    const target = { a: 1 };
    expect(combineDeltaData(target, null)).toBe(target);
    expect(combineDeltaData(target, undefined)).toBe(target);
  });

  it('adopts source when target is undefined', () => {
    expect(combineDeltaData(undefined, 'set')).toBe('set');
    expect(combineDeltaData(undefined, 42)).toBe(42);
  });

  it('overwrites primitive target with source primitive', () => {
    expect(combineDeltaData(1, 2)).toBe(2);
    expect(combineDeltaData(true, false)).toBe(false);
  });
});

describe('combineDeltaData — dangerous keys from streamed JSON', () => {
  const PROBE = '__fluxDeltaPollutionProbe__';

  function cleanupPrototype() {
    delete (Object.prototype as Record<string, unknown>)[PROBE];
  }

  it('merging a parsed `__proto__` delta into an existing object does not pollute Object.prototype', () => {
    try {
      const target: Record<string, unknown> = { content: 'a' };
      combineDeltaData(target, JSON.parse(`{"__proto__":{"${PROBE}":true},"content":"b"}`));
      expect(({} as Record<string, unknown>)[PROBE]).toBeUndefined();
      expect(target.content).toBe('ab');
      expect(Object.getPrototypeOf(target)).toBe(Object.prototype);
    } finally {
      cleanupPrototype();
    }
  });

  it('adopting a parsed `__proto__` delta into an empty slot does not replace the clone prototype', () => {
    try {
      const target: Record<string, unknown> = {};
      combineDeltaData(target, JSON.parse(`{"nested":{"__proto__":{"${PROBE}":true},"x":1}}`));
      const nested = target.nested as Record<string, unknown>;
      expect(nested.x).toBe(1);
      expect(nested[PROBE]).toBeUndefined();
      expect(Object.getPrototypeOf(nested)).toBe(Object.prototype);
      expect(({} as Record<string, unknown>)[PROBE]).toBeUndefined();
    } finally {
      cleanupPrototype();
    }
  });

  it('ignores `constructor` and `prototype` keys in deltas', () => {
    const target: Record<string, unknown> = { a: 'x' };
    combineDeltaData(target, JSON.parse('{"constructor":{"prototype":{"y":1}},"prototype":{"z":1},"a":"y"}'));
    expect(target.a).toBe('xy');
    expect(Object.prototype.hasOwnProperty.call(target, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(target, 'prototype')).toBe(false);
    expect(({} as Record<string, unknown>).y).toBeUndefined();
  });
});
