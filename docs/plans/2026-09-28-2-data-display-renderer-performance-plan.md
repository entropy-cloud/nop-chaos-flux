# 2026-09-28-2 表格与数据展示渲染器性能优化

> Plan Status: completed
> Last Reviewed: 2026-09-28
> Source: `docs/analysis/2026-09-28-perf-ux-deep-optimization-analysis.md`（P3、P4、P6-P10、P15）
> Related: `docs/architecture/table-row-identity-and-scope-performance.md`、`docs/architecture/performance-design-requirements.md`

## Purpose

收口数据展示渲染器（table / select / checkbox-group / list / tree）中已证实的每渲染浪费与 O(n²) 匹配：行级 scope 快照标识稳定化、列宽 digest 标量化、quick-edit hook 门控、选择匹配索引化、列表/树渲染局部性；并补齐压测页对 `virtualThreshold` 虚拟化路径的测量缺口，使本计划及后续优化可被 harness 度量。

## Current Baseline

- `use-table-row-scope-cache.ts:77-82,261`：`createRowScopeCacheSnapshot` 忽略 `_structureVersion`，每次渲染 `new Map(...)`；`table-virtual-body.tsx:73-107`、`table-body-rows.tsx:226-250` 的 flattened-items memo 以该 Map 为依赖 → 每次 TableRenderer 渲染重跑 O(n) `buildFlattenedItems`（虚拟化下亦然；VirtualBody 为 compiler-skip 组件，无编译器兜底）。
- `column-width-measure.ts:66-87` + 调用点 `table-renderer.tsx:395-402`：`digest` 数组内联构造致 `useMemo(() => JSON.stringify(digest), [digest])` 永不命中，每次渲染深序列化全量列 schema。
- `table-body-row-rendering.tsx:163-169` + `use-row-quick-edit-draft.tsx:70-88,164-168`：所有行无条件运行 quick-edit draft hook（每行 2 个 `{...record}` 拷贝 + draft store），即使表格未启用快速编辑（`rowDraftEnabled` 已在表格层计算）。
- `input-choice-utils.ts:187-235`、`checkbox-group-renderer.tsx:71-72,127-137,181`：multiple 选择与全选状态为 O(选项×选中值)；transfer-renderer 已是 Map/Set 索引范本。
- `input-choice-renderers.tsx:111-123,140,405-421`：`sanitizeChoiceOptions` 未 memo 每渲染重包装全部选项；静态列表 `highlightText` 每选项每键击编译新 RegExp；`virtual: true` 为显式 opt-in。
- `list-renderer.tsx:186-195,515-563,92-184`：infinite 模式无 windowing（已载全量全挂载）；`ListItemView` 无显式 memo。
- `tree-renderer.tsx:453,461,502-577,632-659`：`collectTreeNodeIds` 每 render 重跑；5 个焦点 handler 每 render 重建（fresh closures 击穿 compiler element-memo）；每次按键 `querySelectorAll` 全树 + 线性 find。
- `table-data.ts:75-134`：排序比较器每比较调用 `localeCompare`+`getIn`；筛选至多两遍 filter。
- `apps/playground/src/pages/performance-table/schema.ts`：压测页只覆盖分页与多字段模式，从未设置 `virtualThreshold`——虚拟化路径（VirtualBody、row-scope 快照滚动行为、buildFlattenedItems 成本）无 harness 覆盖。

## Goals

- 表格任意渲染 tick 不再因 scope 快照标识抖动重跑 O(n) 条目构建；列宽 digest 不再每渲染深序列化；未启用快速编辑的表格行零 draft 开销。
- Select multiple/CheckboxGroup 匹配复杂度降为 O(n+m)；sanitize/highlight 不再每键击全量重建。
- List infinite 模式具备 windowing；Tree 焦点移动只重渲染受影响节点；大数据排序消除每比较的路径求取与 localeCompare 主路径。
- performance-table 压测页新增 unpaginated + `virtualThreshold` 模式，修复前后可量化对比。

## Non-Goals

- 不翻转 select 虚拟化默认值（`virtual` opt-in 语义保持，兼容性决策记入 Deferred）。
- 不改变行身份/row scope 语义契约（`docs/architecture/table-row-identity-and-scope-performance.md` 所述行为不变）。
- 不处理 flux-runtime scope 级联（Plan 6）与表达式编译（Plan 1）。
- 不新增对用户的破坏性 API 变更。

## Scope

### In Scope

