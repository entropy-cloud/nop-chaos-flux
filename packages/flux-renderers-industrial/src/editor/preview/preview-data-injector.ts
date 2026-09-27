import { PointStore } from '../../binding/point-store.js';
import { BindResolver, isBindableProperty } from '../../binding/bind-resolver.js';
import type { ScadaPrimitive } from '../../serialization/config-types.js';
import type { ScadaConfigDiff } from '../../serialization/config-types.js';
import type { ScadaConfig, ScadaSymbolNode } from '../../serialization/config-types.js';
import type { ScadaEditorMode } from '../editor-session.js';

/**
 * preview 态数据注入通道（plan 522 / L5.5，design-renderer.md §13.2）。
 *
 * **R5 边界增补（不泄漏验证 #5）**：注入是 preview 态专属视觉态——只改引擎场景节点属性，
 * 永不触碰 working copy / committedBaseline / undo 栈 / 序列化输出；edit 态 `inject` 自守 no-op；
 * `clear()` 把 touched 属性还原为原值，edit↔preview 往返后画布零残留。
 *
 * 复用管道：`binding/point-store.ts`（统一写入归口：量程换算/死区/去重）+
 * `binding/bind-resolver.ts`（point → expression → map → scale → format 解析优先级 + 可绑定属性过滤）。
 * expression 经可选注入的 `evaluate` 回调求值——无 evaluate 时跳过（完整表达式/scope 语义归运行态
 * scada-canvas，本通道是轻量属性注入通道，不复制 RefreshPipeline）。
 */

/** 注入引擎最小结构面（与 ScadaEditorEngine 结构兼容；测试用 fake 实现同接口）。 */
export interface PreviewInjectionSurface {
  getCurrentConfig(): ScadaConfig | null;
  getSymbolProps(id: string): Record<string, unknown> | undefined;
  /** 视觉态 patch 应用（updated 通道；不传 nextConfig → 引擎 config 模型不更新）。 */
  applyDiff(diff: Pick<ScadaConfigDiff, 'added' | 'removed' | 'updated'>): void;
  /** 当前模式（预览门控）。 */
  readonly currentMode: ScadaEditorMode;
}

export interface PreviewDataInjectorOptions {
  /** expression 绑定求值回调（host 注入；缺省跳过 expression 绑定）。 */
  evaluate?: (expression: string) => ScadaPrimitive | undefined;
}

interface VisualPatch {
  id: string;
  patch: Partial<ScadaSymbolNode>;
}

export class PreviewDataInjector {
  private readonly store = new PointStore();
  private readonly resolver: BindResolver;
  /** nodeId → (属性 → 注入前原值快照)（clear() 还原依据；首触时记录，非还原时回读）。 */
  private touched = new Map<string, Map<string, unknown>>();
  private mockTimer: ReturnType<typeof setInterval> | undefined;
  private mockTick = 0;
  private mockPointIds: string[] = [];

  constructor(
    private readonly engine: PreviewInjectionSurface,
    private readonly options: PreviewDataInjectorOptions = {},
  ) {
    this.resolver = new BindResolver({
      getPointValue: (pointId) => this.store.getPointValue(pointId),
      // 无 evaluate 回调时 expression 绑定恒 undefined → resolver 跳过（design-renderer.md §13.2 边界）。
      evaluate: this.options.evaluate ?? (() => undefined),
    });
  }

  /** preview 门控：edit 态 no-op 返回 0（design-renderer.md §13.4）。 */
  inject(values: Record<string, ScadaPrimitive>): number {
    if (this.engine.currentMode !== 'preview') return 0;
    this.syncDeclarations();
    this.store.setPointValues(values);
    return this.applyResolvedBindings();
  }

  /** 把引擎当前 config 的 variables 声明同步进 store（load/切换画面后无需额外接线）。 */
  syncDeclarations(): void {
    const declarations = this.engine.getCurrentConfig()?.variables ?? [];
    if (declarations.length > 0) this.store.loadDeclarations(declarations);
  }

  /** 还原全部 touched 属性为注入前原值快照（design-renderer.md §13.4 场景还原）。 */
  clear(): void {
    const patches: VisualPatch[] = [];
    for (const [id, originals] of this.touched) {
      if (originals.size === 0) continue;
      patches.push({ id, patch: Object.fromEntries(originals) as Partial<ScadaSymbolNode> });
    }
    this.touched = new Map();
    if (patches.length > 0) this.engine.applyDiff({ added: [], removed: [], updated: patches });
  }

