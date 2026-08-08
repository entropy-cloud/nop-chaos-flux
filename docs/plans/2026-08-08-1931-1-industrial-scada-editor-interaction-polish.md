# 1 Industrial SCADA 编辑器交互行为 polish（drop 校验 / paste id 碰撞 / 批量 undo）

> Plan Status: completed
> Last Reviewed: 2026-08-09
> Source: `docs/backlog/industrial-hmi-component-audit-roadmap.md` Follow-up Backlog（F11 / 本轮-11 / P2-4），源自 `docs/audits/2026-08-08-1712-open-audit-industrial-hmi-component-audit.md` + `docs/audits/2026-08-08-1712-multi-audit-industrial-hmi-component-audit.md`
> Related: `docs/plans/2026-08-09-0121-2-industrial-scada-p2-polish-runtime-symbols.md`（runtime+symbols 切片，Non-Goals 显式把 editor P2 留给本系列 plan）
> Mission: industrial-hmi-component-audit

## Purpose

把 industrial SCADA 编辑器交互层 3 个已确认 P2 行为缺陷收口为「drop 入口校验符号类型 / paste id 碰撞自增 / 多元删除与解组单 diff 入栈」，使编辑器交互行为与既有 group/connection id 纪律一致，消除「未知 type 进入 working copy」「paste id 与现有 id 冲突」「N 元选中产生 N undo entry」三类可观测 papercut。

## Current Baseline

经 live repo 核对（2026-08-08），3 个 finding 全部仍然成立：

- **F11（drop 不校验 type）**：`src/editor/scada-editor-canvas.tsx:288-310` `onDrop` 直接读 `e.dataTransfer.getData('application/x-scada-symbol-type')` 得到 `type`，仅判 `if (type && runtime)` 即调用 `runtime.addWorkingSymbol({ id, type, ... })`。未经符号注册表校验 → 未知 / 拼写错误 / 已注销的 type 会进入 working copy 与 engine。注册表查询函数 `hasScadaSymbol(type)` 已存在于 `src/symbols/symbol-registry.ts`（grep 掩码为 `n`），可直接复用。
- **本轮-11（paste id 不碰撞检查）**：`src/editor/toolbox/clipboard.ts:92` 顶层 id 推导为 `` `${node.id}-copy-${counter}` ``（子树经 `buildIdMapRecursive`），不检查该 id 是否已存在于 working copy。与 group 的 `generateId` 自增（plan 2026-08-08-1910-2 A2 已对齐 connection）/ `addWorkingSymbol` 单一 owner 碰撞自增（plan 2026-08-08-1809-2 F3）纪律不一致。当用户先 paste 一次再手动建一个同名 `-copy-N`、或 paste 跨会话 counter 重置时，id 冲突会被下游 duplicate-id 检测捕获但行为不友好。
- **P2-4（多元删除/解组产 N undo entry）**：`src/editor/toolbox/toolbox-panel.tsx:113-129` `handleDelete`/`handleUngroup` 对 `selection` 循环逐个调 `runtime.removeWorkingSymbol(id)` / `runtime.ungroupSymbols(id)`；键盘路径 `src/editor/scada-editor-canvas.tsx:323-326`（delete `for (const id of sel) runtime.removeWorkingSymbol(id)`）与 `:338-343`（`Ctrl+Shift+G` ungroup 循环；`:333-337` 为 `Ctrl+G` group 块）一致。N 元选中 → N 次 `pushOperation` → N undo entry + O(N·n) `syncWorkingCopy`，用户需按 N 次 undo 才能撤销一次逻辑删除。注：`pushOperation`（`src/editor/undo-redo/undo-redo-adapter.ts:93-123`）**不检查 inTransaction**，始终 push，故单纯 `beginTransaction`/`commitTransaction` 包住 N 个 single-id mutator 仍会产 N entry。

已完成的相关基线（非本 plan scope，但作为对照）：

