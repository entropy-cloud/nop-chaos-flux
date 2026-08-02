# 2026-08-01 Flux Field Selector Contract

> Plan Status: completed
> Last Reviewed: 2026-08-01
> Source: `docs/discussions/2026-08-01-flux-e2e-selector-standardization.md`
> Related: `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-form/src/renderers/select-combobox-lists.tsx`, `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`

## Purpose

把 flux 渲染器对外暴露的“字段定位契约”补齐为稳定的 DOM 属性，使下游（nop-entropy e2e-shared `FluxAdapter`、主题 CSS、辅助技术）能按契约直读字段名 / 控件类型 / 选项值 / 表格列名，而非从碎片化的派生信号（id/slot/role/tagName）反推。

## Current Baseline

> 已逐条核对 live repo。

- `field-frame.tsx`（flux-react）是所有 wrap 字段统一包装层。根 `<Tag>`（`field-frame.tsx:221`）输出 `data-field-visited/touched/dirty/invalid/mode`、`data-cid`、`data-testid`，**但无字段名、无控件类型**。`controlId=${name}-control`（`field-frame.tsx:168`）经 cloneElement 注入 child（`:190`）；但 checkbox/switch 的 Base UI Primitive 自带自增 id、不采用它，下游实际可用的 id 落在 wrapper label 上（`${name}-control-label`）。`field-frame.tsx` 当前**未 import** `NodeMetaContext`。
- `NodeMetaContext`（`contexts.ts:46`）的 value 含 `type: string`（`flux-core/src/types/render-fragment-types.ts:48`，即 `rendererType`），由 `node-renderer-providers.tsx:99` 提供。
- `useCurrentNodeMeta()`（`context-hooks.ts:48`）用 `useRequiredContext`，**无 context 时 throw**。field-frame 不能直接用它（field-frame 可能在无 NodeMetaContext 的场景被复用/单测）；安全读法是 `useContext(NodeMetaContext)`（nullable）。
- `ComboboxItem`（ui 包 `combobox.tsx:128`）已硬编码 `data-slot="combobox-item"` 并 `...props` 透传；其 props 类型为 `ComboboxPrimitive.Item.Props`（`combobox.tsx:128`），经 `...props`（`:136`）透传到底层 div，接受 `data-*`。`renderComboboxItem`（`select-combobox-lists.tsx:63`）渲染它、知道 `option.value`，**但未传 `data-value`**。
- 表格 `<TableCell>`（`table-body-row-rendering.tsx:343/377/406/435`）只输出 `className/style/data-fixed`；`column.name` 仅作 React `key`，**不进 DOM**。因此 `CrudListPage.findRowByField` 的 `[data-field]` 永远失效，靠 `td:nth-child(2)` 兜底。
- DOM 契约测试 `field-controls-dom-contract.test.tsx` 已冻结字段控件结构；`:243-269` 明确断言“combobox-item 无 `data-value`，必须按文本定位”。`button-group-select-dom-contract.test.tsx` 存在。
- plan 命名约定：`YYYY-MM-DD-name.md`（非 `NN-`）。

## Goals

- 字段根元素暴露 `data-field={name}`（字段名）与 `data-renderer={type}`（控件类型，来自 `rendererType`）。
- combobox 选项暴露 `data-value={option.value}`。
- 表格 `<td>` 暴露 `data-field={column.name}`。
- 以上属性均在 DOM 契约测试中立档（新增/更新断言），作为下游稳定接口真相。
- 全量 `typecheck/build/lint/test` 通过。

## Non-Goals

- **不**在本 plan 改 e2e-shared（`nop-entropy` 仓库）的 `FluxAdapter` 重写——那是跨仓库 successor 工作。
- **不**改 `AmisAdapter`。
- **不**移除现有 `data-slot` / `controlId`（纯新增，向后兼容）。
- **不**引入调试开关 gating——契约属性生产常驻（否则 e2e 测试脱离生产行为）。
- **不**覆盖非 wrap 控件（button-group-select、markdown-editor 等自有根的控件）的 `data-renderer`；它们若需要可作 successor。

