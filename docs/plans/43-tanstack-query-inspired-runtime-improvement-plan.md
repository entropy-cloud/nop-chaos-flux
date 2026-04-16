# 43 TanStack Query Inspired Runtime Improvement Plan

> Plan Status: planned
> Last Reviewed: 2026-04-16
> Source: `docs/analysis/2026-04-08-tanstack-query-comparison.md`, live repo audit of `packages/flux-runtime/src/data-source-runtime.ts`, `source-registry.ts`, `operation-control.ts`, `action-runtime.ts`
> Related: `docs/architecture/api-data-source.md`, `docs/architecture/action-algebra-formal-spec.md`, `docs/architecture/action-interaction-state.md`

## Purpose

Close the remaining runtime gaps from the TanStack Query comparison that still matter for Flux's current source and action model, without importing QueryCache-style global ownership or other mismatched abstractions.

## Current Baseline

- `data-source` runtime ownership, scope-scoped registry, named publication, `resultMapping`, `mergeToScope`, `statusPath`, dependency-driven refresh, polling, cache reads/writes, and debug snapshots are already implemented and covered by focused tests.
- `DataSourceController.getState()` is still the old coarse shape `{ started, loading, stale, value, error }` in both api and formula controller implementations.
- `data-source` status publication still derives only `started/loading/ready/stale/error`; it does not expose fetch/data timestamps or retry failure metadata.
- API-backed sources still update controller state through scattered closure variables in `data-source-runtime.ts`; formula-backed sources in `source-registry.ts` mirror the same coarse state shape.
- `operation-control.ts` still exposes only `withRetry(fn, { times, delay }, shouldStop)` with fixed delay and no failure tracking.
- Retry config shape is still owned by `packages/flux-core/src/types/schema.ts`, and action-side retry normalization still lives in `packages/flux-runtime/src/action-runtime-core.ts`.
- Request dedup is implemented in `packages/flux-runtime/src/request-runtime.ts`, but request execution does not yet own retry/backoff behavior or failure metadata.
- `action-runtime.ts` still supports `then` and `onError`, but not `onSettled`.
- `scope.merge()` already suppresses no-op top-level merges when references are unchanged, so the remaining structural-sharing gap is mainly source target-path publication and mapped object churn rather than all scope writes.
- The original April 8 draft is still directionally correct, but parts of it are stale against the current repo: the analysis and predecessor file names changed, `ActionSchema` now lives in `packages/flux-core/src/types/actions.ts`, and the plan did not follow the current plan-authoring requirements.

## Goals

- Replace coarse data-source controller flags with an explicit controller state model that can distinguish first load, background refresh, and failed refresh while preserving current Flux ownership boundaries.
- Add structural-sharing protection for repeated source publications so equal payloads do not cause unnecessary scope writes.
- Extend shared retry control with exponential backoff and failure tracking that can be consumed by action runtime and data-source runtime.
- Add `onSettled` to the action algebra so cleanup logic does not need to be duplicated across `then` and `onError`.
- Update docs and focused tests so the new runtime contract is explicit and audited.

## Non-Goals

- Do not introduce a TanStack Query style global `QueryCache`, observer ref-counting GC, or `gcTime` ownership model.
- Do not add online/offline managers, paused-by-network semantics, or query invalidation APIs.
- Do not broaden source publication beyond the current `name` / `dataPath` / `mergeToScope` baseline.
- Do not change `ScopeRef` core interfaces or move source ownership out of the runtime-owned scope registry.
- Do not introduce Mutation-style optimistic update context in this plan; this plan only adds `onSettled`.

## Scope

### In Scope

- `packages/flux-core/src/types/runtime.ts`
- `packages/flux-core/src/types/actions.ts`
- `packages/flux-runtime/src/data-source-runtime.ts`
- `packages/flux-runtime/src/source-registry.ts`
- `packages/flux-runtime/src/operation-control.ts`
- `packages/flux-runtime/src/action-runtime.ts`
- Focused runtime tests for sources and chained actions
- Normative doc updates in `docs/architecture/api-data-source.md` and `docs/architecture/action-algebra-formal-spec.md` if contracts change

### Out Of Scope

- source/reaction debugger UX redesign
- runtime-wide batched notification manager work
- source tag-based bulk invalidation
- tracked-props / Proxy-style subscription redesign

## Execution Plan

### Phase 1 - Data Source State Model

Status: planned
Targets: `packages/flux-core/src/types/runtime.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, `packages/flux-runtime/src/__tests__/runtime-sources*.test.ts`

- [ ] Introduce a shared `DataSourceState` type with explicit data status and fetch status instead of only coarse booleans.
- [ ] Refactor api-backed `createDataSourceController()` to use centralized state transitions instead of scattered closure mutation.
- [ ] Refactor formula-backed controller state to conform to the same public `DataSourceState` contract, with synchronous semantics documented in code and tests.
- [ ] Preserve the current `statusPath` summary surface (`loading`, `ready`, `stale`, `error`) while adding any new summary fields in a backward-compatible way.
- [ ] Update source registry debug snapshots to derive their coarse debug fields from the new controller state shape.

Exit Criteria:

- [ ] `DataSourceController.getState()` no longer returns the legacy `{ started, loading, stale, value, error }` object.
- [ ] Focused tests prove first load, background refresh with existing data, and failed refresh semantics for api-backed sources.
- [ ] Focused tests prove formula-backed sources still publish and refresh correctly under the new state contract.
- [ ] `statusPath` consumers still observe the legacy summary fields unchanged.

### Phase 2 - Structural Sharing For Source Publication

Status: planned
Targets: `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, focused source tests

