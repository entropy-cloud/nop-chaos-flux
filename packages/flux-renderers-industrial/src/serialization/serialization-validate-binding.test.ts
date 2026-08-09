import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validateScadaConfig } from './validate.js';
import { rect, baseConfig } from './serialization-fixtures.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));

beforeEach(() => {
  registerBuiltinScadaSymbols();
});

describe('validateScadaConfig', () => {
  it('should reject declaration-level scale.expression and point to binding-scale (plan 2026-08-05-0653-3 B4)', () => {
    const rejected = validateScadaConfig(
      baseConfig({
        variables: [{ id: 'es', source: 'static', value: 1, scale: { expression: '${x * 2}' } }],
      }),
    );
    expect(rejected.ok).toBe(false);
    expect((rejected as { errors: string[] }).errors.join('; ')).toContain(
      'scale.expression is not supported at declaration level',
    );
    // linear declaration scale still accepted
    const okLinear = validateScadaConfig(
      baseConfig({ variables: [{ id: 'ls', source: 'static', value: 1, scale: { k: 2, b: 1 } }] }),
    );
    expect(okLinear).toEqual({ ok: true });
    // binding-level expression scale still accepted (applyScale consumes it)
    const okBindingExpr = validateScadaConfig(
      baseConfig({
        symbols: [rect('be', { bindings: { fill: { point: 'p1', scale: { expression: '${x}' } } } })],
      }),
    );
    expect(okBindingExpr).toEqual({ ok: true });
  });

  // plan 2026-08-09-0121-2 Workstream A F10：binding.scale 升级为与 declaration scale 同形 finite k/b 校验。
  it('F10: rejects binding.scale with NaN/Infinity/missing k,b (mirrors declaration scale finite check)', () => {
    const expectBad = (scale: unknown, contained: string) => {
      const r = validateScadaConfig(
        baseConfig({
          symbols: [rect('bk', { bindings: { fill: { point: 'p1', scale: scale as never } } })],
        }),
      );
      expect(r.ok).toBe(false);
      expect((r as { errors: string[] }).errors.join('; ')).toContain(contained);
    };
    expectBad({ k: NaN, b: 1 }, 'scale.k must be a finite number');
    expectBad({ k: 1, b: Infinity }, 'scale.b must be a finite number');
    expectBad({ k: 'x' as never }, 'scale.k must be a finite number');
    // binding-level scale.expression 必须是非空字符串（与 declaration 拒 expression 区分）
    expectBad({ expression: '' }, 'scale.expression must be a non-empty string');
    expectBad({ expression: 5 as never }, 'scale.expression must be a non-empty string');
    // 合法 linear / expression scale 仍接受
    const okLinear = validateScadaConfig(
      baseConfig({ symbols: [rect('ok1', { bindings: { fill: { point: 'p1', scale: { k: 2, b: 1 } } } })] }),
    );
    expect(okLinear).toEqual({ ok: true });
    const okExpr = validateScadaConfig(
      baseConfig({ symbols: [rect('ok2', { bindings: { fill: { point: 'p1', scale: { expression: '${x * 2}' } } } })] }),
    );
    expect(okExpr).toEqual({ ok: true });
  });

  it('should validate bindings internal structure (m-4 回归：绑定字段语义)', () => {
    const badBindingShape = validateScadaConfig(
      baseConfig({ symbols: [rect('b1', { bindings: { fill: {} as never } })] }),
    );
    expect(badBindingShape.ok).toBe(false);
    expect((badBindingShape as { errors: string[] }).errors).toContain(
      'symbols[0].bindings.fill must contain at least one of: point | expression | map | scale | format',
    );
    const badMap = validateScadaConfig(
      baseConfig({ symbols: [rect('b2', { bindings: { fill: { point: 'p1', map: 'x' as never } } })] }),
    );
    expect(badMap.ok).toBe(false);
    const badScale = validateScadaConfig(
      baseConfig({ symbols: [rect('b2b', { bindings: { fill: { point: 'p1', scale: 'x' as never } } })] }),
    );
    expect(badScale.ok).toBe(false);
    const badFormat = validateScadaConfig(
      baseConfig({ symbols: [rect('b2c', { bindings: { fill: { point: 'p1', format: 3 as never } } })] }),
    );
    expect(badFormat.ok).toBe(false);
    const badPoint = validateScadaConfig(
      baseConfig({ symbols: [rect('b2d', { bindings: { fill: { point: '' } } })] }),
    );
    expect(badPoint.ok).toBe(false);
    const badExpr = validateScadaConfig(
      baseConfig({ symbols: [rect('b2e', { bindings: { fill: { expression: '' } } })] }),
    );
    expect(badExpr.ok).toBe(false);
    const ok = validateScadaConfig(
      baseConfig({
        symbols: [rect('b3', { bindings: { fill: { point: 'p1', format: '#f00' }, text: { expression: '${p1 > 1}' } } })],
      }),
    );
    expect(ok).toEqual({ ok: true });
  });
});
