# 2026-09-28-2 表格与数据展示渲染器性能优化

> Plan Status: active
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

Status: planned
Targets: `apps/playground/src/pages/performance-table/schema.ts`、`runtime.tsx`、`diagnostics.ts`

- Item Types: `Proof`

- [ ] Proof: 新增第三压测模式：unpaginated + `virtualThreshold: 100` + scrollHeight 容器 + 既有 Profiler/mount 探针；模式切换与既有两模式同构
- [ ] Proof: 记录修复前基线数字（该模式下的交互延迟 / 渲染耗时，PerformanceObserver 计时写入 `_tmp` 并摘要进 daily log）

Exit Criteria:

- [ ] 压测页三模式可切换，新模式下表格正常渲染且探针工作
- [ ] 基线数字已记录（plan 附录或 daily log）
- [ ] `pnpm --filter @nop-chaos/flux-playground test` 相关用例（route-matrix/schema-examples）全绿

### Phase 2 - 行级 scope 快照标识稳定化

Status: planned
Targets: `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`

- Item Types: `Proof | Fix`

- [ ] Proof: focused 单测：结构未变（structureVersion 不变）时连续多次 hook 返回同一 Map 标识；行集/结构变化后标识更替且内容正确；虚拟/非虚拟两个 body 消费方的 flattenedItems memo 不再每渲染失效（以构建计数断言）
- [ ] Fix: `createRowScopeCacheSnapshot` 按 structureVersion（或可见键集摘要）门控快照标识；消费方（`table-virtual-body.tsx`、`table-body-rows.tsx`）依赖语义核对

Exit Criteria:

- [ ] focused 单测全绿（标识稳定 + 变更失效 + 内容正确三路径）
- [ ] `pnpm --filter @nop-chaos/flux-renderers-data test` 全绿
- [ ] 压测页新模式下交互延迟较基线可量化下降（数字记入 daily log）

### Phase 3 - 列宽 digest 标量化 + quick-edit 门控

Status: planned
Targets: `packages/flux-renderers-data/src/table-renderer/column-width-measure.ts`、`table-renderer.tsx`、`use-row-quick-edit-draft.tsx`、`table-body-row-rendering.tsx`

- Item Types: `Fix`

- [ ] Fix: digest 由标量片段（列名/宽度/fixed/标志位 join 字符串）构成，memo 键为该字符串；DOM 重测量门控语义保持
- [ ] Fix: `useRowQuickEditDraft` 在 `rowDraftEnabled === false`（无 quickSaveAction 且无行草稿列）时返回模块级零开销 stub API；行为上仅在启用时分配 draft store/拷贝
- [ ] focused 单测：列宽变化仍触发重测量；快速编辑启用/禁用两态行为均与现状一致

Exit Criteria:

- [ ] focused 单测全绿；`pnpm --filter @nop-chaos/flux-renderers-data test` 全绿
- [ ] 1000 行无快速编辑表格挂载路径不再分配 draft store（测试计数或审查记录证明）

### Phase 4 - 选择匹配索引化（select/checkbox-group）

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/input-choice-utils.ts`、`input-choice-renderers.tsx`、`select-combobox-lists.tsx`、`checkbox-group-renderer.tsx`

- Item Types: `Proof | Fix`

- [ ] Proof: focused 单测：multiple 回显（含不在选项集中的 echo 值）、全选半选态、移动端触发文案在索引化前后结果一致（既有语义快照）
- [ ] Fix: `resolveChoiceComboboxValue`/`resolveChoiceMobileTriggerText` 以一次 O(n+m) 的 Map/Set 索引替代双向 filter×some/find
- [ ] Fix: `sanitizeChoiceOptions/sanitizeChoiceGroups` 按 options 标识 memo；`highlightText`（select-combobox-lists.tsx:16-33，逐选项编译 RegExp 处 :22、逐选项调用处 :60）的 RegExp 改为每查询编译一次
- [ ] Fix: CheckboxGroup `isSelected`/`checkAllState` 改用 Set 索引

Exit Criteria:

- [ ] focused 单测全绿；`pnpm --filter @nop-chaos/flux-renderers-form test`、`pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 全绿
- [ ] 复杂度证据：5000 选项 × 1000 选中值场景的匹配调用数为 O(n+m)（测试断言或审查说明）

### Phase 5 - List/Tree 局部性与排序 decorate

Status: planned
Targets: `packages/flux-renderers-data/src/list-renderer.tsx`、`tree-renderer.tsx`、`table-renderer/table-data.ts`

- Item Types: `Fix`

- [ ] Fix: List infinite 模式接入 TanStack Virtual 窗口化（复用 VirtualBody/ai-message-list 既有模式）；`ListItemView` 显式 `React.memo`（content/selected/index 比较器）
- [ ] Fix: Tree 五个焦点 handler `useCallback` 化 + `TreeNodeRenderer` 显式 memo；`knownNodeIds`/`computeTreeSearch` 按 data/query memo；节点焦点注册表以 `Map<nodeId, HTMLElement>` ref 替代每次按键的 querySelectorAll+find
- [ ] Fix: 表格排序 decorate-sort-undecorate（预计算排序键，数值快速路径，localeCompare 仅回退）；筛选合并为单遍
- [ ] focused 单测：list 窗口化下选择/删除行为不变；tree 键盘焦点移动行为不变（含 aria 状态）；排序结果与原实现一致（数值/字符串/混合样本）

Exit Criteria:

- [ ] focused 单测全绿；`pnpm --filter @nop-chaos/flux-renderers-data test` 全绿
- [ ] tree 键盘导航路径不再全树 DOM 扫描（实现审查记录）
- [ ] `pnpm --filter @nop-chaos/flux-renderers-basic test` 全绿（VirtualBody 模式复用无回归）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-28）
- Verdict: pass
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major；2 Minor 已吸收——select-combobox-lists.tsx 补入 Targets 并落到 Fix 项精确行号；Phase 4 Exit 对 form-advanced 的门禁保持（安全网，宽于 blast radius 属有意）

## Closure Gates

- [ ] 所有 in-scope 已证实的每渲染浪费 / O(n²) 匹配（P3、P4、P6-P10）已修复
- [ ] 行为/契约结果已达成：各 Phase focused proof 全绿，行身份契约文档语义未变
- [ ] 必要 focused verification 已完成（压测新模式 + 前后量化数字已记录）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（select 虚拟默认值翻转已显式裁定为 Deferred）
- [ ] 受影响的 owner docs 已同步（若 list 虚拟化/quick-edit 门控引入新行为边界，更新对应组件文档；无变化则明确写 No owner-doc update required）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
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

### 表格 expand 切换 transition 包载 + 未虚拟化大数据 dev 警告

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 契约明列的 transition 清单不含 expand；dev 警告属 DX 改进，不影响运行时正确性与性能契约。
- Successor Required: `no`
- Successor Path: 无

## Non-Blocking Follow-ups

- timeline 渲染器 items 归一化 memo 化（数据量小，informational）。
- pagination 重包裹 entry 的 O(page) 分配复核（可接受，记录在案）。

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:

- <<见 Non-Blocking Follow-ups>>
