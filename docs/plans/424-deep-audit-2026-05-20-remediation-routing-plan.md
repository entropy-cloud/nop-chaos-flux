# 424 Deep Audit 2026-05-20 Remediation Routing Plan

> Plan Status: completed
> Last Reviewed: 2026-05-21
> Source: `docs/analysis/2026-05-20-deep-audit-full/summary.md`, reviewed dimension files under `docs/analysis/2026-05-20-deep-audit-full/`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`, `docs/plans/416-open-ended-adversarial-review-2026-05-20-remediation-routing-plan.md`

## Purpose

把 `docs/analysis/2026-05-20-deep-audit-full/` 独立复核后仍保留的 `163` 条 retained findings 收敛成一份诚实、可执行、不过度碎片化的 remediation routing baseline。

这份计划不假装直接修完全部代码。它负责四件事：

- 冻结 `163` 条 retained findings 的唯一当前基线。
- 将这些 findings 收敛到尽可能少、但仍诚实的 execution buckets。
- 为每个 bucket 指定且只指定一个 successor execution owner path。
- 在 successor queue 冻结后，经过独立 fresh-session reviewer 复核，确认不存在 ownerless、multiply-owned、或静默降级的 retained finding。

## Current Baseline

- `docs/analysis/2026-05-20-deep-audit-full/summary.md` 当前统计为：总发现 `170`，复核后保留 `163`，其中降级保留 `6`，驳回 `7`，零发现维度 `01`。
- retained findings 横跨多个不共享 closure criteria 的结果面。把全部 `163` 条塞进一个 implementation umbrella plan 不诚实；但把它们继续拆成大量 successor micro-plan 同样不符合当前“尽量放到单一 plan 中”的约束。
- 当前最危险的问题簇仍是维度 `19` 的 runtime error fidelity；其次是 host/action 动态边界类型收窄、active docs routing 漂移、以及 supported-proof truthfulness。
- `docs/plans/420-deep-audit-2026-05-21-error-propagation-fidelity-closure-plan.md` 曾是误建的过窄 draft，且与已存在的 `docs/plans/420-open-ended-adversarial-review-2026-05-20-report-designer-e2e-truthfulness-plan.md` 发生真实编号冲突；该 draft 现已改名为正确 successor `docs/plans/425-deep-audit-2026-05-21-runtime-error-propagation-fidelity-plan.md`，不再保留冲突文件名。
- 已知重复项仍按 summary 结论处理：`16-14` 与 `17-06` 只按 `16-14` 计入 retained baseline，`17-06` 不再重复进入 routing matrix。
- 按当前约束重审后，本轮 retained set 先收口为 `3` 个 successor plans：一个专门处理 runtime error fidelity，一个处理其余 code/contract closure，一个处理 truthfulness/docs/naming/debugger baseline。更细的 owner surface 区分保留在 successor plan 内部的 workstreams，而不是继续扩散成更多 plan 文件。

## Goals

- 为全部 `163` 条 retained finding 建立一对一 remediation routing baseline。
- 把 successor queue 控制在尽可能少的 bucket 数，同时保持单一 owner surface 和单一 closure surface 的诚实性。
- 明确每个 bucket 的 priority、owner-doc obligations、以及 successor execution owner path。
- 在当前 turn 内消除错误编号 `420` 的冲突，并完成独立 routing review。

## Non-Goals

- 不在本计划内直接落地任何代码修复、测试修复、或 owner-doc 改写本身。
- 不新增 2026-05-20 之后的新 deep-audit finding。
- 不机械回写已 `completed` 的历史计划正文，除非当前 routing baseline 明确需要指出相邻计划边界。
- 不把 confirmed retained finding 静默降级成 vague residual、follow-up、或“后面再看”。

## Scope

### In Scope

- `docs/analysis/2026-05-20-deep-audit-full/summary.md`
- reviewed dimension files under `docs/analysis/2026-05-20-deep-audit-full/`
- 本批 retained findings 的 bucket、priority、owner-doc obligations、以及 successor paths
- `docs/plans/424-deep-audit-2026-05-20-remediation-routing-plan.md`
- successor queue: `docs/plans/425-*.md` through `docs/plans/427-*.md`
- `docs/logs/2026/05-21.md`

### Out Of Scope

- 任何直接代码修复、测试修复、或架构文档内容改写本身
- 新一轮 deep audit 或对 rejected findings 的重新裁定
- 与本批 retained set 无关的 backlog、UX 审计、或 open-ended 审计 residual

## Priority Policy

- `P0`: live correctness、runtime truthfulness、or supported-proof gap，会直接破坏当前可信基线；不得降级成 vague follow-up。
- `P1`: confirmed contract drift、owner drift、or author-facing/live-surface mismatch；必须进入明确 successor owner。
- `P2`: confirmed defect，但不阻塞当前最高优先级问题收敛；仍需明确 successor owner。
- `P3`: 已保留但可以排在更高优先级之后执行的 residual；只能降低调度顺序，不能降低 owner 义务。

## Remediation Buckets

| Bucket | Theme                                                     | Count       | Priority | Owner-Doc Obligations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Planned Successor Path                                                                      |
| ------ | --------------------------------------------------------- | ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| A      | Runtime error propagation fidelity                        | 19 findings | `P0`     | `docs/architecture/action-scope-and-imports.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/api-data-source.md`, `docs/architecture/form-validation.md`, `docs/architecture/value-adaptation-and-detail-field.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `docs/plans/425-deep-audit-2026-05-21-runtime-error-propagation-fidelity-plan.md`           |
| B      | Consolidated code and contract closure                    | 99 findings | `P1`     | `docs/architecture/renderer-runtime.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/form-validation.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/api.md`, `docs/architecture/flow-designer/runtime-snapshot.md`, `docs/architecture/flow-designer/tree-mode.md`, `docs/architecture/flow-designer/config-schema.md`, `docs/architecture/report-designer/design.md`, `docs/architecture/report-designer/contracts.md`, `docs/architecture/word-editor/design.md`, `docs/architecture/capability-projection-manifest.md`, `docs/architecture/capability-contract-model.md`, `docs/architecture/styling-system.md`, `docs/components/designer-page/design.md`, `docs/components/report-designer-page/design.md`, `docs/components/spreadsheet-page/design.md`, `docs/components/word-editor-page/design.md`, `docs/components/table/design.md`, `docs/components/crud/design.md`, `docs/components/input-tree/design.md`, `docs/components/tree-select/design.md`, `docs/components/code-editor/design.md` | `docs/plans/426-deep-audit-2026-05-21-consolidated-code-and-contract-closure-plan.md`       |
| C      | Truthfulness, docs routing, naming, and debugger baseline | 45 findings | `P0/P2`  | `AGENTS.md`, `docs/index.md`, `docs/testing/e2e-standards.md`, `docs/references/audit-tooling.md`, `docs/references/maintenance-checklist.md`, `docs/references/terminology.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/performance-diagnostics-and-e2e-design.md`, `docs/architecture/performance-design-requirements.md`, `docs/architecture/static-analysis.md`, affected plan files, affected live examples                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `docs/plans/427-deep-audit-2026-05-21-truthfulness-doc-routing-and-naming-baseline-plan.md` |