- plan 2026-08-08-1809-2 F3 已让 `addWorkingSymbol` 在单一 owner 碰撞时自增去重（group/paste 对齐）——但那是 add 路径，paste id 生成本身仍不预检。
- plan 2026-08-08-1910-2 A2 已让 connection `generateConnectionId` 读现有 connections 自增——本 plan 的 paste id 自增与之同形。

## Goals

- F11：drop 入口在 `addWorkingSymbol` 前用 `hasScadaSymbol(type)` 校验；未知 type 不进入 working copy/engine（静默忽略 + 可选 onError 上报）。
- 本轮-11：`buildClipboardPaste` 生成的 paste id 与 working copy 现有 id 碰撞时自增后缀，与 group/connection id 纪律一致。
- P2-4：`handleDelete`/`handleUngroup`（按钮 + 键盘两路径）对多元选中产单个 undo entry（批量 diff），一次 undo 完整恢复。

## Non-Goals

- 不改 align/distribute 世界坐标语义（本轮-12）——该 finding 与 HCA8 #5 watch-only residual 关联，且 docstring 已声明 M3/T1 接受扁平算法，需独立裁定（留待后续 i18n/doc/adjudication 轮）。
- 不改 serialization/clone/export/error-registry（F5/F6/P2-1/P2-2/P2-3/P2-8）——属本系列 N=2 plan。
- 不改 i18n / design doc file-tree rot（P2-6/P2-7/P2-9/P2-10/P2-11）——留待后续 polish 轮。
- 不引入新的批量 mutator 公共 API（除非 P2-4 明确需要 `removeWorkingSymbols(ids[])`）；优先在现有 single-id mutator 之上用事务/合并实现单 diff。

## Scope

### In Scope

- `src/editor/scada-editor-canvas.tsx`（drop handler + delete/ungroup 键盘路径）
- `src/editor/toolbox/toolbox-panel.tsx`（handleDelete/handleUngroup 按钮路径）
- `src/editor/toolbox/clipboard.ts`（buildClipboardPaste id 生成）
- 可能触及 `src/editor/runtime-mutators.ts`（若 P2-4 需要批量 mutator）+ `src/editor/undo-redo/operation-coalesce.ts`（若复用合并窗口）
- 对应 focused 回归测试（failing-first）

### Out Of Scope

- renderer 层（`src/renderer/`）、engine 层（`src/engine/`）、binding 层（`src/binding/`）
- serialization 层、symbols 层
- e2e（除非契约变更要求，见 Test Strategy）

## Failure Paths

| 场景编号          | 触发                                 | 行为                                           | 可重试 | 用户可见表现                   |
| ----------------- | ------------------------------------ | ---------------------------------------------- | ------ | ------------------------------ |
| drop-unknown-type | drag 一个未注册的 symbol type 到画布 | 不调 addWorkingSymbol；可选 onError 上报       | 否     | 画布无新图元（拖放被忽略）     |
| paste-id-collide  | paste 时生成的 `-copy-N` id 已存在   | id 自增后缀直到不碰撞再入栈                    | 否     | 正常粘贴，无 duplicate-id 错误 |
| batch-delete-undo | 选中 N 元按 Delete 后按一次 undo     | 单 diff 全量恢复 N 元（含其子树 / connection） | 是     | 一次 undo 恢复全部被删图元     |

## Test Strategy

档位选择：**建议有测**

3 个 finding 均为可观测行为缺陷（非纯重构 / 纯文档），且其中 paste id 碰撞与 batch undo 涉及跨 data↔engine 一致性，需要 failing-first 测试锁定结果值。不属于 auth / 对外 API 契约 / 核心回归路径，故不强制「必须自动化」档。每个 Fix 前先写 failing-first 测试（Proof 先于 Fix 落地形式可灵活，但断言必须先红）。

## Execution Plan

### Phase 1 - drop 入口符号类型校验（F11）

Status: completed
Targets: `src/editor/scada-editor-canvas.tsx`, `src/symbols/symbol-registry.ts`（复用 `hasScadaSymbol`）

