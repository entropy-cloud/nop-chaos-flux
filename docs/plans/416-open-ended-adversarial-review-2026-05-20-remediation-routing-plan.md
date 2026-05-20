# 416 Open-Ended Adversarial Review 2026-05-20 Remediation Routing Plan

> Plan Status: completed
> Last Reviewed: 2026-05-20
> Source: `docs/analysis/2026-05-20-open-ended-adversarial-review-01/{round-01.md,round-02.md,round-03.md,round-04.md,round-05.md,round-06.md,round-07.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/references/reopened-design-decisions-and-audit-adjudications.md`, `docs/plans/399-deep-audit-2026-05-19-compiler-diagnostic-fidelity-plan.md`, `docs/plans/402-deep-audit-2026-05-19-cross-package-i18n-alignment-plan.md`, `docs/plans/405-ux-audit-2026-05-19-remediation-plan.md`, `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`

## Purpose

把 `docs/analysis/2026-05-20-open-ended-adversarial-review-01/` 的 7 轮新发现冻结成一个诚实的修改队列与 owner-routing baseline。

这份计划不假装直接修完全部 retained findings。它只负责三件事：

- 冻结 2026-05-20 这批 open-ended 审查的当前 live baseline。
- 为每条 retained finding 指定且只指定一个 remediation bucket、优先级与后续 execution owner path。
- 在进入实现前，先通过独立子 agent 反复审查这份 routing baseline，直到 reviewer 对 finding 计数、bucket 划分、owner path 和 closure wording 无实质分歧。

## Current Baseline

- `docs/analysis/2026-05-20-open-ended-adversarial-review-01/` 当前包含 `round-01.md` 到 `round-07.md`，共保留 `11` 条 retained findings：
  - round 01: `1`
  - round 02: `3`
  - round 03: `3`
  - round 04: `1`
  - round 05: `1`
  - round 06: `1`
  - round 07: `1`
- 这 `11` 条 finding 横跨至少 6 个不共享 closure criteria 的结果面：
  - repo-wide i18n key guardrail truthfulness
  - repository automation / verification guardrail truthfulness
  - compiler / schema validation fidelity
  - supported E2E truthfulness residual
  - spreadsheet hot-path scale behavior
  - debugger accessibility semantics
- 现有相邻计划只覆盖其中的邻接 surface，而不诚实 owning 本批 finding：
  - Plan `402` 是 UI-local i18n instance integration，不 owning repo-wide i18n key guardrail coverage truthfulness。
  - Plan `399` 是 compiler diagnostic fidelity，不 owning newly found lifecycle / required prop / reaction / ajax payload schema validation gaps。
  - Plan `408` 已关闭并 owning 2026-05-19 那批 supported E2E truthfulness findings，但不自动 owning 2026-05-20 新增的 report-designer metadata assertion drift。
  - Plan `405` 是 2026-05-19 UX remediation，不 owning debugger expanded-detail inert button semantics。
- round 02 的三个 automation guardrail finding 虽然与 compiler/validation 相邻，但不共享同一 closure surface：它们的真实 owner 是脚本 truthfulness、check-chain placement、和 verification contract，而不是 compiler schema semantics 本身。
- 因此，这一批 finding 不能诚实地直接并入一个现有 completed plan，也不适合伪装成一个单一 implementation plan。

## Goals

- 为全部 `11` 条 retained finding 建立一对一 remediation matrix，避免 ownerless、multiply-owned、或 vague residual 处理。
- 区分哪些 finding 共享同一 execution owner surface，哪些必须拆成独立 successor plans。
- 在真正拆 implementation plan 之前，用独立 reviewer 反复质疑这份 routing baseline，直到 scope、priority、bucket 与 owner path 达成共识。

## Non-Goals

- 不在本计划内直接落地代码修复、测试修复、或架构文档修订本身。
- 不把 `11` 条 finding 强行塞进一个宽 implementation plan。
- 不重写已 `completed` 的历史计划正文来追求模板统一；若需要复用同 surface，使用新的 successor ownership。
- 不继续新增 2026-05-20 之后的新审查 finding；本计划只冻结 round-01 到 round-07 的 retained set。

