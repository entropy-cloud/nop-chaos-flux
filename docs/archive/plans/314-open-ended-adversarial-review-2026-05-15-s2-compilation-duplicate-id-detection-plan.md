# 314 Open-Ended Adversarial Review 2026-05-15 Session2 Compilation Duplicate ID Detection Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-adversarial-review-02/round-03.md` (Finding 3, global Finding 12)
> Related: `docs/plans/307-open-ended-adversarial-review-2026-05-15-session2-owner-routing-plan.md`

## Purpose

Wire the declared-but-never-populated `CompiledCidState.byId`, `idPaths`, and `duplicateIds` tracking fields into the compilation pass so that duplicate schema `id` values are detected at compile time and surfaced through the existing diagnostics pipeline, turning today's silent duplicate-id drift into an explicit compiler warning/tooling surface before the schema reaches runtime.

## Current Baseline

- `CompiledCidState` in `packages/flux-core/src/compiled-cid.ts:6-8` declares `byId: Map<string, number>`, `idPaths: Map<string, string[]>`, and `duplicateIds: Set<string>`.
- `createCompiledCidState` initializes all three to empty collections.
- `compiled-cid.test.ts:24-40` asserts that `byId`, `idPaths`, and `duplicateIds` start empty — but no test verifies they are ever populated after compiler enrichment.
- `enrichTemplateNodeIds` in `packages/flux-compiler/src/schema-compiler/target-enrichment.ts:50-63` walks every compiled `TemplateNode`, assigns `templateNodeId`, and attaches CID state — but never reads `node.id` and never populates `byId`/`idPaths`/`duplicateIds`. It does not accept a `diagnostics` parameter.
- `TemplateNode.id` is derived from `schema.id` via `createNodeId()` in `packages/flux-core/src/utils/schema.ts:16-22` — if the schema author provides `id: "my-btn"` on two siblings, the compiled `TemplateNode` objects carry the same `id` string.
- `render-nodes.tsx:414-416` uses `node.id` as the React `key` — duplicate IDs produce React duplicate-key warnings (deduped in production) and silent incorrect reconciliation in production builds.
- A diagnostics pipeline already exists: `SchemaCompilerDiagnosticsContext.emit()` in `packages/flux-compiler/src/schema-compiler/diagnostics.ts:22-29`, and `SchemaDiagnosticCode` in `packages/flux-core/src/schema-diagnostics/index.ts:6-35` — but there is no `'duplicate-schema-id'` code yet.
- `enrichTemplateNodeIds` is called from `schema-compiler.ts:111,134` where a `diagnostics` context object is already in scope.

## Goals

- Populate `CompiledCidState.byId`, `idPaths`, and `duplicateIds` during the `enrichTemplateNodeIds` pass.
- Emit a compile-time diagnostic (with a new `'duplicate-schema-id'` code) for each detected duplicate `id` value, including the `templatePath` of both the original and the duplicate.
- Existing tests that assert empty initial state remain valid; new focused tests verify population and duplicate detection.
- The `duplicateIds` set can be queried at runtime via `getCompiledCidState()` for downstream validation or tooling.

## Non-Goals

- No change to `TemplateNode`, `BaseSchema`, `createNodeId`, or the React key logic in `render-nodes.tsx`.
- No runtime duplicate-id enforcement (detection is compile-time only; the diagnostic is `warning` by default so existing schemas with intentional duplicates are not broken).
- No changes to the table row scope cache or other runtime duplicate-handling (owned by Plan 313).

## Scope

### In Scope

- `packages/flux-core/src/compiled-cid.ts` — no structural change, only reachability of `byId`/`idPaths`/`duplicateIds` changes based on new code paths.
- `packages/flux-core/src/schema-diagnostics/index.ts` — add `'duplicate-schema-id'` to `SchemaDiagnosticCode`.
- `packages/flux-compiler/src/schema-compiler/target-enrichment.ts` — add `diagnostics` parameter and populate tracking fields.
- `packages/flux-compiler/src/schema-compiler.ts` — pass `diagnostics` to `enrichTemplateNodeIds`.
- `packages/flux-core/src/compiled-cid.test.ts` — keep initialization-only tests here.
- `packages/flux-compiler/src/` tests — add compile-time behavior tests for population and duplicate detection in the compiler package, where the behavior actually lives.
- `docs/logs/2026/05-15.md` — record completion.

### Out Of Scope

- Splitting `enrichTemplateNodeIds` into its own module or creating a separate post-compilation pass.
- Adding runtime `id` collision checking outside the compiler.
- Modifying the `render-nodes.tsx` React key logic.
- Changes to how `compileSingleNode` or the node compiler creates `TemplateNode.id` — detection is a post-hoc check on the already-assembled tree.

## Execution Plan

### Phase 1 - Wire Compile-Time Duplicate ID Detection

Status: completed
Targets: `packages/flux-core/src/schema-diagnostics/index.ts`, `packages/flux-compiler/src/schema-compiler/target-enrichment.ts`, `packages/flux-compiler/src/schema-compiler.ts`, `packages/flux-core/src/compiled-cid.ts`

- Item Types: `Fix | Decision | Proof`

