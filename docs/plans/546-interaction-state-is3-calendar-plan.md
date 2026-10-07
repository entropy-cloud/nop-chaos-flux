# 546 interaction-state IS-3 Calendar 域修复批——移动语义闭环 + 拖选可发现性 + 三页序列审查

> Plan Status: completed
> Last Reviewed: 2026-10-07
> Source: `docs/backlog/interaction-state-quality-roadmap.md`（IS-3，种子清单 4/5）；`docs/skills/interaction-state-audit-prompt.md`（V3 反馈真实 / E 类可发现性）；live 复现探针（2026-10-07）
> Related: `docs/plans/545-interaction-state-is2-gantt-plan.md`（同轨道 IS-2）。编号注记：546 与 `2026-10-04-546-editor-designer-p11-scada-editor-core-plan.md` 双占（沿 543–545 既有模式），引用带全文件名消歧

## Purpose

修复 calendar 拖拽移动假反馈（种子 4）与长按拖选创建零可发现性（种子 5），对 `#/scheduling-calendar`、`#/calendar-perf-scale` 与 cal-replica 三复刻页跑序列审查，findings 全量进台账。

## Current Baseline

**种子 004（拖拽移动假反馈，V3，live 复现 2026-10-07）**

- 复现链：`#/scheduling-calendar` 拖"巡检"事件到目标格 → 确认对话框"确认移动排班 将 巡检 移到 2026-10-04 张三?" → 点确认 → toast"排班已更新: 巡检" → **事件位置/内容完全不变**。
- 根因（demo 接线缺陷——归属裁定：**renderer 载荷充足**）：`calendar-demo.tsx:120` `onEventChange: { action: 'showToast' }` 且 `events` 为模块级常量（:107/:117）；renderer 派发载荷 `{ eventId, fromResource, toResource, fromDate, toDate, event }`（calendar.tsx:275-287 executeSwap，键盘路径同构）**含闭环所需全部字段**；eventsData 为只读 prop（calendar.tsx:78），无内部副本——demo 侧受控 events state 即可闭环，**renderer 无需新增受控模式**。
- renderer 侧弱点（登记不修）：`toDate` 仅日粒度、无"新 start/end 已算好"字段；`eventsOwnership/eventsStatePath` 受控模式不存在（对齐 viewOwnership 先例 calendar.types.ts:120-123 的增强项，显式裁定不做）。
- `#/calendar-perf-scale` 同假反馈（toast 型）——裁定豁免：性能基准页，state 回写开销会污染测量（显式登记）。
- cal-replica 三页与种子无关：cal-booking 为纯选日期面（monthShape grid + dateStatePath，无 events）；cal-confirm/cal-success 仅 calendar icon。三页仅作为序列审查对象。

**种子 005（拖选创建零可发现性，E 类，live 复现）**

- 功能存在：长按 500ms（`use-calendar-drag-create.ts:178-195`）+ 拖选区间 + 松手类型选择弹层（CalendarDragTypeSelector）→ onEventCreate（载荷 `{ title, type, start, end, resourceId }`，renderer 包装为 `{ event }`）。
- 可发现性为零（live 读数）：cell `cursor: auto`（calendar.css 无 cursor 规则）、无任何提示文案（全文无"长按/拖选"字样）、按压拖选中**零视觉反馈**（`dragCreateState` 完整形状 `{ active, startDate, startResource, currentDate, currentResource, … }` 数据齐但无 view 消费——calendar.tsx 持有仅自测消费；startResource 圈定行，创建会话按设计单资源）。
- 键盘等价入口已存在（cell 聚焦 Enter/Space 创建，calendar-month-view.tsx:151-158）。
- marquee 框选裁定输入：跨资源矩形多选需选择集合 state + 冲突检测（中-大改动面）；单资源多日区间的感知缺口已可由"按压中预览高亮"覆盖。（注：`batchScheduling` 契约面 declared-but-unwired——calendar.types.ts:114 仅类型声明、calendar.tsx 零消费、无宿主启用，不构成"既有批量排班流"；该契约缺口随本批登记 ledger watch。）

**测试与 i18n 口径**