## Scope

### In Scope

- `packages/flux-react/src/field-frame.tsx`：根 `<Tag>` 加 `data-field` + `data-renderer`。
- `packages/flux-renderers-form/src/renderers/select-combobox-lists.tsx`：`renderComboboxItem` 加 `data-value`。
- `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`：各 `<TableCell>` 加 `data-field`。
- `packages/flux-renderers-form/src/__tests__/field-controls-dom-contract.test.tsx`：更新/新增契约断言。
- 表格 cell 契约断言（新增到 `flux-renderers-data` 既有测试或新文件）。

### Out Of Scope

- e2e-shared `FluxAdapter` 重写（successor plan，跨仓库 `nop-entropy`）。
- 非 wrap 控件的 `data-renderer`（successor）。
- owner 文档之外的 any selector 迁移。

## Failure Paths

> 本计划不改错误处理/API 契约/鉴权，主要风险是 TS 类型与既有断言冲突，故仅列实现层风险。

| 场景 | 触发                                                | 行为                                                                                                                                | 可重试 | 表现                                        |
| ---- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------- |
| fp-1 | `useCurrentNodeMeta()` 在无 context 场景 throw      | field-frame 必须用 `useContext(NodeMetaContext)`（nullable），不得用 throwing 版                                                    | 否     | 无 context 时不输出 `data-renderer`，不抛错 |
| fp-2 | `ComboboxItem.Props` 不接受 `data-value`（TS 报错） | Props 已 `extends BaseUIComponentProps<'div'>`，应接受；若个别 TS 严格报错，用 `React.ComponentProps<typeof ComboboxItem>` 断言传参 | 是     | compile pass                                |
| fp-3 | 既有契约断言“无 data-value”与新行为冲突             | 显式改写断言为“有 data-value”（这是有意的契约变更，记录在 commit）                                                                  | 否     | 契约测试 green                              |

## Test Strategy

本档选择：**必须自动化**

改的是公开 DOM 契约（下游 e2e / 主题 CSS / a11y 依赖的稳定接口），属核心契约面。每个 Fix 对应的 Proof（契约断言）必须落地，且 Proof 应与 Fix 同 Phase 或先于收口。

## Execution Plan

### Phase 1 - field-frame 暴露 data-field + data-renderer

Status: completed
Targets: `packages/flux-react/src/field-frame.tsx`, `packages/flux-react/src/field-frame-layout.test.tsx`

- Item Types: `Fix`, `Proof`

- [x] `Fix`：`field-frame.tsx` import `NodeMetaContext`（from `./contexts.js`），用 `useContext(NodeMetaContext)`（**非** throwing 的 `useCurrentNodeMeta`）读 `type`。
- [x] `Fix`：根 `<Tag>`（`:221`）新增 `data-field={name || undefined}` 与 `data-renderer={nodeMeta?.type || undefined}`。
- [x] `Proof`：在 `field-frame-layout.test.tsx` 新增 4 条断言（data-field 有/无、data-renderer 有/无 context 不抛错）。

Exit Criteria:

- [x] 字段根元素输出 `data-field`/`data-renderer`（`field-frame-layout.test.tsx` 4/4 green）。
- [x] 无 NodeMetaContext 时不抛错（fp-1 验证 via `useContext` nullable）。
- [x] `pnpm --filter @nop-chaos/flux-react typecheck` 局部通过（零错误）。

### Phase 2 - combobox-item 暴露 data-value

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/select-combobox-lists.tsx`, `packages/flux-renderers-form/src/__tests__/field-controls-dom-contract.test.tsx`

- Item Types: `Fix`, `Proof`

- [x] `Fix`：`renderComboboxItem`（`select-combobox-lists.tsx:63`）给 `<ComboboxItem>` 传 `data-value={String(option.value)}`。fp-2 未触发（TS 接受）。
- [x] `Proof`：更新 `field-controls-dom-contract.test.tsx` 的“无 data-value”断言为“有 `data-value` 且等于 option.value”，同步注释。

Exit Criteria:

- [x] combobox-item 渲染 `data-slot="combobox-item" data-value="1"`（契约测试 23/23 green）。
- [x] “按 value 定位选项”断言成立。

### Phase 3 - 表格 TableCell 暴露 data-field

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`, `packages/flux-renderers-data/src/__tests__/data-table-columns.test.tsx`

