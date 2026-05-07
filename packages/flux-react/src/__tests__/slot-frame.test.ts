import { describe, expect, it } from 'vitest';
import { buildSlotFrame, readSlotFrame, SLOT_KEY } from '../slot-frame.js';

describe('SLOT_KEY', () => {
  it('is $slot', () => {
    expect(SLOT_KEY).toBe('$slot');
  });
});

describe('buildSlotFrame', () => {
  it('builds a flat frame without outer', () => {
    const frame = buildSlotFrame({ item: 'a', index: 0 }, undefined);
    expect(frame).toEqual({ item: 'a', index: 0 });
    expect((frame as any).$parent).toBeUndefined();
  });

  it('nests outer frame under $parent', () => {
    const outer = buildSlotFrame({ item: 'root' }, undefined);
    const inner = buildSlotFrame({ item: 'child', index: 1 }, outer);
    expect(inner).toEqual({
      item: 'child',
      index: 1,
      $parent: { item: 'root' },
    });
  });

  it('supports deeply nested slot frames', () => {
    const level1 = buildSlotFrame({ item: 'a' }, undefined);
    const level2 = buildSlotFrame({ item: 'b' }, level1);
    const level3 = buildSlotFrame({ item: 'c' }, level2);
    expect(level3.$parent).toBe(level2);
    expect((level3.$parent as any).$parent).toBe(level1);
    expect(((level3.$parent as any).$parent as any).$parent).toBeUndefined();
  });

  it('handles empty bindings', () => {
    const frame = buildSlotFrame({}, undefined);
    expect(frame).toEqual({});
    expect((frame as any).$parent).toBeUndefined();
  });

  it('handles empty bindings with outer', () => {
    const outer = buildSlotFrame({ x: 1 }, undefined);
    const frame = buildSlotFrame({}, outer);
    expect(frame).toEqual({ $parent: { x: 1 } });
  });
});

describe('readSlotFrame', () => {
  it('returns undefined when slot key is not present', () => {
    expect(readSlotFrame({})).toBeUndefined();
  });

  it('returns undefined when slot value is null', () => {
    expect(readSlotFrame({ $slot: null })).toBeUndefined();
  });

  it('returns undefined when slot value is a string', () => {
    expect(readSlotFrame({ $slot: 'string' })).toBeUndefined();
  });

  it('returns undefined when slot value is a number', () => {
    expect(readSlotFrame({ $slot: 42 })).toBeUndefined();
  });

  it('returns frame when slot value is an object', () => {
    const frame = { item: 'a', index: 0 };
    expect(readSlotFrame({ $slot: frame })).toBe(frame);
  });

  it('returns frame with $parent', () => {
    const frame = { item: 'child', $parent: { item: 'root' } };
    expect(readSlotFrame({ $slot: frame })).toBe(frame);
  });

  it('returns empty object when slot is empty object', () => {
    const frame = {};
    expect(readSlotFrame({ $slot: frame })).toBe(frame);
  });
});
