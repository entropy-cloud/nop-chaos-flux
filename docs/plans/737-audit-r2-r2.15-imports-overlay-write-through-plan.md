# 737 审计修复 R2·R2.15：imports overlay 写透传+通知链（P1-MA4.1-007 缺陷本体 bug163）

> Plan Status: completed（2026-10-31 批量收口：R2.15 行范围〔bug163 修复 + 复现钉〕复核确认落地——但 bonus 的 valuesPath"同解转绿"声称被独立复核实证证伪并撤回〔空转守卫，缺陷仍 live〕，见 Deferred；文本勘误随本翻转落）
> Last Reviewed: 2026-10-31
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R2.15（plan 724 追加行，MR2.0 追加授权）；`docs/bugs/163-import-overlay-captures-schema-event-setValue-writes.md`（缺陷报告+修复方向：overlay update 父委托 + 通知链根因）；owner doc `docs/architecture/renderer-runtime.md`
> Related: R2.2（import-overlay-write-capture.test.tsx 现状钉随行改钉正确语义——已落地）；R2.14（valuesPath 集成复现——同根 child scope 写隔离，本行修复同解）
> 编号 runway：736 为 R2.14（本线）；737 本 plan；ARC 线从 738 起避开

## Purpose

bug163 缺陷本体修复：`createChildScope` 增 `delegateWrites` opt-in 钩子——imports overlay scope 的 `update()` 委托给 parent scope，使 schema-event setValue 穿透 overlay 到达宿主 scope。修复面经 M1 勘正收窄为 **imports overlay 限定**（`delegateWrites: true` 仅由 node-renderer.tsx imports overlay 传入），dialogs/drawers 保留写隔离（isolate/无 delegateWrites 的 child scope 行为不变——M1 勘正依据：盲委托破坏 dialog/drawer 隔离导致 8 用例红）。R2.2 的现状钉随行改钉正确语义 + R2.14 的 valuesPath 集成复现测试**由本行修复同解**（child scope 写隔离是 valuesPath 初始发布丢失的共根）。finding 回填 `closed`。

## Current Baseline（2026-10-24 live，HEAD `853846919` 实测）

- **缺陷本体**：`runtime-factory.ts createChildScope` 不传 `update` → `createScopeRef` fallback 写 ownStore → overlay 捕获写不透传。node-renderer.tsx:195-198 创建 imports overlay 无写委托。
- **R2.2 现状钉**：import-overlay-write-capture.test.tsx case B 钉缺陷-open 行为（write 被捕获、宿主 scope 不变）——随行改钉正确语义。
- **R2.14 valuesPath 集成复现**：values-path-integration.test.tsx `it.skip`（`ui.textCron` 回显 `__UNPUBLISHED__`）——同根 child scope 写隔离，本行修复后 test.fixme/skip 移除转绿。
- **盲委托破坏面**（R2.15 执行期发现）：盲 delegation（所有 createChildScope 委托）导致 runtime-dialogs-scope ×4 + runtime-sources-dedup ×1 + surface-lifecycle-hooks ×1 + schema-renderer/data-source-and-node-identity ×2 等 8+ 用例红——dialogs/drawers 需要 write isolation。
- roadmap R2.15 行 `todo`（:112）；arm2-index :138（007）状态 `closed`（R2.2 守测试面已收——本行修复后 007 的修复注记随行更新）。

## Goals

- `createChildScope` 增 `delegateWrites` opt-in + `CreateScopeOptions` 类型扩展 + node-renderer.tsx imports overlay 传 `delegateWrites: true`。
- R2.2 现状钉改钉正确语义（overlay 写透传到宿主 scope）+ R2.14 valuesPath test.fixme/skip 移除转绿。
- finding 回填 `closed`；roadmap R2.15 翻转。

## Non-Goals

- 盲委托所有 child scopes（破坏 dialogs/drawers 写隔离——M1 勘正）；通知链第 2 层根因调查（除非测试暴露）；并发线隔离。

