# 1 Scheduling Accessibility Re-Audit (Dim20)

> Plan Status: active
> Last Reviewed: 2026-07-23
> Source: Deferred from `docs/plans/2026-07-22-0915-2-scheduling-package-remediation.md` — "Full accessibility audit of scheduling components" (watch-only residual, Successor Required: yes)
> Mission: scheduling
> Work Item: Dim20 re-audit
> Related: `docs/plans/2026-07-21-0800-2-scheduling-accessibility-plan.md` (completed — WCAG 2.1 AA baseline)

## Purpose

Execute the accessibility dimension (Dim20) of the scheduling deep-analysis cycle that was deferred due to time constraints. The July 22 deep analysis (`docs/analysis/2026-07-22-scheduling-display-operability-deep-analysis.md`) covered dimensions 21/22/23 (display/operability/contract-drift) across 4 scheduling components (Gantt/Kanban/Calendar/Barcode-input) using a 3-way cross-reference methodology (design docs ↔ implementation code ↔ open-source references) — but Dim20 (accessibility) was explicitly not executed. This plan runs that deferred dimension with matching methodology, fixes confirmed defects, and establishes that all scheduling deep-analysis dimensions are complete.

## Current Baseline

- WCAG 2.1 AA compliance was achieved across all scheduling components via `2026-07-21-0800-2-scheduling-accessibility-plan.md` (5 P0, 9 P1, 10 P2 issues fixed; closure-audit verified). That plan sourced its Dim20 findings from `docs/analysis/2026-07-20-2157-open-audit-scheduling/round-04.md` (cross-package type-level & a11y blind spots) and `docs/audits/2026-07-20-2157-multi-audit-scheduling.md` (general audit).
- The July 22 deep analysis (`docs/analysis/2026-07-22-scheduling-display-operability-deep-analysis.md`) applied a 3-way cross-reference methodology (design docs ↔ implementation ↔ open-source references) across display/operability/contract-drift but skipped Dim20 (accessibility) — deferred as `watch-only residual`, `Successor Required: yes`.
- Scheduling components have been substantially modified during P0/P1/P2/P3 remediation (S11-S18, P2/P3 residual fixes, convention alignment) — 3+ weeks of churn since the original a11y baseline. Regressions possible.
- The July 22 analysis methodology is the standard to match: per-component 3-way cross-reference between design docs, implementation code, and open-source references, with independent agent verification rounds.

## Goals

- Execute Dim20 (accessibility) with the same multi-dimensional methodology and rigor as the July 22 deep analysis dimensions 21/22/23.
- Identify and grade any new a11y defects (P0-P3) introduced since the July 20 baseline or missed by the earlier audit.
- Fix all confirmed P0/P1 a11y defects; adjudicate P2/P3 items with clear classification.
- Establish that scheduling components have been audited across all deep-analysis dimensions (20-23).

## Non-Goals

- Not re-doing the July 20 WCAG 2.1 AA compliance work — that baseline is already established.
- Not re-auditing dimensions 21/22/23 — those are already complete.
- Not adding a11y e2e Playwright infrastructure (requires tooling investment; tracked separately).
- Not conducting screen-reader-specific testing beyond what the July 20 plan already verified.

## Scope

### In Scope

- 4 scheduling components: Gantt, Kanban, Calendar, Barcode-input. (Diff-view lives in `flux-renderers-content` and has its own audit history; it is not part of this deferred scheduling Dim20 item.)
- Accessibility audit dimension: keyboard operability, ARIA semantics, focus management, color independence, screen-reader announcements.
- Using the 3-way cross-reference methodology (design docs ↔ implementation ↔ open-source references) matching the July 22 deep analysis standard.
- Fixing all confirmed P0 and P1 defects.
- Adjudication of P2/P3 findings with non-blocking justification where appropriate.

### Out Of Scope

- WCAG 2.1 AA re-certification — already achieved and assumed intact unless Dim20 finds regressions.
- Cross-package type narrowing (separate plan).
- Performance baselining (not part of Dim20).
- Playwright a11y e2e infrastructure (requires tooling investment).

## Failure Paths

