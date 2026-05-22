# 430 Eliminate Hardcoded Type Dispatch in Compiler and Runtime

> Plan Status: completed
> Last Reviewed: 2026-05-22
> Source: User review — `type === 'xxx'` anti-pattern violates renderer extensibility
> Related: `docs/architecture/renderer-runtime.md` (Declarative Configuration Principle section)

## Purpose

Remove all hardcoded renderer-type string comparisons from compiler and runtime core code, replacing them with declarative metadata on `RendererDefinition`. New renderers must be able to opt into all behaviors by declaring metadata, without modifying core code.

## Current Baseline

### Audit scanner results (`pnpm check:audit-hardcoded-type-dispatch`)

18 suspects across 4 files:

**`packages/flux-compiler/src/schema-compiler/node-compiler.ts`** (4):

- L488: `schema.type === 'form'` → selects `childContractMode` default
- L538: `schema.type === 'page'` → scope-hoisted validation collection
- L564: `schema.type === 'data-source'` → special compilation phase
- L573: `schema.type === 'reaction'` → special compilation phase

**`packages/flux-compiler/src/schema-compiler/shape-validation-deep-fields.ts`** (6):

- L46: `renderer.type === 'table' || renderer.type === 'crud'` → columns traversal
- L78: `renderer.type === 'table'` → expandable traversal
- L117: `renderer.type === 'tabs'` → items traversal
- L148: `renderer.type === 'variant-field'` → variants traversal

**`packages/flux-compiler/src/schema-compiler/shape-validation-node-fields.ts`** (3):

- L251: `renderer.type === 'tabs'` → items boolean field validation
- L307: `schema.type === 'data-source'` → skip
- L339: `schema.type === 'reaction'` → skip

**`packages/flux-react/src/node-frame-wrapper.tsx`** (6):

- L59-64: `templateNode.type === 'array-editor' | 'array-field' | 'tag-list' | 'condition-builder' | 'key-value' | 'detail-field'` → selects `rootTag='div'`

### Already-correct mechanisms (for reference)

- `rendererTraits: readonly string[]` — semantic trait tags
- `scopePolicy: ScopePolicy` — per-renderer scope boundary
- `wrap: boolean` — per-renderer FieldFrame opt-in
- `fields: readonly SchemaFieldRule[]` — per-renderer field classification
- `DEEP_FIELD_NORMALIZERS` in `tables.ts` — keyed by type string, but already data-driven (just needs location shift)

### Repo state already landed before implementation phases

- `docs/architecture/renderer-runtime.md` now documents the declarative configuration principle and explicitly bans hardcoded renderer-type dispatch in compiler/runtime core.
- `docs/references/audit-tooling.md` now documents `check:audit-hardcoded-type-dispatch`.
- `scripts/audit/rules.mjs`, `scripts/audit/find-hardcoded-type-dispatch.mjs`, and `package.json` now provide the heuristic scanner and command wiring.
- This plan therefore starts from a repo state where the doc/audit baseline is already updated, but the code still has 18 live suspects.

## Goals

- All 18 hardcoded type comparisons replaced by declarative `RendererDefinition` metadata
- `check:audit-hardcoded-type-dispatch` scanner reports 0 suspects on compiler/runtime core
- New renderers can opt into frame root tag, deep field traversal, validation defaults, and data-source/reaction compilation by declaring metadata alone

## Non-Goals

- This plan does not change public renderer authoring schema or user-visible behavior
- This plan does not touch formula AST, spreadsheet commands, flow-designer edges, or other domain-specific type dispatching (those are correctly scoped to their own domains)
- This plan does not refactor `DEEP_FIELD_NORMALIZERS` table structure beyond relocating it; the normalization functions themselves remain unchanged

## Scope

### In Scope

- `packages/flux-core/src/types/renderer-core.ts` — new metadata fields on `RendererDefinition`
- `packages/flux-compiler/src/schema-compiler/node-compiler.ts` — replace 4 hardcoded checks
- `packages/flux-compiler/src/schema-compiler/shape-validation-deep-fields.ts` — replace 6 hardcoded checks
- `packages/flux-compiler/src/schema-compiler/shape-validation-node-fields.ts` — replace 3 hardcoded checks
- `packages/flux-compiler/src/schema-compiler/tables.ts` — relocate normalizers to definitions
- `packages/flux-react/src/node-frame-wrapper.tsx` — replace 6 hardcoded checks
- Individual renderer definition files that need to declare new metadata
- Architecture doc and audit tooling updates (already done)