## Scope（必填节）

### In Scope

- `packages/flux-core/src/types/scope.ts`（CreateScopeOptions +delegateWrites）
- `packages/flux-runtime/src/runtime-factory.ts`（createChildScope 条件 update 委托）
- `packages/flux-runtime/src/runtime-host-projection-scope.ts`（类型同步）
- `packages/flux-react/src/node-renderer.tsx`（imports overlay 传 delegateWrites: true）
- `packages/flux-react/src/__tests__/import-overlay-write-capture.test.tsx`（改钉正确语义）
- `packages/flux-react/src/__tests__/values-path-integration.test.tsx`（移除 skip 转绿）
- `docs/audits/arm2-index.md` 回填 + daily log + roadmap R2.15 翻转（激活/收口两提交）

### Out Of Scope

- 盲委托全部 child scopes；通知链第 2 层根因（除非测试暴露）；并发线隔离。

## Failure Paths

| 可测场景编号         | 触发                                                       | 行为                                                                    | 可重试 | 用户可见表现 |
| -------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- | ------ | ------------ |
| isolation-regression | 委托导致 dialogs/drawers 隔离破坏（既有用例红）            | 确认 delegateWrites 仅 imports overlay 传入（非盲委托）；仍红则回退升级 | 是     | 不适用       |
| scope-cascade        | overlay 级联（imports 内再 imports）写穿透到根而非最近宿主 | parent.update 逐层委托=正确级联（每层 overlay → 最近 hosting scope）    | 否     | 不适用       |

## Test Strategy

本档选择：**必须自动化**——红证 M-A = 还原 node-renderer.tsx `delegateWrites: true`（imports overlay 回退到写隔离）→ overlay-write-capture **imports 用例**红——写穿透失效（2026-10-31 批量复核勘误：原文"控制组（无 imports）红"方向反置，还原 delegateWrites 受影响的是 imports 用例）。判别机制（Rule 13）：删委托钩子=bug163 缺陷本体复活。

## Execution Plan

### Phase 1 - 修复与测试改钉

Status: planned
Targets: 四实现文件 + 两测试文件

- Item Types: `Fix | Proof`

- [ ] T1（修复）：CreateScopeOptions +delegateWrites / createChildScope 条件 update 委托 / node-renderer.tsx imports overlay 传 delegateWrites: true。
- [ ] T2（改钉）：import-overlay-write-capture.test.tsx 改钉正确语义（imports 组（case B）——写穿透到宿主 scope + 'fired' 出现）；values-path-integration.test.tsx 移除 skip 转绿。
- [ ] T3（回归）：flux-react + flux-runtime + flux-renderers-form 全绿（dialogs/drawers isolation 面不破——盲委托反例 M1 的验证面）。

Exit Criteria:

- [x] 三包套件全绿 + M-A 红证留痕（实现 diff = 四文件修复面；2026-10-31 复核：M-A 方向勘误——还原 delegateWrites 使 **imports 用例**红〔非无 imports 控制组〕，原文标签反置已就地勘误）

### Phase 2 - 索引回填与收口

Status: planned
Targets: arm2-index、roadmap、daily log

- Item Types: `Proof`

- [ ] arm2-index :171（P1-MA4.5-006）partial-convergence 注记更新（valuesPath 同解——R2.15 修复激活 fixme 棘轮转绿）；:138（007）修复注记更新；Last Updated 滚动
- [ ] roadmap R2.15 `planned`→`done` 翻转（IN closure commit；激活提交先行 `todo`→`planned`）

Exit Criteria:

- [ ] arm2-index 状态与注记实测一致；roadmap R2.15 行 `done`（收口提交内）
- [ ] daily log R2.15 条目在场

## Concurrent Exclusions（review R1 m3）

- docs/index.md、docs/plans/2026-10-22-0500-\*、docs/backlog/platform-hardening-roadmap.md 不入 R2.15 提交。

## Closure Gates

