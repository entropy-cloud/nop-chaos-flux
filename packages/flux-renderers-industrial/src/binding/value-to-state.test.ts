import { describe, it, expect } from 'vitest';
import { resolveState } from './value-to-state.js';
import type { ScadaStateDeclaration } from '../serialization/config-types.js';

const baseDeclaration = (overrides: Partial<ScadaStateDeclaration> = {}): ScadaStateDeclaration => ({
  states: {
    run: { style: { fill: '#00ff00' } },
    stop: { style: { fill: '#888888' } },
    fault: { style: { fill: '#ff0000' }, animations: [{ kind: 'blink' }] },
  },
  ...overrides,
});

describe('resolveState ranges 区间映射 (I6.2)', () => {
  it('should map numeric values through ranges with inclusive bounds (边界含端点, 首个匹配优先)', () => {
    const declaration = baseDeclaration({
      ranges: [
        { max: 0, state: 'stop' },
        { min: 0, max: 80, state: 'run' },
        { min: 80, state: 'fault' },
      ],
    });
    expect(resolveState(declaration, -5)).toBe('stop');
    expect(resolveState(declaration, 0)).toBe('stop');
    expect(resolveState(declaration, 40)).toBe('run');
    expect(resolveState(declaration, 80)).toBe('run');
    expect(resolveState(declaration, 81)).toBe('fault');
    expect(resolveState(declaration, 100)).toBe('fault');
  });

  it('should match first matching range in declaration order', () => {
    const declaration = baseDeclaration({
      ranges: [
        { min: 0, max: 50, state: 'run' },
        { min: 25, max: 100, state: 'fault' },
      ],
    });
    expect(resolveState(declaration, 30)).toBe('run');
  });

  it('should fall through to default when no range matches', () => {
    const declaration = baseDeclaration({
      ranges: [{ min: 0, max: 10, state: 'run' }],
    });
    expect(resolveState(declaration, 50)).toBe('run');
  });
});

describe('resolveState booleanMap/valueMap (I6.2)', () => {
  it('should map booleans via booleanMap', () => {
    const declaration = baseDeclaration({ booleanMap: { true: 'run', false: 'stop' } });
    expect(resolveState(declaration, true)).toBe('run');
    expect(resolveState(declaration, false)).toBe('stop');
  });

  it('should map strings via valueMap', () => {
    const declaration = baseDeclaration({ valueMap: { auto: 'run', manual: 'stop', fault: 'fault' } });
    expect(resolveState(declaration, 'auto')).toBe('run');
    expect(resolveState(declaration, 'manual')).toBe('stop');
    expect(resolveState(declaration, 'fault')).toBe('fault');
  });

  it('should map numeric values via stringified valueMap keys', () => {
    const declaration = baseDeclaration({ valueMap: { 1: 'run', 0: 'stop' } });
    expect(resolveState(declaration, 1)).toBe('run');
    expect(resolveState(declaration, 0)).toBe('stop');
  });
});

describe('resolveState 判定优先级与默认状态 (I6.2)', () => {
  it('should prioritize ranges over booleanMap and valueMap', () => {
    const declaration = baseDeclaration({
      ranges: [{ min: 0, max: 100, state: 'run' }],
      booleanMap: { true: 'fault', false: 'stop' },
      valueMap: { 1: 'fault' },
    });
    expect(resolveState(declaration, 50)).toBe('run');
  });

  it('should fall through ranges → booleanMap → valueMap in priority order', () => {
    const declaration = baseDeclaration({
      ranges: [{ min: 0, max: 10, state: 'run' }],
      booleanMap: { true: 'fault', false: 'stop' },
      valueMap: { 5: 'fault' },
    });
    expect(resolveState(declaration, true)).toBe('fault');
    expect(resolveState(declaration, 5)).toBe('run');
  });

  it('should apply valueMap only when ranges/booleanMap do not match', () => {
    const declaration = baseDeclaration({
      ranges: [{ min: 0, max: 10, state: 'run' }],
      valueMap: { 20: 'fault' },
    });
    expect(resolveState(declaration, 5)).toBe('run');
    expect(resolveState(declaration, 20)).toBe('fault');
  });

  it('should return default state run when nothing matches', () => {
    expect(resolveState(baseDeclaration(), 123)).toBe('run');
  });

  it('should default to run even with empty states', () => {
    expect(resolveState({ states: {} }, 1)).toBe('run');
  });

  it('should prefer run key over first key for default', () => {
    const declaration = { states: { fault: {}, run: {} } };
    expect(resolveState(declaration, 999)).toBe('run');
  });

  it('should use named default preference chain run→normal→off→first (key-reorder-safe, B3)', () => {
    // run preferred over normal/off/first
    expect(resolveState({ states: { stop: {}, run: {}, normal: {} } }, 999)).toBe('run');
    // normal preferred over off/first when run absent
    expect(resolveState({ states: { stop: {}, normal: {}, off: {} } }, 999)).toBe('normal');
    // off preferred over first when run/normal absent
    expect(resolveState({ states: { on: {}, off: {} } }, 999)).toBe('off');
    // first key only when run/normal/off all absent
    expect(resolveState({ states: { idle: {}, active: {} } }, 999)).toBe('idle');
    // key reorder does not change the result (determinism)
    expect(resolveState({ states: { off: {}, on: {} } }, 999)).toBe('off');
    expect(resolveState({ states: { active: {}, idle: {} } }, 999)).toBe('active');
  });

  it('should apply linear scale before judging (量程换算先行)', () => {
    const declaration = baseDeclaration({ ranges: [{ min: 0, max: 100, state: 'run' }] });
    expect(resolveState(declaration, 10, { scale: { k: 10 } })).toBe('run');
    expect(resolveState(declaration, 20, { scale: { k: 10 } })).toBe('run');
  });

  it('should ignore expression scale (纯逻辑无法求值)', () => {
    const declaration = baseDeclaration({ ranges: [{ min: 0, max: 100, state: 'run' }] });
    expect(resolveState(declaration, 5, { scale: { expression: '${x * 2}' } })).toBe('run');
  });

  it('should handle undefined values gracefully', () => {
    expect(resolveState(baseDeclaration(), undefined)).toBe('run');
  });
});