| Scenario                                        | Trigger                                               | Behavior                                                        | Retry | User Impact                          |
| ----------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------- | ----- | ------------------------------------ |
| Audit finds zero defects                        | Genuinely clean components                            | Document as verified clean; plan completes with no code changes | N/A   | None                                 |
| Audit finds regressions from post-July-20 fixes | Changes in P0-P3 remediation introduced new a11y gaps | Fix as Phase 2                                                  | No    | Regression fixed before next release |

## Test Strategy

本档选择：`建议有测`

Each fix must include a focused assertion (unit test or Playwright assertion) for the accessibility behavior — keyboard event → action, ARIA attribute presence, focus management. Manual keyboard-only walkthrough of every interaction path per component. No plan-level `pnpm typecheck/build/lint/test` regression allowed.

## Execution Plan

### Phase 1 — Dim20 Deep Analysis (Audit)

Status: planned
Targets: All scheduling components in `packages/flux-renderers-scheduling/src/`

- Item Types: `Proof | Fix`

- [ ] (Proof) Run 3-way cross-reference audit of Gantt a11y — keyboard navigation, ARIA attributes, focus management, color independence.
- [ ] (Proof) Run 3-way cross-reference audit of Kanban a11y — keyboard DnD, ARIA semantics, focus trap on panels.
- [ ] (Proof) Run 3-way cross-reference audit of Calendar a11y — grid roles, focus management in overlays, event interaction.
- [ ] (Proof) Run 3-way cross-reference audit of Barcode-input a11y — overlay dialog semantics, focus trap, error announcements.
- [ ] (Decision) Compile per-component finding list with severity grading (P0-P3) and classification (blocker/display/operability/semantic).
- [ ] (Decision) If zero confirmed defects, document and skip Phase 2.

Exit Criteria:

- [ ] Each scheduling component has a documented a11y finding list from 3-way cross-reference audit.
- [ ] All findings are severity-graded and classified.
- [ ] If defects exist, they are prioritized into Phase 2 scope.

### Phase 2 — Fix Confirmed Defects

Status: planned
Targets: Per-component findings from Phase 1

- Item Types: `Fix | Proof`

- [ ] (Fix) Fix all confirmed P0 a11y defects across scheduling components.
- [ ] (Fix) Fix all confirmed P1 a11y defects across scheduling components.
- [ ] (Proof) Add focused tests for each fixed defect (keyboard behavior, ARIA attribute presence).
- [ ] (Decision) Adjudicate P2/P3 findings — classify as `watch-only residual`, `optimization candidate`, or `out-of-scope improvement` with explicit non-blocking justification.

Exit Criteria:

- [ ] All confirmed P0/P1 defects have code fixes landed.
- [ ] Each fix has a corresponding focused test.
- [ ] P2/P3 findings are adjudicated with clear classification and non-blocking justification, or fixed.

## Draft Review Record

> - Reviewer / Agent: fresh sub-agent session (ses_073c401fbffeiCQQc4YbGgLBBl)
> - Verdict: pass-with-minors
> - Rounds: 2 (initial review → revise → re-review)
> - Findings addressed:
>   - Major: Diff-view removed from In Scope (not a scheduling package component)
>   - Major: multi-audit citation corrected to reference actual a11y plan + open audit rounds
>   - Major: methodology language aligned with cited deep analysis ("3-way cross-reference")
>   - Minor: empty Deferred But Adjudicated section added for completeness

## Closure Gates

- [ ] Dim20 deep analysis executed across all 4 scheduling components using 3-way cross-reference process.
- [ ] All confirmed P0/P1 a11y defects fixed and verified.
- [ ] P2/P3 findings adjudicated with honest classification (no in-scope live defect downgraded to deferred).
- [ ] No owner-doc update required — a11y attributes and keyboard handlers are implementation details, not contract changes. If audit reveals contract-level gaps (e.g., missing region types for a11y customization), `docs/components/<type>/design.md` updated.
- [ ] By independent sub-agent (fresh session) executed closure-audit completed and recorded; execution session may not self-audit this item.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None — all in-scope findings will be executed or adjudicated within this plan's phases.

## Non-Blocking Follow-ups

- Screen-reader a11y e2e testing for scheduling components — requires tooling infrastructure investment; out of scope.
- After all Dim20 defects resolved, update the project-wide `docs/context/project-context.md` documentation freshness if it references Dim20 status.

## Closure

Status Note: (to be filled on completion)

Closure Audit Evidence:

- Auditor / Agent: (independent sub-agent, fresh session)
- Evidence:

Follow-up:
