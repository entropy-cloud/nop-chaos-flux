/**
 * 画布交互纯函数（design.md §8）：坐标换算、frame 快照增量、8 向手柄、吸附、旋转。
 * 无 React/DOM 依赖（入参为纯数据），Vitest 单测先行。
 * 坐标换算：1mm = PX_PER_MM px × zoom。
 */

import { PX_PER_MM } from '@nop-chaos/flux-print-core';

export interface Frame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PaperPoint {
  left: number;
  top: number;
}

export type ResizeHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w';

export const MIN_ELEMENT_SIZE_MM = 1;

/** 屏幕（client）坐标 → 纸面 mm 坐标（origin 为纸面左上角的 client 坐标）。 */
export function screenToPaper(
  clientX: number,
  clientY: number,
  origin: PaperPoint,
  zoom: number,
): PaperPoint {
  return {
    left: (clientX - origin.left) / (PX_PER_MM * zoom),
    top: (clientY - origin.top) / (PX_PER_MM * zoom),
  };
}

export function screenDeltaToPaper(dx: number, dy: number, zoom: number): PaperPoint {
  return { left: dx / (PX_PER_MM * zoom), top: dy / (PX_PER_MM * zoom) };
}

/**
 * 8 向手柄增量（mm）：对角/对边手柄拖动后的新 frame。
 * 对角固定（拖 se 则 nw 不动）；最小尺寸 clamp 到 MIN_ELEMENT_SIZE_MM。
 */
export function applyHandleDelta(
  handle: ResizeHandle,
  start: Frame,
  dx: number,
  dy: number,
  minSize: number = MIN_ELEMENT_SIZE_MM,
): Frame {
  let { left, top, width, height } = start;

  if (handle.includes('e')) {
    width = Math.max(minSize, start.width + dx);
  }
  if (handle.includes('w')) {
    const right = start.left + start.width;
    width = Math.max(minSize, start.width - dx);
    left = right - width;
  }
  if (handle.includes('s')) {
    height = Math.max(minSize, start.height + dy);
  }
  if (handle.includes('n')) {
    const bottom = start.top + start.height;
    height = Math.max(minSize, start.height - dy);
    top = bottom - height;
  }

  return { left, top, width, height };
}

export interface SnapResult {
  frame: Frame;
  /** 命中的垂直吸附线（mm，纸面坐标，供画布绘制辅助线）。 */
  verticalLines: number[];
  /** 命中的水平吸附线（mm）。 */
  horizontalLines: number[];
}

export interface SnapOptions {
  /** 网格尺寸（mm）。 */
  gridSize: number;
  /** 候选垂直线：边距线/参考线/其他元素边缘与中心（mm，纸面坐标）。 */
  verticalCandidates: number[];
  /** 候选水平线。 */
  horizontalCandidates: number[];
  /** 吸附阈值（mm，调用方按 px 阈值/zoom 换算后传入）。 */
  threshold: number;
}

const frameXAnchors = (frame: Frame): number[] => [frame.left, frame.left + frame.width / 2, frame.left + frame.width];
const frameYAnchors = (frame: Frame): number[] => [frame.top, frame.top + frame.height / 2, frame.top + frame.height];

function snapAxis(anchors: number[], candidates: number[], threshold: number): { lines: number[]; offset: number } {
  let bestOffset = 0;
  let bestDistance = threshold;
  const lines: number[] = [];
  for (const anchor of anchors) {
    for (const candidate of candidates) {
      const distance = Math.abs(anchor - candidate);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestOffset = candidate - anchor;
        lines.length = 0;
        lines.push(candidate);
      }
    }
  }
  return { lines, offset: bestOffset };
}

/** 拖拽吸附：以移动后的 frame 三锚点（起/中/末）对候选线取最近命中（≤threshold 才吸）。 */
export function computeSnap(frame: Frame, options: SnapOptions): SnapResult {
  const vertical = snapAxis(frameXAnchors(frame), options.verticalCandidates, options.threshold);
  const horizontal = snapAxis(frameYAnchors(frame), options.horizontalCandidates, options.threshold);
  return {
    frame: {
      left: frame.left + vertical.offset,
      top: frame.top + horizontal.offset,
      width: frame.width,
      height: frame.height,
    },
    verticalLines: vertical.lines,
    horizontalLines: horizontal.lines,
  };
}

/** 网格吸附候选：0 与网格倍数到页宽/页高（调用方给页宽高生成）。 */
export function gridCandidates(pageSizeMm: number, gridSize: number): number[] {
  const candidates: number[] = [];
  for (let position = 0; position <= pageSizeMm; position += gridSize) {
    candidates.push(position);
  }
  return candidates;
}

/** 旋转角（度）：由中心与指针位置计算绝对角度，默认磁吸 0/90/180/270（±5° 内），free 模式跳过。 */
export function computeRotateAngle(
  center: PaperPoint,
  pointer: PaperPoint,
  options: { free?: boolean } = {},
): number {
  const degrees = (Math.atan2(pointer.top - center.top, pointer.left - center.left) * 180) / Math.PI;
  const snapped = Math.round(degrees / 90) * 90;
  const value = options.free ? degrees : Math.abs(degrees - snapped) <= 5 ? snapped : degrees;
  return Math.round(value * 100) / 100;
}
