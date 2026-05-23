# 350 Open-Ended Adversarial Review 2026-05-18 Priority Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-open-ended-adversarial-review-02/{round-01.md,round-02.md,round-03.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/references/reopened-design-decisions-and-audit-adjudications.md`, `docs/plans/349-open-ended-adversarial-review-2026-05-18-diagnostics-trustworthiness-plan.md`

## Purpose

把 `2026-05-18-open-ended-adversarial-review-02` 的 21 个 findings 从“分析结果”收口为一份诚实的优先级整改队列和 owner-routing baseline。

这份计划不是试图用一个宽而模糊的 umbrella execution plan 直接修完全部 21 个异质 defect surfaces；它的职责只有三件事：

- 冻结本轮 21 个 findings 的单一 live baseline。
- 为每个 finding 指定且只指定一个 remediation bucket 与优先级。
- 规定后续应拆分出的 execution owner surfaces，避免把互不相干的问题继续混装到一个 implementation plan 里。

完成态要求：21 个 findings 全部具备唯一 owner bucket、唯一 disposition、和唯一 successor execution owner path；不允许 ownerless、multiply-owned、或依赖 `Pending` / `or` / `if needed` 之类未裁定措辞的 matrix 行。

## Current Baseline

Outdated Note: the bullets below capture the pre-execution routing baseline that Plan `350` froze before successor execution moved `351`-`360` to closure. Final live status and closure evidence are recorded in the execution checklist, closure gates, and `docs/logs/2026/05-18.md`.

- `docs/analysis/2026-05-18-open-ended-adversarial-review-02/summary.md` 记录了 21 个 findings，其中 9 个 High、10 个 Medium、2 个 Low，覆盖 compiler、action-core、flux-react、flux-runtime、flow-designer、renderer contract、cross-package consistency 等多个互不相同的结果面。
- 同一份 summary 已明确这批 findings 最密集的风险主题是：lifecycle/cleanup asymmetry、schema/extension validation gaps、以及 React integration silent-misbehavior patterns。
- 当前仓库里还没有一份 active plan 明确 owning 本批 21 个 findings 中任一 result surface；已有 Plan `349` 只 owning `docs/analysis/2026-05-18-open-ended-adversarial-review-01/` 的 diagnostics trustworthiness surface，不接管本批 21 个 findings。
- 由于这 21 个 findings 横跨 runtime scope lifecycle、flow-designer data integrity、compiler/action validation、renderer styling contract、form validation、package hygiene 等多个不共享 exit criteria 的结果面，单一 code-execution plan 会违反 `docs/plans/00-plan-authoring-and-execution-guide.md` 的单-surface owner 规则。
- `docs/references/reopened-design-decisions-and-audit-adjudications.md` 中记录的 reopen boundary 主要约束 wrapped secondary actions、surface historical double-state fixes、`NodeRenderer` render-phase side effects、以及 generic dual-state re-reporting；本批 findings 里最接近的只有 styling / owner-boundary 相邻项，但目前没有证据表明这些 21 项应被机械视为旧问题重报。

## Goals

- 为这 21 个 findings 建立一份一对一 remediation matrix，避免 ownerless defects。
- 把必须优先处理的 live correctness / data-loss / lifecycle defects 收敛到少量高优先级 execution surfaces。
- 识别哪些 finding 需要 owner-doc 决策，哪些只是代码修复，哪些需要独立 performance / hygiene execution owner。
- 给后续 execution plans 一个稳定的分桶和先后顺序，避免后续再重复 broad bundling。

## Non-Goals

- 不在本计划内直接落地任何代码修复。
- 不把 `2026-05-18-open-ended-adversarial-review-01/` 的 debugger / E2E diagnostics trustworthiness findings 混入本计划。
- 不因为相邻历史计划存在，就机械回写或重开已 `completed` / `replaced` 的旧计划。
- 不扩展到本轮盲区中的 UI package、report designer、word editor、security audit、或 playground performance profiling。

## Scope

### In Scope

