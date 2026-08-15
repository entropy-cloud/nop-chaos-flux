import { Ellipse, Line, Path, Text } from 'leafer-ui';
import type { LeafNode } from '../symbol-types.js';
import { arcPath, dialFacePaint, glassShinePaint, hubPaint, INDUSTRIAL_TOKENS, polar } from '../visuals.js';

/**
 * 商业级表盘面（2026-08-15 视觉刷新）：暗色渐变表盘 + 三段量程色带（绿/黄/红）+
 * 主/次刻度 + 刻度值 + 玻璃高光 + 中心 hub。几何全部由 relayout(w, h) 派生，
 * build 与 gauge resize hook 共用，保持 width/height applyProps 的几何响应语义。
 */

export interface DialCustom {
  min?: number;
  max?: number;
  startAngle?: number;
  endAngle?: number;
  unit?: string;
  zones?: Array<{ from: number; to: number; color: string }>;
}

export interface DialNodes {
  face: LeafNode;
  zonePaths: LeafNode[];
  ticks: LeafNode[];
  tickLabels: LeafNode[];
  shine: LeafNode;
  hub: LeafNode;
}

const DEFAULT_ZONES = [
  { from: 0, to: 0.6, color: INDUSTRIAL_TOKENS.zoneGreen },
  { from: 0.6, to: 0.85, color: INDUSTRIAL_TOKENS.zoneAmber },
  { from: 0.85, to: 1, color: INDUSTRIAL_TOKENS.zoneRed },
];

const MAJOR_SEGMENTS = 5;

export function createDial(custom: DialCustom | undefined): DialNodes {
  const face = new Ellipse({ name: 'dial-face' }) as LeafNode;
  const zones = custom?.zones ?? DEFAULT_ZONES;
  const zonePaths = zones.map(
    (zone, index) => new Path({ name: `dial-zone-${index}`, d: '' }) as LeafNode,
  );
  const ticks: LeafNode[] = [];
  const tickLabels: LeafNode[] = [];
  for (let i = 0; i <= MAJOR_SEGMENTS * 2; i++) {
    const isMajor = i % 2 === 0;
    ticks.push(new Line({ name: `dial-tick-${i}`, stroke: isMajor ? INDUSTRIAL_TOKENS.tick : INDUSTRIAL_TOKENS.tickLabel, strokeWidth: isMajor ? 2 : 1 }) as LeafNode);
    if (isMajor) {
      tickLabels.push(new Text({ name: `dial-tick-label-${i}`, textAlign: 'center', verticalAlign: 'middle', fill: INDUSTRIAL_TOKENS.tickLabel }) as LeafNode);
    }
  }
  const shine = new Ellipse({ name: 'dial-shine', fill: glassShinePaint() }) as LeafNode;
  const hub = new Ellipse({ name: 'dial-hub', fill: hubPaint(), stroke: '#2c3a52', strokeWidth: 1 }) as LeafNode;
  return { face, zonePaths, ticks, tickLabels, shine, hub };
}

/** 表盘基础子节点（face/色带/刻度/高光）；hub 单独导出以便压在指针之上。 */
export function dialChildren(dial: DialNodes): Array<{ name: string; node: LeafNode }> {
  return [
    { name: 'dial-face', node: dial.face },
    ...dial.zonePaths.map((node, index) => ({ name: `dial-zone-${index}`, node })),
    ...dial.ticks.map((node, index) => ({ name: `dial-tick-${index}`, node })),
    ...dial.tickLabels.map((node, index) => ({ name: `dial-tick-label-${index}`, node })),
    { name: 'dial-shine', node: dial.shine },
  ];
}

/** 按容器尺寸重算全部表盘几何（build 与 width/height applyProps 共用）。 */
export function relayoutDial(
  dial: DialNodes,
  width: number,
  height: number,
  custom: DialCustom | undefined,
): void {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2;
  const start = custom?.startAngle ?? -135;
  const end = custom?.endAngle ?? 135;
  const min = custom?.min ?? 0;
  const max = custom?.max ?? 100;

  dial.face.set({
    x: cx,
    y: cy,
    around: 'center',
    width: r * 1.88,
    height: r * 1.88,
    fill: dialFacePaint(),
  });

  const zones = custom?.zones ?? DEFAULT_ZONES;
  dial.zonePaths.forEach((path, index) => {
    const zone = zones[index];
    if (!zone) {
      path.set({ visible: false });
      return;
    }
    path.set({
      visible: true,
      d: arcPath(cx, cy, r * 0.9, start + (end - start) * zone.from, start + (end - start) * zone.to),
      stroke: zone.color,
      strokeWidth: Math.max(3, r * 0.05),
      strokeCap: 'round',
      opacity: 0.9,
    });
  });

  dial.ticks.forEach((tick, i) => {
    const fraction = i / (MAJOR_SEGMENTS * 2);
    const angle = start + (end - start) * fraction;
    const isMajor = i % 2 === 0;
    const outer = polar(cx, cy, r * 0.84, angle);
    const inner = polar(cx, cy, isMajor ? r * 0.7 : r * 0.77, angle);
    tick.set({ x: 0, y: 0, points: [outer.x, outer.y, inner.x, inner.y] });
  });

  dial.tickLabels.forEach((label, j) => {
    const fraction = (j * 2) / (MAJOR_SEGMENTS * 2);
    const angle = start + (end - start) * fraction;
    const pos = polar(cx, cy, r * 0.56, angle);
    const value = Math.round(min + (max - min) * fraction);
    label.set({
      x: pos.x,
      y: pos.y,
      around: 'center',
      width: r * 0.34,
      height: r * 0.2,
      text: String(value),
      fontSize: Math.max(8, Math.round(r * 0.13)),
      fontFamily: 'sans-serif',
    });
  });

  dial.shine.set({
    x: cx - r * 0.42,
    y: cy - r * 0.82,
    width: r * 0.84,
    height: r * 0.5,
    fill: glassShinePaint(),
    opacity: 0.5,
  });

  dial.hub.set({
    x: cx,
    y: cy,
    around: 'center',
    width: r * 0.17,
    height: r * 0.17,
    fill: hubPaint(),
  });
}
