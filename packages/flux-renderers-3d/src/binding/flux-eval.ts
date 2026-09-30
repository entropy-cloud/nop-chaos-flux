import type { ExpressionCompiler, RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import {
  createPrivateEvalScope as createSharedEvalScope,
  extractExpressionDepsViaProbe as extractShared,
  probeExpressionPaths as probeShared,
} from '@nop-chaos/flux-react';
import type { DataBinding } from '../schemas.js';

export type { ExpressionCompiler, RendererEnv, ScopeRef };

/** Scope identity pinned for the 3d canvas family (was a verbatim local copy — cq-4 Phase 1). */
const FLUX_EVAL_SCOPE_ID = 'three-canvas-flux-eval';

/**
 * 绑定表达式求值与订阅路径提取（design-data-binding.md §2；plan 464 D4：
 * compileValue/evaluateValue 为唯一已验证求值路径）。求值核心单源于
 * flux-react bindings 公共层；`ScadaPrimitive`-式收口不适用于 3D（绑定值可为
 * 数组/对象），求值结果直通 TransformEngine 接缝。
 */

export function createPrivateEvalScope(data: Record<string, unknown>): ScopeRef {
  return createSharedEvalScope(data, FLUX_EVAL_SCOPE_ID);
}

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
  return extractShared(compiler, env, expression, FLUX_EVAL_SCOPE_ID);
}

export interface FluxEvalContext {
  compiler: ExpressionCompiler;
  env: RendererEnv;
}

/** 从表达式提取 scope paths（自动补 `${}` 包裹；probe 失败返空数组）。 */
export function probeExpressionPaths(expression: string, context?: FluxEvalContext): string[] {
  return probeShared(expression, context, FLUX_EVAL_SCOPE_ID);
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
    const result = extractShared(options.compiler, options.env, source, FLUX_EVAL_SCOPE_ID);
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
