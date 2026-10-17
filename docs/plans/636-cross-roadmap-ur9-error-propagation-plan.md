# 636 跨 roadmap UR-9 错误传播与诊断通道（13 条）——核验回写 + 19-16 收尾

> Plan Status: active
> Last Reviewed: 2026-10-17
> Source: `docs/backlog/cross-roadmap-remediation-roadmap.md` UR-9（Wave C，audit-remediation Follow-up Backlog D19 组 13 条）
> Related: `docs/backlog/audit-remediation-roadmap.md`（头部「D19 all fixed and verified」2026-07-28）

## Purpose

UR-9 的 13 条经 2026-10-17 独立代理逐条 live 核对：12 条已修复/随 monitor 机制删除而失效，1 条（19-16 非严格模式诊断）部分修复——本计划完成 19-16 的有界收尾（非严格编译经宿主接线的 env.reportSchemaDiagnostics 外发，无 fallback 不增噪）+ D19 13 行回写 + cross-roadmap UR-9 置 done。

## Current Baseline

（2026-10-17 独立代理逐条 live 核对，证据 file:line 见 Follow-up Backlog 行注记。）

- 12 条已修复/失效：19-02（monitor 机制整体移除，commit 5ba737830；错误走 ActionResult + reportRuntimeHostIssue + onActionError）、19-05/07/08/10/11/12/13/14/15/18/20（各自 file:line 见 Backlog 注记）。
- 19-16 部分修复：严格/非严格两分支诊断已 `enabled:true`，但 reporter 仅严格分支接入（`schema-renderer.tsx:77-90`）——非严格只进 legacy envelope 不外发；嵌套编译（`render-nodes.tsx:168-182`）同型。

## Goals

- D19 13 行 Backlog 回写（12 条已修复核验注记 + 19-16 部分修复就地注记）；cross-roadmap UR-9 置 done。
- 19-16 完整收尾经执行期实验**裁定不可有界达成**（见 Deferred But Adjudicated）：非 strict 诊断静默是编译语义设计（`diagnostics.enabled` 在 flux-compiler 联动 `throwIfSchemaDiagnostics`——启用即改变非 strict 编译行为，error 级诊断直接 throw），登记 successor。

## Goals 修订记录（执行期）

- 原 Goals 第一条（19-16 非严格外发收尾）在实现后经判别实验推翻：passthrough 实现使 3 个 flux-renderers-data 既有测试红（stash 对照绿）——legacy schema 的 `$slot` 用法在诊断启用下从静默容忍变为 compile throw。回退实现，改判 Deferred。

## Non-Goals

- 非 strict 模式的 fallback reporter（会向未接线宿主引入 console 噪声——有意不加）。
- 其余 UR 条目。

## Scope

### In Scope

- `packages/flux-react/src/schema-renderer.tsx` + `render-nodes.tsx`（非严格 reporter passthrough）。
- `packages/flux-react/src/__tests__/render-diagnostics-fail-fast.test.tsx`（判别测试）。
- Backlog 13 行回写 + cross-roadmap UR-9 行 + daily log。

### Out Of Scope

- 严格模式行为变更；diagnostics envelope 结构变更。

## Failure Paths

| 编号          | 触发                                 | 行为                                                        | 可重试 | 用户可见表现 |
| ------------- | ------------------------------------ | ----------------------------------------------------------- | ------ | ------------ |
| noise-regress | 非 strict 接线后宿主测试出现诊断噪声 | 仅宿主显式接线才外发（无 fallback）；既有测试无接线则零变化 | 是     | 无           |

## Test Strategy

档位选择：**必须自动化**（19-16 行为变更）——判别测试 = 宿主接线 env.reportSchemaDiagnostics 的非 strict 渲染必须外发诊断（旧实现必挂，stash 实测）+ 未接线宿主保持静默。

## Execution Plan

### Phase 1 - 19-16 收尾尝试（实现 → 判别实验 → 改判回退）

Status: completed
Targets: schema-renderer.tsx、render-nodes.tsx（实现已回退）、render-diagnostics-fail-fast.test.tsx（探针测试已移除）

