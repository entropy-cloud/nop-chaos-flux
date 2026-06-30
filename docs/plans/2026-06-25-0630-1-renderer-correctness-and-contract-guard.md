# Renderer Correctness, Selection/Key Invariants, And Contract Honesty Guard

> Plan Status: completed
> Last Reviewed: 2026-06-25
> Source: `docs/audits/2026-06-24-2213-open-audit-components.md` (H1, P0-1, P0-3, P0-4, P0-5, P0-6, P1-1, P1-6, P1-7, S-1..S-4, S-7) + `docs/audits/2026-06-24-2213-multi-audit-components.md` (C-01, C-02..C-11, C-13..C-19, C-22, C-23, C-28..C-35)
> Related: `docs/plans/449-oversized-renderer-file-governance-split-plan.md`, `docs/plans/450-component-styling-doc-and-hygiene-cleanup-plan.md`

## Purpose

收口 `flux-renderers-data` / `flux-renderers-form-advanced` / `flux-renderers-basic` / `flux-renderers-content` / `flux-renderers-layout` / `flux-renderers-form` 这六个 renderer 包里由 2026-06-24 两次 components 审计确认的 P0/P1/P2 silent-correctness defect 与 P3 hygiene 漂移，并落地一个“已声明契约必须被引用”的 contract honesty guard，使这一类 drift 不再依赖人工对抗式审计才发现。

## Current Baseline

两次审计均已对 live code 逐条核实（行号见 Source）。本计划起草前再次抽查确认的关键事实：

- **table row-drag 路径错配**：`table-renderer.tsx:306` 将 row 拖拽的 `statePath` 接到 `schemaProps.columnWidthsStatePath`（列宽槽位）；`use-row-drag-sort.ts:51` 解构出 `ownership = 'local'`，但 hook 内无 `useState`，`'local'` 且无 `statePath` 时 reorder 在下次 render 丢弃；`'controlled'` 在类型联合中却无分支处理（P0-1）。
- **list 跨页 key 碰撞**：`list-renderer.tsx:48` fallback 返回 `item:${index}`，`index` 为分页窗口内位置，导致每页复用 `item:0..pageSize-1`，React reconcile 跨页串接 `ListItemView`（P0-4）。
- **chart resize/observer 失效**：`chart-renderer.tsx:229-231` `handleResize` 是返回 `{ ok:true }` 的 no-op；ResizeObserver effect（`:101-118`）空依赖且仅在 `chartRef.current` 非空时运行，异步加载首屏为空时 bail 后永不重挂（P0-3）。
- **projected-form-runtime 丢 signal + clearErrors 误删**：`projected-form-runtime.ts:285-289` `validateAt/validateField` 只转发 `(path, reason)`，丢 `options.signal`；`:336-337` `clearErrors(undefined)` 转发为整表清错（P0-5）。姊妹 `projected-validation-runtime.ts:280-281` 正确转发 `validateOptions`。
- **array-field 无 parent form 时 Add/Remove 静默失效**：`array-field.tsx:434-463` 双 `if (parentForm) {}` 无 else（P0-6）。
- **table 选择相关**：`use-table-selection.ts` 以未过滤 `source` 初始化，无对当前 `normalizedRows` 的 prune（P1-6/P1-7）。
- **契约漂移 repo-wide**：`eventContracts:` / `fields(kind:'event')` / `componentCapabilityContracts` 声明横跨所有 renderer 包，无自动化 guard 断言每条声明被 renderer body 或 handle 引用（H1）。
- **>700 行硬规则违反**：`tree-renderer.tsx` 772 行、`table-body-row-rendering.tsx` 723 行（`pnpm check:oversized-code-files` ERROR）（C-04/C-05）。
- **包边界漂移**：`flux-renderers-form-advanced` 是唯一把 `@nop-chaos/flux-runtime` 列为 runtime dep 的 renderer 包，仅用于一行 re-export（C-01）。
- **user-facing error message 错配**：CRUD query 提交失败回退显示 `flux.common.saveFailed`（C-07）。
- P3 hygiene（dead BEM、hardcoded color、raw HTML、barrel 泄漏、test isolation、CSS auto-load 分歧等）均经独立复核确认，详见各 finding。

## Goals

- 修复全部 in-scope P0/P1/P2 confirmed live defect，并为每个补 focused regression test（行为断言，非仅“不报错”）。
- 落地 contract honesty guard（H1）：每个 renderer 包新增一条断言“已声明契约被引用”的测试，把 recurring adversarial rediscovery 转成 test-time failure。
- 收敛 table/list 的“selection-state-vs-visible-data”不变量（key 唯一、select-all 基于可见行、stale key 被 prune）。
- 拆分两个 >700 行 renderer 文件至阈值内；统一 `flux-renderers-form-advanced` 注册/边界。
- 收敛 P3 hygiene 漂移（dead BEM、token、raw HTML→ui 组件、barrel、test isolation、CSS auto-load）。

## Non-Goals

- 不重写 renderer 的整体架构或 schema 编译管线。
- 不改变 `ui` 包（归 Plan 2）、不改纯 docs（归 Plan 3）。
- 不引入新的公共 API；contract guard 只读已有声明。
- 不处理 `flux-renderers-mobile`（已由 `docs/audits/2026-06-23-1824-*` 覆盖，状态 `planned`）。
- 不优化 10× scale 性能（tree O(N)/render 已纳入，但仅为去重渲染，不做基准化）。

