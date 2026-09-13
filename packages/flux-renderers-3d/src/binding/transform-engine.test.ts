import { describe, expect, it, vi } from 'vitest';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createDefaultEnv } from '@nop-chaos/flux-react';
import type { DataBinding } from '../schemas.js';
import { TransformEngine } from './transform-engine.js';

const compiler = createExpressionCompiler(createFormulaCompiler());
const env = createDefaultEnv();

function binding(overrides: Partial<DataBinding> = {}): DataBinding {
  return {
    id: 'b1',
    target: { modelId: 'valve', path: 'position', type: 'position' },
    source: { expression: '${sceneState.valve1}' },
    ...overrides,
  };
}

describe('TransformEngine (plan 466 Phase 1, design-data-binding.md §5)', () => {
  it('returns the value unchanged when no transform/condition is declared', () => {
    const engine = new TransformEngine(compiler, env);
    expect(engine.apply(binding(), 42)).toBe(42);
    expect(engine.apply(binding(), 'raw')).toBe('raw');
  });

  it('range: linear mapping with clamp and divide-by-zero fallback', () => {
    const engine = new TransformEngine(compiler, env);
    const b = binding({ transform: { range: { input: [0, 100], output: [0, 1] } } });
    expect(engine.apply(b, 50)).toBeCloseTo(0.5);
    expect(engine.apply(b, -10)).toBe(0); // clamp 下界
    expect(engine.apply(b, 150)).toBe(1); // clamp 上界
    const zeroWidth = binding({ transform: { range: { input: [3, 3], output: [0, 1] } } });
    expect(engine.apply(zeroWidth, 99)).toBe(0); // 防除零回 outputMin
  });

  it('convert: flux expression with injected value variable', () => {
    const engine = new TransformEngine(compiler, env);
    const b = binding({ transform: { convert: '${value * 2 + 1}' } });
    expect(engine.apply(b, 20)).toBe(41);
  });

  it('condition: true/false value selection', () => {
    const engine = new TransformEngine(compiler, env);
    const b = binding({
      condition: { expression: '${value > 10}', trueValue: 'open', falseValue: 'closed' },
    });
    expect(engine.apply(b, 50)).toBe('open');
    expect(engine.apply(b, 5)).toBe('closed');
  });

  it('applies in fixed order: range → convert → condition', () => {
    const engine = new TransformEngine(compiler, env);
    const b = binding({
      transform: {
        range: { input: [0, 100], output: [0, 10] },
        convert: '${value + 1}',
      },
      condition: { expression: '${value >= 5}', trueValue: 'high', falseValue: 'low' },
    });
    // 50 → range 5 → convert 6 → condition high
    expect(engine.apply(b, 50)).toBe('high');
    // 10 → range 1 → convert 2 → condition low
    expect(engine.apply(b, 10)).toBe('low');
  });

  it('falls back to the original value and dedups reports when convert fails', () => {
    const onError = vi.fn();
    const engine = new TransformEngine(compiler, env, onError);
    const b = binding({ id: 'bad-convert', transform: { convert: '${value * 2}' } });
    // 合法表达式（dynamic 编译）+ 求值阶段抛错 → 回退原值 + 去重
    const evalSpy = vi.spyOn(compiler, 'evaluateValue').mockImplementation(() => {
      throw new Error('convert exploded');
    });
    expect(engine.apply(b, 7)).toBe(7); // 回退原值
    expect(engine.apply(b, 8)).toBe(8); // 第二次失败
    expect(onError.mock.calls.filter(([code]) => code === 'transform-convert-failed')).toHaveLength(1); // 去重
    evalSpy.mockRestore();
    // 恢复后成功求值（×2）并清去重记录
    expect(engine.apply(b, 7)).toBe(14);
  });

  it('caches compiled convert/condition expressions per binding', () => {
    const engine = new TransformEngine(compiler, env);
    const compileSpy = vi.spyOn(compiler, 'compileValue');
    const b = binding({ transform: { convert: '${value * 3}' } });
    engine.apply(b, 1);
    engine.apply(b, 2);
    engine.apply(b, 3);
    const convertCalls = compileSpy.mock.calls.filter(([source]) => String(source).includes('value * 3'));
    expect(convertCalls.length).toBeLessThanOrEqual(1);
    compileSpy.mockRestore();
  });
});

describe('TransformEngine branch supplement (plan 466 coverage policy)', () => {
  it('reports String(error) for non-Error throws', () => {
    const onError = vi.fn();
    const engine = new TransformEngine(compiler, env, onError);
    const b = binding({ id: 'nonerror', transform: { convert: '${value * 2}' } });
    const evalSpy = vi.spyOn(compiler, 'evaluateValue').mockImplementation(() => {
      throw 'plain string failure';
    });
    engine.apply(b, 7);
    expect(onError).toHaveBeenCalledWith('transform-convert-failed', 'plain string failure', 'plain string failure');
    evalSpy.mockRestore();
  });

  it('static convert/condition expressions leave the value unchanged', () => {
    const engine = new TransformEngine(compiler, env);
    const b = binding({
      transform: { convert: '${1 + 1}' },
      condition: { expression: '${true}', trueValue: 'T', falseValue: 'F' },
    });
    // 平台把常量表达式折叠为 static → 不进求值，原值直通
    expect(engine.apply(b, 7)).toBe(7);
  });

  it('range skips non-numeric values', () => {
    const engine = new TransformEngine(compiler, env);
    const b = binding({ transform: { range: { input: [0, 100], output: [0, 1] } } });
    expect(engine.apply(b, 'not-a-number')).toBe('not-a-number');
  });
});