- 单测面丰富（use-calendar-drag/drag-create/confirm-dialog/keyboard 系列）；e2e 缺口：无拖拽移动→确认对话框用例、无 drag-create 用例（grep 0 命中）。
- 选择器：事件 `[data-slot="calendar-event"]`、cell `[data-slot="calendar-cell"][data-date][data-resource]`、确认框 `.nop-calendar-confirm-dialog`（无 testid）、类型选择器同容器类。
- i18n：`scheduling.calendar.*`（confirmMove/moveConfirm/selectType/类型名/noScheduleData 既有）；新增键落同命名空间（`dragCreateHint`），en/zh 双文件同批补键 + 自查 parity（硬门禁为 `check:i18n-keys` 的 used-but-undefined；单侧缺失仅警告——`i18n-contract.test` 只测 formatter/插值契约、不校验键）。
- demo 组件无 state（calendar-demo.tsx:126-157）；perf-scale demo `onEventChange: { actionType: 'toast' }`（actionType/action 混写并存）。

## Goals

- 种子 004：demo 受控 events 接线——确认移动后事件真实移动（V3：源格消失、目标格出现、载荷与落点一致），onEventCreate 同样入 state；perf-scale 豁免显式登记。
- 种子 005：拖选创建可发现性三件套——cell cursor 引导、常驻 hint 文案（含键盘等价入口，双语）、按压中拖选预览高亮（data-drag-preview）。
- marquee 框选能力显式裁定（不做 + 理由登记）。
- 三页 §4 序列审查 findings 全量进台账；种子 004/005 verified；roadmap IS-3 回写。

## Non-Goals

- renderer 受控 events 模式（eventsOwnership/eventsStatePath 增强，显式裁定不做，登记 watch）。
- onEventChange 载荷扩展（新增算好的 start/end 字段——增强项，登记 watch）。
- perf-scale 页的 state 回写（性能基准豁免）。
- cal-replica 三页的 renderer 交互改造（无 calendar renderer 交互面）。

## Scope

### In Scope

- `apps/playground/src/pages/calendar-demo.tsx`（受控 events 接线）。
- `packages/flux-renderers-scheduling/src/calendar/`：calendar.css（cell cursor + 预览高亮样式）、calendar.tsx + 三视图（dragCreateState 预览消费 prop）、calendar-header 或空态区 hint 渲染。
- `packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`（dragCreateHint 双语键）。
- `tests/e2e/calendar-interaction-state.spec.ts`（新建：V3 移动闭环 + 可发现性读数）。
- `docs/audits/interaction-state/is3-calendar/`（证据卡）+ ledger 更新 + roadmap 回写。

### Out Of Scope

- renderer 载荷/受控模式增强（watch 登记）；cal-replica 页改造；perf-scale 回写。

## Failure Paths

不适用：渲染器交互与 demo 接线修复，无错误处理/API 契约/鉴权/外部集成路径。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（V3/E 类不变量回归）。Proof 先行：红 e2e（旧 demo 下确认移动后事件不动 → 必挂；cursor/hint/预览读数旧态 → 必挂），修后转绿。

## Execution Plan

### Phase 1 - 种子 004：移动语义闭环（V3）

Status: completed
Targets: `apps/playground/src/pages/calendar-demo.tsx`、`tests/e2e/calendar-interaction-state.spec.ts`（新建）

- Item Types: `Proof | Fix`

- [x] Proof（先红）：e2e V3 读数——拖首事件到同周**异日期或异资源**目标格（排除零偏移拖放）→ 断言 `.nop-calendar-confirm-dialog` 可见 → 点确认 → 断言：源格该事件块消失、`[data-slot="calendar-cell"][data-date=目标]` 出现事件块、toast 仍在。手势注意：事件 pointerdown 会冒泡武装 500ms 长按，手势保持 <500ms 或显式关闭类型选择器 overlay 避免叠层。旧 demo（静态 events + toast）下事件不动 → 必挂。
- [x] Fix：demo 受控接线——`useState` 持 events（替代模块级常量消费）；`onEventChange` 载荷映射（fromDate→toDate 日偏移平移 start/end + resourceId 替换）后 setState；`onEventCreate` 追加新事件入 state；toast action 保留（真实变化之上的反馈）。
- [x] Decision：归属裁定登记——renderer 载荷充足，缺陷归 demo 接线（ledger note）；perf-scale 豁免 + eventsOwnership/watch 增强项显式登记（不做，理由见 Non-Goals）。
- [x] Proof：ledger `IS-scheduling-calendar-001` pending→found→fixed。

