# Refactor Follow-up Implementation Checklist

> Plan Status: completed
> Last Reviewed: 2026-04-02


> **Implementation Status: ✅ COMPLETED**
> All W1–W6 workstream items completed. Verified via Plan 07 (completion report) and Plan 08 (acceptance). Key deliverables: array helpers, scope traversal, form validation improvements, and test coverage.
>
> This status was verified against the codebase on 2026-03-30.

## Purpose

This document turns the comparison between `refactor-1` and `refactor-2` into a concrete follow-up implementation checklist for the current branch.

The guiding decision is:

- keep `refactor-1` as the baseline
- preserve its runtime-oriented modular structure
- selectively absorb the stronger form-package organization and cleanup ideas from `refactor-2`

This plan is intentionally implementation-first. Each item should land as a coherent, reviewable change with tests.

## Decision Summary

### Keep as the long-term baseline

Use the current `refactor-1` structure as the primary architecture because it already decomposes the runtime into explicit modules:

- `packages/flux-runtime/src/index.ts`
- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/action-runtime.ts`
- `packages/flux-runtime/src/request-runtime.ts`
- `packages/flux-runtime/src/validation-runtime.ts`
- `packages/flux-runtime/src/scope.ts`

### Absorb from `refactor-2`

The most valuable ideas to import are:

- split `packages/flux-renderers-form/src/index.tsx` into focused modules
- move shared array helpers into `packages/flux-core/src/utils/array.ts`
- remove the empty `packages/amis-testing` package
- add a branch-level implementation report or status document after the merge work is done

## Target End State

After this follow-up work, the repository should look like this at a high level:

1. `amis-runtime` stays modular and remains the architectural backbone
2. `amis-react` keeps its current support-file split
3. `amis-renderers-form` is reorganized into smaller focused files
4. common non-UI helpers move to schema or runtime utility modules when appropriate
5. empty or misleading packages are removed
6. docs clearly record what changed and why

## Scope

### In scope

- `packages/flux-renderers-form`
- `packages/flux-core`
- `packages/flux-runtime` only where imports need to be updated
- workspace cleanup for `packages/amis-testing`
- follow-up documentation

### Out of scope for this pass

- large new feature work
- changing runtime behavior or public API on purpose
- reworking `amis-runtime` into a different architectural model
- redesigning `amis-react` hooks or renderer contracts

## Workstreams

## W1 - Split `amis-renderers-form`

### Goal

Bring the physical file structure of `amis-renderers-form` in line with the already modular direction used elsewhere in `refactor-1`.

### Current problem

`packages/flux-renderers-form/src/index.tsx` currently mixes:

- schema types
- field presentation helpers
- validation behavior helpers
- simple input renderers
- composite renderers
- renderer registration

That makes the package harder to navigate than the rest of the branch.

### Target structure

Create and migrate toward:

- `packages/flux-renderers-form/src/index.tsx`
- `packages/flux-renderers-form/src/schemas.ts`
- `packages/flux-renderers-form/src/field-utils.tsx`
- `packages/flux-renderers-form/src/renderers/form.tsx`
- `packages/flux-renderers-form/src/renderers/input.tsx`
- `packages/flux-renderers-form/src/renderers/tag-list.tsx`
- `packages/flux-renderers-form/src/renderers/key-value.tsx`
- `packages/flux-renderers-form/src/renderers/array-editor.tsx`

### Checklist

- extract form-specific schema and value interfaces into `packages/flux-renderers-form/src/schemas.ts`
- extract shared field validation behavior helpers into `packages/flux-renderers-form/src/field-utils.tsx`
- move `FormRenderer` into `packages/flux-renderers-form/src/renderers/form.tsx`
- move simple scalar and option-based controls into `packages/flux-renderers-form/src/renderers/input.tsx`
- move `TagListRenderer` into `packages/flux-renderers-form/src/renderers/tag-list.tsx`
- move `KeyValueRenderer` into `packages/flux-renderers-form/src/renderers/key-value.tsx`
- move `ArrayEditorRenderer` into `packages/flux-renderers-form/src/renderers/array-editor.tsx`
- reduce `packages/flux-renderers-form/src/index.tsx` to registration, exports, and minimal assembly only
- keep existing exports compatible unless there is a clear reason to tighten them
- avoid introducing a new abstraction layer unless duplicated logic is real and stable

### Acceptance criteria

- no behavior change in form rendering or validation
- `index.tsx` becomes a package entry file rather than an implementation dump
- composite controls remain test-covered
- imports remain understandable and one-directional

## W2 - Extract array utilities into `amis-schema`

### Goal

Move reusable array helper logic out of runtime-specific implementation files when the logic is generic and schema-level safe.

### Why

`refactor-2` makes a good move by extracting array helpers to `packages/flux-core/src/utils/array.ts`.

These helpers are pure and reusable:

- `clampInsertIndex`
- `clampArrayIndex`
- `insertArrayValue`
- `removeArrayValue`
- `moveArrayValue`
- `swapArrayValue`

### Checklist

- add `packages/flux-core/src/utils/array.ts`
- move generic array helper implementations into that file
- export the helpers from `packages/flux-core/src/index.ts`
- update `packages/flux-runtime/src/form-path-state.ts` and any other consumers to import from `@nop-chaos/flux-core`
- keep path-remapping logic inside runtime; only move generic array operations
- add focused tests if the moved helpers are not already covered directly

### Acceptance criteria

- schema package owns generic array operations
- runtime keeps only runtime-specific state remapping logic
- there is no duplicated array mutation code left behind

## W3 - Remove empty `amis-testing`

### Goal

Reduce workspace noise and remove misleading package boundaries.

### Why

`packages/amis-testing/src/index.ts` is currently an empty shell and does not justify package-level cognitive overhead.

### Checklist

- verify nothing imports `@nop-chaos/amis-testing`
- remove `packages/amis-testing/package.json`
- remove `packages/amis-testing/src/index.ts`
- remove `packages/amis-testing/tsconfig.json`
- remove `packages/amis-testing/tsconfig.build.json`
- remove `packages/amis-testing/vitest.config.ts`
- update workspace references if any script or config still mentions the package

### Acceptance criteria

- workspace commands still run cleanly
- no broken path aliases or package references remain
- repository structure becomes simpler without losing useful functionality

## W4 - Preserve and harden `amis-react` split

### Goal

Do not regress `amis-react` back into a single-file adapter.

### Why

Compared with `refactor-2`, the current branch already has a better physical split in:

- `packages/flux-react/src/contexts.ts`
- `packages/flux-react/src/form-state.ts`
- `packages/flux-react/src/defaults.ts`
- `packages/flux-react/src/index.tsx`

This is a strength and should be preserved.

### Checklist

- keep context definitions inside `packages/flux-react/src/contexts.ts`
- keep form selector helpers inside `packages/flux-react/src/form-state.ts`
- keep default environment and registry helpers inside `packages/flux-react/src/defaults.ts`
- only move code into `index.tsx` when it is truly entry-point composition logic
- if form renderer splitting exposes new common React-side helpers, place them deliberately rather than appending to `index.tsx`

### Acceptance criteria

- `amis-react` remains a thin adapter package with explicit support files
- no new god file is introduced during follow-up work

## W5 - Keep runtime modular and avoid backsliding

### Goal

Protect the main architectural win of `refactor-1`.

### Why

The biggest reason `refactor-1` is stronger overall is the decomposition of `amis-runtime` into focused files.

### Checklist

- do not merge `schema-compiler`, `form-runtime`, `action-runtime`, `request-runtime`, or `validation-runtime` back into `packages/flux-runtime/src/index.ts`
- keep `packages/flux-runtime/src/index.ts` as orchestration and export assembly only
- if form renderer refactoring needs new helpers, place them in the narrowest runtime module that matches their responsibility
- rename `packages/flux-runtime/src/form-store.ts` only if the team wants naming alignment in this pass; otherwise document the mismatch and defer
- keep runtime behavior unchanged while moving imports for extracted shared utilities

### Acceptance criteria

- runtime module boundaries remain clear after all follow-up work
- form renderer refactoring does not accidentally re-entangle runtime internals

## W6 - Add a completion report after landing the work

### Goal

Record what was imported from `refactor-2`, what was intentionally not imported, and what remains for later.

### Checklist

- add a short completion report under `docs/plans/` or `docs/analysis/`
- document final file moves and cleanup results
- document any consciously deferred items
- record validation steps and command results

### Suggested file

- `docs/plans/07-refactor-follow-up-completion-report.md`

## Recommended Execution Order

Execute the work in this order:

1. W2 - extract array utilities first
2. W1 - split `amis-renderers-form` second
3. W3 - remove `amis-testing` third
4. W4 - confirm `amis-react` boundaries are preserved
5. W5 - run a final runtime boundary review
6. W6 - write the completion report last

This order keeps low-risk shared utility work first, then tackles the large renderer file, then performs cleanup.

## Suggested Commit Plan

Use small commits aligned with the workstreams.

Recommended sequence:

1. extract generic array helpers into `amis-schema`
2. split form schemas and field utilities
3. split simple form renderers and composite renderers
4. reduce form package entrypoint and stabilize exports
5. remove empty `amis-testing` package
6. add follow-up completion report

## Validation Checklist

Run these checks after each meaningful step when possible, and definitely at the end:

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`

