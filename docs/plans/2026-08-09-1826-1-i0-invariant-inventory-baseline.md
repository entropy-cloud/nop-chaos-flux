# 1 Cycle 1 / I0 — 不变式盘点与基线（ai-invariant-loop）

> Plan Status: completed（2026-08-09 closure-audit PASS，零 finding）
> Mission: ai-invariant-loop
> Work Item: Cycle 1 / I0. 不变式盘点与基线
> Last Reviewed: 2026-08-09
> Source: `docs/backlog/ai-invariant-loop-roadmap.md`（Work Item: Cycle 1 / I0 + Phase Details I0）、`docs/logs/2026/08-08.md`（roadmap 共识审查 2 轮）
> Related: `docs/plans/2026-08-09-1826-2-i1-invariant-gate-sedimentation.md`（依赖本 plan 产出的 catalog）

## Purpose

把 AI engine 历经 4 轮审计 + C8.1/8.2/8.3 + post-closure 的已知失败模式族，沉淀为不变式目录 `docs/audits/ai-invariants/invariant-catalog.md`（每条不变式含「陈述 / 覆盖失败族 / 历史 bug 证据 / 检测方法」）；确认「零 engine 不变式门禁」基线；枚举全部变更型方法作为 I1 门禁与 I2 审计的目标集。本 plan 只产文档与裁定，不写任何门禁代码（I1）、不执行审计（I2）。

## Current Baseline

（以下均经 live repo 核对，2026-08-09）

- 4 轮 AI audit（`docs/audits/2026-07-23-2141-*ai.md`、`2026-07-24-1757-*ai.md`、`2026-07-24-2151-*ai.md`、`2026-07-25-0707-*ai.md`）+ C8.1/8.2/8.3 逐组件卡 + post-closure 已完成；AI 包 509+ 单测、typecheck/build/lint/test 全绿、`pnpm check` 零命中。
- 三大复发族 live 终态均为「已修复」（实证行号）：
  - 并发守卫族：`create-engine.ts` 的 `runTurn` catch/finally（:330-346）+ `runOnce` 轮次内（:448-472，`runOnce` 定义于 :367-480）已落 controller 身份守卫（roadmap 标 `P1#1`；`draft.isProcessing=false` 写入均置于身份判断之后）；`sendMessage`(:172)/`send`(:185)/`runTurn`(:193) 入口有 `isProcessing` 守卫（:199）；`clear`(:521)/`setMessages`(:139) 有 in-flight 守卫（:142/:525）。
  - stale-closure 族：`use-conversation.ts` :122-128 `activeIdRef` mirror；:339 switchConversation eviction 读 `activeIdRef.current`（P1-a/P1-c）；:360 deleteConversation post-await 分支读 `activeIdRef.current`（P1-3/0707）。
  - storage 静默族：createConversation(:282-288)、renameConversation(:379-385)、deleteConversation(:370)、clearAll（storage fan-out + per-id `reportStorageError`）均走 `reportStorageError`（P1-2 / P1-b / 0707）。
- 既有回归测试（反应式、per-bug）：`engine/__tests__/engine-concurrency.test.ts`、`adapters/__tests__/use-conversation-{switch,delete-during-abort,clear-all,storage,create}.test.ts`、`renderers/__tests__/ai-silent-drop-guards.test.tsx`。
- **零 engine 不变式门禁（待确认的基线）**：`package.json` 的 `check:*` 项均与 engine/conversation 无关（计数口径：HEAD 28 项；working tree 当前处于 industrial-hmi 分支合并中为 30 项，新增项为 `check:scada-symbol-keys` 等非 engine 项——两版本均无 engine 门禁，零门禁基线结论不受影响）；`check:audit-event-dispatch-ctx` 只覆盖 renderer 包；`scripts/audit/`（shared.mjs/rules.mjs 扫描器框架）无 engine 扫描器；`docs/audits/ai-invariants/` 目录不存在。
- `docs/components/flux-renderers-ai/engine.md` 无 §invariants 节（该节由 I1 补写）。
- 变更型方法目标集（live 反查）：`MessageEngine` 接口（`engine/types.ts:287-334`）公共成员 `sendMessage`(:290)/`send`(:291)/`abort`(:292)/`clear`(:294)/`setMessages`(:311)/`regenerate`(:334)；内部共享管道 `runTurn`（`create-engine.ts:193`，send/sendMessage/regenerate 均汇入）；adapter（`adapters/use-conversation.ts`）`createConversation`/`switchConversation`/`deleteConversation`/`renameConversation`/`clearAll`（UseConversationReturn 反查）。