- Item Types: `Proof | Fix`

- [x] failing-first：新增测试，drop 一个未注册 type 时 `addWorkingSymbol` 不被调用 / working copy 无新增节点（断言结果，非 not-throw）
- [x] Fix：`onDrop` 在 `if (type && runtime)` 内增 `hasScadaSymbol(type)` 守卫，未知 type 早退（静默忽略；是否 onError 上报作为 Decision 见下）
- [x] Decision：上报 `invalid-node`（经 `dispatchEvent('scada-editor:error', {code:'invalid-node'}, onError)`，不调 handleError 避免置 status='error' 破坏编辑器）。`invalid-node` 已在 `SCADA_EDITOR_ERROR_CODES` 注册（editor-errors.ts:16），不引入未注册码

Exit Criteria:

- [x] drop 未注册 type 不进入 working copy/engine，测试断言节点数不变
- [x] drop 已注册 type 行为不变（既有 drop 测试全绿）
- [x] 若 Decision 选上报，对应 error code 已在 `SCADA_EDITOR_ERROR_CODES` 注册（不引入新的未注册码）

### Phase 2 - paste id 碰撞自增（本轮-11）

Status: completed
Targets: `src/editor/toolbox/clipboard.ts`

- Item Types: `Proof | Fix`

- [x] failing-first：构造 working copy 已含 `foo-copy-1` 的 fixture，paste 一个 `foo` → 断言新节点 id 不与现有碰撞（如 `foo-copy-2`），且 forward diff 含正确新 id
- [x] Fix：`buildClipboardPaste` 顶层 id 生成（`clipboard.ts:92`）+ 子树 `buildIdMapRecursive` 增碰撞检查（接收现有 id 集合或 callback），碰撞时自增后缀直到不碰撞；与 `generateConnectionId` / `addWorkingSymbol` 单一 owner 自增同形
- [x] Proof：connection target/id 重写（plan 2026-08-08-1910-2 A2 已落地）在 paste id 自增后仍正确（命中映射用新自增 id）

Exit Criteria:

- [x] paste 生成的所有 id（顶层 + group 子树）不与传入的 working copy 现有 id 碰撞
- [x] 既有 paste 测试（含 connection 重写回归）零回归
- [x] 自增后缀逻辑与 group/connection id 纪律一致（无第二套去重策略）

### Phase 3 - 多元删除/解组单 undo entry（P2-4）

Status: completed
Targets: `src/editor/toolbox/toolbox-panel.tsx`, `src/editor/scada-editor-canvas.tsx`, 可能 `src/editor/runtime-mutators.ts`

- Item Types: `Decision | Proof | Fix`

