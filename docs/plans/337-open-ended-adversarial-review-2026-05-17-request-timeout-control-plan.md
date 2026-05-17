# 337 Open-Ended Adversarial Review 2026-05-17 Request Timeout Control Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-17-open-ended-adversarial-review-01/round-01.md` (Finding 1)
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/architecture/api-data-source.md`

## Purpose

Close the live contract drift where `OperationControlConfig.timeout` is documented and typed as supported request control but is never consumed by the runtime request execution path.

## Current Baseline

- `packages/flux-core/src/types/schema.ts:123-135` declares `timeout?: number` on `OperationControlConfig`.
- `docs/architecture/api-data-source.md` treats timeout as part of operation control rather than transport shape.
- `packages/flux-runtime/src/async-data/request-runtime.ts:61-86` only consumes retry control; no timeout path is wired.
- No focused proof currently demonstrates timeout behavior for `api` / data-source execution on the supported baseline.

## Goals

- Make request timeout a real supported runtime control, not a dead type/doc contract.
- Add focused proof that timeout cancellation is observable and does not regress retry / dedup behavior.

## Non-Goals

- No redesign of the entire request-control model.
- No expansion into debounce / throttle semantics unless required by the timeout fix.
- No debugger observability work beyond what the timeout contract itself needs.

## Scope

### In Scope

- `packages/flux-runtime/src/async-data/request-runtime.ts`
- directly affected request-control helpers/tests/docs
- `docs/architecture/api-data-source.md` if the supported timeout semantics need explicit wording

### Out Of Scope

- cache-key correctness work owned by Plan `342`
- earlier header-identity fix already closed by Plan `330`
- action-dispatch timeout semantics outside async-data request execution

## Execution Plan

### Phase 1 - Freeze Supported Timeout Semantics

Status: completed
Targets: request runtime control path, owner docs, focused tests

- Item Types: `Decision | Proof | Fix`

- [x] Re-audit the supported timeout baseline and decide where timeout is enforced (`executeRequestWithControl`, transport wrapper, or both).
- [x] Decide timeout interaction with retry, abort signals, and dedup on the live baseline.
- [x] Update owner docs if the supported semantics are not already explicit.

Exit Criteria:

- [x] One explicit timeout baseline is recorded for async-data requests.
- [x] Timeout interaction with retry and parent abort signals is decided.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-17.md` records the decision.

### Phase 2 - Land Timeout Control Fix And Focused Proof

Status: completed
Targets: `packages/flux-runtime/src/async-data/request-runtime.ts`, focused tests

- Item Types: `Fix | Proof`

- [x] Wire `OperationControlConfig.timeout` into the request execution path.
- [x] Add focused tests covering timeout-triggered abort, timeout + retry interaction, and parent-signal cancellation ordering.

Exit Criteria:

- [x] The live request path consumes `control.timeout`.
- [x] Timed-out requests settle with the supported failure/cancellation result on the live baseline.
- [x] Focused proof covers at least one timeout + retry scenario and one timeout + parent abort scenario.
- [x] `docs/logs/2026/05-17.md` records execution notes.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Decision | Fix`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after in-scope changes land.
- [x] Run an independent closure audit with a fresh subagent.

Exit Criteria:

- [x] Focused verification for the timeout defect is green.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining timeout-contract blocker.
- [x] This plan, its checklists, and `docs/logs/2026/05-17.md` are textually consistent.

## Closure Gates

- [x] The in-scope live defect (`OperationControlConfig.timeout` unwired) is fixed.
- [x] Async-data request timeout converges to one supported baseline.
- [x] Necessary focused verification exists for timeout behavior.
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

- Any broader operation-control convergence work beyond timeout should live in a separate plan unless Phase 1 proves it is a closure prerequisite.

## Closure

Status Note: Completed. `executeRequestWithControl()` now enforces timeout through the shared request-control path, forwards the timeout-owned abort signal into the underlying transport, and surfaces final timeout as `TimeoutError` with retry metadata.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ca4629e9ffekNeqpTEETPK9kh`.
- Evidence: Re-audited `packages/flux-runtime/src/async-data/request-runtime.ts`, `packages/flux-runtime/src/__tests__/request-runtime.executor.test.ts`, `docs/architecture/api-data-source.md`, and `docs/logs/2026/05-17.md`; returned `No findings` after the timeout-abort propagation fix and focused proof update.

Follow-up:

- No remaining plan-owned work once timeout semantics are landed and verified.
