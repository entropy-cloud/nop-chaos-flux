# 2 Industrial SCADA Editor State & Lifecycle Integrity

> Plan Status: active
> Last Reviewed: 2026-08-08
> Source: `docs/audits/2026-08-08-1712-open-audit-industrial-hmi-component-audit.md` (F1, F3); `docs/audits/2026-08-08-1712-multi-audit-industrial-hmi-component-audit.md` (P1-1, P1-3)
> Related: `docs/backlog/industrial-hmi-component-audit-roadmap.md`; sibling plans `2026-08-08-1809-1-*` (validation) and `2026-08-08-1809-3-*` (canvas correctness)
> Execution Order: {2} — depends on nothing hard; runs after {1} (load() consumes validated config). Editor cooperating state holders (session / undo adapter / selection / id counter) reconciled at all load / import / drag / undo boundaries.

## Purpose

收口编辑器「协作状态持有者在边界上不对账」的 4 个 P1：

- **F1**（Proof）：`cloneConfig` 对缺失 `variables` 的合法 config 的守卫**已在 live 代码落地**（commit `c2dd1627b`，`editor-session.ts:118`），但**缺回归测试**——既有 `editor-session.test.ts` 恒带 `variables:[]`，从未覆盖缺失路径。本计划补 failing-first 回归测试锁住该守卫，防回归。
- **F3**（Fix）：拖拽落点 id 由组件内不重置的 `idCounter` 生成 + `addWorkingSymbol` 不去重 → `load()` 后拖拽生成的 id 与已装入图元碰撞 → `tree-registry` last-write-wins 静默破坏。
- **P1-1**（Fix）：`load()` / `importConfig()` 只 `resetSession`（清栈），不清 `UndoRedoAdapter` 的事务态（`inTransaction`/`prevAtOpStart`）→ 拖拽途中被 programmatic load 打断时，pointerup 的 `commitTransaction` 把 `diff(OLD prevAtOpStart, NEW post-load)` 巨型 diff 推入空栈 → undo 还原到错误的（pre-load）config。
- **P1-3**（Fix）：`applyUndoRedoDiff` 更新 working config + engine tree 但从不修剪 `session.selection` → undo 一个 add（或 redo 一个 remove）后 selection 持有已不存在的 id → inspector/toolbox 在死 id 上静默 no-op。

四者同属「编辑器把外部 config / 操作纳入 working copy 时，session / adapter / selection / id 计数器没有单一 owner 在每个边界做全量对账」。

## Current Baseline

- `editor/editor-session.ts:78-84` `resetSession` 清 `workingConfig`/`committedBaseline`/`selection`/`mode`/`undoStack.clear()`，**不触 `UndoRedoAdapter` 的 `inTransaction`/`prevAtOpStart`**。`cloneConfig:113-121` 已含 `variables !== undefined` 守卫（与 `editor-working-helpers.cloneConfigSnapshot` 对齐）。
- `editor/undo-redo/undo-redo-adapter.ts:28-30` 持有 `inTransaction`/`transactionKind`/`prevAtOpStart`（独立于栈）；`:52-69` `commitTransaction` 用 `prevAtOpStart` 算 diff 入栈；`:72-76` `abortTransaction` 存在（docstring 标注「异常路径或事务期间 mode 切换」），但 load/import 未路由经此。
- `editor/runtime-mutators.ts:76-82` `addWorkingSymbol` 直接 `[...symbols, node]`，**无去重**；`:84-91` `removeWorkingSymbol` 顶层 `.filter`（且 deselect）；`:100-123` `applyUndoRedoDiff` 更新 working+engine+commit+notifySession，**不修剪 selection**；`:204-229` `load()` 调 `resetSession` + `engine.build`，**从不 `undoRedo.abortTransaction()`**。
- `editor/toolbox-runtime.ts:221-239` `importConfigFn` 同型：`resetSession` 后 build + setMode，**不 abortTransaction**。
- `editor/scada-editor-canvas.tsx:78` `idCounter = useRef(0)`；`:277-288` drop 取 `dataTransfer` type → `${type}-${idCounter.current}` → `runtime.addWorkingSymbol`；`load()`/`importConfig()`/`resetSession()` **都不重置 idCounter**。对照 `groupSymbols`（`runtime-mutators.ts:134-139` 用 `existingIds` Set + `do/while` 碰撞自增）与 clipboard paste（用碰撞自增）**都做了去重**，唯独拖拽落点 + addWorkingSymbol 不做——id 纪律内部不一致。
- `engine/tree-registry.ts:21` `byId.set(id,…)` last-write-wins，id 碰撞静默覆盖原图元的渲染/命中/绑定。
- `editor/editor-session.test.ts` 所有 fixture 恒带 `variables:[]`（line 14/69/98/132），仅 line 144 测带 variables 的克隆，**无缺失 variables 的用例**。
- 机械门禁全绿（1340 tests）；HCA10 coalesce + HCA11 importConfig mode sync + selection dual-source（P1-07）均已确认 FIXED，但均未触及本计划的 4 个边界。

