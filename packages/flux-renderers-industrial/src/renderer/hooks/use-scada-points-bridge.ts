import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  type ExpressionCompiler,
  type RendererEnv,
} from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';
import type { ScadaConfig, ScadaPrimitive, ScadaSymbolNode } from '../../serialization/config-types.js';
import { PointStore } from '../../binding/point-store.js';
import {
  createPrivateEvalScope,
  extractExpressionDepsViaProbe,
  isScadaPrimitive,
  probeExpressionPaths,
  type ExpressionDepsProbeResult,
  type FluxEvalContext,
} from '../../binding/flux-eval.js';
import { errorMessage } from '../scada-errors.js';
import { RefreshPipeline, type ApplyAttrs } from '../../binding/dirty-collector.js';

/**
 * 复杂表达式经平台依赖收集产出订阅路径：compile + probe 求值 + 读
 * `state.root.dependencies.paths`。详见 `binding/flux-eval.ts`（I18 表达式一元化提取）。
 */
export { extractExpressionDepsViaProbe, type ExpressionDepsProbeResult };

export interface ExtractFluxScopePathsOptions {
  compiler?: ExpressionCompiler;
  env?: RendererEnv;
}

/**
 * 复杂表达式候选是否「demonstrably reads scope」（plan 2026-08-05-0325-1）：
 * 含标识符（`[a-zA-Z_][a-zA-Z0-9_]*`）即为真，排除纯字面量/纯运算符 `${1 + 2}`。
 * 启发式限制：仅判标识符存在，含全局名（如 `Math.PI`）的复杂表达式会判真——属可接受的
 * best-effort 一次性诊断（不扩平台 collector 能力，仅 surface 静默 disable 嫌疑）。
 */
export function expressionReadsScope(candidate: string): boolean {
  return /[a-zA-Z_][a-zA-Z0-9_]*/.test(candidate);
}

export interface AnalyzeFluxSubscriptionsResult {
  paths: string[];
  /** 复杂表达式片段（normalize 后 `${...}`）：读取 scope 但平台 collector 返空 deps 的嫌疑表达式。 */
  depsEmptyExpressions: string[];
}

/**
 * config 扫描 → 订阅路径集 + deps-empty 嫌疑表达式集（plan 2026-08-05-0325-1）。
 *
 * I18 表达式一元化（plan 2026-08-05-2129-1 Phase 3）：仅认 `${expr}` 平台语法。`$xxx` 简写与
 * 裸路径分支移除——`analyzeFluxSubscriptions` 仅扫描 `${...}` 入口，复杂表达式分支复用
 * `extractExpressionDepsViaProbe`：probe 返 `[]` 且 `expressionReadsScope` 为真时把表达式片段入
 * `depsEmptyExpressions`（供桥接层一次性上报 `flux-deps-empty`）。
 */
export function analyzeFluxSubscriptions(
  config: ScadaConfig,
  options?: ExtractFluxScopePathsOptions,
): AnalyzeFluxSubscriptionsResult {
  const paths = new Set<string>();
  const depsEmptyExpressions: string[] = [];
  const compiler = options?.compiler;
  const env = options?.env;
  for (const decl of config.variables ?? []) {
    if (decl.source !== 'flux' || typeof decl.flux !== 'string') continue;
    const source = decl.flux.trim();
    // I18：仅认 `${expr}` 入口。`$xxx` 简写不再支持（迁移至 `${xxx}`）。
    const direct = /^\$\{([^{}]+)\}$/.exec(source);
    if (!direct) {
      // 非 `${...}` 形态：经 normalizeFluxExpression 兜底为 `${<source>}`，再走平台依赖收集。
      // 这覆盖 bare-path（如 `analog.temp`）与未包裹表达式（如 `a + b`）。
      const wrapped = normalizeFluxExpression(source);
      if (compiler && env) {
        collectComplexExpressionDeps(compiler, env, wrapped, paths, depsEmptyExpressions);
      }
      continue;
    }
    const candidate = direct[1].trim();
    if (/^[a-zA-Z_][a-zA-Z0-9_.-]*$/.test(candidate)) {
      paths.add(candidate);
      continue;
    }
    // 复杂表达式（含运算符/函数调用）→ 平台依赖收集（仅当 compiler/env 提供）
    if (compiler && env) {
      collectComplexExpressionDeps(compiler, env, source, paths, depsEmptyExpressions);
    }
  }
  return { paths: [...paths].sort(), depsEmptyExpressions };
}