- `docs/analysis/2026-05-18-open-ended-adversarial-review-02/{round-01.md,round-02.md,round-03.md,summary.md}`
- 本批 21 个 findings 的 priority、bucket、successor-owner routing
- 需要新建的 successor execution owner surfaces（仅 owner path，不在本计划内执行代码）
- `docs/plans/350-open-ended-adversarial-review-2026-05-18-priority-remediation-plan.md`
- `docs/logs/2026/05-18.md`

### Out Of Scope

- 任何直接代码修复、测试修复、或 architecture doc 改写本身
- 不属于本批 21 finding matrix 的历史审查残留
- 新增 open-ended 审查轮次或新 finding discovery

## Priority Policy

- `P0`: 直接 live correctness / data loss / disposal leak / runtime crash / accidental submit 类问题；不得降级成 non-blocking follow-up。
- `P1`: contract drift、validation gap、silent wrong behavior、strict-mode/remount instability、以及已确认的 high-severity performance hotspot；默认需要 successor execution owner。
- `P2`: dependency hygiene、narrow cross-package cleanup；只有在明确写出 `Why Not Blocking Closure` 时才允许延期。

## Remediation Buckets

| Bucket | Theme                                                            | Findings               | Priority | Planned Successor Path                                                                                              |
| ------ | ---------------------------------------------------------------- | ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| A      | Runtime scope lifecycle and isolation                            | R3-1, R3-2, R3-3       | P0       | `docs/plans/351-open-ended-adversarial-review-2026-05-18-runtime-scope-lifecycle-and-isolation-plan.md`             |
| B      | Compiler determinism and cid-state ownership                     | R1-1                   | P1       | `docs/plans/360-open-ended-adversarial-review-2026-05-18-compiler-determinism-and-cid-state-ownership-plan.md`      |
| C      | Action boundary fidelity                                         | R1-2, R1-3, R2-4, R2-8 | P0/P1    | `docs/plans/352-open-ended-adversarial-review-2026-05-18-compiler-and-action-boundary-fidelity-plan.md`             |
| D      | React integration correctness and surface visibility             | R1-4, R1-5, R2-7       | P0/P1    | `docs/plans/353-open-ended-adversarial-review-2026-05-18-react-integration-and-surface-visibility-plan.md`          |
| E      | Form validation lifecycle and dependency fidelity                | R1-7, R1-8             | P0/P1    | `docs/plans/354-open-ended-adversarial-review-2026-05-18-form-validation-lifecycle-and-dependency-fidelity-plan.md` |
| F      | Flow-designer integrity and remount safety                       | R2-1, R2-2, R2-3       | P0/P1    | `docs/plans/355-open-ended-adversarial-review-2026-05-18-flow-designer-integrity-and-remount-safety-plan.md`        |
| G      | Renderer contract, button semantics, and styling-owner alignment | R2-5, R2-6             | P0/P1    | `docs/plans/356-open-ended-adversarial-review-2026-05-18-renderer-contract-and-button-safety-plan.md`               |
| H      | Compiler validation hot-path performance                         | R1-6                   | P1       | `docs/plans/357-open-ended-adversarial-review-2026-05-18-compiler-validation-hot-path-performance-plan.md`          |
| I      | Renderer helper semantic convergence                             | R3-4                   | P1       | `docs/plans/358-open-ended-adversarial-review-2026-05-18-renderer-helper-semantic-convergence-plan.md`              |
| J      | Package dependency hygiene                                       | R3-5                   | P2       | `docs/plans/359-open-ended-adversarial-review-2026-05-18-package-dependency-hygiene-plan.md`                        |

## Finding Matrix

