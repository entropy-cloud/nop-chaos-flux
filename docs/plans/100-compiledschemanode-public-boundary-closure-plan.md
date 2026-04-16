# 100 CompiledSchemaNode Public Boundary Closure Plan

> Plan Status: planned
> Last Reviewed: 2026-04-16
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/analysis/2026-04-16-architecture-transition-closure-review.md`, `docs/architecture/flux-core.md`
> Related: `docs/plans/64-node-identity-memory-optimization-and-compiledschemanode-cleanup-plan.md`, `docs/plans/96-final-architecture-doc-code-closure-plan.md`

## Purpose

Close the remaining public/tooling residue around `CompiledSchemaNode` so the live repo and owner docs consistently treat the template-instance render path as settled and keep compiled-node exposure only where it is still intentionally needed.

## Current Baseline

- The main runtime/render path already uses `CompiledTemplate -> TemplateNode -> NodeInstance`.
- `CompiledSchemaNode` still exists in compiler-facing contracts and some tooling/debugger helpers.
- The remaining problem is not render-path correctness. It is public-surface and tooling-boundary cleanup.

## Goals

- Reclassify every remaining `CompiledSchemaNode` usage as retained compiler surface, tooling residue to narrow, or removable leakage.
- Keep owner docs accurate about the current render-path baseline.
- Avoid introducing a new generalized debug/model layer unless live tooling evidence requires it.

## Non-Goals

- Do not reopen the template-instance render-path implementation itself.
- Do not redesign the debugger wholesale.

## Scope

### In Scope

- `packages/flux-core/src/types/renderer-compiler.ts`
- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/nop-debugger/src/`
- touched focused tests
- `docs/architecture/flux-core.md`
- `docs/logs/`

### Out Of Scope

- unrelated renderer/runtime changes
- any new generalized inspection framework added for architectural neatness

## Execution Plan

### Phase 1 - Live Usage Audit

Status: planned
Targets: `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/nop-debugger/src/`

- [ ] Inventory every remaining `CompiledSchemaNode` export, public type reference, and debugger/tooling usage.
- [ ] Classify each usage as compiler-only required, tooling residue, or removable leakage.
- [ ] Record the live owner decision for each retained usage before editing docs or code.

Exit Criteria:

- [ ] There is a complete repo-observable inventory of remaining `CompiledSchemaNode` usage.
- [ ] Each remaining usage has an explicit owner decision.

### Phase 2 - Boundary Narrowing

Status: planned
Targets: same as Phase 1 plus focused tests

- [ ] Narrow removable public leakage.
- [ ] Where tooling still needs compiled-node information, keep the smallest explicit compiler/tooling-facing contract instead of leaving the old public teaching surface intact.
- [ ] Add or update focused tests covering the retained boundary.

Exit Criteria:

- [ ] `CompiledSchemaNode` is no longer described or exposed as part of the runtime-facing render contract.
- [ ] Any retained usage is explicitly compiler/tooling-only in live code and tests.

### Phase 3 - Reverse Update And Audit

Status: planned
Targets: `docs/architecture/flux-core.md`, `docs/logs/`

- [ ] Reverse-update `docs/architecture/flux-core.md` in the same slice as the code landing.
- [ ] Record focused verification and the remaining retained boundary, if any, in the daily log.
- [ ] Run an independent closure audit in a fresh session before marking this plan completed.

Exit Criteria:

- [ ] The owner doc matches the live retained boundary.
- [ ] Closure evidence distinguishes interface presence from actual render-path semantics.

## Validation Checklist

- [ ] remaining `CompiledSchemaNode` usage is fully inventoried and classified
- [ ] runtime-facing render docs no longer treat `CompiledSchemaNode` as the active render contract
- [ ] focused verification for retained or narrowed tooling boundary completed
- [ ] independent fresh-session closure audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: complete this section only after the retained `CompiledSchemaNode` boundary is explicit, focused verification is recorded, and an independent fresh-session audit confirms there is no remaining plan-owned public/runtime ambiguity.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- Move any additional tooling-specific residue into a narrower successor plan if it cannot be closed here without broad debugger redesign.
