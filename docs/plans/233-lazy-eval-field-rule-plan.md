# 233 Lazy-Eval Field Rule Plan

> Plan Status: completed
> Last Reviewed: 2026-05-09
> Source: `packages/flux-compiler/src/schema-compiler/node-compiler.ts`, `packages/flux-core/src/types/schema.ts`
> Related: `docs/plans/232-open-ended-adversarial-review-2026-05-08-remediation-plan.md`

## Purpose

Remove the `schema.type === 'loop' || schema.type === 'recurse'` hardcoding in the compiler by introducing a declarative `lazyEval` property on `SchemaFieldRule`, so any renderer can declare fields that need compile-once-evaluate-per-item semantics without the compiler knowing about specific renderer types.

## Current Baseline

- `SchemaFieldRule` already has `allowSource`, `params`, `isolate` as declaration-driven mechanisms for different compilation strategies.
- `itemData` is declared as `{ key: 'itemData', kind: 'prop', lazyEval: true, params: ['item', 'index', 'key'] }` in loop/recurse renderer definitions.
- `node-compiler.ts` uses declaration-driven logic derived from `renderer.fields` to compile lazy-eval fields into `TemplateNode.structuralFields`.
- The compiled result is stored on `TemplateNode.structuralFields` as a generic `Record<string, CompiledRuntimeValue<unknown>>`.
- Consumers (`loop.tsx`, `recurse.tsx`) access it as `props.templateNode.structuralFields?.itemData`.
- `node-runtime.ts` checks all `structuralFields` values for dynamic kind for wildcard dependency invalidation.

## Goals

- Replace `schema.type` hardcoding in `node-compiler.ts` with a declaration-driven mechanism derived from `SchemaFieldRule`.
- Rename `structuralItemData` to `structuralFields` on `TemplateNode` as a generic `Record<string, CompiledRuntimeValue<unknown>>` so future lazy-eval fields (e.g. `tabData`, `stepData`) slot in without new TemplateNode properties.
- Update all consumers to read from `structuralFields` instead of the old single-property name.

## Non-Goals

- Changing `when` handling — it is a base meta mechanism with a well-known name, not a renderer-specific lazy-eval concern.
- Adding new lazy-eval fields beyond `itemData` — that is future work enabled by this plan.
- Changing the runtime/React evaluateCompiled contract or the `evaluateItemData` callback shape on `StructuralLoopRenderContext`.

## Scope

### In Scope

- `SchemaFieldRule` type extension
- `TemplateNode.structuralItemData` → `TemplateNode.structuralFields` rename
- `node-compiler.ts` hardcode removal
- Loop/recurse renderer field definition updates
- All consumers of `structuralItemData` and the hardcoded type checks
- Owner doc sync

### Out Of Scope

- New lazy-eval field types
- `when` / meta field handling
- Compiler diagnostics changes

## Execution Plan

### Phase 1 - Add `lazyEval` To SchemaFieldRule And Rename structuralItemData

Status: completed
Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-core/src/types/node-identity.ts`

- Item Types: `Fix`

- [x] Add `lazyEval?: boolean` property to `SchemaFieldRule` in `schema.ts`
- [x] Rename `TemplateNode.structuralItemData` to `structuralFields` with type `Record<string, CompiledRuntimeValue<unknown>>` in `node-identity.ts`

Exit Criteria:

- [x] `SchemaFieldRule.lazyEval` is declared and typed
- [x] `TemplateNode.structuralFields` replaces `structuralItemData`
- [x] No owner-doc update required for this phase (docs updated in Phase 4)

### Phase 2 - Refactor node-compiler.ts And Update Renderer Definitions

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/node-compiler.ts`, `packages/flux-renderers-basic/src/basic-renderer-definitions.ts`

- Item Types: `Fix`

- [x] Replace the two `schema.type === 'loop' || schema.type === 'recurse'` blocks in `node-compiler.ts` with declaration-driven logic: collect `lazyEval` field keys from `renderer.fields`, compile each matching schema key into `structuralFields`, and skip those keys from `propSource`
- [x] Change loop and recurse renderer field definitions from `{ key: 'itemData', kind: 'prop' }` to `{ key: 'itemData', kind: 'prop', lazyEval: true, params: ['item', 'index', 'key'] }`

Exit Criteria:

- [x] `node-compiler.ts` has zero `schema.type === 'loop'` or `schema.type === 'recurse'` checks
- [x] `structuralFields` on compiled nodes is populated from any field rule with `lazyEval: true`
- [x] Fields without `lazyEval` are unaffected

### Phase 3 - Update Consumers And Tests

Status: completed
Targets: `packages/flux-renderers-basic/src/{loop.tsx,recurse.tsx}`, `packages/flux-runtime/src/node-runtime.ts`, `packages/flux-compiler/src/schema-compiler-prop-coverage-data-structures.test.ts`, test files

- Item Types: `Fix | Proof`

- [x] Update `loop.tsx` and `recurse.tsx` to read `props.templateNode.structuralFields?.itemData` instead of `props.templateNode.structuralItemData`
- [x] Update `node-runtime.ts` wildcard dependency check from `node.structuralItemData?.kind === 'dynamic'` to `Object.values(node.structuralFields ?? {}).some(f => f.kind === 'dynamic')`
- [x] Update compiler prop-coverage tests to assert `structuralFields?.itemData` instead of `structuralItemData`
- [x] Run full test suite to confirm no regressions

Exit Criteria:

- [x] All consumers read from `structuralFields`
- [x] No references to `structuralItemData` remain in the codebase
- [x] All existing tests pass

### Phase 4 - Owner-Doc Sync And Dev Log

Status: completed
Targets: `docs/architecture/renderer-runtime.md`, `docs/logs/2026/05-09.md`

- Item Types: `Follow-up`

- [x] Update `docs/architecture/renderer-runtime.md` to replace `structuralItemData` references with `structuralFields` and document `lazyEval` field rule
- [x] `docs/components/loop/design.md` does not reference `structuralItemData` — no update needed
- [x] Update `docs/logs/2026/05-09.md` with the refactoring record

Exit Criteria:

- [x] Architecture docs reflect the new `structuralFields` / `lazyEval` baseline
- [x] No stale `structuralItemData` references in docs

## Closure Gates

- [x] Compiler has no `schema.type` hardcoding for lazy-eval fields
- [x] `structuralFields` is a generic record, not a single-purpose named property
- [x] All existing tests pass
- [x] Owner docs updated
- [x] `docs/logs/` updated
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