## Coverage Matrix

| Bucket | Exact Retained IDs                                                                                                                                                                                                                                                                                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | `19-01` through `19-19`                                                                                                                                                                                                                                                                                                                                                                     |
| B      | `02-01` through `02-03`, `03-01`, `03-02`, `03-04` through `03-16`, `03-18`, `04-01` through `04-12`, `05-01` through `05-03`, `06-01`, `06-03`, `07-01` through `07-11`, `08-01` through `08-09`, `09-01` through `09-08`, `10-01` through `10-05`, `11-01`, `12-01`, `12-02`, `12-04`, `13-01` through `13-06`, `15-01` through `15-08`, `18-01` through `18-07`, `20-01` through `20-05` |
| C      | `11-02` through `11-04`, `14-01` through `14-14`, `16-01` through `16-14`, `17-01` through `17-05`, `17-07` through `17-14`, `18-08`                                                                                                                                                                                                                                                        |

## Adjacency Notes

- Bucket A inherits the real surface from the old narrow draft, but not its wrong filename or over-narrow role. The corrected successor owner is Plan `425`.
- Bucket B intentionally collapses the previously over-split code-facing buckets into one successor plan. Internal owner differences are handled as workstreams inside Plan `426`, not as extra plan files.
- Bucket C intentionally groups verification truthfulness, active docs routing, naming convergence, and debugger baseline drift into one successor plan because they all change the supported/trusted baseline rather than product runtime semantics.
- Active Plan `423` overlaps a few files that now sit in Bucket B, but it is a UX remediation plan with different closure criteria. It must not silently absorb deep-audit retained findings.
- Known duplicate adjudication remains unchanged: `16-14` owns the report-designer selection/target alias drift, while `17-06` stays rejected as duplicate.

## Execution Plan

### Phase 1 - Freeze The 163-Finding Routing Baseline

