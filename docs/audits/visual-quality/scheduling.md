# 视觉质量证据卡：Scheduling 族（V11a）

> 状态: closed（V11a plan 481 落地，2026-09-21）
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §7.5（已经三轮独立核实，含 Round 2 kanban 二次反转勘误）、研究报告 `docs/analysis/visual-quality/V11a-scheduling.md`（独立核实 pass）
> Owner plan: `docs/plans/481-visual-quality-v11a-scheduling-plan.md`（四 Phase 执行完毕）
> Owner docs: `docs/components/roadmap-scheduling.md`、`docs/components/{gantt,kanban,calendar}/design.md`

## Findings 清单

- [V11a-F1] gantt 无关键路径高亮（grep `critical` 零命中）——落地或显式裁决
  - 证据: 普查 §7.5；`roadmap-scheduling.md` S3.2 状态失实（标 done 且明文「criticalPath 高亮关键路径红色」）
  - 裁决: **落地**——`gantt/cpm.ts` 纯函数 CPM（拓扑 + 正/反向 + 浮动为零集；空 links → 空集、环输入不入集不抛错）+ store `getCriticalPath()` + `GanttBars` `data-critical` + `gantt.css` 2px destructive 顶标 + 底部图例（§12.6「底部图例」契约落定为最小 token 驱动图例，非「图例后置」）
  - 状态: done（CPM 单测 10/10，先红后绿；e2e 双态断言绿；S3.2 勘误已回写 owner doc）
- [V11a-F2] calendar 月视图为资源时间轴非 6 周网格，无密度视图——裁决
  - 证据: 普查 §7.5；`calendar/design.md` §12 风险表明文设计取舍
  - 裁决: 6 周网格 = 设计意图，**显式否决**；密度视图 = 能力型空白（非「声明无实现」），归 scheduling roadmap 后续立项（判例同 V6 R9）；design.md 无需改
  - 状态: adjudicated（plan Deferred But Adjudicated F2-a/F2-b）
- [V11a-F3] kanban 拖拽悬停高亮：**链路已接通，非 confirmed defect**（勘误终审口径）——发射端 `use-kanban-board-effects.ts` drag-over 时 set/remove `data-drop-target`，CSS 消费 `kanban.css` box-shadow ring 在。仅核对实际视觉/dark 表现，核对发现问题才立项修复，否则显式 adjudicated 为 watch-only
  - 证据: 普查 §7.5 勘误、路线图 Round 2/3 审查记录
  - 裁决: **watch-only**——无缺陷可立项；固化代价已付：e2e 双态断言（drop-target ring 随 `[data-mode]` 翻转）+ `kanban/design.md` 拖拽行契约漂移修正（原「边框高亮 2px #3b82f6」→ 实为 box-shadow ring `var(--color-primary)`）
  - 状态: closed（watch-only 固化）
- [V11a-F4] gantt 任务条选中硬编码 `bg-blue-50`
  - 证据: 普查 §7.5；研究报告勘误——实为**网格行**选中（`gantt-grid.tsx`），时间线任务条无任何选中视觉
  - 裁决: **落地（最小面 + bar 增强）**——网格行 `bg-blue-50` → `[data-selected='true']` + `color-mix(in srgb, var(--color-primary) 10%, transparent)` 规则（dark 击穿修复）；`GanttBars` 接收 `selectedTaskId` 打 `data-selected` + 2px primary outline（R13 可选第二交付**取做**）
  - 状态: done（组件测试 8/8 + e2e 双态断言绿；`#eff6ff` 消失）
- [V11a-F5] scheduling e2e 视觉断言缺失：calendar-demo/kanban-perf 等零计算样式断言
  - 证据: V0 研究报告 §2（17 spec `data-mode` 零命中）
  - 裁决: **落地**——`tests/e2e/scheduling-visual-tokens.spec.ts` 三组 light/dark 双态断言（gantt 选中 + 关键路径顶标、calendar today + drag-ok/conflict、kanban drop-target ring），消费 V0 helper + theme-switcher 先例
  - 状态: done（新增 5 测试全绿；17 既有 spec 零回归）

## N1-N3（研究报告新增缺陷）

- [V11a-N1] calendar 拖拽 ok/conflict CSS 断链（S17.7 失实：只做发射端即标 done）
  - 裁决: 补 `calendar.css` 3 条 token 驱动规则（drop-target ring primary / drag-ok success 系 / drag-conflict destructive 系，kanban 同法）；组件测试固化 set/remove 行为 + e2e 双态断言
  - 状态: done（S17.7 勘误已回写 owner doc）
- [V11a-N2] calendar 事件色双轨死锁（`calendar.css` 语义 token 规则被 inline `backgroundColor` 恒胜）
  - 裁决: 删 `TYPE_COLORS` 未定义 var 映射与默认路径 inline bg，默认路径落 CSS 语义 token 规则（dark 自适应）；`event.color` 显式覆盖与 eventTemplate 路径行为不变；typeless fallback 底色落点 = `:not([data-event-type])` 规则（`--color-muted-foreground`，与修复前 fallback 同 token）
  - 状态: done
- [V11a-N3] 未定义 var 族（`--color-calendar-*` ×4、`--color-gantt-milestone-stroke`）
  - 裁决: calendar 4 var 随 N2 消亡（`calendar.tsx` DEFAULT_SHIFT_TYPES 改语义 token，第三消费点消除，全仓消费归零 grep 证）；milestone stroke **直连 `--color-warning`**（琥珀语义最近邻，零宿主改动；不定义专用 var/宿主发布层）
  - 状态: done

## R1-R14 残余池裁决