| ID   | Finding                                                              | Bucket | Priority | Disposition                                     | Successor Path                                                                                                      |
| ---- | -------------------------------------------------------------------- | ------ | -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| R1-1 | Compiler `cidState` shared mutation breaks idempotency               | B      | P1       | New execution owner                             | `docs/plans/360-open-ended-adversarial-review-2026-05-18-compiler-determinism-and-cid-state-ownership-plan.md`      |
| R1-2 | `normalizeActionResult` missing on 2/4 runner paths                  | C      | P0       | New execution owner                             | `docs/plans/352-open-ended-adversarial-review-2026-05-18-compiler-and-action-boundary-fidelity-plan.md`             |
| R1-3 | `invocation!` latent crash in built-in actions                       | C      | P1       | New execution owner                             | `docs/plans/352-open-ended-adversarial-review-2026-05-18-compiler-and-action-boundary-fidelity-plan.md`             |
| R1-4 | Container registry holds stale DOM ref                               | D      | P0       | New execution owner                             | `docs/plans/353-open-ended-adversarial-review-2026-05-18-react-integration-and-surface-visibility-plan.md`          |
| R1-5 | `useSurfaceScopeSnapshot` discards selected value                    | D      | P1       | New execution owner                             | `docs/plans/353-open-ended-adversarial-review-2026-05-18-react-integration-and-surface-visibility-plan.md`          |
| R1-6 | `collectValidationModel` uses O(n^2) BFS queue                       | H      | P1       | New execution owner                             | `docs/plans/357-open-ended-adversarial-review-2026-05-18-compiler-validation-hot-path-performance-plan.md`          |
| R1-7 | Async validators cannot declare cross-field deps                     | E      | P1       | New execution owner                             | `docs/plans/354-open-ended-adversarial-review-2026-05-18-form-validation-lifecycle-and-dependency-fidelity-plan.md` |
| R1-8 | Unregistered runtime-field errors leak into `validateForm`           | E      | P0       | New execution owner                             | `docs/plans/354-open-ended-adversarial-review-2026-05-18-form-validation-lifecycle-and-dependency-fidelity-plan.md` |
| R2-1 | `commitTransactionState` commits wrong transaction at index 0        | F      | P0       | New execution owner                             | `docs/plans/355-open-ended-adversarial-review-2026-05-18-flow-designer-integrity-and-remount-safety-plan.md`        |
| R2-2 | `inputTreeDocument` prop changes overwrite unsaved edits             | F      | P0       | New execution owner                             | `docs/plans/355-open-ended-adversarial-review-2026-05-18-flow-designer-integrity-and-remount-safety-plan.md`        |
| R2-3 | ELK layout owner fails after strict-mode remount                     | F      | P1       | New execution owner                             | `docs/plans/355-open-ended-adversarial-review-2026-05-18-flow-designer-integrity-and-remount-safety-plan.md`        |
| R2-4 | `onSettled` action shape validation missing                          | C      | P1       | New execution owner                             | `docs/plans/352-open-ended-adversarial-review-2026-05-18-compiler-and-action-boundary-fidelity-plan.md`             |
| R2-5 | Container/Flex violate layout-renderer styling contract              | G      | P1       | New execution owner with owner-doc adjudication | `docs/plans/356-open-ended-adversarial-review-2026-05-18-renderer-contract-and-button-safety-plan.md`               |
| R2-6 | Multiple wrapped buttons miss `type="button"`                        | G      | P0       | New execution owner                             | `docs/plans/356-open-ended-adversarial-review-2026-05-18-renderer-contract-and-button-safety-plan.md`               |
| R2-7 | Form init failure is invisible to users                              | D      | P1       | New execution owner                             | `docs/plans/353-open-ended-adversarial-review-2026-05-18-react-integration-and-surface-visibility-plan.md`          |
| R2-8 | Action `when` field not shape-validated                              | C      | P1       | New execution owner                             | `docs/plans/352-open-ended-adversarial-review-2026-05-18-compiler-and-action-boundary-fidelity-plan.md`             |
| R3-1 | `createCompositeScopeStore` leaks parent subscription after disposal | A      | P0       | New execution owner                             | `docs/plans/351-open-ended-adversarial-review-2026-05-18-runtime-scope-lifecycle-and-isolation-plan.md`             |
| R3-2 | `HostProjectionScope` reads survive disposal                         | A      | P0       | New execution owner                             | `docs/plans/351-open-ended-adversarial-review-2026-05-18-runtime-scope-lifecycle-and-isolation-plan.md`             |
| R3-3 | `createSurfaceScope` bypasses isolation via `initialData` snapshot   | A      | P0       | New execution owner                             | `docs/plans/351-open-ended-adversarial-review-2026-05-18-runtime-scope-lifecycle-and-isolation-plan.md`             |
| R3-4 | `variant-field` duplicates `isAbortError` with divergent semantics   | I      | P1       | New execution owner                             | `docs/plans/358-open-ended-adversarial-review-2026-05-18-renderer-helper-semantic-convergence-plan.md`              |
| R3-5 | `flux-renderers-form` has unused production dependency               | J      | P2       | New execution owner                             | `docs/plans/359-open-ended-adversarial-review-2026-05-18-package-dependency-hygiene-plan.md`                        |

