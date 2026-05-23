# 313 Open-Ended Adversarial Review 2026-05-15 Session2 Table Rendering Integrity Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-adversarial-review-02/round-03.md` (Findings 1, 2, 4, 5; global Findings 10, 11, 13, 14)
> Related: `docs/plans/307-open-ended-adversarial-review-2026-05-15-session2-owner-routing-plan.md`

## Purpose

Close the four table-rendering integrity defects owned by session-2 Findings 10, 11, 13, and 14 on the live baseline: duplicate `rowKey` rows must not alias row scopes, row-scope reconciliation must not force a fresh cache object on ordinary row-payload changes, row scopes must be explicitly disposed on eviction and unmount, and quick-edit drafts must survive record-reference churn when the edited field value itself is unchanged.

## Current Baseline

- The code slice is already landed. `packages/flux-renderers-data/src/table-renderer/table-data.ts` now assigns a unique `cacheKey` per colliding `rowKey` (`rowKey`, `rowKey::dup:1`, ...) while still warning on duplicate `rowKey` values in development via `warnOnDuplicateRowKeys(...)`. This keeps duplicate input invalid/diagnosed while preventing silent scope aliasing.
- `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts` no longer exposes the old `new Map(rowScopeCache)` / single-version fanout shape. The cache keeps stable `scopes` and `snapshots` maps, only increments `structureVersionRef` on structural changes, reuses the same `Map<string, ScopeRef>` return value across row-payload-only updates, and publishes row-local changes by mutating only the affected `ScopeRef` through `scope.merge(...)`.
- The same hook now disposes row scopes explicitly through `helpers.disposeScope`: eviction calls `disposeRowScope(...)` before deleting stale cache entries, and unmount/cache-key change disposal iterates all cached scopes before clearing the module-level cache entry.
- `packages/flux-core/src/types/renderer-core.ts` and the live runtime already expose `disposeScope(scopeId: string): void`, so no new helper-surface work remains for this plan.
- `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts` already tracks `lastFieldRef` and `lastRecordValueRef` and resets draft state only when the field changes or the actual field value changes, not merely when the `record` object identity changes.
- Focused proof is already present:
  - `packages/flux-renderers-data/src/__tests__/use-table-row-scope-cache.test.tsx` covers stable map reference on row-payload change, duplicate-key dedupe into distinct cache entries, and explicit scope disposal on eviction/unmount.
  - `packages/flux-renderers-data/src/__tests__/table-quick-edit-controller.test.tsx` covers preserving draft state across record identity churn with equal field data and resetting when the actual field value changes.
  - `packages/flux-renderers-data/src/__tests__/table-data-and-layout.test.tsx` covers duplicate-row-key diagnostics, the deduped `cacheKey` row-entry baseline, and duplicate-row flattened-item identity through `cacheKey ?? rowKey`.
  - `packages/flux-renderers-data/src/__tests__/table-internal-components.test.tsx` covers duplicate-row rendering through distinct `cacheKey` row identities in the concrete table body path.
- Owner docs are now aligned with the landed baseline in this closure pass. `docs/architecture/table-row-identity-and-scope-performance.md` records duplicate-key diagnostics plus internal cache-key disambiguation and explicit row-scope disposal, and `docs/architecture/renderer-runtime.md` now documents `helpers.disposeScope(...)` for renderer-owned child-scope lifecycles.
- The remaining work is the required independent closure-audit evidence.

## Goals

- Sync this plan to the landed duplicate-key, row-scope lifecycle, and quick-edit draft baseline actually present in the repo.
- Confirm the focused proof surface covers all four owned findings.
- Close the plan only after an independent audit confirms the live code, proof, docs, and hard-gate baseline all match the claimed closure state.

## Non-Goals

- No further redesign of table row identity beyond the already-landed `rowKey` plus `cacheKey` safety baseline.
- No virtualization redesign, column virtualization work, or other unrelated table performance changes.
- No further helper-surface expansion beyond the already-landed `disposeScope` contract.

## Scope

### In Scope

- Duplicate-`rowKey` row-scope safety through unique `cacheKey` materialization and development diagnostics.
- Stable row-scope cache references and row-local publication behavior in `use-table-row-scope-cache.ts`.
- Explicit row-scope disposal on eviction and unmount.
- Quick-edit draft persistence across record-reference churn with unchanged field values.
- Focused regression proof, plan/log sync, and independent closure-audit evidence.

### Out Of Scope

- Compiler duplicate-id diagnostics owned by Plan 314.
- Other table performance topics unrelated to the owned row-scope and quick-edit defects.
- Fresh architecture redesign beyond the already-landed baseline.

