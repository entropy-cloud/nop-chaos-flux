# 547 spreadsheet-core 会话迁移 editor-core（P1.2）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P1.2；`docs/architecture/editor-core.md` §2/§6；plan 546（P1.1）确立的迁移先例
> Related: plan 544（裁决记录）；P1.3（report 迁移，依赖本计划）

## Purpose

把 spreadsheet-core 的快照栈存储单源到 `@nop-chaos/editor-core`（消灭 roadmap §3 登记的"三套 undo/redo 并存"中的 spreadsheet 独立实现），建立 spreadsheet 域 adapter 并登记注册表；`transactionDoc`/`acceptCurrentDocumentAsSaved` 按 editor-core 事务/commit 语义映射成文。行为不变：spreadsheet-core 全量测试（16 文件）零回归。

## Current Baseline

- 栈存储：`packages/spreadsheet-core/src/core/internal-state.ts` `SpreadsheetInternalState.undoStack/redoStack: SpreadsheetDocument[]`（**全量快照栈**，上限 `maxUndoDepth ?? 100`，push 时 shift 最旧 + 截断 redo）；`transactionDoc: SpreadsheetDocument | null`（事务起点快照）。
- 栈操作全部集中：`internal-state.ts`（`pushUndo`/`pushUndoDocument`/`applySimpleDocumentMutation`/`buildSnapshot` 派生 history）+ `command-handlers/history-handlers.ts`（begin/commit/rollback/undo/redo 五 handler）+ `core.ts`（初始 state、`replaceDocument` 重置、`acceptCurrentDocumentAsSaved`）。
- 消费模式统一：`applySimpleDocumentMutation(state, nextDoc)` / `pushUndo(state)` 遍布 handler（46 调用点：cell 16 / sheet 17 / structure 5 / clipboard 3 / search 3 / history 2，单一入口函数）。
- undo/redo 语义：`handleUndo` 恢复 `undoStack` 栈顶全量文档 + `dirty: true` + 清 transient + **push `current.document`（undo 时点文档）入 redo**；`handleRedo` 对称 push redo 时点文档入 undo。**redo 目标 = undo/redo 操作时点文档，非 entry 入栈时点文档**——事务开启后文档可漂移（事务内 mutation / recalc 替换 document 不入栈），该差异在"事务开启期间派发 undo/redo"场景可观测（现无测试覆盖此路径）。**无 diff/applyDiff 实现**（SpreadsheetDocument 无域 diff——与 SCADA 不同）。
- `acceptCurrentDocumentAsSaved()`：`dirty: false`（committed 基线语义 = "当前文档视为已保存"）。
- spreadsheet-core `package.json` 无 `@nop-chaos/editor-core` 依赖。
- 选区语义：`SpreadsheetSelection`（cell-range 域语义，roadmap §4 负面清单——不入 adapter）。

## Goals

- editor-core `UndoCommandStack` 增加法 API `clearRedo()`（事务期间清 redo 所需；failing-first）。
- spreadsheet-core 栈存储单源：`SpreadsheetInternalState` 持 editor-core `UndoCommandStack<SpreadsheetDocument>` 实例（快照对 entry：`inverse` = undo 目标文档、`forward` = redo 目标文档——快照即自逆 diff，forward/inverse 对称契约平凡满足），`pushUndo`/五 handler/`replaceDocument`/`buildSnapshot` 全部经栈实例；公开快照形状（`history.canUndo/canRedo/undoDepth/redoDepth`）与全部命令行为不变。
- 新建 `editor-core-adapter.ts`：`createSpreadsheetDomainAdapter()` 实现 `EditorDomainAdapter<SpreadsheetDocument, SpreadsheetDocument>`（diff=deepEqual 空变更返 null 否则返回新文档快照、applyDiff=返回 diff 快照、serialize=JSON.stringify、validate=ok、domainCommands=核心命令清单）+ `registerSpreadsheetDomain()` 显式注册（kind `'spreadsheet'`）。
- `transactionDoc` ↔ editor-core 事务三件套、`acceptCurrentDocumentAsSaved` ↔ editor-core commit 语义映射在 owner doc 成文（§6.2）。
- spreadsheet-core 全量测试零回归 + 新增 adapter/栈单测。

