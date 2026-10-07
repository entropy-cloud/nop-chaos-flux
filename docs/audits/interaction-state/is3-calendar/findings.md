# IS-3 Calendar 三页序列审查证据卡（plan 546 Phase 3）

> 审查方法：docs/skills/interaction-state-audit-prompt.md §4 五步法 / §6。
> live 复现探针读数（2026-10-07）：
>
> - 种子 004（修复前）：拖"巡检"→确认"移到 2026-10-04"→toast"排班已更新"→事件位置/内容不变（V3 假反馈坐实）；修复后（对账探针）：demo state start=2026-10-01=期望值、renderer eventsData 同步更新、V3 e2e 源格 -1/目标格 +1。
> - 种子 005（修复前）：cell cursor=auto、全文无"长按/拖选"提示、长按拖选中零视觉指示而功能存在（拖后 create dialog 弹出）；修复后：cursor=cell、hint 双语渲染（resource 形态）、按压中 data-drag-preview 高亮（e2e 三读数）。
> - 归属裁定：renderer 载荷充足（eventId/fromDate/toDate/toResource/event）→ 缺陷归 demo 接线；renderer 修复为零（Non-Goals 登记两项 watch）。
> - 三页差异：cal-booking 纯日期选择面（monthShape grid、dateStatePath、无 events）；cal-confirm/cal-success 仅 calendar icon（无 renderer 交互面）；perf-scale 同假反馈豁免（性能基准，state 回写污染测量——显式裁决）。
> - SchemaRenderer 动态 schema 发现：page runtime 单次创建、静态 schema 数据更新不透传 renderer props——demo 以 rendererRevision key 重挂载闭环；框架级语义登记 watch（与 batchScheduling watch 同批 ledger）。

## 种子对账

- IS-scheduling-calendar-001（种子 4，C/P1）：fixed → verified（V3 e2e + 对账探针）。
- IS-scheduling-calendar-002（种子 5，E/P2）：fixed → verified（可发现性三读数 e2e）。
- IS-scheduling-calendar-003（新立，F/P2）：batchScheduling declared-but-unwired —— watch-only。
- SchemaRenderer 动态 schema 透传（新立，F/P2）：watch-only（框架语义面，非本轨道修复面；demo key 重挂载为已记录 workaround）。
- marquee 框选：裁决不做（ledger 006 watch-only；Deferred But Adjudicated，理由见 plan 546）。
- perf-scale 假反馈：豁免（ledger 005 exempted-performance-baseline；性能基准，显式裁决）。
- eventsOwnership/payload 增强：不建（ledger 007 watch-only；demo 受控 state 已闭环 V3）。
- batchScheduling declared-but-unwired：watch（ledger 003）。

## Phase 3 点名序列读数（2026-10-07 补测，原始读数 sequence-readings.json）

- `#/scheduling-calendar`：视图切换 month→week（事件数 58→10，onViewChange 生效）；日期导航（header 标签变化）；事件点击 toast（`晚班 - 2026-09-29` 等三条反馈链路齐）；移动/创建闭环读数 = V3/E e2e（见上）。
- `#/calendar-perf-scale`：大数据量下滚动容器 scrollTop 600 写入后保持（V1）；166 个可见事件渲染正常。假反馈豁免裁定见 ledger 005。
- `cal-booking`：日期点选 → aria-selected 落在被点格（dateStatePath 语义生效）。
- `cal-confirm`/`cal-success`：n/a——无 calendar renderer 节点（实测 0），纯静态内容面。
- 已知 flake（非本批回归）：`scheduling-visual-tokens.spec.ts` drag-hover 手势在并行负载下计时敏感（config retries=1 设计面），独立重跑绿、stash 旧实现亦绿。