- Item Types: `Decision | Proof`

- [x] 实现（后被回退）：非严格两编译位点宿主接线 reporter passthrough + 判别测试 ×2（stash 红态实测旧实现 1 failed、新实现 flux-react 621/621 绿）。
- [x] Proof（判别实验推翻实现）：flux-renderers-data 3 个既有测试红（stash 对照绿）——legacy schema `$slot` 用法在诊断启用下经 `throwIfSchemaDiagnosticsFailed`（`schema-compiler.ts:60`）从静默容忍变为 compile throw——红测试：data-table.test.tsx「renders row-scope actions that open dialogs with row data」/ table-dialog-scope-inheritance.test.tsx「dialog body can access row-scoped $slot.record fields」/ index.test.tsx 另一条（名未留存，复现方法 = 本 Phase 实验）；**非 strict 静默是语义设计**（`diagnostics.enabled` 联动 throw 行为），非纯噪声选择。
- [x] Decision：回退实现（git checkout 两文件 + 移除探针测试），19-16 完整收尾改判 Deferred → flux-compiler 域 successor（需将 diagnostics reporter 与 enabled/throw 门控解耦——Protected Area，plan-first）。

Exit Criteria:

- [x] 回退后 flux-react 619/619 + flux-renderers-data 1235/1235 全绿（恢复基线）；改判与 successor 归属落 Deferred But Adjudicated 节。

### Phase 2 - 回写

Status: completed
Targets: audit-remediation Backlog、cross-roadmap、daily log

- Item Types: `Proof`

- [x] D19 13 行逐行注记（12 已修复核验 + 19-16 部分修复注记——收尾 successor 归 flux-compiler 域）；cross-roadmap UR-9 置 done + Plan 列；daily log。

Exit Criteria:

- [x] 回写三面一致。

## Draft Review Record

- Reviewer / Agent: 核对证据来自独立 Explore 代理逐条 live 核对（2026-10-17，13 条结论 + audit-remediation roadmap 头部「D19 all fixed」互证）；本 plan 实质 delta 仅 19-16 一处有界行为变更（带判别测试）。回写部分同 635 口径；19-16 实修部分经 closure audit 独立核验。
- Verdict: 豁免（回写 + 单点有界实修；closure audit 独立执行）
- Rounds: —
- Findings addressed: —

## Closure Gates

- [ ] 19-16 收尾落地（两编译位点 + 判别测试红绿实测）
- [ ] D19 13 行回写 + cross-roadmap UR-9 + daily log 三面一致
- [ ] flux-react focused typecheck/test 绿、lint 绿；全量门禁无非既有红
- [ ] 不存在被静默降级的 in-scope 项
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 19-16 非严格诊断外发完整收尾

- Classification: `out-of-scope improvement`（需求成立但越出本 plan 的有界修复面）
- Why Not Blocking Closure: 执行期判别实验证实——非 strict 的诊断静默是编译语义设计（`diagnostics.enabled=true` 联动 `throwIfSchemaDiagnostics`，error 诊断即 throw；`schema-compiler.ts:60`），passthrough 实现打破 legacy schema 的静默容忍（3 个 flux-renderers-data 既有测试 stash 对照绿→红）。完整收尾需 flux-compiler 将 diagnostics reporter 与 enabled/throw 门控解耦（新增 report-only 通道）——flux-compiler 属 Protected Area（plan-first + owner doc），非本 plan 可承接。
- Successor Required: `yes`
- Successor Path: flux-compiler 域 successor plan（report-only diagnostics 通道：将 reporter 与 enabled/throw 门控解耦；Protected Area，plan-first）；D19 19-16 行回写已如实注记「部分修复 + successor」。

## Non-Blocking Follow-ups

- `flux-core/src/types/actions.ts:418` 悬空类型 `ActionMonitorPayload`（19-02 残留，无消费者）——清理属 flux-core Protected Area（plan-first），登记 successor 候选。

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待填
- Evidence: 待填

Follow-up:

- 见 Non-Blocking Follow-ups。
