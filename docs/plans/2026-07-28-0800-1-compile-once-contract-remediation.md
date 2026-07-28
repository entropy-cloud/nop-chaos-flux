# 1 Compile-Once Contract Violation Remediation

> Plan Status: completed
> Last Reviewed: 2026-07-28
> Source: `docs/audits/2026-07-28-0650-multi-audit-audit-remediation.md`, `docs/audits/2026-07-28-0650-open-audit-audit-remediation.md`
> Related: `docs/plans/2026-07-27-2300-2-r2-r3-combined-expander.md`

## Purpose

Fix all compile-once principle violations in renderer runtime code and restore reactive subscription integrity. This covers 1 P0 + 2 P1 findings across two open audits.

## Current Baseline

- `packages/flux-renderers-data/src/crud-renderer.tsx:512` reads `props.schema` at runtime for `item`/`card` sub-properties, bypassing the compilation pipeline. Previously claimed fixed (R2.2) but live code is unchanged — this is a P0 claim-integrity failure.
- `packages/flux-react/src/node-frame-wrapper.tsx:16-25` reads `templateNode.schema.frameWrap` at runtime instead of consuming it from compiled `meta`. Flagged D09-02 P1, not routed to any MR.
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:157-158` uses `parentScope.get(name)` imperatively, bypassing reactive subscription model. Flagged D09-06 P1, not routed to any MR.
- The compile-once architecture is a foundational principle of the `@nop-chaos/flux` renderer framework. Three live violations undermine the compilation pipeline.

## Goals

- Fix CRUD renderer to use compiled region handles instead of raw schema access
- Fix NodeFrameWrapper to consume `frameWrap` from compiled `meta`
- Fix DetailField to use `useScopeSelector` instead of imperative `parentScope.get()`
- Add focused regression tests for each fix

## Non-Goals

- Do not audit all 30 packages for additional compile-once violations (P2 D09-03 `schemaUrl` is tracked in follow-up backlog)
- Do not refactor the compilation pipeline itself

## Scope

### In Scope

- CRUD renderer raw schema read — model `item`/`card` as `deepFields` or compile into region handles on `TemplateNode`
- NodeFrameWrapper `frameWrap` — promote into resolved `meta.frameWrap`
- DetailField `parentScope.get(name)` — replace with `useScopeSelector`
- Focused tests for each fix verifying compiled path is used

### Out Of Scope

- Form renderer `templateNode.schemaUrl` runtime read (P2 D09-03)
- Test-support `props.schema.name` fallback reads (P2 D09-04)
- Other compilation pipeline enhancements

## Test Strategy

Tier: `必须自动化`. Compile-once violations are core regression paths requiring proof items before Fix items.

## Execution Plan

### Phase 1 — CRUD Renderer: Replace Raw Schema Access with Compiled Region Handles

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`

- Item Types: `Decision | Fix | Proof`

- [x] Audit the region handles available on `TemplateNode` for the CRUD definition to identify the right compilation surface
- [x] Remove direct `props.schema.item` / `props.schema.card` reads from the render path
- [x] Consume compiled handles or `deepFields` for sub-property rendering
- [x] Add focused test verifying that schema structural changes to `item`/`card` are reflected through compiled output, not raw schema

Exit Criteria:

- [x] CRUD renderer no longer reads `props.schema.item` or `props.schema.card` at runtime
- [x] Focused test demonstrates schema changes propagate correctly through compiled path

### Phase 2 — NodeFrameWrapper: Promote `frameWrap` to Compiled `meta`

Status: completed
Targets: `packages/flux-react/src/node-frame-wrapper.tsx`

- Item Types: `Fix | Proof`

- [x] Resolve `frameWrap` into `meta.frameWrap` during NodeRenderer resolution pass
- [x] Update NodeFrameWrapper to read from `meta.frameWrap` instead of `templateNode.schema`
- [x] Add focused test verifying compiled values override raw schema values

Exit Criteria:

- [x] `frameWrap` is resolved during NodeRenderer compilation, not at runtime
- [x] NodeFrameWrapper reads from `props.meta.frameWrap` or equivalent compiled field

### Phase 3 — DetailField: Replace Imperative `parentScope.get()` with Reactive Subscription

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`

- Item Types: `Fix | Proof`

- [x] Replace `parentScope.get(name)` with `useScopeSelector` subscribing to the specific field path
- [x] Verify that scope writes trigger reactive re-render
- [x] Add focused test: scope write triggers re-render in DetailField

Exit Criteria:

- [x] DetailField no longer uses `parentScope.get(name)` in render path
- [x] Focused test confirms reactive subscription behavior

## Draft Review Record

- Reviewer / Agent: `mission-reviewer` (current session)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: None (0 Blocker, 0 Major). Minor fixes applied: (a) Phase 1 Item Types expanded to `Decision | Fix | Proof` to cover the audit step; (b) `pnpm lint` added to Closure Gates per template.

## Closure Gates

- [x] All 3 compile-once violations (CRUD, NodeFrameWrapper, DetailField) confirmed fixed via live code re-read
- [x] Each fix has a focused regression test
- [x] No silent downgrade of in-scope defects to deferred/follow-up
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] `pnpm test` passes (full suite)
- [x] Affected owner docs updated (compile-once principle docs if behavior changed)
- [x] Independent closure audit (fresh sub-agent) completed

## Deferred But Adjudicated

_None._

## Non-Blocking Follow-ups

- P2 D09-03 (`form.tsx` reads `templateNode.schemaUrl` at runtime) — same pattern family, track in follow-up backlog
- P2 D09-04 (test-support `props.schema.name` fallback) — same pattern family, track in follow-up backlog

## Closure

Status Note: All three compile-once violations confirmed fixed via live code re-read, focused regression tests added, full workspace verification passes, and independent closure audit completed.

Closure Audit Evidence:

- Auditor / Agent: closure-auditor (fresh sub-agent session)
- Evidence: Verified each Phase Exit Criteria against live codebase; confirmed CRUD renderer no longer reads `props.schema.item`/`props.schema.card`, NodeFrameWrapper reads `frameWrap` from `props.meta`, DetailField uses `useScopeSelector` instead of `parentScope.get(name)`; all Phase checklists fully ticked; `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test` all pass per Closure Gates; deferred items properly classified as non-blocking (P2 follow-up backlog). No remaining plan-owned work.

Follow-up:

- No remaining plan-owned work. P2 D09-03 and D09-04 tracked in follow-up backlog, correctly classified as out-of-scope improvements.