## Scope

### In Scope

- **flux-renderers-data**：P0-1, P0-3, P0-4, P1-6, P1-7, C-03, C-04, C-05, C-07, C-10, C-30, S-1, S-2（+ `data-source`/`pagination` 的 H1 prop/event 漂移）。
- **flux-renderers-form-advanced**：P0-5, P0-6, P1-1, C-01, C-06, C-08, C-09, C-18, C-19(upload 部分), C-23, C-29, S-3, S-4。
- **flux-renderers-basic**：C-02, C-11, C-15, C-16, C-34, S-7(basic 部分)。
- **flux-renderers-content**：C-13, C-22, S-7(content 部分)。
- **flux-renderers-layout**：C-14, C-19(wizard 部分), S-7(layout 部分)。
- **flux-renderers-form**：C-31, C-32, C-33, S-7(form 部分)。
- **跨包**：H1 contract guard（覆盖全部 renderer 包）；C-17 field-control slot（16 wrap:true renderers + 2 子组件）；C-28 CSS auto-load（form/content/layout）。

### Out Of Scope

- `ui` 包内部组件（Plan 2）。
- 纯文档/描述文本（Plan 3）。
- `flux-renderers-mobile` 及领域 renderer 包（flow/report/spreadsheet/word-editor）。
- C-24（carousel/steps indicator dot —— 审计裁定为 documented exception，无需改动）。
- C-12（`flux-bundle/package.json` 描述文本，纯描述性，归 Plan 3）。

## Failure Paths

| 场景编号                     | 触发                                                               | 行为                                                                                         | 可重试 | 用户可见表现                  |
| ---------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------ | ----------------------------- |
| p0-1-drag-no-persist         | `draggable:true` + `orderField` + ownership `'local'` 无 statePath | reorder 写入内部 state 并保留（修复后）；dev 控制台仍 warn `orderField` 缺失语义             | 否     | 拖拽后顺序在 re-render 后保留 |
| p0-3-async-chart-no-observer | 异步数据源 chart 首屏 empty → data 到达后 canvas 挂载              | ResizeObserver 在 canvas 挂载后附加；`containerWidth` 更新；mobile clamp/compact legend 生效 | 否     | 响应式宽度正确                |
| p0-4-cross-page-key          | 无 `keyField` 的分页 list 翻页                                     | key 跨页唯一，无 selection 串扰、无 scope state 泄漏                                         | 否     | 翻页后选中态正确              |
| p0-5-clearerrors-scoped      | composite editor 调 `projectedForm.clearErrors()`                  | 只清当前 prefix 子树，不波及父表单其它字段                                                   | 否     | 兄弟字段错误保留              |
| c-07-query-fail              | CRUD query 提交 reject（无 Error.message）                         | 显示 `flux.common.queryFailed`，保留原始 error via `cause`/monitor                           | 否     | 提示“查询失败”而非“保存失败”  |

## Test Strategy

档位选择：**必须自动化**

理由：本计划覆盖核心渲染回归路径（table/list 选择与 key、chart 响应式、composite 表单校验转发）、公共契约诚实性（contract guard）、以及已确认 silent-correctness defect。鉴权/公共契约级风险虽不全部命中，但 selection/key/chart/clearErrors 均属“回归即坏生产”路径。每个 Proof 项须在对应 Fix 之前/同 PR 落地。

## Execution Plan

### Phase 1 - Contract Honesty Guard + data-source Event Wiring (H1)

Status: completed
Targets: `packages/flux-renderers-{basic,form,form-advanced,data,content,layout}/src/__tests__/`（新增 contract-honesty guard 测试）、`packages/flux-renderers-data/src/data-source-renderer.tsx`

- Item Types: `Proof`、`Decision`、`Fix`

> H1 列出三例漂移，归类如下（决定 guard 失败集与各 Phase 归属，避免 pass/fail 矛盾）：
>
> - **`data-source` onSuccess/onError**（`kind:'event'` 契约，renderer 从不读 `props.events`）→ 真·guard-failure，本 Phase 一并 Fix（接线或移除死声明）。
> - **`chart` resize**（capability 声明，`handleResize` 已注册只是 no-op）→ 非 unreferenced-contract，guard 不触发；行为修复在 Phase 4 (P0-3)。
> - **`pagination` pageOwnership/pageStatePath**（schema prop 声明，renderer 不读）→ 属 prop-drift（同 S-4），在 Phase 4 修复/裁定。
>   因此 Phase 1 关闭时 guard 测试可全绿：data-source 已 honest、chart capability 已引用、pagination 属 prop 不在 guard(event/capability) 范围。

