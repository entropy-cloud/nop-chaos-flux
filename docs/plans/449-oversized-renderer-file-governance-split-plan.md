# 449 Oversized Renderer-File Governance Split

> Plan Status: completed
> Last Reviewed: 2026-06-26
> Source: `docs/audits/2026-06-24-2213-multi-audit-components.md` ([C-04], [C-05])
> Related: `docs/plans/448-*.md`（{1}，契约/身份正确性）、`docs/plans/450-*.md`（{3}，组件/文档/卫生清理）
> Execution Order: {2} of the 3-plan queue. Pure pure-function/component extraction with **zero behavior change**; touches files not owned by `448`/`450` (`tree-renderer.tsx`、`table-renderer/table-body-row-rendering.tsx`), therefore **may run in parallel with `448`**. Sequenced after {1} only in numbering.

## Purpose

把两个越过仓库「>700 行硬规则」的渲染器文件，按各自已有的纯函数/独立渲染职责拆分到聚焦模块，使 `pnpm check:oversized-code-files` 对渲染器包不再报这两个文件，且行为零变化。这是审计里唯一的「仓库治理硬规则」结果面。

## Current Baseline

起草者已 live 核对行数与职责划分（`wc -l` + 审计证据）：

- **C-04（P2）**：`packages/flux-renderers-data/src/tree-renderer.tsx` 共 **772** 行（`wc -l`；`pnpm check:oversized-code-files` 按 split 计数报 773），混了四类可分离职责：
  - 纯搜索算法（`computeTreeSearch`（`:145`）、`collectTreeNodeIdsInto`（`:97`）、`collectTreeNodeIds`（`:120`）、`renderHighlightedLabel`（`:200`），无 JSX/无 React）。
  - 树节点身份/转换纯函数（`toNodeKey`、`createTreeNodeId`、`toTreeNodes`、`shouldExpandInitially`）。
  - 纯 DOM 焦点导航（`getVisibleTreeItems`、`focusNode`/`moveFocus`/`focusFirstChild`/`focusParent`，DOM-only）。
  - 两个 React 组件（递归 `TreeNodeRenderer`、主 `TreeRenderer`）。
- **C-05（P3）**：`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx` 共 **723** 行（`wc -l`；`check:oversized-code-files` 报 724），是已良好拆分的 `table-renderer/` 目录（30 个文件、多数 <300 行）里的异类，含四类行渲染职责：
  - 单元格 chrome（`CellContentWithPopOver`、`CopyButton`，约 `:25-110`）。
  - 扁平行数据层（`FlattenedRow`/`FlattenedItem`/`buildFlattenedItems`，约 `:112-226`，纯数据）。
  - 数据行渲染（`DataRowView`、`MemoizedDataRow`、`renderDataRow`，约 `:228-625`）。
  - 展开行渲染（`renderExpandedRow`，约 `:627-723`，独立行种类）。
- 两者都是纯提取，公共 API（导出名）保持不变，调用点零改动。

真正剩余的 gap：两个文件均未拆分；`check:oversized-code-files` 仍 ERROR。

## Goals

- C-04：从 `tree-renderer.tsx` 提取 `tree-search.ts`（搜索算法）与 `tree-node-helpers.ts`（节点身份/转换），`tree-renderer.tsx` 仅留 React 组件 + focus hooks，降到 <700 行。
- C-05：从 `table-body-row-rendering.tsx` 提取 `table-expanded-row.tsx`、`table-cell-content.tsx`、`table-flattened-items.ts`，`table-data-row.tsx`（或保留主文件）降到 ~400 行。
- 行为零变化：所有导出名与对外签名不变，既有测试全绿。

## Non-Goals