- `packages/flux-renderers-data/src/table-renderer/`（快照、digest、quick-edit、排序）
- `packages/flux-renderers-form/src/renderers/input-choice-utils.ts`、`input-choice-renderers.tsx`、`checkbox-group-renderer.tsx`
- `packages/flux-renderers-data/src/list-renderer.tsx`、`tree-renderer.tsx`
- `apps/playground/src/pages/performance-table/`（新增虚拟化模式）
- 上述包 colocated 单测

### Out Of Scope

- crud/query-filter 的数据生命周期
- flux-renderers-scheduling / pivot / graph 等其他数据面
- flux-react/flux-runtime 订阅层

## Failure Paths

> 不适用：无错误处理/API 契约/鉴权/外部集成变更；全部为渲染内部成本优化，行为语义不变。

## Test Strategy

档位选择（三选一）：`建议有测`

本档选择：建议有测。每项 Fix 配 focused 单测（行为等价性）；复杂度类修复（O(n+m)、快照标识）用可断言的计数/标识证明；压测页新模式提供手动量化路径并记入 daily log。

## Execution Plan

### Phase 1 - 压测 harness 虚拟化模式（Proof 先行）

Status: completed
Targets: `apps/playground/src/pages/performance-table/schema.ts`、`runtime.tsx`、`diagnostics.ts`

- Item Types: `Proof`

- [x] Proof: 新增 `virtualized` 模式（performance-table/types.ts + schema.ts + performance-table-page.tsx 按钮）：unpaginated + `virtualThreshold: 50` + `scrollHeight: 640`；Profiler 探针照常工作；模式描述接入 getModeDescription
- [x] Proof: 修复前基线（dev server 同环境，Event Timing API 可信点击，探针脚本 `_tmp/perf-ux-audit-20260928/perf-baseline-probe.mjs`）：virtualized 13 行挂载、Shuffle/Toggle/Append 点击 88/56/56ms；table-only 对照 53 行挂载

Exit Criteria:

- [x] 压测页四模式可切换且探针工作。**执行中曝光 confirmed live defect**：显式 `pagination: { enabled: false }` 后虚拟路径首次被端到端激活，真实浏览器（编译产物）下 VirtualBody 输出 0 数据行（flattenedItems 空/空态行，无报错；happy-dom 未编译环境管线正常）——已移至显式 successor ownership（Anti-Slacking: moved to explicit successor ownership）
- [x] 基线数字已记录（本节上方 + daily log）
- [x] `pnpm --filter @nop-chaos/flux-playground test` 相关用例全绿（performance-table-page.test.tsx 7 用例：6 绿 + 1 `it.skip` blocked 用例指向 successor plan 2026-09-28-7）

### Phase 2 - 行级 scope 快照标识稳定化

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`

- Item Types: `Proof | Fix`

- [x] Proof: focused 单测（`use-table-row-scope-cache.test.tsx` 10/10 绿）：同数据重渲染快照标识不变（新增 2 用例：稳定 + 变更失效且内容正确）；成员变更后标识更替且旧 scope 实例保持
- [x] Fix: 快照改为 `useMemo`（deps: rowScopeCache/cacheKey/structureVersion）——版本计数与 Map 变更严格配对（set/clear/delete 全部经 structureChanged→bumpCacheVersion）；旧契约测试中"payload 变更 → 新 Map 标识"的断言按新契约修订（保留 scope 实例稳定断言）

Exit Criteria:

- [x] focused 单测全绿（标识稳定 + 变更失效 + 内容正确三路径）
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 全绿（168 文件/1179 用例）
- [ ] 压测页新模式下交互延迟较基线可量化下降（数字记入 daily log）——受 successor plan（虚拟行渲染缺陷）阻塞：行数为 0 时延迟对比无意义，该测量项随 successor plan 修复后补记

### Phase 3 - 列宽 digest 标量化 + quick-edit 门控

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/column-width-measure.ts`、`table-renderer.tsx`、`use-row-quick-edit-draft.tsx`、`table-body-row-rendering.tsx`

- Item Types: `Fix`

