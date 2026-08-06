# 453 DingFlow Single Tree Layout Unification

> Plan Status: completed
> Last Reviewed: 2026-08-06
> Source: `docs/analysis/2026-08-03-dingflow-tree-layout-unification.md`, `docs/audits/2026-08-03-1111-document-audit-dingflow-tree-layout-unification.md`
> Related: `docs/architecture/flow-designer/tree-mode.md`, `docs/architecture/flow-designer/dingflow-visual-spec.md`

## Purpose

将 DingFlow tree mode 收敛为唯一的 `TreeDocument` 驱动 structured-tree 投影/布局路径。tree mode 不再调用 ELK 或图启发式布局；所有结构编辑、历史、host writeback、连线几何、空分支与 TB/LR 渲染都围绕同一个已验证 tree projection session 工作。

## Current Baseline

- `layoutStructuredTree()`、`simpleTreeLayout()`、`layoutTreeWithElk()` 并存于 `flow-designer-core/src/tree-layout.ts`。
- 初始/显式 tree auto-layout 仍在 `use-designer-auto-layout.ts` 调 `layoutTreeWithElk()`；tree 投影图直接修改后的补偿路径仍调 `simpleTreeLayout()`。
- `TreeModeLayoutWrapper` 的 `setTreeDocument()` 为 no-op，连续 tree 编辑、owner tree、导出与历史没有真实写回闭环。
- DingFlow edge/overlay 根据端点和固定常量推测 split/merge 线，未持有 branch-group 的权威几何；tree handles 与 edge path 仍是 TB-only。
- `TreeNodeBranch.child?` 的空分支会投影为 owner→continuation phantom merge edge，未实现虚拟 slot。
- 当前 owner docs 仍含 ELK tree layout、`projectTree`/`replaceDocument` 和 required `treeConfig.autoLayout` 的旧基线。
- 已达成独立共识的分析契约定义完整目标、失败路径、几何公式、公开 API 与 proof obligations；本文只将其压缩为可执行计划，未改代码。

## Goals

- tree mode 的唯一算法是 core-private `projectAndLayoutTree()`；graph mode 的 ELK 保持不变。
- 任意 tree 结构改动、host replacement、undo/redo/restore 均维持原子 tree/graph pair 与单一布局语义。
- DingFlow 在 TB/LR、非对称嵌套分支、异构 footprint、空分支和紧凑 spacing 下无未允许的节点/控件/连线碰撞。
- host writeback 通过 sessionId、epoch、dispatchId 和严格 FIFO 完成，不允许旧 session、旧 ack、乱序 action 或 action completion 改写新 session。
- 所有受影响 owner docs、active examples、playground schemas 和 public contract 与最终代码一致。

## Non-Goals

- 不改变 graph mode 的 ELK 算法或任意 DAG 编辑语义。
- 不实现 `showGatewayNodes` / `showMergeNodes`；该项保留为独立 successor ownership。
- 不支持 tree 节点自由拖拽后持久化 position。
- 不把 projected edge delete 反向猜测成 TreeDocument mutation。
- 不实现 TaskFlow domain adapter/lowering；只提供其所需的 generic tree session writeback/export 约束。

## Scope

### In Scope

- `@nop-chaos/flow-designer-core` 的 tree factory、migration、payload validation、单一投影、pair history、tree mutation gate、tree export 和 public export 清理。
- tree projection 的 branch runtime geometry、固定 footprint、间距下限、空 branch virtual slot、tree edge data decoration 限制。
- `@nop-chaos/flow-designer-renderers` 的 tree host session、schema/action compilation、严格 FIFO writeback、command/provider/canvas gate、TB/LR ports/edges/overlays/slot UI。
- geometry oracle、core/renderer/integration/Playwright proofs、active config/example migration 和 owner-doc 收口。

### Out Of Scope

- 新增其他 workflow domain 的业务语义或复杂 BPMN 兼容。
- 改写已关闭的历史 bug note 或历史计划。
- 为仓库外未知使用者保留已删除 tree layout root export 的兼容层。

## Failure Paths