- [ ] Add a small structural-sharing helper appropriate for source publication hot paths.
- [ ] Apply structural sharing before source data is written back through replace-style target-path publication so equal payloads keep stable references when safe.
- [ ] Skip source publication only for safe replace-style publication paths where replaying the same payload is semantically a no-op.
- [ ] Leave `append`, `prepend`, `merge`, and `upsert` publication semantics unchanged unless a focused follow-up plan proves a safe optimization for those modes.
- [ ] Keep this optimization narrow to source publication rather than changing generic `ScopeRef.update()` semantics in this plan.

Exit Criteria:

- [ ] Repeated equal source payloads do not trigger redundant target-path writes in focused tests.
- [ ] Changed payloads still publish normally.
- [ ] The optimization works for direct target-path publication and mapped publication paths where applicable.
- [ ] Focused tests prove non-replace merge strategies retain their current behavior.

### Phase 3 - Retry Control Enhancements

Status: planned
Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/operation-control.ts`, `packages/flux-runtime/src/request-runtime.ts`, `packages/flux-runtime/src/action-runtime-core.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, focused action/source tests

- [ ] Extend shared retry result metadata to include failure count and last failure reason.
- [ ] Add exponential-backoff support while preserving the current fixed-delay default unless explicitly enabled.
- [ ] Extend the retry config surface in the schema-owned control types only if the live implementation needs new author-visible fields.
- [ ] Establish a single retry owner for request-backed work: request execution owns retry/backoff for ajax actions and data-source fetches, while dispatcher-level retry remains only for non-request action results if still needed.
- [ ] Move request retry/backoff ownership into the shared request execution path so ajax actions and data sources consume the same retry semantics instead of reimplementing them separately.
- [ ] Thread retry failure metadata into data-source state so source status can report retry failures.
- [ ] Update action runtime to consume the expanded retry result without changing existing success/failure classification semantics.

Exit Criteria:

- [ ] `withRetry()` supports fixed delay and opt-in exponential backoff.
- [ ] Focused tests cover failure counting, last failure reason, and backoff timing behavior.
- [ ] Shared request execution applies the same retry policy to both ajax actions and data-source fetches when configured.
- [ ] Focused tests prove request-backed work does not apply the same schema retry policy twice.
- [ ] Data-source runtime can expose retry failure metadata after failed attempts.

### Phase 4 - Action `onSettled`

Status: planned
Targets: `packages/flux-core/src/types/actions.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/__tests__/runtime-actions-chained.test.ts`, `docs/architecture/action-algebra-formal-spec.md`

- [ ] Extend `ActionSchema` with `onSettled` in the same family as `then` and `onError`.
- [ ] Update action dispatch so `onSettled` runs after `then` on success-class results and after `onError` on failure-class results.
- [ ] Define the chained result context visible to `onSettled` and document it explicitly: `onSettled` reads the original triggering result, not a replacement branch result.
- [ ] Preserve existing return semantics by making `onSettled` side-effect-only for chain propagation: it must not replace the action result returned from the main step or its `then`/`onError` branch.
- [ ] Define `onSettled` failure handling explicitly: if `onSettled` itself fails, runtime reports that failure through existing framework/plugin error reporting, but the original triggering result remains the returned chain result.
- [ ] Define skipped-result behavior explicitly and keep it stable in docs and tests instead of leaving it implicit.
- [ ] Add loop-safe chaining behavior consistent with the current dispatcher model.

Exit Criteria:

- [ ] Focused tests prove `onSettled` runs for both success-class and failure-class results.
- [ ] Focused tests prove skipped actions do not run `onSettled` unless this plan is explicitly revised to choose otherwise.
- [ ] Focused tests prove `onSettled` does not overwrite the result returned to the outer sequential chain.
- [ ] Focused tests prove `onSettled` failures are reported without replacing the original branch result.
- [ ] Architecture docs reflect the final branch semantics.

## Validation Checklist

- [ ] Live repo baseline was re-audited before execution and this plan matches current file names and contracts.
- [ ] Focused runtime tests cover the new data-source state model.
- [ ] Focused runtime tests cover structural sharing behavior.
- [ ] Focused runtime tests cover retry metadata and backoff behavior.
- [ ] Focused runtime tests cover `onSettled` semantics.
- [ ] `docs/architecture/api-data-source.md` updated if source state/statusPath contract changes.
- [ ] `docs/architecture/action-algebra-formal-spec.md` updated for `onSettled`.
- [ ] `docs/logs/2026/04-16.md` updated with implementation and review notes.
- [ ] Independent subagent closure/review evidence recorded before marking this plan completed.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Risks And Rollback

- Changing `DataSourceController.getState()` is a contract change for runtime debug snapshots and focused tests. Mitigation: update all in-repo call sites in the same slice and preserve the external `statusPath` summary DTO.
- Structural sharing can accidentally suppress meaningful writes if applied too broadly. Mitigation: keep the optimization local to source publication and cover arrays/objects/primitive transitions with focused tests.
- `onSettled` can create ambiguous branch semantics if it observes the wrong result object. Mitigation: lock the chosen semantics in docs and tests before expanding implementation.

## Closure

Status Note: Not closed. This plan stays open until all four phases land, docs are synced, and an independent review confirms no remaining plan-owned work.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- None yet. If any slice proves too broad during execution, split the leftover work into a successor plan instead of silently narrowing this file.
