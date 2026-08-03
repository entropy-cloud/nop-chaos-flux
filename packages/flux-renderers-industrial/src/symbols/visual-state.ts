import type { ScadaCanvasEngine } from '../engine/scada-engine.js';
import type { RefreshPipeline } from '../binding/dirty-collector.js';
import type { Unsubscribe } from '../binding/point-store.js';
import { resolveSymbolStyle } from './style-resolver.js';
import type { ScadaSymbolProps } from './symbol-types.js';

const DECLARATION_KEYS = new Set(['states', 'bindings', 'animations', 'events']);

/** 状态样式字段在 base（defaults ∪ 实例）未定义时的恢复默认值（退出状态恢复 normal 样式用）。 */
const STYLE_RESET_DEFAULTS: Record<string, unknown> = {
  visible: true,
  opacity: 1,
  fill: '',
  stroke: '',
  strokeWidth: 0,
  textColor: '',
  strokeDash: [],
};

/**
 * 图元侧视觉状态应用（I8.2）：消费 I6.3 状态机联动层输出（state:change），
 * 经 `resolveSymbolStyle`（defaults ∪ 实例 ∪ statePatch，状态优先）计算样式覆盖
 * patch → 引擎批量写路径 `engine.applyAttrs` 应用；退出状态恢复 normal 样式；
 * `visible: false` 写节点 visible 而非移除（绑定索引稳定，design-symbols.md §10）。
 * 业务状态流水线（绑定求值/value-to-state/动画启停）由 I6.3 承担，本层不重复实现。
 */
export class StateVisualApplier {
  private readonly lastApplied = new Map<string, Set<string>>();

  constructor(private readonly engine: ScadaCanvasEngine) {}

  /** 挂接 I6.3 状态机联动层：state:change → applyState（返回退订句柄）。 */
  attachTo(pipeline: RefreshPipeline): Unsubscribe {
    return pipeline.on('state:change', ({ symbolId, state }) => {
      this.applyState(symbolId, state);
    });
  }

  applyState(symbolId: string, state?: string): void {
    const leaf = this.engine.registry.get(symbolId);
    if (!leaf?.definition) return;
    const instanceProps = (this.engine.getConfigNode(symbolId) ?? {}) as ScadaSymbolProps;
    const base = resolveSymbolStyle(leaf.definition, instanceProps) as unknown as Record<string, unknown>;
    const styled = resolveSymbolStyle(leaf.definition, instanceProps, state) as unknown as Record<string, unknown>;
    const applied = this.lastApplied.get(symbolId) ?? new Set<string>();
    const patch: Record<string, unknown> = {};
    for (const key of new Set<string>([...applied, ...Object.keys(styled)])) {
      if (DECLARATION_KEYS.has(key)) continue;
      if (styled[key] !== base[key]) {
        patch[key] = styled[key];
        applied.add(key);
      } else if (applied.has(key)) {
        const revert =
          base[key] !== undefined ? base[key] : (STYLE_RESET_DEFAULTS[key] as unknown);
        if (revert !== undefined) {
          patch[key] = revert;
          applied.delete(key);
        }
      }
    }
    this.lastApplied.set(symbolId, applied);
    if (Object.keys(patch).length > 0) {
      this.engine.applyAttrs({ [symbolId]: patch });
    }
  }
}
