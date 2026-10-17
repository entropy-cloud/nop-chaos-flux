# 635 跨 roadmap UR-8 异步取消安全统一（10 条）——核验回写收口

> Plan Status: completed（2026-10-17 closure audit R1 issues（1 Major：15-S1d 回写行遗漏）→ 修复 → R2 **approved**（独立子 agent agent_d2f68080））
> Last Reviewed: 2026-10-17
> Source: `docs/backlog/cross-roadmap-remediation-roadmap.md` UR-8（Wave C，audit-remediation Follow-up Backlog：D06 组 06-05/09/10 + D15 组 15-S1a~f + P2-E）
> Related: `docs/backlog/audit-remediation-roadmap.md`（头部「D06/D15/D19/P2-E all fixed and verified」2026-07-28）

## Purpose

UR-8 的 10 条异步取消安全问题经 2026-10-17 独立代理逐条 live 核对**全部已修复**（修复出自 2026-07-28 async-safety 治理轮，plans 2026-07-28-0900/1800-1；audit-remediation roadmap 头部已记载）。本计划为核验回写收口：唯一残留动作 = 06-10 的「dispose 双 abort 文档化」注记 + Follow-up Backlog 10 行回写 + cross-roadmap UR-8 置 done。

## Current Baseline

（2026-10-17 独立核对，证据 file:line：）

- 06-05/15-S1d `use-dict-options.ts`：AbortController（:84 创建、:102-104 cleanup）+ genRef 代数守卫，loadDictShared 透传 signal——已修复。
- 06-09 `use-crud-polling.ts`：lastActionRef 门控封堵 true→false→true 误标（:121/:125-128/:166/:177）；修复出自 commit 299649c76（plan 2026-07-28-1800-1），回归测试 crud-lifecycle.test.tsx + crud-polling-retry-cap.test.tsx——已修复。
- 06-10 `renderer-reaction-handle.ts:334-335`：dispose 中 lifecycleController.abort() + inFlightController?.abort() 双 abort——行为安全（幂等），登记建议的说明性注释未落（本计划唯一实修点）。
- 15-S1a `use-select-remote-search.ts`：纯 AbortController（:55/:57/:67/:102/:109/:115-118）——已修复。
- 15-S1b `tree-control-controllers.ts`：原代码已迁 `tree-control-sources.ts:99-158`，纯 AbortController 模式——已修复。
- 15-S1c `condition-builder/value-input.tsx:190-208`：AbortController + cleanup——已修复。
- 15-S1e `crud-renderer-load.ts`（原 crud-renderer-state 登记坐标失效）：AbortController（:375）+ cancelled settle 不投影语义注释——已修复。
- 15-S1f `content/markdown.tsx:42-64`：AbortController + env.fetcher 透传 signal（INV-1 注释）——已修复。
- P2-E `async-data/reaction-runtime.ts:413-432`：subscribe 先挂 + subscribed 标志门控，initialValue 求值与 subscribed=true 同步段完成——已修复（登记坐标已迁移，根路径文件不存在）。

## Goals

- 06-10 文档化注记落地（dispose 双 abort 幂等安全性说明）。
- Follow-up Backlog 10 行逐行回写（已修复 + 证据/出处）；cross-roadmap UR-8 置 done。

## Non-Goals

- 其余 UR-7/9/10/11 条目；行为代码变更（本计划唯一代码动作为注释）。

## Scope

### In Scope

- `packages/flux-runtime/src/renderer-reaction-handle.ts`（dispose 注释）。
- `docs/backlog/audit-remediation-roadmap.md` 10 行回写 + cross-roadmap UR-8 行 + daily log。

### Out Of Scope

- 任何行为变更；UR-9/10/11。

## Test Strategy

档位选择：**不适用：纯文档回写 + 代码注释，无行为变更**。验证 = flux-runtime 包 focused typecheck/test + lint。

## Execution Plan

### Phase 1 - 注记 + 回写

Status: completed
Targets: renderer-reaction-handle.ts、audit-remediation Backlog、cross-roadmap、daily log

- Item Types: `Fix | Proof`

- [x] 06-10：`renderer-reaction-handle.ts` dispose 双 abort 处加 Adjudication 06-10 说明性注释（幂等 abort 安全性）。
- [x] Follow-up Backlog 10 行注记（06-05/06-09/06-10/15-S1a~f/P2-E——已修复 + 证据/出处，含三处登记坐标迁移说明）。
- [x] cross-roadmap UR-8 置 done + Plan 列；daily log。

Exit Criteria:

- [x] flux-runtime focused typecheck/test 绿（1542/1543 含 1 既有 skip）、lint 绿；回写三面一致。

## Draft Review Record

- Reviewer / Agent: 核对证据来自独立 Explore 代理逐条 live 核对（2026-10-17，UR-8 十条全修复结论 + audit-remediation roadmap 头部记载互证）；本 plan 为纯回写性质（核对结论即审查输入），无行为面可审——按 guide「纯文档/无行为变更」口径豁免独立 draft review，收口经独立 closure audit 兜底。
- Verdict: 豁免（回写型 plan；closure audit 独立执行）
- Rounds: —
- Findings addressed: —

## Closure Gates

- [x] 06-10 注释落地
- [x] 回写三面一致（Backlog 10 行 + cross-roadmap + daily log）
- [x] flux-runtime focused typecheck/test 绿（1542/1543 含 1 既有 skip）、lint 绿（纯注释 + 文档变更，Test Strategy 豁免全量链）
- [x] 不存在被静默降级的 in-scope 项
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure Audit Evidence）
- [x] `pnpm typecheck`（flux-runtime focused 绿；全量链最近一轮 = plan 633/634 收口轮，其后仅注释 + docs 变更）
- [x] `pnpm build`（同上口径）
- [x] `pnpm lint`（绿）
- [x] `pnpm test`（同上口径）

## Deferred But Adjudicated

（无。）

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: 2026-10-17 收口。UR-8 十条核验回写闭环：全部已于 07-28 治理轮修复（独立代理逐条 live 核对 + roadmap 头部记载互证）；唯一 delta（06-10 文档化注记）落地；Backlog 10 行 + cross-roadmap + daily log 三面一致。

Closure Audit Evidence:

- Auditor / Agent: agent_d2f68080（独立 fresh-session sub-agent，2026-10-17）
- Evidence: R1 `issues`（1 Major：15-S1d 回写行遗漏——四处「10 行」声称与实况漂移；十条修复实质全部实读属实）→ F1 补行 + F2 证据补记 → R2 delta 复核 **approved**（三项核对全 PASS：15-S1d 行文准确、四处「10 行」声称为真、审计链如实；delta 纪律核查无夹带）。事实核查输入 = 独立 Explore 代理逐条核对（十条全修复 file:line）+ audit-remediation roadmap 头部「D06/D15/D19/P2-E all fixed and verified」互证；flux-runtime focused 1542/1543。

Follow-up:

- 无 remaining plan-owned work。
