import type { CellStyle } from '@nop-chaos/spreadsheet-core';

export interface CellStyleResult {
  className: string;
  style: Record<string, string>;
}

/** plan 476 Phase 2：值类型视觉最小实现的渲染端分派输入（零 schema 变更——
 * 只消费 CellDocument 既有 type/numberFormat/value 字段）。 */
export interface CellValueDispatchInput {
  value?: unknown;
  type?: string;
  numberFormat?: string;
}

const SS_CELL = 'ss-cell';

const FONT_WEIGHT_MAP: Record<string, string> = {
  bold: 'ss-bold',
};

const FONT_STYLE_MAP: Record<string, string> = {
  italic: 'ss-italic',
};

const TEXT_DECORATION_MAP: Record<string, string> = {
  underline: 'ss-underline',
  'line-through': 'ss-strike',
};

const TEXT_ALIGN_MAP: Record<string, string> = {
  center: 'ss-align-center',
  right: 'ss-align-right',
};

const VERTICAL_ALIGN_MAP: Record<string, string> = {
  top: 'ss-valign-top',
  bottom: 'ss-valign-bottom',
};

const BORDER_STYLE_MAP: Record<string, string> = {
  all: 'ss-border-solid',
  outer: 'ss-border-solid',
  inner: 'ss-border-solid',
  top: 'ss-border-top',
  bottom: 'ss-border-bottom',
  left: 'ss-border-left',
  right: 'ss-border-right',
  horizontal: 'ss-border-solid',
  vertical: 'ss-border-solid',
  solid: 'ss-border-solid',
  dashed: 'ss-border-dashed',
  dotted: 'ss-border-dotted',
  double: 'ss-border-double',
};

export function mapCellStyle(style: CellStyle | undefined): CellStyleResult {
  if (!style) {
    return { className: SS_CELL, style: {} };
  }

  const classes: string[] = [SS_CELL];
  const inlineStyle: Record<string, string> = {};

  if (style.fontWeight && FONT_WEIGHT_MAP[style.fontWeight]) {
    classes.push(FONT_WEIGHT_MAP[style.fontWeight]);
  }

  if (style.fontStyle && FONT_STYLE_MAP[style.fontStyle]) {
    classes.push(FONT_STYLE_MAP[style.fontStyle]);
  }

  if (style.textDecoration && TEXT_DECORATION_MAP[style.textDecoration]) {
    classes.push(TEXT_DECORATION_MAP[style.textDecoration]);
  }

  if (style.textAlign && TEXT_ALIGN_MAP[style.textAlign]) {
    classes.push(TEXT_ALIGN_MAP[style.textAlign]);
  }

  if (style.verticalAlign && VERTICAL_ALIGN_MAP[style.verticalAlign]) {
    classes.push(VERTICAL_ALIGN_MAP[style.verticalAlign]);
  }

  if (style.wrapText) {
    classes.push('ss-wrap');
  }

  if (style.borderStyle && BORDER_STYLE_MAP[style.borderStyle]) {
    classes.push(BORDER_STYLE_MAP[style.borderStyle]);
  }

  if (style.fontSize != null) {
    inlineStyle.fontSize =
      typeof style.fontSize === 'number' ? `${style.fontSize}px` : style.fontSize;
  }

  if (style.fontFamily) {
    inlineStyle.fontFamily = style.fontFamily;
  }

  if (style.fontColor) {
    inlineStyle.color = style.fontColor;
  }

  if (style.backgroundColor) {
    inlineStyle.backgroundColor = style.backgroundColor;
  }

  if (style.textIndent != null) {
    inlineStyle.textIndent =
      typeof style.textIndent === 'number' ? `${style.textIndent}px` : style.textIndent;
  }

  appendBorderStyle(inlineStyle, 'borderTop', style.borderTop);
  appendBorderStyle(inlineStyle, 'borderRight', style.borderRight);
  appendBorderStyle(inlineStyle, 'borderBottom', style.borderBottom);
  appendBorderStyle(inlineStyle, 'borderLeft', style.borderLeft);

  if (style.borderColor) {
    if (!style.borderTop && !style.borderRight && !style.borderBottom && !style.borderLeft) {
      inlineStyle.borderColor = style.borderColor;
    }
  }

  if (style.borderWidth != null) {
    if (!style.borderTop && !style.borderRight && !style.borderBottom && !style.borderLeft) {
      inlineStyle.borderWidth =
        typeof style.borderWidth === 'number' ? `${style.borderWidth}px` : style.borderWidth;
    }
  }

  return {
    className: classes.join(' '),
    style: inlineStyle,
  };
}