- [x] 全量门禁：typecheck / build / lint + test（Tasks: 实测计）
- [x] `pnpm check` 零新增红
- [x] M-A 红证复员（修复保留为唯一实现 diff）
- [x] 独立 closure audit（fresh sub-agent）：finding 闭环判定、修复面最小性（imports overlay 限定非盲委托）、回归面完整性
- [x] 收口提交（flip `done` IN commit；记录复核结论）

## Deferred But Adjudicated

### valuesPath"同解转绿"声称撤回（P1-MA4.5-006 本体仍 live）

- Classification: `watch-only residual`
- Why Not Blocking Closure: R2.15 行范围（bug163 delegateWrites 修复 + 复现钉 2/2 绿）经复核确认真实落地且判别有效；"同解转绿"系行范围之外的 bonus 声称——2026-10-31 独立复核实证其守卫空转（`waitFor(...).catch(()=>{})` 吞断言且未返回）并以 assertion-biting 变体实跑证伪（HEAD 仍 echo `__UNPUBLISHED__`，探针 `_tmp/values-path-2026-10-31/`）；诚实棘轮已恢复（values-path-integration.test.tsx it.skip + RATCHET HISTORY 注记）。本体缺陷 successor 归属 R3.x/MV 不变。
- Successor Required: `yes`
- Successor Path: audit-remediation-r2 roadmap R3.x/MV（valuesPath 发布接线修复；与 plan 736 Deferred 同源）

- **通知链第 2 层根因**（bug163 诊断第 2 层——诊断/不提交语义正常）：修复后测试未暴露第 2 层问题。Classification: watch-only residual。Why Not Blocking Closure: 修复面测试全绿。Successor Required: 否。
- **盲委托反例**（dialogs/drawers 写隔离）：execution期 M1 发现并勘正为 imports-overlay-限定。Classification: watch-only residual。Why Not Blocking Closure: 隔离面已保。Successor Required: 否。
- **merge/replace 委托缺口**：scope.ts merge() 和 replace() 仍写 overlay ownStore（无 delegateWrites 委托路径）；bug163 修复方向提及 "update/merge" 但 pinned 症状仅 update 路径。Classification: watch-only residual。Why Not Blocking Closure: pinned 症状（setValue→update）已修，merge/replace 场景无测试覆盖也无已知缺陷。Successor Required: 否（留 watch）。

## Draft Review Record

- R1 共识 PASS（agent_079bc6b1，见 Closure 节既有记录；2026-10-31 批量复核勘误：此处"待 R1"系陈旧占位）。

## Non-Blocking Follow-ups

- merge/replace 仍写 overlay ownStore（无 delegateWrites hook——scope.ts merge/replace 无 input.update 委托路径）；bug163 修复方向提及 update/merge 但 pinned 症状（setValue）仅走 update 路径。merge/replace 委托留 watch。

## Closure

Status Note: R2.15 行范围收口（closure commit 6bb1bf6e6：bug163 delegateWrites 修复三文件 + imports overlay opt-in + import-overlay-write-capture 2/2 绿实断言钉；roadmap R2.15 done）。plan 文件翻转系历史遗漏（10-27 plan 状态机修复已登记此批滞留）。2026-10-31 批量复核：修复面 live 验证（scope.ts:62 / runtime-factory.ts:348 / node-renderer.tsx:200）+ 发现并撤回 valuesPath bonus 声称（Blocker 修复：棘轮恢复 + Deferred 登记 + arm2-index/roadmap 勘误）。

Closure Audit Evidence:

- Auditor / Agent: R1 agent_079bc6b1（PASS，见 Closure 节既有记录）+ agent_572dc2be（2026-10-31 批量复核：第一轮 **issues**〔1 Blocker：valuesPath 同解转绿声称证伪〕→ 本轮回写修复 → 按其 minimal honest path 翻转）
- Evidence: 6bb1bf6e6 + 6cd1e6046（skip 移除——被本轮勘误）+ 探针 \_tmp/values-path-2026-10-31/ + arm2-index :138/:171 勘误