执行期注记（Phase 1）：实现中发现 **SchemaRenderer 对静态 schema 数据的动态更新不透传 renderer props**（page runtime 每挂载单次创建，对账探针：demo state 新、calendar eventsData 旧）——demo 以 `rendererRevision` key 重挂载闭环（挂载即当前月，视图状态损失可接受），框架语义登记 ledger watch（IS-scheduling-calendar-004）。namespaced action 落点沿 dashboard-demo 先例（createActionScope + registerNamespace，@nop-chaos/flux-runtime）。

Exit Criteria:

- [x] V3 e2e 先红后绿（移动闭环三读数 + toast 共存）。
- [x] 既有 calendar e2e（calendar-demo/grid-shape/perf/cal-replica 族）零回归。

### Phase 2 - 种子 005：拖选创建可发现性（E 类）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/`（calendar.css、calendar.tsx、三视图、hint 渲染点）、`packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`

- Item Types: `Proof | Fix`

- [x] Proof（先红）：e2e 可发现性读数——①cell computedStyle cursor ≠ 'auto'（旧 auto 必挂）；②calendar 容器内存在含"长按/拖选"语义的 hint 文案（旧 0 命中必挂，双语键）；③长按 600ms 后拖选中目标 cell 出现 `data-drag-preview` 属性（旧无任何 view 消费必挂）。
- [x] Fix：cell cursor（`cursor: cell`，calendar.css，避开 event block 的 pointer）；hint 文案渲染（calendar 头部下方一行，键 `scheduling.calendar.dragCreateHint`，文案含长按拖选 + 键盘 Enter 等价入口，双语；**仅 resource 形态三视图渲染**——monthShape:'grid' 宿主（cal-booking 纯选日期面）不渲染，避免文案失义与扰动既有 e2e 读数）；按压中预览高亮（dragCreateState 区间 → 三视图 cell `data-drag-preview` 属性 + CSS 高亮）。
- [x] Decision：marquee 框选显式裁定——不做（跨资源矩形选择需选择集合 state + 冲突检测、中-大改动面；单资源感知缺口已由预览高亮 + hint 覆盖；与 batchScheduling 声明契约无重叠关系——该契约为 declared-but-unwired，另登记 watch finding），ledger 登记裁决三态。
- [x] Proof：ledger `IS-scheduling-calendar-002` pending→found→fixed；另登记 batchScheduling declared-but-unwired 契约面 watch finding（calendar.types.ts:114 声明、calendar.tsx 零消费、零宿主启用）。

执行期注记（Phase 2）：dragCreateHint 键首次误插 scheduling（depth-2）块——check-i18n-keys 当场红（used-but-undefined）后移入 scheduling.calendar（depth-3），结构门禁价值再实证；data-drag-preview 挂 cell 自身（测试初版误查子元素已改 toHaveAttribute）。

Exit Criteria:

- [x] 可发现性 e2e 先红后绿（cursor/hint/preview 三读数）。
- [x] calendar 包单测全绿（drag-create/confirm/keyboard 家族零回归）；i18n 双语键齐（check:i18n-keys 零新增红）。

### Phase 3 - 三页序列审查与台账收口

Status: completed
Targets: `docs/audits/interaction-state/is3-calendar/`、`docs/backlog/interaction-state-quality-roadmap.md`

- Item Types: `Proof | Decision`

- [x] Proof：三页 §4 序列审查——`#/scheduling-calendar`（视图切换/日期导航/事件点击/移动闭环/创建闭环读数）、`#/calendar-perf-scale`（滚动/大数据量下交互）、cal-replica 三页（cal-booking 日期选择面 + cal-confirm/cal-success 无 renderer 交互面核实），证据卡 + 原始读数落 `docs/audits/interaction-state/is3-calendar/`；新 findings 全量进 ledger（P0/P1 随批先红后绿，P2/P3 裁决三态）；台账 001/002（roadmap 种子 4/5）复检 flip verified。
- [x] Decision：roadmap IS-3 状态回写（todo→planned 于转 active；planned→done 于 audit 后）；perf-scale 豁免与 marquee 裁决如尚未落 ledger 则补记。

Exit Criteria:

