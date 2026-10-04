# 548 report-designer-core 会话迁移 editor-core（P1.3）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P1.3；`docs/architecture/editor-core.md` §2.3/§6.2；plan 546/547 迁移先例
> Related: plan 547（P1.2，硬前置）；plan 544（裁决记录）

## Purpose

把 report-designer-core 的全量快照栈（上限 50）存储单源到 `@nop-chaos/editor-core`，建立 report 域 adapter 并登记注册表；`report-designer:save` 级联 `spreadsheetCore.acceptCurrentDocumentAsSaved()` 的手工同步改为 editor-core 提交策略标准的 `onCommitted` 回调（消除 dispatch 包装内的手工命令类型匹配）。行为不变：report-designer-core 全量测试（9 文件）零回归。

## Current Baseline

- 栈存储：`core-dispatch.ts` `ReportDesignerInternalState.undoStack/redoStack: ReportTemplateDocument[]`（全量快照栈，上限 `config.maxUndoDepth ?? 50`）；`savedDocument`（commit 基线，dirty = `document !== savedDocument` 引用比较）。
- 入栈单一入口：`core.ts` `pushUndoEntry(current) => Partial<InternalState>`（返回 `{undoStack, redoStack}`），经 `DispatchContext.pushUndoEntry` 被 6 处 mutation 命令消费；undo/redo 两命令在 `core-dispatch.ts:288-324` 直接操作数组。
- 操作时点语义（与 spreadsheet 相同）：undo 恢复 `undoStack` 栈顶（入栈时点前文档）+ redo 栈收 `current.document`（**undo 时点文档**）；redo 对称。事务机制：无（report 无 transactionDoc）。
- 手工级联：`report-designer-renderers/src/page-renderer.tsx:305-315` dispatch 包装内 `command.type === 'report-designer:save' && result.ok` 时调 `spreadsheetCore.acceptCurrentDocumentAsSaved()`。
- `report-designer-core` `package.json` 无 `@nop-chaos/editor-core` 依赖；9 个测试文件全部经公共 API（0 处直接触 `undoStack`）。

## Goals

- 栈存储单源：`ReportDesignerInternalState` 持 `undo: UndoCommandStack<ReportTemplateDocument>` 稳定实例字段（快照对 entry：inverse=undo 目标 / forward=redo 目标，同 plan 547 裁定）；`pushUndoEntry` 签名不变（内部改经栈实例 + 返回空 partial），6 处调用点零改动；undo/redo 命令改写并保留操作时点语义；`buildSnapshot` 的 canUndo/canRedo 经栈 getter。
- 新建 `editor-core-adapter.ts`：`createReportDesignerDomainAdapter()`（diff=结构化深判等 null 包装、applyDiff=快照返回、serialize=JSON.stringify、validate=ok、domainCommands=`report-designer:*` 命令清单与 `commands.ts` 类型集 parity）+ `registerReportDesignerDomain()` 显式注册（kind `'report-designer'`）。
- 提交策略映射：`CreateReportDesignerCoreOptions` 增 `onCommitted?` 回调（editor-core §2.3 形状），`report-designer:save` 成功后触发；page-renderer 级联改经该回调注入（手工命令类型匹配消除）。
- owner doc `editor-core.md` §6.2 增 report 行组（快照对/操作时点/onCommitted/双 store 归一裁定）。
- report-designer-core 全量测试零回归 + 新增 adapter/操作时点 pin 测试。

## Non-Goals

- **报表↔电子表格双核（双 store）物理归一不落本计划**：roadmap §4 负面清单明文"报表↔电子表格双核同步内部机制"域内自治；`spreadsheetSyncSource`/`syncSpreadsheetDocument` 同步通道保持。本计划消除的是 save 级联的**手工同步实现**（命令类型字符串匹配），归一为 `onCommitted` 标准回调；对外漂移消解按负面清单预期由统一 save 语义承担。
- 不改 preview/fieldSources/inspector 异步编排与 codec 命令。
- 不改 `ReportDesignerRuntimeSnapshot` 公开形状。

