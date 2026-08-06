import { describe, it, expect, vi } from 'vitest';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createDefaultEnv } from '@nop-chaos/flux-react';
import { PointStore } from './point-store.js';
import { ReverseIndex } from './reverse-index.js';
import { DirtyCollector, RefreshPipeline, findCircularDependencyError, CircularDependencyError } from './dirty-collector.js';
import { collectBindingPointIds } from './reverse-index.js';
import { extractExpressionDepsViaProbe } from './flux-eval.js';
import type { ApplyAttrs } from './dirty-collector.js';
import type { ExpressionCompiler, RendererEnv } from '@nop-chaos/flux-core';

/**
 * I18 表达式一元化 failing-first Proof（plan 2026-08-05-2129-1 Phase 1）。
 *
 * 守护契约：
 * 1. `binding.expression: '${a + b}'` 经 flux compiler 求值产出正确值（绑定层与点声明面同源）。
 * 2. 点值变化经 generation 失效重算（driven by bridge `setPointValues` → drainDirtyPointIds）。
 * 3. 环检测守卫仍触发（binding-cycle Failure Path：受影响点保持上一有效值 + onError 上报）。
 * 4. 旧 `@{pointId}` 方言不被识别——`${...}` 是唯一入口，`@{a}` 经 normalize 后视为未知标识符
 *    `@{a}`（identifier 含 `{`/`}` 字符 → 表达式按 unknown 处理；编译失败或求值 undefined）。
 *
 * 实施 Strategy：必须自动化（表达式语法为组态公共契约）。
 */
const expressionCompiler = createExpressionCompiler(createFormulaCompiler());
const env = createDefaultEnv();
const evalContext = { compiler: expressionCompiler, env };

interface PipelineHarness {
  pointStore: PointStore;
  collector: DirtyCollector;
  pipeline: RefreshPipeline;
  applied: Array<Record<string, Record<string, unknown>>>;
}

function createHarness(options?: {
  declarations?: Parameters<PointStore['loadDeclarations']>[0];
  symbols?: ConstructorParameters<typeof ReverseIndex>[0];
  onError?: (code: string, message: string, error?: unknown) => void;
}): PipelineHarness {
  const pointStore = new PointStore();
  pointStore.loadDeclarations(
    options?.declarations ?? [
      { id: 'a', source: 'static', value: 10 },
      { id: 'b', source: 'static', value: 5 },
    ],
  );
  const reverseIndex = new ReverseIndex(
    options?.symbols ?? [
      {
        id: 'sym',
        type: 'scada-rect',
        x: 0,
        y: 0,
        bindings: { text: { expression: '${a + b}' } },
      },
    ],
    evalContext,
  );
  const collector = new DirtyCollector({ scheduleTick: () => () => {} });
  const applied: Array<Record<string, Record<string, unknown>>> = [];
  const pipeline = new RefreshPipeline({
    pointStore,
    reverseIndex,
    collector,
    compiler: expressionCompiler,
    env,
    onError: options?.onError,
  });
  return { pointStore, collector, pipeline, applied };
}

const harnessApply = (harness: PipelineHarness): ApplyAttrs => (attrs) => {
  harness.applied.push(attrs as Record<string, Record<string, unknown>>);
};

