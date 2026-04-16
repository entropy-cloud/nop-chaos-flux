# 43 TanStack Query Inspired Runtime Improvement Plan

> Plan Status: partially completed
> Last Reviewed: 2026-04-16
> Source: `docs/analysis/2026-04-08-tanstack-query-comparison.md`, live repo audit of `packages/flux-runtime/src/data-source-runtime.ts`, `source-registry.ts`, `operation-control.ts`, `action-runtime.ts`
> Related: `docs/architecture/api-data-source.md`, `docs/architecture/action-algebra-formal-spec.md`, `docs/architecture/action-interaction-state.md`

## Purpose

Close the remaining runtime gaps from the TanStack Query comparison that still matter for Flux's current source and action model, without importing QueryCache-style global ownership or other mismatched abstractions.

## Current Baseline

- `data-source` runtime ownership, scope-scoped registry, named publication, `resultMapping`, `mergeToScope`, `statusPath`, dependency-driven refresh, polling, cache reads/writes, and debug snapshots are already implemented and covered by focused tests.
- `DataSourceController.getState()` is still the old coarse shape `{ started, loading, stale, value, error }` in both api and formula controller implementations.
- `data-source` status publication currently derives `started/loading/ready/stale/error`; it does not expose fetch/data timestamps or retry failure metadata.
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

Status: completed
Targets: `packages/flux-core/src/types/runtime.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, `packages/flux-runtime/src/__tests__/runtime-sources*.test.ts`

- [x] Introduce a shared `DataSourceState` type with explicit data status and fetch status instead of only coarse booleans.
- [x] Refactor api-backed `createDataSourceController()` to use centralized state transitions instead of scattered closure mutation.
- [x] Refactor formula-backed controller state to conform to the same public `DataSourceState` contract, with synchronous semantics documented in code and tests.
- [x] Preserve the current `statusPath` summary surface (`started`, `loading`, `ready`, `stale`, `error`) while adding any new summary fields in a backward-compatible way.
- [x] Update source registry debug snapshots to derive their coarse debug fields from the new controller state shape.

Exit Criteria:

- [x] `DataSourceController.getState()` no longer returns the legacy `{ started, loading, stale, value, error }` object.
- [x] Focused tests prove first load, background refresh with existing data, and failed refresh semantics for api-backed sources.
- [x] Focused tests prove formula-backed sources still publish and refresh correctly under the new state contract.
- [x] `statusPath` consumers still observe the legacy summary fields unchanged, including `started`.

### Phase 2 - Structural Sharing For Source Publication

Status: completed
Targets: `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, focused source tests

- [x] Add a small structural-sharing helper appropriate for source publication hot paths.
- [x] Apply structural sharing before source data is written back through replace-style target-path publication so equal payloads keep stable references when safe.
- [x] Skip source publication only for safe replace-style publication paths where replaying the same payload is semantically a no-op.
- [x] Leave `append`, `prepend`, `merge`, and `upsert` publication semantics unchanged unless a focused follow-up plan proves a safe optimization for those modes.
- [x] Keep this optimization narrow to source publication rather than changing generic `ScopeRef.update()` semantics in this plan.

Exit Criteria:

- [x] Repeated equal source payloads do not trigger redundant target-path writes in focused tests.
- [x] Changed payloads still publish normally.
- [x] The optimization works for direct target-path publication and mapped publication paths where applicable.
- [x] Focused tests prove non-replace merge strategies retain their current behavior.

### Phase 3 - Retry Control Enhancements