- Item Types: `Fix`, `Proof`

- [x] `Fix`：`table-body-row-rendering.tsx` 四处 `<TableCell>`（普通列 `:435`、cellRegion `:377`、operation `:343`、quickEdit `:406`）加 `data-field={column.name || undefined}`。
- [x] `Proof`：`data-table-columns.test.tsx` 新增断言：数据列 `<td>` 带 `data-field`=列名，operation 列不带。

Exit Criteria:

- [x] 数据列 `<td>` 输出 `data-field="name"/"email"`（测试 13/13 green）。
- [x] operation 列无 name 不输出 `data-field`，不破坏选择列/展开列 slot。

## Draft Review Record

> 待独立子 agent（fresh session）填写。

- Reviewer / Agent: independent sub-agent (fresh session, ses_042db0f31ffeo3d5ZX9U8sHOyz)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 5 Minor 全部接受并修正——M-1 测试目标路径 `__tests__/` 子目录错误；M-2 `render-fragment-types.ts` 补 `flux-core/src/types/` 前缀；M-3 TableCell 两处行号差 1（377/435）；M-4 `ComboboxItem` Props 类型名更正为 `ComboboxPrimitive.Item.Props`；M-5 checkbox/switch controlId 说明精确化。零 Blocker / 零 Major，可执行。

## Closure Gates