describe('I18 表达式一元化 failing-first Proof (binding-expression-unification)', () => {
  it('binding.expression ${a + b} 经 flux compiler 求值产出正确值（绑定层与点声明面同源）', () => {
    const harness = createHarness();
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied[0]).toEqual({ sym: { text: 15 } });
  });

  it('点值变化经 generation 失效重算（dirty point → 绑定重算）', () => {
    const harness = createHarness();
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied[0]).toEqual({ sym: { text: 15 } });

    harness.applied.length = 0;
    harness.pointStore.setPointValue('a', 20);
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied[0]).toEqual({ sym: { text: 25 } });
  });

  it('环检测守卫触发：binding-cycle 受影响点保持上一有效值 + onError 上报 circular dependency', () => {
    const onError = vi.fn();
    const harness = createHarness({
      declarations: [
        { id: 'a', source: 'expression', expression: '${b * 2}', init: 1 },
        { id: 'b', source: 'expression', expression: '${a + 1}', init: 1 },
      ],
      symbols: [
        { id: 'sym', type: 'scada-rect', x: 0, y: 0, bindings: { text: { point: 'a' } } },
      ],
      onError,
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    const circular = onError.mock.calls.filter((call) => String(call[1]).includes('circular dependency'));
    expect(circular.length).toBeGreaterThan(0);
    // init 值保留（受影响点保持上一有效值——这里 init=1 是初始值，未被环错误覆盖）
    expect(harness.pointStore.getPointValue('a')).toBe(1);
  });

  it('旧 @{pointId} 方言不被识别（${expr} 是唯一入口，@{a} 视为未知标识符）', () => {
    // `@{a}` 经 normalize 成 `${@{a}}` —— flux-formula 编译时把 `@{a}` 解析为标识符
    // （含 `{`/`}` 字符）。表达式不会解析为对 `a` 的引用，绑定求值得 undefined。
    // 反向索引不应收集到 'a' 作为依赖。
    const refs = collectBindingPointIds({ expression: '@{a}' }, evalContext);
    expect(refs).not.toContain('a');
  });

  it('CircularDependencyError + findCircularDependencyError 守卫（cause 链解包）', () => {
    const err = new CircularDependencyError('xyz');
    expect(err.message).toBe('circular dependency involving point: xyz');
    expect(findCircularDependencyError(err)).toBe(err);
    // wrapped 一层
    const wrapped = new Error('Expression evaluation failed for: ${x}', { cause: err });
    expect(findCircularDependencyError(wrapped)).toBe(err);
    // wrapped 两层（模拟多层嵌套求值）
    const doubleWrapped = new Error('outer', { cause: wrapped });
    expect(findCircularDependencyError(doubleWrapped)).toBe(err);
    // 无关错误
    expect(findCircularDependencyError(new Error('not cycle'))).toBeUndefined();
    expect(findCircularDependencyError(undefined)).toBeUndefined();
  });

  it('binding.expression 经 flux compiler 求值复杂表达式（条件运算）', () => {
    const harness = createHarness({
      declarations: [
        { id: 'level', source: 'static', value: 60 },
      ],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { fill: { expression: "${level > 50 ? '#f00' : '#0f0'}" } },
        },
      ],
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied[0]).toEqual({ sym: { fill: '#f00' } });
  });

  it('scale.expression 经 flux compiler 求值（绑定 scale 表达式）', () => {
    const harness = createHarness({
      declarations: [{ id: 'speed', source: 'static', value: 100 }],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { point: 'speed', scale: { expression: '${speed * 0.5}' } } },
        },
      ],
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied[0]).toEqual({ sym: { text: 50 } });
  });

  it('binding.expression 与点声明面同源（共享 flux compiler + 私有求值 scope）', () => {
    // 同一个 pipeline 实例既求值 source:'expression' 点（声明面）也求值 binding.expression（绑定面）。
    // 二者读同一个 eval scope（pointValues + scopeData 合并，scope 胜出）。
    const harness = createHarness({
      declarations: [
        { id: 'a', source: 'static', value: 10 },
        { id: 'derived', source: 'expression', expression: '${a * 3}' },
      ],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { point: 'derived' } },
        },
      ],
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    // derived = a * 3 = 30
    expect(harness.applied[0]).toEqual({ sym: { text: 30 } });
    expect(harness.pointStore.getPointValue('derived')).toBe(30);
  });

  it('scope 数据经 pipeline.updateScopeData 注入 binding.expression 求值（直连 scope 绑定）', () => {
    // 无点表直连：binding.expression 直接读 scope 数据。
    const harness = createHarness({
      declarations: [],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { expression: '${scopeVal * 2}' } },
        },
      ],
    });
    // 注入 scope 数据
    harness.pipeline.updateScopeData({ scopeVal: 21 });
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied[0]).toEqual({ sym: { text: 42 } });
  });

  it('binding.expression 求值期 circular dependency 经 evaluateBindingExpression catch 上报（Phase 1 覆盖）', () => {
    // binding.expression 引用 expression 点 a，a 表达式与 b 形成环。evaluateBindingExpression
    // 经 evaluateFlux → buildEvalScope → scope.get('a') → 触发 a 求值 → 检测环 → CircularDependencyError
    // 经 findCircularDependencyError 解包后重新抛出 → evaluateBindingExpression catch 捕获 → reportError。
    const onError = vi.fn();
    const harness = createHarness({
      declarations: [
        { id: 'a', source: 'expression', expression: '${b * 2}', init: 1 },
        { id: 'b', source: 'expression', expression: '${a + 1}', init: 1 },
      ],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { expression: '${a * 10}' } },
        },
      ],
      onError,
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    // 环错误经 evaluateBindingExpression catch 上报（消息含 'circular dependency'）
    const cycleErrors = onError.mock.calls.filter((c) => String(c[1]).includes('circular dependency'));
    expect(cycleErrors.length).toBeGreaterThan(0);
  });

  it('binding.expression 编译失败（normalize 后畸形表达式）→ 上报 expression evaluation failed', () => {
    // `${ghost.foo}` 编译成功但 evaluate 抛成员访问 undefined → 上报。
    const onError = vi.fn();
    const harness = createHarness({
      declarations: [],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { fill: { expression: '${unknownRef.foo}' } },
        },
      ],
      onError,
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    // binding.expression 求值失败上报（key 为表达式文本；去重保证只一次）
    const evalErrors = onError.mock.calls.filter((c) => c[0] === 'flux-evaluate-failed' && String(c[1]).includes('expression evaluation failed'));
    expect(evalErrors.length).toBeGreaterThan(0);
  });

  it('expression-evaluator.ts 已删除（Phase 1 Exit Criteria）：经动态 import 探测路径不存在', async () => {
    // I18 收敛：旧 @{pointId} 方言 evaluator 已从仓库 src/ 删除。
    // 用动态字符串变量做 dynamic import，使 TS 不做静态模块解析（避免 typecheck 报 TS2307）。
    // 文件不存在时 import 抛错（fail-fast 守护：若有人恢复 evaluator 文件，本测试会变红）。
    const path = './expression-evaluator.js';
    await expect((async () => await import(/* @vite-ignore */ path))()).rejects.toBeDefined();
  });

  it('extractExpressionDepsViaProbe discriminated result: compile/createState/evaluate 失败分类（flux-eval.ts 覆盖）', () => {
    // 真实 compiler：复杂表达式 probe 成功（paths 非空）。
    const result = extractExpressionDepsViaProbe(expressionCompiler, env, '${a + b}');
    expect(result.status).toBe('ok');
    expect(result.status === 'ok' && result.paths.length).toBeGreaterThan(0);

    // mock compiler：createState 抛 → 'create-state-failed'
    const createStateThrowing = {
      compileValue: () => ({ kind: 'dynamic' }),
      createState: () => {
        throw new Error('createState boom');
      },
    } as unknown as ExpressionCompiler;
    const createResult = extractExpressionDepsViaProbe(createStateThrowing, env as RendererEnv, '${a + b}');
    expect(createResult.status).toBe('create-state-failed');

    // mock compiler：evaluateWithState 抛 → 'evaluate-failed'
    const evaluateThrowing = {
      compileValue: () => ({ kind: 'dynamic' }),
      createState: () => ({ root: { kind: 'leaf-state' } }),
      evaluateWithState: () => {
        throw new Error('evaluate boom');
      },
    } as unknown as ExpressionCompiler;
    const evalResult = extractExpressionDepsViaProbe(evaluateThrowing, env as RendererEnv, '${a + b}');
    expect(evalResult.status).toBe('evaluate-failed');

    // mock compiler：compileValue 抛 → 'compile-failed'
    const compileThrowing = {
      compileValue: () => {
        throw new Error('compile boom');
      },
    } as unknown as ExpressionCompiler;
    const compileResult = extractExpressionDepsViaProbe(compileThrowing, env as RendererEnv, '${a + b}');
    expect(compileResult.status).toBe('compile-failed');
  });

  it('evaluateFlux compileValue 失败兜底（dirty-collector.ts 覆盖：非 cycle 异常返 undefined）', () => {
    // mock compiler：compileValue 抛非 cycle 异常 → evaluateFlux catch 吞为 undefined → 上报 'expression evaluation failed'。
    const onError = vi.fn();
    const compileThrowing = {
      compileValue: () => {
        throw new Error('compile boom');
      },
    } as unknown as ExpressionCompiler;
    const pointStore = new PointStore();
    pointStore.loadDeclarations([{ id: 'e', source: 'expression', expression: '${x}' }]);
    const reverseIndex = new ReverseIndex(
      [{ id: 'sym', type: 'scada-rect', x: 0, y: 0, bindings: { fill: { point: 'e' } } }],
      evalContext,
    );
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      compiler: compileThrowing,
      env,
      onError,
    });
    pipeline.flushFrame(() => undefined);
    // plan 2026-08-05-2129-3 Phase 3：compileValue 抛 → compile-failed → flux-compile-failed（对称码）。
    const evalErrors = onError.mock.calls.filter((c) => c[0] === 'flux-compile-failed' && String(c[1]).includes('expression compilation failed'));
    expect(evalErrors.length).toBeGreaterThan(0);
  });

  it('findCircularDependencyError 边界（非对象 / depth 上限 / cause 自环）', () => {
    expect(findCircularDependencyError('string error')).toBeUndefined();
    expect(findCircularDependencyError(42)).toBeUndefined();
    expect(findCircularDependencyError(null)).toBeUndefined();
    // cause 自环：手动构造（不应触发无限循环）
    const selfRef = { message: 'x' } as unknown as { cause: unknown };
    selfRef.cause = selfRef;
    expect(findCircularDependencyError(selfRef)).toBeUndefined();
  });

  it('buildEvalScope materializeVisible 经表达式触发（ownKeys trap → materialize）', () => {
    // 表达式访问 scope root（object iteration）→ 触发 ownKeys/getOwnPropertyDescriptor trap →
    // context.materialize() → scope.materializeVisible() 覆盖 buildEvalScope 的 readOwn/readVisible/materializeVisible。
    const harness = createHarness({
      declarations: [
        { id: 'a', source: 'static', value: 5 },
        { id: 'b', source: 'static', value: 7 },
      ],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { expression: '${a + b}' } },
        },
      ],
    });
    // 单独验证 getResolver（不依赖表达式求值）
    expect(harness.pipeline.getResolver()).toBeDefined();
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.applied[0]).toEqual({ sym: { text: 12 } });
  });

  it('pipeline 无 compiler/env：表达式面不工作（仅点表绑定，binding.expression 返 undefined）', () => {
    // 覆盖 line 385, 411, 428（无 compiler/env 时 evaluateFlux/evaluateBindingExpression/probeDeps 早退）
    const pointStore = new PointStore();
    pointStore.loadDeclarations([
      { id: 'a', source: 'static', value: 10 },
      { id: 'e', source: 'expression', expression: '${a * 2}' },
    ]);
    // reverseIndex 用 evalContext 构建（让 binding.expression '${a}' 提取出 'a' 作为 ref），
    // 这样 collectBindings(['a']) 会找到 binding 并经 resolver.evaluate → evaluateBindingExpression
    // （line 411 无 compiler 早退返 undefined）。
    const reverseIndex = new ReverseIndex(
      [{ id: 'sym', type: 'scada-rect', x: 0, y: 0, bindings: { text: { expression: '${a}' } } }],
      evalContext,
    );
    const collector = new DirtyCollector({ scheduleTick: () => () => {} });
    const applied: Array<Record<string, Record<string, unknown>>> = [];
    const pipeline = new RefreshPipeline({
      pointStore,
      reverseIndex,
      collector,
      // 故意不传 compiler/env —— 模拟无表达式面（向后兼容）
    });
    pipeline.flushFrame((attrs) => applied.push(attrs as Record<string, Record<string, unknown>>));
    // 表达式点 e 无 compiler 不求值；binding.expression 也无 compiler 不求值 → applied 为空
    expect(applied).toHaveLength(0);
  });

  it('binding.expression 求值产出非 primitive（如 string concat）→ isScadaPrimitive 覆盖', () => {
    // string 是 primitive；测一个产生 string 的表达式（验证 isScadaPrimitive true 分支）。
    // 然后注入 object scope 数据 → binding 表达式产生 object → isScadaPrimitive false 分支（line 401）。
    const harness = createHarness({
      declarations: [],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          // 直接读 scope 的 obj → 产生 object → 非 primitive
          bindings: { fill: { expression: '${objVal}' } },
        },
      ],
    });
    harness.pipeline.updateScopeData({ objVal: { color: 'red' } });
    harness.pipeline.flushFrame(harnessApply(harness));
    // object 不是 primitive → binding 不应用（保持默认）
    expect(harness.applied).toHaveLength(0);
  });

  it('pipeline.updateScopeData 跳过 undefined 值（line 448 false branch）', () => {
    const harness = createHarness({
      declarations: [{ id: 'a', source: 'static', value: 5 }],
      symbols: [
        {
          id: 'sym',
          type: 'scada-rect',
          x: 0,
          y: 0,
          bindings: { text: { expression: '${a}' } },
        },
      ],
    });
    // 注入含 undefined 的 scope data —— undefined 不应进入 eval scope
    harness.pipeline.updateScopeData({ junk: undefined, a: 7 });
    harness.pipeline.flushFrame(harnessApply(harness));
    // a 在 scope 中（值 7）遮蔽 point 'a'（值 5）→ text = 7
    expect(harness.applied[0]).toEqual({ sym: { text: 7 } });
  });

  it('bare expression（无 ${} 前缀）经 evaluateFlux/probeDeps 自动 wrap（line 386/429 false branch）', () => {
    // 表达式点直接传 `a + b`（无 ${} 前缀），evaluateFlux normalize 为 `${a + b}` 求值。
    // 同样 probeDeps（用于 lastDeps 收集）也走 normalize false 分支。
    const harness = createHarness({
      declarations: [
        { id: 'a', source: 'static', value: 3 },
        { id: 'b', source: 'static', value: 4 },
        { id: 'sum', source: 'expression', expression: 'a + b' },
      ],
      symbols: [
        { id: 'sym', type: 'scada-rect', x: 0, y: 0, bindings: { text: { point: 'sum' } } },
      ],
    });
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.pointStore.getPointValue('sum')).toBe(7);
    expect(harness.applied[0]).toEqual({ sym: { text: 7 } });
  });

  it('expression 声明无 expression 字段（`?? ""` 兜底，line 342/372 false branch）', () => {
    // 声明 source='expression' 但 expression 字段缺省 → state.declaration.expression ?? '' 兜底空串。
    // 空串经 normalize 为 `${}` → flux-formula 视为 static 字面量（值 '${}'）→ isScadaPrimitive 真 → 写入。
    const onError = vi.fn();
    const harness = createHarness({
      declarations: [
        { id: 'a', source: 'static', value: 1 },
        // 缺省 expression 字段（声明形态合法但语义无意义；?? '' 兜底）
        { id: 'blank', source: 'expression' as unknown as 'expression', init: 0 } as never,
      ],
      symbols: [],
      onError,
    });
    // 仅触发 syncExpressionPoint('blank') 即可覆盖 ?? 兜底分支（不写入 meaningful 值也无妨）。
    harness.pipeline.flushFrame(harnessApply(harness));
    expect(harness.pointStore.getPointValue('a')).toBe(1);
    // plan 2026-08-06-0746-2 P2-13（false-green 消除）：原断言仅验无关点 'a'，从未断言 'blank'。
    // 此处断言 `?? ''` 兜底经 flux 求值的实际产出——空串 '' normalize 为 `${}`，
    // flux-formula 把 `${}` 视作 static 字面量，求值结果为字面串 '${}' 并写入 store。
    // 守护：若移除 `?? ''` 兜底（expression 变 undefined），evaluateFlux(undefined.trim()) 抛
    // TypeError → catch 上报 flux-evaluate-failed → 'blank' 保持 init 值 0 ≠ '${}'，本断言转红。
    expect(harness.pointStore.getPointValue('blank')).toBe('${}');
    // 兜底分支正常求值（非 undefined），不应触发求值失败上报。
    expect(onError).not.toHaveBeenCalled();
  });
});

