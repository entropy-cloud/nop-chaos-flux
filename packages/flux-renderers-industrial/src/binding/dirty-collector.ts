import { getIn, type ExpressionCompiler, type RendererEnv } from '@nop-chaos/flux-core';
import type { ScadaAnimation, ScadaPrimitive, ScadaStateDeclaration } from '../serialization/config-types.js';
import type { ScadaSymbolProps, ScadaSymbolStylePatch } from '../symbols/symbol-types.js';
import { EventHub, PointStore, type Unsubscribe } from './point-store.js';
import { ReverseIndex, type SymbolBindingTarget } from './reverse-index.js';
import { BindResolver } from './bind-resolver.js';
import { isScadaPrimitive, extractExpressionDepsViaProbe } from './flux-eval.js';
import { resolveState, type ResolveStateOptions } from './value-to-state.js';
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

const MAX_EXPRESSION_ITERATIONS = 10000;

/**
 * 表达式点环检测信号（I18 binding-cycle Failure Path）：求值期遇 re-enter 同一点时抛出。
 * `evaluateFlux` 的 catch 仅吞 compile/evaluate 异常返回 undefined；本类型经 `findCircularDependencyError`
 * 守卫后重新抛出**原始** `CircularDependencyError`（沿 `Error.cause` 链解包），使环错误能上传到
 * `syncExpressionPoint` 的 try/catch → `reportError(pointId, 'circular dependency involving point: ...')`，
 * 保留既有失败路径语义（受影响图元保持上一有效值）。
 *
 * 必须解包到原始 `CircularDependencyError` 而非保留包装层——flux-formula `formulaCompiler.exec` 把求值期
 * 异常包装成 `Error('Expression evaluation failed for: ...')`（cause=原始）后重新抛出，多层嵌套求值会
 * 叠加多层包装。直接抛包装层会使 `error.message` 变成 'Expression evaluation failed for: ...'，
 * 失去 binding-cycle 语义；解包后 `error.message` = 'circular dependency involving point: ...'，与
 * Failure Path 表述一致。
 */
export class CircularDependencyError extends Error {
  readonly isCircularDependency = true;
  constructor(pointId: string) {
    super(`circular dependency involving point: ${pointId}`);
    this.name = 'CircularDependencyError';
  }
}

export function findCircularDependencyError(error: unknown): CircularDependencyError | undefined {
  let current: unknown = error;
  let depth = 0;
  while (current && typeof current === 'object' && depth < 10) {
    if (current instanceof CircularDependencyError) return current;
    const cause = (current as { cause?: unknown }).cause;
    if (cause === current || cause === undefined) break;
    current = cause;
    depth++;
  }
  return undefined;
}

export interface RefreshPipelineOptions {
  pointStore: PointStore;
  reverseIndex: ReverseIndex;
  collector: DirtyCollector;
  /**
   * 平台表达式编译器（I18 表达式一元化）：binding.expression / scale.expression /
   * source:'expression' 点经 flux compiler 求值。缺省时表达式面不工作（仅点表绑定）。
   * 由 bridge 层在构造 pipeline 时注入（`useScadaPointsBridge` 持 expressionCompiler）。
   */
  compiler?: ExpressionCompiler;
  /** flux 求值环境（与 compiler 配对，由 bridge 层注入）。 */
  env?: RendererEnv;
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
  private readonly resolver: BindResolver;
  private readonly scheduleTick: TickScheduler;
  private readonly maxExpressionIterations: number;
  private readonly events = new EventHub<RefreshPipelineEvents>();
  private readonly lastDeps = new Map<string, string[]>();
  private readonly lastState = new Map<string, string>();
  private readonly lastError = new Set<string>();
  private readonly compiledCache = new Map<string, ReturnType<ExpressionCompiler['compileValue']>>();
  private readonly active = new Set<string>();
  private scopeData: Record<string, unknown> = {};
  private scopeDirty = false;
  private synced = false;
  private frameScheduled = false;
  private cancelFrame: (() => void) | undefined;
  // plan 2026-08-04-2243-1 Phase 1 L1：销毁门控镜像 DirtyCollector——destroy 后 requestRender/flushFrame
  // 入口 no-op，阻断 config reload 期 use-scada-points-bridge eval effect 持有的旧 runtime 闭包重激活已销毁 pipeline。
  private destroyed = false;