## Scope

### In Scope

- `docs/analysis/2026-05-20-open-ended-adversarial-review-01/round-01.md` 到 `round-07.md`
- 本批 `11` 条 finding 的 bucket、priority、disposition、successor-owner routing
- 需要新增的 successor execution owner paths
- 本计划文件
- `docs/logs/2026/05-20.md`

### Out Of Scope

- 任何直接代码修复、测试修复或 architecture/component 文档改写
- 新增 open-ended 审计轮次
- 与本批 finding 无关的 deep-audit / UX audit 历史 finding

## Priority Policy

- `P0`: live correctness、schema/contract hole、or proof gap that can systematically hide real regressions. 不能降级为 vague follow-up。
- `P1`: authoring/validation/guardrail/public-truth drift、supported proof weakness、or accessibility semantic lie with concrete user impact.
- `P2`: optimization candidate or bounded scale residual that still needs an explicit owner path, but does not by itself invalidate today's supported baseline.

## Remediation Buckets

| Bucket | Theme                                                       | Count      | Priority | Execution Owner Path                                                                                |
| ------ | ----------------------------------------------------------- | ---------- | -------- | --------------------------------------------------------------------------------------------------- |
| A      | Repo-wide i18n key guardrail truthfulness                   | 1 finding  | `P1`     | `docs/plans/417-open-ended-adversarial-review-2026-05-20-i18n-guardrail-truthfulness-plan.md`       |
| B      | Repository automation / verification guardrail truthfulness | 3 findings | `P1`     | `docs/plans/418-open-ended-adversarial-review-2026-05-20-automation-guardrail-truthfulness-plan.md` |
| C      | Compiler / schema validation fidelity                       | 4 findings | `P0`     | `docs/plans/419-open-ended-adversarial-review-2026-05-20-schema-validation-fidelity-plan.md`        |
| D      | Supported E2E truthfulness residual                         | 1 finding  | `P1`     | `docs/plans/420-open-ended-adversarial-review-2026-05-20-report-designer-e2e-truthfulness-plan.md`  |
| E      | Spreadsheet virtualization hot-path scale behavior          | 1 finding  | `P2`     | `docs/plans/421-open-ended-adversarial-review-2026-05-20-spreadsheet-viewport-performance-plan.md`  |
| F      | Debugger accessibility semantics                            | 1 finding  | `P1`     | `docs/plans/422-open-ended-adversarial-review-2026-05-20-debugger-accessibility-semantics-plan.md`  |

## Finding Matrix