- 不改任何渲染行为、props、事件、样式、marker。
- 不处理 O-01 的 `MemoizedDataRow` 比较器（归 `448`，且审计已判该比较器前缀覆盖安全；本计划拆分 `table-body-row-rendering.tsx` 时**不得**改动 `MemoizedDataRow` 的比较逻辑，仅做物理迁移）。
- 不处理审计其余 finding（`448`/`450`）。
- 不做 >500 行 WARN 级别的全面清理（仅收口这两个 >700 ERROR）。
- **REJ-1（`layout-renderer-definitions.ts`）排除说明**：审计已驳回（声明式 definitions barrel，coherent ownership，已显式拆出 steps/timeline）。注意行数口径差异：`wc -l` 为 700，但本计划的执法 oracle `pnpm check:oversized-code-files` 按 split 计数报 **701** 并 ERROR。该文件属**别的 owner 的 out-of-scope 文件**，本计划不收口它；因此 closure 时该脚本**整体仍会 exit 1**（连同其他 4 个 out-of-scope ERROR 文件：`grid-selection.test.tsx`、`form-store.ts`、`infinite-scroll.test.tsx`、`node-compiler.ts`）。本计划的 closure 判据是「这两个目标文件从 ERROR 列表中消失」，不是「脚本 exit 0」。`pnpm check` 不在本计划 Closure Gates 内。

## Scope

### In Scope

- `packages/flux-renderers-data/src/tree-renderer.tsx` → 新增 `tree-search.ts`、`tree-node-helpers.ts`。
- `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx` → 新增 `table-expanded-row.tsx`、`table-cell-content.tsx`、`table-flattened-items.ts`（最终落点以执行时实测行数为准）。
- 受影响的内部 import 路径调整。

### Out Of Scope

- `layout-renderer-definitions.ts`（审计 REJ-1：`wc -l`=700，`check:oversized-code-files` 报 701/ERROR；审计以「声明式 barrel，coherent ownership」驳回，属 out-of-scope，详见上方 Non-Goals 的 REJ-1 说明），不动。
- `>500` 行 WARN 文件（非本结果面）。
- 任何行为/契约/样式改动。

## Failure Paths

不适用：纯提取，无错误处理/API/鉴权/外部集成变更。若拆分后某测试失败，视为提取时遗漏了 import 或误改了符号，回滚该处提取即可。

## Test Strategy

档位选择：**建议有测**

理由：纯函数/组件提取，无行为变更，不需要先写失败测试。回归保障来自既有测试套件（tree/table 已有覆盖）+ closure 时全量 `pnpm test`。可选地为提取出的 `tree-search.ts` 纯函数补一个最小单测以锁定其独立可测性（非强制）。

## Execution Plan

### Workstream 1 - 拆分 tree-renderer.tsx（C-04）

Status: completed
Targets: `packages/flux-renderers-data/src/tree-renderer.tsx`、新增 `tree-search.tsx`、`tree-node-helpers.ts`、`tree-focus-nav.ts`

> 实测落点：`tree-search.tsx`（非 `.ts`，因 `renderHighlightedLabel` 含 JSX）+ `tree-node-helpers.ts` + `tree-focus-nav.ts`（纯 DOM focus-nav helpers）。`tree-renderer.tsx` 实测 591 行（`wc -l`）/592（脚本 split 计数），已退出 ERROR 列表（仅剩 WARN）。

- Item Types: `Fix`

- [x] `Fix`：提取 `computeTreeSearch`、`collectTreeNodeIds*`、`renderHighlightedLabel` 到 `tree-search.tsx`（保持导出签名）。
- [x] `Fix`：提取 `toNodeKey`、`createTreeNodeId`、`toTreeNodes`、`shouldExpandInitially`（及必要的类型如 `TreeNodeRecord`/`isTreeNodeRecord`）到 `tree-node-helpers.ts`。
- [x] `Fix`：`tree-renderer.tsx` 改为从新模块 import；仅留 React 组件 + DOM focus hooks。

Exit Criteria:

- [x] `tree-renderer.tsx` < 700 行（实测 591 行，记入日志）。
- [x] `pnpm check:oversized-code-files` 不再对该文件报 ERROR（仅 WARN 592）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 中 tree 相关测试全绿（行为零变化；全量 `pnpm test` 55/55 task 全绿）。