## Goals

- 每个编辑器边界（load / importConfig / drag-drop / undo / redo）过后，所有协作状态持有者（栈 / 事务态 / selection / id 空间）彼此一致，不残留指向不存在 config 或不存在 id 的状态。
- F3：拖拽落点 id 永不与 working copy 现有 id 碰撞（对齐 group/paste 的碰撞自增纪律）。
- P1-1：load/import 在 `resetSession` 前中止 adapter 事务态，使拖拽途中 load 不再产出 bogus undo entry。
- P1-3：undo/redo 后 `session.selection` 自动修剪到新 working config 仍存在的 id，并通过 `setSessionSelection` 同步 React mirror + engine targets。
- F1：缺失 `variables` 的合法 config 进入 `createScadaEditorSession` 不抛，且有 failing-first 回归测试锁定。
- 每条 Fix 配 failing-first 回归测试断言**可观测结果**（working config 无重复 id / `isInTransaction===false` / `canUndo` 状态 / selection 不含死 id），且至少 P1-1/P1-3 的测试跨越 data↔engine 两层。

## Non-Goals

- 不重写 `diffScadaConfig` 为递归（P1-2，归属 plan {3}）。
- 不扩展 `removeWorkingSymbol`/`groupSymbols`/`ungroupSymbols` 到嵌套目标（P1-4，归属 plan {3}）；本计划 P1-3 的 selection 修剪用 `collectAllSymbols`（已递归）做前向兼容，不依赖 P1-4。
- 不改 `Animator.pause()` 行为（open-audit F7，P2，归 backlog）。
- 不统一两份 clone 实现（open-audit F6，P2，归 backlog）。
- 不改 drop 的 type 注册表校验（open-audit F11，P2，归 backlog）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts`（`addWorkingSymbol` 去重 / `load()` 增 `abortTransaction` / `applyUndoRedoDiff` 增 selection 修剪）。
- `packages/flux-renderers-industrial/src/editor/toolbox-runtime.ts`（`importConfigFn` 增 `abortTransaction`）。
- `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx`（drop id 生成避免与现有 id 碰撞：或在落点处按 `collectAllSymbols` 自增，或 `addWorkingSymbol` 内去重）。
- `packages/flux-renderers-industrial/src/editor/editor-session.test.ts`（F1 缺失 variables 回归）。
- 对应 mutator / undo / drag 测试增 failing-first 用例。

### Out Of Scope

- `editor-engine.ts` applyUpdate（P1-2，plan {3}）。
- 结构 mutator 嵌套支持（P1-4，plan {3}）。
- viewport/resize（P1-5，plan {3}）。
- animator / point-store / refresh-pipeline（open-audit F7/F8/F9，全 P2）。

## Failure Paths

| 场景编号                | 触发                                                                                    | 行为                                                                                                                           | 可重试 | 用户可见表现                                          |
| ----------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------ | ----------------------------------------------------- |
| ED-clone-no-vars        | `createScadaEditorSession({version:1, symbols:[{id:'x',type:'rect'}]})`（无 variables） | 不抛；`workingConfig.symbols` 深度相等；`variables` undefined                                                                  | 否     | 编辑器 mount 成功（既有守卫已防崩，本计划补测试锁住） |
| ED-drag-id-collision    | mount → `load(config 含 rect-1)` → 拖入 rect                                            | 新 id ≠ `rect-1`；working config 无重复 id；engine tree 无 last-write-wins 覆盖                                                | 否     | 拖入图元正常渲染，原图元不受损                        |
| ED-txn-leak-load        | `beginTransaction` → 中途 `load(newConfig)` → pointerup                                 | `undoRedo.isInTransaction===false`；`session.undoStack.canUndo===false`；pointerup 不推 entry                                  | 否     | undo 不再还原到 pre-load config                       |
| ED-txn-leak-import      | `beginTransaction` → 中途 `importConfig(config)`                                        | 同上                                                                                                                           | 否     | 同上                                                  |
| ED-stale-selection-undo | add `foo` + select → undo（remove 反应用）                                              | `session.selection` 不含 `foo`；`onSelectionChange` 触发空/修剪后集；后续 Delete 在死 id 上是干净 no-op-with-feedback 而非静默 | 否     | inspector/toolbox 不再指向死节点                      |
| ED-stale-selection-redo | remove `foo`（已选）→ redo                                                              | selection 与新 working config 一致                                                                                             | 否     | 同上                                                  |

## Test Strategy

档位：**必须自动化**。

理由：undo-data 完整性（P1-1）、selection 一致性（P1-3）、id 唯一性（F3）均为编辑器核心循环回归路径，且 P1-1 是「最难诊断的编辑器 bug」（静默 undo 损坏）。Proof 项在 Fix 前（failing-first）。

## Execution Plan

### Phase 1 - F1 回归锁定（Proof）+ F3 拖拽 id 去重（Fix）

Status: planned
Targets: `packages/flux-renderers-industrial/src/editor/editor-session.test.ts`；`editor/runtime-mutators.ts`（`addWorkingSymbol`）；`editor/scada-editor-canvas.tsx`（drop id）；相关测试

- Item Types: `Proof` | `Fix`

- [ ] (Proof / F1) `editor-session.test.ts` 增 failing-first 用例：`createScadaEditorSession({version:1, symbols:[{id:'x',type:'rect'}]})`（无 variables）不抛 + `workingConfig.symbols` 深度相等 + `workingConfig.variables` 为 undefined。当前应 pass（守卫已落地），用于锁住防回归。（注：本项是 Proof，非 Fix——守卫已在 commit `c2dd1627b` 落地，本计划只补测试。）
- [ ] (Proof / F3 failing-first) 增用例：load 含 `rect-1` 的 config → 经由 drop 句柄注入 rect → 断言新 id ≠ `rect-1` 且 `workingConfig.symbols` 无重复 id。当前会失败（idCounter=0 生成 `rect-1`）。
- [ ] (Fix / F3) drop id 生成对齐 group/paste 纪律：在落点处按 `collectAllSymbols(workingConfig.symbols)` 的现有 id 集做碰撞自增（`do { idCounter.current += 1 } while (existingIds.has(${type}-${idCounter.current}))`），或把去重收敛进 `addWorkingSymbol`（节点 id 与现有集碰撞时自增）。二选一，择一实现并保持与 group/clipboard 同形。
- [ ] (Proof / F3) failing-first 用例转 pass；既有 drag/drop/group/clipboard id 测试零回归。

Exit Criteria:

- [ ] `editor-session.test.ts` 存在无-variables 用例并 pass（F1 锁定）。
- [ ] drop 落点 id 经碰撞自增（live 代码可见，与 group/paste 同形）；`addWorkingSymbol` 后 working config 无重复 id（failing-first 用例 pass）。
- [ ] 既有 id 纪律相关测试（group/clipboard/paste）零回归。

### Phase 2 - P1-1 事务边界对账（load / importConfig abort）

Status: planned
Targets: `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts`（`load`）；`editor/toolbox-runtime.ts`（`importConfigFn`）；相关 undo/load 测试

- Item Types: `Proof` | `Fix`

- [ ] (Proof / failing-first) 增用例：`undoRedo.beginTransaction(kind, oldConfig)` → `runtime.load(newConfig)` → 断言 `undoRedo.isInTransaction === false`、`session.undoStack.canUndo === false`、随后 `undoRedo.commitTransaction(...)` 返回 undefined 且不推 entry。当前会失败（事务态残留 → commit 推巨型 diff）。
- [ ] (Fix) `runtime-mutators.ts` `load()` 在 `resetSession` **之前**调 `undoRedo.abortTransaction()`（事务的 `prevAtOpStart` 在全量 config 替换后已无意义）。
- [ ] (Fix) `toolbox-runtime.ts` `importConfigFn` 同形：`resetSession` 之前调 `undoRedo.abortTransaction()`（与 load 同边界，与 HCA11 importConfig/load parity 同精神）。
- [ ] (Proof / failing-first) 增 importConfig 同型用例（beginTransaction → importConfig → 断言同上）。
- [ ] (Proof) 两条 failing-first 用例转 pass；既有 load/importConfig/undo-coalesce 测试零回归。

Exit Criteria:

- [ ] `load()` 与 `importConfigFn` 在 `resetSession` 前显式调 `undoRedo.abortTransaction()`（live 代码两处可见）。
- [ ] failing-first 用例（load + importConfig 两条）断言 `isInTransaction===false` / `canUndo===false` / commit 不推 entry，并 pass。
- [ ] 既有 undo-coalesce / load / importConfig 测试零回归。

### Phase 3 - P1-3 undo/redo selection 修剪

Status: planned
Targets: `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts`（`applyUndoRedoDiff`）；相关 selection/undo 测试

- Item Types: `Proof` | `Fix`

- [ ] (Proof / failing-first) 增用例：add `foo` + `setSelection(['foo'])` → undo → 断言 `session.selection` 不含 `foo`、`onSelectionChange` 被调用、`canUndo/canRedo` 与栈一致、随后 `removeWorkingSymbol('foo')` 是干净 no-op（不推 entry，因 foo 已不存在）而非静默死 id 操作。当前会失败（selection 残留 `foo`）。再加 redo 同型用例。
- [ ] (Fix) `applyUndoRedoDiff` 成功 `commit()` 后，用 `collectAllSymbols(session.workingConfig.symbols)` 递归收集现存 id 集，修剪 `session.selection`；调 `setSessionSelection(pruned)`（统一 React mirror + 触发 `onSelectionChange`），并在空集时 `engine.clearEditorSelection()`、非空时 `engine.setEditorTargets(resolvedNodes)`。注意用 `collectAllSymbols`（递归）做修剪，保持对 plan {3} P1-4 嵌套 id 的前向兼容。
- [ ] (Proof / failing-first) 两条用例（undo / redo）转 pass；既有 selection dual-source / remove/load deselect 测试零回归。

Exit Criteria:

- [ ] `applyUndoRedoDiff` 在 commit 后显式修剪 selection 并经 `setSessionSelection` 同步（live 代码可见）。
- [ ] failing-first 用例（undo + redo）断言 selection 不含死 id + onSelectionChange 触发 + 后续操作干净，并 pass。
- [ ] 既有 selection / remove deselect / load deselect 测试零回归。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session `ses_01f22f8dfffeDi0HDlbjhDmIwJ`（general）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major → 共识达成。Minor 已处理：F1 守卫 provenance commit hash 由 `f3cc8ea6` 修正为 `git blame` 核对的 `c2dd1627b`（守卫确实已 landed，F1 维持 Proof 分类）。reviewer 独立核对确认 F1（`editor-session.ts:118` 守卫 live + 5 个 test fixture 恒带 variables，缺失路径未测）、F3（`idCounter`/drop id/`addWorkingSymbol` 无去重 vs group/paste 有）、P1-1（`load()` + `importConfigFn` 未 `abortTransaction`，`abortTransaction` 存在于 `undo-redo-adapter.ts:72-76`）、P1-3（`applyUndoRedoDiff:100-113` 不修剪 selection）均成立。

## Closure Gates

- [ ] F1：缺失 variables 的合法 config 不崩且有回归测试锁定（Proof 项 landed）。
- [ ] F3：拖拽落点 id 永不与 working copy 现有 id 碰撞（去重 landed，对齐 group/paste）。
- [ ] P1-1：load/importConfig 在 resetSession 前 abort 事务态，拖拽途中 load 不再产 bogus undo entry。
- [ ] P1-3：undo/redo 后 selection 修剪到现存 id，经 setSessionSelection 同步 mirror + engine targets。
- [ ] failing-first 回归测试均断言可观测结果（跨 data↔engine 两层），pass。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect。
- [ ] 受影响 owner doc（design-renderer.md §4.5 load/reset、design-undo-redo.md §4.2/§8.2 事务边界、design-architecture.md selection）已同步到 live baseline，或明确写明 No owner-doc update required。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

_无（F1/F3/P1-1/P1-3 均为 in-scope Fix/Proof，不延期）。_

## Non-Blocking Follow-ups

- F6（两份 clone 实现语义分裂）—— P2，归 mission follow-up backlog。
- F11（drop 的 type 不经符号注册表校验）—— P2，归 mission follow-up backlog。
- P2-4（handleDelete/handleUngroup 产 N undo entry）—— P2，归 mission follow-up backlog。

## Closure

Status Note: _关闭时填写_

Closure Audit Evidence:

- Auditor / Agent: _独立子 agent fresh session_
- Evidence: _task id / daily log link / findings 摘要_

Follow-up:

- _仅 non-blocking follow-up_