## Goals

- `docs/audits/ai-invariants/invariant-catalog.md` 落地：首批 5 类不变式（①异步变更入口 `isProcessing` 守卫；②await 后状态读取用 `activeIdRef`/`versionRef`；③catch/finally controller 写入做身份守卫；④storage 变更经 `reportStorageError`；⑤abort 路径清理 controller），每条含 4 字段且引用 live `文件:行` 可复核。
- 已知未覆盖族（plugin 生命周期、tool-execution 并发、streaming backpressure、branching/fork）登记为「Cycle 2+ 候选不变式，Cycle 1 不实现」。
- 零门禁基线确认并记录于目录首页（28 项 `check:*` 无 engine 相关 + `scripts/audit/` 无 engine 扫描器）。
- 变更型方法目标集完整枚举，经 live 对象字面量/接口反查交叉验证（diff 为零），边界成员（`setMessageEditing`/`setConnector`/`registerPlugin`/`getMessages`）归属裁定完整。

## Non-Goals

- 不实现任何门禁代码 / 不变式测试 / 扫描器 / CI 接入（那是 I1）。
- 不运行门禁审计或对抗探查（那是 I2）。
- 不做 red list 裁决或裁决表（那是 I3）。
- 不修任何 engine/adapter 代码（那是 I4）。
- 不沉淀 Cycle 2+ 候选族的门禁（roadmap I0 明示 Cycle 1 不实现）。

## Scope

### In Scope

- 编写 `docs/audits/ai-invariants/invariant-catalog.md`（基线确认 + 5 条首批不变式 + 候选族登记 + 目标集枚举）。
- 目标集与 live 类型的交叉验证 Proof（一次性自动化反查）。
- `runTurn` 归属裁定（内部管道 vs 公共接口，供 I1 表完备性门禁引用）。

### Out Of Scope

- 门禁实现、CI 接入、`engine.md` §invariants（I1）。
- 审计执行（I2）、裁决表（I3）、修复（I4）。

## Failure Paths

不适用：纯审计文档产出，无外部契约 / 错误处理面；本 plan 的正确性由 Phase 2 的自动化交叉验证 Proof 与 closure 阶段的独立 closure-audit 兜底。

## Test Strategy

本档选择：必须自动化

roadmap Rule 强制「每个 work item plan 的 Test Strategy = Must automate（不变式门禁本身即测试）」。本 plan 无行为变更，自动化验证体现在 Phase 2 的 Proof 项：以 `create-engine.ts:78-93` engine 对象字面量（可枚举函数键）与 UseConversationReturn 函数字段为运行时提取源，按变更型判定准则过滤后与目录目标集比对，diff 为零才收口。

## Execution Plan

### Phase 1 — 不变式目录初稿与基线确认

Status: completed
Targets: `docs/audits/ai-invariants/invariant-catalog.md`（新建）

- Item Types: `Fix | Proof | Decision`

