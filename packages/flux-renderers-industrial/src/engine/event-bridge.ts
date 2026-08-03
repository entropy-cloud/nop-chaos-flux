import type { HitResolver } from './hit.js';

export type ScadaSymbolEventName = 'symbol:click' | 'symbol:dblclick' | 'symbol:hover' | 'symbol:hover-miss';

/** 事件载荷规范化（design-renderer.md §8.2）。`createNormalizedActionEvent` 调用与 dispatch 属 I11.1。 */
export interface ScadaSymbolEventPayload {
  symbolId: string;
  symbolType: string;
  pointValues?: Record<string, unknown>;
  world?: { x: number; y: number };
  viewport?: { x: number; y: number };
}

export interface BuildSymbolEventPayloadInput {
  symbolId: string;
  symbolType?: string;
  pointValues?: Record<string, unknown>;
  world?: { x: number; y: number };
  viewport?: { x: number; y: number };
}

/** 事件载荷规范化模块：构造对齐 design-renderer.md §8.2 的数据对象（symbolType 兜底 'unknown'，可选字段缺失不输出）。 */
export function buildSymbolEventPayload(input: BuildSymbolEventPayloadInput): ScadaSymbolEventPayload {
  const payload: ScadaSymbolEventPayload = {
    symbolId: input.symbolId,
    symbolType: input.symbolType ?? 'unknown',
  };
  if (input.pointValues !== undefined) payload.pointValues = input.pointValues;
  if (input.world !== undefined) payload.world = { ...input.world };
  if (input.viewport !== undefined) payload.viewport = { ...input.viewport };
  return payload;
}

interface EventTarget {
  on(event: string, cb: (...args: unknown[]) => void): unknown;
  off(event: string, cb: (...args: unknown[]) => void): unknown;
}

export interface EventBridgeOptions {
  /** leafer tree 层（引擎事件挂载点）。 */
  tree: EventTarget;
  resolver: HitResolver;
  viewportToWorld: (point: { x: number; y: number }) => { x: number; y: number };
  getSymbolType?: (symbolId: string) => string | undefined;
  /** 命中的绑定点值快照投影（只读；经 point-store 投影）。 */
  getPointValues?: (symbolId: string) => Record<string, unknown> | undefined;
  onSymbolEvent: (name: ScadaSymbolEventName, payload: ScadaSymbolEventPayload) => void;
}

/**
 * 引擎事件桥（I6.4，design-engine.md §8.1；I11.1/I11.2 扩展）：
 * tree 层 leafer 指针事件（tap/double_tap/pointer.move）→ 命中解析 → symbol:click/dblclick/hover 发射。
 * 载荷 `{ symbolId, world, viewport }`（对齐 §8.1）+ 规范化扩充（symbolType/pointValues，§8.2）。
 * hover 退出信号（I11.2）：pointer.move 命中为空且前一命中存在 → `symbol:hover-miss`（载荷承载前一
 * symbolId，仅覆盖物消费不派发 action，design-engine.md §8.1 事件表外）；A→B 切换不发 miss（hover(B)
 * 到达时消费方自清前一目标）。
 */
export class EventBridge {
  private attached = false;
  private lastHovered: string | undefined;

  constructor(private readonly options: EventBridgeOptions) {}

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    this.options.tree.on('tap', this.handleTap);
    this.options.tree.on('double_tap', this.handleDoubleTap);
    this.options.tree.on('pointer.move', this.handlePointerMove);
  }

  destroy(): void {
    if (!this.attached) return;
    this.attached = false;
    this.lastHovered = undefined;
    this.options.tree.off('tap', this.handleTap);
    this.options.tree.off('double_tap', this.handleDoubleTap);
    this.options.tree.off('pointer.move', this.handlePointerMove);
  }

  private readonly handleTap = (event: unknown): void => {
    const point = this.pointOf(event);
    if (!point) return;
    const symbolId = this.resolveSymbol(point);
    if (symbolId !== undefined) this.emit('symbol:click', point, symbolId);
  };

  private readonly handleDoubleTap = (event: unknown): void => {
    const point = this.pointOf(event);
    if (!point) return;
    const symbolId = this.resolveSymbol(point);
    if (symbolId !== undefined) this.emit('symbol:dblclick', point, symbolId);
  };

  private readonly handlePointerMove = (event: unknown): void => {
    const point = this.pointOf(event);
    if (point) this.handleHover(point);
  };

  private handleHover(point: { x: number; y: number }): void {
    const symbolId = this.resolveSymbol(point);
    if (symbolId !== undefined) {
      this.lastHovered = symbolId;
      this.emit('symbol:hover', point, symbolId);
      return;
    }
    if (this.lastHovered !== undefined) {
      const prev = this.lastHovered;
      this.lastHovered = undefined;
      this.emit('symbol:hover-miss', undefined, prev);
    }
  }

  private resolveSymbol(viewportPoint: { x: number; y: number }): string | undefined {
    return this.options.resolver.resolveSymbolId(viewportPoint.x, viewportPoint.y);
  }

  private pointOf(event: unknown): { x: number; y: number } | undefined {
    if (event === undefined || event === null || typeof event !== 'object') return undefined;
    // leafer 指针事件数据为 `{ ..., x, y, ... }`（PointerEventHelper.convert；UIEvent 仅 x/y + getPagePoint）——无 `point` 属性（gate-3-review §3 抽查项 2 / M-1）
    const { x, y } = event as { x?: unknown; y?: unknown };
    if (typeof x !== 'number' || typeof y !== 'number') return undefined;
    return { x, y };
  }

  private emit(name: ScadaSymbolEventName, viewportPoint: { x: number; y: number } | undefined, symbolId: string): void {
    const payload = buildSymbolEventPayload({
      symbolId,
      symbolType: this.options.getSymbolType?.(symbolId),
      pointValues: this.options.getPointValues?.(symbolId),
      world: viewportPoint ? this.options.viewportToWorld(viewportPoint) : undefined,
      viewport: viewportPoint,
    });
    this.options.onSymbolEvent(name, payload);
  }
}