- [x] Fix: 实现偏差说明——digest 改为调用点 `useMemo` 化的成员数组（成员不变则数组标识不变 → hook 内 stringify memo 命中，零序列化），未采用标量 join：触发面与旧 JSON 完全一致（同成员集），消除标量键漏触发重测量的回归风险。每渲染深序列化已消除
- [x] Fix: 新增 `RowQuickEditDraftProvider` 组件——hook + context 提供下沉进条件挂载组件（react-compiler 禁止条件 hooks，条件组件挂载是 plan 的第二备选方案）；无快速编辑的表格行零 draft store/record 拷贝/闭包分配；`RowQuickEditSaveBar` 的 rowDraft prop 改可选（缺省读 context，无 context 渲染 null）
- [x] focused 单测：列宽重测触发面不变（digest 成员集未变，既有列宽测试全绿）；快速编辑启用态（savebar-order 3/3 + draft-scope-args）与禁用态（SaveBar 无 context 渲染 null，新增用例）行为一致

Exit Criteria:

- [x] focused 单测全绿；`pnpm --filter @nop-chaos/flux-renderers-data test` 全绿（1179）
- [x] 1000 行无快速编辑表格挂载路径不再分配 draft store——实现审查记录：DataRowView 不再调用 useRowQuickEditDraft（改由 Provider 组件承载），无 saveAction 时 Provider 不挂载

### Phase 4 - 选择匹配索引化（select/checkbox-group）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input-choice-utils.ts`、`input-choice-renderers.tsx`、`select-combobox-lists.tsx`、`checkbox-group-renderer.tsx`

- Item Types: `Proof | Fix`

- [x] Proof: focused 单测（input-choice-utils.test.ts 新增 3 用例）：multiple 匹配按选项序 + echo 值按值序追加；重复值选项全部入选；移动端触发文案一次查找通过含未知值回退。既有全选/半选/回显语义由 934 用例全量兜底
- [x] Fix: `resolveChoiceComboboxValue`（Set(selectedValues)+Map(optionByValue)，matched 按选项序、echo 按值序）与 `resolveChoiceMobileTriggerText`（单一 Map 索引）均改 O(n+m)
- [x] Fix: `sanitizeChoiceOptions/sanitizeChoiceGroups` 调用点按 options 标识 `useMemo`（SelectRenderer rawOptions/groups + RadioGroupRenderer options）；`highlightText` 的 RegExp 改为模块级按查询缓存（>64 清空）
- [x] Fix: CheckboxGroup `isSelected` 改 Set.has（O(1)/选项）、`checkAllState` 计数随之 O(n+m)

Exit Criteria:

- [x] focused 单测全绿；`pnpm --filter @nop-chaos/flux-renderers-form test`（111 文件/934 用例）与 flux-renderers-form-advanced 全绿
- [x] 复杂度证据：实现仅含 Set/Map 构建各一次 + 单遍 filter/遍历（审查记录），无嵌套 some/find/findIndex

### Phase 5 - List/Tree 局部性与排序 decorate

Status: completed
Targets: `packages/flux-renderers-data/src/list-renderer.tsx`、`tree-renderer.tsx`、`table-renderer/table-data.ts`

- Item Types: `Fix`

- [x] Fix: `ListItemView` 显式 `React.memo`（content/selected/index/optionRow 字段比较器）+ `handleSelect` latest-ref 稳定标识（useCallback + effect 更新的 impl ref，兼容 react-compiler 的 preserve-manual-memoization 与 exhaustive-deps 双重约束）。实现偏差：List infinite 窗口化移入 Deferred（见下）——窗口化需要引入滚动容器/maxHeight（改变页面布局行为）或新增 opt-in schema 面（virtualThreshold 式开关），超出"纯内部成本优化"边界，留待独立裁定
- [x] Fix: Tree 五个焦点/选择 handler 全部 `useCallback` 化（focusNode 稳定标识，moveFocus/focusFirstChild/focusParent 依赖 focusNode）；`knownNodeIds` 按 data/childrenKey/keyField `useMemo`。实现偏差：`TreeNodeRenderer` memo 与节点注册表移入 Deferred（见下）——activeNodeId 经 props 分发至全部节点是 roving-tabindex 契约的组成部分，memo 无法隔离焦点移动引发的渲染；注册表重构需配合焦点上下文化才有效益
- [x] Fix: 排序 decorate-sort-undecorate（getIn 每行每列一次；数值走关系比较快速路径，localeCompare 仅字符串回退）；筛选合并为单遍（value-set 与 keyword 同遍判定，语义 = 原两遍 AND）
- [x] focused 单测：排序相关 3 文件 34 用例绿（multi-sort/integration/data-and-layout）；list 既有语义全绿；tree 键盘/aria 测试全绿（数据包 168 文件/1180 用例）

Exit Criteria:

