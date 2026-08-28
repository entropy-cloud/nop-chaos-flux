import type { ScadaPointDeclaration, ScadaPrimitive } from '../serialization/config-types.js';

export type ScadaPointValue = ScadaPrimitive;

export interface ScadaPointState {
  value?: ScadaPrimitive;
  dirty: boolean;
  declaration: ScadaPointDeclaration;
}

export interface ScadaPointChangeEvent {
  pointId: string;
  value: ScadaPrimitive;
  prev: ScadaPrimitive | undefined;
  state?: string;
}

export type PointChangeListener = (payload: ScadaPointChangeEvent) => void;

export type Unsubscribe = () => void;

export type EventListener<Args extends unknown[]> = (...args: Args) => void;

export interface EventHubOptions {
  /**
   * 单监听器异常隔离（plan 2026-08-04-1558-2 Phase 2 OP-3）：emit 时某监听器 throw
   * 不中断剩余监听器；异常经此回调上报（去重由调用方决定）。缺省吞掉异常。
   */
  onListenerError?: (error: unknown) => void;
}

export class EventHub<E> {
  private listeners = new Map<keyof E, Set<(...args: unknown[]) => void>>();
  private readonly onListenerError: (error: unknown) => void;

  constructor(options?: EventHubOptions) {
    this.onListenerError = options?.onListenerError ?? (() => undefined);
  }

  on<K extends keyof E>(event: K, cb: E[K]): Unsubscribe {
    const listener = cb as (...args: unknown[]) => void;
    const list = this.listeners.get(event) ?? new Set<(...args: unknown[]) => void>();
    list.add(listener);
    this.listeners.set(event, list);
    return () => this.off(event, cb);
  }

  off<K extends keyof E>(event: K, cb: E[K]): void {
    const list = this.listeners.get(event);
    if (!list) return;
    list.delete(cb as (...args: unknown[]) => void);
    if (list.size === 0) this.listeners.delete(event);
  }

  emit<K extends keyof E>(event: K, ...args: E[K] extends EventListener<infer Args> ? Args : never[]): void {
    for (const cb of this.listeners.get(event) ?? []) {
      try {
        cb(...args);
      } catch (error) {
        this.onListenerError(error);
      }
    }
  }

  /**
   * 带 per-emit 错误归属的派发（plan 2026-08-05-0653-3 B5）：订阅者异常经 `onError` 回调上报，
   * 使调用方可在闭包内捕获正确的 context pointId，消除 `lastNotifyPointId` 可变字段在 re-entrant
   * `setPointValue` 下的覆盖竞态。
   */
  emitWith<K extends keyof E>(
    event: K,
    onError: (error: unknown) => void,
    ...args: E[K] extends EventListener<infer Args> ? Args : never[]
  ): void {
    for (const cb of this.listeners.get(event) ?? []) {
      try {
        cb(...args);
      } catch (error) {
        onError(error);
      }
    }
  }

  removeAll(): void {
    this.listeners.clear();
  }
}

export interface PointStoreEvents {
  'point:change': (payload: ScadaPointChangeEvent) => void;
}

interface PointEntry {
  declaration: ScadaPointDeclaration;
  value?: ScadaPrimitive;
  dirty: boolean;
}

function initialValue(declaration: ScadaPointDeclaration): ScadaPrimitive | undefined {
  if (declaration.source === 'static') {
    return declaration.value ?? declaration.init;
  }
  return declaration.init;
}

function isLinearScale(
  scale: ScadaPointDeclaration['scale'],
): scale is { k?: number; b?: number } {
  if (scale === undefined) return false;
  return !('expression' in scale);
}