## Scope

### In Scope

- `packages/report-designer-core/`：`package.json`、`core.ts`、`core-dispatch.ts`、新 `editor-core-adapter.ts` + 测试。
- `packages/report-designer-renderers/src/page-renderer.tsx`（级联改 onCommitted 注入）。
- `docs/architecture/editor-core.md`（§6.2 report 行组）。

### Out Of Scope

- spreadsheet-core / flow-designer / 其他包。

## Failure Paths

| 触发                        | 行为                                                          | 可重试 | 用户可见表现 |
| --------------------------- | ------------------------------------------------------------- | ------ | ------------ |
| 栈切换后 undo/redo 行为漂移 | 既有测试红 → 修栈实现而非改测试期望                           | 是     | 无           |
| `onCommitted` 抛错          | save 命令结果不受影响（回调经 try/catch 隔离 + onError 通道） | 是     | 无           |
| adapter 重复注册            | editor-core 注册表覆盖语义（editor-core.md §3）               | 是     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（内核迁移 + 提交策略变更；failing-first；既有 9 测试文件 + 新增 pin 测试即行为不变证明）。

## Execution Plan

### Phase 1 - 栈存储单源（Fix）

Status: completed
Targets: `packages/report-designer-core/src/core.ts`、`core-dispatch.ts`、`package.json`

- Item Types: `Fix`

- [x] `package.json` 增 `@nop-chaos/editor-core: workspace:*`
- [x] `ReportDesignerInternalState` 增 `undo: UndoCommandStack<ReportTemplateDocument>` 稳定实例字段（maxDepth=config.maxUndoDepth ?? 50）；删除 `undoStack`/`redoStack` 数组字段；`pushUndoEntry` 改经栈实例（返回空 partial，签名不变）；undo/redo 命令改写保留操作时点语义（peek → 恢复 entry.inverse/forward → pop → 以操作时点 `current.document` 重建对侧 entry）；`buildSnapshot` 经栈 getter；`importTemplate`/save 的 `savedDocument` 语义不动
- [x] report-designer-core 全量测试绿（9→10 文件，196/196；既有 186 零回归）

Exit Criteria:

- [x] core.ts/core-dispatch.ts 不再操作自有数组栈
- [x] report-designer-core 全量测试零回归

### Phase 2 - 域 adapter + onCommitted 提交策略（Fix）

Status: completed
Targets: 新 `editor-core-adapter.ts` + 测试、`page-renderer.tsx`

- Item Types: `Fix`

- [x] `createReportDesignerDomainAdapter()` + `registerReportDesignerDomain()`（kind `'report-designer'`，显式调用）；domainCommands 与 `commands.ts` 的 `ReportDesignerCommand` type 联合成员集 parity 锁定（单一事实源派生）
- [x] `CreateReportDesignerCoreOptions` 增 `onCommitted?`：`report-designer:save` 成功（ok 且非 cancelled）后触发，回调异常经隔离不影响 save 结果；page-renderer 级联改经 `onCommitted: () => spreadsheetCore.acceptCurrentDocumentAsSaved()` 注入，删除 dispatch 包装内的命令类型匹配
- [x] （Proof 先行）新增测试：操作时点 pin（A→B→undo 还原 A→redo 还原 B）+ onCommitted 触发与异常隔离（回调实参形状锁定为 `report-designer:save` 的 `ReportDesignerCommandResult`——含 `data: ReportTemplateDocument`，非 editor-core `EditorCommitResult` 的 serialized string；消费侧按需取用）→（Fix）adapter 契约测试（diff null/快照往返/domainCommands parity/注册覆盖）
- [x] report-designer-core + report-designer-renderers 全量测试绿（196/196 + 206/206）

Exit Criteria:

- [x] adapter 测试绿（10/10）；page-renderer 无手工 save 级联匹配

### Phase 3 - owner doc + 全量验证（Follow-up + Proof）