- [x] Fix: 新建 `docs/audits/ai-invariants/` 并编写 `invariant-catalog.md`；首页记录基线确认（`package.json` `check:*` 项无 engine 相关——HEAD 28 项口径、working tree 合并中 30 项均无、`scripts/audit/` 无 engine 扫描器、`check:audit-event-dispatch-ctx` 为 renderer 包等价先例、`docs/audits/ai-invariants/` 此前不存在）
- [x] Fix: 首批 5 类不变式逐条落地，每条含 4 字段（不变式陈述 / 覆盖失败族 / 历史 bug 证据 `文件:行` 或 bug note 编号 / 检测方法），证据引用 4 轮审计产物（`docs/audits/2026-07-2*-ai.md`）与 bug note（Bug 07、AI-01、1757、P1-1/P1-2/P1-3、P1-a/P1-b/P1-c、F2.2）
- [x] Proof: 逐条核对三大族「已修复」证据与 live 行号一致（`create-engine.ts:330-346/448-472` 身份守卫、`use-conversation.ts:122-128/339/360` ref 读取、clearAll storage fan-out + `reportStorageError`）
- [x] Decision: 已知未覆盖族登记表（plugin 生命周期、tool-execution 并发、streaming backpressure、branching/fork），每条标注「Cycle 2+ 候选不变式，Cycle 1 不实现」及触发条件（I2 触及则按 Loop Rule 派生）

Exit Criteria:

- [x] `invariant-catalog.md` 存在；首批 5 条不变式各含 4 字段，历史 bug 证据引用可复核
- [x] 基线确认与 Cycle 2+ 候选族登记已写入目录，无静默遗留

