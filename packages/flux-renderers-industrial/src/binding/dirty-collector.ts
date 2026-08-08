import type { ScadaSymbolProps } from '../symbols/symbol-types.js';

export type ApplyAttrs = (attrsBySymbolId: Record<string, Partial<ScadaSymbolProps>>) => void;

export interface CollectedEntry {
  symbolId: string;
  property: string;
  value: unknown;
}

export type TickScheduler = (cb: () => void) => () => void;

export type FrameScheduler = (cb: () => void) => () => void;

export function createTickScheduler(scheduleTick?: FrameScheduler): TickScheduler {
  const schedule =
    scheduleTick ??
    ((cb) => {
      const id = requestAnimationFrame(() => cb());
      return () => cancelAnimationFrame(id);
    });
  return schedule;
}

/**
 * 帧内脏属性收集 + 帧尾批量写（I6.1，A5 合帧义务）。
 * 帧内多次 collect 合并为一次 `flush(applyAttrs)` 批量调用（engine.applyAttrs 唯一调用点）；
 * 帧内无写入则不触发渲染请求；requestRender 帧对齐（与 animator 时钟共享调度语义）。
 */
export class DirtyCollector {
  private pending = new Map<string, Map<string, unknown>>();
  private readonly scheduleTick: TickScheduler;
  private frameScheduled = false;
  private cancelTick: (() => void) | undefined;
  private destroyed = false;

  constructor(options?: { scheduleTick?: FrameScheduler }) {
    this.scheduleTick = createTickScheduler(options?.scheduleTick);
  }

  collect(entries: CollectedEntry | CollectedEntry[]): void {
    // plan 2026-08-04-2243-1 Phase 1 L2：销毁门控对称——destroyed 后 collect no-op，
    // 阻断陈旧 runtime 闭包（animator 残留 tick / reload 旧 pipeline）向已销毁 collector 写入。
    if (this.destroyed) return;
    const list = Array.isArray(entries) ? entries : [entries];
    for (const entry of list) {
      if (entry.value === undefined) continue;
      let byProperty = this.pending.get(entry.symbolId);
      if (!byProperty) {
        byProperty = new Map<string, unknown>();
        this.pending.set(entry.symbolId, byProperty);
      }
      byProperty.set(entry.property, entry.value);
    }
  }

  hasPending(): boolean {
    return this.pending.size > 0;
  }

  /** 帧对齐：一次帧调度窗口内多次调用收敛为单次帧尾 flush；帧内无写入不触发渲染请求。 */
  requestRender(onFrame?: () => void): void {
    if (this.frameScheduled || this.destroyed) return;
    if (this.pending.size === 0) return;
    this.frameScheduled = true;
    this.cancelTick = this.scheduleTick(() => {
      this.frameScheduled = false;
      this.cancelTick = undefined;
      onFrame?.();
    });
  }

  /** 帧尾批量写：合并帧一次性写入，单次 applyAttrs 调用。返回是否发生写入。 */
  flush(applyAttrs: ApplyAttrs): boolean {
    // plan 2026-08-04-2243-1 Phase 1 L2：销毁门控对称——destroyed 后 flush no-op 返 false。
    if (this.destroyed) return false;
    if (this.pending.size === 0) return false;
    const attrs: Record<string, Partial<ScadaSymbolProps>> = {};
    for (const [symbolId, byProperty] of this.pending) {
      attrs[symbolId] = Object.fromEntries(byProperty) as Partial<ScadaSymbolProps>;
    }
    this.pending.clear();
    applyAttrs(attrs);
    return true;
  }

  /** 强制帧尾批量写（测试/性能测量用）：取消挂起的帧调度并立即 flush。 */
  flushFrame(applyAttrs: ApplyAttrs): boolean {
    // plan 2026-08-04-2243-1 Phase 1 L2：销毁门控对称——destroyed 后 flushFrame no-op 返 false。
    if (this.destroyed) return false;
    this.cancelTick?.();
    this.cancelTick = undefined;
    this.frameScheduled = false;
    return this.flush(applyAttrs);
  }

  destroy(): void {
    this.destroyed = true;
    this.cancelTick?.();
    this.cancelTick = undefined;
    this.frameScheduled = false;
    this.pending.clear();
  }
}
