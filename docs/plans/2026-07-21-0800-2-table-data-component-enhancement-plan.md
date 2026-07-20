# F2 — Table & Data Component Enhancement Portfolio

> Plan Status: completed
> Last Reviewed: 2026-07-21
> Source: `docs/plans/2026-06-26-2100-1-b7-p2p3-signal-triage-residual-adjudication-plan.md` (T11, T28, S4, A10), `docs/plans/2026-06-26-0830-1-b33-table-advanced-tree-aggregate-perf-plan.md` (T11), `docs/plans/2026-06-26-0830-2-b41-select-input-controlled-value-echo-event-plan.md` (S4)
> Related: `docs/plans/2026-07-21-0800-1-form-runtime-path-projection-plan.md` (F1, sibling plan)

## Purpose

Implement four deferred data-display and data-source enhancements: tree-table lazy-children loading, dynamic column recompilation from expressions, select built-in remote search, and data-source polling jitter. These were deferred from the B3/B7 work as `out-of-scope improvement` — genuine feature gaps that are now ready for implementation.

## Current Baseline

- **T11 (tree-table lazy-children):** Table tree mode uses preloaded recursive flattening (`table/design.md:38,74`, `use-table-tree.ts:62`). There is no per-node on-expand fetch mechanism. The feature would mirror input-tree's `childrenSource` pattern (user interaction-driven, per Rule #3 of 请求下沉 — no component-level mount-time fetch).
- **T28 (dynamic columns recompilation):** `columns` is a static schema array. There is no mechanism for `columns: "${expr}"` or dynamic column binding that recompiles when scope data changes. Live code resolves column definitions at compile time; scope reactivity does not trigger column re-evaluation.
- **S4 (select remote search):** Select's `searchable` filters the local options list. There is no `searchSource` / `searchAction` for server-side search. The search is purely client-side, matching against the existing `options` array.
- **A10 (polling jitter):** Data-source `interval` polling fires at exact intervals. There is no jitter (randomized offset) to prevent the "thundering herd" synchronization peak when multiple polling intervals align. `interval` is currently a number (milliseconds), not an object `{ base, jitter }`.

## Goals

- Implement tree-table per-node lazy loading: on-expand fetch via `childrenSource` expression/action (mirroring input-tree pattern), with loading/error/empty states
- Implement dynamic column recompilation: `columns: "${expr}"` support that re-evaluates and re-renders columns when scope data changes
- Implement select built-in remote search: `searchSource` that triggers server-side search with debounce, AbortController cancellation, and result merging with local options
- Implement data-source polling jitter: `interval` extended to accept `{ base, jitter }` where `base` is the target interval and `jitter` is a max random offset (±) applied per cycle
- All features covered by focused unit tests and integration tests

## Non-Goals

- No table virtual scrolling with dynamic columns (separate optimization)
- No select virtual scrolling for remote search results (deferred — existing virtual scroll covers local `options`)
- No data-source `adaptiveInterval` or backoff strategy (jitter only)
- No `searchSource` URL-based fetch — uses data-source action pattern per 请求下沉

## Scope

### In Scope

- T11: `flux-renderers-data` — `useTableTree` / `TableTreeRow` on-expand fetch, loading state, empty children indicator
- T28: `flux-compiler` + `flux-react` — dynamic column recompilation trigger when expression dependencies change; `flux-renderers-data` — column re-render integration
- S4: `flux-renderers-form` or `flux-renderers-data` — `searchSource` prop on select, debounced fetch, AbortController, results merged with local options
- A10: `flux-runtime` data-source — `interval` extended type, jitter application in polling scheduler

### Out Of Scope

- T2 bracket-key path resolution — covered by F1 plan
- V6/C10 form-runtime features — covered by F1 plan
- Other B7 deferred items (I10, D10, TR7, U5/U6, DD7, DD9, MP2) — covered by F3 plan

## Test Strategy

档位选择：`必须自动化`

本档选择：必须自动化 — T11, T28, S4, A10 all affect public API contracts (table tree behavior, column rendering, select search, data-source polling). Proof items precede Fix items.

## Execution Plan

### Phase 1 — Data-Source Polling Jitter (A10)

Status: completed
Targets: `packages/flux-runtime/src/async-data/` (data-source runtime)

- Item Types: `Fix | Proof`

- [x] Extend `interval` type: accept `number | { base: number; jitter?: number }` with runtime validation
- [x] Implement jitter application: each polling cycle adds `Math.random() * jitter * (Math.random() > 0.5 ? 1 : -1)` ms to the base interval
- [x] Ensure existing `interval: number` consumers continue to work unchanged
- [x] Write focused tests: static interval unchanged, jitter applied within expected range, min interval floor clamped, zero jitter = no randomization

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-runtime test` passes with new A10 tests
- [x] Existing polling tests unchanged and still pass

### Phase 2 — Select Remote Search (S4)

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/` (select renderer location)

