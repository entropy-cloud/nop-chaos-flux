import type { ScadaAnimation, ScadaPrimitive, ScadaStateDeclaration } from '../serialization/config-types.js';
import type { ScadaSymbolProps, ScadaSymbolStylePatch } from '../symbols/symbol-types.js';
import { EventHub, PointStore, type Unsubscribe } from './point-store.js';
import { ReverseIndex } from './reverse-index.js';
import { BindResolver } from './bind-resolver.js';
import { ExpressionEvaluator } from './expression-evaluator.js';
import { resolveState } from './value-to-state.js';
import { Animator } from './animator.js';

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

const MAX_EXPRESSION_ITERATIONS = 10000;

export interface RefreshPipelineOptions {
  pointStore: PointStore;
  reverseIndex: ReverseIndex;
  collector: DirtyCollector;
  /** 图元状态声明查询（图元节点 `states` 字段）。 */
  getStates?: (symbolId: string) => ScadaStateDeclaration | undefined;
  /** 图元级动画声明查询（图元节点 `animations` 字段，`when: 'always' | { state }`）。 */
  getAnimations?: (symbolId: string) => ScadaAnimation[] | undefined;
  /**
   * 全部图元 id 查询（plan 2026-08-04-1558-2 Phase 2 SL-1/m1）：首次全量同步遍历全部动画承载图元，
   * 覆盖无 states 且无绑定图元的 `when:'always'` 动画启动（仅 collectStates 路径会漏掉这类图元）。
   */
  getSymbolIds?: () => string[];
  /** 状态动画引擎（状态联动：进入状态启动、退出停止）。 */
  animator?: Animator;
  onStateChange?: (payload: { symbolId: string; state: string }) => void;
  onError?: (message: string) => void;
  scheduleTick?: FrameScheduler;
  /** 表达式点重算迭代预算（安全网；默认 10000，测试可调小）。 */
  maxExpressionIterations?: number;
}

export interface RefreshPipelineEvents {
  'state:change': (payload: { symbolId: string; state: string }) => void;
}

/**
 * 刷新流水线编排（I6.2/I6.3，dirty-collector 承担）：
 * 脏点 → 表达式点依赖链重算（递归求值 + 环检测）→ 反向索引定位 → 绑定求值 → 状态判定 →
 * 样式覆盖 patch 汇入帧内脏收集 → 帧尾 `engine.applyAttrs` 单次批量写（A5 合帧义务）。
 */
export class RefreshPipeline {
  private readonly evaluator: ExpressionEvaluator;
  private readonly resolver: BindResolver;
  private readonly scheduleTick: TickScheduler;
  private readonly maxExpressionIterations: number;
  private readonly events = new EventHub<RefreshPipelineEvents>();
  private readonly lastDeps = new Map<string, string[]>();
  private readonly lastState = new Map<string, string>();
  private readonly lastError = new Set<string>();
  private synced = false;
  private frameScheduled = false;
  private cancelFrame: (() => void) | undefined;

  constructor(private readonly options: RefreshPipelineOptions) {
    this.scheduleTick = createTickScheduler(options.scheduleTick);
    this.maxExpressionIterations = options.maxExpressionIterations ?? MAX_EXPRESSION_ITERATIONS;
    this.evaluator = new ExpressionEvaluator({
      getPointValue: (pointId) => this.resolvePointValue(pointId),
      hasPoint: (pointId) => this.options.pointStore.has(pointId),
      getPointExpression: (pointId) => {
        const state = this.options.pointStore.getPointState(pointId);
        return state?.declaration.source === 'expression' ? state.declaration.expression : undefined;
      },
    });
    this.resolver = new BindResolver({
      getPointValue: (pointId) => this.options.pointStore.getPointValue(pointId),
      evaluate: (expression) => {
        const result = this.evaluator.evaluate(expression);
        if (!result.ok) {
          this.reportError(expression, result.error);
          return undefined;
        }
        this.lastError.delete(expression);
        return result.value;
      },
    });
  }

  getEvaluator(): ExpressionEvaluator {
    return this.evaluator;
  }

