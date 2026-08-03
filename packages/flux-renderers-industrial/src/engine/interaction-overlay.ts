import { Group, Rect, type IGroup, type IRect } from 'leafer-ui';
import type { ScadaCanvasEngine } from './scada-engine.js';

export type InteractionState = 'hover' | 'press' | 'selected' | 'disabled';

export interface InteractionStyle {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  opacity?: number;
}

/** 交互状态样式预设（I8.2）：hover/press/selected/disabled 为图元内部实现细节，不进组态 JSON（design-symbols.md §10）。 */
export const INTERACTION_STYLE_PRESETS: Record<InteractionState, InteractionStyle> = {
  hover: { stroke: '#2f6fed', strokeWidth: 2, fill: 'rgba(47, 111, 237, 0.08)' },
  press: { stroke: '#1e4fbd', strokeWidth: 2 },
  selected: { stroke: '#ff7f2a', strokeWidth: 2, fill: 'rgba(255, 127, 42, 0.12)' },
  disabled: { stroke: '#9ca3af', strokeWidth: 1, opacity: 0.55 },
};

/** 覆盖物最小尺寸（无宽高语义/0 尺寸图元退化兜底，gate-4-review m-C）。 */
const MIN_OVERLAY_SIZE = 8;

interface OverlayNodeGeometry {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  points?: Array<number | { x: number; y: number }>;
}

/**
 * 覆盖物几何解析（gate-4-review m-C）：矩形语义图元取 x/y/width/height；
 * line/arrow/polygon 无 width/height 语义（attrs 含 points）时按 points 包围盒兜底，
 * 0 尺寸（水平/垂直直线）退化为最小尺寸框——保证 hover 反馈可见（事件链不受影响）。
 */
function resolveOverlayGeometry(node: OverlayNodeGeometry): { x: number; y: number; width: number; height: number } {
  const baseX = node.x ?? 0;
  const baseY = node.y ?? 0;
  const width = node.width ?? 0;
  const height = node.height ?? 0;
  if (width > 0 && height > 0) {
    return { x: baseX, y: baseY, width, height };
  }
  const points = node.points;
  if (Array.isArray(points) && points.length > 0) {
    const flat = typeof points[0] === 'number';
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const px = flat ? (points[i] as number) : (points[i] as { x: number }).x;
      const py = flat ? (points[++i] as number) : (points[i] as { y: number }).y;
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
    if (Number.isFinite(minX)) {
      return {
        x: baseX + minX,
        y: baseY + minY,
        width: Math.max(maxX - minX, MIN_OVERLAY_SIZE),
        height: Math.max(maxY - minY, MIN_OVERLAY_SIZE),
      };
    }
  }
  return { x: baseX, y: baseY, width: MIN_OVERLAY_SIZE, height: MIN_OVERLAY_SIZE };
}

/**
 * 引擎交互覆盖层（I8.2，design-engine.md §6 sky 层）：hover/press/selected/disabled
 * 视觉反馈覆盖物。`@leafer-in/state` 原语未引入 → Failure Paths `leafer-state-primitive-drift`
 * 回退路径：sky 层高亮描边。真实 hover 接线（事件桥→覆盖层）归 I11.2。
 */
export class InteractionOverlay {
  private readonly group: IGroup;
  private readonly overlays = new Map<string, IRect>();

  constructor(private readonly engine: ScadaCanvasEngine) {
    this.group = new Group({ name: 'scada-interaction-overlay' });
    this.engine.app.sky.add(this.group);
  }

  get activeCount(): number {
    return this.overlays.size;
  }

  hasActive(symbolId: string): boolean {
    return this.overlays.has(symbolId);
  }

  highlight(symbolId: string, style?: InteractionStyle): void {
    const leaf = this.engine.registry.get(symbolId);
    if (!leaf) return;
    const node = leaf.node as unknown as OverlayNodeGeometry;
    const merged = { ...(style ?? INTERACTION_STYLE_PRESETS.hover) };
    const geometry = resolveOverlayGeometry(node);
    const attrs: Record<string, unknown> = {
      x: geometry.x,
      y: geometry.y,
      width: geometry.width,
      height: geometry.height,
      rotation: node.rotation ?? 0,
      ...merged,
    };
    const existing = this.overlays.get(symbolId);
    if (existing) {
      existing.set(attrs);
    } else {
      const rect = new Rect(attrs);
      this.group.add(rect);
      this.overlays.set(symbolId, rect);
    }
  }

  clear(symbolId?: string): void {
    if (symbolId !== undefined) {
      const rect = this.overlays.get(symbolId);
      if (rect) {
        this.group.remove(rect);
        this.overlays.delete(symbolId);
      }
      return;
    }
    this.group.removeAll();
    this.overlays.clear();
  }

  destroy(): void {
    this.clear();
    this.group.destroy();
  }
}
