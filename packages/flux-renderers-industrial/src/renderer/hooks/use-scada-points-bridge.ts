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
 */
export function extractExpressionDepsViaProbe(
  compiler: ExpressionCompiler,
  env: RendererEnv,
  expression: string,
): string[] {
  let compiled: ReturnType<ExpressionCompiler['compileValue']>;
  try {
    compiled = compiler.compileValue(expression);
  } catch {
    return [];
  }
  if (compiled.kind !== 'dynamic') return [];
  let state: ReturnType<ExpressionCompiler['createState']>;
  try {
    state = compiler.createState(compiled);
  } catch {
    return [];
  }
  const probeScope = createPrivateEvalScope(createTolerantProbeScopeData());
  try {
    compiler.evaluateWithState(compiled, probeScope, env, state);
  } catch {
    return [];
  }
  const root = state.root;
  if (root.kind !== 'leaf-state') return [];
  const deps: ScopeDependencySet | undefined = root.dependencies;
  if (!deps || deps.wildcard) return [];
  return [...deps.paths];
}

export interface ExtractFluxScopePathsOptions {
  compiler?: ExpressionCompiler;
  env?: RendererEnv;
}

/**
 * config 扫描 → `$xxx` 引用集 → useScopeSelector paths 数组（精细化失效，漏订阅/过订阅由单测固化）。
 * 覆盖三种写法：`$analog.temp`（简写）、`${analog.temp}`（平台表达式纯路径）、裸路径 `analog.temp`。
 *
 * plan 2026-08-04-1558-2 Phase 3 WD-2：复杂表达式（`${analog.temp + 1}` 类）当 `compiler`/`env`
 * 选项提供时经平台依赖收集产出订阅路径；不提供时回退到既有文本扫描（仅识别纯路径，复杂表达式无 path）。
 */
export function extractFluxScopePaths(
  config: ScadaConfig,
  options?: ExtractFluxScopePathsOptions,
): string[] {
  const paths = new Set<string>();
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
      const deps = extractExpressionDepsViaProbe(compiler, env, expression);
      for (const dep of deps) {
        if (dep !== '*' && dep.length > 0) paths.add(dep);
      }
    }
  }
  return [...paths].sort();
}

/** scada `$xxx` 简写 → 平台 `${...}` 表达式语法（flux-formula/flux-compiler 求值入口）。 */
export function normalizeFluxExpression(flux: string): string {
  const trimmed = flux.trim();
  if (trimmed.startsWith('${')) return trimmed;
  return `\${${trimmed.replace(/^\$/, '')}}`;
}

function isScadaPrimitive(value: unknown): value is ScadaPrimitive {
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
  onError?: (code: string, message: string) => void;
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
  // WD-2：复杂表达式订阅路径经平台依赖收集产出（compiler/env 提供给 extractor）
  const paths = useMemo(
    () => (config ? extractFluxScopePaths(config, { compiler: expressionCompiler, env }) : []),
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
  const latest = useRef({ expressionCompiler, env, onError });
  useEffect(() => {
    latest.current = { expressionCompiler, env, onError };
  });

  // WD-3：config 变更（含绑定域重载）时清空 compiledCache，杜绝长会话无界增长
  useEffect(() => {
    compiledCache.current.clear();
  }, [config]);

  const reportOnce = useCallback((expression: string, code: string, error: unknown) => {
    if (lastReportedErrors.current.get(expression) === code) return;
    lastReportedErrors.current.set(expression, code);
    latest.current.onError?.(code, errorMessage(error));
  }, []);

  useEffect(() => {
    if (!enabled || !config || !runtime) return;
    const fluxPoints = (config.variables ?? []).filter(
      (decl) => decl.source === 'flux' && typeof decl.flux === 'string',
    );
    if (fluxPoints.length === 0) return;

    const pointValues: Record<string, unknown> = {};
    for (const pointId of runtime.pointStore.pointIds()) {
      const value = runtime.pointStore.getPointValue(pointId);
      if (value !== undefined) pointValues[pointId] = value;
    }
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
    }
  }, [config, runtime, enabled, scopeData, reportOnce]);
}
