import { describe, expect, it } from 'vitest';
import { createRendererRegistry, type TemplateNode } from '@nop-chaos/flux-core';
import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { threeCanvasRendererDefinition } from '../renderer-definitions.js';
import { normalizePreservedBinding } from './binding-literals.js';

/**
 * RED-LINE contract（plan 469 Fix）：schema 面-authored 的 `bindings.source.expression`
 * 必须以原始表达式字符串到达渲染器（design-data-binding.md §1 契约；表达式一元化的求值
 * 入口在绑定桥，不在 schema props 编译层）。
 *
 * 平台 schema 编译器默认对 prop 树内 `${...}` 字符串做 props 表达式求值；three-canvas 的
 * propContracts 必须以 schema-definition + literal fieldRules 声明字面量保留位
 * （source.expression / condition.expression / transform.convert），编译器将其包成
 * `{ __nopPreserveLiteral: true, value }` 信封存活到运行时，渲染器经
 * normalizePreservedBinding 解包。本测试先写（红）：propContracts 未声明时
 * `${spin}` 被 props 求值机制吃掉（bindings 内表达式被求值、原始字符串丢失）。
 */

function compileThreeCanvasProps(schema: Record<string, unknown>): {
  bindings: unknown[];
} {
  const compiler = createSchemaCompiler({
    registry: createRendererRegistry([threeCanvasRendererDefinition]),
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
  const compiled = compiler.compile(schema as never);
  const node = compiled.root as TemplateNode;
  const program = node.propsProgram as unknown as {
    kind: string;
    value?: { bindings?: unknown[] };
  };
  if (program.kind !== 'static' || !program.value?.bindings) {
    throw new Error(
      `expected static propsProgram with bindings, got kind=${program.kind}`,
    );
  }
  return program.value as { bindings: unknown[] };
}

describe('bindings literal preservation through schema compilation', () => {
  it('keeps binding expressions as raw strings (preserve-literal envelopes)', () => {
    const props = compileThreeCanvasProps({
      type: 'three-canvas',
      scene: {
        camera: { position: [0, 0, 5] },
        lights: [{ type: 'ambient', intensity: 1 }],
        models: [
          { id: 'a', primitive: { geometry: { type: 'box', args: { width: 1 } } } },
        ],
      },
      bindings: [
        {
          id: 'spin',
          target: { modelId: 'a', path: 'rotation.y', type: 'rotation' },
          source: { expression: '${spin}' },
        },
        {
          id: 'alarm',
          target: { modelId: 'a', path: 'visible', type: 'visible' },
          source: { expression: '${heat}' },
          condition: { expression: 'value > 70', trueValue: true, falseValue: false },
          transform: { convert: 'value * 2' },
        },
      ],
    });

    const first = normalizePreservedBinding(props.bindings[0]);
    expect(first.source.expression).toBe('${spin}');

    const second = normalizePreservedBinding(props.bindings[1]);
    expect(second.source.expression).toBe('${heat}');
    expect(second.condition?.expression).toBe('value > 70');
    expect(second.transform?.convert).toBe('value * 2');
    expect(second.condition?.trueValue).toBe(true);
    expect(second.condition?.falseValue).toBe(false);
  });

  it('passes plain (non-envelope) bindings through unchanged', () => {
    const raw = {
      id: 'direct',
      target: { modelId: 'a', path: 'position.y', type: 'position' },
      source: { expression: '${level}' },
    };
    const normalized = normalizePreservedBinding(raw);
    expect(normalized).toEqual(raw);
  });
});