Status: completed
Targets: `docs/analysis/2026-05-20-deep-audit-full/summary.md`, reviewed dimension files, this plan

- Item Types: `Decision | Proof`

- [x] Re-audit every retained ID against the reviewed dimension files and confirm the total remains `163`.
- [x] Freeze the `3`-plan split, priority assignments, owner-doc obligations, and successor paths in one canonical matrix.
- [x] Confirm the erroneous narrow `420` draft is no longer the active routing baseline.

Exit Criteria:

- [x] Every retained finding from the source summary appears exactly once in this plan's coverage matrix.
- [x] The `163 retained` aggregate is textually consistent across the source summary and this plan.
- [x] No finding is ownerless, multiply-owned, or routed with unresolved `or` / `pending` language.
- [x] The wrong `420` draft no longer remains as a conflicting live successor path.
- [x] No owner-doc update required.
- [x] `docs/logs/2026/05-21.md` is updated.

### Phase 2 - Create The Successor Queue

Status: completed
Targets: `docs/plans/425-*.md` through `docs/plans/427-*.md`, this plan

- Item Types: `Decision | Proof`

- [x] Create one successor execution owner plan for each bucket A-C.
- [x] Ensure each successor plan names exact finding IDs, explicit Non-Goals, and explicit owner-doc obligations.
- [x] Keep the queue at `3` plans; handle narrower owner surfaces as internal workstreams unless live execution later proves a real successor split is required.

Exit Criteria:

- [x] Buckets A-C each have exactly one successor execution owner path under `docs/plans/`.
- [x] No successor plan mixes incompatible result surfaces just to reduce file count.
- [x] Every successor plan is guide-compliant and at least `planned`.
- [x] No owner-doc update required.
- [x] `docs/logs/2026/05-21.md` is updated.

### Phase 3 - Independent Routing Review Until Convergence

Status: completed
Targets: this plan, successor queue `425`-`427`, `docs/logs/2026/05-21.md`

- Item Types: `Proof | Decision`

- [x] Run a fresh independent reviewer against the source analysis, this plan, and the full successor queue.
- [x] Fix any missing owner, duplicated ownership, dishonest downgrade, or numbering conflict the reviewer finds.
- [x] Repeat independent review until a fresh reviewer returns no material routing findings.

Exit Criteria:

- [x] Independent routing review confirms the `163`-finding baseline is one-to-one and owner-complete.
- [x] Independent routing review confirms no in-scope `P0/P1` finding was silently downgraded or absorbed by an unrelated plan.
- [x] Independent routing review confirms Plan `424` and successor Plans `425`-`427` are textually consistent.
- [x] No owner-doc update required.
- [x] `docs/logs/2026/05-21.md` records the reviewer verdict.

## Closure Gates

> This is a docs-only routing plan. It closes only after the retained-finding baseline, successor queue, and independent routing review are fully synchronized. It does not claim code-execution closure.

- [x] All `163` retained findings have exactly one current bucket and one explicit successor path.
- [x] All `P0` and `P1` findings are routed to explicit successor execution plans.
- [x] No retained finding is silently downgraded to deferred or vague follow-up.
- [x] Every referenced successor plan exists and is at least `planned` with guide-compliant scope.
- [x] The erroneous `420` conflict is resolved without leaving a second live `420` plan file behind.
- [x] This docs-only routing plan requires no owner-doc update for itself; owner-doc obligations are frozen into successor plans.
- [x] Independent subagent routing audit is completed and recorded.

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- If later execution proves one bucket still contains multiple incompatible closure surfaces, split that bucket through an explicit successor plan instead of widening another active plan in place.

## Closure

Status Note: Routing baseline, successor queue, and final fresh-review convergence are now synchronized; this docs-only routing plan closes without claiming any additional code-execution work.

Closure Audit Evidence:

- Reviewer / Agent: fresh independent routing closure audit on 2026-05-21 (`ses_1b5ff4e6cffeZYjZqX1KoVXVh3` initial fail for successor text-sync drift, then final pass after Plan `425` closure sync)
- Evidence: the independent audit re-checked `docs/analysis/2026-05-20-deep-audit-full/summary.md`, this routing plan, and successor Plans `425`-`427`; it confirmed the `163 = 19 + 99 + 45` retained findings remain one-to-one routed with no ownerless, duplicate, or silently downgraded `P0/P1` item, and the earlier narrow `420` filename conflict remains resolved.

Follow-up:

- 无剩余 routing-plan-owned work；后续执行收口由 successor Plans `425`-`427` 各自负责。
