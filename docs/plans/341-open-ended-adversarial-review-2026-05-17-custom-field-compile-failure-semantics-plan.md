# 341 Open-Ended Adversarial Review 2026-05-17 Custom-Field Compile Failure Semantics Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-17-open-ended-adversarial-review-01/round-02.md` (Finding 2)
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/239-schema-within-prop-custom-field-compilation-plan.md`, `docs/architecture/field-metadata-slot-modeling.md`

## Purpose

Close the compiler failure-semantics gap where a thrown error inside `SchemaFieldRule.compile` emits a diagnostic but silently removes the field from the compiled output instead of producing an honest compile failure surface.

## Current Baseline

- Plan `239` introduced `SchemaFieldRule.compile` and intentionally caught compile-time errors to keep compilation resilient, but it did not adjudicate what runtime-visible fallback semantics should apply when a custom field compiler throws.
- `packages/flux-compiler/src/schema-compiler/node-compiler.ts:249-261` currently emits an error diagnostic and then continues without writing any value for the field key.
- This means the field structurally disappears from `compiledPropEntries`, producing a different runtime shape from both the source schema and ordinary expression-compilation failure behavior.
- The current behavior is dishonest in both strict and tolerant modes: strict callers do not get a true compile failure, and tolerant callers do not get an explicit node-level compile-failure surface.
- No focused proof currently locks the supported failure semantics for custom field compilation.

## Goals

- Establish one honest supported failure baseline for `SchemaFieldRule.compile` errors.
- In strict compilation, make `SchemaFieldRule.compile` throw as a real compile failure instead of silently degrading.
- In tolerant compilation (`continueOnError`-style flows), replace the current node with an explicit compile-failure surface instead of silently deleting the field and rendering the real renderer with partial props.

## Non-Goals

- No redesign of the `SchemaFieldRule.compile` feature itself.
- No reopening of the already-closed schema-within-a-prop owner problem from Plan `239`.
- No broad compiler diagnostics redesign beyond what this failure-semantics fix requires.
- No field-level sentinel fallback that keeps the real renderer alive with a partially corrupted prop shape.

## Scope

### In Scope

- `packages/flux-compiler/src/schema-compiler/node-compiler.ts`
- compile-failure placeholder wiring if the tolerant baseline requires a node-level failure surface
- any directly affected `flux-core` types/tests if fallback semantics require typing changes
- focused compiler tests and affected owner docs

### Out Of Scope

- generic compile-time diagnostics deduplication
- unrelated renderer field-compilation enhancements
- deep-region validation parity already owned elsewhere
- broader renderer-runtime failure UX redesign beyond what is needed to show an honest compile-failure surface for this defect family

## Execution Plan

### Phase 1 - Freeze Supported Failure Semantics

Status: completed
Targets: custom-field compile path, owner docs/tests

- Item Types: `Decision | Proof | Fix`

- [x] Freeze the strict-mode rule: `SchemaFieldRule.compile` throwing is a real compile failure and must not be swallowed into silent field deletion.
- [x] Decide the tolerant-mode rule: when compilation is allowed to continue, the current node is replaced by an explicit compile-failure surface rather than rendering the real renderer with a missing field.
- [x] Re-audit the interaction with `continueOnError`, diagnostics-enabled compilation, and ordinary `compileValue` failure behavior.
- [x] Update owner docs if `SchemaFieldRule.compile` failure semantics are part of the supported compiler contract.

Exit Criteria:

- [x] One explicit supported strict/tolerant failure baseline for custom-field compilation is recorded.
- [x] Interaction with diagnostics/continue-on-error modes is decided.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-17.md` records the decision.

### Phase 2 - Land Failure-Semantics Fix And Focused Proof

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/node-compiler.ts`, focused tests

- Item Types: `Fix | Proof`

- [x] Implement the agreed strict-mode hard-fail behavior for custom-field compile failures.
- [x] Implement the agreed tolerant-mode node-level compile-failure replacement if `continueOnError` remains supported on this path.
- [x] Add focused tests proving strict-mode throw behavior and tolerant-mode explicit failure-surface behavior on a throwing custom compiler.

Exit Criteria:

- [x] Custom-field compile failures no longer silently delete the field under the supported baseline.
- [x] Strict mode surfaces a real compile failure rather than a partial compiled node.
- [x] Tolerant mode, if supported, renders an explicit compile-failure surface instead of the real renderer with a missing field.
- [x] Focused proof covers both strict-mode and continue-on-error-relevant behavior on the touched path.
- [x] `docs/logs/2026/05-17.md` records execution notes.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Decision | Fix`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after in-scope changes land.
- [x] Run an independent closure audit with a fresh subagent.

Exit Criteria:

- [x] Focused verification for the failure-semantics defect is green.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining custom-field failure-semantics blocker.
- [x] This plan, its checklists, and `docs/logs/2026/05-17.md` are textually consistent.

## Closure Gates

- [x] The in-scope live defect (silent field disappearance on custom compile failure) is fixed.
- [x] Custom-field compile failure semantics converge to one supported strict/tolerant baseline.
- [x] Necessary focused verification exists for strict failure behavior and any supported tolerant-mode failure surface.
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

- If Phase 1 uncovers broader compile-failure inconsistency families outside `SchemaFieldRule.compile`, route them to a successor plan instead of widening this owner surface.

## Closure

Status Note: Completed. Custom-field compile failures now surface as honest node-level failures: strict mode throws, and tolerant mode replaces the current node with an explicit compile-failure surface.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ca4629e9ffekNeqpTEETPK9kh`.
- Evidence: Re-audited `packages/flux-compiler/src/schema-compiler/node-compiler.ts`, `packages/flux-compiler/src/schema-compiler-renderer-contracts.test.ts`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/bugs/58-custom-field-compile-failure-surface-fix.md`, and `docs/logs/2026/05-17.md`; returned `No findings`.

Follow-up:

- No remaining plan-owned work once custom-field compile failure semantics are fixed and verified.