/**
 * binding.expression 直连 scope 订阅路径收集（plan 2026-08-05-2129-3 Phase 2，multi P1-1）。
 *
 * `analyzeFluxSubscriptions` 仅扫描 `config.variables`（flux 点声明）；当 `variables:[]` 但图元
 * `bindings[].expression` 直连 scope 成员（如 `${scopeVal * 2}`）时，桥接层 `useScopeSelector` 的 paths
 * 为空 → `enabled:false` + `fallback:{}` → `scopeData` 永久 `{}` → binding.expression 经 `evalScope` 求值
 * 读 scope 成员得 undefined → NaN（契约 ①「无点表直连 scope」端到端断裂）。
 *
 * 本 helper 扫描 `config.symbols[].bindings[].expression`（含嵌套 children，与 `ReverseIndex.addSymbol`
 * 同序递归），经 `probeExpressionPaths` 提取 scope 路径（与 `collectBindingPointIds` 表达式分支同源），
 * 仅供桥接层并入 `useScopeSelector` paths 并集。仅取 `binding.expression` 派生路径（不含 `binding.point`
 * 真实点 id）——避免把点 id 当 scope 路径订阅造成 scope 遮蔽点的语义噪音。无 compiler/env 时返空
 * （与 `analyzeFluxSubscriptions` 复杂表达式分支退化一致）。reverseIndex 在 config reload（effect）时
 * 重建滞后于 render，故桥接层在 render 期直接扫描 config（不读 reverseIndex）以保证时序正确。
 */
export function collectBindingExpressionScopePaths(
  config: ScadaConfig,
  options?: ExtractFluxScopePathsOptions,
): string[] {
  if (!options?.compiler || !options?.env) return [];
  const context: FluxEvalContext = { compiler: options.compiler, env: options.env };
  // 声明点 id 集：binding.expression 中的 bareword 若匹配某声明点 id，则它是点引用（经 pipeline
  // evalScope 的 pointValues 解析），不是 scope 成员——排除以免 (a) 把点 id 当 scope 路径订阅造成
  // scopeData 含该 id 的 undefined 遮蔽点值（merge `{...pointValues, ...scopeData}` scope 胜出），
  // (b) 无意义的过订阅噪音。仅保留非点 id 的标识符（真正的直连 scope 成员）。
  const pointIds = new Set((config.variables ?? []).map((decl) => decl.id));
  const paths = new Set<string>();
  const walk = (node: ScadaSymbolNode): void => {
    const bindings = node.bindings;
    if (bindings) {
      for (const binding of Object.values(bindings)) {
        if (binding.expression) {
          for (const path of probeExpressionPaths(binding.expression, context)) {
            if (path && path !== '*' && !pointIds.has(path)) paths.add(path);
          }
        }
      }
    }
    for (const child of node.children ?? []) walk(child);
  };
  for (const symbol of config.symbols ?? []) walk(symbol);
  return [...paths];
}

/** 复杂表达式经平台依赖收集产出订阅路径；deps-empty 入诊断集（plan 2026-08-05-0653-4 C4 discriminated result）。 */
function collectComplexExpressionDeps(
  compiler: ExpressionCompiler,
  env: RendererEnv,
  expression: string,
  paths: Set<string>,
  depsEmptyExpressions: string[],
): void {
  const result = extractExpressionDepsViaProbe(compiler, env, expression);
  if (result.status === 'ok') {
    for (const dep of result.paths) {
      if (dep !== '*' && dep.length > 0) paths.add(dep);
    }
  } else if (result.status === 'deps-empty') {
    // deps-empty 仅在表达式确实读 scope 时入诊断集（保留 expressionReadsScope 启发式：
    // 排除纯字面量/纯全局名表达式，避免 `${1+2}`/`${Math.PI}` 类误报）
    const inner = /^\$\{([^{}]+)\}$/.exec(expression)?.[1].trim() ?? expression;
    if (expressionReadsScope(inner)) {
      depsEmptyExpressions.push(expression);
    }
  }
  // compile-failed / create-state-failed / evaluate-failed → 跳过（bridge effect 真报覆盖）
}

