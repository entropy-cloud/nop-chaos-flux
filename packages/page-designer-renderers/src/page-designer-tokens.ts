/**
 * Page designer 画布层语义令牌（plan 527 Phase 1）——hex 兜底唯一定义点在
 * `page-designer-tokens.css`（`--pd-*`）；本模块只做 TS 侧派生（color-mix 组合与
 * 过渡常量），消费点一律 import 引用，不再内联 `var(--nop-x, <hex>)` 字面值。
 */

export const PD_ACCENT = 'var(--pd-accent)';
export const PD_DESTRUCTIVE = 'var(--pd-destructive)';

export const PD_ACCENT_SOFT_BG = `color-mix(in srgb, ${PD_ACCENT} 8%, transparent)`;
export const PD_ACCENT_FAINT_BG = `color-mix(in srgb, ${PD_ACCENT} 4%, transparent)`;
export const PD_ACCENT_LINE = `color-mix(in srgb, ${PD_ACCENT} 55%, transparent)`;
export const PD_ACCENT_HOVER_LINE = `color-mix(in srgb, ${PD_ACCENT} 60%, transparent)`;
export const PD_ACCENT_BORDER = `color-mix(in srgb, ${PD_ACCENT} 30%, transparent)`;
export const PD_DESTRUCTIVE_SOFT_BG = `color-mix(in srgb, ${PD_DESTRUCTIVE} 8%, transparent)`;

/** 覆盖层外观属性过渡（plan 527 Phase 1）：几何属性（left/top/width/height）由
 * rAF tick 每帧重算，不得加入 transition（追帧拖影）。 */
export const PD_OVERLAY_TRANSITION =
  'outline-color 120ms ease, background-color 120ms ease, border-color 120ms ease';
