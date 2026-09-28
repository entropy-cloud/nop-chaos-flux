# 2026-09-28-7 VirtualBody 虚拟行未渲染 live 缺陷修复

> Plan Status: draft
> Last Reviewed: 2026-09-28
> Source: Plan `2026-09-28-2-data-display-renderer-performance-plan.md` Phase 1（压测 harness 虚拟化模式）执行中暴露的 confirmed live defect；证据链见 Current Baseline
> Related: `packages/flux-renderers-data/src/table-renderer/table-virtual-body.tsx`、`use-table-row-scope-cache.ts`、`table-renderer.tsx`、`docs/architecture/performance-design-requirements.md`

## Purpose

修复表格虚拟化路径（VirtualBody）在真实浏览器（React Compiler 生效）下渲染 0 行的 live 缺陷：`pagination: { enabled: false }` + `virtualThreshold` 触发时页面表体不输出任何数据行。该路径在压测 harness 落地前从未被端到端激活过，本次由 harness 首次曝光。

## Current Baseline

- **触发配置**（performance-table 页 `virtualized` 模式，2026-09-28 引入）：`virtualThreshold: 50` + `scrollHeight`/`autoFillHeight` + `pagination: { enabled: false }`，`source = perfRows`（1000 行）。
- **live 表现（fresh Chromium + dev server，多轮复现）**：`<table>`/`[data-slot="table-container"]` 延迟出现或缺失；最终出现时 `tbody` 仅含空态行（`data-slot="table-empty-row"`，即 `flattenedItems.length === 0`）；无 vite error overlay；`window.__dbg` 式渲染期插桩被 React Compiler 丢弃（`console.error` 无输出、页面无报错）。
- **happy-dom（未编译）对照**：同一 schema 下 `flattenedItems` 有 1000 项、无空态行——说明数据管线（processTableData → treeFlattenedData → paginateTableData → buildFlattenedItems）在未编译环境正常，缺陷仅在编译产物或真实布局环境暴露。
- **virtual gate**：`table-renderer.tsx:514-516` `virtualEnabled = !paginationEnabled && typeof virtualThreshold === 'number' && source.length > virtualThreshold`；注意 `paginationEnabled = schemaProps.pagination?.enabled !== false`（use-table-pagination.ts:40）——**未显式关闭分页时虚拟路径不会被激活**，这正是该路径从未被端到端覆盖的原因。
- **已排除**：行级 scope cache 快照标识改动（Plan 2 Phase 2；live bisect 还原后缺陷依旧）；hook 顺序（useTableRowScopeCache 位置；bisect 还原后依旧）；`processTableData` 排序/筛选改动（vitest 全绿）。
- **未排除的主嫌疑**（按概率）：(1) VirtualBody 为 compiler-skip 组件（`react-hooks/incompatible-library` 豁免），其父 TableRenderer 为编译组件，编译转换下 `scrollRef`（ref callback 赋值）与 VirtualBody 的 `getScrollElement` 间可能失去可观测时序；(2) `useVirtualizer` 的 scroll element 观测在 container `overflow-auto` + maxHeight/height 样式组合下未触发 re-observe；(3) 快照/版本通知在编译组件内的 useSyncExternalStore 订阅时序。
- 相邻事实：`performance-table-page.test.tsx` 已含 blocked 用例（`it.skip`，指向本 plan）记录期望行为。

## Goals

- 真实浏览器下 virtualized 模式输出窗口化数据行（>0 行 `<tr>`，滚动驱动窗口变化）。
- happy-dom 定向测试（以元素/探针可断言的最小行为）与 live 探针（`_tmp/perf-baseline-probe.mjs` 模式）双重转绿。
- 分页开启路径（既有行为）与关闭路径（虚拟）无回归。

## Non-Goals

- 不重写 TanStack Virtual 集成（优先最小修复：时序/观测/订阅接线）。
- 不改 `pagination.enabled` 默认值语义。
- 不扩大 virtualThreshold 的使用面（列表/树不在本 plan）。

