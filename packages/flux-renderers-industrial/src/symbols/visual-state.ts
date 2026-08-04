import type { ScadaCanvasEngine } from '../engine/scada-engine.js';
import type { RefreshPipeline } from '../binding/dirty-collector.js';
import type { DirtyCollector } from '../binding/dirty-collector.js';
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
 * 图元侧视觉状态应用（I8.2）：消费 I6.3 状态机联动层输出（state:change），承担**退出状态恢复 base 样式**
 * （revert）职责。进入/保持状态的 active-state 样式由 `RefreshPipeline.collectStates` 经脏收集批量写入
 * （单一 active owner）；本层只追踪 active 键（lastApplied）以便退出时恢复，并经同一 collector 把 revert
 * patch 汇入帧尾单次写（合帧 owner 收敛，plan 2026-08-04-2243-1 Phase 3 W3）。
 *
 * plan 2026-08-04-2243-1 Phase 3 W3 裁定（单一合帧 owner）：
 * - active-state 样式 owner = `collectStates`（脏收集，每帧批量写，与 binding 同帧合并，状态色胜出）。
 * - revert（退出恢复）owner = 本层，经 `collector.collect` 汇入同一帧尾 flush（不再 immediate applyAttrs）。
 * - 两模块对同一字段在同帧不再并发写（active 仅 collectStates，revert 仅本层），消除 alarm-storm N+1 applyAttrs。
 * - `collector` 省略时（既有单测回退路径）revert 退回 immediate applyAttrs，仅用于向后兼容；生产装配恒传 collector。
 */
export class StateVisualApplier {
  private readonly lastApplied = new Map<string, Set<string>>();

  constructor(
    private readonly engine: ScadaCanvasEngine,
    private readonly collector?: DirtyCollector,
  ) {}

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
    const immediatePatch: Record<string, unknown> = {};
    for (const key of new Set<string>([...applied, ...Object.keys(styled)])) {
      if (DECLARATION_KEYS.has(key)) continue;
      if (styled[key] !== base[key]) {
        // active state-style 键：collectStates 已（将）经脏收集写入。本层仅追踪，以便退出时恢复 base。
        applied.add(key);
      } else if (applied.has(key)) {
        // revert：曾由状态样式覆盖，现已回到 base → 恢复 base 或重置默认。
        const revert =
          base[key] !== undefined ? base[key] : (STYLE_RESET_DEFAULTS[key] as unknown);
        if (revert !== undefined) {
          if (this.collector) {
            // W3：revert 经脏收集合帧（与 active 同一帧尾 flush，单一 applyAttrs owner）。
            this.collector.collect({ symbolId, property: key, value: revert });
          } else {
            // 回退路径（无 collector，既有单测）：revert immediate applyAttrs。
            immediatePatch[key] = revert;
          }
          applied.delete(key);
        }
      }
    }
    this.lastApplied.set(symbolId, applied);
    // active 不再由本层写；仅在无 collector 回退路径下写 revert patch。
    if (!this.collector && Object.keys(immediatePatch).length > 0) {
      this.engine.applyAttrs({ [symbolId]: immediatePatch });
    }
  }
}