- [x] Phase 1/2/3 全部 `completed`，各自 Exit Criteria 全勾。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope contract gap（data-field/data-renderer/data-value 全落地）。
- [x] 受影响 owner docs 已同步：`docs/architecture/renderer-markers-and-selectors.md` Layer 2 新增 “Field selector contract attributes” 子节（selector 契约 owner doc；`renderer-runtime.md` 侧重 React hooks/props 集成，非 selector 契约 owner，无需改动）。
- [x] daily log `docs/logs/2026/08-01.md` 记录本次契约变更。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck` — 本 plan 改动的 3 包：flux-react 零错误通过；form/data 包的 9+1 个错误全部在未触碰的预存测试文件（stash 对比铁证：撤销本 plan 改动错误数不变）。全量 typecheck 受工作区预存基线影响。【closure-audit 裁定：满足——本 plan 零引入 typecheck 错误，预存 9+1 属工作区基线、非本 plan scope。独立 stash 复现：form=9/data=1/flux-react=0 带改动与 stash 后完全相等。】
- [x] `pnpm build` — 本 plan 改动的 3 包（flux-react/form/data）build 全绿。【closure-audit 独立复跑确认】
- [x] `pnpm lint` — 本 plan 改动的 6 文件 eslint exit 0。【closure-audit 独立复跑确认】
- [x] `pnpm test` — 本 plan Proof 测试全绿（field-frame-layout 27/27、field-controls-dom-contract 23/23、data-table-columns 13/13）；flux-react 全量有 3 个预存失败（`schema-renderer-imports-basic`/`dialog-actions`/`event-prevention`，与 field-frame/契约无关，stash 对比确认非本 plan 引入）。【closure-audit 裁定：满足——Proof 全绿，3 个全量失败属工作区预存基线、非本 plan scope。】

## Deferred But Adjudicated

### e2e-shared FluxAdapter 重写

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 落在 `nop-entropy` 仓库（跨仓库），本 plan 只负责 flux 渲染器侧契约落地；adapter 重写是消费者侧 successor。
- Successor Required: yes
- Successor Path: `nop-entropy` e2e-shared（跨仓库 successor plan）

### 非 wrap 控件的 data-renderer

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: button-group-select / markdown-editor 等自有根控件不经过 field-frame；如需类型标记可在节点渲染层 successor 处理。
- Successor Required: no

## Non-Blocking Follow-ups

- 跨仓库 successor：e2e-shared `FluxAdapter` 用 `data-field`/`data-renderer`/`data-value` 重写 selector，删除探测与列索引偏移逻辑（见 discussion 报告方案 B）。

## Closure

Status Note: 本 plan 可关闭。四个字段定位契约属性（`data-field`/`data-renderer`/`data-value`/表格 `<td data-field>`）均已按 In Scope 落地并经独立 closure-audit 抽查 live code path 确认行为真实生效；三个 Phase 全部 `completed`、Exit Criteria 全勾；契约测试断言的是新行为本身（非仅文件存在）；两个 deferred 项（跨仓库 FluxAdapter 重写、非 wrap 控件 data-renderer）分类诚实、确属 out-of-scope 而非被降级的 in-scope defect；预存工作区 typecheck/test 基线经独立 stash 对比证实非本 plan 引入（本 plan 零引入）；owner doc `renderer-markers-and-selectors.md` Layer 2 已同步；文本一致性核对无矛盾（顶部 active→completed 与各 slice/Exit/Closure Gates 同步）。

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent (fresh session, closure-audit only — 未参与起草/执行)
- Evidence:
  - **关键行为抽查（live code，非仅接口存在）**：
    - `field-frame.tsx:11` import `NodeMetaContext`；`:102` `useContext(NodeMetaContext)`（**非** throwing `useCurrentNodeMeta`）；`:226-227` 根 `<Tag>` 输出 `data-field={name || undefined}` + `data-renderer={nodeMeta?.type || undefined}`。无 NodeMetaContext 时不抛错（fp-1 验证）。
    - `select-combobox-lists.tsx:67` `renderComboboxItem` 的 `<ComboboxItem>` 传 `data-value={String(option.value)}`。
    - `table-body-row-rendering.tsx` **四处** `<TableCell>` 全部带 `data-field={column.name || undefined}`：operation `:345`、cellRegion `:387`、quickEdit `:417`、normal `:447`；无 name 时输出 `undefined`（不渲染属性）。expand/select/drag cell 非 data 列、不加，符合契约。
  - **契约测试断言新行为（concrete）**：`field-frame-layout.test.tsx:564-610` 4 条断言（data-field 有/无、data-renderer 有/无且无 context 不抛）；`field-controls-dom-contract.test.tsx:262` `expect(data-value).toBe('1')`；`data-table-columns.test.tsx:562/566` data-field=name/email、`:569` operation 列 hasAttribute=false。
  - **独立复跑**：build（flux-react/form/data）全绿；eslint（6 plan 文件）exit 0；Proof field-frame-layout 27/27、field-controls-dom-contract 23/23、data-table-columns 13/13 全 green。
  - **预存基线独立 stash 复现**：`git stash push` 5 个 plan tracked 文件 → form=9/data=1/flux-react=0，与带改动**完全相等**；form 9 错误全在 7 个非 plan 测试文件（dialog-_/form-input-onchange/submit-action-_/form-loadaction-edit），data 1 错误在 `table-dialog-scope-inheritance.test.tsx`，flux-react 3 test 失败在 `schema-renderer-imports-basic`/`dialog-actions`/`event-prevention`——均与 field-frame/契约无关。结论：本 plan 零引入 typecheck/test 失败，预存基线非本 plan 责任（符合 guide Rule 13：硬约束针对本 plan 引入的失败）。
  - **Deferred 诚实性**：e2e-shared `FluxAdapter` 重写属跨仓库（nop-entropy）successor，非本 plan scope；非 wrap 控件 data-renderer 在 Non-Goals 明确列出且确不经 FieldFrame，非被降级的 in-scope defect。
  - **owner doc**：`renderer-markers-and-selectors.md:90-102` “Field selector contract attributes” 子节准确记录四属性 + 生产常驻/纯新增/契约测试冻结规则。
  - **daily log**：`docs/logs/2026/08-01.md` 记录本次契约变更与验证状态。

Follow-up:

- <<见 Deferred e2e-shared successor>>