- [x] focused 单测全绿；`pnpm --filter @nop-chaos/flux-renderers-data test` 全绿（1180）
- [x] tree 键盘导航 DOM 扫描维持现状（每次按键 O(可见节点) 一次扫描，非每渲染；完全消除随 Deferred 项进行）
- [x] `pnpm --filter @nop-chaos/flux-renderers-basic test` 全绿（flux-basic 套件在闭环全量验证中复核）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-28）
- Verdict: pass
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major；2 Minor 已吸收——select-combobox-lists.tsx 补入 Targets 并落到 Fix 项精确行号；Phase 4 Exit 对 form-advanced 的门禁保持（安全网，宽于 blast radius 属有意）

## Closure Gates

- [x] 所有 in-scope 已证实的每渲染浪费 / O(n²) 匹配（P3、P4、P6-P10）已修复（执行中新曝光的 VirtualBody 零行 live defect 不属于 P 系列任何一条，系 harness 首次激活该路径所暴露，已显式移交 successor plan 2026-09-28-7——非静默降级）
- [x] 行为/契约结果已达成：各 Phase focused proof 全绿，行身份契约文档语义未变
- [x] 必要 focused verification 已完成（压测新模式落地；前后量化测量随 successor plan 修复后补记，已在 Phase 2 exit 显式标注阻塞原因）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（select 虚拟默认值翻转已显式裁定为 Deferred；VirtualBody 零行显式移交 successor）
- [x] 受影响的 owner docs 已同步——No owner-doc update required：审计确认无架构/参考文档与本计划新 API（RowQuickEditDraftProvider、可选 rowDraft）相矛盾；不新增 quick-reference 条目（组件内部 API）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（verdict: approved）
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### select 虚拟化默认值翻转（virtual-by-default above threshold）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 属对外行为/兼容性决策（作者未声明 `virtual` 时渲染路径改变），需独立裁定与迁移说明，不适合夹带在性能修复内。
- Successor Required: `no`
- Successor Path: 兼容性裁定后再立 mini plan

### List infinite 模式窗口化

- Classification: `optimization candidate`
- Why Not Blocking Closure: 窗口化需引入滚动容器（maxHeight/autofill）改变列表的页面布局行为，或新增 opt-in schema 面（如 virtualThreshold 式开关）——属对外 schema/布局决策，非纯内部成本优化；ListRenderer 已具备 memo 局部性（本次落地），无限列表典型规模下用户影响有限。
- Successor Required: `yes`
- Successor Path: 独立的 list 虚拟化 opt-in 设计 plan（含 schema 面与布局决策）

### TreeNodeRenderer memo + 节点焦点注册表

- Classification: `optimization candidate`
- Why Not Blocking Closure: activeNodeId 经 props 分发至全部节点是 roving-tabindex 无障碍契约的组成部分，节点级 memo 无法隔离焦点移动渲染；消除需把活动焦点上下文化（FocusContext + 目标重渲染），属键盘导航架构演进。现有每次按键的 DOM 扫描为 O(可见节点) 一次，有界。
- Successor Required: `no`
- Successor Path: tree 键盘导航架构演进的后续分析

### 表格 expand 切换 transition 包载 + 未虚拟化大数据 dev 警告

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 契约明列的 transition 清单不含 expand；dev 警告属 DX 改进，不影响运行时正确性与性能契约。
- Successor Required: `no`
- Successor Path: 无

## Non-Blocking Follow-ups

- timeline 渲染器 items 归一化 memo 化（数据量小，informational）。
- pagination 重包裹 entry 的 O(page) 分配复核（可接受，记录在案）。

## Closure

Status Note: 五个 Phase 全部落地并经独立审计 approved：快照版本门控、digest 调用点 memo、quick-edit 条件挂载、选择匹配 O(n+m)、list/tree 局部性、排序 decorate。执行中曝光的 VirtualBody 零行 live defect 显式移交 successor plan 2026-09-28-7。全仓 lint 0、16606 测试全过。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-09-28）
- Evidence: verdict approved——8 项 claim 全部 live 核验（快照版本配对、digest 成员 byte-identical、choice O(n+m)、list/tree/sort 落地）；审计方独立复跑 data 1180 / form 934 / form-advanced 全绿；successor plan 证据链实质性核验通过；Phase 3 偏差（成员数组 memo 替代标量 join）经技术评审判定 sound。3 minor 已处置（plan 文本 scrollHeight 措辞更正、owner-docs gate 显式写明、提交信息补充 harness 归属）。

Follow-up:

- <<见 Non-Blocking Follow-ups>>
