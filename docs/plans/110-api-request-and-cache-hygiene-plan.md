# 110 API Request And Cache Hygiene Plan

> Plan Status: planned
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

Status: planned
Targets: `source-registry.ts`, `scope-change.ts`, `data-source-runtime.ts`

- [ ] add direct id lookup for no-scope source refresh
- [ ] cache ignored-root normalization where ownership is stable
- [ ] reduce short-lived child-scope allocation in result-mapping paths without changing publication semantics

Exit Criteria:

- [ ] no-scope `refreshDataSource()` no longer scans the full registry in the audited path
- [ ] ignored-root filtering no longer allocates normalization state per call in the audited path
- [ ] result-mapping path reduces short-lived child-scope churn without semantic regression

### Phase 2 - Polling Cadence Closure

Status: planned
Targets: `data-source-runtime.ts`

- [ ] change polling cadence to a post-settle scheduling model if required to close the audited drift defect

Exit Criteria:

- [ ] polling cadence defect is closed with code and focused verification

### Phase 3 - Request Serialization Closure

Status: planned
Targets: `request-runtime.ts`, `api-cache.ts`

- [ ] extract shared serialization utility and remove duplicate recursive implementations
- [ ] add identity-stable caching for the dedup key serialization path where safe

Exit Criteria:

- [ ] request dedup/api cache serialization duplication is removed
- [ ] dedup-key serialization path no longer recomputes the same stable serialization unnecessarily in the audited scenario

### Phase 4 - Cache Retention Hygiene

Status: planned
Targets: `request-runtime-adaptor.ts`, `imports.ts`

- [ ] add explicit bounded-retention policy for adaptor expression cache if contract-safe
- [ ] add explicit bounded-retention policy for successful module-load cache if contract-safe

Exit Criteria:

- [ ] adaptor cache retention policy is code-closed or explicitly justified in docs if a cap is unsafe
- [ ] import cache retention policy is code-closed or explicitly justified in docs if a cap is unsafe

### Phase 5 - Docs Sync And Verification

Status: planned
Targets: docs/logs/tests

- [ ] add/update focused tests
- [ ] reverse-update audit/log text

Exit Criteria:

- [ ] docs and tests reflect the landed API/cache hygiene baseline

## Validation Checklist

- [ ] no-scope source refresh direct lookup landed
- [ ] ignored-root normalization cached
- [ ] result-mapping allocation reduced
- [ ] polling cadence defect closed
- [ ] serialization duplication removed
- [ ] dedup-key serialization cache landed or explicitly rejected with evidence
- [ ] adaptor cache retention closed or explicitly justified
- [ ] import cache retention closed or explicitly justified
- [ ] focused verification completed
- [ ] independent closure-audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: complete this section only after all in-scope API/cache issues are closed and the boundary with Plan 106 remains intact.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- if future evidence requires broader request-runtime redesign, create a separate successor plan