- [x] Decision：批量单 diff 实现路径——(a) 新增批量 mutator `removeWorkingSymbols(ids[])`/`ungroupSymbols(ids[])`，内部快照 prev → 对 working copy 直接 mutate N 次 → 末尾单次 `pushOperation`（与 `runtime-factories.ts:235-238` transform-move 拖拽的事务式单 push 同形）；或 (b) 先让 single-id mutator 的 `pushOperation` 变为 transaction-aware（检查 `inTransaction`，事务内只 mutate 不 push，`commitTransaction` 时单 push）再 `begin/commit` 包住循环。**注**：`pushOperation`（`undo-redo-undo-redo-adapter.ts:93-123`）当前不检查 `inTransaction`，故不可直接复用 option (b) 除非先改 mutator；倾向 (a)（侵入面小、与既有 transform-move 模式一致，执行时核对 live 确认）→ **采用 option (a)**：`removeWorkingSymbol`/`ungroupSymbols` 签名升级为 `string | string[]`，单次 prevSnapshot + 单次 pushOperation，循环 mutate 内部 symbols 数组（ungroup）/ 单次 detachNodesRecursive+pruneDanglingConnections（remove）。既不新增公共 mutator，也不改 pushOperation 的事务语义（侵入面最小，与 transform-move 同形）。
- [x] failing-first：选中 N（≥3）元按 Delete → undo 栈深度只增 1（断言 `undoStack.canUndo` 一次 undo 后全恢复，而非 N 次）→ `scada-editor-canvas-group-ungroup.test.tsx` "batch delete N (3) nodes → single undo entry, one undo restores all" + "batch ungroup N (2) groups → single undo entry"（断言 undoStackDepth + 全恢复）
- [x] Fix：`handleDelete`/`handleUngroup`（`toolbox-panel.tsx:113-129`）+ 键盘路径（`scada-editor-canvas.tsx:323-326` delete + `338-343` ungroup）改用批量单 diff 路径 → 三站点均传完整 selection 数组（`runtime.removeWorkingSymbol(sel)` / `runtime.ungroupSymbols(sel)`），mutator 内部做单 snapshot + 单 push；toolbox-panel.test.tsx 断言按钮路径传数组（`removeWorkingSymbol[0]===['a','b','c']` / `ungroupSymbols[0]===['a','b']`）
- [x] Proof：删除含 group 子树 / connection 的多元选中后，一次 undo 完整恢复（子树 + 经 plan 2026-08-08-1910-2 A8 的 `pruneDanglingConnections` 删除的 connection 声明也恢复）→ "batch delete with group subtree → single undo restores subtree nodes" 断言子树恢复；connection 恢复经 `editor-state-integrity.test.ts` "undo after removeWorkingSymbol restores the pruned connection (snapshot-based)" 锁定（snapshot-based undo 在批量路径同形，prevSnapshot 保留原 connections）

Exit Criteria:

- [x] N 元选中删除/解组只产 1 个 undo entry，一次 undo 全恢复
- [x] 按钮 + 键盘两路径行为一致（同 diff 纪律）
- [x] 既有单选删除/解组测试零回归（single-id regression test 守护）

## Draft Review Record

- Reviewer / Agent: fresh sub-agent session `ses_01d22d052ffeYa6HZhaqtVq4WG`（round 1）
- Verdict: `pass-with-minors`
- Rounds: 1（零 Blocker / 零 Major，共识达成）
- Findings addressed:
  - m-1（P2-4 键盘 ungroup 行号 `333-342` 误标 group 块）→ 已改为 `338-343`（ungroup 循环）+ 标注 `333-337` 为 group 块
  - m-2（P2-4 Decision option b 假前提：`pushOperation` 不检查 inTransaction）→ Current Baseline + Phase 3 Decision 补「pushOperation 当前不检查 inTransaction」事实，option a/b 重新框定（a 新增批量 mutator 单 push；b 须先让 mutator transaction-aware），倾向 a（与 transform-move 拖拽事务式单 push 同形）
  - 所有 live 引用经 reviewer 核对：F11（scada-editor-canvas.tsx:288-310 onDrop 无 hasScadaSymbol + registry 函数存在）、本轮-11（clipboard.ts:92 buildClipboardPaste 无碰撞检查）、P2-4（toolbox-panel.tsx:113-129 + 键盘路径）全部 confirmed-live

## Closure Gates

- [x] F11：drop 未知 type 不进入 working copy（focused 测断言结果）
- [x] 本轮-11：paste id 不与现有 id 碰撞（focused 测断言结果）
- [x] P2-4：多元删除/解组单 undo entry（focused 测断言 undoStack 深度 + 全恢复）
- [x] 按钮 + 键盘两路径行为一致
- [x] 不存在被静默降级到 deferred 的 in-scope live defect
- [x] 受影响 owner docs 已同步到 live baseline（closure audit 裁定：No owner-doc update required——design-undo-redo.md:196/198 已声明「单次删除/解组 = 1 diff」，批量实现更一致而非相悖；design-renderer.md:348 对 drop type validation SILENT；design-toolbox.md:134 paste id 唯一性 contract 被 collision-increment 强而非弱。无 documented behavior 改变，Minimum Rule 17）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（auditor: fresh session `ses_01c9a87cbffex8daqTplfZf6Pc`，verdict=approved，0 Blocker/Major/Minor）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本 plan 暂无 deferred 项。若执行中发现 P2-4 批量 mutator 改造因 runtime-mutators 事务能力不足而需大改，则降级为「保留 single-id 循环 + 显式声明 N entry 为接受的 UX」，并在此记录 Why Not Blocking Closure；但默认假设事务能力足够（plan 2026-08-08-1809-2/1809-3 已多次使用事务式 diff）。

