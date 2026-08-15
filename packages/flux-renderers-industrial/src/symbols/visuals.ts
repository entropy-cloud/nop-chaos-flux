/**
 * 工业图元视觉语言 v2（2026-08-15 商业级视觉刷新）：
 * - 金属/玻璃渐变 paint 构造器（leafer IGradientPaint，from/to 为单位坐标 0..1）；
 * - 极坐标工具（0°=正上、顺时针为正的仪表角度约定，与 bindings.rotation scale 换算同口径）；
 * - 刻度/圆弧几何生成（SVG path 圆弧段，供 Path 节点消费）。
 * 渐变仅落在 build() 内部装饰节点上，props/defaults 层 fill 保持 string（schema 契约不变）。
 */

export interface PaintStop {
  offset: number;
  color: string;
}

/** 垂直/自定义方向线性渐变 paint。 */
export function linearPaint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  stops: PaintStop[],
): { type: 'linear'; from: { x: number; y: number }; to: { x: number; y: number }; stops: PaintStop[] } {
  return { type: 'linear', from, to, stops };
}

/** 商业 HMI 视觉 token（暗色工况屏与浅色画布均可读）。 */
export const INDUSTRIAL_TOKENS = {
  bezelStroke: '#37474f',
  dialFaceTop: '#22334f',
  dialFaceBottom: '#0c1424',
  tick: '#aebfd8',
  tickLabel: '#8ba0bd',
  zoneGreen: '#2e9e5b',
  zoneAmber: '#e6a817',
  zoneRed: '#e53935',
  needle: '#e8443a',
  hubTop: '#e8eef7',
  hubBottom: '#93a5c0',
  steelLight: '#cfd8dc',
  steelMid: '#90a4ae',
  steelDark: '#546e7a',
  liquidTop: '#63c7ff',
  liquidBottom: '#0e7fd6',
  thermTop: '#ff8f6b',
  thermBottom: '#d84315',
} as const;

/** 金属轴套/表盘中心 hub 渐变。 */
export function hubPaint() {
  return linearPaint({ x: 0.3, y: 0.2 }, { x: 0.7, y: 0.9 }, [
    { offset: 0, color: INDUSTRIAL_TOKENS.hubTop },
    { offset: 1, color: INDUSTRIAL_TOKENS.hubBottom },
  ]);
}

/** 暗色表盘渐变。 */
export function dialFacePaint() {
  return linearPaint({ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, [
    { offset: 0, color: INDUSTRIAL_TOKENS.dialFaceTop },
    { offset: 1, color: INDUSTRIAL_TOKENS.dialFaceBottom },
  ]);
}

/** 液柱渐变（顶部亮、底部深，水面高光感）。 */
export function liquidPaint(top: string, bottom: string) {
  return linearPaint({ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, [
    { offset: 0, color: top },
    { offset: 1, color: bottom },
  ]);
}

/** 玻璃高光条渐变（上强下弱）。 */
export function glassShinePaint() {
  return linearPaint({ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, [
    { offset: 0, color: 'rgba(255,255,255,0.32)' },
    { offset: 1, color: 'rgba(255,255,255,0.02)' },
  ]);
}

/**
 * 仪表极坐标：0°=正上、顺时针为正。返回圆上点坐标。
 * 与 needle/刻度同口径：needle 基向为 (0,-1)，rotation=a 后指向 polar(a)。
 */
export function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

/** 圆弧段 SVG path（angleDeg 口径同 polar；a1 > a0，顺时针扫过）。 */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const largeArc = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArc} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}
