import { getIn, type ExpressionCompiler, type RendererEnv, type ScopeRef, type ScopeDependencySet } from '@nop-chaos/flux-core';
import type { ScadaPrimitive } from '../serialization/config-types.js';

/**
 * `ScadaPrimitive` 类型守卫：flux 求值与 host 句柄共用，确保进入点表的值恒为
 * number|boolean|string，非 primitive 值在边界处被拒绝。
 */
export function isScadaPrimitive(value: unknown): value is ScadaPrimitive {
  return typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string';
}

/**
 * 私有求值子 scope（design-data-binding.md §9.1）：注入点表上下文 + scope 快照，
 * 非 schema-visible scope（INV-4 边界），仅供 flux 表达式编译求值读取。
 * 合并优先级 `{...pointValues, ...scopeData}`——scope 在 id 冲突时遮蔽 point。
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
 * 复杂表达式经平台依赖收集产出订阅路径：compile + probe 求值 + 读
 * `state.root.dependencies.paths`。probe scope 宽容，使空 scope 下依赖收集可达。
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

/**
 * 从 `${expr}` 表达式中提取 scope paths（用作 point refs / 订阅路径）。
 * 当 compiler/env 不可用时返回空数组（向后兼容）。
 */
export function probeExpressionPaths(expression: string, context?: FluxEvalContext): string[] {
  if (!context) return [];
  const normalized = expression.trim().startsWith('${') ? expression.trim() : `\${${expression.trim()}}`;
  const result = extractExpressionDepsViaProbe(context.compiler, context.env, normalized);
  return result.status === 'ok' ? result.paths : [];
}