## Non-Blocking Follow-ups

- 本轮-12（align/distribute 世界坐标）+ P2-5（collectWorldBounds false-green 测试）同属「嵌套 group 坐标语义」主题，留待后续 i18n/doc/adjudication 轮一并裁定（implement-world-vs-declare-local）。
- 后续 editor+contract polish 系列：本 plan = N=1，serialization/contract 切片 = N=2 plan。

## Closure

Status Note: 3 个 P2 editor interaction papercut 全部收口。F11 drop 入口用 `hasScadaSymbol(type)` 校验未知 type（静默忽略 + onError 上报 `invalid-node`，code 已注册）；本轮-11 `buildClipboardPaste` 顶层 id + 子树 id 与 working copy 现有 id 碰撞时自增后缀（与 group/connection/addWorkingSymbol 单一 owner 自增同形，无第二套去重）；P2-4 `removeWorkingSymbol`/`ungroupSymbols` 签名升级为 `string | string[]`，按钮 + 键盘两路径传完整 selection，单次 prevSnapshot + 单次 pushOperation → N 元选中删除/解组产 1 undo entry（一次 undo 全恢复）。决策采用 Phase 3 Decision option (a)（侵入面最小，与 transform-move 事务式单 push 同形）。执行中清理了被 Phase 3 改造孤立的 dead code `removeNodeRecursive`（drag-back coverage gate 从 89.94% 回到 ≥90%）。无 documented behavior 改变（owner-doc gate 裁定 not required）。

Closure Audit Evidence:

- Auditor / Agent: fresh sub-agent session `ses_01c9a87cbffex8daqTplfZf6Pc`（独立 closure audit，非执行 session 自审）
- Verdict: `approved`（0 Blocker / 0 Major / 0 Minor）
- Evidence: 独立 live 复核 3 phase fix 全部 live & wired（非 stub）—— F11 `scada-editor-canvas.tsx:298` hasScadaSymbol 守卫在 addWorkingSymbol 前；本轮-11 `clipboard.ts:78-166` buildClipboardPaste existingIds + while-loop 自增 + buildIdMapRecursive 子树碰撞检查；P2-4 `runtime-mutators.ts:92-116/212-241` 单 prevSnapshot + 单 pushOperation（非 N 循环），三站点（toolbox-panel.tsx:116/126 + scada-editor-canvas.tsx:340/355）传完整 selection 数组。focused 测试均断言可观测结果（F11 drop 节点数不变 + invalid-node 派发；本轮-11 5 case paste id 自增；P2-4 batch N→1 entry + undoStackDepth + 全恢复 + 单 id regression；connection 恢复经 snapshot-based undo）。dead code `removeNodeRecursive` 经 repo-wide grep 在 `packages/*/src/` 下零命中。owner-doc gate 裁定 not required（design-undo-redo.md:196/198 已声明单次删除/解组=1 diff；design-renderer.md:348 对 drop type validation silent；design-toolbox.md:134 唯一性 contract 被强化）。deferred honesty 通过（Deferred 区为空；Non-Blocking Follow-ups 的 本轮-12/P2-5 + serialization/contract N=2 均为 Non-Goals 显式排除项，非 silent downgrade）。

Follow-up:

- 无 plan-owned 剩余工作。本轮-12（align/distribute world 坐标）+ P2-5（collectWorldBounds false-green 测试）同属「嵌套 group 坐标语义」主题，留待后续 i18n/doc/adjudication 轮；serialization/contract N=2（F5/F6/P2-1～P2-11）由 plan `2026-08-08-1931-2` 接管。