## Non-Goals

- 不引入 SpreadsheetDocument 结构化 diff（快照对即语义等价：undo 恢复全量文档与现状逐字节一致；结构化 diff 是优化项非契约项）。
- 不改公式引擎（recalc）与命令面（`spreadsheet:*` dispatch 协议）。
- 不改 `SpreadsheetRuntimeSnapshot` 公开形状与 `spreadsheet-renderers` 消费侧。
- 选区 cell-range 域语义不入内核容器（负面清单）。

## Scope

### In Scope

- `packages/editor-core/src/`：`undo-command-stack.ts`（clearRedo）+ 测试。
- `packages/spreadsheet-core/`：`package.json`、`core/internal-state.ts`、`command-handlers/history-handlers.ts`、`core.ts`、新 `editor-core-adapter.ts` + 测试。
- `docs/architecture/editor-core.md`（§6.2 spreadsheet 映射）。

### Out Of Scope

- `spreadsheet-renderers` / report-designer（P1.3）/ 任何 UI 层。

## Failure Paths

| 触发                                   | 行为                                            | 可重试 | 用户可见表现     |
| -------------------------------------- | ----------------------------------------------- | ------ | ---------------- |
| 栈切换后 undo/redo 行为漂移            | 既有测试红 → 修栈实现而非改测试期望             | 是     | 无（迁移内闭合） |
| 事务中 pushUndo（transactionDoc 非空） | 保持现状：不入栈 + 清 redo（经 `clearRedo()`）  | 是     | 无               |
| adapter 重复注册                       | editor-core 注册表覆盖语义（editor-core.md §3） | 是     | 无               |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（内核迁移；failing-first；既有 16 测试文件即行为不变证明）。

## Execution Plan

### Phase 1 - editor-core clearRedo（Proof + Fix，failing-first）

Status: completed
Targets: `packages/editor-core/src/undo-command-stack.ts`、`editor-core.test.ts`

- Item Types: `Proof`、`Fix`

- [x] （Proof）失败用例：`clearRedo()` 清空 redo 不动 undo、空栈 no-op（2 用例先红）
- [x] （Fix）实现 `clearRedo()`
- [x] editor-core 全包测试绿（39/39）

Exit Criteria:

- [x] editor-core 测试全绿（39/39），typecheck 绿

### Phase 2 - 栈存储单源（Fix）

Status: completed
Targets: `packages/spreadsheet-core/src/core/internal-state.ts`、`command-handlers/history-handlers.ts`、`core.ts`、`package.json`

- Item Types: `Fix`

- [x] `package.json` 增 `@nop-chaos/editor-core: workspace:*`
- [x] `SpreadsheetInternalState` 增 `undo: UndoCommandStack<SpreadsheetDocument>` 稳定实例字段（构造于 `createSpreadsheetCore`，maxDepth=config.maxUndoDepth；zustand setState 均为 partial/spread，实例引用稳定）；删除 `undoStack`/`redoStack` 数组字段；`pushUndoDocument`/`handleBeginTransaction`/`handleCommitTransaction`/`handleRollbackTransaction`/`replaceDocument`/`buildSnapshot` 改经栈实例（entry：inverse=undo 目标 / forward=redo 目标；事务中 push → clearRedo 不入栈，保持现状）
- [x] `handleUndo`/`handleRedo` 保留**操作时点文档语义**：undo = peekUndo 取 entry.inverse 为恢复目标 → popUndo → pushRedo 构造新 entry（forward=**undo 时点 current.document**）；redo 对称（inverse=**redo 时点 current.document**）——与现状逐字节一致，覆盖"事务开启期间文档漂移后 undo/redo"场景；删除 `pushUndo`/`pushUndoDocument` 死参数 `maxUndoDepth?`（零调用方）
- [x] spreadsheet-core 全量测试绿（16 文件零回归，306/306）

Exit Criteria:

- [x] internal-state/handlers 不再直接操作自有数组栈（存储唯一来源 editor-core `UndoCommandStack`）
- [x] spreadsheet-core 全量测试零回归（306/306 迁移切换点 + 314/314 含新增测试）

### Phase 3 - 域 adapter + 注册 + owner doc（Fix + Follow-up）

Status: completed
Targets: 新 `editor-core-adapter.ts` + 测试、`docs/architecture/editor-core.md`

- Item Types: `Fix`、`Follow-up`

- [x] `createSpreadsheetDomainAdapter()`（diff=结构化深判等 null 包装（审计扫描器禁 JSON.stringify 比对，自实现键序不敏感 deepEqual） / applyDiff=快照返回 / serialize / validate / domainCommands=**全量 `spreadsheet:*` 命令名清单**——与 `core-dispatch.ts` handler 注册表键集逐一相等，测试锁定 parity）+ `registerSpreadsheetDomain()`（kind `'spreadsheet'`，显式调用）
- [x] adapter 单测 8 用例（diff null/快照往返/domainCommands 与 dispatch 注册表 parity/注册覆盖）+ mid-transaction undo/redo operation-time pin 测试
- [x] `editor-core.md` 增 §6.2：spreadsheet 映射表（undoStack/redoStack→UndoCommandStack 快照对、transactionDoc→事务三件套语义映射、acceptCurrentDocumentAsSaved→commit 语义映射、快照对=自逆 diff 裁定、操作时点文档语义保留裁定）

Exit Criteria:

- [x] adapter 测试绿（8/8）；owner doc §6.2 与 live 一致

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_445f2c19-075e-4dd5-9ef6-02969241d2d0）
- Verdict: pass（round 1 fail → 修订 → round 2 pass）
- Rounds: 2
- Findings addressed: Round 1 唯一 Major（快照对 entry 映射在"事务开启期间派发 undo/redo"场景静默漂移且无测试覆盖）——handleUndo/handleRedo 改为保留操作时点文档语义（peek + 操作时点构造对侧 entry）+ failing-first pin 测试；4 Minor（46 调用点、死参数 maxUndoDepth 移除、Phase 3 全门禁重复、domainCommands 全量命令集 parity 锁定）全部落地。

## Closure Gates

- [x] 栈存储单源：spreadsheet-core 不再持有自有数组栈存储
- [x] 行为不变：spreadsheet-core 全量测试零回归（306 既有零回归 + 8 新增；操作时点语义 pin 锁定）
- [x] 域 adapter 契约落地 + 注册表登记
- [x] owner doc 事务/commit 语义映射成文（§6.2）
- [x] 必要 focused verification 已完成（editor-core 39/39 + spreadsheet-core 314/314）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（78 tasks 全绿）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

（无——快照对即语义等价迁移；结构化 diff 列为优化项，见 Non-Blocking Follow-ups。）

## Non-Blocking Follow-ups

- SpreadsheetDocument 结构化 diff（cell-range 增量）是内存优化 candidate，不改对外契约，按家族节奏评估。
- P1.3 report 迁移复用本计划的 adapter 模式与快照对裁定。

## Closure

Status Note: 栈存储单源（快照对 entry = 自逆 diff，语义与快照栈逐字节一致）+ 操作时点 undo/redo 语义保留（pin 测试锁定）+ 域 adapter/注册 + owner doc §6.2 全部落地；独立 closure audit approved（0B/0M/2m）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_209b8055-a674-4369-88e3-8772f0315d1c）
- Evidence: VERDICT: approved——行为对等对照 HEAD 逐 entry 核实（含事务收口 redo 截断、事务中 push 清 redo、replaceDocument 双栈清空）；pin 测试确证 operation-time 语义；adapter parity/deepEqual/注册覆盖核实；spreadsheet-core 314/314 与 editor-core 39/39 独立复跑通过。2 Minor 非阻塞非 in-scope 缺陷。

Follow-up:

- SpreadsheetDocument 结构化 diff 为内存优化 candidate；maxUndoDepth 残留死字段可在 P4/P5 治理轮清理；no remaining plan-owned work。