function applyLinearScale(value: ScadaPrimitive, scale: { k?: number; b?: number }): ScadaPrimitive {
  if (typeof value !== 'number') return value;
  const k = scale.k ?? 1;
  const b = scale.b ?? 0;
  return k * value + b;
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// plan 2026-08-09-0121-2 Workstream A 本轮-4/F9：subscriber-error 去重 Set 上限（防长会话无界增长）。
// 超限整体清空（report-once-until-reset，可接受同错误 reset 后再报一次），与 event-bridge 同形。
const MAX_REPORTED_SUBSCRIBER_ERRORS = 256;

/**
 * 点表 store（I6.1）：三源声明加载 + 统一写入归口（去重/死区/量程换算）+ 订阅协议 + point:change 事件。
 *
 * 纯逻辑域核心（无 React 依赖）。flux 桥接与协议适配器统一经 `setPointValues` 注入。
 *
 * plan 2026-08-04-1558-2 Phase 2 OP-3：`point:change` 订阅者异常隔离——单订阅者 throw 不中断
 * 剩余订阅者与批量写入循环；异常经 `onSubscriberError` 去重上报（同 pointId 同 message 仅一次）。
 */
export interface PointStoreOptions {
  onSubscriberError?: (pointId: string, error: unknown) => void;
}

export class PointStore {
  private entries = new Map<string, PointEntry>();
  private subscribers = new Map<string, Set<PointChangeListener>>();
  private readonly hub = new EventHub<PointStoreEvents>();
  private dirtyPointIds = new Set<string>();
  private reportedSubscriberErrors = new Set<string>();
  private readonly onSubscriberError?: (pointId: string, error: unknown) => void;
  // plan 2026-08-05-1253-1 Phase 3（open-audit P2-2）：点集/点值变更代际计数器。
  // 仅在真正改写点值/点集的入口 bump（applyValue 命中变更 / loadDeclarations / restoreValues / reset）；
  // 只读/订阅路径不 bump。useScadaPointsBridge 据此 memoize 全量 point-values 快照，
  // point 值未变时复用快照（scope-only 变更不触发快照重建）。
  private generation = 0;

  constructor(options?: PointStoreOptions) {
    this.onSubscriberError = options?.onSubscriberError;
  }

  /** 点集/点值变更代际（每次真正改写点值/点集 +1，供 bridge memoize 快照）。 */
  getGeneration(): number {
    return this.generation;
  }

  loadDeclarations(declarations: ScadaPointDeclaration[]): void {
    for (const declaration of declarations) {
      this.entries.set(declaration.id, {
        declaration,
        value: initialValue(declaration),
        dirty: false,
      });
    }
    // 直写 entries 不经 applyValue：新增点 id 必须触发快照重建（新 id 进入 pointIds）。
    this.generation++;
  }

  reset(): void {
    this.entries.clear();
    this.subscribers.clear();
    this.dirtyPointIds.clear();
    this.hub.removeAll();
    this.reportedSubscriberErrors.clear();
    // 点集清空：快照必须重建（否则返回 stale 旧值）。
    this.generation++;
  }

  has(pointId: string): boolean {
    return this.entries.has(pointId);
  }

  getPointValue(pointId: string): ScadaPrimitive | undefined {
    return this.entries.get(pointId)?.value;
  }

  getPointState(pointId: string): ScadaPointState | undefined {
    const entry = this.entries.get(pointId);
    if (!entry) return undefined;
    return { value: entry.value, dirty: entry.dirty, declaration: entry.declaration };
  }

  setPointValue(pointId: string, value: ScadaPrimitive): boolean {
    return this.applyValue(pointId, value);
  }

  setPointValues(values: Record<string, ScadaPrimitive>): void {
    for (const [pointId, value] of Object.entries(values)) {
      this.applyValue(pointId, value);
    }
  }

  /**
   * FUXA 订阅协议蓝本：按点表 id 集合订阅，内部索引维护。
   * 返回退订函数；重复订阅同一 pointId+cb 幂等。
   */
  subscribe(pointIds: string[], cb: PointChangeListener): Unsubscribe {
    const targets = new Set<string>();
    for (const pointId of pointIds) {
      if (!this.entries.has(pointId)) continue;
      targets.add(pointId);
      const list = this.subscribers.get(pointId) ?? new Set<PointChangeListener>();
      list.add(cb);
      this.subscribers.set(pointId, list);
    }
    return () => {
      for (const pointId of targets) {
        const list = this.subscribers.get(pointId);
        if (!list) continue;
        list.delete(cb);
        if (list.size === 0) this.subscribers.delete(pointId);
      }
    };
  }

  on(event: 'point:change', cb: (payload: ScadaPointChangeEvent) => void): Unsubscribe {
    return this.hub.on(event, cb);
  }

  drainDirtyPointIds(): string[] {
    const ids = [...this.dirtyPointIds];
    this.dirtyPointIds.clear();
    for (const pointId of ids) {
      const entry = this.entries.get(pointId);
      if (entry) entry.dirty = false;
    }
    return ids;
  }

  /** 表达式源点 id 集合（source='expression'，供流水线初始同步/依赖链重算）。 */
  expressionPointIds(): string[] {
    const ids: string[] = [];
    for (const [pointId, entry] of this.entries) {
      if (entry.declaration.source === 'expression') ids.push(pointId);
    }
    return ids;
  }

  /** 全部已声明点 id（首帧初始绘制用）。 */
  pointIds(): string[] {
    return [...this.entries.keys()];
  }

  /**
   * 现存点值快照（plan 2026-08-04-1558-2 Phase 1）：reloadBindings 前快照，
   * `restoreValues` 直接回填（不经 applyValue → 不二次施加线性 scale，m2）。
   * 仅记录已写入值（undefined 不视为 live 值）。
   */
  snapshotValues(): Map<string, ScadaPrimitive> {
    const out = new Map<string, ScadaPrimitive>();
    for (const [pointId, entry] of this.entries) {
      if (entry.value !== undefined) out.set(pointId, entry.value);
    }
    return out;
  }

  /**
   * 按 pointId 直接回填快照值（绕过 convert/applyValue，避免对已换算值二次 scale）。
   * 声明不存在的 id 丢弃；命中 entry 标脏以触发后续绑定重算。仅供 reloadBindings 保留 live 值用。
   */
  restoreValues(snapshot: Map<string, ScadaPrimitive>): void {
    for (const [pointId, value] of snapshot) {
      const entry = this.entries.get(pointId);
      if (!entry) continue;
      entry.value = value;
      entry.dirty = true;
      this.dirtyPointIds.add(pointId);
    }
    // 直写 entries（绕过 applyValue）：回填的 live 值进入快照，必须触发重建。
    this.generation++;
  }

  private applyValue(pointId: string, raw: ScadaPrimitive): boolean {
    const entry = this.entries.get(pointId);
    if (!entry) return false;
    const next = this.convert(entry, raw);
    const prev = entry.value;
    if (Object.is(prev, next)) return false;
    if (this.withinDeadband(entry, prev, next)) return false;
    entry.value = next;
    entry.dirty = true;
    this.dirtyPointIds.add(pointId);
    // 命中真实变更才 bump（point 值未变时 bridge 可复用快照）。
    this.generation++;
    const payload: ScadaPointChangeEvent = { pointId, value: next, prev };
    // plan 2026-08-05-0653-3 B5：用 emitWith 携 per-emit 闭包捕获当前 pointId，消除 re-entrant
    // setPointValue 下 lastNotifyPointId 可变字段被覆盖的归属竞态——错误始终归属正在派发的 pointId。
    this.hub.emitWith('point:change', (error) => this.reportSubscriberError(pointId, error), payload);
    for (const cb of this.subscribers.get(pointId) ?? []) {
      try {
        cb(payload);
      } catch (error) {
        this.reportSubscriberError(pointId, error);
      }
    }
    return true;
  }

  private reportSubscriberError(pointId: string, error: unknown): void {
    const key = `${pointId}:${errorMessageOf(error)}`;
    if (this.reportedSubscriberErrors.has(key)) return;
    // plan 2026-08-09-0121-2 Workstream A 本轮-4/F9：去重 Set 上限（防无界增长）。键已含 pointId 维度
    // （同文案异 pointId 错误不互吞）；超限整体清空，可接受同错误 reset 后再报一次（report-once-until-reset）。
    if (this.reportedSubscriberErrors.size >= MAX_REPORTED_SUBSCRIBER_ERRORS) {
      this.reportedSubscriberErrors.clear();
    }
    this.reportedSubscriberErrors.add(key);
    this.onSubscriberError?.(pointId, error);
  }

  private convert(entry: PointEntry, raw: ScadaPrimitive): ScadaPrimitive {
    const scale = entry.declaration.scale;
    if (entry.declaration.source === 'expression') return raw;
    if (isLinearScale(scale)) return applyLinearScale(raw, scale);
    return raw;
  }

  private withinDeadband(entry: PointEntry, prev: ScadaPrimitive | undefined, next: ScadaPrimitive): boolean {
    const deadband = entry.declaration.deadband;
    if (deadband === undefined || deadband <= 0) return false;
    if (typeof prev !== 'number' || typeof next !== 'number') return false;
    return Math.abs(next - prev) < deadband;
  }
}
