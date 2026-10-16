import { StateField } from '@codemirror/state';
import { setBreakpointsEffect } from './effects.js';

/**
 * 断点行集合 StateField（family: breakpoints 的状态载体）：sync 桥经
 * setBreakpointsEffect 派发全量行集合；文档编辑后的行号陈旧由下一次 store 派发
 * 收敛（sync 桥在每次 store 变更时重派——登记为 v1 简化，plan 617）。
 */
export const breakpointsField = StateField.define<ReadonlySet<number>>({
  create: () => new Set<number>(),
  update(value, tr) {
    let next = value;
    for (const effect of tr.effects) {
      if (effect.is(setBreakpointsEffect)) {
        next = new Set(effect.value);
      }
    }
    return next;
  },
});