Status: completed
Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-core/src/types/runtime.ts`, `packages/flux-runtime/src/operation-control.ts`, `packages/flux-runtime/src/request-runtime.ts`, `packages/flux-runtime/src/action-runtime-core.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/index.ts`, `packages/flux-runtime/src/runtime-action-helpers.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-submit-flow.ts`, focused action/source/form tests

- [x] Extend shared retry result metadata to include failure count and last failure reason.
- [x] Add exponential-backoff support while preserving the current fixed-delay default unless explicitly enabled.
- [x] Make opt-in backoff author-visible by extending the existing retry config surface with explicit strategy fields rather than inventing ad hoc runtime-only behavior.
- [x] Keep retry control ownership on enclosing action/source/form request entry points rather than moving it into `ApiSchema`; only extend schema-owned control types if new author-visible retry fields are truly required.
- [x] For `data-source`, read retry/backoff control from `DataSourceSchema`'s existing action-style top-level control surface, never from `ApiSchema`.
- [x] For ajax actions, keep the existing action-level retry/control surface as the only author-visible config source, but bypass dispatcher-level retry once request-owned retry is in place so request-backed actions have exactly one retry executor.
- [x] Establish a single retry owner for request-backed work: request execution owns retry/backoff for ajax actions, submit-form requests, and data-source fetches, while dispatcher-level retry remains only for non-request action results if still needed.
- [x] Move request retry/backoff ownership into the shared request execution path so ajax actions, submit-form requests, and data sources consume the same retry semantics instead of reimplementing them separately.
- [x] Ensure shared retry handles the real request failure mode: thrown fetch/request errors and `executeApiSchema()`-thrown non-OK responses must participate in retry/backoff and failure metadata.
- [x] Keep async validation requests one-shot in this plan unless a caller already opts into retry through an explicit validation-owned follow-up design; this plan's request-owned retry scope excludes validation.
- [x] Thread retry failure metadata into data-source state so source status can report retry failures.
- [x] Update action runtime to consume the expanded retry result without changing existing success/failure classification semantics.

Exit Criteria:

- [x] `withRetry()` supports fixed delay and opt-in exponential backoff.
- [x] The retry config contract is explicit and documented, with backward-compatible defaults for existing `{ times, delay }` shapes.
- [x] Focused tests cover failure counting, last failure reason, and backoff timing behavior.
- [x] Shared request execution applies the same retry policy to ajax actions, submit-form requests, and data-source fetches when configured.
- [x] Focused tests prove request-backed work does not apply the same schema retry policy twice.
- [x] Focused tests or code-path audit prove validation request execution remains one-shot after this slice.
- [x] Focused tests or code-path audit prove form submit now follows the same single-owner retry semantics as ajax and data-source request execution.
- [x] Data-source runtime can expose retry failure metadata after failed attempts.

### Phase 4 - Action `onSettled`

Status: completed
Targets: `packages/flux-core/src/types/actions.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/action-runtime-core.ts`, `packages/flux-runtime/src/__tests__/runtime-actions-chained.test.ts`, `docs/architecture/action-algebra-formal-spec.md`

- [x] Extend `ActionSchema` with `onSettled` in the same family as `then` and `onError`.
- [x] Update action dispatch so `onSettled` runs after `then` on success-class results and after `onError` on failure-class results.
- [x] Define the chained result context visible to `onSettled` and document it explicitly: `onSettled` reads the original triggering result, not a replacement branch result.
- [x] Preserve existing return semantics by making `onSettled` side-effect-only for chain propagation: it must not replace the action result returned from the main step or its `then`/`onError` branch.
- [x] Define `onSettled` failure handling explicitly: if `onSettled` itself fails, runtime reports that failure through existing framework/plugin error reporting, but the original triggering result remains the returned chain result.
- [x] Define skipped-result behavior explicitly and keep it stable in docs and tests instead of leaving it implicit.
- [x] Add loop-safe chaining behavior consistent with the current dispatcher model.

Exit Criteria:

- [x] Focused tests prove `onSettled` runs for both success-class and failure-class results.
- [x] Focused tests prove skipped actions do not run `onSettled` unless this plan is explicitly revised to choose otherwise.
- [x] Focused tests prove `onSettled` does not overwrite the result returned to the outer sequential chain.
- [x] Focused tests prove `onSettled` failures are reported without replacing the original branch result.
- [x] Architecture docs reflect the final branch semantics.

## Validation Checklist

- [x] Live repo baseline was re-audited before execution and this plan matches current file names and contracts.
- [x] Focused runtime tests cover the new data-source state model.
- [x] Focused runtime tests cover structural sharing behavior.
- [x] Focused runtime tests cover retry metadata and backoff behavior.
- [x] Focused runtime tests cover `onSettled` semantics.
- [x] `docs/architecture/api-data-source.md` updated if source state/statusPath contract changes.
- [x] `docs/architecture/action-algebra-formal-spec.md` updated for `onSettled`.
- [x] `docs/logs/2026/04-16.md` updated with implementation and review notes.
- [x] Independent subagent closure/review evidence recorded before marking this plan completed.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Risks And Rollback

- Changing `DataSourceController.getState()` is a contract change for runtime debug snapshots and focused tests. Mitigation: update all in-repo call sites in the same slice and preserve the external `statusPath` summary DTO.
- Structural sharing can accidentally suppress meaningful writes if applied too broadly. Mitigation: keep the optimization local to source publication and cover arrays/objects/primitive transitions with focused tests.
- `onSettled` can create ambiguous branch semantics if it observes the wrong result object. Mitigation: lock the chosen semantics in docs and tests before expanding implementation.

## Closure

Status Note: Implementation slices for all four phases are landed and package-local verification is green. The plan remains partially completed because workspace-wide `build`, `lint`, and `test` are still blocked by issues outside this plan-owned surface.

Closure Audit Evidence:

- Reviewer / Agent: independent fresh-session review against the live plan/code baseline
- Evidence: independent plan audits converged before execution against `docs/plans/43-tanstack-query-inspired-runtime-improvement-plan.md`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/request-runtime.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, and related architecture docs; implementation verification is green for `pnpm --filter @nop-chaos/flux-runtime typecheck`, `pnpm --filter @nop-chaos/flux-runtime test`, and workspace `pnpm build`, while workspace `lint`/`test` remain blocked by unrelated package failures outside this plan-owned surface.

Follow-up:

- Re-run workspace-wide verification after unrelated blockers are cleared, then perform a fresh closure audit before marking this plan completed.
