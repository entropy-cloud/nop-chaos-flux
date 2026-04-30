# 93 Form Renderer Schema Fallback Elimination Plan

> Plan Status: completed
> Last Reviewed: 2026-04-16
> Source: live repo audit 2026-04-16, `docs/architecture/field-binding-and-renderer-contract.md`
> Related: `docs/plans/72-field-binding-and-renderer-contract-unification-plan.md` (predecessor, completed)

## Purpose

This is the **successor plan to Plan 72**, completing the final cleanup work explicitly called out in Plan 72's Follow-up section:

> "If the transitional `props.props.name ?? props.schema.name` fallback is to be eliminated, open a dedicated successor plan for full renderer adoption of the normalized channel."

The goal is to **completely eliminate all transitional `props.schema.name` and `props.schema.required` fallbacks** from form renderers, enforcing the normalized contract where these fields are accessed exclusively through `props.props.*`.

## Current Baseline

Per `docs/architecture/field-binding-and-renderer-contract.md`:

- **`name` belongs to `props.props.name`** (Frozen Contract Matrix, Line 349)
- **`required` belongs to `props.props.required`** (Frozen Contract Matrix, Line 351)
- **`name` has been removed from `META_FIELDS`** (frozen to 6 fields: `id`, `className`, `visible`, `hidden`, `disabled`, `testid`)
- **`props.schema.*` fallbacks are transitional**, not normative

Live repo audit (2026-04-16) found **26 remaining transitional fallbacks** across 6 files:

| File                   | `name` Fallbacks | `required` Fallbacks |
| ---------------------- | ---------------- | -------------------- |
| `input.tsx`            | 7                | 7                    |
| `tree-controls.tsx`    | 2                | 2                    |
| `ConditionBuilder.tsx` | 1                | 1                    |
| `tag-list.tsx`         | 1                | 1                    |
| `key-value.tsx`        | 1                | 1                    |
| `array-editor.tsx`     | 1                | 1                    |

Additionally, 4 files already use the correct pattern (`props.props.name` only):

- `variant-field.tsx`
- `object-field.tsx`
- `array-field.tsx`
- `detail-field.tsx`

## Goals

- Eliminate all 13 `props.schema.name` fallbacks
- Eliminate all 13 `props.schema.required` fallbacks
- Standardize on `props.props.*` as the single source of truth
- No backward compatibility shims—per user directive, the architecture is normative

## Non-Goals

- Refactoring `useFormFieldController` hook itself (already exists and works correctly)
- Adding new form field capabilities
- Changing the architecture document (already correct)

## Scope

### In Scope

- `packages/flux-renderers-form/src/renderers/input.tsx`
- `packages/flux-renderers-form/src/renderers/tree-controls.tsx`
- `packages/flux-renderers-form/src/renderers/condition-builder/ConditionBuilder.tsx`
- `packages/flux-renderers-form/src/renderers/tag-list.tsx`
- `packages/flux-renderers-form/src/renderers/key-value.tsx`
- `packages/flux-renderers-form/src/renderers/array-editor.tsx`
- `docs/logs/2026/04-16.md`

### Out Of Scope

- Files already using correct pattern (variant-field, object-field, array-field, detail-field)
- Architecture document changes
- Hook implementation changes

## Execution Plan

### Phase 1 - High-Priority Renderers (input.tsx, tree-controls.tsx)

Status: completed
Targets: `input.tsx`, `tree-controls.tsx`

- [x] Remove all `?? props.schema.name` fallbacks from `input.tsx` (7 occurrences)
- [x] Remove all `?? props.schema.required` fallbacks from `input.tsx` (7 occurrences)
- [x] Remove all `?? props.schema.name` fallbacks from `tree-controls.tsx` (2 occurrences)
- [x] Remove all `?? props.schema.required` fallbacks from `tree-controls.tsx` (2 occurrences)
- [x] Run `pnpm typecheck` to verify no type errors

Exit Criteria:

- [x] No `props.schema.name` or `props.schema.required` references remain in these files
- [x] Typecheck passes

### Phase 2 - Remaining Renderers

Status: completed
Targets: `ConditionBuilder.tsx`, `tag-list.tsx`, `key-value.tsx`, `array-editor.tsx`

- [x] Remove `?? props.schema.name` and `?? props.schema.required` fallbacks from `ConditionBuilder.tsx`
- [x] Remove `?? props.schema.name` and `?? props.schema.required` fallbacks from `tag-list.tsx`
- [x] Remove `?? props.schema.name` and `?? props.schema.required` fallbacks from `key-value.tsx`
- [x] Remove `?? props.schema.name` and `?? props.schema.required` fallbacks from `array-editor.tsx`

Exit Criteria:

- [x] No `props.schema.name` or `props.schema.required` references remain in these files

### Phase 3 - Verification And Closure

Status: completed
Targets: all touched files, `docs/logs/2026/04-16.md`

- [x] Run `pnpm typecheck`
- [x] Run `pnpm build`
- [x] Run `pnpm lint`
- [x] Run `pnpm test` (flux-renderers-form: 409 tests passed)
- [x] Update daily log with completion notes
- [x] Grep verify: no `props.schema.(name|required)` references remain in `packages/flux-renderers-form/src/renderers/`

Exit Criteria:

- [x] Full workspace verification green
- [x] Zero `props.schema.name` and `props.schema.required` references in form renderers
- [x] Daily log updated

## Validation Checklist

- [x] All 13 `props.schema.name` fallbacks eliminated
- [x] All 13 `props.schema.required` fallbacks eliminated
- [x] No `props.schema.(name|required)` pattern in `packages/flux-renderers-form/src/renderers/`
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] `pnpm test` passes (flux-renderers-form: 409 tests)
- [x] `docs/logs/2026/04-16.md` updated

## Risks And Rollback

**Risk**: If any schema is not properly configured with `name` in renderer metadata, removing the fallback will cause runtime `undefined` errors.

**Mitigation**: The architecture ensures all editable field schemas have `name` and `required` classified as `prop` via `BoundFieldSchemaBase`. Plan 72 already verified this contract is in place.

**Rollback**: If issues arise, re-add fallback to specific renderer only, then investigate the schema compilation path.

## Closure

Status Note: All phases completed. Eliminated 26 transitional fallbacks (13 `props.schema.name`, 13 `props.schema.required`) from 6 form renderer files. All form renderers now use normalized channels exclusively per the Frozen Contract Matrix in `docs/architecture/field-binding-and-renderer-contract.md`.

Closure Audit Evidence:

- Reviewer / Agent: Claude claude-opus-4.5 2026-04-16
- Evidence:
  - Grep verify: `grep -r "props\.schema\.(name|required)" packages/flux-renderers-form/src/renderers/` returns no matches
  - `pnpm typecheck` passes
  - `pnpm build` passes
  - `pnpm lint` passes
  - `pnpm --filter @nop-chaos/flux-renderers-form test` passes (409 tests)

Follow-up:

- None; this completes the Plan 72 follow-up chain
- Form renderers now fully comply with the normalized renderer contract
