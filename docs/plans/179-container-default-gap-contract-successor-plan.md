# 179 Container Default-Gap Contract Successor Plan

> Plan Status: completed
> Last Reviewed: 2026-05-02
> Source: `docs/analysis/2026-05-02-deep-audit-full/summary.md`, live code verification of `packages/flux-renderers-basic/src/container.tsx`, `packages/flux-react/src/default-spacing.css`, `docs/architecture/styling-system.md`, `docs/architecture/container-spacing-design.md`
> Related: `docs/plans/141-container-spacing-default-implementation-plan.md`, `docs/plans/176-deep-audit-residual-owner-assignment-plan.md`

## Purpose

Close the 2026-05-02 deep-audit residual that still leaves default container spacing split across two owners: package CSS for the bare path and hidden renderer code for the flex-child fallback path.

## Current Baseline

- `packages/flux-react/src/default-spacing.css:53-57` already supplies the default bare-container spacing baseline through package-owned CSS.
- But `packages/flux-renderers-basic/src/container.tsx:24-29` still injects `gap: 'var(--space-form-item-gap)'` from renderer code when the flex-child path is active without an explicit `gap` prop. This is mixed drift: live code and `docs/architecture/container-spacing-design.md` still preserve the inline fallback, but that baseline conflicts with `docs/architecture/styling-system.md`, which says layout defaults should live in package-owned CSS rather than hidden renderer-code defaults.

## Goals

- Remove the remaining renderer-code default-gap fallback from `container` while preserving one explicit shipped default-spacing owner.

## Non-Goals

- Do not reopen Plan 141's broader spacing-token rollout.
- Do not change unrelated renderers or broader styling contracts outside this one container residual.

## Scope

### In Scope

- `packages/flux-renderers-basic/src/container.tsx`
- `packages/flux-react/src/default-spacing.css`
- focused tests in `packages/flux-renderers-basic/src/__tests__/basic-renderer-contracts.test.ts` or a dedicated container-spacing test
- `docs/architecture/styling-system.md`
- `docs/architecture/container-spacing-design.md`
- `docs/logs/2026/05-02.md`

### Out Of Scope

- report preview
- word-editor naming

## Execution Plan

### Phase 1 - Container Default-Gap Contract Cleanup

Status: completed
Targets: `packages/flux-renderers-basic/src/container.tsx`, `packages/flux-react/src/default-spacing.css`, focused tests, `docs/architecture/styling-system.md`, `docs/architecture/container-spacing-design.md`, `docs/logs/2026/05-02.md`

- [x] Remove the flex-child inline fallback gap from renderer code.
- [x] Preserve the intended default-spacing baseline through explicit package-owned CSS or another explicit contract path.
- [x] Add focused coverage for the bare path and the flex-child path without explicit `gap` in `packages/flux-renderers-basic/src/__tests__/basic-renderer-contracts.test.ts` or a dedicated container-spacing test.

Exit Criteria:

- [x] `container.tsx` no longer injects default gap through renderer code.
- [x] The shipped default-spacing baseline still has one explicit owner path after the change.
- [x] Focused tests cover bare-path spacing ownership and the flex-child path without explicit `gap`.
- [x] `docs/architecture/styling-system.md` and `docs/architecture/container-spacing-design.md` describe the same final baseline.
- [x] `docs/logs/2026/05-02.md` records the container contract cleanup.

## Validation Checklist

- [x] container default spacing is no longer injected from renderer code
- [x] focused tests cover the in-scope container behavior family
- [x] independent closure audit confirms no remaining plan-owned residual in scope
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Plan 179 can close because the only retained residual was the renderer-owned default container gap fallback, and the live repo now moves that baseline entirely to package CSS while focused tests, docs, daily log, and repo-wide verification all align with the final contract.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent
- Evidence: fresh closure audit task `ses_21764aaecffe1sTk7zZKwkN9c1` returned `close` after re-checking `packages/flux-renderers-basic/src/container.tsx`, `packages/flux-react/src/default-spacing.css`, `packages/flux-renderers-basic/src/__tests__/slot-classname.test.tsx`, `docs/architecture/styling-system.md`, `docs/architecture/container-spacing-design.md`, and `docs/logs/2026/05-02.md`; no remaining in-scope residuals found.

Follow-up:

- No remaining plan-owned work. Broader spacing or styling work should move through separate successors instead of widening this closed plan.
