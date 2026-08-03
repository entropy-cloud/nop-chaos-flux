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

export class EventHub<E> {
  private listeners = new Map<keyof E, Set<(...args: unknown[]) => void>>();

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
      cb(...args);
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

/**
 * 点表 store（I6.1）：三源声明加载 + 统一写入归口（去重/死区/量程换算）+ 订阅协议 + point:change 事件。
 *
 * 纯逻辑域核心（无 React 依赖）。flux 桥接与协议适配器统一经 `setPointValues` 注入。
 */
export class PointStore {
  private entries = new Map<string, PointEntry>();
  private subscribers = new Map<string, Set<PointChangeListener>>();
  private readonly events = new EventHub<PointStoreEvents>();
  private dirtyPointIds = new Set<string>();

  loadDeclarations(declarations: ScadaPointDeclaration[]): void {
    for (const declaration of declarations) {
      this.entries.set(declaration.id, {
        declaration,
        value: initialValue(declaration),
        dirty: false,
      });
    }
  }

  reset(): void {
    this.entries.clear();
    this.subscribers.clear();
    this.dirtyPointIds.clear();
    this.events.removeAll();
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
    return this.events.on(event, cb);
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
    const payload: ScadaPointChangeEvent = { pointId, value: next, prev };
    this.events.emit('point:change', payload);
    for (const cb of this.subscribers.get(pointId) ?? []) {
      cb(payload);
    }
    return true;
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