### Workstream 2 - 拆分 table-body-row-rendering.tsx（C-05）

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`、新增 `table-expanded-row.tsx`、`table-cell-chrome.tsx`、`table-flattened-items.ts`

> 实测落点：`table-cell-chrome.tsx`（计划建议名 `table-cell-content.tsx`，执行时落点为 `table-cell-chrome.tsx`，含 `CellContentWithPopOver`+`CopyButton`+`asReactNode`+`indentStyle`）+ `table-flattened-items.ts`（`FlattenedRow`/`FlattenedItem`/`buildFlattenedItems`/`areColumnsRenderEquivalent`）+ `table-expanded-row.tsx`（`renderExpandedRow`）。主文件实测 442 行，已退出 ERROR 列表。主文件 lines 18-20 re-export `buildFlattenedItems`/`renderExpandedRow`/`Flattened*` 类型，故 `table-body-rows.tsx:8` 的 import 仍可解析。

- Item Types: `Fix`

- [x] `Fix`：提取 `renderExpandedRow`（及相关展开行类型）到 `table-expanded-row.tsx`。
- [x] `Fix`：提取 `CellContentWithPopOver`、`CopyButton` 到 `table-cell-chrome.tsx`。
- [x] `Fix`：提取 `FlattenedRow`/`FlattenedItem`/`buildFlattenedItems` 到 `table-flattened-items.ts`。
- [x] `Fix`：剩余数据行渲染留在主文件（`DataRowView`/`MemoizedDataRow`/`renderDataRow`），442 行 < 700；**`MemoizedDataRow` 的比较器逻辑原样迁移，不得改动**（O-01 归 `448`）—— 比较器 body 逐字未改（仅 `areColumnsRenderEquivalent` 改从 `table-flattened-items.js` 导入）。
- [x] `Fix`：保持调用点零改动——`table-body-rows.tsx:8` 的 `import { buildFlattenedItems, renderDataRow, renderExpandedRow } from './table-body-row-rendering.js'` 仍可解析（主文件 re-export `buildFlattenedItems`/`renderExpandedRow`，`renderDataRow` 本体在主文件）。

Exit Criteria:

- [x] 主文件 < 700 行（实测 442 行，记入日志）。
- [x] `pnpm check:oversized-code-files` 不再对该文件报 ERROR（已不在 ERROR 列表）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 中 table 行渲染相关测试全绿；`MemoizedDataRow` 比较逻辑与拆分前逐字一致（diff 可证）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session (ses_1049b6b96ffeapYwUMPxqYRWda)，round 1
- Verdict: round 1 `revised`（1 Major + 3 Minor）→ 已修复 → 共识达成 `pass`
- Rounds: 1（Major/Minor 一次吸收，无需 round 2）
- Findings addressed:
  - Major：REJ-1 `layout-renderer-definitions.ts` 排除理由与本计划执法 oracle 矛盾——`wc -l`=700 但 `check:oversized-code-files` 报 701/ERROR。已修正为「排除由审计裁定（声明式 barrel），属 out-of-scope；closure 时脚本整体仍 exit 1，本计划判据为目标文件退出 ERROR 列表」。
  - Minor：WS-2 补 barrel re-export 要求（`table-body-rows.tsx:8` 的 import 保持可解析）— 已补入 WS-2。
  - Minor：C-04 搜索 helper 行范围更正（`collectTreeNodeIdsInto:97`/`collectTreeNodeIds:120`/`renderHighlightedLabel:200`）— 已修正。
  - Minor：closure 脚本 exit-1 说明 — 已写入 Closure Gates 与 Non-Goals。
- 引用核对：tree/table 行数（wc + 脚法双口径）、全部提取函数名（computeTreeSearch/renderHighlightedLabel/collectTreeNodeIds\*/toNodeKey/createTreeNodeId/toTreeNodes/shouldExpandInitially/getVisibleTreeItems/focusNode/moveFocus；CellContentWithPopOver/CopyButton/buildFlattenedItems/renderExpandedRow/MemoizedDataRow）经 live 核对全部 OK。
- Sibling plans：448/450 存在，文件归属无重叠（O-01 的 `MemoizedDataRow` 已显式 fence 为逐字迁移，归 448）。

## Closure Gates

- [x] C-04：`tree-renderer.tsx` < 700 行（实测 591），提取出 `tree-search.tsx` + `tree-node-helpers.ts`（+ `tree-focus-nav.ts`）。
- [x] C-05：`table-body-row-rendering.tsx`（或其后继主文件）< 700 行（实测 442），提取出 ≥3 个聚焦模块（`table-cell-chrome.tsx` + `table-flattened-items.ts` + `table-expanded-row.tsx`）；`table-body-rows.tsx:8` 的 import 仍可解析（主文件 re-export）。
- [x] `pnpm check:oversized-code-files` 的 ERROR 列表中**这两个目标文件消失**（注：脚本整体仍会 exit 1，因 `layout-renderer-definitions.ts` 等 out-of-scope 文件未动；本判据以「目标文件退出 ERROR 列表」为准，非脚本 exit 0）—— 当前 ERROR 仅剩 4 个 out-of-scope 文件（`grid-selection.test.tsx`/`form-store.ts`/`infinite-scroll.test.tsx`/`node-compiler.ts`）。
- [x] 行为零变化：tree/table 既有测试全绿；`MemoizedDataRow` 比较逻辑逐字未改。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不自审本项。（Auditor: `ses_1002c65f0ffeCueguErnYnjmSs`，VERDICT `PASS`：7 项客观主张全部独立核对——行数 tree 591/table 442、6 个新文件导出齐全、`table-body-rows.tsx:8` import 经 re-export 解析、`MemoizedDataRow` 比较器 vs 拆分前 commit `42b490d6^` 逐字一致、无 src 内 stray 构建产物、`pnpm --filter @nop-chaos/flux-renderers-data test` 548/548 全绿、两目标文件已退出 ERROR 列表。）
- [x] `pnpm typecheck`（55/55 task 全绿）
- [x] `pnpm build`（29/29 task 全绿）
- [x] `pnpm lint`（29/29 task 全绿）
- [x] `pnpm test`（55/55 task 全绿）

## Deferred But Adjudicated

> 起草时无。

## Non-Blocking Follow-ups

- > 500 行 WARN 级别文件的系统性收敛（非本结果面，可在独立治理 plan 中处理）。

## Closure

Status Note: 两 WS 全部落地，纯物理提取、行为零变化。C-04：`tree-renderer.tsx` 772→591 行，拆出 `tree-search.tsx`（搜索算法）+ `tree-node-helpers.ts`（节点身份/转换）+ `tree-focus-nav.ts`（纯 DOM focus-nav）。C-05：`table-body-row-rendering.tsx` 723→442 行，拆出 `table-cell-chrome.tsx` + `table-flattened-items.ts` + `table-expanded-row.tsx`，主文件 re-export 保持 `table-body-rows.tsx:8` import 可解析。`MemoizedDataRow` 比较器逐字迁移（归 448）。两目标文件均已退出 `check:oversized-code-files` ERROR 列表（仅剩 4 个 out-of-scope 文件，脚本整体仍 exit 1，符合本计划判据）。全量 typecheck/build/lint/test 全绿；独立子 agent closure-audit `PASS`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session `ses_1002c65f0ffeCueguErnYnjmSs`（general），fresh-context three-piece set（plan + diff summary + verification output），VERDICT `PASS`。
- Evidence:
  - 行数实测：`tree-renderer.tsx` 591、`table-body-row-rendering.tsx` 442（均 `wc -l`，<700）。
  - 6 个新文件导出齐全（逐文件读验）。
  - import 解析：`tree-renderer.tsx` 从三新模块 import；`table-body-rows.tsx:8` 经 `table-body-row-rendering.tsx:18-20` re-export 解析。
  - `MemoizedDataRow` 比较器 body vs 拆分前 commit `42b490d6^` diff = IDENTICAL（仅 `areColumnsRenderEquivalent` 改从新模块 import，零运行时变化）。
  - 无 `packages/*/src/` 内 stray `.js/.d.ts/.js.map` 构建产物。
  - `pnpm check:oversized-code-files` ERROR = 4 个 out-of-scope 文件；两目标文件消失（tree-renderer.tsx 仅 WARN 592）。
  - 测试：`pnpm --filter @nop-chaos/flux-renderers-data test` 548/548 全绿；全量 `pnpm test` 55/55 task 全绿；`pnpm typecheck` 55/55、`pnpm build` 29/29、`pnpm lint` 29/29。
- Doc accuracy nit（非阻塞，审计标注）：Non-Goals/Out-Of-Scope 的 REJ-1 注记称 `layout-renderer-definitions.ts` 被 oracle 报为 `701/ERROR`，现 live 为 `681/WARN`（该文件后续被缩减，out-of-scope 不影响本计划判据）。

Follow-up:

- `>500` 行 WARN 级别文件的系统性收敛（见 Non-Blocking Follow-ups，独立治理 plan）。
- 本计划无剩余 plan-owned work。