### Phase 2 — 审计目标集枚举与交叉验证

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/types.ts`、`src/adapters/use-conversation.ts`（只读）+ `invariant-catalog.md`

- Item Types: `Fix | Proof | Decision`

- [x] Fix: 目标集枚举入目录：engine 公共（`types.ts:287-334` 的 `sendMessage`/`send`/`abort`/`clear`/`setMessages`/`regenerate`）+ adapter（UseConversationReturn 的 `createConversation`/`switchConversation`/`deleteConversation`/`renameConversation`/`clearAll`），各带 `文件:行`
- [x] Proof: 一次性自动化反查——以 `create-engine.ts:78-93` engine 对象字面量的可枚举函数键 + `use-conversation.ts` UseConversationReturn 函数字段为运行时提取源，按「变更型判定准则」（见下条 Decision）过滤后与目录目标集比对，diff 结果记录入目录（零 diff 才通过）
- [x] Decision: 裁定 `runTurn`（`create-engine.ts:193`）为内部共享管道（非 `MessageEngine` 公共成员），不进 I1 表完备性门禁的测试表，由 `send`/`sendMessage`/`regenerate` 间接覆盖；裁定与理由写入目录供 I1 引用
- [x] Decision: 裁定边界成员归属——变更型判定准则：「写入 {messages, requestState, processingState, isProcessing, lastError, abortController, activeId, conversation 列表/storage} 之一」的公共方法入门禁目标集；据此 `setMessageEditing`（`types.ts:320`，同步变更方法，写 `message.state.editing`，`create-engine.ts:153-170`）**纳入**目标集（同步变更行，供 in-flight 守卫与状态一致性不变式覆盖，同 `clear`/`setMessages` 行类），`setConnector`/`registerPlugin`/`getMessages`/`getState`/`subscribe`（配置/读取类，不写会话状态）**不入**目标集但必须进 I1 表完备性门禁的显式非变更白名单——裁定与理由记录入目录，供 I1 直接引用

Exit Criteria:

- [x] 目标集清单带 live 行号入目录；自动化反查 diff 为零且结果记录在案
- [x] `runTurn` 归属裁定 + 边界成员（`setMessageEditing`/`setConnector`/`registerPlugin`/`getMessages`）裁定已记录（I1 表完备性门禁直接引用）

## Draft Review Record

- Reviewer / Agent: Round 1 `ses_019ebc1f3ffeKwQgIHGId29vBj`；Round 2 `ses_019e4b663ffenf8crV7jzh2LPg`（均为 fresh session）
- Verdict: `pass`（Round 1 `revised` → 修正 → Round 2 `pass`，零 Blocker/零 Major）
- Rounds: 2
- Findings addressed:
  - [Major] Phase 2 Proof 操作化 + 边界成员归属裁定：新增 Decision 项（变更型判定准则；`setMessageEditing` 纳入同步变更行、`setConnector`/`registerPlugin`/`getMessages`/`getState`/`subscribe` 入非变更白名单）；Proof 提取源钉死为 engine 对象字面量（`create-engine.ts:78-93`）+ UseConversationReturn 函数字段
  - [Minor] 448-472 区属 `runOnce`（:367-480）非 runTurn catch/finally，已重新标注
  - [Minor] `check:*` 计数口径（HEAD 28 / working tree 30，industrial-hmi 合并中）已记录并声明零门禁结论不受影响
  - [Minor] `message.editing` → `message.state.editing`（Round 2 残余 nit，已修正）

## Closure Gates

- [x] 首批 5 条不变式各引用 ≥1 个历史 bug 证据（live 行号或 bug note 编号），可复核
- [x] 目标集与 live 对象字面量/接口反查交叉验证零 diff，结果记录在案
- [x] 边界成员（`setMessageEditing` 纳入 / `setConnector`/`registerPlugin`/`getMessages` 入白名单）裁定已记录，无悬挂
- [x] 零 engine 门禁基线已确认并记录于目录首页
- [x] Cycle 2+ 候选族已登记，无静默遗留；不存在被静默降级到 deferred 的 in-scope 项
- [x] No owner-doc update required：`engine.md` §invariants 由 I1 补写；本 plan 产出为独立审计文档，不改动 live baseline / public contract / owner behavior
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

> 纯文档计划：不涉及代码变更，`pnpm typecheck`/`build`/`lint`/`test` 从 Closure Gates 中移除（guide Minimum Rule「纯文档计划」条款）。

## Deferred But Adjudicated

### Cycle 2+ 候选不变式族（plugin 生命周期 / tool-execution 并发 / streaming backpressure / branching-fork）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap I0 明示「已知未覆盖族登记为 Cycle 2+ 候选，Cycle 1 不实现」；这些族当前无已确认 live defect 处于 scope 内，I2 若触及即按 Loop Rule 触发新族派生，不构成静默盲区（登记在案）
- Successor Required: `yes`
- Successor Path: Loop Rule 自动派生 Cycle 2 / I1（roadmap Work Item Status 追加，附触发证据）

## Non-Blocking Follow-ups

- 无 plan-owned 剩余工作：本 plan 收口即目录可用，I1 直接依赖

## Closure

Status Note: 全 2 Phase completed（2026-08-09）。`docs/audits/ai-invariants/invariant-catalog.md` 落地（153 行）：§1 零门禁基线确认 + §2 五条不变式（各含 4 字段 + live 行号证据）+ §2.6 三大族逐行核对表 + §3 Cycle 2+ 候选族登记 + §4 目标集枚举（12 变更方法 + 5 白名单 + runTurn/边界裁定）+ §5 零 diff proof。纯文档计划无代码变更。独立 closure-audit PASS（零 finding）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，cold context，task `ses_019d61aa6ffe7PDTA69j8vwfwg`，2026-08-09）
- Evidence: Verdict **PASS**（零 Blocker/Major/Minor）。全部 live 行号证据精确匹配（5 条不变式 × 多处 file:line + 目标集 12 方法声明/实现行 + engine 对象字面量 12 键 + UseConversationReturn 5 字段 + runTurn 不在字面量/接口 + 基线 30 项 check:\* 无 engine 项 + scripts/audit/ 零 engine 扫描器）。Phase 1/2 Status completed、Plan Status active（本次翻转）、Closure Gates 7 项全可核实为 TRUE。

Follow-up:

- 无（本 plan 无确认 live defect；后续 loop 工作由 I1/I2 承接）