  constructor(private readonly options: RefreshPipelineOptions) {
    this.scheduleTick = createTickScheduler(options.scheduleTick);
    this.maxExpressionIterations = options.maxExpressionIterations ?? MAX_EXPRESSION_ITERATIONS;
    this.resolver = new BindResolver({
      getPointValue: (pointId) => this.options.pointStore.getPointValue(pointId),
      evaluate: (expression) => this.evaluateBindingExpression(expression),
    });
  }

  /** bridge 层注入 scope 快照（I18 表达式一元化）：供 binding/scale 表达式求值读取 scope 成员。 */
  updateScopeData(data: Record<string, unknown>): void {
    this.scopeData = data;
    this.scopeDirty = true;
  }

  getResolver(): BindResolver {
    return this.resolver;
  }

  /** state:change 订阅（统一发射出口，I11 触发器体系评估的输入源）。 */
  on(event: 'state:change', cb: (payload: { symbolId: string; state: string }) => void): Unsubscribe {
    return this.events.on(event, cb);
  }

  flushFrame(applyAttrs: ApplyAttrs): boolean {
    // plan 2026-08-04-2243-1 Phase 1 L1：销毁门控——destroy 后 flushFrame no-op 返 false。
    if (this.destroyed) return false;
    const wasScopeDirty = this.scopeDirty;
    this.scopeDirty = false;
    let changed: string[];
    if (!this.synced) {
      this.synced = true;
      for (const pointId of this.options.pointStore.expressionPointIds()) {
        this.syncExpressionPoint(pointId);
      }
      this.options.pointStore.drainDirtyPointIds();
      // I18：首次同步含 reverse-index point refs（直连 scope 绑定无点表但有 reverse-index 条目）。
      changed = [
        ...new Set([
          ...this.options.pointStore.pointIds(),
          ...this.options.reverseIndex.pointIds(),
        ]),
      ];
      // SL-1/m1：首次同步启动全部 when:'always' 动画（含无 states/无绑定图元），在脏检查早退之前——
      // 无点/无绑定图元的 always 动画不依赖脏点驱动，否则被下方 `changed.length === 0` 早退跳过。
      this.startAlwaysAnimations();
    } else {
      changed = this.options.pointStore.drainDirtyPointIds();
      // I18：scope 变化时全量重算绑定（直连 scope 绑定不依赖脏点）。
      if (wasScopeDirty && changed.length === 0) {
        changed = this.options.reverseIndex.pointIds();
      }
    }
    if (changed.length === 0 && !this.options.collector.hasPending()) return false;
    this.recomputeExpressionPoints(changed);
    const recomputed = this.options.pointStore.drainDirtyPointIds();
    this.collectBindings([...changed, ...recomputed]);
    return this.options.collector.flush(applyAttrs);
  }

  /** 帧对齐（与 animator 时钟共享调度语义）：一帧窗口内多次写入合并为帧尾单次批量写。 */
  requestRender(applyAttrs: ApplyAttrs): void {
    // plan 2026-08-04-2243-1 Phase 1 L1：销毁门控——destroy 后 requestRender no-op。
    if (this.frameScheduled || this.destroyed) return;
    this.frameScheduled = true;
    this.cancelFrame = this.scheduleTick(() => {
      this.frameScheduled = false;
      this.cancelFrame = undefined;
      this.flushFrame(applyAttrs);
    });
  }