/**
 * config 扫描 → 订阅路径集 → useScopeSelector paths 数组（精细化失效，漏订阅/过订阅由单测固化）。
 *
 * plan 2026-08-04-1558-2 Phase 3 WD-2：复杂表达式（`${analog.temp + 1}` 类）当 `compiler`/`env`
 * 选项提供时经平台依赖收集产出订阅路径；不提供时回退到纯路径扫描（仅识别 `${path}` 纯路径）。
 * plan 2026-08-05-0325-1：降为 `analyzeFluxSubscriptions` 的薄包装（仅返 `.paths`，保留既有签名/导出/测试）。
 * plan 2026-08-05-2129-1 Phase 3：`$xxx` 简写移除，仅认 `${expr}`。
 */
export function extractFluxScopePaths(
  config: ScadaConfig,
  options?: ExtractFluxScopePathsOptions,
): string[] {
  return analyzeFluxSubscriptions(config, options).paths;
}

/**
 * I18 表达式一元化（plan 2026-08-05-2129-1 Phase 3）：规范入口仅接受 `${` 开头。
 * `$xxx` 简写剥离/裸路径包裹分支移除——`$xxx` 视为未知标识符（求值 undefined，dollar-without-brace
 * Failure Path）；裸路径仍经 `${<path>}` 包裹以兼容（normalize 仅做兜底包裹，不做 `$` 剥离）。
 */
export function normalizeFluxExpression(flux: string): string {
  const trimmed = flux.trim();
  if (trimmed.startsWith('${')) return trimmed;
  return `\${${trimmed}}`;
}

/** `ScadaPrimitive` 类型守卫 + 私有求值 scope（I18 提取至 `binding/flux-eval.ts`）。 */
export { isScadaPrimitive, createPrivateEvalScope };

export interface ScadaPointsBridgeRuntime {
  pointStore: PointStore;
  pipeline: RefreshPipeline;
  applyAttrs: ApplyAttrs;
}

export interface UseScadaPointsBridgeArgs {
  config: ScadaConfig | undefined;
  runtime: ScadaPointsBridgeRuntime | null;
  enabled?: boolean;
  expressionCompiler: ExpressionCompiler;
  env: RendererEnv;
  /**
   * 诊断错误回调（非升级通道，§8.1）。
   *
   * plan 2026-08-05-0653-4 C3（multi-audit P2-4）：第三参 `error?` 透传原始 error 实例——
   * 旧签名 `(code, message)` 把 `error: unknown` 降为 `errorMessage(error)`（string），host 监控
   * 无法定位 formula evaluator 源。第三参可选 → 向后兼容现有 `(code, message)` / `()` 桩。
   * 参数序刻意保留 `(code, message, error?)` 而非 roadmap 建议的 `(code, error, message)`：
   * 维持现有 2-arg 桩位置稳定，仅追加 `error?`。
   */
  onError?: (code: string, message: string, error?: unknown) => void;
}

/**
 * 点表↔flux 桥接（I10.3，design-renderer.md §8.3/design-data-binding.md §9.1）：
 * useScopeSelector（paths 精细化失效）订阅 scope 数据流 → flux-formula 编译求值 →
 * PointStore.setPointValues 批量注入 → 刷新流水线合帧（不逐点 setState 直刷 React，性能红线）。
 * 错误降级（P1-8）：单声明编译/求值失败 → 跳过该声明（continue）+ lastError 式去重上报
 * （同表达式同错误码仅在变化时上报一次；该声明求值成功后清空去重记录，允许下次失败再报），
 * 不升级画布 status（scada-canvas 不把 onError 直通 handleError，§8.1 onError 仅限 config 错误）。
 *
 * plan 2026-08-04-1558-2 Phase 3：
 * - WD-2 复杂表达式（`${analog.temp + 1}` 类）订阅路径经平台依赖收集产出（`extractFluxScopePaths`
 *   在 compiler/env 选项下走 `extractExpressionDepsViaProbe`），useScopeSelector 订阅生效。
 * - WD-3 compiledCache 在 config 变更（或绑定域重载）时清空，杜绝长会话无界增长。
 */