### Out Of Scope

- Formula parser AST node types
- Spreadsheet, word-editor, report-designer, flow-designer domain-specific dispatch
- `typeof` checks, `node.type` in AST traversal
- Test files

## Execution Plan

### Phase 1 - Extend RendererDefinition with declarative metadata

Status: completed
Targets: `packages/flux-core/src/types/renderer-core.ts`

- Item Types: `Decision`, `Fix`

- [x] Decide the minimal declarative metadata surface needed to remove all 18 hardcoded comparisons without introducing redundant parallel knobs.
- [x] Add `frameRootTag?: string` to `RendererDefinition` only if `rendererTraits`/existing metadata cannot already express the `FieldFrame` root-tag requirement.
- [x] Add a renderer-owned deep-field declaration surface to `RendererDefinition` so nested-region traversal and per-item boolean validation no longer depend on `renderer.type === '...'` checks.
- [x] Add a renderer-owned compilation declaration surface to `RendererDefinition` so data-source and reaction compile-artifact lowering no longer depend on `schema.type === '...'` checks.
- [x] Add a renderer-owned validation-default declaration surface to `RendererDefinition` so child contract mode / hoisted validation no longer depend on `schema.type === 'form' | 'page'` checks.

Exit Criteria:

- [x] `RendererDefinition` type includes all new optional fields
- [x] Existing renderers that don't declare these fields continue to work (all new fields optional with backward-compatible defaults)
- [x] `pnpm typecheck` passes
- [x] `docs/architecture/renderer-runtime.md` still matches the final metadata names and ownership split chosen in this phase; if the chosen API differs from the drafted names above, the doc is updated in the same phase
- [x] `docs/logs/2026/05-22.md` records the metadata-surface decision and affected code anchors

### Phase 2 - Migrate node-frame-wrapper.tsx

Status: completed
Targets: `packages/flux-react/src/node-frame-wrapper.tsx`, 6 renderer definition files

- Item Types: `Fix`

- [x] Replace hardcoded type list with `templateNode.component.frameRootTag` read
- [x] Add `frameRootTag: 'div'` to: `array-editor`, `array-field`, `tag-list`, `condition-builder`, `key-value`, `detail-field` renderer definitions
- [x] Remove the 6-line `usesInteractiveControlRoot` type-check block

Exit Criteria:

- [x] `node-frame-wrapper.tsx` contains zero `templateNode.type ===` comparisons
- [x] Visual behavior of listed renderers unchanged
- [x] `pnpm typecheck && pnpm build` pass
- [x] `docs/architecture/field-frame.md` and `docs/architecture/renderer-runtime.md` still describe the post-migration ownership truth for frame root tag selection; update them in this phase if code shape changed materially
- [x] `docs/logs/2026/05-22.md` records the frame-root migration and touched renderer definitions

### Phase 3 - Migrate shape-validation-deep-fields.ts

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/shape-validation-deep-fields.ts`, `packages/flux-compiler/src/schema-compiler/tables.ts`, renderer definition files for `table`, `crud`, `tabs`, `variant-field`

- Item Types: `Fix`

- [x] Move ownership of table/crud/tabs/variant-field deep-field traversal from compiler hardcoded branches to renderer-declared metadata on their definitions.
- [x] Refactor `analyzeDeepSchemaField()` to consume renderer-declared traversal metadata instead of `if (input.renderer.type === 'table' || ...)` chains.
- [x] Remove renderer-type branching from `shape-validation-deep-fields.ts` entirely.
- [x] Keep shared traversal helpers only as implementation utilities; no remaining compiler decision may depend on a renderer type string literal.

Exit Criteria:

- [x] `shape-validation-deep-fields.ts` contains zero `renderer.type ===` comparisons
- [x] Deep field normalization behavior for table/crud/tabs/variant-field unchanged
- [x] `pnpm typecheck && pnpm build && pnpm test` pass
- [x] `docs/architecture/renderer-runtime.md` still accurately describes that deep-field behavior is renderer-declared rather than compiler-hardcoded; update in this phase if the final metadata wording changed
- [x] `docs/logs/2026/05-22.md` records the deep-field owner migration and verification evidence

### Phase 4 - Migrate shape-validation-node-fields.ts

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/shape-validation-node-fields.ts`

