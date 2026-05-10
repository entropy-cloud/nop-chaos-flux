# Plan 239: Schema-Within-a-Prop Custom Field Compilation

> Plan Status: completed
> Owner: renderer-runtime / flux-compiler
> Created: 2026-05-09
> Last Reviewed: 2026-05-09
> Sources: `docs/bugs/43-flow-designer-node-edge-text-empty-expression-pre-evaluation-fix.md`, `docs/logs/2026/05-08.md` (plan 230 closure), `docs/logs/2026/05-09.md`
> Supersedes: none
> Related bugs: `docs/bugs/43-flow-designer-node-edge-text-empty-expression-pre-evaluation-fix.md`

## Purpose

Introduce a `compile` function on `SchemaFieldRule` that lets renderer definitions control how a prop containing nested template schemas is compiled, instead of relying on the default `compileValue` recursion that destroys template expressions evaluated in the wrong scope.

## Background: Bug #43 Regression

Bug #43 (`docs/bugs/43-flow-designer-node-edge-text-empty-expression-pre-evaluation-fix.md`) identified that flow designer node labels and edge text were empty because `config` — a prop containing nested `nodeType[].body` and `edgeType[].body` template schemas — was passed through the default `compileValue` pipeline. Expression strings like `${label}` were evaluated at page scope (where `label` does not exist), producing `undefined`.

The original fix read `config` from `meta.templateNode.schema` (the raw uncompiled schema) instead of from `props.props['config']` (the expression-evaluated version). This was a renderer-level workaround that bypassed the compilation pipeline.

During plan 230 (`docs/plans/230-renderer-slot-and-type-contract-cleanup-plan.md`, commit `7c7d8343`) renderer contract cleanup, this workaround was intentionally removed because reading from raw schema at runtime violates the architectural rule that runtime should consume compiled output, not raw schema. The commit message stated "Remove useCurrentNodeMeta in designer-page in favor of readDesignerResolvedProp."

Both positions were internally consistent but addressed different layers:

- Bug #43 fix: correctly identified that `config` must not be expression-evaluated at page scope
- Plan 230 refactoring: correctly identified that runtime should not read raw schema

The reconciliation is: `config` should be compiled, but through a renderer-owned compilation strategy that knows which sub-paths are templates, not through the default `compileValue` recursion.

## Current Baseline

### Architecture docs

- `docs/architecture/field-metadata-slot-modeling.md` already describes `SchemaFieldRule`, `lazyEval`, and the field classification model. Updated to include the "schema-within-a-prop" pattern and the `compile` function approach with tradeoff analysis.
- `docs/references/renderer-interfaces.md` updated to mention the `compile` field rule option.
- `docs/references/architecture-guardrails-from-bugs.md` updated with guardrail 8 (schema-within-a-prop).

### Code

- `packages/flux-core/src/types/schema.ts`: `SchemaFieldRule` interface with `lazyEval` but no `compile` function yet.
- `packages/flux-compiler/src/schema-compiler/node-compiler.ts`: compilation loop that collects props into `propSource`, handles `lazyEval` fields, then passes all remaining props through `expressionCompiler.compileValue()`.
- `packages/flow-designer-renderers/src/index.tsx`: `designer-page` definition with `{ key: 'config', kind: 'prop' }` — no special compilation.
- `packages/flow-designer-renderers/src/designer-page.tsx`: reads `config` from `props.props['config']`, which contains expression-evaluated values (currently broken for nested templates).

### Live defect

Flow designer node labels and edge text are empty in graph mode because `config` passes through `compileValue` and nested template expressions are destroyed.

## Scope

### In Scope

- `SchemaFieldRule` type extension in `flux-core`
- Compiler integration in `flux-compiler`
- `designer-page.config` field compilation fix in `flow-designer-renderers`
- Regression tests for the above
- Architecture and reference doc updates

### Out of Scope

- Other renderer props that may have similar patterns (future work)
- `RenderNodes` API changes
- `lazyEval` modifications
- Bug #43 Notes section update (done as part of this plan's closure)

## Goals

1. Add `compile` function support to `SchemaFieldRule` in `flux-core`.
2. Integrate `compile` into the `node-compiler.ts` pipeline: fields with `compile` are extracted from `propSource` before `compileValue`, compiled by the renderer-provided function, and merged into the compiled output.
3. Implement `compile` on the `designer-page` `config` field to handle nested `nodeType[].body` and `edgeType[].body` template schemas correctly.
4. Restore flow designer node labels and edge text rendering.
5. Add focused regression tests.

## Non-Goals

- Refactoring all existing `prop` fields to use `compile` — only `designer-page.config` is in scope.
- Changing the `RenderNodes` API — it already handles template compilation correctly.

## Execution Slices

### Slice 1: Add `compile` to `SchemaFieldRule` in `flux-core`

**Status**: completed

Changes:

- [Fix] `packages/flux-core/src/types/schema.ts`: add `compile?` field to `SchemaFieldRule`. The function signature is host-neutral — it receives the raw value and a `FieldCompileContext` containing `expressionCompiler`, `symbolTable`, `compileValue`, `compileSchema`, and `sourcePath`. It returns `unknown` — the result is placed directly into the compiled props output. The runtime resolves it as a static value if it is not a `CompiledRuntimeValue`.
- [Fix] Export new types from `packages/flux-core/src/index.ts`.

