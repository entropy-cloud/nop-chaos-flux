# Refactor Follow-up Checklist Acceptance

## Verdict

The work defined in `docs/plans/refactor-follow-up-implementation-checklist.md` is complete for this pass.

This acceptance is scoped to the checklist workstreams `W1` through `W6`. It does not treat the document's deferred items as release blockers for this pass.

## Workstream Status

### W1 - Split `amis-renderers-form`

Status: complete.

Evidence:

- `packages/amis-renderers-form/src/index.tsx` is now a thin entry file for exports, registration, and assembly
- schema types were moved to `packages/amis-renderers-form/src/schemas.ts`
- shared field helpers were moved to `packages/amis-renderers-form/src/field-utils.tsx`
- renderer implementations were split into:
  - `packages/amis-renderers-form/src/renderers/form.tsx`
  - `packages/amis-renderers-form/src/renderers/input.tsx`
  - `packages/amis-renderers-form/src/renderers/tag-list.tsx`
  - `packages/amis-renderers-form/src/renderers/key-value.tsx`
  - `packages/amis-renderers-form/src/renderers/array-editor.tsx`

Acceptance notes:

- public exports remain assembled from the package entrypoint
- the package no longer depends on a single implementation-heavy `index.tsx`

### W2 - Extract array utilities into `amis-schema`

Status: complete.

Evidence:

- generic array helpers now live in `packages/amis-schema/src/utils/array.ts`
- they are re-exported from `packages/amis-schema/src/index.ts`
- `packages/amis-runtime/src/form-runtime.ts` imports the generic helpers from `@nop-chaos/amis-schema`
- runtime-specific path remapping remains in `packages/amis-runtime/src/form-path-state.ts`

Acceptance notes:

- schema owns the generic array operations
- runtime retains only runtime-specific array state remapping behavior

### W3 - Remove empty `amis-testing`

Status: complete.

Evidence:

- `packages/amis-testing/` is no longer present in the workspace
- the removed files listed in the checklist are documented in `docs/plans/refactor-follow-up-completion-report.md`
- no active source or config files import `@nop-chaos/amis-testing`

Acceptance notes:

- archive docs may still mention the package historically, but active workspace structure and commands no longer depend on it

### W4 - Preserve and harden `amis-react` split

Status: complete.

Evidence:

- `packages/amis-react/src/contexts.ts` still owns context definitions
- `packages/amis-react/src/form-state.ts` still owns form selector helpers
- `packages/amis-react/src/defaults.ts` still owns default environment and registry helpers
- `packages/amis-react/src/index.tsx` remains the adapter entrypoint rather than absorbing those support files

Acceptance notes:

- the package has not regressed into a single-file adapter during this pass

### W5 - Keep runtime modular and avoid backsliding

Status: complete.

Evidence:

- `packages/amis-runtime/src/index.ts` remains an orchestration and export assembly module
- runtime implementation remains split across focused files including:
  - `packages/amis-runtime/src/schema-compiler.ts`
  - `packages/amis-runtime/src/form-runtime.ts`
  - `packages/amis-runtime/src/action-runtime.ts`
  - `packages/amis-runtime/src/request-runtime.ts`
  - `packages/amis-runtime/src/validation-runtime.ts`

Acceptance notes:

- `packages/amis-runtime/src/form-store.ts` was not renamed, which is explicitly allowed by the checklist as a deferrable naming alignment decision

### W6 - Add a completion report after landing the work

Status: complete.

Evidence:

- completion report exists at `docs/plans/refactor-follow-up-completion-report.md`
- the report records completed imports from `refactor-2`, removed files, validation commands, and deferred items

## Validation Status

The workspace currently passes the checklist validation commands:

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`

## Remaining Deferred Items

These items remain open by design and do not block checklist completion:

- further split `packages/amis-runtime/src/form-runtime.ts`
- reconsider whether `packages/amis-runtime/src/form-store.ts` should be renamed
- add direct unit tests for the extracted array helper module
- extract more shared renderer primitives only after stronger duplication evidence appears

## Final Acceptance Statement

The follow-up implementation checklist is accepted as complete for the intended scope of this pass.