| 场景                     | 触发                                                                                        | 结果                                                                     | 用户/调用方表现                                    |
| ------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------- |
| 非法 tree/config/payload | duplicate ID、reserved ID、unknown type、循环、非 JSON-safe data、非法 size/spacing/version | 返回结构化 error；旧 pair/history/dirty/pending 不变                     | 初始输入显示 error surface；命令/host 替换报告失败 |
| 非法 host epoch/ack      | 非整数 epoch/ack、当前 session 的越界 ack、digest 不匹配                                    | `invalid-tree-document-epoch` / `invalid-tree-document-ack`；不替换 pair | host issue 或命令失败                              |
| 旧 host/session 回显     | 旧 sessionId、旧 dispatchId、LRU 外无 epoch 的 echo                                         | stale no-op 或 `tree-host-epoch-required`                                | 不影响当前编辑 session                             |
| writeback action 失败    | throw/rejection、neutral/cancelled/failure ActionResult                                     | 队首按 canonical classifier 移除；不回滚 draft；继续后续 FIFO            | info/error host issue                              |
| tree graph mutation      | 自由 add/connect/reconnect/move/delete edge 等                                              | `unavailable` / no-op，pair/history 不变                                 | UI 命令拒绝，不破坏结构                            |
| 空 branch                | `TreeNodeBranch.child` 缺失                                                                 | 投影 virtual slot 与连通 merge，不产生 phantom owner edge                | 用户可从 slot 菜单添加节点                         |

## Test Strategy

本档选择：`必须自动化`。本计划修改 public core surface、tree persistence/writeback、结构 mutation、历史、可视连线与配置迁移；每个 Fix 必须有 focused proof，浏览器回归证明最终用户结果。

## Execution Plan

### Phase 1 - Core Tree Session And Contract Migration

Status: completed
Targets: `packages/flow-designer-core/src/{types.ts,index.ts,core.ts,designer-core-types.ts,tree-layout.ts,tree-projection.ts,elk-layout.ts,core/config.ts,core/history.ts,core/transactions.ts}`, core tests

- Item Types: `Fix | Decision | Proof`

- [x] Replace tree construction with `createTreeDesignerCore(initialTreeDocument, config, options): TreeCoreCreationResult`; keep `projectAndLayoutTree` and raw pair replacement core-private.
- [x] Remove/publicly privatize `projectTree`, `layoutStructuredTree`, `simpleTreeLayout`, and `layoutTreeWithElk`; retain graph-only `layoutWithElk`.
- [x] Change tree core public surface to prohibit `setTreeOwner`, graph-pair `replaceDocument`, and `replaceDocumentFromHost`; provide validated `replaceTreeFromHost(tree, epoch)` and tree-only snapshot/export APIs.
- [x] Implement config `1.0.0 -> 1.1.0` migration, `1.0 -> 1.0.0` normalization, `autoLayout` removal, `appearance.minWidth/minHeight -> tree.layoutSize`, version rejection and atomic migration failure behavior.
- [x] Move `TreeNodeTypeConfig.tree` into `NodeTypeConfig.tree`, define fixed `layoutSize`, `emptyBranchSize`, overflow policy, direction and appearance validation.
- [x] Implement JSON-safe TreeDocument payload validation, canonical serialization, immutable ingress/history/pending/export snapshots and structured error paths.
- [x] Enforce central tree-mode mutation gate across every direct core graph topology/data/position API; preserve documented return signatures and emit `mutationRejected` diagnostics.
- [x] Store/replay validated tree/graph pairs for tree history, save/restore, undo/redo and transactions; rollback must restore the stored pair without relayout.

Exit Criteria:

- [x] Core focused tests prove no public arbitrary tree graph/pair injection, correct factory success/failure, migration/version behavior, payload atomicity and history pair replay.
- [x] Direct core mutation matrix proves every prohibited tree mutation leaves pair/history unchanged and reports the documented outcome.
- [x] Core package typecheck and focused tests pass.

### Phase 2 - Structured Projection, Geometry, And Empty Branches

Status: completed
Targets: `packages/flow-designer-core/src/{tree-layout.ts,tree-projection.ts,types.ts}`, core layout/projection tests

- Item Types: `Fix | Proof`

