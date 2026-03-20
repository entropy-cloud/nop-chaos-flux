# Refactor Follow-up Completion Report

## Completed Work

- extracted generic array helpers into `packages/amis-schema/src/utils/array.ts`
- exported the array helpers from `packages/amis-schema/src/index.ts`
- updated `packages/amis-runtime/src/form-runtime.ts` to consume array helpers from `@nop-chaos/amis-schema`
- kept runtime-specific array path remapping in `packages/amis-runtime/src/form-path-state.ts`
- split `packages/amis-renderers-form/src/index.tsx` into focused renderer and helper modules
- removed the empty `packages/amis-testing` package and cleared active workspace references
- split runtime validation helpers into `packages/amis-runtime/src/validation/`
- introduced a validator registry for built-in sync rules
- moved schema rule extraction, message building, and validation error shaping behind dedicated validation modules
- extracted shared field chrome primitives into `packages/amis-renderers-form/src/renderers/shared/`
- added focused validation module tests and shared renderer primitive tests

## Final Form Renderer Structure

- `packages/amis-renderers-form/src/index.tsx`
- `packages/amis-renderers-form/src/schemas.ts`
- `packages/amis-renderers-form/src/field-utils.tsx`
- `packages/amis-renderers-form/src/renderers/form.tsx`
- `packages/amis-renderers-form/src/renderers/input.tsx`
- `packages/amis-renderers-form/src/renderers/tag-list.tsx`
- `packages/amis-renderers-form/src/renderers/key-value.tsx`
- `packages/amis-renderers-form/src/renderers/array-editor.tsx`
- `packages/amis-renderers-form/src/renderers/shared/index.ts`
- `packages/amis-renderers-form/src/renderers/shared/label.tsx`
- `packages/amis-renderers-form/src/renderers/shared/field-hint.tsx`
- `packages/amis-renderers-form/src/renderers/shared/error.tsx`
- `packages/amis-renderers-form/src/renderers/shared/help-text.tsx`

## Final Validation Structure

- `packages/amis-runtime/src/validation/index.ts`
- `packages/amis-runtime/src/validation/rules.ts`
- `packages/amis-runtime/src/validation/message.ts`
- `packages/amis-runtime/src/validation/errors.ts`
- `packages/amis-runtime/src/validation/validators.ts`
- `packages/amis-runtime/src/validation/registry.ts`

## Intentionally Preserved

- `packages/amis-runtime` remains split across focused runtime modules
- `packages/amis-react` was left structurally unchanged
- public form renderer entry exports remain assembled from `packages/amis-renderers-form/src/index.tsx`
- runtime-specific path remapping logic stayed in runtime instead of moving into schema
- async validation debounce and stale-run cancellation stayed in runtime flow code instead of moving into generic validators
- `packages/amis-runtime/src/index.ts` stayed an orchestration layer

## Removed

- `packages/amis-testing/package.json`
- `packages/amis-testing/src/index.ts`
- `packages/amis-testing/tsconfig.json`
- `packages/amis-testing/tsconfig.build.json`
- `packages/amis-testing/vitest.config.ts`

## Validation

- `pnpm --filter @nop-chaos/amis-schema test`
- `pnpm --filter @nop-chaos/amis-renderers-form test`
- `pnpm --filter @nop-chaos/amis-runtime test`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm lint`

Current pass completed and verified directly:

- `pnpm --filter @nop-chaos/amis-renderers-form test`
- `pnpm --filter @nop-chaos/amis-runtime test`

## Notes

- `pnpm-lock.yaml` was refreshed so the removed workspace package no longer appears in the lockfile importer list
- archive planning docs that mention `amis-testing` were left unchanged because they record historical intent rather than the active workspace baseline

## Deferred

- further splitting inside `packages/amis-runtime/src/form-runtime.ts`
- reconsidering whether `packages/amis-runtime/src/form-store.ts` should be renamed
- any additional renderer primitive extraction beyond the modules created in this pass