Additionally verify:

- form renderer tests still cover scalar and composite controls
- runtime tests still cover validation, debounce, cancellation, and array-related behavior
- playground still renders form, dialog, and table flows correctly

## Review Checklist

Before merging, confirm all of the following:

- no intentional runtime behavior changes slipped into structural refactors
- no public package export was removed by accident
- file names still match their primary responsibility
- cross-package dependencies remain one-directional
- there is no new duplication between runtime helpers and renderer helpers
- docs reflect the implemented structure, not the abandoned one

## Deferred Items

These are valid future follow-ups, but not required for this pass:

- further split `packages/flux-runtime/src/form-runtime.ts`
- reconsider whether `packages/flux-runtime/src/form-store.ts` should be renamed to reflect both form and page store responsibilities
- add direct unit tests for the extracted array helper module
- extract more shared renderer primitives only after real duplication is confirmed

## Definition of Done

This follow-up plan is complete when:

- `amis-runtime` remains modular
- `amis-react` keeps its support-file split
- `amis-renderers-form` no longer relies on a single implementation-heavy `index.tsx`
- generic array helpers live in `amis-schema`
- `amis-testing` is removed
- tests and build stay green
- a completion report records the result

## Related Documents

- `docs/plans/02-development-plan.md`
- `docs/plans/04-form-validation-improvement-execution-plan.md`
- `docs/architecture/amis-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/form-validation.md`



