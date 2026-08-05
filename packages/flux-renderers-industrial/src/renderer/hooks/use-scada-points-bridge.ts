import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  getIn,
  type ExpressionCompiler,
  type RendererEnv,
  type ScopeRef,
  type ScopeDependencySet,
} from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';
import type { ScadaConfig, ScadaPrimitive } from '../../serialization/config-types.js';
import { PointStore } from '../../binding/point-store.js';
import { errorMessage } from '../scada-errors.js';
import { RefreshPipeline, type ApplyAttrs } from '../../binding/dirty-collector.js';

const FLUX_REF_PATTERN = /\$([a-zA-Z_][a-zA-Z0-9_-]*)(\.[a-zA-Z0-9_-]+)*/g;

/** `$xxx`/`$xxx.yyy` 引用提取（`$`=flux scope 前缀，与 `@{pointId}` 组态点表引用前缀隔离）。 */
export function extractFluxRefs(source: string): string[] {
  const refs: string[] = [];
  const pattern = new RegExp(FLUX_REF_PATTERN.source, FLUX_REF_PATTERN.flags);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    refs.push(match[0].slice(1));
  }
  return refs;
}

/**
 * 宽容 probe scope 数据（plan 2026-08-04-1558-2 Phase 3 m2-r2）：任何路径访问返回嵌套 proxy，
 * 让复杂表达式（`${a.b + 1}` 类）在空 scope 下也能完成求值（属性链不抛 TypeError），使平台
 * `evaluateWithState` 的依赖收集可达。proxy 通过 `valueOf`/`toString`/`Symbol.toPrimitive`
 * 兜底为 0/空串，算术与模板运算返回数值/字符串而不抛错。
 */
function createTolerantProbeScopeData(): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, property) {
      if (typeof property !== 'string') return undefined;
      if (property === '__proto__' || property === 'constructor' || property === 'prototype') return undefined;
      if (property === 'valueOf') return () => 0;
      if (property === 'toString') return () => '';
      if (property === 'length') return 0;
      return new Proxy({} as Record<string, unknown>, handler);
    },
    has() {
      return true;
    },
  };
  return new Proxy({} as Record<string, unknown>, handler);
}

/**
 * 复杂表达式经平台依赖收集产出订阅路径（plan 2026-08-04-1558-2 Phase 3 WD-2）：
 * compile + probe 求值 + 读 `state.root.dependencies.paths`。probe scope 宽容，使空 scope
 * 下依赖收集可达；求值抛错（不可恢复的表达式错误）返回空集（上层按声明跳过 + 去重上报 P1-8）。
 * 禁自研表达式解析——依赖路径产出完全经平台 collector。
 *
 * plan 2026-08-05-0653-4 C4（multi-audit P2-6）：返回类型由 `string[]` 改为 discriminated result
 * ——compile/createState/evaluate 失败分别归 `compile-failed`/`create-state-failed`/`evaluate-failed`
 * （非 deps-empty，由 bridge effect 的 `flux-compile-failed`/`flux-evaluate-failed` 真报覆盖）；
 * probe 成功但 deps 不可用（root 非 leaf-state、deps 缺失、wildcard、空 paths）归 `deps-empty`；
 * probe 成功且 paths 非空归 `ok`。消除旧实现「全部失败塌缩为 `[]`」导致的语法坏表达式双报
 * （`flux-deps-empty` 误报 + `flux-compile-failed` 真报）。
 */
export type ExpressionDepsProbeResult =
  | { status: 'ok'; paths: string[] }
  | { status: 'compile-failed' }
  | { status: 'create-state-failed' }
  | { status: 'evaluate-failed' }
  | { status: 'deps-empty' };

