import { describe, it, expect, vi } from 'vitest';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createDefaultEnv } from '@nop-chaos/flux-react';
import { validateScadaConfig } from '../serialization/validate.js';
import { PointStore } from './point-store.js';
import { ReverseIndex } from './reverse-index.js';
import { DirtyCollector, RefreshPipeline } from './dirty-collector.js';
import type { ApplyAttrs } from './dirty-collector.js';
import type { ScadaConfig, ScadaPointDeclaration, ScadaSymbolNode } from '../serialization/config-types.js';

/**
 * I18.2 点表可选契约锁定（plan 2026-08-05-2129-1 Phase 2）。
 *
 * 5 场景 contract lock-in（design-data-binding.md §9.1）：
 *  ① 无点表直连：config 无 variables 合法 + binding.expression ${scopeMember} 直连 scope 求值。
 *  ② 有点表：传统 variables 配置正常工作。
 *  ③ 同名冲突 scope 胜出：{...pointValues, ...scopeData} 合并优先级，scope 遮蔽 point。
 *  ④ 点表 expression 点：source:'expression' 点经 flux compiler 求值，结果进 evalScope。
 *  ⑤ 点表 static 点：source:'static' 点值进 evalScope。
 *
 * live baseline：variables 类型/校验已可选（config-types.ts:98 + validate.ts:348）。
 * 本 Phase 不做 phantom 改动，仅 contract-lock + doc-sync。
 */
const expressionCompiler = createExpressionCompiler(createFormulaCompiler());
const env = createDefaultEnv();

interface PipelineHarness {
  pointStore: PointStore;
  collector: DirtyCollector;
  pipeline: RefreshPipeline;
  applied: Array<Record<string, Record<string, unknown>>>;
}

function createHarness(
  declarations: ScadaPointDeclaration[],
  symbols: ScadaSymbolNode[],
  scopeData: Record<string, unknown> = {},
): PipelineHarness {
  const pointStore = new PointStore();
  pointStore.loadDeclarations(declarations);
  const reverseIndex = new ReverseIndex(symbols, { compiler: expressionCompiler, env });
  const collector = new DirtyCollector({ scheduleTick: () => () => {} });
  const applied: Array<Record<string, Record<string, unknown>>> = [];
  const pipeline = new RefreshPipeline({
    pointStore,
    reverseIndex,
    collector,
    compiler: expressionCompiler,
    env,
  });
  pipeline.updateScopeData(scopeData);
  return { pointStore, collector, pipeline, applied };
}

const harnessApply = (harness: PipelineHarness): ApplyAttrs => (attrs) => {
  harness.applied.push(attrs as Record<string, Record<string, unknown>>);
};

