import type { DashboardPanelSchema } from './schemas.js';

/**
 * dashboard 布局坐标纯函数集（design: docs/components/dashboard-editor/design.md §坐标模型）。
 *
 * 无 React / DOM 依赖，全部可单测。编辑态 pointer 拖拽/resize 均以这些纯函数计算坐标，
 * 结果再经 editor-core 会话写入 working（一拖拽 = 一 undo 步）。
 */

export const DEFAULT_COLS = 12;
export const DEFAULT_ROW_HEIGHT = 40;
export const DEFAULT_GAP = 8;
export const DEFAULT_MAX_Y_ROWS = 30;
export const MIN_PANEL_W = 1;
export const MIN_PANEL_H = 1;

/** resize 八向句柄（对齐编辑画布 resize handles）。 */
export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface PanelPixelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function resolveCols(cols: number | undefined): number {
  return cols !== undefined && cols > 0 ? Math.floor(cols) : DEFAULT_COLS;
}

export function resolveRowHeight(rowHeight: number | undefined): number {
  return rowHeight !== undefined && rowHeight > 0 ? rowHeight : DEFAULT_ROW_HEIGHT;
}

export function resolveGapPx(gap: number | undefined): number {
  return gap !== undefined && gap >= 0 ? gap : DEFAULT_GAP;
}

function cellWidth(canvasWidth: number, cols: number, gap: number): number {
  return (canvasWidth - (cols - 1) * gap) / cols;
}

/** 网格坐标 → 像素矩形（运行态渲染 + 编辑态 overlay 共用同一换算）。 */
export function panelToPixels(
  panel: DashboardPanelSchema,
  options: { cols?: number; rowHeight?: number; gap?: number; canvasWidth: number },
): PanelPixelRect {
  const cols = resolveCols(options.cols);
  const rowHeight = resolveRowHeight(options.rowHeight);
  const gap = resolveGapPx(options.gap);
  const cw = cellWidth(options.canvasWidth, cols, gap);
  return {
    left: panel.x * (cw + gap),
    top: panel.y * (rowHeight + gap),
    width: panel.w * cw + (panel.w - 1) * gap,
    height: panel.h * rowHeight + (panel.h - 1) * gap,
  };
}

/**
 * 像素坐标 → 网格坐标（吸附）。返回 { x, y } 均为整数网格单位。
 * `snapToGrid` 只做吸附，不做边界 clamp——边界 clamp 由 `clampPanelPosition` 负责。
 */
export function snapToGrid(
  pixelX: number,
  pixelY: number,
  options: { cols?: number; rowHeight?: number; gap?: number; canvasWidth: number },
): { x: number; y: number } {
  const cols = resolveCols(options.cols);
  const rowHeight = resolveRowHeight(options.rowHeight);
  const gap = resolveGapPx(options.gap);
  const cw = cellWidth(options.canvasWidth, cols, gap);
  return {
    x: Math.round(pixelX / (cw + gap)),
    y: Math.round(pixelY / (rowHeight + gap)),
  };
}

/** 面板位置边界 clamp（拖拽/落点越界 → 吸附到边界内，失败路径 dashboard-drag-out）。 */
export function clampPanelPosition(
  panel: DashboardPanelSchema,
  options: { cols?: number; rowHeight?: number; gap?: number; canvasWidth: number; maxY?: number },
): DashboardPanelSchema {
  const cols = resolveCols(options.cols);
  const maxY = options.maxY ?? DEFAULT_MAX_Y_ROWS;
  const maxX = cols - Math.min(panel.w, cols);
  const maxYPos = Math.max(0, maxY - Math.min(panel.h, maxY));
  return {
    ...panel,
    x: clamp(panel.x, 0, Math.max(0, maxX)),
    y: clamp(panel.y, 0, maxYPos),
  };
}

/** 面板最小尺寸 clamp（resize 小于最小尺寸 → 钳到最小尺寸，失败路径 dashboard-resize-min）。 */
export function clampPanelSize(
  panel: DashboardPanelSchema,
  options: { cols?: number; minW?: number; minH?: number },
): DashboardPanelSchema {
  const cols = resolveCols(options.cols);
  const minW = Math.max(1, options.minW ?? MIN_PANEL_W);
  const minH = Math.max(1, options.minH ?? MIN_PANEL_H);
  return {
    ...panel,
    w: clamp(Math.floor(panel.w), minW, cols),
    h: clamp(Math.floor(panel.h), minH, Infinity),
  };
}

export interface PanelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function toPanelRect(panel: DashboardPanelSchema): PanelRect {
  return { x: panel.x, y: panel.y, w: panel.w, h: panel.h };
}