Exit criteria:

- [x] `SchemaFieldRule` has an optional `compile` field with a host-neutral signature
- [x] `pnpm typecheck` passes
- Owner-doc decision: `field-metadata-slot-modeling.md` and `renderer-interfaces.md` already updated; no additional doc update required for this slice.

### Slice 2: Integrate `compile` into `node-compiler.ts`

**Status**: completed

Changes:

- [Fix] `packages/flux-compiler/src/schema-compiler/node-compiler.ts`: after collecting `propSource` and before the global `compileValue(propSource, ...)` call, extract fields that have `compile` functions. Call each `compile` function with the raw value and a compilation context. Store the results directly into the compiled output (bypassing `compileValue`). If `compile` throws, catch the error and emit a diagnostic rather than crashing compilation.

Exit criteria:

- [x] Fields with `compile` are excluded from the `compileValue` call
- [x] The `compile` function receives correct compilation context
- [x] Result is available at runtime via `props.props[key]`
- [x] Compile errors in `compile` functions are caught and reported as diagnostics
- [x] Existing tests still pass
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test` all pass
- Owner-doc decision: `field-metadata-slot-modeling.md` already describes compiler integration behavior; no additional doc update required for this slice.

### Slice 3: Implement `compile` for `designer-page.config`

**Status**: completed

Changes:

- [Fix] `packages/flow-designer-renderers/src/index.tsx`: add `compile` to the `config` field rule on the `designer-page` renderer definition. The function should:
  - Deep-clone the config value
  - For each `nodeType` that has a `body` that is a `SchemaInput`, keep it as raw schema (do not compile through `compileValue` at page scope)
  - For each `edgeType` that has a `body` that is a `SchemaInput`, keep it as raw schema
  - Compile the remaining parts of config normally through `compileValue`
- The result is a partially-compiled config where template schemas survive for `RenderNodes` to compile at node/edge render time.

Exit criteria:

- [x] `config` field rule has a `compile` function
- [x] Nested `nodeType[].body` and `edgeType[].body` are preserved as raw schema
- [x] Other config values are expression-evaluated normally
- [x] Flow designer node labels and edge text render correctly in graph mode
- [x] No renderer reads from raw schema at runtime; all data flows through compiled props
- Owner-doc decision: `field-metadata-slot-modeling.md` already updated with tradeoff analysis; no additional doc update required for this slice.

### Slice 4: Regression tests and e2e verification

**Status**: completed

Changes:

- [Proof] Verify that `tests/e2e/flow-designer-label-text.spec.ts` (from bug #43) passes.
- [Proof] Add a focused unit test that compiles a `designer-page` schema with a `config` containing `${label}` in a nodeType body, and confirms the expression survives compilation.
- [Proof] Add a compiler-level test that a `SchemaFieldRule` with `compile` is respected by the compilation pipeline.

Exit criteria:

- [x] `tests/e2e/flow-designer-label-text.spec.ts` passes
- [x] Unit test confirms expression preservation in `config`
- [x] Compiler test confirms `compile` field rule integration
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test` all pass
- [x] Owner-doc decision recorded: `field-metadata-slot-modeling.md` and `renderer-interfaces.md` already updated; bug #43 Notes section updated with forward reference to this plan

## Deferred But Adjudicated

None.

## Non-Blocking Follow-ups

- Evaluate whether other renderer props in the codebase contain nested template schemas and should migrate to `compile`.

## Closure Gates

- [x] All slices landed and verified
- [x] Architecture docs match final implementation (`field-metadata-slot-modeling.md`, `renderer-interfaces.md`, `architecture-guardrails-from-bugs.md`)
- [x] No renderer reads from raw schema at runtime; all data flows through compiled props
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test` all pass
- [x] Independent closure audit confirms no remaining plan-owned defect

## Closure

**Status Note**: Plan 239 is complete. `SchemaFieldRule.compile` now provides renderer-owned compilation for schema-within-a-prop fields, `designer-page.config` preserves nested template schemas while still compiling ordinary config leaves, and flow designer node/edge labels now resolve through compiled props without raw-schema runtime fallbacks.

**Closure Audit Evidence**:

- Reviewer / Agent: independent closure audit via subagent task `ses_1f2683843ffeUDJB1sTeTQAN2B`
- Evidence: re-audited live code in `packages/flux-core/src/types/schema.ts`, `packages/flux-compiler/src/schema-compiler/node-compiler.ts`, `packages/flow-designer-renderers/src/index.tsx`, `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flow-designer-renderers/src/designer-tree-mode.tsx`; verified focused proofs in `packages/flow-designer-renderers/src/designer-page.resolved-props.test.ts`, `packages/flow-designer-renderers/src/edge-label-expression.test.tsx`, `packages/flux-compiler/src/schema-compiler-registry-compilation.test.ts`; verified green evidence for `tests/e2e/flow-designer-label-text.spec.ts`, `@nop-chaos/flow-designer-renderers` package tests, and workspace `typecheck` / `build` / `lint` / `test` baseline recorded in `docs/logs/2026/05-09.md`.

**Follow-up**: Evaluate whether other renderer props containing nested template schemas should adopt field-level `compile`.