  getResolver(): BindResolver {
    return this.resolver;
  }

  /** state:change 订阅（统一发射出口，I11 触发器体系评估的输入源）。 */
  on(event: 'state:change', cb: (payload: { symbolId: string; state: string }) => void): Unsubscribe {
    return this.events.on(event, cb);
  }

  flushFrame(applyAttrs: ApplyAttrs): boolean {
    let changed: string[];
    if (!this.synced) {
      this.synced = true;
      for (const pointId of this.options.pointStore.expressionPointIds()) {
        this.syncExpressionPoint(pointId);
      }
      this.options.pointStore.drainDirtyPointIds();
      changed = this.options.pointStore.pointIds();
      // SL-1/m1：首次同步启动全部 when:'always' 动画（含无 states/无绑定图元），在脏检查早退之前——
      // 无点/无绑定图元的 always 动画不依赖脏点驱动，否则被下方 `changed.length === 0` 早退跳过。
      this.startAlwaysAnimations();
    } else {
      changed = this.options.pointStore.drainDirtyPointIds();
    }
    if (changed.length === 0 && !this.options.collector.hasPending()) return false;
    this.recomputeExpressionPoints(changed);
    const recomputed = this.options.pointStore.drainDirtyPointIds();
    this.collectBindings([...changed, ...recomputed]);
    return this.options.collector.flush(applyAttrs);
  }

  /** 帧对齐（与 animator 时钟共享调度语义）：一帧窗口内多次写入合并为帧尾单次批量写。 */
  requestRender(applyAttrs: ApplyAttrs): void {
    if (this.frameScheduled) return;
    this.frameScheduled = true;
    this.cancelFrame = this.scheduleTick(() => {
      this.frameScheduled = false;
      this.cancelFrame = undefined;
      this.flushFrame(applyAttrs);
    });
  }

  destroy(): void {
    this.cancelFrame?.();
    this.cancelFrame = undefined;
    this.frameScheduled = false;
    this.options.collector.destroy();
    this.evaluator.clear();
    this.lastDeps.clear();
    this.lastState.clear();
    this.lastError.clear();
  }

  /**
   * `when:'always'` 动画首次全量启动（plan 2026-08-04-1558-2 Phase 2 SL-1/m1）：
   * collectStates 仅覆盖有 states 且被脏点触碰的图元——无 states/无绑定图元的 always 动画
   * 从不进入该路径而静默 no-op。首次同步遍历全部动画承载图元统一 `animator.start`（幂等），
   * 覆盖 validate 接受但 collectStates 漏掉的图元。config 变更经 reloadBindings 重建 pipeline
   * → synced=false → 首同步重跑，新增图元的 always 动画随之启动。
   */
  private startAlwaysAnimations(): void {
    const animator = this.options.animator;
    const getSymbolIds = this.options.getSymbolIds;
    if (!animator || !getSymbolIds) return;
    const getAnimations = this.options.getAnimations;
    if (!getAnimations) return;
    for (const symbolId of getSymbolIds()) {
      const animations = getAnimations(symbolId);
      if (!animations) continue;
      for (const animation of animations) {
        if (animation.when === 'always') {
          animator.start(symbolId, animation);
        }
      }
    }
  }

  /** 表达式点递归求值（经 evaluator 上下文注入）：环检测（active 栈）+ 求值结果回写 store。 */
  private resolvePointValue(pointId: string): ScadaPrimitive | undefined {
    const state = this.options.pointStore.getPointState(pointId);
    if (!state) return undefined;
    if (state.declaration.source !== 'expression') return state.value;
    const result = this.evaluator.evaluatePoint(pointId);
    if (!result.ok) throw new Error(result.error);
    this.options.pointStore.setPointValue(pointId, result.value);
    return result.value;
  }

