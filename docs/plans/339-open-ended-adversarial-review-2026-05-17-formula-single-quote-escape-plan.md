# 339 Open-Ended Adversarial Review 2026-05-17 Formula Single-Quote Escape Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-17-open-ended-adversarial-review-01/round-01.md` (Finding 3)
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Close the formula-parser correctness defect where single-quoted string literals do not interpret escape sequences consistently with double-quoted literals.

## Current Baseline

- `packages/flux-formula/src/parser.ts:24-64` routes double-quoted strings directly through `JSON.parse(raw)` but reimplements single-quoted escape handling manually.
- The current single-quote path preserves `\n`, `\t`, and `\uXXXX` as literal backslash sequences instead of their decoded characters.
- The flux-formula test suite has strong coverage overall, but it does not currently lock single-quoted escape semantics.

## Goals

- Make single-quoted literal escape semantics match the supported double-quoted baseline for standard escapes.
- Add focused regression proof for newline, tab, unicode, escaped quote, and invalid escape behavior.

## Non-Goals

- No redesign of the formula grammar beyond this literal-semantics defect.
- No broader parser rewrite.
- No runtime-evaluator changes unless Phase 1 proves they are required for closure.

## Scope

### In Scope

- `packages/flux-formula/src/parser.ts`
- focused parser/evaluator tests
- relevant docs/logs if literal semantics need explicit documentation

### Out Of Scope

- scope proxy residuals, prototype exposure, or other formula-engine candidates not part of this defect
- code-editor formula lint UX

## Execution Plan

### Phase 1 - Freeze Supported Literal Semantics

Status: completed
Targets: parser literal handling, focused tests/docs

- Item Types: `Decision | Proof | Fix`

- [x] Define the supported escape-equivalence baseline between single-quoted and double-quoted literals.
- [x] Decide how invalid escapes should fail on the supported parser baseline.
- [x] Update owner docs if the supported literal semantics are documented anywhere live.

Exit Criteria:

- [x] One explicit single-quote literal baseline is recorded.
- [x] Invalid-escape behavior is decided and testable.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-17.md` records the decision.

### Phase 2 - Land Parser Fix And Focused Proof

Status: completed
Targets: `packages/flux-formula/src/parser.ts`, focused tests

- Item Types: `Fix | Proof`

- [x] Fix single-quoted escape handling so supported escapes decode correctly.
- [x] Add focused regression tests for `\\n`, `\\t`, unicode escape handling, escaped single quote, escaped double quote, and invalid escape failure.

Exit Criteria:

- [x] Supported escapes decode identically in single-quoted and double-quoted literals on the touched cases.
- [x] Focused proof exists for valid and invalid single-quoted escapes.
- [x] `docs/logs/2026/05-17.md` records execution notes.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched package, docs, this plan

- Item Types: `Proof | Decision | Fix`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after in-scope changes land.
- [x] Run an independent closure audit with a fresh subagent.

Exit Criteria:

- [x] Focused verification for the parser defect is green.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining single-quote literal blocker.
- [x] This plan, its checklists, and `docs/logs/2026/05-17.md` are textually consistent.

## Closure Gates

- [x] The in-scope parser defect (single-quoted escape mismatch) is fixed.
- [x] Formula literal semantics converge to one supported baseline for the touched escapes.
- [x] Necessary focused verification exists for valid and invalid single-quoted escapes.
- [x] No in-scope live defect is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- Broader formula-parser normalization work should live in a successor plan if Phase 1 finds additional non-blocking inconsistencies outside single-quoted escapes.

## Closure

Status Note: Completed. Single-quoted literals now follow the same supported escape baseline as double-quoted literals for the touched escape families, and invalid escapes fail under focused proof.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ca4629e9ffekNeqpTEETPK9kh`.
- Evidence: Re-audited `packages/flux-formula/src/parser.ts`, `packages/flux-formula/src/contract-boundary.test.ts`, and `docs/logs/2026/05-17.md`; returned `No findings` and no separate owner-doc drift remained.

Follow-up:

- No remaining plan-owned work once single-quoted literal semantics are fixed and verified.
