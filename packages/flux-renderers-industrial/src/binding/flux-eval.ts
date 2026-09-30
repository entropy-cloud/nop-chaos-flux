import type { ExpressionCompiler, RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import {
  createPrivateEvalScope as createSharedEvalScope,
  extractExpressionDepsViaProbe as extractShared,
  probeExpressionPaths as probeShared,
} from '@nop-chaos/flux-react';
import type { ScadaPrimitive } from '../serialization/config-types.js';

/**
 * `ScadaPrimitive` 类型守卫：flux 求值与 host 句柄共用，确保进入点表的值恒为
 * number|boolean|string，非 primitive 值在边界处被拒绝。（域策略保留在本包——
 * 3d 的宽松值域不适用，cq-4 Phase 1。）
 */
export function isScadaPrimitive(value: unknown): value is ScadaPrimitive {
  return typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string';
}

/**
 * 私有求值子 scope（design-data-binding.md §9.1）：注入点表上下文 + scope 快照，
 * 非 schema-visible scope（INV-4 边界）。求值核心单源于 flux-react bindings
 * 公共层（cq-4 Phase 1）；合并优先级 `{...pointValues, ...scopeData}`——scope 在
 * id 冲突时遮蔽 point。
 */
export function createPrivateEvalScope(data: Record<string, unknown>): ScopeRef {
  return createSharedEvalScope(data, FLUX_EVAL_SCOPE_ID);
}

/** Scope identity pinned for the scada family（原逐字本地实现 — cq-4 Phase 1）。 */
const FLUX_EVAL_SCOPE_ID = 'scada-flux-eval';

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
  return extractShared(compiler, env, expression, FLUX_EVAL_SCOPE_ID);
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
  return probeShared(expression, context, FLUX_EVAL_SCOPE_ID);
}