## Scope

### In Scope

- `packages/flux-renderers-data/src/table-renderer/table-virtual-body.tsx`、`table-renderer.tsx`、`use-table-row-scope-cache.ts`
- `apps/playground/src/pages/performance-table*`（blocked 用例转绿）
- 上述包 colocated 单测

### Out Of Scope

- 非表格渲染器的虚拟化
- 分页/树/选择语义

## Failure Paths

| 可测场景编号           | 触发                                            | 行为                             | 可重试 | 用户可见表现         |
| ---------------------- | ----------------------------------------------- | -------------------------------- | ------ | -------------------- |
| virtual-body-zero-rows | pagination 关闭 + virtualThreshold + 超阈值数据 | 表体输出 ≥1 窗口行；滚动更新窗口 | 是     | 大数据表可见且可滚动 |

## Test Strategy

档位选择（三选一）：`必须自动化`

本档选择：必须自动化。happy-dom 受布局能力限制：以"flattenedItems 非空 + container/scrollRef 接线存在 + virtualizer 收到非空 scroll element（注入 stub 尺寸）"为断言面；live 行为以探针脚本（信任点击 + 行数断言）作为门禁补充，纳入 closure 证据。

## Execution Plan

### Phase 1 - 失败测试 + 根因定位（Proof 先行）

Status: planned
Targets: `packages/flux-renderers-data/src/__tests__/`、`table-virtual-body.tsx`

- Item Types: `Proof`

- [ ] Proof: happy-dom 定向测试：mock TanStack 尺寸（stub getBoundingClientRect/ResizeObserver）或以 scrollRef 接线 + flattenedItems 非空为断言，先在当前缺陷态运行并记录红证据
- [ ] Proof: 根因定位：依次验证 (a) scrollRef 赋值时序（ref callback vs useVirtualizer 首次观测），(b) compiler-skip 边界两侧的 ref 可见性，(c) 版本通知订阅时序——每一项以最小化实验记录结论到本 plan

Exit Criteria:

- [ ] 失败测试就位且记录红证据
- [ ] 根因结论（含实验证据）写入 plan，至少排除/确认上述三项

### Phase 2 - 修复 + 转绿

Status: planned
Targets: `table-virtual-body.tsx`、`table-renderer.tsx`

- Item Types: `Fix`

- [ ] Fix: 按根因实施最小修复（候选：scroll element 挂载后显式 `rowVirtualizer.measure()`/re-observe；ref callback → `useEffect` 内赋值并触发状态推进；将 VirtualBody 的关键消费改为编译安全的接线）
- [ ] blocked 用例转绿；live 探针（fresh browser）行数 > 0 且滚动后窗口变化
- [ ] `pnpm --filter @nop-chaos/flux-renderers-data test` 全绿；分页开启路径回归绿

Exit Criteria:

- [ ] blocked 用例转绿 + live 探针证据（数字记录）
- [ ] `pnpm --filter @nop-chaos/flux-renderers-data test` 全绿
- [ ] flux-playground 相关用例全绿

## Draft Review Record

- Reviewer / Agent: <<待独立子 agent 填写>>
- Verdict: <<pass | pass-with-minors | revised | degraded>>
- Rounds: <<审查轮数>>
- Findings addressed: <<Blocker/Major 处理记录>>

## Closure Gates

- [ ] confirmed live defect（VirtualBody 零行）已修复且失败测试转绿
- [ ] 行为/契约结果已达成：虚拟窗口化 + 滚动更新 + 分页路径无回归均有 proof
- [ ] 必要 focused verification 已完成（Phase 1-2 Exit Criteria 全勾）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [ ] 受影响的 owner docs 已同步（若确立 virtualThreshold×pagination 组合的契约，更新 performance-design-requirements 或组件文档；无变化则明确写 No owner-doc update required）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- performance-table 压测 harness 的量化数字（修复前后交互延迟对比）在修复落地后补记 daily log。

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:

- <<见 Non-Blocking Follow-ups>>