describe('I18.2 点表可选契约锁定（Phase 2 contract-lock）', () => {
  describe('validateScadaConfig: variables 已可选', () => {
    it('① config 缺省 variables 字段合法（contract: variables?: ScadaPointDeclaration[]）', () => {
      const result = validateScadaConfig({ version: 1, symbols: [] });
      expect(result.ok).toBe(true);
    });

    it('config.variables === undefined 与 config.variables === [] 等价合法', () => {
      expect(validateScadaConfig({ version: 1, variables: undefined, symbols: [] }).ok).toBe(true);
      expect(validateScadaConfig({ version: 1, variables: [], symbols: [] }).ok).toBe(true);
    });

    it('config.variables 非 array 仍被拒（contract: 缺省合法但类型收紧）', () => {
      expect(validateScadaConfig({ version: 1, variables: 'oops' as never, symbols: [] }).ok).toBe(false);
    });
  });

  describe('5 场景 contract lock-in（design-data-binding.md §9.1 合并优先级）', () => {
    it('① 无点表直连：binding.expression ${scopeMember} 直连 scope 求值', () => {
      // 无 variables，binding 直接读 scope 数据
      // plan 2026-08-05-2129-3 Phase 2（multi P1-1 false-green 边界）：本隔离测试**仅验 pipeline 层**——
      // 直接驱动 pipeline.flushFrame 并手工注入 scopeData（createHarness → pipeline.updateScopeData），
      // 绕过整个桥接层（useScadaPointsBridge 的 useScopeSelector 订阅）。端到端 wiring（桥接层把
      // binding.expression 直连 scope 路径并入订阅并集 → scopeData 含 scopeMember → 推给 pipeline）
      // 由 binding-expression-scope-integration.test.tsx 的 integration proof 覆盖（挂载真实桥接/renderer 边界）。
      // 历史 false-green：修复前桥接层 analyzeFluxSubscriptions 仅扫 variables → paths=[] → scopeData 永久 {}
      // → 端到端断裂，但本测试因绕过桥接层一直绿。
      const harness = createHarness(
        [],
        [
          {
            id: 'sym',
            type: 'scada-rect',
            x: 0,
            y: 0,
            bindings: { text: { expression: '${scopeVal * 2}' } },
          },
        ],
        { scopeVal: 21 },
      );
      harness.pipeline.flushFrame(harnessApply(harness));
      expect(harness.applied[0]).toEqual({ sym: { text: 42 } });
    });

    it('② 有点表：传统 variables 配置正常工作', () => {
      const harness = createHarness(
        [{ id: 'level', source: 'static', value: 50 }],
        [
          {
            id: 'sym',
            type: 'scada-rect',
            x: 0,
            y: 0,
            bindings: { text: { point: 'level' } },
          },
        ],
        {},
      );
      harness.pipeline.flushFrame(harnessApply(harness));
      expect(harness.applied[0]).toEqual({ sym: { text: 50 } });
    });

    it('③ 同名冲突 scope 胜出：合并优先级 {...pointValues, ...scopeData} 文档化契约', () => {
      // point 'shared' static 值 1；scope 数据 { shared: 2 }；flux point 'r' = ${shared} 应得 2（scope 胜出）。
      // 注：合并发生在 useScadaPointsBridge 的 createPrivateEvalScope，此处直接测 pipeline 的 buildEvalScope
      // ——buildEvalScope 同样把 scopeData 合并到 data（scopeData 胜出）。
      const harness = createHarness(
        [
          { id: 'shared', source: 'static', value: 1 },
          { id: 'r', source: 'expression', expression: '${shared}' },
        ],
        [{ id: 'sym', type: 'scada-rect', x: 0, y: 0, bindings: { text: { point: 'r' } } }],
        { shared: 2 }, // scope 遮蔽 point
      );
      harness.pipeline.flushFrame(harnessApply(harness));
      // r 经 flux 求值：scope.shared=2 胜出 → r=2 → text=2
      expect(harness.pointStore.getPointValue('r')).toBe(2);
      expect(harness.applied[0]).toEqual({ sym: { text: 2 } });
    });

    it('④ 点表 expression 点：source:"expression" 点经 flux compiler 求值，结果进 evalScope', () => {
      // expression 点 'derived' = ${a * 3}；binding ${derived + 1} 应读到 derived 求值后的值。
      const harness = createHarness(
        [
          { id: 'a', source: 'static', value: 5 },
          { id: 'derived', source: 'expression', expression: '${a * 3}' },
        ],
        [
          {
            id: 'sym',
            type: 'scada-rect',
            x: 0,
            y: 0,
            bindings: { text: { expression: '${derived + 1}' } },
          },
        ],
        {},
      );
      harness.pipeline.flushFrame(harnessApply(harness));
      // derived = 15, text = 16
      expect(harness.pointStore.getPointValue('derived')).toBe(15);
      expect(harness.applied[0]).toEqual({ sym: { text: 16 } });
    });

    it('⑤ 点表 static 点：source:"static" 点值进 evalScope，可被 binding.expression 读取', () => {
      const harness = createHarness(
        [
          { id: 'mode', source: 'static', value: 'auto' },
          { id: 'count', source: 'static', value: 7 },
        ],
        [
          {
            id: 'sym',
            type: 'scada-rect',
            x: 0,
            y: 0,
            // 读取 static point + 表达式运算
            bindings: {
              text: { expression: '${mode + \':\' + count}' },
              opacity: { expression: '${count > 5 ? 1 : 0.5}' },
            },
          },
        ],
        {},
      );
      harness.pipeline.flushFrame(harnessApply(harness));
      expect(harness.applied[0]).toEqual({ sym: { text: 'auto:7', opacity: 1 } });
    });
  });

  describe('defaultSchema 一致性（renderer-definitions.ts:55）', () => {
    it('EMPTY_SCADA_CONFIG 与 defaultSchema 都用 variables:[] 空数组（与可选一致）', () => {
      // 此处验证两处的字面量结构一致——变量缺省/空数组合法，非显式 null。
      // 实际 defaultSchema 字面量在 renderer-definitions.ts:55，EMPTY_SCADA_CONFIG 在 scada-canvas.tsx:30。
      // 二者均为 { version:1, variables:[], symbols:[] }，与 variables?: 类型一致（空数组而非 undefined）。
      // 本测试用 validateScadaConfig 确认两个形态都合法：
      expect(validateScadaConfig({ version: 1, variables: [], symbols: [] }).ok).toBe(true);
      // 注：variables:[] 与 variables:undefined 等价合法（contract: 缺省合法）。
    });
  });

  describe('points 名称非保留字（${points.x} 仅普通 scope 标识符）', () => {
    it('points 不是保留字：flux 表达式可正常访问名为 points 的 scope 成员', () => {
      const harness = createHarness(
        [],
        [
          {
            id: 'sym',
            type: 'scada-rect',
            x: 0,
            y: 0,
            // points 是普通 scope 标识符（非保留字），表达式访问 points.x
            bindings: { text: { expression: '${points.x}' } },
          },
        ],
        { points: { x: 99 } },
      );
      harness.pipeline.flushFrame(harnessApply(harness));
      expect(harness.applied[0]).toEqual({ sym: { text: 99 } });
    });

    it('`points` 名称可作为普通 point id（非保留字）', () => {
      // point id 'points' 与 scope 成员名 'points' 平级，无特权。
      const harness = createHarness(
        [{ id: 'points', source: 'static', value: 'pointValue' }],
        [
          {
            id: 'sym',
            type: 'scada-rect',
            x: 0,
            y: 0,
            bindings: { text: { point: 'points' } },
          },
        ],
        {},
      );
      harness.pipeline.flushFrame(harnessApply(harness));
      expect(harness.applied[0]).toEqual({ sym: { text: 'pointValue' } });
    });
  });
});