## Execution Plan

### Phase 1 - Freeze The 21-Finding Baseline

Status: completed
Targets: `docs/analysis/2026-05-18-open-ended-adversarial-review-02/{round-01.md,round-02.md,round-03.md,summary.md}`, `docs/references/reopened-design-decisions-and-audit-adjudications.md`, this plan

- Item Types: `Decision | Proof`

- [x] Re-audit all 21 findings against live repo and confirm that none of them is already honestly owned by another active plan and none is an adjudicated reopened issue.
- [x] Freeze one canonical finding matrix, bucket mapping, and P0/P1/P2 priority assignment in this plan.
- [x] Record any findings that are adjacent to historical plans without mechanically reopening those plans.
- [x] Rewrite this plan after the above decisions so later phases contain no unresolved bucket ambiguity.

Exit Criteria:

- [x] Every finding from `summary.md` appears exactly once in this plan's finding matrix.
- [x] No finding is still ownerless, multiply-owned, or left in an unresolved historical-reopen state.
- [x] This plan text clearly states why it is a docs-only priority-routing plan rather than a broad code-execution umbrella.
- [x] No additional owner-doc update is required to close Plan `350` itself; any successor owner-doc obligations are explicitly routed to successor plans.
- [x] `docs/logs/2026/05-18.md` records the frozen matrix and priority policy.

### Phase 2 - Create Narrow Successor Execution Owners

Status: completed
Targets: `docs/plans/`, this plan, successor execution plans `351`-`360`

- Item Types: `Decision | Proof`

- [x] Create Plan `351` for Bucket A (`runtime scope lifecycle and isolation`) and scope it to only R3-1, R3-2, and R3-3.
- [x] Create Plan `360` for Bucket B (`compiler determinism and cid-state ownership`) and scope it to only R1-1.
- [x] Create Plan `352` for Bucket C (`action boundary fidelity`) and scope it to only R1-2, R1-3, R2-4, and R2-8.
- [x] Create Plan `353` for Bucket D (`react integration correctness and surface visibility`) and scope it to only R1-4, R1-5, and R2-7.
- [x] Create Plan `354` for Bucket E (`form validation lifecycle and dependency fidelity`) and scope it to only R1-7 and R1-8.
- [x] Create Plan `355` for Bucket F (`flow-designer integrity and remount safety`) and scope it to only R2-1, R2-2, and R2-3.
- [x] Create Plan `356` for Bucket G (`renderer contract, button semantics, and styling-owner alignment`) and scope it to only R2-5 and R2-6.
- [x] Create Plan `357` for Bucket H (`compiler validation hot-path performance`) and make it explicitly justify why R1-6 remains blocking or non-blocking relative to the supported baseline; do not silently downgrade the finding.
- [x] Create Plan `358` for Bucket I (`renderer helper semantic convergence`) and scope it to only R3-4.
- [x] Create Plan `359` for Bucket J (`package dependency hygiene`) and scope it to only R3-5.
- [x] For R2-5, make Plan `356` explicitly own both any code-side styling-contract correction and any required owner-doc update; do not leave code-vs-doc responsibility unresolved.

