import { describe, it, expect } from 'vitest';
import { BindResolver, applyScale, formatValue, isBindableProperty } from './bind-resolver.js';
import type { ScadaBinding, ScadaPrimitive } from '../serialization/config-types.js';

describe('BindResolver 绑定解析 (I6.2)', () => {
  const values = new Map<string, ScadaPrimitive>([
    ['level', 55],
    ['mode', 'auto'],
    ['switch', true],
    ['speed', 120],
  ]);
  const evaluator = {
    getPointValue: (pointId: string) => values.get(pointId),
    evaluate: (expression: string) => {
      if (expression.includes('unknown')) return undefined;
      if (expression === "@{level} > 50 ? '#f00' : '#0f0'") return '#f00';
      if (expression === "@{level} > 50 ? 'high' : 'low'") return 'high';
      if (expression === "@{level} > 50 ? 'fast' : 'slow'") return 'fast';
      return undefined;
    },
  };
  const resolver = new BindResolver(evaluator);

  it('should resolve single-point binding (point 单点绑定)', () => {
    expect(resolver.resolveBinding({ point: 'level' })).toBe(55);
    expect(resolver.resolveBinding({ point: 'switch' })).toBe(true);
  });

  it('should resolve expression binding (expression 表达式绑定)', () => {
    expect(resolver.resolveBinding({ expression: "@{level} > 50 ? '#f00' : '#0f0'" })).toBe('#f00');
  });

  it('should prioritize point over expression when both present', () => {
    expect(resolver.resolveBinding({ point: 'level', expression: "1 + 1" })).toBe(55);
  });

  it('should apply map value→property mapping (值→属性映射)', () => {
    expect(resolver.resolveBinding({ point: 'mode', map: { auto: '#0f0', manual: '#f00' } })).toBe('#0f0');
    expect(resolver.resolveBinding({ point: 'mode', map: { manual: '#f00' } })).toBe('auto');
    expect(resolver.resolveBinding({ point: 'switch', map: { true: 1, false: 0 } })).toBe(1);
  });

  it('should apply scale conversion (量程换算 y = k*x + b)', () => {
    expect(resolver.resolveBinding({ point: 'speed', scale: { k: 0.5, b: 1 } })).toBe(61);
    expect(resolver.resolveBinding({ point: 'speed', scale: { k: 2 } })).toBe(240);
  });

  it('should apply scale expression via evaluator', () => {
    expect(resolver.resolveBinding({ point: 'speed', scale: { expression: "@{level} > 50 ? 'fast' : 'slow'" } })).toBe(
      'fast',
    );
  });

  it('should apply format for text properties (格式化)', () => {
    expect(resolver.resolveBinding({ point: 'speed', format: 'Speed: %d rpm' })).toBe('Speed: 120 rpm');
    expect(resolver.resolveBinding({ point: 'speed', format: '%f' })).toBe('120.00');
    expect(resolver.resolveBinding({ point: 'mode', format: 'mode=%s' })).toBe('mode=auto');
  });

  it('should apply the full chain point → map → scale → format', () => {
    expect(resolver.resolveBinding({ point: 'speed', map: { 120: 100 }, scale: { k: 2 }, format: '%d%%' })).toBe(
      '200%',
    );
  });

  it('should return undefined for unknown points or failed expressions (skip + 不崩溃)', () => {
    expect(resolver.resolveBinding({ point: 'ghost' })).toBeUndefined();
    expect(resolver.resolveBinding({ expression: '@{unknown} > 1 ? 1 : 0' })).toBeUndefined();
  });

  it('should skip unset values', () => {
    expect(resolver.resolveBinding({})).toBeUndefined();
  });

  it('resolveBindings should restrict to bindable properties and skip undefined', () => {
    const bindings: Record<string, ScadaBinding> = {
      fill: { point: 'level' },
      rotation: { point: 'speed' },
      notBindable: { point: 'level' },
      custom: { point: 'ghost' },
    };
    expect(resolver.resolveBindings(bindings)).toEqual([
      { property: 'fill', value: 55 },
      { property: 'rotation', value: 120 },
    ]);
  });
});

describe('applyScale (I6.2)', () => {
  it('should handle linear scale, expression scale and edge inputs', () => {
    expect(applyScale(10, { k: 2, b: 3 })).toBe(23);
    expect(applyScale(10, { k: 0.5 })).toBe(5);
    expect(applyScale(10, { b: 5 })).toBe(15);
    expect(applyScale('abc', { k: 2 })).toBe('abc');
    expect(applyScale(10, undefined)).toBe(10);
    expect(applyScale(10, { expression: '@{x} * 2' }, () => 7)).toBe(7);
    expect(applyScale(10, { expression: '@{x}' })).toBe(10);
    expect(applyScale(10, { expression: '@{x}' }, () => undefined)).toBe(10);
  });
});

describe('formatValue (I6.2)', () => {
  it('should substitute %s/%d/%f and pass through other text', () => {
    expect(formatValue(12, 'v=%d')).toBe('v=12');
    expect(formatValue(12.4, '%d')).toBe('12');
    expect(formatValue(12.456, '%f')).toBe('12.46');
    expect(formatValue('x', 'got %s')).toBe('got x');
    expect(formatValue('y', '%d')).toBe('NaN');
    expect(formatValue(1, '100%%')).toBe('100%');
    expect(formatValue(1, 'plain')).toBe('plain');
  });
});

describe('isBindableProperty (I6.2)', () => {
  it('should accept the §4.2 bindable property set', () => {
    for (const property of ['fill', 'stroke', 'strokeWidth', 'opacity', 'visible', 'text', 'textColor', 'rotation', 'x', 'y', 'width', 'height', 'flow']) {
      expect(isBindableProperty(property)).toBe(true);
    }
    expect(isBindableProperty('custom')).toBe(false);
    expect(isBindableProperty('scale')).toBe(false);
  });
});