Status: completed
Targets: `docs/architecture/editor-core.md`

- Item Types: `Follow-up`、`Proof`

- [x] §6.2 增 report 行组：快照对/操作时点语义/onCommitted 提交策略映射/双 store 归一裁定（负面清单引用）
- [x] 全仓 typecheck/build/lint/test/check 在 Closure Gates 执行

Exit Criteria:

- [x] owner doc §6.2 与 live 一致（§6.2 标题改为 spreadsheet / report 双家族映射）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_cf75e888-0758-47d9-b499-26a11ca4ec79）
- Verdict: pass
- Rounds: 1
- Findings addressed: 零 Blocker/Major；4 Minor 已处理——①Deferred 补 roadmap P1.3 行"双 store 归一"措辞的读法对账（= save 级联归一为标准提交语义，非物理合并）；②onCommitted 实参形状锁定为 save 命令 Result（含 data 文档）；③failing-first 顺序在 Phase 2 checkbox 显式化（Proof 先于 Fix）；④行号范围修正。

## Closure Gates

- [x] 栈存储单源：report-designer-core 不再持有自有数组栈存储
- [x] 行为不变：report-designer-core 全量测试零回归（186 既有零回归；undo/redo/save/importTemplate 语义 + 快照形状）
- [x] 手工 save 级联消除（onCommitted 标准回调落地，含异常隔离 + 触发/不触发测试锁定）
- [x] 域 adapter 契约落地 + 注册表登记
- [x] owner doc §6.2 report 行组成文
- [x] 必要 focused verification 已完成（report-designer-core 196/196 + renderers 206/206）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（78 tasks 全绿）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

### 报表↔电子表格双核（双 store）物理归一

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap §6 P1.3 行的"双 store 归一"按 §4 负面清单括注读作"save 级联手工同步归一为标准提交语义"（本计划 Goals 第 3 条已落地），而非物理双 store 合并——§4 负面清单明文将"报表↔电子表格双核同步内部机制"划为域内自治；物理归一会重写 syncSpreadsheetDocument/spreadsheetSyncSource 通道，收益不成立。
- Successor Required: `no`（负面清单既有裁定，非新裁决）

## Non-Blocking Follow-ups

- `savedDocument` 引用比较 dirty 判定可在后续治理轮评估改结构化比较（现行为保留）。

## Closure

Status Note: 栈存储单源（快照对 entry）+ 操作时点 undo/redo 语义 + onCommitted 标准提交回调（手工 save 级联消除）+ 域 adapter/注册（round 1 Major 修正：adapter 符号经包公共面导出）+ owner doc §6.2 report 行组全部落地；独立 closure audit approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_4f4ee903-00aa-4df7-a813-1177a0cc42ff）
- Evidence: Round 1 VERDICT: issues（1 Major：adapter 未从包公共面导出 + 3 Minor）→ 修正（index.ts 导出 6 符号、domainCommands 升级 Record 穷尽映射编译期锁定、isReportDesignerDomainCommand 别名消歧、plan 勾选补齐）→ 复核中。Round 1 已核实：undo/redo 对照 HEAD 逐 hunk 等价、pushUndoEntry 6 调用点未动、importTemplate 不变、onCommitted 时序/隔离正确、级联测试全路径通过、测试零删改（git diff --stat 为空）、renderers 206/206。Informational 记录：redo 路径现经内核 pushUndo 强制 maxDepth（旧数组实现满栈 redo 后瞬态 51 深）——对齐 P1.2 先例与 U7 不变式，仅 50 深边界可观测，196/196 绿，非回归。Round 2 VERDICT: approved（Major 修复核实：index.ts 导出 6 符号恢复 P1.1/P1.2 parity；parity 锁升级 Record 穷尽映射编译期双向锁定）。

Follow-up:

- savedDocument 引用比较 dirty 判定的结构化比较评估（Non-Blocking Follow-ups 已记）；no remaining plan-owned work。