/**
 * plan 2026-08-06-0746-3 Phase 2（multi P2-6）failing-first Proof：findCircularDependencyError
 * cause-chain 深度上限。
 *
 * 关键（修复前转红 → 修复后转绿）：旧上限硬编码 `10`，对 10+ 层 expression chain（工业过程管线现实场景，
 * 如 `${a}` → `${b}` → ... → `${k}` 经多层嵌套求值叠加多层 `Error('Expression evaluation failed for: ...')`
 * 包装）的 cycle 会误判为 generic eval 失败（返 undefined → 上游上报 `flux-evaluate-failed` 而非
 * `circular dependency`，host 无法区分真 cycle vs runtime TypeError）。提高上限（~1000，保留 cause===current/
 * undefined break 守卫防无限循环）后深链 cycle 被正确识别。
 */
describe('findCircularDependencyError cause-chain depth cap (plan 2026-08-06-0746-3 Phase 2, multi P2-6)', () => {
  /** 构造 N 层 wrapper（外→内）包裹原始 CircularDependencyError，模拟多层嵌套求值的包装叠加。 */
  const wrapChain = (original: unknown, wrappers: number): unknown => {
    let chain: unknown = original;
    for (let i = 0; i < wrappers; i++) {
      chain = new Error(`Expression evaluation failed for: wrap-${i}`, { cause: chain });
    }
    return chain;
  };

  it('识别 ≥12 层 expression chain 的 cycle（修复前上限 10 转红，提至 ~1000 后转绿）', () => {
    const original = new CircularDependencyError('deep-pipeline-cycle');
    const chain = wrapChain(original, 12);
    // 12 层 wrapper → CircularDependencyError 在 depth 12。旧上限 10 时 loop 在 depth=10 退出 → undefined（红）；
    // 提至 ~1000 后 depth 12 < 1000 → 命中 instanceof 返回原实例（绿）。
    const found = findCircularDependencyError(chain);
    expect(found).toBe(original);
    expect(found?.message).toBe('circular dependency involving point: deep-pipeline-cycle');
  });

  it('更深的 chain（50 层）仍识别（覆盖工业过程管线超长链现实场景）', () => {
    const original = new CircularDependencyError('very-deep');
    const chain = wrapChain(original, 50);
    expect(findCircularDependencyError(chain)).toBe(original);
  });

  it('浅链（≤10 层）cycle 识别不回归（防上限调整误伤浅链）', () => {
    // 5 层 wrapper——旧/新上限下都应识别（回归守护）。
    const original = new CircularDependencyError('shallow');
    const chain = wrapChain(original, 5);
    expect(findCircularDependencyError(chain)).toBe(original);
  });

  it('自环 cause===current 守卫保留（防无限循环，即使上限提高）', () => {
    // cause 自环：手动构造对象 cause 指向自身。即使 depth 上限提高，`cause === current` break 守卫
    // 必须阻止无限循环。非 CircularDependencyError → 返 undefined。
    const selfRef = { message: 'self loop' } as unknown as { cause: unknown };
    selfRef.cause = selfRef;
    expect(findCircularDependencyError(selfRef)).toBeUndefined();
  });

  it('无 cause 链的普通 error 仍返 undefined（上限提高不引入误报）', () => {
    expect(findCircularDependencyError(new Error('plain runtime TypeError'))).toBeUndefined();
  });
});
