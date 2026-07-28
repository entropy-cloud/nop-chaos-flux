# 2 Code Quality & Styling Compliance

> Plan Status: active
> Last Reviewed: 2026-07-28
> Source: `docs/audits/2026-07-28-0814-multi-audit-audit-remediation.md` (D04, D11, D15), `docs/audits/2026-07-28-0814-open-audit-audit-remediation.md` (P0-E, P0-F, P0-G, P0-H, P1-A through P1-I)
> Related: `docs/plans/2026-07-28-0900-1-async-safety-and-error-propagation.md`, `docs/plans/2026-07-28-0900-3-infrastructure-and-build-tooling.md`

## Purpose

Fix 4 P0 + 13 P1 code quality findings: resolve styling contract violations (form actions, container flex), eliminate React Compiler redundancy (~46 hand-written `useMemo`/`useCallback` without opt-out in form/content/basic), tighten type safety (103 test files `as any`, `Record<string, any>` exports, non-null assertions, `as T` casts), fix performance hot paths (JSON.stringify, LRU cache, Object.freeze), consolidate dual-state patterns in flow designer, fix kanban drag handle button, and fix useEffect-derived-state anti-patterns.

## Current Baseline

- `form.tsx:650` form-actions region hardcodes `flex justify-end gap-2` — violates styling contract for layout renderers.
- `container.tsx:56` hardcodes `'flex'` class — same violation.
- 6 `useMemo` in form.tsx, 28 in flux-renderers-content, 12 in flux-renderers-basic — none have Compiler opt-out comments. Additionally, ~13 `useCallback` in flux-renderers-content (card, diff-view) and ~2 `React.memo` across target files also lack opt-out.
- 103 test files use `as any` casts (top offender: 59 in action-adapter.builtins.test.ts).
- `flux-core` exports `Record<string, any>` in 20+ public interfaces across types/runtime.ts, types/actions.ts, types/scope.ts, types/renderer-core.ts.
- `path.ts` `rememberParsedPath`: LRU evicts delete-then-set causing V8 rehashing; cache can exceed MAX by 1.
- `path.ts` `Object.freeze` on intermediate array wasted because return value is `[...result]`.
- `renderer-env.ts`: 5 non-null assertions on optional env fields (fetcher, stream, openSocket).
- `nested-regions.ts:20-37` `validateRegionParams` throws Error instead of emitting SchemaDiagnosticCollector diagnostics.
- `runtime-eval-helpers.ts:39,43` and `node-runtime.ts:88` — `as T` casts on every node evaluation hot path.
- `video.tsx:36-38` / `audio.tsx:26-28` — `useEffect(() => setErrored(false), [src])` derived-state anti-pattern.
- `use-xyflow-sync.ts:83-105` — dual node/edge state between Zustand store and xyflow local state.
- `use-surface-renderer.ts:69-70, 107-134` — ScopeRef in both useState and useRef.
- `designer-page-body.tsx:187-188, 210, 231` — creatingNode in both useState and useRef, inconsistent read.
- `kanban-column-header.tsx:111-121` — drag handle uses `<div role="button">` instead of `<Button>` when Button already imported.
- `node-renderer-resolved.tsx:74-77` — JSON.stringify(instancePath) per render on hot path.
- `dynamic-renderer.tsx:35-45` — JSON.stringify(loadAction) as cache key.

## Goals

- Form actions and container renderers emit marker classes only (no hardcoded flex/gap).
- All 46 redundant `useMemo`/`useCallback` + 2 `React.memo` instances across form/content/basic have Compiler opt-out or are removed.
- Type safety: Reduce `as any` in test files with explicit type narrowing where feasible; add type assertions at known boundaries for `Record<string, any>` exports.
- `path.ts` LRU cache stays within capacity; Object.freeze removed.
- `renderer-env.ts` casts replaced with explicit null checks or proper contract enforcement.
- `validateRegionParams` uses diagnostic collector instead of throwing.
- `runtime-eval-helpers.ts` `as T` casts guarded with runtime type narrowing.
- Flow designer dual-state: consolidates to single source.
- `kanban-column-header` drag handle uses `<Button>`.
- JSON.stringify hot paths replaced with cheaper comparison or stable reference.
- `video.tsx`/`audio.tsx` error reset uses render-time derivation.

## Non-Goals

- Not performing audit-tool baseline reduction (separate concern — Plan 3).
- Not adding tests for the fixed behaviors beyond focused regression tests.
- Not redesigning flow designer sync architecture — only consolidating confirmed dual-state patterns.

## Scope

### In Scope

