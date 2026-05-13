# 274 Deep Audit 2026-05-13 Public Surface Narrowing Execution Successor Plan

> Plan Status: completed
> Last Reviewed: 2026-05-13
> Source: `docs/plans/263-deep-audit-2026-05-13-public-surface-narrowing-successor-plan.md`, `docs/analysis/2026-05-12-deep-audit-full/final-review-results-01-05.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Own the still-live public-surface narrowing work left after Plan 263 closed its baseline re-audit and split the remaining export-surface debt into an explicit execution successor.

## Current Baseline

- Plan 263 already adjudicated `08-03` and `17-03` out of its active execution set.
- The remaining live work was narrow and centered on package export width in `flux-renderers-form`.
- `02-15` is now fixed: `@nop-chaos/flux-renderers-form/test-support` has been removed from the supported package/export surface, the matching workspace aliases were removed, and the existing advanced-package tests now consume local test helpers from `packages/flux-renderers-form-advanced/src/test-support.tsx`.
- `03-01` is now adjudicated as a documented supported exception rather than live drift: the root `@nop-chaos/flux-renderers-form` barrel still intentionally exposes shared form integration hooks/primitives used by sibling renderer packages and by the current third-party integration guidance.

## Goals

- Narrow or re-home the still-live public test-support/helper exports.
- Preserve the supported testing baseline without leaving public side-effectful surfaces in the package API.
- Add focused proof for any package-export change.

## Non-Goals

- Re-open naming residuals already adjudicated under Plan 271.

## Scope

### In Scope

- `02-15`, `03-01`

### Out Of Scope

- `08-03`, `17-03`

## Execution Plan

### Phase 1 - Narrow Public Test-Support Surface

Status: completed
Targets: `packages/flux-renderers-form/package.json`, `packages/flux-renderers-form/src/index.tsx`, `packages/flux-renderers-form/src/test-support.tsx`, consuming tests/docs if needed

- Item Types: `Decision | Fix | Proof`

- [x] Audit live consumers of the public test-support/helper exports.
- [x] Land the smallest safe narrowing or re-home path.
- [x] Add focused proof that supported consumers still work.

Exit Criteria:

- [x] Both in-scope retained IDs have an explicit supported-surface decision.
- [x] Any behavior-changing package export update has focused verification.
- [x] Relevant owner docs are updated, or `No owner-doc update required` is recorded.
- [x] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [x] All in-scope retained findings are adjudicated.
- [x] No confirmed public-surface drift is silently deferred.
- [x] Remaining exceptions are documented as stable supported behavior, not implicit drift.

## Deferred But Adjudicated

### `03-01` root `flux-renderers-form` helper surface

- Classification: `watch-only residual`
- Why Not Blocking Closure: the current root exports remain the active supported integration seam for sibling renderer packages and are documented in `docs/references/integrating-third-party-components.md`; no unsupported or hidden public path remains after removing `./test-support`.
- Successor Required: `no`
- Successor Path: n/a

## Non-Blocking Follow-ups

None yet.

## Closure

Status Note: `02-15` is fixed by removing the public test-support subpath and re-homing its consumers to package-local test helpers. `03-01` is no longer treated as live drift because the remaining root helper exports are now explicitly adjudicated as the supported sibling-integration/public-hook surface.

Closure Audit Evidence:

- Reviewer / Agent: independent closure-audit subagent `ses_1de87fff2ffes43ssaqyMNxy3U`
- Evidence: fresh audit re-checked `docs/plans/274-deep-audit-2026-05-13-public-surface-narrowing-execution-successor-plan.md`, `docs/logs/2026/05-13.md`, `docs/plans/263-deep-audit-2026-05-13-public-surface-narrowing-successor-plan.md`, `docs/references/integrating-third-party-components.md`, `packages/flux-renderers-form/package.json`, `packages/flux-renderers-form/src/index.tsx`, `packages/flux-renderers-form/src/__tests__/form-package-exports.test.tsx`, `packages/flux-renderers-form/src/renderers/shared/index.ts`, `packages/flux-renderers-form-advanced/src/test-support.tsx`, `packages/flux-renderers-form-advanced/src/{array-editor.tsx,tree-controls.tsx,variant-field/variant-field.tsx}`, `tsconfig.base.json`, and `vite.workspace-alias.ts`; it confirmed `02-15` is fixed, `03-01` is repo-observably adjudicated as a supported exception, and the closure is valid once this audit evidence is recorded.

Follow-up:

- no remaining plan-owned work