## Execution Plan

### Phase 1 - Sync Live Baseline And Proof

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/table-data.ts`, `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`, `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx`, `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`, `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-renderers-data/src/__tests__/use-table-row-scope-cache.test.tsx`, `packages/flux-renderers-data/src/__tests__/table-quick-edit-controller.test.tsx`, `packages/flux-renderers-data/src/__tests__/table-data-and-layout.test.tsx`, `packages/flux-renderers-data/src/__tests__/table-internal-components.test.tsx`, `docs/architecture/table-row-identity-and-scope-performance.md`, `docs/architecture/renderer-runtime.md`

- Item Types: `Decision | Proof`

- [x] Re-audit the live duplicate-row-key baseline and record the actual supported shape: development diagnostics still fire, but conflicting rows are materialized with distinct `cacheKey` values so row scopes do not alias.
- [x] Re-audit the live row-scope cache behavior and replace the stale global-version / `new Map(rowScopeCache)` plan baseline with the landed stable-map plus row-local publication behavior.
- [x] Re-audit the row-scope disposal path and record the already-landed `helpers.disposeScope` contract instead of treating it as a still-open design branch.
- [x] Re-audit the quick-edit controller baseline and record the already-landed field-value-based reset guard.
- [x] Confirm the focused proof surface covers duplicate-key dedupe plus concrete row rendering through `cacheKey ?? rowKey`, stable cache references, disposal on eviction/unmount, and quick-edit draft persistence.
- [x] Sync the owner docs to the landed baseline for duplicate-key cache disambiguation and explicit renderer-owned scope disposal.

Exit Criteria:

- [x] This plan describes only the current landed baseline, not the obsolete pre-fix implementation.
- [x] The code/test references in this plan point to the actual closure surface.
- [x] Focused proof for all four owned findings is explicitly identified.
- [x] `docs/architecture/table-row-identity-and-scope-performance.md` and `docs/architecture/renderer-runtime.md` updated to match the landed contract.
- [x] `docs/logs/2026/05-15.md` will be updated when closure-audit evidence is recorded.

### Phase 2 - Closure Verification And Audit

Status: completed
Targets: `docs/plans/313-open-ended-adversarial-review-2026-05-15-s2-table-rendering-integrity-plan.md`, `docs/logs/2026/05-15.md`

- Item Types: `Proof | Decision`

- [x] Reconfirm the hard-gate baseline used for closure, including the fresh full-workspace `pnpm test` run already saved for the current repo state.
- [x] Run an independent closure audit against this plan, the daily log, the live table sources, the focused proof files, and the aligned owner docs.
- [x] Record the audit evidence in both this plan and `docs/logs/2026/05-15.md`, then mark the plan completed only if no in-scope debt remains.

Exit Criteria:

- [x] The current workspace hard-gate baseline remains green for closure.
- [x] Independent closure audit confirms no remaining in-scope defect or contract drift for Findings 10, 11, 13, and 14.
- [x] `docs/logs/2026/05-15.md` updated.

## Closure Gates

- [x] Duplicate `rowKey` input no longer aliases row scopes or row-local table state.
- [x] Row-payload-only changes no longer require a fresh `rowScopeCache` map or stale full-cache structural invalidation.
- [x] Row scopes are explicitly disposed on eviction and unmount.
- [x] Quick-edit draft state survives record-identity churn when the edited field value is unchanged and still resets on genuine field-value changes.
- [x] Focused regression tests for all four findings exist and pass.
- [x] No in-scope live defect or contract drift is silently deferred to follow-up.
- [x] `docs/architecture/table-row-identity-and-scope-performance.md` and `docs/architecture/renderer-runtime.md` remain aligned with the live baseline.
- [x] Independent closure audit completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Closed after independent audit confirmed that duplicate `rowKey` rows are disambiguated via owner-local `cacheKey` through the actual row-rendering paths, row-scope caching stays stable and explicitly disposes scopes on eviction/unmount, and quick-edit drafts remain intact across record-identity churn when the edited field value is unchanged.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d4ced04cffeUUoaQcqegYrIyD`
- Evidence: Independent closure audit re-read Plan `313`, `docs/logs/2026/05-15.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/table-row-identity-and-scope-performance.md`, the live table row/cache/runtime sources, and the focused proof files, and confirmed that Findings 10, 11, 13, and 14 are fully closed on the live baseline with no remaining plan-owned debt.

Follow-up:

- no remaining plan-owned work