- Item Types: `Fix`

- [x] Replace the `tabs`-specific boolean-field validation branch with renderer-declared metadata read through the Phase 1 surface.
- [x] Replace `data-source` / `reaction` schema-type branches with renderer-declared compilation metadata and `schemaValidator` ownership, keeping current validation semantics unchanged.

Exit Criteria:

- [x] `shape-validation-node-fields.ts` contains zero `renderer.type ===` and zero `schema.type ===` comparisons
- [x] `pnpm typecheck && pnpm build && pnpm test` pass
- [x] `docs/architecture/renderer-runtime.md` still matches the final node-field validation ownership model; update in this phase if needed
- [x] `docs/logs/2026/05-22.md` records the node-field validation migration and proof commands

### Phase 5 - Migrate node-compiler.ts

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/node-compiler.ts`, renderer definitions for `form`, `page`, `data-source`, `reaction`

- Item Types: `Fix`, `Decision`

- [x] Replace the `form`-specific child-contract default branch with renderer-declared validation metadata.
- [x] Replace the `page`-specific hoisted-validation branch with renderer-declared metadata or an existing equivalent contract proven sufficient in this phase.
- [x] Replace `data-source` / `reaction` compilation branches with renderer-declared compilation metadata that compiler lowers automatically.
- [x] Update the affected renderer definitions (`form`, `page`, `data-source`, `reaction`) to declare the chosen metadata explicitly.

Exit Criteria:

- [x] `node-compiler.ts` contains zero `schema.type ===` comparisons for renderer dispatch
- [x] Compilation behavior for form, page, data-source, reaction unchanged
- [x] `pnpm typecheck && pnpm build && pnpm test` pass
- [x] `docs/architecture/flux-core.md` and `docs/architecture/renderer-runtime.md` still match the final compile-time ownership model; update them in this phase if the chosen metadata surface changed those contracts materially
- [x] `docs/logs/2026/05-22.md` records the compiler migration and validation/compilation proof

### Phase 6 - Verify scanner is clean and update docs

Status: completed
Targets: scanner, docs

- Item Types: `Proof`, `Follow-up`

- [x] Run `pnpm check:audit-hardcoded-type-dispatch` — must report 0 suspects
- [x] Run full verification: `pnpm typecheck && pnpm build && pnpm lint && pnpm test`
- [x] Update `docs/logs/` with completion record

Exit Criteria:

- [x] `check:audit-hardcoded-type-dispatch` reports 0 suspects
- [x] All gates green
- [x] `docs/logs/` updated
- [x] Owner docs touched by prior phases are re-audited against live code and no stale “planned/proposed” wording remains

## Closure Gates

- [x] All 18 original hardcoded type dispatch sites replaced by declarative metadata
- [x] `check:audit-hardcoded-type-dispatch` reports 0 suspects
- [x] New renderers can opt into frame root tag, deep field traversal, validation defaults, and compilation phases by declaring metadata alone — no core code changes needed
- [x] Every execution phase has all Exit Criteria checked and no phase remains `planned`, `in progress`, or `blocked`
- [x] No in-scope design ambiguity remains deferred; the final metadata surface is adjudicated in-plan rather than pushed to follow-up
- [x] Affected owner docs match the final live baseline with no contract drift
- [x] Necessary focused verification for wrapper, compiler, validation, and scanner behavior is recorded in `docs/logs/2026/05-22.md`
- [x] No confirmed in-scope live defect or contract drift has been silently downgraded into follow-up
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `docs/logs/` updated
- [x] Independent closure audit completed

## Deferred But Adjudicated

(none)

## Non-Blocking Follow-ups

- After migration, consider whether `DEEP_FIELD_NORMALIZERS` map in `tables.ts` should be removed entirely or kept as a shared utility registry

## Closure

Status Note: Completed. Compiler/runtime hardcoded renderer-type dispatch sites were replaced by declarative `RendererDefinition` metadata, the last `variant-field` nested-region regression was fixed, and workspace verification plus the hardcoded-type audit both passed.

Closure Audit Evidence:

- Reviewer / Agent: OpenCode
- Evidence: `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`, and `pnpm check:audit-hardcoded-type-dispatch` all passed on 2026-05-22 after re-auditing the migrated compiler/runtime paths and the renderer-definition metadata call sites.

Follow-up:

- no remaining plan-owned work