export function useScadaPointsBridge(args: UseScadaPointsBridgeArgs): void {
  const { config, runtime, enabled = true, expressionCompiler, env, onError } = args;
  // WD-2：复杂表达式订阅路径经平台依赖收集产出（compiler/env 提供给 extractor）。
  // plan 2026-08-05-0325-1：同时取 depsEmptyExpressions（probe 返空 deps 嫌疑）供诊断上报。
  const { paths: fluxPaths, depsEmptyExpressions } = useMemo(
    () =>
      config
        ? analyzeFluxSubscriptions(config, { compiler: expressionCompiler, env })
        : { paths: [] as string[], depsEmptyExpressions: [] as string[] },
    [config, expressionCompiler, env],
  );
  // plan 2026-08-05-2129-3 Phase 2（multi P1-1）：binding.expression 直连 scope 路径并入订阅并集。
  // `variables:[]` + binding.expression 场景下，fluxPaths 为空但 bindingScopePaths 非空 →
  // useScopeSelector enabled → scopeData 含 binding-expression 所读 scope 成员 → binding 经
  // pipeline evalScope 正确求值（关闭「无点表直连 scope 端到端断裂」false-green）。
  const bindingScopePaths = useMemo(
    () => (config ? collectBindingExpressionScopePaths(config, { compiler: expressionCompiler, env }) : []),
    [config, expressionCompiler, env],
  );
  const paths = useMemo(
    () =>
      bindingScopePaths.length === 0
        ? fluxPaths
        : [...new Set([...fluxPaths, ...bindingScopePaths])].sort(),
    [fluxPaths, bindingScopePaths],
  );
  const scopeData = useScopeSelector<Record<string, unknown>, Record<string, unknown>>(
    (snapshot) => snapshot,
    Object.is,
    {
      enabled: enabled && paths.length > 0,
      fallback: {},
      paths,
    },
  );
  const compiledCache = useRef(new Map<string, ReturnType<ExpressionCompiler['compileValue']>>());
  const lastReportedErrors = useRef(new Map<string, string>());
  // plan 2026-08-05-1253-1 Phase 3（open-audit P2-2）：point-values 快照 generation-memoize。
  // scope-only 变更（generation 不变）复用快照，不在 point 值未变时重复全量重建（pointIds/getPointValue）。
  // generation 变化（applyValue/loadDeclarations/restoreValues/reset bump）触发重建，不返回 stale 快照。
  const pointSnapshotRef = useRef<{ generation: number; snapshot: Record<string, unknown> }>({
    generation: -1,
    snapshot: {},
  });
  const latest = useRef({ expressionCompiler, env, onError });
  useEffect(() => {
    latest.current = { expressionCompiler, env, onError };
  });

  // WD-3：config 变更（含绑定域重载）时清空 compiledCache，杜绝长会话无界增长
  // plan 2026-08-04-2243-1 Phase 2 L5：与 compiledCache 对称清空 lastReportedErrors——
  // config reload 后旧 config 的去重记录会抑制新 config 同表达式的错误上报（plan `{2242-1}`
  // 接通 onError 后该缺陷变可观测）。对称清空使新 config 的同表达式错误能正常重新上报。
  // plan 2026-08-05-1253-1 Phase 3：对称重置 pointSnapshot 缓存——config reload（reloadBindings→
  // loadDeclarations 已 bump generation，但新 pointStore 实例 generation 序列不同），强制下次重建。
  useEffect(() => {
    compiledCache.current.clear();
    lastReportedErrors.current.clear();
    pointSnapshotRef.current = { generation: -1, snapshot: {} };
  }, [config]);

  const reportOnce = useCallback((expression: string, code: string, error: unknown) => {
    if (lastReportedErrors.current.get(expression) === code) return;
    lastReportedErrors.current.set(expression, code);
    // plan 2026-08-05-0653-4 C3：透传原始 error（第三参）——host 监控可经 Error.cause 链
    // 定位 formula evaluator 源。message 仍由 errorMessage(error) 提取（保持既有文案）。
    latest.current.onError?.(code, errorMessage(error), error);
  }, []);

  // plan 2026-08-05-0325-1（W1 successor）：复杂表达式「读取 scope 但平台 collector 返空 deps」时
  // useScopeSelector 静默 disable（paths 为空），表达式永不随 scope 更新且对 author 不透明。此 effect
  // 经既有非升级诊断通道（reportOnce → onError → scada-canvas reportDiagnostic）一次性上报
  // `flux-deps-empty`，使该静默 disable 路径对 author 可感知（per-expression 可定位）。不升级画布 status、
  // 不派发 `scada:error`（与 flux-compile-failed/flux-evaluate-failed 同通道，§8.1 降级契约）。
  // 一次性保证：depsEmptyExpressions 经 useMemo 稳定（随 config/compiler/env），effect 仅在其变化时重跑；
  // reportOnce 按 (expression, code) 去重兜底。config reload 时 lastReportedErrors 对称清空 → 同表达式重报。
  useEffect(() => {
    if (depsEmptyExpressions.length === 0) return;
    for (const expression of depsEmptyExpressions) {
      reportOnce(
        expression,
        'flux-deps-empty',
        new Error(
          `Complex flux expression '${expression}' subscription paths could not be collected; the expression may not reactively update`,
        ),
      );
    }
  }, [depsEmptyExpressions, reportOnce]);

  // I18 表达式一元化：把 scope 快照推给 pipeline，供 binding.expression / scale.expression 求值读取 scope 成员。
  // pipeline 在 scope 变化时（scopeDirty）全量重算绑定，覆盖直连 scope 绑定（无点表）场景。
  // enabled 门控：disabled 时桥接整体不工作（与主 effect 一致），不向 pipeline 推 scope 也不请求帧。
  useEffect(() => {
    if (!runtime || !enabled) return;
    runtime.pipeline.updateScopeData(scopeData);
    runtime.pipeline.requestRender(runtime.applyAttrs);
  }, [scopeData, runtime, enabled]);

  useEffect(() => {
    if (!enabled || !config || !runtime) return;
    const fluxPoints = (config.variables ?? []).filter(
      (decl) => decl.source === 'flux' && typeof decl.flux === 'string',
    );
    if (fluxPoints.length === 0) return;

    // plan 2026-08-05-1253-1 Phase 3：generation-memoize 全量 point-values 快照。
    // generation 不变（scope-only 变更）时复用缓存快照；变化（point 值/点集改写）时重建。
    const generation = runtime.pointStore.getGeneration();
    let pointValues: Record<string, unknown>;
    if (generation !== pointSnapshotRef.current.generation) {
      const rebuilt: Record<string, unknown> = {};
      for (const pointId of runtime.pointStore.pointIds()) {
        const value = runtime.pointStore.getPointValue(pointId);
        if (value !== undefined) rebuilt[pointId] = value;
      }
      pointSnapshotRef.current = { generation, snapshot: rebuilt };
      pointValues = rebuilt;
    } else {
      pointValues = pointSnapshotRef.current.snapshot;
    }
    // 合并优先级（文档化契约，design-data-binding.md §9.1）：scope 在 id 冲突时遮蔽 point。
    const evalScope = createPrivateEvalScope({ ...pointValues, ...scopeData });

    const values: Record<string, ScadaPrimitive> = {};
    for (const decl of fluxPoints) {
      const expression = normalizeFluxExpression(decl.flux as string);
      let compiled = compiledCache.current.get(expression);
      if (compiled === undefined) {
        try {
          compiled = latest.current.expressionCompiler.compileValue(expression);
        } catch (error) {
          reportOnce(expression, 'flux-compile-failed', error);
          continue;
        }
        compiledCache.current.set(expression, compiled);
      }
      let value: unknown;
      try {
        value = latest.current.expressionCompiler.evaluateValue(compiled, evalScope, latest.current.env);
      } catch (error) {
        reportOnce(expression, 'flux-evaluate-failed', error);
        continue;
      }
      lastReportedErrors.current.delete(expression);
      if (isScadaPrimitive(value)) {
        values[decl.id] = value;
      }
    }
    if (Object.keys(values).length > 0) {
      runtime.pointStore.setPointValues(values);
      runtime.pipeline.requestRender(runtime.applyAttrs);
      // bridge 自身写入会 bump generation（applyValue）；更新缓存到 post-write generation + 合并刚写入值，
      // 使下次 scope-only 变更（无外部 point 写入）generation 仍匹配 → 复用快照（不重建）。
      // 合并刚写入值保证快照与 store 现态一致（flux 值虽下次重算，但 inter-flux 引用读快照需一致）。
      pointSnapshotRef.current = {
        generation: runtime.pointStore.getGeneration(),
        snapshot: { ...pointValues, ...values },
      };
    }
  }, [config, runtime, enabled, scopeData, reportOnce]);
}
