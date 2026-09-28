# 2026-09-29-7 pre-existing e2e 失败修复与裁定

> Plan Status: active
> Last Reviewed: 2026-09-29
> Source: `docs/logs/2026/09-28.md`（Plan 2026-09-28-5 e2e 裁定节：clean-HEAD bisect 证实与本批次无关，交后续 owner）；现状核对见 `docs/analysis/2026-09-29-perf-ux-round2-deep-optimization-analysis.md` 第四节
> Related: 2026-09-28-5（移交来源）

## Purpose

认领 2026-09-28 批次在 clean master HEAD（b53d2eeca）复现并移交的 pre-existing e2e 失败（合计 14 个用例 / 9 spec）：逐 spec 复跑 → 分类（产品缺陷 Fix / 测试过时 Fix / 环境-flaky 裁定）→ 修复或裁定 → 全量 e2e 复核。结果面 = 移交清单归零：每项落到 guide 定义的四类合法终态之一——`landed (fixed)`、`adjudicated (watch-only + 理由)`、`moved to explicit successor ownership`（深产品缺陷单独立 successor plan，如 VirtualBody 先例）、`removed from scope through a recorded scope change`（记录式 scope 变更）——不允许静默遗留。

## Current Baseline

- 移交清单（docs/logs/2026/09-28.md）：table-popover×3、stripe-replica-visual×2、table-column-width-layout×2、table-density×1、gantt-bars-and-links×1、layout-family×1、word-editor-template-expr×1、crud-list-mode×2、c6-2-host-surfaces×1（计数为失败用例数，非整 spec；合计 14）。**计数 observed @ b53d2eeca**；其后 4 个产品提交（6bbece7d2/7a366358f/cd848bee9/23ee9a323）领域与部分失败 spec 重叠，复跑计数可能合法变化——以复跑为准。
- 9 个 spec 文件全部在位（路径核对于 2026-09-29，spec 文件在 b53d2eeca 后零提交）；无任何 plan 认领（09-28-5/6 显式移交）。
- 既有 watch-only 终态清单为 **gantt-perf×2 + kanban-perf×1**（docs/logs/2026/08-09.md，主屏 50Hz rAF 环境上限）——与本清单不同族，不重开。
- e2e 基线（2026-08-09 DV）：1086 passed / 43 skipped / 3 failed（gantt-perf watch-only 族）——本清单为其后新增的回归。
- 诊断指南：`docs/references/e2e-test-diagnostic-guide.md`。

## Goals

- 9 spec 逐个复跑并分类；每个失败用例落到 `landed (fixed)` 或 `adjudicated (watch-only + 理由)`。
- 产品缺陷引发的失败按 Bug Fix Test Coverage Rule 处理（根因、回归测试、必要时 docs/bugs/ 记录）。
- 测试过时/断言漂移引发的失败修正断言或测试本体。
- 环境/flaky 失败给出稳定化或 watch-only 登记（含复现条件）。

## Non-Goals

- gantt-perf ×3 watch-only 终态清单重开（60Hz 环境依赖，既有裁定延续）。
- e2e 基础设施重构、playwright 配置变更。
- 非移交清单内的 e2e 新增覆盖。

## Scope

### In Scope

- `tests/e2e/table-popover.spec.ts`、`stripe-replica-visual.spec.ts`、`table-column-width-layout.spec.ts`、`table-density.spec.ts`、`gantt-bars-and-links.spec.ts`、`layout-family-enhancements.spec.ts`、`word-editor-template-expr.spec.ts`
- `tests/e2e/component-lab/crud-list-mode.spec.ts`、`component-lab/c6-2-host-surfaces.spec.ts`
- 上述失败对应的产品/测试修复（包不限于 table/data/basic/gantt/word-editor/crud 等，按根因落点）

### Out Of Scope

- 新 feature;watch-only 清单（gantt-perf）以外的新 e2e 战略。

## Failure Paths

> 本 plan 的对象即失败路径本身；执行期每个用例分类记录于 `## Execution Plan` 的裁定表。

| 可测场景编号 | 触发 | 行为 | 可重试 | 用户可见表现 |
| --- | --- | --- | --- | --- |
| per-spec triage | 逐 spec 复跑 | 每用例分类 Fix/Adjudicate，记录失败签名与根因 | 是 | 无 |
| fix-regression | 产品缺陷修复 | 既有用例转绿 + 根因注记；如属非平凡 bug 按 Bug Fix Rule 评估 docs/bugs/ | 是 | 对应产品行为修复 |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——本 plan 的 Proof 即 e2e 用例本身转绿；产品面修复附单元/组件级回归测试（Bug Fix Rule）。

## Execution Plan

### Phase 1 - 全量复跑与逐用例分类

Status: planned
Targets: `tests/e2e/`（9 spec）