  destroy(): void {
    // plan 2026-08-04-2243-1 Phase 1 L3：collector 销毁单一 owner——pipeline.destroy() 内部销毁 collector
    // 为唯一路径（releaseRuntime 不再显式 collector.destroy()）。幂等守卫防二次调用重入。
    if (this.destroyed) return;
    this.destroyed = true;
    this.cancelFrame?.();
    this.cancelFrame = undefined;
    this.frameScheduled = false;
    this.options.collector.destroy();
    this.compiledCache.clear();
    this.active.clear();
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

  private recomputeExpressionPoints(changedPointIds: string[]): void {
    const queue = [...changedPointIds];
    let budget = this.maxExpressionIterations;
    while (queue.length > 0) {
      if (--budget < 0) {
        this.options.onError?.('expression recompute exceeded iteration budget');
        break;
      }
      const pointId = queue.shift() as string;
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
    const state = this.options.pointStore.getPointState(pointId);
    if (!state || state.declaration.source !== 'expression') return false;
    const expression = state.declaration.expression ?? '';
    this.lastDeps.set(pointId, this.probeDeps(expression));
    if (!this.options.compiler || !this.options.env) return false;
    try {
      const value = this.evaluateExpressionPoint(pointId);
      if (value === undefined) {
        this.reportError(pointId, 'expression evaluation failed');
        return false;
      }
      this.lastError.delete(pointId);
      return this.options.pointStore.setPointValue(pointId, value);
    } catch (error) {
      this.reportError(pointId, error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * 表达式点递归求值（I18 flux 一元化）：经 flux compiler 编译 + 私有求值 scope 求值。
   * 环检测（active 栈）保留（binding-cycle Failure Path）。不回写 store——由调用方写入。
   */
  private evaluateExpressionPoint(pointId: string): ScadaPrimitive | undefined {
    if (this.active.has(pointId)) {
      throw new CircularDependencyError(pointId);
    }
    const state = this.options.pointStore.getPointState(pointId);
    if (!state) return undefined;
    if (state.declaration.source !== 'expression') return state.value;
    this.active.add(pointId);
    try {
      return this.evaluateFlux(state.declaration.expression ?? '');
    } finally {
      this.active.delete(pointId);
    }
  }

  /** `${expr}` 编译 + 求值（缓存 compiled）。eval scope 合并 pointValues + scopeData（scope 胜出）。
   *
   * 异常策略：compile/evaluate 失败吞掉返回 undefined（由 syncExpressionPoint 上报 'expression evaluation failed'）；
   * 但 `CircularDependencyError` 经 `isCircularDependencyError` 守卫重新抛出，使 binding-cycle 失败路径
   * 在 syncExpressionPoint 的 try/catch 中以 'circular dependency involving point: ...' 上报（去重）。
   */
  private evaluateFlux(expression: string): ScadaPrimitive | undefined {
    if (!this.options.compiler || !this.options.env) return undefined;
    const normalized = expression.trim().startsWith('${') ? expression.trim() : `\${${expression.trim()}}`;
    let compiled = this.compiledCache.get(normalized);
    if (compiled === undefined) {
      try {
        compiled = this.options.compiler.compileValue(normalized);
      } catch (error) {
        const cycle = findCircularDependencyError(error);
        if (cycle) throw cycle;
        return undefined;
      }
      this.compiledCache.set(normalized, compiled);
    }
    const scope = this.buildEvalScope();
    try {
      const value = this.options.compiler.evaluateValue(compiled, scope, this.options.env);
      return isScadaPrimitive(value) ? value : undefined;
    } catch (error) {
      const cycle = findCircularDependencyError(error);
      if (cycle) throw cycle;
      return undefined;
    }
  }

  /** binding.expression / scale.expression 求值（经 flux compiler）。 */
  private evaluateBindingExpression(expression: string): ScadaPrimitive | undefined {
    if (!this.options.compiler || !this.options.env) return undefined;
    try {
      const value = this.evaluateFlux(expression);
      if (value === undefined) {
        this.reportError(expression, 'expression evaluation failed');
        return undefined;
      }
      this.lastError.delete(expression);
      return value;
    } catch (error) {
      this.reportError(expression, error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }

  /** 经 flux 探针提取表达式依赖路径（用作 point refs / 依赖链收集）。 */
  private probeDeps(expression: string): string[] {
    if (!this.options.compiler || !this.options.env) return [];
    const normalized = expression.trim().startsWith('${') ? expression.trim() : `\${${expression.trim()}}`;
    const result = extractExpressionDepsViaProbe(this.options.compiler, this.options.env, normalized);
    return result.status === 'ok' ? result.paths : [];
  }

  /**
   * 私有求值 scope（I18）：合并 pointValues + scopeData（scope 胜出，design-data-binding.md §9.1）。
   * 表达式点懒求值——eval scope.get(pointId) 触发递归求值（含 active 栈环检测）并回写 store。
   */
  private buildEvalScope() {
    const pointStore = this.options.pointStore;
    const data: Record<string, unknown> = {};
    for (const pointId of pointStore.pointIds()) {
      const state = pointStore.getPointState(pointId);
      if (state && state.value !== undefined && state.declaration.source !== 'expression') {
        data[pointId] = state.value;
      }
    }
    for (const [key, value] of Object.entries(this.scopeData)) {
      if (value !== undefined) data[key] = value;
    }
    return {
      id: 'scada-pipeline-eval',
      path: '$',
      value: data,
      get: (path: string) => {
        const val = getIn(data, path);
        if (val !== undefined) return val;
        const state = pointStore.getPointState(path);
        if (state?.declaration.source === 'expression') {
          const resolved = this.evaluateExpressionPoint(path);
          if (resolved !== undefined) pointStore.setPointValue(path, resolved);
          return resolved;
        }
        return state?.value;
      },
      has(path: string) {
        return this.get(path) !== undefined;
      },
      readOwn: () => data,
      readVisible: () => data,
      materializeVisible: () => data,
      update: () => undefined,
      merge: () => undefined,
    };
  }

  private collectBindings(pointIds: string[]): void {
    const touchedSymbols = new Set<string>();
    for (const pointId of pointIds) {
      for (const target of this.options.reverseIndex.lookup(pointId)) {
        touchedSymbols.add(target.symbolId);
        const bindings = this.options.reverseIndex.getBindings(target.symbolId);
        const binding = bindings?.[target.property];
        if (!binding) continue;
        const value = this.resolver.resolveBinding(binding, target.property);
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
      const primary = this.resolveStateDriver(symbolId, declaration);
      if (!primary) continue;
      const raw = this.options.pointStore.getPointValue(primary.pointId);
      const state = resolveState(declaration, raw, this.resolveStateScale(symbolId, primary));
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

  /**
   * state-driver 解析（plan 2026-08-05-0653-3 B3）：优先 consult `declaration.stateSource`，
   * 缺省时回落反向索引 `lookupSymbol(symbolId)[0]`（插入序）。
   * `stateSource` 格式 `"pointId"` 或 `"pointId.property"`；缺省 property 时取该 pointId 在此图元的首个绑定 property。
   */
  private resolveStateDriver(
    symbolId: string,
    declaration: ScadaStateDeclaration,
  ): SymbolBindingTarget | undefined {
    const targets = this.options.reverseIndex.lookupSymbol(symbolId);
    if (targets.length === 0) return undefined;
    const source = declaration.stateSource;
    if (source === undefined) return targets[0];
    const lastDot = source.lastIndexOf('.');
    const pointId = lastDot === -1 ? source : source.slice(0, lastDot);
    const property = lastDot === -1 ? undefined : source.slice(lastDot + 1);
    if (property !== undefined) {
      return targets.find((t) => t.pointId === pointId && t.property === property);
    }
    return targets.find((t) => t.pointId === pointId);
  }

  /**
   * 状态判定 scale 转发（plan 2026-08-04-1558-3 Phase 1，F4 语义）：
   * 判定作用于 point-store 存储值（声明级 scale 已在 convert 施加）。
   * binding.scale 仅在声明级无 scale、或与声明级为同一 scale 对象时转发，避免双重换算。
   */
  private resolveStateScale(symbolId: string, primary: SymbolBindingTarget): ResolveStateOptions | undefined {
    const binding = this.options.reverseIndex.getBindings(symbolId)?.[primary.property];
    const bindingScale = binding?.scale;
    if (bindingScale === undefined) return undefined;
    const declarationScale = this.options.pointStore.getPointState(primary.pointId)?.declaration.scale;
    if (declarationScale === undefined || bindingScale === declarationScale) {
      return { scale: bindingScale };
    }
    return undefined;
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
