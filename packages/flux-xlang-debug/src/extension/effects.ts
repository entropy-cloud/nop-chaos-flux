import { StateEffect } from '@codemirror/state';

/**
 * Effect 三族（D5 §3.4：suspended-line/exception/breakpoint 三族 + 命名常量一次
 * 定死，plan 617 F1 修订）。sync 桥按 store 变更派发，StateField 消费。
 */

/** family: breakpoints——断点行集合（1-based 行号）。 */
export const setBreakpointsEffect = StateEffect.define<readonly number[]>();

/** family: suspended-line——挂起行集合（1-based 行号）。 */
export const setSuspendedLinesEffect = StateEffect.define<readonly number[]>();

/** family: exception——异常行集合（1-based 行号）。 */
export const setExceptionLinesEffect = StateEffect.define<readonly number[]>();

/** Effect 族命名常量（D5 §3.4 命名约定）。 */
export const XLANG_DEBUG_EFFECT_FAMILIES = {
  breakpoints: 'xlang-debug/breakpoints',
  suspendedLine: 'xlang-debug/suspended-line',
  exception: 'xlang-debug/exception',
} as const;
