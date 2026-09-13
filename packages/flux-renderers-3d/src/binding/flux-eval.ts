import { getIn, type ExpressionCompiler, type RendererEnv, type ScopeDependencySet, type ScopeRef } from '@nop-chaos/flux-core';
import type { DataBinding } from '../schemas.js';

export type { ExpressionCompiler, RendererEnv, ScopeRef };

/**
 * 绑定表达式求值与订阅路径提取（design-data-binding.md §2，语义对齐 industrial 同名模块；
 * plan 464 D4：compileValue/evaluateValue 为唯一已验证求值路径）。
 */

/** `ScadaPrimitive`-式收口不适用于 3D（绑定值可为数组/对象）；求值结果直通 TransformEngine 接缝。 */

/**
 * 只读私有求值 scope（design-data-binding.md §2.1；INV-4 非 schema-visible 边界）。
 * 合并优先级 `{...base, ...scopeData}` 由调用方先合并后注入。
 */
export function createPrivateEvalScope(data: Record<string, unknown>): ScopeRef {
  return {
    id: 'three-canvas-flux-eval',
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

export type ExpressionDepsProbeResult =
  | { status: 'ok'; paths: string[] }
  | { status: 'compile-failed' }
  | { status: 'create-state-failed' }
  | { status: 'evaluate-failed' }
  | { status: 'deps-empty' };

/**
 * 复杂表达式经平台依赖收集产出订阅路径：compileValue → 判 dynamic → createState →
 * 宽容 Proxy probe scope 求值 → 读 `state.root.dependencies.paths`（design-data-binding.md §2.2）。
 * 五态判别与 industrial `binding/flux-eval.ts` 逐分支一致。
 */
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
  if (!deps || deps.wildcard) return { status: 'deps-empty' };
  const paths = [...deps.paths];
  if (paths.length === 0) return { status: 'deps-empty' };
  return { status: 'ok', paths };
}

export interface FluxEvalContext {
  compiler: ExpressionCompiler;
  env: RendererEnv;
}

/** 从表达式提取 scope paths（自动补 `${}` 包裹；probe 失败返空数组）。 */
export function probeExpressionPaths(expression: string, context?: FluxEvalContext): string[] {
  if (!context) return [];
  const normalized = normalizeBindingExpression(expression);
  const result = extractExpressionDepsViaProbe(context.compiler, context.env, normalized);
  return result.status === 'ok' ? result.paths : [];
}

/** 复杂表达式候选是否「demonstrably reads scope」：含标识符即真（全局名如 Math 判真，可接受误报）。 */
export function expressionReadsScope(candidate: string): boolean {
  return /[a-zA-Z_][a-zA-Z0-9_]*/.test(candidate);
}

/** 规范入口仅接受 `${` 开头；其余兜底包裹（I18 表达式一元化同款）。 */
export function normalizeBindingExpression(expression: string): string {
  const trimmed = expression.trim();
  if (trimmed.startsWith('${')) return trimmed;
  return `\${${trimmed}}`;
}

export interface AnalyzeBindingSubscriptionsResult {
  paths: string[];
  /** 复杂表达式读取 scope 但平台 collector 返空 deps 的嫌疑表达式（analyze 期一次性上报）。 */
  depsEmptyExpressions: string[];
}

/**
 * 绑定配置扫描 → 订阅路径集 + deps-empty 嫌疑集（design-data-binding.md §2.2）：
 * 纯标识符链直取全路径；复杂表达式经 probe（平台 collector normalize 到根段）。
 * deps-empty 上报定界在 analyze/config 期，不受桥接 enabled 影响。
 */
export function analyzeBindingSubscriptions(
  bindings: Array<Pick<DataBinding, 'source'>>,
  options?: FluxEvalContext,
): AnalyzeBindingSubscriptionsResult {
  const paths = new Set<string>();
  const depsEmptyExpressions: string[] = [];
  for (const binding of bindings) {
    const source = normalizeBindingExpression(binding.source.expression);
    const direct = /^\$\{([^{}]+)\}$/.exec(source);
    if (!direct) continue;
    const candidate = direct[1].trim();
    if (/^[a-zA-Z_][a-zA-Z0-9_.-]*$/.test(candidate)) {
      paths.add(candidate);
      continue;
    }
    if (!options) continue;
    const result = extractExpressionDepsViaProbe(options.compiler, options.env, source);
    if (result.status === 'ok') {
      for (const dep of result.paths) {
        if (dep !== '*' && dep.length > 0) paths.add(dep);
      }
    } else if (result.status === 'deps-empty' && expressionReadsScope(candidate)) {
      depsEmptyExpressions.push(source);
    }
  }
  return { paths: [...paths].sort(), depsEmptyExpressions };
}