- [x] Add `'duplicate-schema-id'` to the `SchemaDiagnosticCode` union type in `packages/flux-core/src/schema-diagnostics/index.ts`.
- [x] Add a `diagnostics` parameter to `enrichTemplateNodeIds` (signature: `enrichTemplateNodeIds(compiled, cidState, diagnostics?)`). When `diagnostics` is provided and `diagnostics.enabled` is true, the function:
  - After incrementing `nextTemplateNodeId`, checks `node.id` against `cidState.byId`.
  - If `node.id` already exists in `cidState.byId`: adds `node.id` to `cidState.duplicateIds`, appends the duplicate node's `templatePath` into `cidState.idPaths`, and emits a `'duplicate-schema-id'` diagnostic with `severity: 'warning'`, message listing both `templatePath`s and IDs.
  - Otherwise: sets `cidState.byId.set(node.id, node.templateNodeId)` and populates `cidState.idPaths` with the first-seen path.
- [x] In `packages/flux-compiler/src/schema-compiler.ts`, pass the `diagnostics` context to the two `enrichTemplateNodeIds` call sites (lines 111 and 134).
- [x] Confirm `cidState.byId`, `idPaths`, and `duplicateIds` are reachable after compilation by checking that no `@deprecated` or unused-variable lint warnings appear for these fields (they are now populated by live code paths).

Exit Criteria:

> Each Phase must be `[x]` before Phase Status can be `completed`.

- [x] `'duplicate-schema-id'` diagnostic code exists in `SchemaDiagnosticCode`
- [x] `enrichTemplateNodeIds` accepts optional `diagnostics` and populates `byId`, `idPaths`, `duplicateIds`
- [x] Call sites in `schema-compiler.ts` pass `diagnostics` to `enrichTemplateNodeIds`
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] `pnpm --filter @nop-chaos/flux-core test` passes (existing initialization-only tests not broken)
- [x] Owner-doc adjudication is explicit: `No owner-doc update required` remains valid because `docs/architecture/flux-core.md` already describes duplicate-`id` reporting by template path as part of the supported compiler baseline, and this slice restores the live compiler implementation to that documented baseline.
- [x] `docs/logs/2026/05-15.md` updated with Phase 1 completion

### Phase 2 - Verify Detection With Existing Tests

Status: completed
Targets: `packages/flux-core/src/compiled-cid.test.ts`, `packages/flux-compiler/src/**/*test*`

- Item Types: `Fix | Proof`

- [x] Keep `compiled-cid.test.ts` focused on `createCompiledCidState` initialization semantics in `flux-core`.
- [x] Add compiler-level tests under `packages/flux-compiler/src/` that verify:
  - `enrichTemplateNodeIds` populates `byId` from nodes with unique ids.
  - `enrichTemplateNodeIds` populates `duplicateIds` for conflicting ids.
  - `enrichTemplateNodeIds` emits `'duplicate-schema-id'` diagnostics for duplicates.
  - (Optional) nodes with empty/falsy `id` are skipped.
- [x] Verify all touched focused compiler tests pass.

Exit Criteria:

- [x] New tests verify `byId` population for unique IDs
- [x] New tests verify `duplicateIds` population for duplicate IDs
- [x] New tests verify diagnostic emission for duplicates
- [x] All existing tests remain passing (initialization assertions preserved)
- [x] `pnpm --filter @nop-chaos/flux-core test` passes
- [x] `pnpm --filter @nop-chaos/flux-compiler test -- --runInBand src/schema-compiler-registry-compilation.test.ts` passes
- [x] `pnpm test` passes (full suite)
- [x] Owner-doc adjudication is explicit for the compiler diagnostic surface: `No owner-doc update required` because the supported architecture baseline already names duplicate-`id` reporting as compiler-owned behavior.
- [x] `docs/logs/2026/05-15.md` updated with Phase 2 completion

## Closure Gates

> Only when every gate and every Phase Exit Criteria is `[x]` can `Plan Status` be `completed`.

- [x] `'duplicate-schema-id'` diagnostic code is added to `SchemaDiagnosticCode`
- [x] `enrichTemplateNodeIds` populates `byId`, `idPaths`, `duplicateIds` from node `id` values
- [x] Diagnostics are emitted for each detected duplicate schema `id`
- [x] `CompiledCidState.byId`/`idPaths`/`duplicateIds` are no longer dead code — they are written by a live compilation path
- [x] Focused tests verify population and detection behavior
- [x] No remaining in-scope live defect: the planned compile-time duplicate ID detection is now wired
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] Independent closure audit (subagent or fresh session) confirms no leftover debt

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

None currently.

## Closure

Status Note: Completed. The compiler now populates `CompiledCidState.byId` / `idPaths` / `duplicateIds` during template-node enrichment and emits stable compile-time `'duplicate-schema-id'` warnings for duplicate schema ids by template path.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1d558b810ffepLP4flzPP01Aa0`
- Evidence: Initial closure audit reported `FAIL` only because the plan still showed `in progress` and had not recorded independent-audit evidence. The same audit confirmed the live implementation and focused proof were already aligned with the owner doc (`docs/architecture/flux-core.md:197`) and named no remaining in-scope code defect. This plan update resolves that final text-consistency blocker.

Follow-up:

- No remaining plan-owned execution work.
