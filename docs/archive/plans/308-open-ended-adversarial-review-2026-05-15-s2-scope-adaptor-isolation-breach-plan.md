# 308 Open-Ended Adversarial Review 2026-05-15 Session2 Scope Adaptor Isolation Breach

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-adversarial-review-02/round-01.md` Finding 1
> Related: `docs/plans/307-open-ended-adversarial-review-2026-05-15-session2-owner-routing-plan.md`

## Purpose

Fix the `createAdaptorScopeView.ownKeys()` Proxy trap that walks the parent scope chain without respecting `isolate`, causing enumeration (`Object.keys`, spread, `for...in`) in request/response adaptor expressions to leak parent keys in isolated contexts.

## Current Baseline

- `packages/flux-runtime/src/async-data/request-runtime-adaptor.ts:66-81` — `ownKeys()` iterates `current.parent` in a while-loop and never checks `current.isolate`.
- `get` and `has` Proxy traps (lines 52-65) correctly delegate to `scope.get()`/`scope.has()`, which short-circuit at the `isolate` boundary (`scope.ts:313, 338`).
- `getOwnPropertyDescriptor` trap (lines 82-97) already uses `scope.has()` which respects isolation — it is consistent.
- No existing tests cover enumeration behavior through the adaptor Proxy in isolated contexts.
- The contract `isolate: true` means "child reads only own snapshot" per architecture docs. This Proxy is used for request/response adaptor evaluation — a data path where schema-defined expressions transform API payloads.

## Goals

- `ownKeys()` returns only the current scope's own keys when `isolate` is `true`, matching the `get`/`has` behavior.
- `getOwnPropertyDescriptor` is verified consistent (already uses `scope.has()` — confirm no change needed).
- Focused tests cover enumeration through the adaptor Proxy in isolated and non-isolated contexts.
- Explicitly adjudicate whether any owner-doc update is needed; update docs only if a current owner doc already describes adaptor Proxy isolation semantics.

## Non-Goals

- No changes to `ScopeRef.get()`/`ScopeRef.has()` or the core scope isolation mechanism in `scope.ts`.
- No changes to other Proxy traps (`get`, `has`) which are already correct.
- No runtime behavior changes outside `packages/flux-runtime/src/async-data/request-runtime-adaptor.ts` and its tests, except for any explicitly adjudicated owner-doc sync if such docs already exist.

## Scope

### In Scope

- Fix `ownKeys()` trap to respect `current.isolate` — stop walking parent chain when hitting an isolate boundary.
- Add a `getOwnPropertyDescriptor` trap audit to confirm consistency (no code change expected, but verify).
- Add focused tests for enumeration through adaptor Proxy with `isolate: true`.
- Update `docs/architecture/flux-core.md` or `docs/architecture/flux-runtime-module-boundaries.md` if scope isolation contract is documented there.

### Out Of Scope

- Other Proxy traps — they are already correct.
- Core scope isolation in `scope.ts` — not broken.
- Other adversarial-review findings (Plans 309-314).
- Any other adaptor Proxy bugs not related to `ownKeys` isolation.

## Execution Plan

### Phase 1 - Fix Adaptor Scope OwnKeys Isolation

Status: completed
Targets: `packages/flux-runtime/src/async-data/request-runtime-adaptor.ts`, `packages/flux-runtime/src/__tests__/action-scope-and-adaptor.test.ts`, `docs/architecture/`

- Item Types: `Fix | Proof`

- [x] Fix `ownKeys()` trap: stop parent-chain walk at the first scope where `current.isolate === true` (include current scope's own keys, do not ascend further).
- [x] Verify `getOwnPropertyDescriptor` trap is consistent with isolation — read its code path, confirm it uses `scope.has()` which already respects isolate.
- [x] Add tests covering:
  - Enumeration (`Object.keys`, spread, `for...in`) through adaptor Proxy in isolated context returns only own keys.
  - Enumeration through adaptor Proxy in non-isolated context still walks full chain.
  - Consistency: enumeration keys are a subset of accessible `get` keys.
- [x] Run `pnpm typecheck && pnpm build && pnpm test --filter @nop-chaos/flux-runtime` to confirm no regressions.

Exit Criteria:

- [x] `ownKeys()` stops at isolate boundary: isolated adaptor Proxy returns only current scope's own keys.
- [x] `getOwnPropertyDescriptor` confirmed consistent (no change needed, but written down as audited).
- [x] Focused tests verify enumeration isolation, non-isolated full-chain walk, and get/ownKeys consistency.
- [x] No owner-doc update required (scope isolation is not explicitly documented in architecture docs — verify current state; if docs exist, update them; if not, this item serves as the audit record).
- [x] `docs/logs/2026/05-15.md` updated with phase completion.

## Closure Gates

- [x] `ownKeys()` respects `isolate` — confirmed by live code read and passing focused tests.
- [x] `getOwnPropertyDescriptor` audited and consistent — no contract drift introduced.
- [x] No silent regressions in adaptor Proxy `get`/`has` behavior.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] Independent subagent closure-audit has recorded evidence (Finding 1 scope isolation fix verified).

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

None currently.

## Closure

Status Note: Closed after independent audit confirmed that `createAdaptorScopeView().ownKeys()` now stops at `isolate` boundaries, focused enumeration proof covers isolated and non-isolated paths, and no in-scope work remains. No owner-doc update was required because this fix restores the existing `isolate` contract rather than changing it.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d523a894ffeybCxv8HEXBlUtm`
- Evidence: Independent closure audit re-read Plan `308`, `docs/logs/2026/05-15.md`, `packages/flux-runtime/src/async-data/request-runtime-adaptor.ts`, and `packages/flux-runtime/src/__tests__/action-scope-and-adaptor.test.ts`, and confirmed the adaptor `ownKeys()` isolate-boundary breach is fixed on the live baseline, focused enumeration proof is sufficient, no in-scope debt remains, and no additional owner-doc update is required.

Follow-up:

- No follow-up required; this plan owns only the adaptor `ownKeys()` isolate-boundary fix and its focused proof.