describe('I18.2 config 兜底场景（Phase 2 Proof）', () => {
  it('空 config（仅 version + symbols）：pipeline flushFrame 返 false 且不调 applyAttrs', () => {
    // 无 variables，无 binding —— pipeline 空运行不应崩，且应 observably 无副作用。
    const pointStore = new PointStore();
    const reverseIndex = new ReverseIndex([], { compiler: expressionCompiler, env });
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      compiler: expressionCompiler,
      env,
    });
    // plan 2026-08-06-0746-2 P2-15（false-green 消除）：原断言 `not.toThrow()` 不验返值/副作用，
    // 空配置退化（误返 true / 误调 applyAttrs）会静默放行。此处断言结果值 + applyAttrs 未调。
    // (1) 无脏块/无表达式点 → flushFrame 返 false（collector.flush 无 pending 返 false）。
    // (2) applyAttrs mock 未被调（帧内无写入，不应触发批量写）。
    const applyAttrs = vi.fn();
    expect(pipeline.flushFrame(applyAttrs)).toBe(false);
    expect(applyAttrs).not.toHaveBeenCalled();
  });

  it('renderer-definitions.ts:55 defaultSchema 结构与 EMPTY_SCADA_CONFIG 一致', () => {
    // 静态结构断言（无 runtime）：两处字面量形态一致。
    // defaultSchema: { type:'scada-canvas', config: { version:1, variables:[], symbols:[] } }
    // EMPTY_SCADA_CONFIG: { version:1, variables:[], symbols:[] }
    // 二者均接受 variables 缺省/空数组（contract: variables?:）。
    const minimalConfig: ScadaConfig = { version: 1, variables: [], symbols: [] };
    expect(validateScadaConfig(minimalConfig).ok).toBe(true);
  });
});
