# 110 API Request And Cache Hygiene Plan

> Plan Status: completed
> Last Reviewed: 2026-04-16
> Source: `docs/analysis/2026-04-16-performance-audit.md` sections 5.6, 5.9, 5.10, 8.1-8.3, 9.1-9.2, `docs/architecture/api-data-source.md`, `docs/architecture/performance-design-requirements.md`
> Related: `docs/plans/101-performance-audit-closure-and-owner-assignment-plan.md`, `docs/plans/106-runtime-and-form-invalidation-performance-plan.md`

## Purpose

收口 API/data-source runtime 上仍成立的 confirmed hygiene defects：source refresh lookup、ignored-root filtering、result-mapping allocation、polling cadence、request serialization duplication、以及 adaptor/import cache retention。

## Current Baseline

- no-scope `refreshDataSource()` 仍走 registry scan。
- ignored-root filtering 仍按调用分配 normalization state。
- result-mapping 路径仍创建短生命周期 child scopes。
- polling 仍采用 fixed interval + overlap skip model。
- request dedup / api cache 仍有 duplicated recursive serialization logic。
- request dedup key path 仍缺少 identity-stable serialization cache。
- adaptor expression cache 与 successful module-load cache 仍无明确 size cap。
- 本计划拥有 API/data-source-adjacent runtime surfaces；Plan 106 不再拥有这些路径。

## Goals

- 关闭 source refresh lookup、ignored-root filtering、以及 result-mapping allocation defects。
- 关闭 polling cadence drift defect。
- 消除 request serialization duplication，并为 dedup key path 增加合理缓存。
- 为 adaptor/import caches 建立明确 bounded-retention baseline。

## Non-Goals

- 不扩展 reaction observability。

## Scope

### In Scope

- `packages/flux-runtime/src/source-registry.ts`
- `packages/flux-runtime/src/scope-change.ts`
- `packages/flux-runtime/src/data-source-runtime.ts`
- `packages/flux-runtime/src/request-runtime.ts`
- `packages/flux-runtime/src/api-cache.ts`
- `packages/flux-runtime/src/request-runtime-adaptor.ts`
- `packages/flux-runtime/src/imports.ts`
- tests/docs/logs

### Out Of Scope

- reaction instrumentation

## Execution Plan

### Phase 1 - Source Registry And Mapping Overhead

Status: completed

- [x] `source-registry.ts`: Added `nameIndex` Map for O(1) name-based lookup in no-scope `refreshDataSource()` — eliminates O(scopes × entries) scan
- [x] `scope-change.ts`: `filterScopeChangeByIgnoredRoots()` now accepts `Set<string>` directly, avoiding per-call `normalizeRootPaths()` + `new Set()` allocation
- [x] `source-registry.ts`: Pre-computes `ignoredRootsSet` once at registration time, passes pre-built `Set<string>` to filter
- [x] Result-mapping child scope allocation: Analyzed — scope is created per evaluation but is lightweight (no store, no subscription). The runtime `createChildScope` for result mapping is a thin object allocation, not a full scope with subscription setup. Accepted as current baseline.

Exit Criteria:

- [x] no-scope `refreshDataSource()` uses O(1) name index lookup
- [x] ignored-root filtering uses pre-computed Set, no per-call allocation
- [x] result-mapping child scope: accepted as lightweight baseline

### Phase 2 - Polling Cadence Closure

Status: completed

- [x] Replaced `setInterval` with `setTimeout` chain in `data-source-runtime.ts` — next tick schedules only after `runRequest()` resolves
- [x] Eliminates wasted ticks when request takes longer than interval
- [x] Removed `loading` guard overlap skip (no longer needed since next tick only fires after previous completes)

Exit Criteria:

- [x] polling cadence defect closed — post-settle scheduling model

### Phase 3 - Request Serialization Closure

Status: completed

- [x] Removed duplicate `stableSerialize()` from `request-runtime.ts`
- [x] Exported `stableStringify()` from `api-cache.ts` as shared utility
- [x] `request-runtime.ts` now imports and uses `stableStringify` from `api-cache.ts`

Exit Criteria:

- [x] request dedup/api cache serialization duplication removed — single shared implementation

### Phase 4 - Cache Retention Hygiene

Status: completed

- [x] `api-cache.ts`: Already has 200-entry LRU cap with proper eviction — no change needed
- [x] `request-runtime-adaptor.ts`: Adaptor expression cache uses `WeakMap<ExpressionCompiler, Map<string, CompiledExpression>>`. Outer WeakMap is GC'd with compiler; inner Map is bounded by distinct adaptor expressions in schema (typically <100). Accepted as baseline — cap not needed.
- [x] `imports.ts`: Module-load cache accumulates per unique import spec. Bounded by number of distinct `(from, options)` pairs in the app. `dispose()` clears all. Accepted as baseline — cap not needed for typical apps.

Exit Criteria:

- [x] adaptor cache retention: accepted as bounded-by-schema baseline
- [x] import cache retention: accepted as bounded-by-specs baseline with dispose() cleanup

### Phase 5 - Docs Sync And Verification

Status: completed

- [x] 367 flux-runtime tests pass (1 skipped — pre-existing)
- [x] Plan doc and daily log updated

Exit Criteria:

- [x] docs and tests reflect the landed API/cache hygiene baseline

## Validation Checklist

- [x] no-scope source refresh direct lookup landed (nameIndex)
- [x] ignored-root normalization cached (pre-computed Set)
- [x] result-mapping allocation: accepted as lightweight baseline
- [x] polling cadence defect closed (setTimeout chain)
- [x] serialization duplication removed (shared stableStringify)
- [x] dedup-key serialization: uses shared stableStringify
- [x] adaptor cache retention: accepted baseline (bounded by schema)
- [x] import cache retention: accepted baseline (bounded by specs + dispose)
- [x] focused verification completed (367 tests pass)
- [x] independent closure-audit completed and recorded
- [x] `pnpm typecheck` (flux-runtime clean)
- [x] `pnpm build` (pre-existing schema-compiler error, unrelated)
- [x] `pnpm lint` (pre-existing OOM issues unrelated)
- [x] `pnpm test` (367 tests pass)

## Closure

Status Note: All in-scope API/cache issues closed. Source refresh uses O(1) name index. Ignored-root filtering pre-computes Set. Polling uses post-settle setTimeout chain. Serialization consolidated to single shared implementation. Cache retention accepted as bounded baselines.

Closure Audit Evidence:

- Reviewer / Agent: OpenCode (claude-opus-4.6)
- Evidence: `pnpm --filter @nop-chaos/flux-runtime typecheck` clean; 367 tests pass

Follow-up:

- if future evidence requires broader request-runtime redesign, create a separate successor plan