- [x] Implement the sole structured measurement/placement path with main/cross axes, fixed footprint dimensions, integer anchors and post-rounding subtree bounds.
- [x] Enforce chain=60, TB split=134, LR split=204 and focused default merge=120 effective gaps; preserve configured spacing above each bound.
- [x] Produce runtime-only `__fdTree` geometry per projected edge: direction, kind, owner/branch/continuation identity, shared split/merge line and fanout position.
- [x] Restrict tree edge projection to style-safe data; reject marker/animated/label/body decorations without treating legal `TreeNodeBranch.data.label` as an edge label.
- [x] Add namespaced virtual empty branch slots, TB/LR minimum slot dimensions, handles, affordance metadata, no business-node selection and no phantom owner→continuation merge edge.
- [x] Implement `insertBranchChild` and all documented `deleteNode` rewrite cases, including selection/active/focus outcomes and deleteSelection pre-validation/atomicity.

Exit Criteria:

- [x] Core geometry oracle proves all branch-group invariants and zero non-whitelisted intersections for TB/LR, nested asymmetric branches, mixed/all-empty slots, odd sizes, nodeSpacing=0 and spacing 0/80/200.
- [x] Projection tests prove virtual slots, decoration rejection, delete rewrite matrix, tree payload/error behavior and no runtime data in tree export.

### Phase 3 - Renderer Tree Session, Writeback, And Command Boundary

Status: completed
Targets: `packages/flow-designer-renderers/src/{designer-tree-mode.tsx,designer-page-helpers.tsx,designer-page-inner.tsx,designer-command-adapter.ts,designer-command-adapter-helpers.ts,designer-command-adapter-graph.ts,designer-command-types.ts,designer-action-provider.ts,designer-host-projection.ts,schemas.ts,renderer-definitions.ts,designer-context.ts}`, renderer tests

- Item Types: `Fix | Proof`

- [x] Replace no-op tree owner wiring with the validated tree core factory/session draft, host epoch replacement and error-surface handling.
- [x] Compile/validate `treeDocumentEpoch`, `treeDocumentAckSessionId`, `treeDocumentAckDispatchId` and `treeDocumentChangeAction` as formal renderer fields; expose resolved bindings only through the documented action contract.
- [x] Implement session UUID, serial FIFO dispatch, strict host ack matching, 256-entry stale digest LRU, coalesced tail-only delivery, epoch replacement, non-Error normalization and canonical ActionResult classification.
- [x] Abort/invalidate old writeback work on epoch replacement, unmount and key remount; stale completion/ack must be inert.
- [x] Gate graph-only commands in adapter, action provider, canvas, shortcuts and quick actions; implement all-or-nothing tree `deleteSelection` normalization.
- [x] Sanitize host projection/export so virtual nodes and incident edges, `__fdTree`, and stale active selection never leak through host scope.
- [x] Make mounted tree config immutable until key remount, including menu/default/create-dialog/action configuration.

Exit Criteria:

- [x] Renderer focused tests cover factory failure, host epoch/ack/sessionId rules, FIFO/transaction/coalescing/action-result matrix, stale in-flight lifecycle and key remount behavior.
- [x] Command/provider/canvas tests cover every prohibited graph mutation, insertBranchChild and deleteSelection atomicity.
- [x] Host projection tests prove no virtual IDs/dangling edges/runtime geometry leak.

### Phase 4 - DingFlow TB/LR Rendering And Geometry UI

Status: completed
Targets: `packages/flow-designer-renderers/src/dingflow/*`, `designer-xyflow-canvas/{render-ports.tsx,designer-xyflow-node.tsx,xyflow-utils.ts}`, canvas/edge/overlay tests

- Item Types: `Fix | Proof`

- [x] Render fixed outer geometry wrapper plus clipped inner body, exact footprint handles and center-based attached + placement.
- [x] Make tree handles, SVG paths, split/merge shared lines, overlays and controls direction-aware for TB/LR using only projected `__fdTree` geometry.
- [x] Implement internal empty slot renderer and slot menu flow through existing config-derived `DingFlowAddNodeMenu`, defaults/createDialog/submitAction and `insertBranchChild`.
- [x] Set DingFlow connector `linecap/linejoin`, rendered stroke-width/focus behavior and allowed visual affordances exactly as the geometry contract requires.
- [x] Remove endpoint guessing (`outs[0]`/`ins[0]`) and fixed-leg ownership from edge/overlay logic.

Exit Criteria:

- [x] Renderer tests prove TB/LR ports, paths, overlays, button direction, slot affordance, focused stroke and all documented intersection exceptions.
- [x] No existing DingFlow edge label/marker/body behavior remains reachable in tree mode.