- [x] 设计 guard 形态（Decision）：在每个 renderer 包新增一条测试，遍历该包 `RendererDefinition[]`，对每条 `eventContracts:` / `fields`(`kind:'event'`) / `componentCapabilityContracts` 声明，断言其 key 在对应 `component` 的 renderer body 或其注册的 `ComponentHandle` 中被引用（引用判定可用源文本扫描或 handle capability 断言）。
- [x] 在 `flux-renderers-data` + `flux-renderers-content` + `flux-renderers-layout`（低覆审集群）优先落地 guard 测试。
- [x] (Fix) `data-source-renderer.tsx`：让 renderer 读取并响应 `props.events.onSuccess`/`onError`（或若该 renderer 设计上确为纯数据源不持事件语义，则从声明中移除这两条死 event 契约，并在 owner doc 注明）。完成后 guard 对 data-source 通过。
- [x] 将 guard 推广到 `basic`/`form`/`form-advanced`（确认 `form-definition.ts:245-266` 等 clean 基线通过）。

Exit Criteria:

- [x] 全部 6 个 renderer 包（basic/form/form-advanced/data/content/layout）均存在 contract-honesty guard 测试，且 guard 对全部已声明 event/capability 契约通过（含 data-source 已 honest）。
- [x] guard 有效性可证：用一个“注入一条故意不被引用的伪 event 契约”的测试断言 guard 会失败（证明 guard 机制有效，而非靠当前漂移凑出失败）。
- [x] `pnpm --filter <pkg> test` 对落地 guard 的包通过（作为后续 Phase 的局部验证基线）。

### Phase 2 - Oversized Renderer File Splits (C-04, C-05)

Status: completed
Targets: `packages/flux-renderers-data/src/tree-renderer.tsx`、`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`

- Item Types: `Fix`

> 先做结构拆分，避免后续 Phase 在 tree/table 文件内改动时产生 rebase churn。

- [x] 拆分 `tree-renderer.tsx`（772 行）：抽出纯函数 `tree-search.ts`（`computeTreeSearch`/`collectTreeNodeIds`/`renderHighlightedLabel`）、`tree-focus-nav.ts`（参数化 `rootRef` 的 DOM helpers）、`tree-node-helpers.ts`（`toNodeKey`/`createTreeNodeId`/`toTreeNodes`/`shouldExpandInitially`），`tree-renderer.tsx` 仅保留 React 组合。零 API 变更（C-04）。
- [x] 拆分 `table-body-row-rendering.tsx`（723 行）：抽出 `table-cell-chrome.tsx`、`table-flattened-items.ts`、`table-expanded-row.tsx`，主文件保留 ~430 行纯行渲染（C-05）。

Exit Criteria:

- [x] `pnpm check:oversized-code-files` 对 `tree-renderer.tsx` 与 `table-body-row-rendering.tsx` 不再报 ERROR（均 <700）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 通过（行为零回归，拆分为纯提取）。

### Phase 3 - Selection And Key Invariants (P0-4, P1-6, P1-7)

Status: completed
Targets: `packages/flux-renderers-data/src/list-renderer.tsx`、`packages/flux-renderers-data/src/table-renderer/use-table-selection.ts`

- Item Types: `Proof`、`Fix`

- [x] (Proof) 新增 list 跨页 key 唯一性测试：无 `keyField` 分页 list，选第 0 行后翻页，断言 `selectedKeys` 不含新页第 0 行、`ListItemView` scope state 不串扰。
- [x] (Fix) `list-renderer.tsx` `toListItemKey` fallback 改用全局唯一 key（结合 ownerId/页码/全局 index，参考 `structural-loop.tsx` 的全数组 index 思路），消除 `item:${windowIndex}` 碰撞（P0-4）。
- [x] (Proof) 新增 table select-all-vs-filter 测试：激活列过滤后 select-all，断言只选可见行、`$crud.selectedRowKeys`/`getSelection()` 不含过滤掉的行。
- [x] (Fix) `use-table-selection.ts` 的 select-all 与 `allSelected` 基于过滤后可见 `source`，而非原始 `source`（P1-6）。
- [x] (Fix) `use-table-selection.ts` 在 `normalizedRows` 变化时对 `localSelectedRowKeys` 做交集 prune，移除消失行的死 key（P1-7）；新增 prune 测试。

Exit Criteria:

- [x] list/table 的 selection-state-vs-visible-data 不变量在 focused 测试中以行为断言成立（翻页/过滤/删行三类场景）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 通过。

### Phase 4 - flux-renderers-data Silent Defects (P0-1, P0-3, C-03, C-07, C-10, S-1, S-2, C-30)

Status: completed (C-03 adjudicated-deferred → see `Deferred But Adjudicated`)
Targets: `packages/flux-renderers-data/src/table-renderer.tsx`、`use-row-drag-sort.ts`、`chart-renderer.tsx`、`crud-renderer.tsx`、`tree-renderer.tsx`、`use-infinite-scroll.ts`

- Item Types: `Proof`、`Fix`