| ID     | Finding                                                                                                                             | Bucket | Priority | Disposition         | Successor Path                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- | ------------------- | --------------------------------------------------------------------------------------------------- |
| R01-01 | `check:i18n-keys` only proves literal `flux.*` keys and misses namespace-relative / dynamic key usage                               | A      | P1       | New execution owner | `docs/plans/417-open-ended-adversarial-review-2026-05-20-i18n-guardrail-truthfulness-plan.md`       |
| R02-01 | `check-finite-prop-contracts` is an opt-in sample list, not a finite-contract guard                                                 | B      | P1       | New execution owner | `docs/plans/418-open-ended-adversarial-review-2026-05-20-automation-guardrail-truthfulness-plan.md` |
| R02-02 | `check-workspace-manifest-deps` misses bare side-effect imports                                                                     | B      | P1       | New execution owner | `docs/plans/418-open-ended-adversarial-review-2026-05-20-automation-guardrail-truthfulness-plan.md` |
| R02-03 | schema property coverage is no longer 100% and is absent from the main check chain                                                  | B      | P1       | New execution owner | `docs/plans/418-open-ended-adversarial-review-2026-05-20-automation-guardrail-truthfulness-plan.md` |
| R03-01 | lifecycle actions compile and run, but shape validation never validates them                                                        | C      | P0       | New execution owner | `docs/plans/419-open-ended-adversarial-review-2026-05-20-schema-validation-fidelity-plan.md`        |
| R03-02 | `RendererPropContract.required` is documented as parse/validate semantics but is not enforced by schema validation                  | C      | P0       | New execution owner | `docs/plans/419-open-ended-adversarial-review-2026-05-20-schema-validation-fidelity-plan.md`        |
| R03-03 | `reaction` validates only `actions`; invalid `watch` and control fields can validate, compile, and then silently degrade at runtime | C      | P0       | New execution owner | `docs/plans/419-open-ended-adversarial-review-2026-05-20-schema-validation-fidelity-plan.md`        |
| R04-01 | Report Designer E2E claims metadata binding, but only proves spreadsheet text write and not semantic binding                        | D      | P1       | New execution owner | `docs/plans/420-open-ended-adversarial-review-2026-05-20-report-designer-e2e-truthfulness-plan.md`  |
| R05-01 | Built-in `ajax` actions are typed/docs-defined as `args: ApiSchema`, but schema validation only checks generic action shape         | C      | P0       | New execution owner | `docs/plans/419-open-ended-adversarial-review-2026-05-20-schema-validation-fidelity-plan.md`        |
| R06-01 | Spreadsheet virtualization limits DOM size but still recomputes full-grid offset arrays on every scroll render                      | E      | P2       | New execution owner | `docs/plans/421-open-ended-adversarial-review-2026-05-20-spreadsheet-viewport-performance-plan.md`  |
| R07-01 | Debugger expanded detail panels are focusable nested `role="button"` elements that do not activate anything                         | F      | P1       | New execution owner | `docs/plans/422-open-ended-adversarial-review-2026-05-20-debugger-accessibility-semantics-plan.md`  |

## Adjacency Notes

- Plan `402` is adjacent but not sufficient: it fixed UI-to-`flux-i18n` instance alignment, not repo-wide guardrail truthfulness for key usage scanning.
- Plan `399` is adjacent but not sufficient: it fixed diagnostic fidelity, not schema validation coverage / action payload validation / required-contract enforcement.
- Plan `408` is adjacent but not sufficient: it closed the previous supported E2E queue, but this new report-designer metadata assertion gap is a fresh same-class residual and needs its own successor owner.
- Plan `405` is adjacent but not sufficient: it remediated 2026-05-19 UX findings in renderer families, not debugger expanded-detail semantic buttons.
- The spreadsheet hot-path scale issue is not a restatement of the historical pre-virtualization finding and should not be routed to old “add virtualization” work.
- The round-02 automation findings are adjacent to compiler validation, but they do not share one honest closure surface with round-03 / round-05 live schema-validation defects; they need a separate automation-guardrail owner.

## Execution Plan

### Phase 1 - Freeze The 11-Finding Baseline

Status: completed
Targets: `docs/analysis/2026-05-20-open-ended-adversarial-review-01/`, this plan

- Item Types: `Decision | Proof`

- [x] Re-audit all seven round files against the live repo and confirm the retained set is exactly the 11 findings listed in this plan.
- [x] Confirm none of the 11 findings is already honestly owned by an existing active or completed plan without a required scope change.
- [x] Freeze one canonical finding matrix, bucket mapping, and priority assignment in this plan.
- [x] Record explicit adjacency notes for nearby plans so later execution does not silently widen them.

Exit Criteria:

- [x] Every retained finding from `round-01.md` through `round-07.md` appears exactly once in this plan's finding matrix.
- [x] No retained finding is ownerless, multiply-owned, or silently merged into an unrelated historical owner plan.
- [x] This plan text clearly states why it is a routing plan rather than a broad implementation umbrella.
- [x] No owner-doc update required.
- [x] `docs/logs/2026/05-20.md` is updated.

### Phase 2 - Create Narrow Successor Execution Owners

Status: completed
Targets: `docs/plans/417-*.md`, `docs/plans/418-*.md`, `docs/plans/419-*.md`, `docs/plans/420-*.md`, `docs/plans/421-*.md`, `docs/plans/422-*.md`, this plan

- Item Types: `Decision | Proof`