- [x] 三页证据卡 + sequence-readings.json 落盘（含视图切换/日期导航/事件点击/perf 滚动/cal-booking 日期选择读数；cal-confirm/cal-success 标 n/a）、findings 零静默跳过、台账 001/002（roadmap 种子 4/5）verified、五页行 flip audited。
- [x] roadmap IS-3 双表回写完成。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_99351c05-6025-4ca9-a21c-6601ea31822d）
- Verdict: `pass-with-minors`
- Rounds: 2（R1 `fail`：1 Major（marquee 裁决前提失实——batchScheduling 为 declared-but-unwired 契约面非既有流）+ 7 Minor → 全部修订 → R2 pass-with-minors 零 Blocker/零 Major）
- Findings addressed: Major 1 条——marquee 裁决论据改写为独立成立的论据 + batchScheduling 三事实注记 + 契约缺口 watch finding 登记项。Minor 7 条全落定（i18n 校验归属 check-i18n-keys/dragCreateState 完整形状含 startResource/异格约束与手势叠层提示/hint 按 monthShape 分 gate/台账口径统一/pnpm check 入门禁/编号双占注记）；残留 m-N1（:119 种子口径）随执行顺手收敛。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（种子 004/005 verified + 批内新立 P0/P1）
- [x] 所有 in-scope confirmed contract drifts 已收敛（归属裁定/perf 豁免/marquee 裁决/watch 登记全落 ledger）
- [x] 行为/契约结果已达成（V3 移动闭环 + 可发现性三读数成立）
- [x] 必要 focused verification 已完成（先红后绿 e2e + calendar 包单测 + 家族回归）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap 回写；calendar 组件文档若行为语义变化则注记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### marquee 框选（跨格矩形多选）

- Classification: `out-of-scope improvement`（能力裁定：不做）
- Why Not Blocking Closure: 跨资源矩形选择需选择集合 state + 冲突检测（中-大改动面）；单资源区间创建的感知缺口已由本批预览高亮 + hint 覆盖；用户报告的可发现性缺陷（种子 005）不依赖 marquee。（`batchScheduling` 为 declared-but-unwired 契约面、无实现无宿主，不参与本裁决论据。）
- Successor Required: `no`（如未来产品要求，随 calendar 能力增强批立项）

### renderer 受控 events 模式（eventsOwnership/eventsStatePath）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 本批以 demo 受控 state 闭环 V3（载荷字段充足）；renderer 受控模式为多宿主复用增强，非缺陷修复面。
- Successor Required: `no`（登记 watch；如第三个宿主出现同类需求再立项）

## Non-Blocking Follow-ups

- onEventChange 载荷增强（算好的新 start/end 字段）。
- perf-scale demo actionType/action 混写清理。

## Closure

Status Note: 2026-10-07 收口。三 Phase 全 completed：种子 004（拖拽移动假反馈）归属裁定 demo 接线（renderer 载荷充足），受控 useState events + calendarDemo namespaced actions + rendererRevision key 重挂载闭环（SchemaRenderer 静态数据动态更新不透传的框架语义登记 watch 004），e2e 红（确认移动后事件不动）→ 绿（源格 −1/目标格 +1）；种子 005 可发现性三件套（cursor:cell + dragCreateHint 双语 hint 仅 resource 形态 + data-drag-preview 按压预览）e2e 红→绿；marquee 不做/perf 豁免/batchScheduling unwired watch（003）/eventsOwnership watch（007）全登记；三页 §4 序列审查 8 序列取证 + 五页行 audited。五门禁 full-green（typecheck/build/lint 42/42、test 78/78、check exit 0）；calendar 家族 e2e 38、scheduling 1076/1076、新 spec 2/2。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（general-purpose fresh session，agent_30bcda10-67a3-4b89-b1a4-afc8e8f24b49）
- Evidence: 3 轮——R1 `issues`（4M：台账 001/002 宣称 verified 实为 fixed/Phase 3 点名序列读数未落盘/Gate watch 登记失实/Gate 7 预勾；1m：五页行未 flip；1t：drag-hover flake 非本批回归）→ 退回修（readings 落盘/三行补记/Gate 7 回退/卡与措辞同步）→ R2 `issues`（单残留：五页行 flip 静默 no-op，reconcile audited 仍 1）→ 行级修正 → R3 `APPROVED` 零残留（审计员独立重跑 reconcile：audited 6 / uncovered 251 / findings 16 / OK；R1 行为证据沿用：stash 旧实现红 2/2、家族 38、scheduling 1076/1076、五门禁 exit 0、接口≠行为五处抽查全过）。

Follow-up:

- 见 Non-Blocking Follow-ups。