export function rectsOverlap(a: PanelRect, b: PanelRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** 与同布局其它面板的重叠检测（排除自身）。 */
export function findOverlappingPanels(
  panels: readonly DashboardPanelSchema[],
  candidate: DashboardPanelSchema,
): DashboardPanelSchema[] {
  const rect = toPanelRect(candidate);
  return panels.filter((p) => p.id !== candidate.id && rectsOverlap(rect, toPanelRect(p)));
}

/**
 * 拖拽面板（纯函数）：把 `id` 面板移动到吸附后的网格坐标 (x, y)，
 * 越界 clamp 到画布边界内；返回新 panels 数组（无变更时返回原数组引用）。
 */
export function dragPanel(
  panels: readonly DashboardPanelSchema[],
  id: string,
  x: number,
  y: number,
  options: { cols?: number; rowHeight?: number; gap?: number; canvasWidth: number; maxY?: number },
): DashboardPanelSchema[] {
  const target = panels.find((p) => p.id === id);
  if (!target) return panels as DashboardPanelSchema[];
  const snapped = snapToGrid(x, y, options);
  const clamped = clampPanelPosition({ ...target, x: snapped.x, y: snapped.y }, options);
  if (clamped.x === target.x && clamped.y === target.y) {
    return panels as DashboardPanelSchema[];
  }
  return panels.map((p) => (p.id === id ? clamped : p));
}

/**
 * Resize 面板（纯函数）：按八向句柄 + 像素位移计算新网格尺寸/位置，
 * 最小尺寸 clamp + 边界 clamp；返回新 panels 数组。
 */
export function resizePanel(
  panels: readonly DashboardPanelSchema[],
  id: string,
  handle: ResizeHandle,
  dxPixels: number,
  dyPixels: number,
  options: { cols?: number; rowHeight?: number; gap?: number; canvasWidth: number; minW?: number; minH?: number; maxY?: number },
): DashboardPanelSchema[] {
  const target = panels.find((p) => p.id === id);
  if (!target) return panels as DashboardPanelSchema[];
  const cols = resolveCols(options.cols);
  const rowHeight = resolveRowHeight(options.rowHeight);
  const gap = resolveGapPx(options.gap);
  const cw = cellWidth(options.canvasWidth, cols, gap);
  const minW = Math.max(1, options.minW ?? MIN_PANEL_W);
  const minH = Math.max(1, options.minH ?? MIN_PANEL_H);

  const dW = Math.round(dxPixels / (cw + gap));
  const dH = Math.round(dyPixels / (rowHeight + gap));

  const next: DashboardPanelSchema = { ...target };

  if (handle.includes('e')) {
    next.w = clamp(target.w + dW, minW, cols - target.x);
  } else if (handle.includes('w')) {
    next.x = clamp(target.x - dW, 0, target.x + target.w - minW);
    next.w = target.x + target.w - next.x;
  }

  if (handle.includes('s')) {
    next.h = clamp(target.h + dH, minH, Infinity);
  } else if (handle.includes('n')) {
    next.y = clamp(target.y - dH, 0, target.y + target.h - minH);
    next.h = target.y + target.h - next.y;
  }

  const clamped = clampPanelSize(next, { cols, minW, minH });
  const positionClamped = clampPanelPosition(clamped, options);
  if (
    clamped.x === target.x &&
    clamped.y === target.y &&
    clamped.w === target.w &&
    clamped.h === target.h
  ) {
    return panels as DashboardPanelSchema[];
  }
  return panels.map((p) => (p.id === id ? positionClamped : p));
}

/** 布局校验（失败路径 dashboard-layout-invalid）：非法项忽略 + dev warn，全非法 → 空态。 */
export function sanitizePanels(
  panels: unknown,
  options: { cols?: number },
): DashboardPanelSchema[] {
  if (!Array.isArray(panels)) return [];
  const cols = resolveCols(options.cols);
  const seen = new Set<string>();
  const out: DashboardPanelSchema[] = [];
  for (const raw of panels) {
    if (raw === null || typeof raw !== 'object') {
      console.warn('[dashboard] invalid panel entry (non-object), skipped');
      continue;
    }
    const panel = raw as Partial<DashboardPanelSchema>;
    if (typeof panel.id !== 'string' || panel.id.length === 0) {
      console.warn('[dashboard] invalid panel entry (missing id), skipped');
      continue;
    }
    if (seen.has(panel.id)) {
      console.warn(`[dashboard] duplicate panel id "${panel.id}", skipped`);
      continue;
    }
    if (typeof panel.type !== 'string' || panel.type.length === 0) {
      console.warn(`[dashboard] invalid panel entry (missing type) for id "${panel.id}", skipped`);
      continue;
    }
    const numbersOk =
      [panel.x, panel.y, panel.w, panel.h].every((v) => typeof v === 'number' && Number.isFinite(v));
    if (!numbersOk) {
      console.warn(`[dashboard] invalid panel entry (non-numeric x/y/w/h) for id "${panel.id}", skipped`);
      continue;
    }
    const w = clamp(Math.floor(panel.w as number), 1, cols);
    const h = clamp(Math.floor(panel.h as number), 1, Infinity);
    const x = clamp(Math.floor(panel.x as number), 0, cols - w);
    const y = Math.max(0, Math.floor(panel.y as number));
    const cleaned: DashboardPanelSchema = {
      id: panel.id,
      type: panel.type,
      x,
      y,
      w,
      h,
    };
    if (typeof panel.title === 'string') cleaned.title = panel.title;
    if (panel.props !== undefined) cleaned.props = panel.props;
    if (panel.source !== undefined) cleaned.source = panel.source;
    seen.add(panel.id);
    out.push(cleaned);
  }
  return out;
}

/** 布局推导画布高度（运行态未显式指定 height 时，按面板最大底沿计算）。 */
export function resolveCanvasHeight(
  panels: readonly DashboardPanelSchema[],
  options: { rowHeight?: number; gap?: number; height?: number },
): number {
  if (options.height !== undefined && options.height > 0) return options.height;
  const rowHeight = resolveRowHeight(options.rowHeight);
  const gap = resolveGapPx(options.gap);
  let maxBottom = 0;
  for (const p of panels) {
    maxBottom = Math.max(maxBottom, p.y + p.h);
  }
  return maxBottom * rowHeight + Math.max(0, maxBottom - 1) * gap;
}
