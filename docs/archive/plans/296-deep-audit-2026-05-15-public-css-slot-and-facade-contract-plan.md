# 296 Deep Audit 2026-05-15 Public CSS Slot And Facade Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-deep-audit-full/10-styling.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/283-deep-audit-2026-05-14-styling-ui-and-accessibility-plan.md`

## Purpose

收口 Flux 默认样式层的 retained public CSS drift：`default-spacing.css` 裸 slot selector 跨包泄漏，以及 facade `style.css` 仍暴露失效 BEM selector。

## Current Baseline

- `10-01` 仍 live：`packages/flux-react/src/default-spacing.css` 的裸 `[data-slot]` 选择器会命中 `@nop-chaos/ui` 同名 slot。
- `10-02` 仍 live as P2：`packages/flux-bundle/src/style.css` 仍暴露与 live DOM 不一致的 BEM selector。
- 审计汇总已把这组问题归类为 Flux 默认样式层的 package/public CSS contract leakage。

## Goals

- Close retained `10-01` and `10-02` on one supported public CSS baseline.
- Make default spacing and facade CSS agree with current slot/marker contracts without cross-package leakage.

## Non-Goals

- 不接管 spreadsheet canvas tokenization candidate。
- 不做 unrelated visual redesign。

## Scope

### In Scope

- `10-01`
- `10-02`
- `packages/flux-react/src/default-spacing.css`
- `packages/flux-bundle/src/style.css`
- related styling docs and `docs/logs/2026/05-15.md`

### Out Of Scope

- `10-03`
- any retained ID not listed above

## Execution Plan

### Phase 1 - Default Spacing Root Scoping

Status: completed
Targets: `packages/flux-react/src/default-spacing.css`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix `10-01` by scoping default-spacing slot rules to owned Flux roots instead of bare shared slot names.
- [x] Add focused proof that package-owned default spacing no longer styles plain `@nop-chaos/ui` slots outside Flux-owned roots.
- [x] Update affected styling docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Retained `10-01` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused proof covers owned-root slot scoping.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

Phase Notes:

- `packages/flux-react/src/default-spacing.css` now scopes the retained tabs and field slot defaults under Flux-owned roots and field wrappers instead of bare shared `[data-slot]` selectors.
- Focused proof lives in `packages/flux-react/src/__tests__/default-spacing-contract.test.ts`, which directly proves the scoped selectors exist and the bare shared selectors do not.
- `docs/architecture/container-spacing-design.md` now documents the scoped `tabs-content` baseline and the `.nop-field`-scoped field slot styling baseline.

### Phase 2 - Facade Selector Contract Cleanup

Status: completed
Targets: `packages/flux-bundle/src/style.css`, focused tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] Fix `10-02` by removing or replacing facade selectors that no longer match the live DOM contract.
- [x] Add focused proof that the facade CSS now matches supported slot/marker selectors on the touched surface.
- [x] Update affected styling docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [x] Retained `10-02` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused proof covers the repaired facade CSS contract.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` includes Phase 2 execution notes.

Phase Notes:

- `packages/flux-bundle/src/style.css` now targets the live node-error slot selectors rather than stale `.nop-node-error__*` BEM names.
- Focused proof lives in `packages/flux-bundle/src/index.test.tsx`, which directly proves the repaired node-error selectors are present and the stale BEM selectors are absent.
- No additional styling doc update was required beyond `docs/architecture/container-spacing-design.md`, this plan, and `docs/logs/2026/05-15.md`.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.
- [x] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [x] Focused verification for all in-scope defect families has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

Phase Notes:

- Focused verification passed via `pnpm --filter @nop-chaos/flux-react exec vitest run src/__tests__/default-spacing-contract.test.ts` and `pnpm --filter @nop-chaos/flux exec vitest run src/index.test.tsx`.
- Fresh workspace hard gates are green, with the latest `pnpm test` output saved at `C:\Users\a758371\.local\share\opencode\tool-output\tool_e2b4ca192001NVjp6fzrHZFpoI`.
- Independent closure audit passed via `ses_1d4a5aa4affeBxJVa0UGj4YbF6`.

## Closure Gates

- [x] All in-scope confirmed live defects (`10-01`, `10-02`) are fixed.
- [x] Default-spacing and facade CSS contracts converge to one supported public baseline.
- [x] Necessary focused verification exists for every touched defect family.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed. The default-spacing and facade stylesheets now match the supported scoped slot baseline, focused verification is complete, the styling doc is synced, and independent closure audit found no remaining plan-owned blocker.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d4a5aa4affeBxJVa0UGj4YbF6`
- Evidence: Re-read this plan, `docs/analysis/2026-05-15-deep-audit-full/10-styling.md`, `docs/logs/2026/05-15.md`, `packages/flux-react/src/default-spacing.css`, `packages/flux-react/src/__tests__/default-spacing-contract.test.ts`, `packages/flux-bundle/src/style.css`, `packages/flux-bundle/src/index.test.tsx`, and `docs/architecture/container-spacing-design.md`. Confirmed the retained selectors are now scoped under Flux-owned roots/wrappers, the facade ships the repaired node-error slot selectors and not the stale BEM names, the owner doc matches the live baseline, and fresh workspace verification is green.

Follow-up:

- None currently.