  private recomputeExpressionPoints(changedPointIds: string[]): void {
    const queue = [...changedPointIds];
    let budget = this.maxExpressionIterations;
    while (queue.length > 0) {
      if (--budget < 0) {
        this.options.onError?.('expression recompute exceeded iteration budget');
        break;
      }
      const pointId = queue.shift() as string;
      this.evaluator.invalidate(pointId);
      for (const [expressionPointId, deps] of this.lastDeps) {
        if (!deps.includes(pointId)) continue;
        if (this.syncExpressionPoint(expressionPointId)) {
          queue.push(expressionPointId);
        }
      }
    }
  }

  /** 求值表达式点并回写 store；返回该点值是否变化（变化需传播给依赖它的表达式点）。 */
  private syncExpressionPoint(pointId: string): boolean {
    const result = this.evaluator.evaluatePoint(pointId);
    this.lastDeps.set(pointId, this.evaluator.dependenciesOf(this.expressionTextOf(pointId)));
    if (!result.ok) {
      this.reportError(pointId, result.error);
      return false;
    }
    this.lastError.delete(pointId);
    return this.options.pointStore.setPointValue(pointId, result.value);
  }

  private expressionTextOf(pointId: string): string {
    const state = this.options.pointStore.getPointState(pointId);
    return state?.declaration.expression ?? '';
  }

  private collectBindings(pointIds: string[]): void {
    const touchedSymbols = new Set<string>();
    for (const pointId of pointIds) {
      for (const target of this.options.reverseIndex.lookup(pointId)) {
        touchedSymbols.add(target.symbolId);
        const bindings = this.options.reverseIndex.getBindings(target.symbolId);
        const binding = bindings?.[target.property];
        if (!binding) continue;
        const value = this.resolver.resolveBinding(binding);
        if (value !== undefined) {
          this.options.collector.collect({ symbolId: target.symbolId, property: target.property, value });
        }
      }
    }
    this.collectStates(touchedSymbols);
  }

  /** 状态判定（value-to-state 纯逻辑）+ 样式覆盖 patch 汇入脏收集 + state:change 事件（仅切换时）+ 动画启停联动。 */
  private collectStates(symbolIds: Set<string>): void {
    for (const symbolId of symbolIds) {
      const declaration = this.options.getStates?.(symbolId);
      if (!declaration) continue;
      const primary = this.options.reverseIndex.lookupSymbol(symbolId)[0];
      if (!primary) continue;
      const raw = this.options.pointStore.getPointValue(primary.pointId);
      const state = resolveState(declaration, raw);
      const prev = this.lastState.get(symbolId);
      if (prev !== state) {
        this.lastState.set(symbolId, state);
        this.options.onStateChange?.({ symbolId, state });
        this.events.emit('state:change', { symbolId, state });
        this.applyAnimationLinkage(symbolId, declaration, prev, state);
      }
      const style = declaration.states[state]?.style as ScadaSymbolStylePatch | undefined;
      if (style) {
        for (const [property, value] of Object.entries(style)) {
          if (value !== undefined) {
            this.options.collector.collect({ symbolId, property, value });
          }
        }
      }
    }
  }

  /** 状态→动画联动：进入状态启动（state 级 + when:{state} 匹配）、退出状态停止（当: 状态级动画）。 */
  private applyAnimationLinkage(
    symbolId: string,
    declaration: ScadaStateDeclaration,
    prev: string | undefined,
    current: string,
  ): void {
    const animator = this.options.animator;
    if (!animator) return;
    for (const animation of this.options.getAnimations?.(symbolId) ?? []) {
      if (animation.when === 'always') {
        animator.start(symbolId, animation);
      } else if (animation.when !== undefined && 'state' in animation.when) {
        if (animation.when.state === current) animator.start(symbolId, animation);
        else if (prev !== undefined) animator.stop(symbolId, animation.kind);
      }
    }
    if (prev !== undefined) {
      for (const animation of declaration.states[prev]?.animations ?? []) {
        animator.stop(symbolId, animation.kind);
      }
    }
    for (const animation of declaration.states[current]?.animations ?? []) {
      animator.start(symbolId, animation);
    }
  }

  private reportError(key: string, error: string): void {
    if (this.lastError.has(key)) return;
    this.lastError.add(key);
    this.options.onError?.(error);
  }
}
