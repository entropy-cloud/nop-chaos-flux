# 336 Open-Ended Adversarial Review 2026-05-17 Owner Routing Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-17-open-ended-adversarial-review-01/{round-01.md,round-02.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/239-schema-within-prop-custom-field-compilation-plan.md`, `docs/plans/296-deep-audit-2026-05-15-public-css-slot-and-facade-contract-plan.md`, `docs/plans/312-open-ended-adversarial-review-2026-05-15-s2-error-boundary-robustness-plan.md`, `docs/plans/330-deep-audit-2026-05-16-runtime-api-cache-identity-plan.md`, `docs/plans/337-open-ended-adversarial-review-2026-05-17-request-timeout-control-plan.md`, `docs/plans/338-open-ended-adversarial-review-2026-05-17-bundle-style-parity-plan.md`, `docs/plans/339-open-ended-adversarial-review-2026-05-17-formula-single-quote-escape-plan.md`, `docs/plans/340-open-ended-adversarial-review-2026-05-17-surface-error-isolation-plan.md`, `docs/plans/341-open-ended-adversarial-review-2026-05-17-custom-field-compile-failure-semantics-plan.md`, `docs/plans/342-open-ended-adversarial-review-2026-05-17-api-cache-bounded-key-collision-plan.md`

## Purpose

Split the six 2026-05-17 adversarial-review findings into single-surface owner plans so each live defect family has one honest remediation path and no already-closed historical plan is mechanically reopened.

## Current Baseline

- `docs/analysis/2026-05-17-open-ended-adversarial-review-01/summary.md` records six findings across API runtime control, bundle CSS parity, formula parsing, surface error isolation, compiler failure semantics, and API cache key correctness.
- Four findings are adjacent to already-closed plans rather than identical reopenings: bundle stylesheet parity is adjacent to Plan `296`, surface error isolation is a new adjacent error-boundary residual after the narrower Plan `312` closure, custom-field compile failure semantics is adjacent to Plan `239`, and bounded cache-key collision is adjacent to Plan `330`.
- The remaining two findings (`OperationControlConfig.timeout` unwired and single-quoted string escape semantics) do not have a current single-surface owner plan on the live baseline.
- Because the six findings touch unrelated packages and result surfaces, one bundled execution plan would violate the single-surface owner rule in `docs/plans/00-plan-authoring-and-execution-guide.md`.

## Goals

- Give each 2026-05-17 adversarial-review finding exactly one explicit owner plan.
- Keep successor plan scope narrow enough that each plan closes one result surface.
- Record which findings are new surfaces versus adjacent residuals to avoid dishonest reopening of already-closed plans.

## Non-Goals

- No direct code remediation in this routing plan.
- No rewriting of historical completed plans beyond citing them as prior baseline evidence.
- No expansion into debugger-runtime or E2E-contract review surfaces that were explicitly left out of the 2026-05-17 execution.

## Scope

### In Scope

- The six findings in `docs/analysis/2026-05-17-open-ended-adversarial-review-01/summary.md`
- Successor plans `337`-`342`
- Routing rationale and closure-audit evidence for this owner split

### Out Of Scope

- Direct implementation for any of the six defects
- Findings from earlier adversarial-review sessions or the 2026-05-16 deep audit unless they are cited as prior baseline context

## Owner Matrix

| Finding | Result Surface                                         | Owner Plan |
| ------- | ------------------------------------------------------ | ---------- |
| 1       | Request timeout control declared but unwired           | `337`      |
| 2       | Bundle stylesheet parity vs canonical CSS sources      | `338`      |
| 3       | Formula single-quoted string escape semantics          | `339`      |
| 4       | Surface dialog/drawer render error isolation           | `340`      |
| 5       | Custom-field compile failure semantics                 | `341`      |
| 6       | API cache bounded-key collision under stringify limits | `342`      |

## Audit-Delta Classification

- New surface with no prior owner plan: `1`, `3`
- Adjacent residual after prior closure: `2`, `5`, `6`
- New adjacent residual after prior narrow closure: `4`

## Execution Plan

### Phase 1 - Freeze Narrow Owner Matrix

Status: completed
Targets: this plan, successor plans `337`-`342`, `docs/logs/2026/05-17.md`

- Item Types: `Decision | Proof | Fix`

- [x] Verify each of the six findings maps to exactly one successor plan.
- [x] Record why each finding is treated as new surface, adjacent residual, or prior out-of-scope residual.
- [x] Ensure each successor plan file exists and owns one result surface only.
- [x] Record the routing decision in `docs/logs/2026/05-17.md`.

Exit Criteria:

- [x] Every 2026-05-17 adversarial-review finding has exactly one explicit owner plan.
- [x] No successor plan mixes unrelated result surfaces.
- [x] `docs/logs/2026/05-17.md` records the routing matrix and prior-plan adjacency rationale.
- [x] No owner-doc update required beyond this routing record.

### Phase 2 - Independent Routing Audit

Status: completed
Targets: this plan, successor plans `337`-`342`, linked historical plans, `docs/logs/2026/05-17.md`

- Item Types: `Proof | Decision | Fix`

- [x] Run an independent review that checks owner completeness, overlap, and honesty of the adjacency/out-of-scope claims.
- [x] Revise any successor scope that is still too broad or that reopens a closed historical plan without a materially different residual.
- [x] Record the independent review outcome in `docs/logs/2026/05-17.md`.

Exit Criteria:

- [x] Independent review confirms the routing matrix is overlap-free and owner-complete.
- [x] Independent review confirms the prior-plan adjacency labels are evidence-based.
- [x] `docs/logs/2026/05-17.md` records the routing-audit outcome.
- [x] No owner-doc update required beyond this routing record.

## Closure Gates

> Doc-only routing plan: `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are intentionally omitted until successor execution closes code-changing work.

- [x] All six in-scope findings have exactly one explicit successor owner.
- [x] No in-scope finding is silently deferred or left under a broad umbrella owner.
- [x] Independent routing audit confirms no remaining routing blocker.

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- If any successor plan broadens during execution, split it again instead of widening the owner text.

## Closure

Status Note: Completed. Plans `337`-`342` landed and the final closure audit confirmed the routing matrix remained owner-complete and overlap-free on the live repo.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ca4629e9ffekNeqpTEETPK9kh`.
- Evidence: Re-audited `docs/plans/336`-`342`, `docs/analysis/2026-05-17-open-ended-adversarial-review-01/summary.md`, adjacent historical plans `239` / `296` / `312` / `330`, and `docs/logs/2026/05-17.md`; returned `No findings`.

Follow-up:

- None.
