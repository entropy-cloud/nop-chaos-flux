import { getIn, type ExpressionCompiler, type RendererEnv } from '@nop-chaos/flux-core';
import type { ScadaAnimation, ScadaPrimitive, ScadaStateDeclaration } from '../serialization/config-types.js';
import type { ScadaSymbolStylePatch } from '../symbols/symbol-types.js';
import { EventHub, PointStore, type Unsubscribe } from './point-store.js';
import { ReverseIndex, type SymbolBindingTarget } from './reverse-index.js';
import { BindResolver } from './bind-resolver.js';
import { isScadaPrimitive, extractExpressionDepsViaProbe } from './flux-eval.js';
import { resolveState, type ResolveStateOptions } from './value-to-state.js';
import { Animator } from './animator.js';
import {
  createTickScheduler,
  type ApplyAttrs,
  type TickScheduler,
  type FrameScheduler,
} from './dirty-collector.js';
import type { DirtyCollector } from './dirty-collector.js';
import { CircularDependencyError, findCircularDependencyError, type FluxEvalOutcome } from './expression-errors.js';

const MAX_EXPRESSION_ITERATIONS = 10000;

export interface RefreshPipelineOptions {
  pointStore: PointStore;
  reverseIndex: ReverseIndex;
  collector: DirtyCollector;
  compiler?: ExpressionCompiler;
  env?: RendererEnv;
  getStates?: (symbolId: string) => ScadaStateDeclaration | undefined;
  getAnimations?: (symbolId: string) => ScadaAnimation[] | undefined;
  getSymbolIds?: () => string[];
  animator?: Animator;
  onStateChange?: (payload: { symbolId: string; state: string }) => void;
  onError?: (code: string, message: string, error?: unknown) => void;
  scheduleTick?: FrameScheduler;
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
  // plan 2026-08-09-0121-2 Workstream A F8：表达式点依赖反向索引（depPointId → 依赖它的 exprPointId 集），
  // 使 recomputeExpressionPoints 由 O(n²) 线性扫描 lastDeps 降为 O(扇出) 查找。与 lastDeps 同步维护
  // （setExpressionDeps 单一入口：先撤旧反向边、再加新反向边），保证陈旧索引不漏触发/重复求值。
  private readonly reverseDeps = new Map<string, Set<string>>();
  private readonly lastState = new Map<string, string>();
  private readonly lastError = new Set<string>();
  private readonly compiledCache = new Map<string, ReturnType<ExpressionCompiler['compileValue']>>();
  private readonly active = new Set<string>();
  private scopeData: Record<string, unknown> = {};
  private scopeDirty = false;
  private synced = false;
  private frameScheduled = false;
  private cancelFrame: (() => void) | undefined;
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
    if (this.destroyed) return false;
    // P2-1 {binding,state} > animation 同属性优先级（plan 2026-08-06-0900-3 Phase 3）：
    // animator 经 collect 写入同一 pending Map，下方 collectBindings/collectStates 先于 collector.flush
    // → 脏帧 binding/state 覆盖同属性 animator 当帧增量（last-write-wins）。precedence 确定可预期，
    // 详见 design-data-binding.md §4.3「{binding,state} > animation 同属性优先级契约」。
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
    // plan 2026-08-09-0121-2 Workstream A F8：反向索引与 lastDeps 同生命周期释放。
    this.reverseDeps.clear();
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
        // plan 2026-08-05-2129-3 Phase 3：迭代预算超限为求值期安全网 → flux-evaluate-failed（对称码）。
        this.options.onError?.('flux-evaluate-failed', 'expression recompute exceeded iteration budget');
        break;
      }
      const pointId = queue.shift() as string;
      // plan 2026-08-09-0121-2 Workstream A F8：反向索引 O(扇出) 查找替代 lastDeps 全量线性扫描。
      const dependents = this.reverseDeps.get(pointId);
      if (!dependents) continue;
      for (const expressionPointId of dependents) {
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
    // plan 2026-08-09-0121-2 Workstream A F8：经 setExpressionDeps 单一入口同时维护 lastDeps + 反向索引。
    this.setExpressionDeps(pointId, this.probeDeps(expression));
    if (!this.options.compiler || !this.options.env) return false;
    try {
      const outcome = this.evaluateExpressionPoint(pointId);
      if (outcome.status === 'compile-failed') {
        this.reportError(pointId, 'flux-compile-failed', 'expression compilation failed', outcome.error);
        return false;
      }
      if (outcome.status === 'evaluate-failed') {
        this.reportError(pointId, 'flux-evaluate-failed', 'expression evaluation failed', outcome.error);
        return false;
      }
      if (outcome.value === undefined) {
        this.reportError(pointId, 'flux-evaluate-failed', 'expression evaluation failed');
        return false;
      }
      this.lastError.delete(pointId);
      return this.options.pointStore.setPointValue(pointId, outcome.value);
    } catch (error) {
      // CircularDependencyError 经 evaluateFlux 重新抛出到达此处；cycle 为求值期失败 → flux-evaluate-failed。
      this.reportError(
        pointId,
        'flux-evaluate-failed',
        error instanceof Error ? error.message : String(error),
        error,
      );
      return false;
    }
  }

  /**
   * 表达式点递归求值（I18 flux 一元化）：经 flux compiler 编译 + 私有求值 scope 求值。
   * 环检测（active 栈）保留（binding-cycle Failure Path）。不回写 store——由调用方写入。
   */
  private evaluateExpressionPoint(pointId: string): FluxEvalOutcome {
    if (this.active.has(pointId)) {
      throw new CircularDependencyError(pointId);
    }
    const state = this.options.pointStore.getPointState(pointId);
    if (!state) return { status: 'ok', value: undefined };
    if (state.declaration.source !== 'expression') return { status: 'ok', value: state.value };
    this.active.add(pointId);
    try {
      return this.evaluateFlux(state.declaration.expression ?? '');
    } finally {
      this.active.delete(pointId);
    }
  }

  /** `${expr}` 编译 + 求值（缓存 compiled）。eval scope 合并 pointValues + scopeData（scope 胜出）。 */
  private evaluateFlux(expression: string): FluxEvalOutcome {
    if (!this.options.compiler || !this.options.env) return { status: 'ok', value: undefined };
    const normalized = expression.trim().startsWith('${') ? expression.trim() : `\${${expression.trim()}}`;
    let compiled = this.compiledCache.get(normalized);
    if (compiled === undefined) {
      try {
        compiled = this.options.compiler.compileValue(normalized);
      } catch (error) {
        const cycle = findCircularDependencyError(error);
        if (cycle) throw cycle;
        return { status: 'compile-failed', error };
      }
      this.compiledCache.set(normalized, compiled);
    }
    const scope = this.buildEvalScope();
    try {
      const value = this.options.compiler.evaluateValue(compiled, scope, this.options.env);
      return { status: 'ok', value: isScadaPrimitive(value) ? value : undefined };
    } catch (error) {
      const cycle = findCircularDependencyError(error);
      if (cycle) throw cycle;
      return { status: 'evaluate-failed', error };
    }
  }

  /** binding.expression / scale.expression 求值（经 flux compiler）。 */
  private evaluateBindingExpression(expression: string): ScadaPrimitive | undefined {
    if (!this.options.compiler || !this.options.env) return undefined;
    try {
      const outcome = this.evaluateFlux(expression);
      if (outcome.status === 'compile-failed') {
        this.reportError(expression, 'flux-compile-failed', 'expression compilation failed', outcome.error);
        return undefined;
      }
      if (outcome.status === 'evaluate-failed') {
        this.reportError(expression, 'flux-evaluate-failed', 'expression evaluation failed', outcome.error);
        return undefined;
      }
      if (outcome.value === undefined) {
        this.reportError(expression, 'flux-evaluate-failed', 'expression evaluation failed');
        return undefined;
      }
      this.lastError.delete(expression);
      return outcome.value;
    } catch (error) {
      this.reportError(
        expression,
        'flux-evaluate-failed',
        error instanceof Error ? error.message : String(error),
        error,
      );
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
   * 表达式点依赖单一写入口（plan 2026-08-09-0121-2 Workstream A F8）：同步维护 lastDeps（exprPointId→deps）
   * 与反向索引 reverseDeps（depPointId→Set<exprPointId>）。deps 变化时先撤旧反向边再加新反向边，
   * 保证 recomputeExpressionPoints 的 O(扇出) 查找不读陈旧索引（Failure Paths FP-3 容差：下一帧 dirty-collector 修正）。
   */
  private setExpressionDeps(pointId: string, deps: string[]): void {
    const prev = this.lastDeps.get(pointId);
    if (prev) {
      for (const dep of prev) {
        const set = this.reverseDeps.get(dep);
        if (set) {
          set.delete(pointId);
          if (set.size === 0) this.reverseDeps.delete(dep);
        }
      }
    }
    this.lastDeps.set(pointId, deps);
    for (const dep of deps) {
      let set = this.reverseDeps.get(dep);
      if (!set) {
        set = new Set<string>();
        this.reverseDeps.set(dep, set);
      }
      set.add(pointId);
    }
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
          const outcome = this.evaluateExpressionPoint(path);
          const resolved = outcome.status === 'ok' ? outcome.value : undefined;
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

  private reportError(key: string, code: string, message: string, error?: unknown): void {
    if (this.lastError.has(key)) return;
    this.lastError.add(key);
    this.options.onError?.(code, message, error);
  }
}