- Item Types: `Proof`、`Decision`

- [ ] `pnpm test:e2e` 全量复跑（或按 spec 分组复跑），记录每用例 pass/fail 现状
- [ ] 逐失败用例分类：产品缺陷 / 测试过时 / 环境-flaky；失败签名（截图/console/network）归档 `_tmp/e2e-remediation-20260929/`
- [ ] 分类表落 plan（下表），每项标 Fix / Adjudicate

Exit Criteria:

- [ ] 9 spec 复跑结果与分类表完整（每用例一行：现状/分类/根因假设/处置）

### Phase 2 - 逐项修复与裁定

Status: planned
Targets: 按分类落点（产品包 + 测试文件）

- Item Types: `Fix`、`Decision`、`Proof`

- [ ] 产品缺陷项：根因定位 → 修复 → 回归测试（必要 docs/bugs/ 记录）。**深产品缺陷出口**：如根因定位后确认属多日级产品修复（如 gantt CPM/layout 引擎、word-editor tiptap 表达式管线级），按 guide Anti-Slacking Rule 走 `moved to explicit successor ownership`——立 successor plan（含证据链，VirtualBody 2026-09-28-7 先例）并在分类表标注，**不得**留在 follow-up 或伪装 watch-only
- [ ] 测试过时项：断言/选择器修正，保持测试意图不变
- [ ] flaky 项：稳定化（等待策略/隔离）或 watch-only 裁定（复现条件 + 理由）；如失败项与其它在途 plan 结果面重叠，可走 `removed from scope through a recorded scope change`（记录归属）
- [ ] 逐项复跑转绿或完成四类终态裁定之一

Exit Criteria:

- [ ] 移交清单每项落到四类合法终态之一：landed / adjudicated watch-only / successor ownership / recorded scope change（分类表更新）
- [ ] 无静默遗留：所有非绿项均有对应裁定记录与理由

### Phase 3 - 全量复核

Status: planned
Targets: `pnpm test:e2e` 全量

- Item Types: `Proof`

- [ ] 全量 e2e 复跑：本清单相关用例全绿（或仅剩已裁定 watch-only）
- [ ] 与既有 watch-only 终态清单（gantt-perf）合并后的 e2e 终态记录进 daily log
- [ ] 产品面修复触及的包跑 focused 单测确认零回归

Exit Criteria:

- [ ] 全量 e2e 终态达标（清单归零或仅剩裁定项）
- [ ] daily log 记录终态

## 逐用例裁定表（Phase 1 填写；多失败 spec 执行期按用例展开行）

| Spec | 用例 | 现状 | 分类 | 处置 |
| --- | --- | --- | --- | --- |
| table-popover | ×3 | <<待复跑>> | <<>> | <<>> |
| stripe-replica-visual | ×2 | <<>> | <<>> | <<>> |
| table-column-width-layout | ×2 | <<>> | <<>> | <<>> |
| table-density | ×1 | <<>> | <<>> | <<>> |
| gantt-bars-and-links | ×1 | <<>> | <<>> | <<>> |
| layout-family-enhancements | ×1 | <<>> | <<>> | <<>> |
| word-editor-template-expr | ×1 | <<>> | <<>> | <<>> |
| crud-list-mode | ×2 | <<>> | <<>> | <<>> |
| c6-2-host-surfaces | ×1 | <<>> | <<>> | <<>> |

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-29）
- Verdict: `issues` → Major 1 项修订后达成共识（复核判定零 Blocker/Major）
- Rounds: 1
- Findings addressed: **Major** 深产品缺陷终态补齐——successor ownership（VirtualBody 先例路径）与 recorded scope change 两类合法终态入 Purpose/Phase 2/裁定表，防止深 bug 被迫伪装 watch-only 或无限期滞留。Minor 4 项折入：14 个用例（非"约 15"）、watch-only 族的正确构成（gantt-perf×2 + kanban-perf×1）、计数 observed @ b53d2eeca + 4 个后继产品提交的重叠注记、裁定表按用例展开的粒度说明

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复（分类为产品缺陷的项全部 landed）
- [ ] 所有 in-scope confirmed contract drifts 已收敛（如失败源于契约漂移）
- [ ] 行为/契约结果已达成（9 spec 全绿或仅剩裁定项）
- [ ] 必要 focused verification 已完成（修复项回归测试）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（watch-only 项必须附理由）
- [ ] 受影响的 owner docs 已同步到 live baseline，或明确写明 No owner-doc update required
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（Phase 1 复跑后如出现环境依赖不可修复项，在此逐条裁定）

## Non-Blocking Follow-ups

- e2e 稳定性长期治理（超时预算、并行隔离）如暴露更大问题，记 follow-up

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待独立审计>>
- Evidence: <<待填>>

Follow-up:

- <<待填或 no remaining plan-owned work>>
