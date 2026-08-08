/**
 * 表达式求值期错误类型（从 dirty-collector.ts 拆分，plan 2026-08-08-0748-3 Phase 3）：
 * 环检测信号 + cause-chain 解包 + flux 求值结果判别类型。
 */

import type { ScadaPrimitive } from '../serialization/config-types.js';

/**
 * `findCircularDependencyError` cause-chain 遍历深度上限（plan 2026-08-06-0746-3 Phase 2，multi P2-6）。
 * 工业过程管线现实场景下，expression chain（`${a}` → `${b}` → ... → `${k}`）经多层嵌套求值会被
 * flux-formula `formulaCompiler.exec` 叠加多层 `Error('Expression evaluation failed for: ...')` 包装
 * （每层嵌套求值包一层）。旧硬编码上限 `10` 对 10+ 层 chain 的 cycle 会误判为 generic eval 失败
 * （返 undefined → 上游上报 `flux-evaluate-failed` 而非 `circular dependency`，host 无法区分真 cycle
 * vs runtime TypeError）。提至 `1000` 覆盖现实工业表达式链长度。**仅为防御性兜底而非语义约束**——
 * 无限循环已由 `cause === current`（自环）/ `cause === undefined`（链终止）break 守卫防住，本上限
 * 仅兜底恶意/损坏的极深 cause 链（远超现实 chain 长度）防栈耗尽。
 */
const MAX_CAUSE_CHAIN_DEPTH = 1000;

/**
 * 表达式点环检测信号（I18 binding-cycle Failure Path）：求值期遇 re-enter 同一点时抛出。
 * `evaluateFlux` 的 catch 仅吞 compile/evaluate 异常返回 undefined；本类型经 `findCircularDependencyError`
 * 守卫后重新抛出**原始** `CircularDependencyError`（沿 `Error.cause` 链解包），使环错误能上传到
 * `syncExpressionPoint` 的 try/catch → `reportError(pointId, 'circular dependency involving point: ...')`，
 * 保留既有失败路径语义（受影响图元保持上一有效值）。
 *
 * 必须解包到原始 `CircularDependencyError` 而非保留包装层——flux-formula `formulaCompiler.exec` 把求值期
 * 异常包装成 `Error('Expression evaluation failed for: ...')`（cause=原始）后重新抛出，多层嵌套求值会
 * 叠加多层包装。直接抛包装层会使 `error.message` 变成 'Expression evaluation failed for: ...'，
 * 失去 binding-cycle 语义；解包后 `error.message` = 'circular dependency involving point: ...'，与
 * Failure Path 表述一致。
 */
export class CircularDependencyError extends Error {
  readonly isCircularDependency = true;
  constructor(pointId: string) {
    super(`circular dependency involving point: ${pointId}`);
    this.name = 'CircularDependencyError';
  }
}

export function findCircularDependencyError(error: unknown): CircularDependencyError | undefined {
  let current: unknown = error;
  let depth = 0;
  // plan 2026-08-06-0746-3 Phase 2（multi P2-6）：depth 上限 10 → MAX_CAUSE_CHAIN_DEPTH（1000），
  // 覆盖现实工业过程管线多层嵌套求值的 cause 链深度。`cause === current`（自环）/ `undefined`（链终止）
  // break 守卫已防无限循环，上限仅兜底极深恶意/损坏链。
  while (current && typeof current === 'object' && depth < MAX_CAUSE_CHAIN_DEPTH) {
    if (current instanceof CircularDependencyError) return current;
    const cause = (current as { cause?: unknown }).cause;
    if (cause === current || cause === undefined) break;
    current = cause;
    depth++;
  }
  return undefined;
}

/**
 * flux 表达式求值结果（plan 2026-08-05-2129-3 Phase 3，multi P1-2）：区分编译失败 / 求值失败 / 成功，
 * 使 `reportError` 能 emit 对称错误码 `flux-compile-failed` / `flux-evaluate-failed`（旧实现 compile/evaluate
 * catch 塌缩为 undefined，caller 无法区分阶段）。
 */
export type FluxEvalOutcome =
  | { status: 'ok'; value: ScadaPrimitive | undefined }
  | { status: 'compile-failed'; error: unknown }
  | { status: 'evaluate-failed'; error: unknown };
