import type { ScadaCanvasEngine } from '../engine/scada-engine.js';
import type { RefreshPipeline } from '../binding/dirty-collector.js';
import type { DirtyCollector } from '../binding/dirty-collector.js';
import type { Unsubscribe } from '../binding/point-store.js';
import { resolveSymbolStyle } from './style-resolver.js';
import type { ScadaSymbolProps, ScadaSymbolStylePatch } from './symbol-types.js';

const DECLARATION_KEYS = new Set(['states', 'bindings', 'animations', 'events']);

/**
 * 状态样式字段在 base（defaults ∪ 实例）未定义时的恢复默认值（退出状态恢复 normal 样式用）。
 *
 * plan 2026-08-05-2129-3 Phase 4（open P1-1）结构守卫：reset map 类型为 `Record<keyof ScadaSymbolStylePatch, unknown>`
 * ——必须覆盖 `ScadaSymbolStylePatch` 全部键（fill/stroke/strokeWidth/opacity/visible/textColor/shadow/strokeDash），
 * 编译期穷尽检查：未来新增 style 字段而忘更新此 map 会直接 typecheck 失败（关闭「per-field 枚举总比类型契约
 * 少一个」类缺陷，如本 Phase 修复的 shadow 离群点）。
 */
const STYLE_RESET_DEFAULTS: Record<keyof ScadaSymbolStylePatch, unknown> = {
  visible: true,
  opacity: 1,
  fill: '',
  stroke: '',
  strokeWidth: 0,
  textColor: '',
  strokeDash: [],
  // plan 2026-08-05-2129-3 Phase 4（open P1-1）：shadow reset 值。builtin 图元（rect/ellipse/...）defaults 无
  // shadow，退出 alarm 态（其 style 无 shadow）时 base.shadow === undefined → 落此 reset 默认。零效 shadow
  // 对象（blur:0 + transparent）保证视觉无辉光且符合 shadow 类型契约 {x,y,blur,color}（leafer 经 toShapeAttrs
  // 透传：shadow !== undefined → out.shadow，零效对象被接受为无可见辉光）。
  shadow: { x: 0, y: 0, blur: 0, color: 'transparent' },
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
 *
 * plan 2026-08-05-0653-2 Phase 4 三路裁定补丁（multi P1-1 binding-vs-revert）：
 * - 当 revert 字段同时存在 binding 时，binding 胜出（revert 跳过该字段），因 collectBindings 已在同帧
 *   写入 binding 解析值（pending Map last-write-wins）。修复前 revert 覆盖 binding 值，使
 *   binding+state-style 同字段图元 alarm→unstyled 退出时引擎停在 base/reset 空值（Failure Paths
 *   `revert-shadows-binding`）。无 binding 时 revert 行为不变（既有单测仍绿）。
 * - 边缘 case：binding 源点本轮未变化（binding 未重算，collectBindings 不写入）时，跳过 revert 会使
 *   引擎暂留 active 态值。这是 pre-existing 边缘 case（非 W3 引入），归 Non-Blocking Follow-ups。
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
    const instanceBindings = instanceProps.bindings;
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
        // plan 2026-08-05-0653-2 Phase 4（multi P1-1）binding-vs-revert 三路裁定：
        // 该字段同时存在 binding 时跳过 revert collect——同帧 collectBindings 已把 binding 解析值
        // 写入 pending（pending Map last-write-wins），是正确终值；revert 会覆盖为 base/reset 空值，
        // 使 binding+state-style 同字段图元 alarm→unstyled 退出时引擎停在空值而非 binding 值。
        // 跳过 revert 仅移除追踪（binding 值已在 pending 中），无 binding 时 revert 行为不变。
        if (instanceBindings?.[key]) {
          applied.delete(key);
          continue;
        }
        // revert：曾由状态样式覆盖，现已回到 base → 恢复 base 或重置默认。
        // STYLE_RESET_DEFAULTS 声明期为 `Record<keyof ScadaSymbolStylePatch, unknown>` 穷尽守卫；
        // 此处 key 为 string（loop 变量），经 Record<string, unknown> cast 访问（DECLARATION_KEYS 已过滤非 style 键）。
        const resetDefaults = STYLE_RESET_DEFAULTS as Record<string, unknown>;
        const revert = base[key] !== undefined ? base[key] : resetDefaults[key];
        if (revert !== undefined) {
          if (this.collector) {
            // W3：revert 经脏收集合帧（与 active 同一帧尾 flush，单一 applyAttrs owner）。
            this.collector.collect({ symbolId, property: key, value: revert });
          } else {
            // 回退路径（无 collector，既有单测）：revert immediate applyAttrs。
            immediatePatch[key] = revert;
          }
        }
        // plan 2026-08-05-2129-3 Phase 4（open P1-1）防御：hoist `applied.delete(key)` 到 revert 分支内、
        // `if (revert !== undefined)` 守卫**之外**——即使某键缺失 reset default（结构守卫已使 style 键不可能，
        // 此处为 belt-and-suspenders），也移除追踪条目，防 applied 集泄漏 + 后续每次 applyState 重试且重败。
        applied.delete(key);
      }
    }
    this.lastApplied.set(symbolId, applied);
    // active 不再由本层写；仅在无 collector 回退路径下写 revert patch。
    if (!this.collector && Object.keys(immediatePatch).length > 0) {
      this.engine.applyAttrs({ [symbolId]: immediatePatch });
    }
  }
}
