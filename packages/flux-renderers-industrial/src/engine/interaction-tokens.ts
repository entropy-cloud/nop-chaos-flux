import type { InteractionState, InteractionStyle } from './interaction-overlay.js';

/**
 * 交互覆盖物令牌面（plan 530 Phase 1，S1）：`--ind-*` 语义令牌 → InteractionStyle。
 *
 * 契约：
 * - 令牌定义在运行态/编辑器两张样式表（src/styles.css、src/editor/styles.css）的
 *   `.nop-scada-canvas` / `.nop-scada-editor-canvas` 作用域块（light + `[data-mode='dark']` 重声明），
 *   双表同值，块间交叉引用注释防漂移。
 * - 解析链：画布容器 computed style → 缺失/非法逐键回退 `INTERACTION_STYLE_PRESETS`
 *   （与今日 hex 行为一致的裸宿主兜底，常量面即 fallback 契约）。
 * - 解析时机 = InteractionOverlay 首次使用（每引擎生命周期一次）；主题中途翻转不热更新
 *   （编辑器 preview 模式切换会重建引擎，实际影响面为会话内一次性）。
 */

/** fallback 常量面（值与 plan 530 前的预设一致；selected/press 补浅填充与软阴影公式）。 */
export const INTERACTION_STYLE_PRESETS: Record<InteractionState, InteractionStyle> = {
  hover: { stroke: '#2f6fed', strokeWidth: 2, fill: 'rgba(47, 111, 237, 0.08)' },
  press: { stroke: '#1e4fbd', strokeWidth: 2, fill: 'rgba(30, 79, 189, 0.1)' },
  selected: {
    stroke: '#ff7f2a',
    strokeWidth: 2,
    fill: 'rgba(255, 127, 42, 0.12)',
    shadow: '0 4px 16px rgba(255, 127, 42, 0.35)',
  },
  disabled: { stroke: '#9ca3af', strokeWidth: 1, opacity: 0.55 },
};

/** 编辑器 EditBox 选中框令牌（D-530-2，与 --ind-interaction-selected 同源值）。 */
export const EDITOR_SELECTED_RING_VAR = '--ind-node-selected-ring';
export const EDITOR_SELECTED_RING_FALLBACK = INTERACTION_STYLE_PRESETS.selected.stroke as string;

const TOKEN_VARS: Record<InteractionState, { stroke: string; fill?: string; shadow?: string }> = {
  hover: { stroke: '--ind-interaction-hover', fill: '--ind-interaction-hover-fill' },
  press: { stroke: '--ind-interaction-press', fill: '--ind-interaction-press-fill' },
  selected: {
    stroke: '--ind-interaction-selected',
    fill: '--ind-interaction-selected-fill',
    shadow: '--ind-interaction-selected-shadow',
  },
  disabled: { stroke: '--ind-interaction-disabled' },
};

const NAMED_COLORS = new Set([
  'transparent',
  'currentcolor',
  'black',
  'white',
  'red',
  'green',
  'blue',
  'yellow',
  'orange',
  'purple',
  'pink',
  'cyan',
  'magenta',
  'gray',
  'grey',
  'silver',
  'lime',
  'maroon',
  'navy',
  'olive',
  'teal',
  'aqua',
  'fuchsia',
  'indigo',
  'violet',
  'slate',
]);

function isValidColorValue(value: string): boolean {
  const lower = value.toLowerCase();
  if (NAMED_COLORS.has(lower)) return true;
  return /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|hwb\(|lab\(|lch\(|oklab\(|oklch\(|color\()/.test(lower);
}

function isValidShadowValue(value: string): boolean {
  return /\d/.test(value);
}

/** 单键读取：容器 computed style → 空/非法回退 fallback（Failure Paths token-unresolved/malformed）。 */
export function readIndTokenVar(
  container: HTMLElement | null | undefined,
  varName: string,
  fallback: string,
  kind: 'color' | 'shadow' = 'color',
): string {
  const computed = container && typeof window !== 'undefined' ? window.getComputedStyle(container) : null;
  const value = (computed?.getPropertyValue(varName) ?? '').trim();
  if (!value) return fallback;
  const valid = kind === 'shadow' ? isValidShadowValue(value) : isValidColorValue(value);
  return valid ? value : fallback;
}

/** 四态令牌解析（highlight 默认样式源）。 */
export function resolveInteractionStyles(container?: HTMLElement | null): Record<InteractionState, InteractionStyle> {
  const read = (varName: string, fallback: string, kind: 'color' | 'shadow' = 'color') =>
    readIndTokenVar(container, varName, fallback, kind);

  const hoverStroke = read(TOKEN_VARS.hover.stroke, INTERACTION_STYLE_PRESETS.hover.stroke as string);
  const pressStroke = read(TOKEN_VARS.press.stroke, INTERACTION_STYLE_PRESETS.press.stroke as string);
  const selectedStroke = read(TOKEN_VARS.selected.stroke, INTERACTION_STYLE_PRESETS.selected.stroke as string);
  const disabledStroke = read(TOKEN_VARS.disabled.stroke, INTERACTION_STYLE_PRESETS.disabled.stroke as string);

  return {
    hover: {
      stroke: hoverStroke,
      strokeWidth: 2,
      fill: read(TOKEN_VARS.hover.fill as string, INTERACTION_STYLE_PRESETS.hover.fill as string),
    },
    press: {
      stroke: pressStroke,
      strokeWidth: 2,
      fill: read(TOKEN_VARS.press.fill as string, INTERACTION_STYLE_PRESETS.press.fill as string),
    },
    selected: {
      stroke: selectedStroke,
      strokeWidth: 2,
      fill: read(TOKEN_VARS.selected.fill as string, INTERACTION_STYLE_PRESETS.selected.fill as string),
      shadow: read(
        TOKEN_VARS.selected.shadow as string,
        INTERACTION_STYLE_PRESETS.selected.shadow as string,
        'shadow',
      ),
    },
    disabled: {
      stroke: disabledStroke,
      strokeWidth: 1,
      opacity: 0.55,
    },
  };
}