/** 数值判据：运行时 number，或作者声明了 numberFormat（字符串数字按格式化对待）。 */
function isNumericCell(input: CellValueDispatchInput): boolean {
  return typeof input.value === 'number' || input.numberFormat != null;
}

const DATE_TYPE_VALUES = new Set(['date', 'datetime']);

/** 日期判据：作者显式 type 声明，或值为 Date / ISO 日期串。 */
function isDateCell(input: CellValueDispatchInput): boolean {
  if (input.type != null && DATE_TYPE_VALUES.has(input.type)) {
    return true;
  }
  if (input.value instanceof Date) {
    return true;
  }
  if (typeof input.value === 'string' && input.value.length >= 8) {
    return /^\d{4}-\d{2}-\d{2}([T ]|$)/.test(input.value);
  }
  return false;
}

/**
 * plan 476 Phase 2：值类型 → 类名/文本分派（独立于 mapCellStyle——后者保持纯
 * CellStyle 入参）。返回追加类名与最终展示文本；显式 textAlign 优先级高于类型
 * 对齐（由调用方保证：有显式 textAlign 时不追加 ss-type-number 的右对齐类）。
 */
export function resolveCellTypeDisplay(
  input: CellValueDispatchInput,
  options?: { hasExplicitTextAlign?: boolean },
): { className: string; text: string } {
  const classes: string[] = [];
  const text = input.value == null ? '' : String(input.value);

  if (input.value == null) {
    return { className: '', text };
  }

  if (isDateCell(input)) {
    classes.push('ss-type-date');
    return { className: classes.join(' '), text: formatDate(input.value) };
  }

  if (isNumericCell(input)) {
    classes.push('ss-type-number');
    if (!options?.hasExplicitTextAlign) {
      classes.push('ss-align-right');
    }
    return { className: classes.join(' '), text: formatNumber(input.value, input.numberFormat) };
  }

  return { className: classes.join(' '), text };
}

function formatDate(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString();
}

/** numberFormat 基础应用：仅支持 `0.00`/`#,##0`/`0%`/`#,##0.00` 形态的子集；
 * 不支持的格式原样输出，不抛错。 */
/** numberFormat 基础应用（plan 476 Phase 2 最小子集）：`0`、`0.00`、`#,##0`、
 * `#,##0.00`、`0%`、`0.00%`；其余格式原样输出不抛错。 */
export function formatNumber(value: unknown, numberFormat?: string): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return String(value);
  }

  switch (numberFormat) {
    case undefined:
    case '':
      return String(value);
    case '0%':
      return `${Math.round(value * 100)}%`;
    case '0.00%':
      return `${(value * 100).toFixed(2)}%`;
    case '0':
      return String(Math.round(value));
    case '0.00':
      return value.toFixed(2);
    case '#,##0':
      return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    case '#,##0.00':
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    default:
      return String(value);
  }
}

interface BorderLineStyle {
  color: string;
  style: string;
  width: number;
}

function appendBorderStyle(
  target: Record<string, string>,
  prefix: string,
  border: BorderLineStyle | undefined,
): void {
  if (!border) return;
  const w = typeof border.width === 'number' ? `${border.width}px` : border.width;
  target[`${prefix}Width`] = w;
  target[`${prefix}Style`] = border.style;
  target[`${prefix}Color`] = border.color;
}