- `form.tsx:650`: move hardcoded layout classes to marker-based with schema-driven className.
- `container.tsx:56`: replace hardcoded `flex` with marker class or schema-driven display property.
- 46 `useMemo`/`useCallback` sites: add `'use no memo'` or `eslint-disable-next-line react-compiler/react-compiler` or remove if trivial.
- `as any` reduction: add explicit types to top 5 offender test files as proof of pattern.
- `Record<string, any>`: replace with `Record<string, unknown>` + assertion boundaries in key export interfaces.
- `path.ts`: fix LRU eviction to check size before set; remove Object.freeze.
- `renderer-env.ts`: replace `as StreamFetcher`/`as NonNullable<>` with explicit contract enforcement.
- `nested-regions.ts`: route validation errors through SchemaDiagnosticCollector.
- `runtime-eval-helpers.ts + node-runtime.ts`: add runtime type guards before `as T` or document why cast is safe.
- `video.tsx`/`audio.tsx`: replace useEffect error reset with render-time derivation.
- `use-xyflow-sync.ts`: consolidate dual state.
- `use-surface-renderer.ts`: eliminate useState for scope, use ref only.
- `designer-page-body.tsx`: consolidate creatingNode access pattern.
- `kanban-column-header.tsx`: replace `<div role="button">` with `<Button>`.
- `node-renderer-resolved.tsx`: replace JSON.stringify with isEqual or stable ref.
- `dynamic-renderer.tsx`: replace JSON.stringify with subset identifying fields.

### Out Of Scope

- `as any` reduction across all 103 test files (only top-5 offenders as proof items).
- Full `Record<string, any>` cleanup in schema types (only export boundary interfaces).
- Designer sync architecture redesign (only the 3 confirmed dual-state patterns).

## Failure Paths

| Scenario                          | Trigger                                 | Behavior                                                     | Retry | User Visible            |
| --------------------------------- | --------------------------------------- | ------------------------------------------------------------ | ----- | ----------------------- |
| Container schema display override | User passes `display: "grid"` in schema | Container respects schema override instead of hardcoded flex | No    | Layout follows schema   |
| Form actions custom className     | User passes slotProps.actionsClassName  | Custom class merges correctly without `!important`           | No    | Custom styling applies  |
| Render tree JSON.stringify fix    | Large form with 1000+ nodes             | No observable difference (performance improvement)           | No    | Same behavior, less CPU |

## Test Strategy

本档选择：`建议有测` — Most changes are cleanup/refactoring. Focused tests for behavior-preserving refactors only where regression risk is non-trivial (styling contract, eval cast safety).

## Execution Plan

### Phase 1 — Styling Contract Compliance

Status: planned
Targets: `flux-renderers-form/src/renderers/form.tsx`, `flux-renderers-basic/src/container.tsx`

- Item Types: `Fix`

- [ ] P0-E — form.tsx: replace hardcoded `flex justify-end gap-2` on form-actions slot with marker class + schema-driven `slotProps.actionsClassName`
- [ ] P1-A — container.tsx: replace hardcoded `'flex'` with marker class or derive from schema display property

Exit Criteria:

- [ ] Form actions slot uses marker class only; schema `slotProps.actionsClassName` works without `!important`
- [ ] Container uses no hardcoded Tailwind layout classes

### Phase 2 — React Compiler Redundancy Cleanup

Status: planned
Targets: `flux-renderers-form/src/renderers/form.tsx`, `flux-renderers-content/src/` (diff-view, card, image, mapping), `flux-renderers-basic/src/` (interaction-owner, loop, recurse, page, tabs, use-surface-renderer)

- Item Types: `Fix | Decision`

- [ ] P0-F — form.tsx: add `'use no memo'` directive or remove 6 redundant useMemo
- [ ] P0-G — content package: add opt-out comments or remove 28 redundant memo/callback/useMemo (diff-view + card)
- [ ] P1-B — basic package: add opt-out comments or remove 12 redundant memo/callback/useMemo

Exit Criteria:

- [ ] No hand-written useMemo/useCallback/memo in target files without Compiler opt-out comment
- [ ] `pnpm typecheck` passes

### Phase 3 — Type Safety & Cast Tightening

Status: planned
Targets: `flux-core/src/types/runtime.ts`, `flux-core/src/types/actions.ts`, `flux-core/src/types/scope.ts`, `flux-core/src/types/renderer-core.ts`, `flux-core/src/utils/renderer-env.ts`, `flux-core/src/nested-regions.ts`, `flux-runtime/src/runtime-eval-helpers.ts`, `flux-runtime/src/node-runtime.ts`, top-5 `as any` offender test files

- Item Types: `Fix | Decision | Proof`

- [ ] P0-H — add focused proof: fix `as any` in top-5 offender test files (add explicit types, reduce count by at least 50% in those 5 files)
- [ ] P1-E — replace `Record<string, any>` with `Record<string, unknown>` + assertion boundaries in key exported interfaces
- [ ] P1-F — renderer-env.ts: replace non-null assertions with explicit null-checks or document contract
- [ ] P1-G — nested-regions.ts: route validateRegionParams errors through SchemaDiagnosticCollector instead of throwing
- [ ] P1-H — runtime-eval-helpers.ts + node-runtime.ts: add runtime type guards before `as T` casts on evaluation hot path