export function extractExpressionDepsViaProbe(
  compiler: ExpressionCompiler,
  env: RendererEnv,
  expression: string,
): ExpressionDepsProbeResult {
  let compiled: ReturnType<ExpressionCompiler['compileValue']>;
  try {
    compiled = compiler.compileValue(expression);
  } catch {
    return { status: 'compile-failed' };
  }
  // 静态表达式（无 scope 读）→ ok 空集（与 deps-empty 区分：静态表达式不触发诊断）
  if (compiled.kind !== 'dynamic') return { status: 'ok', paths: [] };
  let state: ReturnType<ExpressionCompiler['createState']>;
  try {
    state = compiler.createState(compiled);
  } catch {
    return { status: 'create-state-failed' };
  }
  const probeScope = createPrivateEvalScope(createTolerantProbeScopeData());
  try {
    compiler.evaluateWithState(compiled, probeScope, env, state);
  } catch {
    return { status: 'evaluate-failed' };
  }
  const root = state.root;
  if (root.kind !== 'leaf-state') return { status: 'deps-empty' };
  const deps: ScopeDependencySet | undefined = root.dependencies;
  // probe 成功但 deps 不可用（缺失、wildcard、空 paths）→ deps-empty（订阅路径收集失败的真诊断）
  if (!deps || deps.wildcard) return { status: 'deps-empty' };
  const paths = [...deps.paths];
  if (paths.length === 0) return { status: 'deps-empty' };
  return { status: 'ok', paths };
}

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
 * 复杂表达式分支复用 `extractExpressionDepsViaProbe`：probe 返 `[]` 且 `expressionReadsScope`
 * 为真时把表达式片段入 `depsEmptyExpressions`（供桥接层一次性上报 `flux-deps-empty`）。
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
    const refs = extractFluxRefs(source);
    if (refs.length > 0) {
      for (const ref of refs) paths.add(ref);
      continue;
    }
    const direct = /^\$\{([^{}]+)\}$/.exec(source);
    const candidate = (direct?.[1] ?? source).trim();
    if (/^[a-zA-Z_][a-zA-Z0-9_.-]*$/.test(candidate)) {
      paths.add(candidate);
      continue;
    }
    // 复杂表达式（含运算符/函数调用）→ 平台依赖收集（仅当 compiler/env 提供）
    if (compiler && env && candidate !== source) {
      const expression = normalizeFluxExpression(source);
      // plan 2026-08-05-0653-4 C4：probe 返 discriminated result。仅 `deps-empty` 入 depsEmptyExpressions
      // （probe 成功但 deps 不可用）；`ok` 取 paths；compile/createState/evaluate 失败跳过（由 bridge
      // effect 的 `flux-compile-failed`/`flux-evaluate-failed` 真报覆盖，不再产 `flux-deps-empty` 误报）。
      const result = extractExpressionDepsViaProbe(compiler, env, expression);
      if (result.status === 'ok') {
        for (const dep of result.paths) {
          if (dep !== '*' && dep.length > 0) paths.add(dep);
        }
      } else if (result.status === 'deps-empty') {
        // deps-empty 仅在表达式确实读 scope 时入诊断集（保留 expressionReadsScope 启发式：
        // 排除纯字面量/纯全局名表达式，避免 `${1+2}`/`${Math.PI}` 类误报）
        if (expressionReadsScope(candidate)) {
          depsEmptyExpressions.push(expression);
        }
      }
      // compile-failed / create-state-failed / evaluate-failed → 跳过（bridge effect 真报覆盖）
    }
  }
  return { paths: [...paths].sort(), depsEmptyExpressions };
}

/**
 * config 扫描 → `$xxx` 引用集 → useScopeSelector paths 数组（精细化失效，漏订阅/过订阅由单测固化）。
 * 覆盖三种写法：`$analog.temp`（简写）、`${analog.temp}`（平台表达式纯路径）、裸路径 `analog.temp``。
 *
 * plan 2026-08-04-1558-2 Phase 3 WD-2：复杂表达式（`${analog.temp + 1}` 类）当 `compiler`/`env`
 * 选项提供时经平台依赖收集产出订阅路径；不提供时回退到既有文本扫描（仅识别纯路径，复杂表达式无 path）。
 * plan 2026-08-05-0325-1：降为 `analyzeFluxSubscriptions` 的薄包装（仅返 `.paths`，保留既有签名/导出/测试）。
 */
export function extractFluxScopePaths(
  config: ScadaConfig,
  options?: ExtractFluxScopePathsOptions,
): string[] {
  return analyzeFluxSubscriptions(config, options).paths;
}

/** scada `$xxx` 简写 → 平台 `${...}` 表达式语法（flux-formula/flux-compiler 求值入口）。 */
export function normalizeFluxExpression(flux: string): string {
  const trimmed = flux.trim();
  if (trimmed.startsWith('${')) return trimmed;
  return `\${${trimmed.replace(/^\$/, '')}}`;
}

/**
 * `ScadaPrimitive` 类型守卫（plan 2026-08-04-2243-2 W4）：flux 桥接与 host 句柄
 * （`component:setPointValue`）共用，确保进入点表的值恒为 number|boolean|string，
 * 非 primitive 值在边界处被拒绝（不静默 corrupt 点表）。
 */
export function isScadaPrimitive(value: unknown): value is ScadaPrimitive {
  return typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string';
}

/**
 * 私有求值子 scope（design-data-binding.md §9.1）：注入点表上下文 + scope 快照，
 * 非 schema-visible scope（INV-4 边界），仅供 flux 表达式编译求值读取。
 */
export function createPrivateEvalScope(data: Record<string, unknown>): ScopeRef {
  return {
    id: 'scada-flux-eval',
    path: '$',
    value: data,
    get(path: string) {
      return getIn(data, path);
    },
    has(path: string) {
      return getIn(data, path) !== undefined;
    },
    readOwn: () => data,
    readVisible: () => data,
    materializeVisible: () => data,
    update: () => undefined,
    merge: () => undefined,
  };
}

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
  const { paths, depsEmptyExpressions } = useMemo(
    () =>
      config
        ? analyzeFluxSubscriptions(config, { compiler: expressionCompiler, env })
        : { paths: [] as string[], depsEmptyExpressions: [] as string[] },
    [config, expressionCompiler, env],
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