Exit Criteria:

- [x] Buckets A-J each have exactly one successor execution plan under `docs/plans/`.
- [x] No successor plan mixes unrelated result surfaces.
- [x] Every successor plan enumerates exact finding IDs owned and explicit Non-Goals excluding adjacent surfaces.
- [x] Every successor plan names required owner-doc paths or explicitly records `No owner-doc update required`.
- [x] Any bucket that changes live owner-doc baseline explicitly names the affected doc paths; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-18.md` records the successor-owner split.

### Phase 3 - Independent Routing Audit And Queue Freeze

Status: completed
Targets: this plan, all successor execution plans created by Phase 2, `docs/logs/2026/05-18.md`

- Item Types: `Proof | Decision`

- [x] Run an independent closure-style routing audit with a fresh subagent that re-reads this plan, the analysis summary, the reopened-decision reference, and every successor plan created in Phase 2.
- [x] Fix any duplicated ownership, missing owner, dishonest residual downgrade, or over-broad successor scope discovered by the audit.
- [x] Record the audit outcome and resulting queue freeze in `docs/logs/2026/05-18.md`.

Exit Criteria:

- [x] Independent audit confirms the 21-finding matrix is one-to-one and owner-complete.
- [x] Independent audit confirms no in-scope P0/P1 finding was silently downgraded to follow-up, vague residual, or placeholder deferred text.
- [x] Independent audit confirms successor plans are narrow, guide-compliant, and aligned with the frozen matrix.
- [x] No matrix row or plan section still contains unresolved routing language such as `or`, `pending`, `if needed`, or `successor / adjudicated`.
- [x] This plan's statuses, matrix, deferred section, and daily-log evidence are textually consistent.
- [x] No additional owner-doc update is required to close Plan `350` itself; any successor owner-doc obligations remain explicitly owned by successor plans.

## Closure Gates

> 这是 docs-only owner-routing / priority-queue plan。关闭条件是 finding matrix、successor ownership、和独立 routing audit 完整，而不是代码已经全部修复。

- [x] All 21 findings have exactly one current owner bucket, explicit routing disposition, and explicit successor path.
- [x] All P0 findings are routed to explicit execution owner plans.
- [x] All P1 findings are routed to explicit execution owner plans without ambiguity.
- [x] No confirmed live defect or contract drift is silently downgraded to deferred or non-blocking follow-up.
- [x] Every referenced successor plan exists and is at least `planned` with guide-compliant scope, exact finding IDs, explicit Non-Goals, and explicit owner-doc obligations.
- [x] Independent subagent routing audit is completed and recorded.

## Deferred But Adjudicated

None currently. This routing plan must not use `Deferred But Adjudicated` as a holding area for still-unrouted findings.

## Non-Blocking Follow-ups

- If later re-audit after this routing plan closes finds a materially different same-surface residual, create a fresh explicit successor plan instead of widening an existing owner surface in place.

## Closure

Status Note: Completed. Plan `350` stayed a docs-only routing owner, froze the 21-finding matrix, created successor plans `351`-`360`, and closed after independent routing audit confirmed one-to-one ownership with no silent downgrade.

Closure Audit Evidence:

- Reviewer / Agent: independent review subagents `ses_1c73dad78ffe7kvXZCcyTv3wbf`, `ses_1c737db62ffeBsUY3DcRKAL37N`, `ses_1c735945fffeHMLgK7R0o5NGvm`, final sanity check `ses_1c733401dffel4OoJSmQUvU85o`.
- Evidence: three revision rounds tightened Plan `350` from a still-broad bucketed draft into a one-to-one routing matrix with explicit successor paths `351`-`360`, removed placeholder deferred language, split mixed renderer/package hygiene ownership, later split compiler determinism out of action-boundary ownership, and the final fresh reviewer returned `Verdict: acceptable` with `Findings: none`.

Follow-up:

- None. Successor execution plans created by Phase 2 owned the later code and verification work and now carry their own closure evidence.
