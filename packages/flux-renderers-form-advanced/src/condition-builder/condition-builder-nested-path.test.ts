import { describe, expect, it } from 'vitest';
import { readNestedPath, setNestedPath } from './utils.js';

describe('condition-builder nested right-value paths', () => {
  it('writes and reads dotted paths without mutating the input', () => {
    const input = { range: { start: 1 } };
    const next = setNestedPath(input, 'range.end', 5) as { range: { start: number; end: number } };
    expect(next).toEqual({ range: { start: 1, end: 5 } });
    expect(input).toEqual({ range: { start: 1 } });
    expect(readNestedPath(next, 'range.end')).toBe(5);
  });

  it('refuses to write through `__proto__` segments', () => {
    const next = setNestedPath({ a: 1 }, '__proto__.polluted', true) as Record<string, unknown>;
    expect(Object.getPrototypeOf(next)).toBe(Object.prototype);
    expect(next.polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(next).toEqual({ a: 1 });
  });

  it('refuses `constructor` / `prototype` segments on write and read', () => {
    const next = setNestedPath({}, 'constructor.prototype.x', 1) as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(next, 'constructor')).toBe(false);
    expect(readNestedPath({ a: 1 }, 'constructor')).toBeUndefined();
    expect(readNestedPath({ a: 1 }, '__proto__')).toBeUndefined();
  });
});