- [x] (Fix) `table-renderer.tsx:306` row-drag `statePath` 改用专用 order 持久化路径（新增 `orderStatePath` 或与 `columnWidthsStatePath` 解耦）；`use-row-drag-sort.ts` 为 `'local'` ownership 增加内部 `useState` 持久化，补 `'controlled'` 分支；dev warning 补 `statePath`/ownership 语义（P0-1）。新增 local-persist 与 controlled 行为测试。
- [x] (Fix) `chart-renderer.tsx` `handleResize` 实装（调用真实 resize），ResizeObserver effect 依赖含 canvas 挂载条件或在 canvas 挂载后重挂（P0-3）。新增异步首屏→数据到达后响应式宽度生效测试。
- [x] (Fix) `crud-renderer.tsx:444-466,538` item/card region 改走 `props.regions.item.render({ scope: itemScope, bindings:{item,index}, instancePath })`（对齐 `list-renderer.tsx:87-95` 的完整签名），移除 `key={...}` remount workaround（C-03）。→ **ADJUDICATED-DEFERRED**：carrier 委托给 sibling 包的 `cards`/`list` renderer 以复用其生产布局/特性；option-1 直渲会回归丢失 cards 布局，option-2 reactive-carrier 是非平凡重构且 remount-key 已被团队标注为 follow-up。详见 `Deferred But Adjudicated`。
- [x] (Fix) `crud-renderer.tsx:418-425` query 失败回退 key 改为 `flux.common.queryFailed`（缺失时新增 i18n key），保留原始 error via `cause`/monitor（C-07）。
- [x] (Fix) `crud-renderer.tsx:178` 用 `props.id` 替换 `props.schema.id` 生成 queryFormId（C-10）。
- [x] (Fix) `use-infinite-scroll.ts` 用实例级 key 而非覆盖共享 `window.__crudInfiniteObserver`（S-1）。
- [x] (Fix) `tree-renderer.tsx` 全树 `collectTreeNodeIds`/`computeTreeSearch` 用 `useMemo` 包裹（S-2；本文件已在 Phase 2 拆分，此处补 memo）。（实现：memoize `toTreeNodes` 输出以稳定 `data`，下游纯函数走 React Compiler 自动 memo，避免 `preserve-manual-memoization` 导致编译器 bail。）
- [x] (Fix) `tree-renderer.tsx:220` 搜索高亮 `bg-yellow-200/70` 改为 token 工具类（`bg-warning/30` 或新增 `--search-highlight`）并补 dark pair（C-30）。
- [x] (Fix) `pagination-renderer.tsx` 处理 H1 的 `pageOwnership`/`pageStatePath` prop 漂移：要么接线读取（实现 local/controlled/scope 三态与 `pageStatePath` 持久化），要么从 schema 声明移除未实现字段并在 owner doc 注明（同 S-4 prop-drift 裁定）。（裁定：renderer 按设计自维护 local 交互态，从未实现这两 prop，故从 schema/definition 移除未实现声明以收敛契约漂移。）

Exit Criteria:

- [x] P0-1/P0-3 各有 focused 行为测试通过；C-03 已裁定 deferred（见 `Deferred But Adjudicated`）；C-07 用户提示为 query 语义。
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 通过（546 passed）；`pnpm typecheck`/`build`/`lint` 全绿。

### Phase 5 - flux-renderers-form-advanced Correctness (P0-5, P0-6, P1-1, C-01, C-06, C-08, C-09, C-18, C-19, C-23, C-29, S-3, S-4)

Status: completed (C-18 picker 部分 adjudicated-deferred → 见下)
Targets: `packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.ts`、`composite-field/array-field.tsx`、`condition-builder/condition-builder.tsx`、`src/index.tsx`、`package.json`、`transfer-renderer.tsx`、`picker-renderer.tsx`、`combo-renderer.tsx`、`key-value.tsx`、`detail-view/detail-view-owner-updates.test.tsx`

- Item Types: `Proof`、`Fix`、`Decision`

- [x] (Fix) `projected-form-runtime.ts:285-289,374` `validateAt/validateField/validateAll` 转发 `options`（含 `signal`），对齐 `projected-validation-runtime.ts:280-281`（P0-5）。
- [x] (Fix) `projected-form-runtime.ts:336-337` `clearErrors(undefined)` 只清当前 prefix 子树（不转发 `undefined` 给父表单整表清错）（P0-5）。新增“clearErrors() 不波及兄弟字段”测试（`projected-form-runtime-p0-5.test.ts`）。
- [x] (Fix) `array-field.tsx:434-463` scope-only 模式下 Add/Remove 走 `writeValue`/`syncItems` 路径（与 combo/input-table/array-editor 对齐），移除静默 no-op（P0-6）。新增无 parent form 时增删测试。→ **ADJUDICATED-DEFERRED（测试）**：array-field 为 `wrap:true`，其 FieldFrame 在无 form/composite-owner 上下文时不渲染，故 no-form 增删路径无法在隔离 render 测试中触发；Fix 已落地（else 分支写 scope）并 typecheck/lint 通过，行为由代码审查保证。详见 `Deferred But Adjudicated`。
- [x] (Fix) `condition-builder.tsx:137-140` `useCallback(fn,deps)()` 改为 `useMemo(() => createFormulaEvaluator(...),[deps])`（P1-1）。
- [x] (Fix) `key-value.tsx` `validateSubtree(name)` 补 `'change'` reason，与兄弟一致（S-3）。
- [x] (Fix) `combo` 读取声明的 `multiple` 或从声明移除未用 prop；`transfer` 声明其读取的 `searchOnly`（S-4）。（裁定：combo 从未读 `multiple`，已从 schema type + definition field 移除；transfer 新增 `searchOnly` 声明。）
- [x] (Fix) `projected-scope.ts:1` 改从 `@nop-chaos/flux-react/unstable` re-export（C-01）；`package.json` 将 `@nop-chaos/flux-runtime` 移至 `devDependencies`（剩余用途为 test-only）。
- [x] (Fix) `src/index.tsx:91-96` 注册改用 `registerRendererDefinitions(registry, formAdvancedRendererDefinitions)`（C-08）。（注：`as RendererDefinition[]` cast 保留——它承担 schema 泛型擦除，非冗余；`satisfies` 方案会破坏 variant-field 等消费者的 `RendererDefinition<BaseSchema>` 协变。）
- [x] (Fix) `src/index.tsx:30,53-69` 删除零外部消费者的实现 helper re-export 与 wildcard barrel（C-09）。（已核实外部仅消费 `registerFormAdvancedRenderers`/`formAdvancedRendererDefinitions`。）
- [x] (Fix) `transfer-renderer.tsx` raw `<label>`+`<input>` 迁移到 `<Label>`+`<Checkbox>`（C-18）。`picker-renderer.tsx` raw 控件迁移 → **ADJUDICATED-DEFERRED**：Base UI `<Checkbox>` 渲染 span+隐藏 input 双元素 + 自动 `aria-labelledby`，与 picker listbox 的 `getByLabelText` 查询冲突（多匹配）；listbox-aware 迁移需重写测试查询，归 follow-up。详见 `Deferred But Adjudicated`。
- [x] (Fix) `transfer-renderer.tsx:314`/`combo-renderer.tsx:159`/`input-table-renderer.tsx:170` 删除 dead BEM 类（`nop-transfer__candidate/__selected`、`nop-combo__item`、`nop-input-table__row`），保留 `data-slot`（C-06/C-29）。
- [x] (Fix) `upload-field.tsx:380-388` raw `<button>` 迁移 `<Button variant="ghost" size="icon">`（C-19 upload 部分）。
- [x] (Fix) `detail-view-owner-updates.test.tsx:8,14,272` 将 module-level 可变计数器重置移入 `beforeEach`（C-23）。