### Phase 5 - Active Authoring Migration, Owner Docs, And E2E Proof

Status: completed
Targets: `apps/playground/src/schemas/{dingtalk-workflow-tree-schema.json,taskflow-dingflow-schema.json,action-flow-tree-schema.json,workflow-designer-schema.json}`, `docs/examples/*tree*.md`, `docs/architecture/flow-designer/{tree-mode.md,design.md,config-schema.md,dingflow-visual-spec.md,collaboration.md,api.md,canvas-adapters.md,runtime-snapshot.md}`, `docs/components/designer-page/design.md`, `docs/architecture/{designer-view-vs-edit.md,taskflow-visual-designer.md}`, `docs/references/{renderer-interfaces.md,quick-reference.md}`, tests/e2e

- Item Types: `Fix | Proof`

- [x] Migrate all active tree configs/examples/fixtures to config `1.1.0`, explicit layout sizes and no authored `treeConfig.autoLayout`.
- [x] Update all listed owner docs to final state only: no tree ELK enhancement, `projectTree`, pair injection, required autoLayout or obsolete short-leg geometry.
- [x] Add/adjust Playwright coverage for initial mount, TB/LR, nested asymmetric branches, slots, insert/delete/undo, DOM/SVG bounds and zero page/console errors.
- [x] Run repository searches proving obsolete tree-mode semantics occur only in approved historical/compatibility documents.

Exit Criteria:

- [x] Active authoring/config migration is complete and focused docs/tests are green.
- [x] Owner-doc consistency audit reports zero unresolved conflicts with the landed baseline.
- [x] E2E tests programmatically verify visual/operational geometry rather than relying on screenshots.

## Draft Review Record

- Reviewer / Agent: independent plan review sub-agent, 2026-08-05
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed: 无 Blocker / Major；Minor 保留（Failure Paths 表缺可重试列、无 `## Non-Blocking Follow-ups` 小节、执行项未逐条标注类型标签），交由执行/关闭审计兜底

## Closure Gates

- [x] Every execution item and phase Exit Criteria is complete.
- [x] Exactly one structured tree layout algorithm serves every tree path; graph mode ELK remains unaffected.
- [x] Tree session/host writeback/history/export/error contracts are implemented and proved.
- [x] TB/LR geometry oracle, renderer proofs and browser operation proofs pass.
- [x] Active schemas/examples and all affected owner docs reflect the final baseline.
- [x] No in-scope defect or contract drift is silently deferred.
- [x] Independent closure audit confirms the live implementation and all plan items.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] Relevant `pnpm test:e2e -- --grep "flow designer|dingflow|tree mode"`

## Deferred But Adjudicated

### Gateway And Merge Nodes

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `showGatewayNodes/showMergeNodes` are not implemented today and are independent from achieving a correct hidden-merge DingFlow tree layout.
- Successor Required: yes
- Successor Path: create after this plan closes, sourced from the updated tree-mode owner doc.

## Closure

Status Note: completed; 全部 5 个 Phase 已执行完毕（2026-08-06）。

Closure Audit Evidence:

- Auditor / Agent: mission-driver 2026-08-05-065620（独立执行会话，非 draft-review 会话）
- Evidence: workspace `pnpm typecheck` / `pnpm build` / `pnpm lint` 全绿；全部 62 个 workspace test tasks 通过（flow-designer-core 175 tests、flow-designer-renderers 209 tests、其余包无回归）；`pnpm test:e2e` flow-designer/dingflow/taskflow/tree-mode 42/42 通过；plan 全部 execution items 与 phase Exit Criteria 已勾选。已删除旧 root exports（projectTree/layoutStructuredTree/simpleTreeLayout/layoutTreeWithElk），单一 core-private `projectAndLayoutTree` 落地；tree session（createTreeDesignerCore / replaceTreeFromHost / FIFO writeback / epoch / ack / LRU / coalescing）、mutation gate、虚拟 slot、`__fdTree` 几何、TB/LR 渲染、config 1.1.0 迁移、host projection sanitization 全部落地并有 focused tests。playground tree schemas 与 docs examples 已迁移至 1.1.0（无 authored autoLayout、显式 layoutSize）。