  /**
   * 模式切换联动（runtime-mutators.switchMode 消费）：
   * edit → 停止模拟 + 场景还原；preview → 模拟源声明开启时自动启动。
   */
  onModeChange(mode: ScadaEditorMode): void {
    if (mode === 'edit') {
      this.stopMock();
      this.clear();
      return;
    }
    this.syncDeclarations();
    if (this.mockAutoStart) this.startMock();
  }

  /** 模拟源自启开关（use-editor-engine 经 latest ref 回读 schema previewMock）。 */
  mockAutoStart = false;
  /** 模拟源 tick 周期 ms（schema `{ intervalMs }` 声明；缺省 1000）。 */
  mockIntervalMs = 1000;

  startMock(pointIds?: string[], intervalMs = this.mockIntervalMs): void {
    if (this.mockTimer !== undefined) return;
    this.mockPointIds = pointIds ?? this.numericDeclarablePointIds();
    if (this.mockPointIds.length === 0) return;
    this.mockTick = 0;
    this.mockTimer = setInterval(() => {
      this.mockTick += 1;
      this.inject(this.mockValues(this.mockTick));
    }, intervalMs);
  }

  stopMock(): void {
    if (this.mockTimer === undefined) return;
    clearInterval(this.mockTimer);
    this.mockTimer = undefined;
  }

  isMockRunning(): boolean {
    return this.mockTimer !== undefined;
  }

  getInjectedPointValue(pointId: string): ScadaPrimitive | undefined {
    return this.store.getPointValue(pointId);
  }

  destroy(): void {
    this.stopMock();
    this.touched = new Map();
  }

  /** 已声明点中的数值/布尔型 id（模拟源目标集）。 */
  private numericDeclarablePointIds(): string[] {
    const ids: string[] = [];
    for (const pointId of this.store.pointIds()) {
      const state = this.store.getPointState(pointId);
      // 与 PointStore.initialValue 同序：static 源 value 优先，init 兜底。
      const init = state?.declaration.value ?? state?.declaration.init;
      if (typeof init === 'number' || typeof init === 'boolean') ids.push(pointId);
    }
    return ids;
  }

  /** 正弦随机游走（平滑、可断言：下一 tick 值 ≠ 当前值，design-renderer.md §13.5 确定性模拟）。 */
  private mockValues(tick: number): Record<string, ScadaPrimitive> {
    const values: Record<string, ScadaPrimitive> = {};
    for (const pointId of this.mockPointIds) {
      const state = this.store.getPointState(pointId);
      if (!state) continue;
      // 与 PointStore.initialValue 同序：static 源 value 优先，init 兜底。
      const init = state.declaration.value ?? state.declaration.init;
      if (typeof init === 'number') {
        const amplitude = Math.max(1, Math.abs(init) * 0.3);
        values[pointId] = Math.round((init + amplitude * Math.sin(tick * 0.8 + pointId.length)) * 100) / 100;
      } else if (typeof init === 'boolean') {
        values[pointId] = tick % 2 === 0;
      }
    }
    return values;
  }

  /** 解析 working copy 全部 bindings → 引擎场景 patch（首触属性记录原值）。 */
  private applyResolvedBindings(): number {
    const config = this.engine.getCurrentConfig();
    if (!config) return 0;
    const patches: VisualPatch[] = [];
    let applied = 0;
    const walk = (nodes: ScadaSymbolNode[]): void => {
      for (const node of nodes) {
        if (node.bindings) {
          const resolved = this.resolver.resolveBindings(node.bindings);
          if (resolved.length > 0) {
            const props = this.engine.getSymbolProps(node.id);
            if (props) {
              const patch: Record<string, unknown> = {};
              let originals = this.touched.get(node.id);
              for (const { property, value } of resolved) {
                if (!isBindableProperty(property)) continue;
                if (props[property] === value) continue;
                if (!originals) {
                  originals = new Map<string, unknown>();
                  this.touched.set(node.id, originals);
                }
                if (!originals.has(property)) originals.set(property, props[property]);
                patch[property] = value;
                applied += 1;
              }
              if (Object.keys(patch).length > 0) {
                patches.push({ id: node.id, patch: patch as Partial<ScadaSymbolNode> });
              }
            }
          }
        }
        if (node.children) walk(node.children);
      }
    };
    walk(config.symbols);
    if (patches.length > 0) this.engine.applyDiff({ added: [], removed: [], updated: patches });
    return applied;
  }
}