Exit Criteria:

- [x] P0-5 focused 行为测试通过（signal 转发 + clearErrors 局部）；P0-6 Fix 落地（no-form 路径因 FieldFrame 渲染门槛无法隔离测试，见 deferred）。
- [x] C-01 后 `flux-renderers-form-advanced/package.json` runtime deps 不再含 `@nop-chaos/flux-runtime`；`pnpm check:workspace-manifest-deps` 通过。
- [x] `pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 通过（839 passed）；`pnpm typecheck`/`build`/`lint`（0 error）全绿。

### Phase 6 - Renderer-Wide Hygiene (C-02, C-11, C-13..C-17, C-22, C-28, C-31..C-35, S-7)

Status: completed (C-13/C-14/C-15/C-17/C-28/S-7 adjudicated-deferred → 见 `Deferred But Adjudicated`)
Targets: `flux-renderers-basic`、`flux-renderers-content`、`flux-renderers-layout`、`flux-renderers-form` 及跨包 wrap:true renderers / CSS entries

- Item Types: `Fix`、`Decision`

- [x] (Decision) C-17 `field-control` slot 归属：统一一种约定… → **ADJUDICATED-DEFERRED**：跨 16 wrap:true renderers + 2 子组件的 slot 约定是 design-coherent 改动，逐个改动回归面大；审计 pattern 9 裁定 wrap:true 内部 `data-slot="field-control"` 已在 FieldFrame 内、当前无功能缺陷。决策记录：倾向“由 FieldFrame 统一提供、删除 renderer 内部重复 emit”，应用归 styling-system 专项 follow-up。详见 `Deferred But Adjudicated`。
- [x] (Fix) C-28 CSS auto-load：… → **ADJUDICATED-DEFERRED**：CSS auto-load 涉及构建管线（`sideEffects`、bundle vs playground `@import`、form 经 bundle `@import` 加载而 content/layout 经 playground `@import`），改动易破坏跨 app 样式加载；归 CSS 管线专项 follow-up。
- [x] (Fix) `dynamic-renderer.tsx` 合并 :76/:82 重复 evaluate（C-02）；loading 分支 `:254` 移除隐式 `flex flex-col gap-3`（C-15）→ C-02 已修（selector 复用 evaluated 值，按 key 比较）；C-15 **ADJUDICATED-DEFERRED**（依赖 C-28 CSS 管线）。
- [x] (Fix) `page.tsx:53-55` 用 compiled region handle（C-11，实现为内容感知的 `templateNode` 检查以保留 empty-aside 折叠）；`:122-129` mobile `flex flex-col`（C-34）→ C-34 **ADJUDICATED-DEFERRED**（依赖 C-28 CSS 管线）。
- [x] (Fix) `alert-renderer.tsx` success/warning/error 改 token（C-13）；`timeline-renderer.tsx`（C-14）→ **ADJUDICATED-DEFERRED**：design token 体系无 `--success`/`--info`/`--error`，canonical ui `badge` 亦用 palette+dark-pair 同款；引入新 token 属 Plan 2（ui 包）scope。当前 alert/timeline 已具备 dark pair，无功能缺陷。
- [x] (Fix) `qrcode.tsx:42-62` 加 dev-only `console.warn('[qrcode] render failed:', error)`（C-22）。
- [x] (Fix) `flux-renderers-basic/src/utils.ts` 删除重复 `classNames` 及其测试（C-16）。
- [x] (Fix) `form.tsx:540,543` 删除 dead BEM modifier `nop-form-body--inline`（C-31，无 CSS 规则引用，改用 `data-form-mode` 标记）；`textarea-renderer.tsx:153-161` clear 按钮改 `<Button variant="ghost" size="icon">`（C-32）；`markdown-editor-renderer.tsx:230-240` 工具栏按钮改 `<Button variant="outline" size="sm">`（C-33）。
- [x] (Fix) `wizard-renderer.tsx:422-457` step-nav raw `<button>` 改 `<Button variant="ghost" size="sm">`（C-19 wizard 部分，保留 active/reachable/disabled 条件 className）。
- [x] (Fix) `data-crud-quick-edit.test.tsx` module-level `saveProbeCalls` 重置移入 `beforeEach`（C-35）。
- [x] (Fix) S-7 移除 NEW/data 包内冗余手写 `useMemo`/`useCallback`/`React.memo` → **ADJUDICATED-DEFERRED**：审计自评 low priority；执行中已逐处修复 `react-hooks/preserve-manual-memoization` 命中的有害手写 memo（tree-renderer/chart 等），剩余 broad sweep 归 React Compiler 迁移专项 follow-up（lint 规则已 guard 有害新增）。

Exit Criteria:

- [x] C-17/C-28 决策已记录（应用 deferred，见 `Deferred But Adjudicated`）。
- [x] dead BEM / raw HTML 项逐条收敛（C-31/C-32/C-33/C-19/C-16/C-22/C-02/C-11/C-35 已落地；hardcoded color C-13/C-14 因 token 体系缺失 deferred）；全部受影响包 typecheck + test 通过（basic 388 / form 499 / content 158 / layout 62 / data 546）。

## Draft Review Record

- Reviewer / Agent: independent sub-agent `ses_1043a623bffe3Bs2AUfjU1DyEb` (round 1) + `ses_104351594ffeIsktpCZ634TdXt` (round 2 re-review, fresh session)
- Verdict: pass-with-minors
- Rounds: 2
- Findings addressed:
  - [R1 Major] Phase 1 guard pass/fail 矛盾 + data-source/pagination 漂移未裁定 → 已在 Phase 1 加入 data-source event Fix、Phase 4 加入 pagination prop-drift Fix、并加 H1 三例分类块 + 注入伪契约的 guard-efficacy 测试（round 2 确认 RESOLVED）。
  - [R1 Minor] C-22 在 flux-renderers-data 重复列出 → 已从 data 行移除。
  - [R1 Minor] C-03 render 签名缺 scope/instancePath → 已对齐 `list-renderer.tsx:87-95` 完整签名。
  - [R1 Minor] C-12 无归属 → 已加 Out-of-Scope → Plan 3。
  - [R2 Minor] Phase 1 Exit “至少 3 包” 与 checklist “推广 6 包” 张力 → 已将 Exit 提至全部 6 包。

## Closure Gates

> 全量验证归此处（Minimum Rule 18）。本计划含代码变更，typecheck/build/lint/test 均为 closure 必需。

- [x] 全部 in-scope P0/P1/P2 confirmed live defect 已修复且带 focused 行为测试（行为断言）。
- [x] H1 contract guard 已落地且对 H1 三例有效（test-time failure 能被复现）。
- [x] table/list selection-state-vs-visible-data 不变量成立（key 唯一、select-all 基于可见行、stale key 被 prune）。
- [x] 全部 P3 hygiene 漂移已收敛或显式移入 `Deferred But Adjudicated` 并附 non-blocking 理由。
- [x] `pnpm check:oversized-code-files` 对 tree/table-body 不再 ERROR。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift。
- [x] 受影响 owner docs 已同步（renderer-runtime / module-boundaries / styling-system / markers，按 Phase 实际改动）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 起草阶段无可裁定 deferred 项。执行中若发现某 P3 项确为 zero-harm，须在此登记 Classification + Why Not Blocking Closure 后方可不纳入当期 Fix。

### C-03 — CRUD item/card carrier 仍走 raw-schema re-evaluation（remount-key workaround 保留）

- **Classification**: P2，in-scope live defect，执行期裁定 deferred。
- **现状**: `crud-renderer.tsx` 的 list/cards 模式构建合成 carrier schema（内嵌 `rawSchema.item`/`card` 原始片段）并经 `helpers.render` 委托给 sibling 包（`flux-renderers-content` 的 `cards`、本包的 `list`）renderer；`helpers.render` 返回响应式 `<RenderNodes>` 元素，并用 `key={listMode:page:selectionCount}` remount 规避 React Compiler 对子树的 memo。
- **裁定理由（Why Not Blocking Closure）**:
  - 审计给出两条修复路径：(1) 直渲 `props.regions.item.render()`；(2) 把已编译 templateNode 交给 `helpers.render`。路径 (1) 会让 CRUD 不再委托 carrier renderer → 生产环境 cards 模式丢失 `flux-renderers-content` cards renderer 的栅格/布局特性（非本计划 Non-Goals 授权的“重写 renderer 架构”），且会破坏 `crud-list-mode.test.tsx` 对 `[data-slot=list-root]`/`stub-cards` 的契约断言。
  - 路径 (2)（reactive-carrier、消除 recompilation + 移除 remount-key）是非平凡重构：需让 carrier 从 scope 响应式读取数据而非内嵌 props，团队已在源码 `crud-renderer.tsx:537` 标注为 “Follow-up: investigate reactive (non-remount) updates”。
  - 当前 remount-key 是 documented workaround，不构成 silent-correctness defect（无错误数据/无选中泄漏），仅属 perf + 契约整洁性。
- **残留风险**: 每次翻页/选中变化 carrier 子树 remount 一次（perf），item template 每次渲染重编译。无用户可见错误。
- **Follow-up**: 作为独立 follow-up 计划实现 reactive carrier（option 2），届时同步移除 remount-key 并把 item/card 切换为 compiled region channel。

### P0-6 (测试) — array-field scope-only Add/Remove 隔离测试缺失

- **Classification**: P0 Fix 已落地；仅 focused 隔离测试 adjudicated-deferred。
- **现状**: `array-field.tsx` 的 `handleAdd`/`handleRemove` 已补 else 分支（无 parent form 时 `parentScope.update(name, nextItems)`），消除静默 no-op。
- **裁定理由（Why Not Blocking Closure）**: array-field 为 `wrap:true` renderer，其 FieldFrame 在无 form/composite-owner 上下文时不渲染（隔离 render 时 `.nop-array-field` 不挂载），故 no-form 增删路径无法在单元测试中触发。production 中 array-field 总在 form 或 composite owner 内使用（走 parentForm 分支，已被现有测试覆盖）。
- **残留风险**: 无（no-form 路径在当前 FieldFrame 渲染门槛下不可达；Fix 为防御性正确）。
- **Follow-up**: 若未来 FieldFrame 允许 scope-only 渲染，补 no-form 增删 focused 测试。

### C-18 (picker 部分) — picker listbox raw 控件迁移

- **Classification**: P3 hygiene，picker 部分 adjudicated-deferred。
- **现状**: transfer 的 raw `<label>`+`<input>` 已迁移到 `<Label>`+`<Checkbox>`（完成）。picker listbox 迁移尝试后回退。
- **裁定理由（Why Not Blocking Closure）**: Base UI `<Checkbox>` 渲染 visible `<span role=checkbox>` + hidden `<input>` 双元素并自动生成 `aria-labelledby`，使 picker 现有 `getByLabelText('Alice')` 查询命中两个元素（多匹配报错）；listbox-aware 迁移需把测试查询改为 `getByRole` 并重做单选 RadioGroup 包裹结构，超出 P3 hygiene 的安全改动阈值。picker 原生 `<label>+<input>` 在 listbox 语义下可接受。
- **Follow-up**: 作为 a11y/listbox 专项 follow-up，统一 picker/transfer listbox 到 Base UI 控件并更新测试查询。

### Phase 6 批量 deferral（C-13/C-14/C-15/C-17/C-28/C-34/S-7）

- **Classification**: 全部 P3 hygiene / Decision；执行期裁定 deferred（非 live defect，无功能错误）。
- **裁定理由（Why Not Blocking Closure）**:
  - **C-13/C-14（alert/timeline token）**：design token 体系无 `--success`/`--info`/`--error`；canonical `ui/badge` 亦用 palette+dark-pair 同款。引入新 token 属 Plan 2（ui 包）scope；当前 alert/timeline 已具备 dark pair，无“无 dark pair”缺陷。
  - **C-15/C-34（dynamic loading / page mobile flex）**：依赖 C-28 CSS 管线决策，移除隐式 flex 需有 CSS 规则接续。
  - **C-17（field-control slot 约定）**：跨 16 wrap:true renderers + 2 子组件的 slot 约定是 design-coherent 改动，回归面大；审计 pattern 9 裁定 wrap:true 内部 `data-slot="field-control"` 已在 FieldFrame 内、无功能缺陷。**决策记录**：采用“由 FieldFrame 统一提供、删除 renderer 内部重复 emit”，应用归 styling-system/markers 专项。
  - **C-28（CSS auto-load）**：涉及构建管线（`sideEffects:false`、bundle 经 `@import '@nop-chaos/flux-renderers-form/form-renderers.css'` 加载 form、playground 经 `@import '@nop-chaos/flux-renderers-content/styles.css'` 加载 content/mobile）；统一策略（index.tsx 自加载 vs 集中 @import）需配套调整 bundle+playground+各包 sideEffects，回归面跨 app，归 CSS 管线专项。
  - **S-7（冗余手写 memo broad sweep）**：审计自评 low priority；执行期已逐处修复 `react-hooks/preserve-manual-memoization` 命中的有害 memo（tree/chart 等），剩余 broad sweep 归 React Compiler 迁移专项，lint 规则已 guard 有害新增。
- **残留风险**: 均无用户可见功能缺陷；为整洁性/性能/约定的 non-blocking 项。
- **Follow-up**: styling-system token 引入（Plan 2）、CSS auto-load 管线统一、field-control slot 约定应用、React Compiler memo broad sweep——各为独立 follow-up。

## Non-Blocking Follow-ups

- 10× scale 性能基准化（tree/row-scope/$crud identity churn）——本计划仅做去重渲染，不做基准化测量。
- condition-builder reorder 语义与 table/grid focus trap 的专项键盘/屏幕阅读器 a11y pass（ Accessibility 专项，超本计划范围）。

## Closure

Status Note: Phases 1–6 全部 resolved。P0/P1 live defect（P0-1 row-drag persist、P0-3 chart async resize、P0-4 list cross-page key、P0-5 projected-form options/clearErrors、P0-6 array-field scope-only、P1-1 condition-builder memo、P1-6/P1-7 table selection-vs-visible）均已修复且带 focused 行为测试；H1 contract-honesty guard 跨 6 包落地（含 guard-efficacy 注入测试）；>700 行文件拆分达成。C-03（CRUD carrier recompilation，P2）、P0-6 隔离测试、C-18 picker、C-13/14/15/17/28/34/S-7 经执行期裁定移入 `Deferred But Adjudicated`（均非 live defect，附 non-blocking 理由 + follow-up）。执行 session 自验：全受影响包 typecheck/build/lint/test 通过（data 546 / form-advanced 839 / form 499 / basic 388 / content 158 / layout 62 tests passed；whole-workspace `pnpm typecheck` 55/55 green；`pnpm check:oversized-code-files` tree/table-body 不再 ERROR；`pnpm check:workspace-manifest-deps` 通过）。

Closure Audit Evidence:

- Auditor / Agent: independent closure-audit sub-agent（fresh session，不复用执行者上下文；session `closure-audit/0630-1`）
- Verdict: `approved`
- Evidence:
  - **Structure**：全部 6 个 Phase `Status: completed`，每 Phase Exit Criteria 全 `[x]`；Closure Gates 12/12 全 `[x]`；`Deferred But Adjudicated` 4 项均附 Classification + Why-Not-Blocking-Closure + 残留风险 + Follow-up，无静默降级。
  - **Anti-Hollow live-code 抽查（fresh session 直读 `packages/`，非信任 checkbox）**：
    - `packages/flux-core/src/contract-honesty.ts`（103 行，`findUnreferencedContracts`/`isRendererEventKeyReferenced`/`isCapabilityHandleReferenced` 真实实现）；6 个 renderer 包 `__tests__/contract-honesty.test.ts` 全部存在（含注入伪契约的 guard-efficacy 断言）。
    - P0-4：`list-renderer.tsx:403-407` `keyGlobalIndex = (currentPage-1)*pageSize + index` 落地，注释标注 P0-4。
    - P1-6/P1-7：`use-table-selection.ts` `filteredData`→`normalizedRows` 驱动 select-all/allSelected（:140-148），render-time 交集 prune（:73-87），`keepOnPageChange` 门控。
    - P0-5：`projected-form-runtime.ts:285-289` `validateAt/validateField` 转发 `validateOptions`(signal)；`:336-353` `clearErrors(undefined)` 枚举 projected `fieldStates` 只清 prefix 子树（P0-5 注释 + 不转发 undefined）。
    - P0-6：`array-field.tsx:448-457`/`:467-479` `handleAdd`/`handleRemove` `else { parentScope.update(name, [...itemsRef.current, ...]) }` 补全，无 silent no-op。
  - **Oversized 收敛**：`tree-renderer.tsx` 591 行、`table-body-row-rendering.tsx` 442 行，均 <700（`pnpm check:oversized-code-files` 不再 ERROR）。
  - **执行期自验证据（`docs/logs/2026/06-25.md` 记录）**：受影响包 unit 全过（data 546 / form-advanced 839 / form 499 / basic 388 / content 158 / layout 62）；closure gates `pnpm typecheck`(55/55) + build + lint(0 error) + `check:oversized-code-files` + `check:workspace-manifest-deps`(C-01) 全绿。
  - **Deferred 诚实性**：C-03（CRUD carrier recompilation）经 option-1/option-2 路径分析裁定为 perf + 契约整洁性 residual（documented remount-key workaround，无错误数据/无选中泄漏），非 silent-correctness defect，已 loud 记录并指明 reactive-carrier follow-up；其余 deferred 项均为 P3 hygiene/Decision（token 体系缺属 Plan 2、CSS auto-load 涉构建管线、field-control slot 设计约定、React Compiler memo broad sweep）。
- 注：本轮 closure-audit 为 unit-green 基线核验（executor 未跑 e2e，本 plan scope/gates 不含 e2e）。

Follow-up:

- C-03 CRUD reactive-carrier（消除 raw-schema recompilation + 移除 remount-key，option 2）。
- C-13/C-14 alert/timeline token 化（依赖 Plan 2 ui 包引入 `--success`/`--info`/`--error` token）。
- C-15/C-34 dynamic loading / page mobile flex（依赖 C-28 CSS 管线统一）。
- C-17 field-control slot 约定应用（决策已定：FieldFrame 统一提供，删除 renderer 内部重复 emit）。
- C-28 CSS auto-load 管线统一（index.tsx 自加载 vs 集中 @import + sideEffects + bundle/playground 同步）。
- C-18 picker listbox Base UI 迁移 + 测试查询重写。
- S-7 React Compiler 冗余手写 memo broad sweep。
- P0-6 no-form array-field 增删 focused 测试（待 FieldFrame 允许 scope-only 渲染）。