- [x] Create Plan `417` for repo-wide i18n key guardrail truthfulness only.
- [x] Create Plan `418` for repository automation / verification guardrail truthfulness only, owning `R02-01`, `R02-02`, and `R02-03` together.
- [x] Create Plan `419` for compiler / schema validation fidelity only, owning `R03-01`, `R03-02`, `R03-03`, and `R05-01` together.
- [x] Create Plan `420` for the report-designer metadata-binding E2E truthfulness residual only.
- [x] Create Plan `421` for spreadsheet viewport hot-path scale behavior only.
- [x] Create Plan `422` for debugger accessibility semantics only.
- [x] Make each successor plan enumerate exact finding IDs, explicit Non-Goals, and required owner-doc obligations or explicit `No owner-doc update required` adjudication.

Exit Criteria:

- [x] Buckets A-F each have exactly one execution owner path under `docs/plans/`.
- [x] No successor plan mixes unrelated result surfaces.
- [x] Every successor plan names exact finding IDs and explicit Non-Goals.
- [x] Every successor plan names affected owner docs or explicitly records `No owner-doc update required`.
- [x] `docs/logs/2026/05-20.md` is updated.

### Phase 3 - Independent Routing Review Until Convergence

Status: completed
Targets: this plan, successor plans `417`-`422`, `docs/logs/2026/05-20.md`

- Item Types: `Proof | Decision`

- [x] Run at least one fresh independent subagent closure-audit-style review against this routing plan and all referenced successor plans.
- [x] Fix any duplicated ownership, over-broad scope, dishonest downgrade, or missing owner path the reviewer finds.
- [x] Repeat independent review after revisions until a fresh reviewer returns no remaining routing findings.
- [x] Record the final closure-audit evidence and convergence result in `docs/logs/2026/05-20.md`.

Exit Criteria:

- [x] Independent closure audit confirms the 11-finding matrix is one-to-one and owner-complete.
- [x] Independent closure audit confirms no in-scope `P0/P1` finding was silently downgraded to vague follow-up or residual wording.
- [x] Independent closure audit confirms successor plans are narrow, guide-compliant, and aligned with the frozen matrix.
- [x] At least one final fresh reviewer returns `no findings` / equivalent acceptance verdict after revisions.
- [x] This plan's statuses, matrix, and daily-log evidence are textually consistent.

## Closure Gates

> 这是 docs-only routing plan。关闭条件是 11 条 finding 全部获得唯一 successor owner path，并完成独立 routing convergence 审查；不是代码已经全部修复。

- [x] All 11 findings have exactly one current bucket, disposition, and successor path.
- [x] All `P0` findings are routed to explicit execution owner plans.
- [x] All `P1` findings are routed without ambiguity.
- [x] No confirmed in-scope live defect, contract drift, or truthfulness gap is silently downgraded to deferred or vague follow-up.
- [x] Every referenced successor plan exists and is at least `planned` with guide-compliant scope.
- [x] This docs-only routing plan requires no owner-doc update for itself; any owner-doc obligations are explicitly routed to successor plans.
- [x] Independent subagent closure audit is completed and recorded.
- [x] All phase `Exit Criteria` are fully checked before `Plan Status` moves to `completed`.

## Deferred But Adjudicated

None currently. `R06-01` is routed through explicit successor ownership in Plan `421`; it is not additionally classified as a deferred item inside this routing plan.

## Non-Blocking Follow-ups

- If later re-audit finds additional same-surface residuals adjacent to buckets A-F, prefer extending the corresponding successor plan before creating another routing umbrella, but only if the live result surface and closure criteria still match.

## Closure

Status Note: The 11-finding matrix, successor routing, and owner-path adjudication are fully synchronized, and the independent closure audit confirmed that the routing baseline is one-to-one, guide-compliant, and free of closure blockers. This plan is now honestly closed as a docs-only routing plan.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent
- Evidence: `ses_1bb02c7feffeSJyOIc1GfmNQsL` (`Verdict: acceptable`, `Findings: none`), recorded in `docs/logs/2026/05-20.md`

Follow-up:

- no remaining plan-owned work