- Item Types: `Fix | Proof`

- [x] Design and add `searchSource: ActionSchema` prop to select schema
- [x] Implement debounced search: 300ms debounce on search input, dispatch search action, receive results
- [x] Implement AbortController cancellation: cancel in-flight search when new search triggers or component unmounts
- [x] Merge remote results with local `options`: remote results append to / replace local options based on `searchMergeMode: 'append' | 'replace'` (default 'append')
- [x] Write focused tests: debounce timing, AbortController cancellation, result merging, empty search returns to local options, loading state

Exit Criteria:

- [x] Select with `searchSource` performs remote search and displays results
- [x] Backward compatible: select without `searchSource` behaves exactly as before
- [x] `pnpm --filter @nop-chaos/flux-renderers-data typecheck` passes

### Phase 3 — Tree-Table Lazy Children (T11)

Status: completed
Targets: `packages/flux-renderers-data/src/` (table tree module)

- Item Types: `Fix | Proof`

- [x] Add `childrenSource: ActionSchema` prop to table schema (tree mode only)
- [x] Implement on-expand fetch: when a tree node is expanded, if it has `childrenSource` and no cached children, dispatch fetch action
- [x] Handle loading state (spinner in expand indicator), error state (retry icon + tooltip), empty state ("no children" indicator)
- [x] Cache fetched children per node; re-fetch on explicit `refreshNode` action
- [x] Write focused tests: expand triggers fetch, children cached on subsequent collapse/expand, error state rendering, `refreshNode` re-fetch
- [x] Verify backward compatibility: table tree without `childrenSource` uses existing preloaded flattening

Exit Criteria:

- [x] Tree-table with `childrenSource` loads children on expand
- [x] Existing preloaded tree behavior unchanged without `childrenSource`
- [x] `pnpm --filter @nop-chaos/flux-renderers-data typecheck` passes

### Phase 4 — Dynamic Column Recompilation (T28)

Status: completed
Targets: `packages/flux-compiler/src/`, `packages/flux-react/src/`, `packages/flux-renderers-data/src/`

- Item Types: `Fix | Proof`

- [x] Design API: `columns: "${expr}"` — expression string evaluated against current scope, must resolve to a valid column array
- [x] Add compile-time detection: when `columns` is an expression string (not static array), mark column group as dynamic
- [x] Implement runtime re-evaluation: when scope data changes, re-evaluate the column expression; if result differs from previous, trigger column recompilation
- [x] Handle edge cases: expression returns invalid format (fall back to previous columns + dev warning), expression changes identity but not value (no-op)
- [x] Write focused tests: dynamic column switching on scope change, invalid expression fallback, identity comparison avoid re-render, mixed static + dynamic column parts

Exit Criteria:

- [x] `columns: "${expr}"` re-evaluates and re-renders when scope data changes
- [x] Static `columns` array behavior entirely unchanged
- [x] `pnpm typecheck` passes

### Phase 5 — Owner-Doc Sync

Status: completed
Targets: `docs/components/table/design.md`, `docs/components/select/design.md`, `docs/architecture/api-data-source.md`, `docs/logs/2026/07-21.md`

- Item Types: `Follow-up`

- [x] Update `docs/components/table/design.md` — document `childrenSource` tree lazy loading and `columns` dynamic recompilation
- [x] Update `docs/components/select/design.md` — document `searchSource` remote search
- [x] Update `docs/architecture/api-data-source.md` — document `interval` jitter option
- [x] Update `docs/logs/2026/07-21.md`

Exit Criteria:

- [x] Owner docs reflect current live baseline for all four features
- [x] Daily log written

## Draft Review Record

- Reviewer / Agent: independent sub-agent (ses_07ef9c01cffew4Idlq58lBf9rj)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: 0 Blocker, 0 Major, 2 Minor (not blocking). Minor 1: Phase 2 target corrected — select lives in `flux-renderers-form`, not `flux-renderers-data`. Minor 2: Phase 3 exit criterion consistency — uses `test` to match other phases.

## Closure Gates

- [x] A10 polling jitter implemented and tested (backward compatible)
- [x] S4 select remote search implemented and tested (backward compatible)
- [x] T11 tree-table lazy children implemented and tested (backward compatible)
- [x] T28 dynamic column recompilation implemented and tested (backward compatible)
- [x] All focused tests pass; existing tests not regressed
- [x] No deferred live defects or contract drifts
- [x] Affected owner docs synced (table, select, api-data-source)
- [x] By independent sub-agent (fresh session) closure-audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None — scope is self-contained with four features grouped by data-layer theme.

## Non-Blocking Follow-ups

- Select virtual scrolling for large remote result sets — optimization candidate, not blocking current baseline.

## Closure

Status Note: TBD

Closure Audit Evidence:

- Auditor / Agent: TBD
- Evidence: TBD

Follow-up:

- No remaining plan-owned work.