Exit Criteria:

- [ ] Top-5 test files reduced `as any` usage by ≥50%
- [ ] Key public interfaces use `Record<string, unknown>` not `Record<string, any>`
- [ ] renderer-env.ts has no bare non-null assertions on optional env fields
- [ ] validateRegionParams emits diagnostics instead of throwing Error
- [ ] Evaluation hot path casts are guarded or documented
- [ ] `pnpm typecheck` passes

### Phase 4 — Performance & Dual-State Fixes

Status: planned
Targets: `flux-core/src/utils/path.ts`, `flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-sync.ts`, `flux-renderers-basic/src/use-surface-renderer.ts`, `flow-designer-renderers/src/designer-page-body.tsx`, `flux-renderers-scheduling/src/kanban/kanban-column-header.tsx`, `flux-react/src/node-renderer-resolved.tsx`, `flux-renderers-basic/src/dynamic-renderer.tsx`, `flux-renderers-content/src/video.tsx`, `flux-renderers-content/src/audio.tsx`

- Item Types: `Fix`

- [ ] P1-C — path.ts: fix LRU eviction to check `cache.size >= MAX` before `cache.set()`
- [ ] P1-D — path.ts: remove `Object.freeze` on intermediate filtered array
- [ ] D04-01 — use-xyflow-sync.ts: consolidate dual node/edge state, evaluate fully controlled props
- [ ] D04-02 — use-surface-renderer.ts: eliminate useState for ScopeRef, use ref exclusively
- [ ] D04-03 — designer-page-body.tsx: consolidate creatingNode to single source (derive from `pendingCreateDialog`)
- [ ] D11-01 — kanban-column-header.tsx: replace `<div role="button">` with `<Button variant="ghost" size="sm">`
- [ ] D15-P1 — node-renderer-resolved.tsx: replace JSON.stringify(instancePath) with stable reference or isEqual
- [ ] D15-P2 — dynamic-renderer.tsx: replace JSON.stringify(loadAction) with subset identifying fields
- [ ] P1-I — video.tsx + audio.tsx: replace useEffect error reset with render-time derivation

Exit Criteria:

- [ ] path.ts LRU never exceeds MAX; no Object.freeze on path parse hot path
- [ ] Flow designer dual-state patterns consolidated to single source of truth
- [ ] kanban drag handle uses `<Button>` component
- [ ] JSON.stringify removed from hot-path renderers
- [ ] video/audio error state derived at render time, no useEffect
- [ ] `pnpm typecheck` passes

## Draft Review Record

> To be filled after independent sub-agent review.

- Reviewer / Agent: plan-review-subagent (fresh session)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: N/A (zero Blocker/Major)

## Closure Gates

- [ ] All 4 P0 findings (P0-E, P0-F, P0-G, P0-H) fixed and verified
- [ ] All 13 P1 findings (P1-A through P1-I, D04-01/02/03, D11-01, D15-P1/P2) fixed and verified
- [ ] Styling contract violations resolved in form and container renderers
- [ ] No redundant memo/callback/memo without Compiler opt-out in target files
- [ ] Top-5 `as any` test files reduced by ≥50%
- [ ] No hardcoded Tailwind layout classes in layout renderers
- [ ] No in-scope live defect or contract drift silently deferred to follow-up
- [ ] Affected owner docs updated (styling-system.md if marker class added)
- [ ] By independent sub-agent (fresh session) executed closure audit and recorded evidence; execution session did not self-audit or self-check this item
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### Full `as any` cleanup across all 103 test files

- Classification: `optimization candidate`
- Why Not Blocking Closure: Plan fixes top-5 offenders as proof items. Full cleanup is a larger effort that touches all packages and is properly tracked as a P2 follow-up rather than blocking the current code-quality closure.
- Successor Required: `no` (added to Follow-up Backlog)

### Full `Record<string, unknown>` migration in schema types

- Classification: `optimization candidate`
- Why Not Blocking Closure: Plan fixes only export boundary interfaces. Full migration of schema types is a broader change with higher regression risk and is tracked as a P2 follow-up.
- Successor Required: `no` (added to Follow-up Backlog)

## Non-Blocking Follow-ups

- `as any` cleanup in remaining 98 test files (P2 follow-up).
- `Record<string, unknown>` migration in non-export schema types.
- Path.ts rehashing optimization (P2, tracked in backlog).

## Closure

Status Note: TBD

Closure Audit Evidence:

- Auditor / Agent: TBD
- Evidence: TBD

Follow-up:

- No remaining plan-owned work.
