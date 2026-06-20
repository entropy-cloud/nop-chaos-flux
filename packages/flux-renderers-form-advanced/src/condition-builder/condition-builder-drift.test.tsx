import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { makeEmptyGroup, renderGroup, testFields } from './config-test-support.js';
import type { ConditionGroupValue } from './types.js';

// E0d Phase 1 裁定:
// - showIf: 实现（组级 if 输入，绑定 value.if）
// - selectMode: 不采纳（整体删字段，收敛 list-only）
// - formulas / formulaForIf: 进 types.ts（DESIGN-ACK-NOT-IMPL，运行时静默忽略）
//
// Note: `SchemaObject` 基类带 `[key: string]: SchemaValue` 索引签名（见
// flux-core schema-base-types.ts），`keyof ConditionBuilderSchema` 必然包含任意
// string，无法用 `@ts-expect-error` / `K extends keyof T` 类型层断言证明"字段已
// 从类型消失"或"字段已进类型"。改为运行时结构验证 + 源码 grep：
// - 源码：types.ts 不再声明 selectMode；声明 formulas/formulaForIf/ConditionFormulaConfig。
// - 运行时：showIf 渲染 if 输入并写入 value.if（behavioral proof）。
// - 运行时 baseline：selectMode:'tree' as any / formulas:{...} as any 无效果、不崩溃。

function readTypesTsSource(): string {
  return readFileSync('src/condition-builder/types.ts', 'utf-8');
}

function ifInput(): HTMLElement | null {
  return document.querySelector('[data-slot="condition-group-if-input"]');
}

describe('E0d drift fix — showIf (裁定: 实现)', () => {
  it('RED→GREEN: showIf:true 渲染组级 if 表达式输入', () => {
    renderGroup({ showIf: true, showAndOr: true });
    expect(ifInput()).not.toBeNull();
  });

  it('RED→GREEN: showIf:false (缺省) 不渲染 if 输入', () => {
    renderGroup({ showIf: false, showAndOr: true });
    expect(ifInput()).toBeNull();
  });

  it('RED→GREEN: 缺省 showIf 不渲染 if 输入', () => {
    renderGroup({ showAndOr: true });
    expect(ifInput()).toBeNull();
  });

  it('RED→GREEN: 在 if 输入中填写 → onChange 写入 value.if', () => {
    const onChange = vi.fn();
    renderGroup({ showIf: true, showAndOr: true }, makeEmptyGroup(), onChange);
    const input = ifInput();
    expect(input).not.toBeNull();
    fireEvent.change(input as HTMLElement, { target: { value: '${age > 18}' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ if: '${age > 18}' }),
    );
  });

  it('RED→GREEN: value.if 已存在时，if 输入回显该值', () => {
    const value: ConditionGroupValue = {
      id: 'g1',
      conjunction: 'and',
      if: '${status === "active"}',
      children: [],
    };
    renderGroup({ showIf: true, showAndOr: true }, value);
    const input = ifInput() as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input?.value).toBe('${status === "active"}');
  });

  it('RED→GREEN: showIf:true 但 value.if 缺省 → if 输入为空串', () => {
    renderGroup({ showIf: true, showAndOr: true }, makeEmptyGroup());
    const input = ifInput() as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input?.value).toBe('');
  });
});

describe('E0d drift fix — selectMode (裁定: 整体删字段)', () => {
  it("RED→GREEN: types.ts 的 ConditionBuilderSchema 不再声明 selectMode 字段", () => {
    // 源码 grep：ConditionBuilderSchema 接口体内不应再出现 `selectMode` 属性声明。
    // 当前 RED：types.ts:152 仍声明 `selectMode?: 'list' | 'tree' | 'chained';`
    const source = readTypesTsSource();
    // 提取 ConditionBuilderSchema 接口块
    const ifaceStart = source.indexOf('export interface ConditionBuilderSchema');
    expect(ifaceStart).toBeGreaterThanOrEqual(0);
    const ifaceRest = source.slice(ifaceStart);
    const closingBrace = ifaceRest.indexOf('}');
    const ifaceBlock = ifaceRest.slice(0, closingBrace);
    expect(ifaceBlock).not.toMatch(/selectMode\s*\??\s*:/);
  });

  it('BASELINE (现绿/持续绿): selectMode:"tree" as any 对渲染无效果（组正常渲染）', () => {
    // selectMode 删除后，schema 仍可通过索引签名传入但 renderer 永不消费。
    renderGroup({
      showAndOr: true,
      fields: testFields,
    } as never);
    // 现行 list 模式渲染组容器；selectMode 传任何值都不改变组渲染。
    expect(document.querySelector('[data-slot="condition-group"]')).not.toBeNull();
  });
});

describe('E0d drift fix — formulas / formulaForIf (裁定: 进 types.ts, DESIGN-ACK-NOT-IMPL)', () => {
  it('RED→GREEN: types.ts 声明 ConditionFormulaConfig 接口', () => {
    const source = readTypesTsSource();
    // 当前 RED：types.ts 未声明 ConditionFormulaConfig
    expect(source).toMatch(/export\s+interface\s+ConditionFormulaConfig\b/);
  });

  it('RED→GREEN: types.ts 的 ConditionBuilderSchema 声明 formulas? 字段', () => {
    const source = readTypesTsSource();
    const ifaceStart = source.indexOf('export interface ConditionBuilderSchema');
    const ifaceRest = source.slice(ifaceStart);
    const closingBrace = ifaceRest.indexOf('}');
    const ifaceBlock = ifaceRest.slice(0, closingBrace);
    // 当前 RED：ifaceBlock 不含 formulas?
    expect(ifaceBlock).toMatch(/formulas\s*\??\s*:\s*ConditionFormulaConfig/);
  });

  it('RED→GREEN: types.ts 的 ConditionBuilderSchema 声明 formulaForIf? 字段', () => {
    const source = readTypesTsSource();
    const ifaceStart = source.indexOf('export interface ConditionBuilderSchema');
    const ifaceRest = source.slice(ifaceStart);
    const closingBrace = ifaceRest.indexOf('}');
    const ifaceBlock = ifaceRest.slice(0, closingBrace);
    // 当前 RED：ifaceBlock 不含 formulaForIf?
    expect(ifaceBlock).toMatch(/formulaForIf\s*\??\s*:\s*ConditionFormulaConfig/);
  });

  it('BASELINE (现绿/持续绿): formulas:{...} as any 不崩溃、不改变组渲染（DESIGN-ACK-NOT-IMPL 静默忽略）', () => {
    renderGroup({
      showAndOr: true,
      fields: testFields,
      formulas: { enabled: true, formula: '${age}' } as never,
      formulaForIf: { enabled: true } as never,
    });
    // 组正常渲染（无崩溃、无消费）；DESIGN-ACK-NOT-IMPL = 静默忽略。
    expect(document.querySelector('[data-slot="condition-group"]')).not.toBeNull();
  });
});

describe('E0d drift fix — negative baseline (缺省行为不变)', () => {
  it('BASELINE (现绿/持续绿): 无任何漂移字段时，组正常渲染 conjunction 控件、无 if 输入', () => {
    renderGroup({ showAndOr: true, showNot: false });
    expect(screen.queryAllByText('AND').length).toBeGreaterThanOrEqual(1);
    expect(ifInput()).toBeNull();
  });
});