| #   | 主题                                | 裁决与状态                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | calendar 拖拽 ok/conflict CSS 缺失  | done（=N1，见上）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| R2  | calendar 事件色双轨                 | done（=N2，见上）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| R3  | 未定义 var 族                       | done（=N3，见上）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| R4  | baseline-bars 字面色                | done——rgba 灰 → `--color-muted-foreground`（fillOpacity/strokeOpacity 保透明度）；`#ef4444`/`#f59e0b` → destructive/warning；SVG 呈现属性不接受 var()，按 Failure Paths svg-presentation-attr-var 走 style 通道，`gantt-states.spec.ts` 改计算样式断言锁定                                                                                                                                                                                                                                                              |
| R5  | gantt 临时连线/放置指示线 `#3b82f6` | done——`use-gantt-link-draw.ts` 两处 → `style.stroke = var(--color-primary)`；`use-gantt-drag.ts` cssText → `background:var(--color-primary)`                                                                                                                                                                                                                                                                                                                                                                            |
| R6  | 今日线 `bg-red-400`/`text-red-500`  | done——删类，`[data-slot='gantt-today']`/`[data-slot='gantt-today-label']` 包 CSS 规则 → `var(--color-destructive)`                                                                                                                                                                                                                                                                                                                                                                                                      |
| R7  | 亮锁语义态类池                      | done——calendar today 三视图 → `data-today` + color-mix primary 规则；隐藏周末格 → `bg-[var(--color-muted)]`；weekend `bg-gray-50/50` 死类删除（R8）；kanban WIP → destructive 系（含 `kanban-column.tsx` 同语义单元）；column-adder → primary 系；resize handle → `hover:bg-primary`；gantt 表头 → `bg-muted text-muted-foreground`；gantt-bars focus ring/link handle 白底蓝边、gantt-layout splitter、kanban-toolbar focus ring、kanban-card-tags 头像、card 删除钮 → token（执行轮未列残余顺手清零并纳入守卫断言面） |
| R8  | 中性灰 utility 池                   | done（两半）——遮蔽死类删除（逐项已核竞争者：kanban-card `bg-white border-gray-200 text-gray-900 text-gray-500` ← `.nop-kanban-card`/`.nop-kanban-card-content`；kanban-column 根 `bg-gray-50 border-gray-200` ← `.nop-kanban-column`；header 拖拽手柄灰系 ← `.nop-kanban-column-drag-handle`；gantt-cellgrid weekend `bg-gray-50/50` ← `[data-weekend]` 规则；gantt-grid hover 死类）；其余触碰文件内顺手映射 token，不做全域大扫除。全包中性灰计数 59 → 30（守卫②落地基线，只降不升）                                  |
| R9  | barcode overlay 恒暗白字族          | adjudicated（watch-only）——相机 overlay 刻意恒暗，白字为对比度设计；守卫 allowlist 常驻登记                                                                                                                                                                                                                                                                                                                                                                                                                             |
| R10 | 导出白底 `#ffffff`                  | adjudicated（watch-only）——导出介质固定白底合理；守卫 allowlist 常驻登记                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| R11 | calendar.css 浅色残余               | hover 白描边 / is-split 白左边 / `color-mix … white` 两处 → 全部改混 `--color-background`（done）；阴影 rgba 黑 → watch-only（加深语义，不阻断）                                                                                                                                                                                                                                                                                                                                                                        |
| R12 | calendar-print.css `#fff`           | adjudicated（watch-only）——打印介质固定白底；守卫 allowlist 常驻登记                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| R13 | gantt bar 无选中视觉                | done——`data-selected` + outline 规则（随 F4 一并落地，R13 可选项取做）                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| R14 | scheduling 整包豁免（path-prefix）  | 归 V12a；本 plan 仅对账：`pnpm check` scheduling 豁免零新增命中，命中实例数可归因下降（数字见 daily log 2026-09-21）                                                                                                                                                                                                                                                                                                                                                                                                    |

## 守卫（防回跳）

`packages/flux-renderers-scheduling/src/visual-quality-guard.test.ts`（477 先例）：

- ①枚举修复面逐文件清零（字面 hex + 色相类含 white/black；未列残余显式纳入断言面）——allowlist 常驻：barcode-input 恒暗族、calendar-print 白底、双 export 白底、kanban-tag-filter 数据驱动 tag 色白字（R9 同族）。
- ②全包中性灰（gray/slate/zinc/neutral/stone）utility 计数 ≤ 落地基线 30（修复前 59）。
- allowlist 变更须随本证据卡同步。

## 视觉证据

- gantt 关键路径顶标/选中/图例、calendar today/drag 双态、kanban drop-target ring：`tests/e2e/scheduling-visual-tokens.spec.ts` 计算样式断言（light/dark 各自非透明且互异、非 `#eff6ff`）。
- 单测锁定：`gantt/cpm.test.ts`（CPM 手算集）、`gantt/gantt-selection-critical.test.tsx`（DOM data 契约 + CSS 规则文本）、`calendar/calendar-drag-drop-visual.test.tsx`（拖拽类 set/remove + 双轨消解）、`visual-quality-guard.test.ts`（两级守卫）。

## Closure

V11a closure audit **approved**（2026-09-21，独立 fresh session）：Phase 1–4 exit criteria 逐条 live 核对确认；focused 复跑 scheduling 91 文件 980 测试全绿；守卫基线 30 独立复算恰等；roadmap V11a 行 → `done`，owner plan 481 → `completed`。观察留档：豁免基线已由并发 plan 483 重构为文件级（R14 记账义务已履行）；kanban 残余中性灰在守卫基线内。
