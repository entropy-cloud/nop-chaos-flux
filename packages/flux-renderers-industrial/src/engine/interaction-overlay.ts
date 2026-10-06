import { Group, Rect, type IGroup, type IRect, type ITransition } from 'leafer-ui';
import type { ScadaCanvasEngine } from './scada-engine.js';
import { resolveInteractionStyles } from './interaction-tokens.js';

export { INTERACTION_STYLE_PRESETS } from './interaction-tokens.js';

export type InteractionState = 'hover' | 'press' | 'selected' | 'disabled';

/**
 * D-530-1 覆盖物过渡（120ms，秒单位——leafer ITransition 口径）：经 `set(data, transition)` 消费，
 * 该重写来自 @leafer-in/animate 插件。本包**不捆绑**插件：宿主加载（playground 全局 import）→
 * 120ms 过渡生效；未加载宿主 base `set` 忽略第二参 → 即时终态（Failure Paths animate-env-noop
 * 的契约降级路径，确定性不变）。
 */
const OVERLAY_TRANSITION: ITransition = { duration: 0.12, easing: 'ease-out' };

export interface InteractionStyle {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  opacity?: number;
  /** plan 530 S1：selected 软阴影（leafer IShadowString 形态）；refresh 回拷白名单含此键。 */
  shadow?: string;
}

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
 * I15.1 live defect 修复（mock↔真实漂移）：真实 leafer Path 形状节点（Line/Polygon）的
 * `width`/`height` 为**默认值**（实测 Line width=100/height=0、Polygon 100×100），不反映
 * points 几何——points 有语义时**恒优先**按 points 包围盒计算，否则 100×100 默认框会盖过
 * 真实几何（gate-4 m-C 单测由 mock 建模未掩蔽此漂移，e2e 实测暴露）。
 */
function resolveOverlayGeometry(node: OverlayNodeGeometry): { x: number; y: number; width: number; height: number } {
  const baseX = node.x ?? 0;
  const baseY = node.y ?? 0;
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
  const width = node.width ?? 0;
  const height = node.height ?? 0;
  if (width > 0 && height > 0) {
    return { x: baseX, y: baseY, width, height };
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
  private tokenStyles: Record<InteractionState, InteractionStyle> | null = null;

  constructor(private readonly engine: ScadaCanvasEngine) {
    // P1-7 覆盖物必须不参与命中测试（hittable: false）：sky 层覆盖物与图元 screen 几何对齐后，
    // 若不标记为不可命中，指针命中会落到覆盖物 rect 上，tap/pointer 事件路径不再含 tree →
    // 图元 click/hover 链路被 sky 层吞掉（e2e I11 click→dialog 链实测暴露）。
    this.group = new Group({ name: 'scada-interaction-overlay', hittable: false });
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
    const merged = { ...(style ?? this.defaultStyle()) };
    const geometry = resolveOverlayGeometry(leaf.node as unknown as OverlayNodeGeometry);
    const attrs = this.toScreenAttrs(geometry, leaf.node as unknown as OverlayNodeGeometry, merged);
    const existing = this.overlays.get(symbolId);
    if (existing) {
      this.applyOverlayAttrs(existing, attrs);
    } else {
      const rect = new Rect(attrs);
      this.group.add(rect);
      this.overlays.set(symbolId, rect);
      this.playFadeIn(rect, attrs);
    }
  }

  /** plan 530 S1：默认样式 = `--ind-*` 令牌解析（每 overlay 生命周期缓存一次），fallback=PRESETS。 */
  private defaultStyle(): InteractionStyle {
    if (!this.tokenStyles) {
      this.tokenStyles = resolveInteractionStyles(this.engine.container ?? null);
    }
    return this.tokenStyles.hover;
  }

  /**
   * D-530-1 过渡通道：已有覆盖物重着色时，样式键经 leafer `set(data, transition)` 120ms 过渡，
   * 几何键（x/y/width/height/rotation）恒即时 set。animate 插件缺失（宿主未加载）→ 直接即时
   * 终态（Failure Paths animate-env-noop：终态同步可达是硬约束，过渡仅观感通道）。
   */
  private applyOverlayAttrs(rect: IRect, attrs: Record<string, unknown>): void {
    const geometryKeys = ['x', 'y', 'width', 'height', 'rotation'] as const;
    const geometryAttrs: Record<string, unknown> = {};
    const styleAttrs: Record<string, unknown> = {};
    let hasStyle = false;
    for (const key of Object.keys(attrs)) {
      if ((geometryKeys as readonly string[]).includes(key)) {
        geometryAttrs[key] = attrs[key];
      } else {
        styleAttrs[key] = attrs[key];
        hasStyle = true;
      }
    }
    if (Object.keys(geometryAttrs).length > 0) rect.set(geometryAttrs);
    if (!hasStyle) return;
    if (this.hasAnimatePlugin(rect)) {
      rect.set(styleAttrs, OVERLAY_TRANSITION);
    } else {
      rect.set(styleAttrs);
    }
  }

  /** D-530-1 淡入通道：终态 set 先行，animate 插件在时 opacity 0→目标值淡入 120ms（观感通道，非判据）。 */
  private playFadeIn(rect: IRect, attrs: Record<string, unknown>): void {
    const targetOpacity = typeof attrs.opacity === 'number' ? attrs.opacity : 1;
    if (!this.hasAnimatePlugin(rect)) return;
    rect.set({ opacity: 0 });
    rect.set({ opacity: targetOpacity }, OVERLAY_TRANSITION);
  }

  /** animate 插件活性探测（插件重写 UI.prototype 后实例可见 animate；未加载宿主为 undefined）。 */
  private hasAnimatePlugin(rect: IRect): boolean {
    return typeof (rect as unknown as { animate?: unknown }).animate === 'function';
  }

  /**
   * P1-7 覆盖物变换面对齐：sky 层恒等变换，覆盖物以 **screen 坐标**绘制（与树内图元
   * `screen = (world - vx)·s` 同面）。x/y 经 `getViewportPoint` 换算、宽/高乘当前 scale、
   * rotation 不变；strokeWidth 保持 preset 屏幕像素（screen 坐标绘制下除 scale 会产生
   * 2/scale px 的几乎不可见描边）。
   */
  private toScreenAttrs(
    geometry: { x: number; y: number; width: number; height: number },
    node: OverlayNodeGeometry,
    style: InteractionStyle,
  ): Record<string, unknown> {
    const scale = this.engine.getViewport().scale;
    const point = this.engine.getViewportPoint({ x: geometry.x, y: geometry.y });
    return {
      x: point.x,
      y: point.y,
      width: geometry.width * scale,
      height: geometry.height * scale,
      rotation: node.rotation ?? 0,
      ...style,
    };
  }

  /** pan/zoom 后按最新视口重算全部活动覆盖物（P1-7：screen 坐标绘制下视口变化必须刷新）。 */
  refresh(): void {
    if (this.overlays.size === 0) return;
    for (const [symbolId, rect] of this.overlays) {
      const leaf = this.engine.registry.get(symbolId);
      if (!leaf) continue;
      const node = leaf.node as unknown as OverlayNodeGeometry;
      const geometry = resolveOverlayGeometry(node);
      const current = rect.get() as Record<string, unknown>;
      const style: InteractionStyle = {};
      for (const key of ['stroke', 'strokeWidth', 'fill', 'opacity', 'shadow'] as const) {
        if (current[key] !== undefined) (style as Record<string, unknown>)[key] = current[key];
      }
      rect.set(this.toScreenAttrs(geometry, node, style));
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
