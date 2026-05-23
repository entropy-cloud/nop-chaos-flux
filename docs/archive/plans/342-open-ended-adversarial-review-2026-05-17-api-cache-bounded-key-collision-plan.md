# 342 Open-Ended Adversarial Review 2026-05-17 API Cache Bounded-Key Collision Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-17-open-ended-adversarial-review-01/round-02.md` (Finding 3)
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/330-deep-audit-2026-05-16-runtime-api-cache-identity-plan.md`, `docs/architecture/api-data-source.md`

## Purpose

Close the residual API-cache correctness gap where the bounded `stableStringify()` helper can truncate large request payloads into identical cache-key suffixes, making different requests alias to the same cache entry.

## Current Baseline

- Plan `330` closed the earlier default-cache-identity defect where headers were excluded from the key, but it did not own bounded-stringify collision behavior.
- `packages/flux-runtime/src/async-data/api-cache.ts:16-18` bounds stringify depth to 12 and node count to 2000.
- `stableStringifyInternal()` returns literal sentinels (`"[MaxNodesExceeded]"`, `"[MaxDepthExceeded]"`) once the budget is exceeded.
- No focused proof currently exercises payloads that exceed these bounds and verifies the resulting cache identity behavior.

## Goals

- Establish one honest supported cache-key baseline when request payloads exceed the stringify bounds.
- Prevent large or deep request payloads from silently colliding under the default cache key.

## Non-Goals

- No broader cache eviction-policy redesign.
- No reopening of the already-closed header-identity family from Plan `330`.
- No general request-timeout work, which is owned by Plan `337`.

## Scope

### In Scope

- `packages/flux-runtime/src/async-data/api-cache.ts`
- directly affected focused tests/docs

### Out Of Scope

- cache TTL / eviction policy redesign
- dedup-controller semantics outside cache-key generation
- debugger observability for cache operations

## Execution Plan

### Phase 1 - Freeze Supported Bounded-Key Baseline

Status: completed
Targets: cache-key generation path, owner docs/tests

- Item Types: `Decision | Proof | Fix`

- [x] Decide the supported behavior when request payloads exceed stringify node/depth limits (for example: switch to collision-resistant hashing, reject implicit caching, or encode a stronger bounded identity).
- [x] Re-audit whether the current bound values remain part of the supported baseline after the fix.
- [x] Update owner docs if cache identity wording changes.

Exit Criteria:

- [x] One explicit supported bounded-key baseline is recorded.
- [x] The relationship between stringify limits and default cache identity is decided.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-17.md` records the decision.

### Phase 2 - Land Collision Fix And Focused Proof

Status: completed
Targets: `packages/flux-runtime/src/async-data/api-cache.ts`, focused tests

- Item Types: `Fix | Proof`

- [x] Implement the agreed bounded-key fix so large/deep payloads do not alias incorrectly.
- [x] Add focused tests covering node-budget overflow and depth overflow on the default cache key path.

Exit Criteria:

- [x] Large/deep payloads no longer silently share the same default cache entry on the supported baseline.
- [x] Focused proof covers both node-budget and depth-budget overflow scenarios.
- [x] `docs/logs/2026/05-17.md` records execution notes.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched package, docs, this plan

- Item Types: `Proof | Decision | Fix`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after in-scope changes land.
- [x] Run an independent closure audit with a fresh subagent.

Exit Criteria:

- [x] Focused verification for the bounded-key collision defect is green.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining bounded-key cache blocker.
- [x] This plan, its checklists, and `docs/logs/2026/05-17.md` are textually consistent.

## Closure Gates

- [x] The in-scope live defect (bounded-stringify cache-key collision) is fixed.
- [x] Runtime API cache identity converges to one supported baseline for oversized payloads.
- [x] Necessary focused verification exists for node/depth overflow behavior.
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

- Any future cache-identity tuning outside oversized-payload correctness should live in a separate successor plan unless Phase 1 proves it is closure-critical here.

## Closure

Status Note: Completed. Default cache identity now keeps bounded stringify sentinels for readability while appending an `fnv1a64` digest for oversized payload identity, including cyclic overflow cases covered by focused proof.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ca4629e9ffekNeqpTEETPK9kh`.
- Evidence: Re-audited `packages/flux-runtime/src/async-data/api-cache.ts`, `packages/flux-runtime/src/async-data/api-cache.test.ts`, `docs/architecture/api-data-source.md`, `docs/bugs/59-api-cache-bounded-key-digest-fix.md`, and `docs/logs/2026/05-17.md`; returned `No findings` after the oversize node/depth/circular cache-key regression proofs landed.

Follow-up:

- No remaining plan-owned work once bounded-key collision behavior is fixed and verified.
