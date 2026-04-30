# 100 CompiledSchemaNode Public Boundary Closure Plan

> Plan Status: completed
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

Status: completed
Targets: `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/nop-debugger/src/`

- [x] Inventory every remaining `CompiledSchemaNode` export, public type reference, and debugger/tooling usage.
- [x] Classify each usage as compiler-only required, tooling residue, or removable leakage.
- [x] Record the live owner decision for each retained usage before editing docs or code.

**Audit Results (2026-04-16):**

| Classification           | Count | Description                                                          | Decision                               |
| ------------------------ | ----- | -------------------------------------------------------------------- | -------------------------------------- |
| Compiler-internal        | 28    | Schema compiler implementation (`flux-runtime/src/schema-compiler*`) | RETAIN as-is                           |
| Compiler plugin contract | 2     | `RendererPlugin.afterCompile` hook                                   | RETAIN as intentional compile-time API |
| Tooling residue          | 4     | Debugger helpers via plugin contract                                 | RETAIN, add `@internal` annotation     |
| Removable leakage        | 0     | No runtime/renderer-facing usage found                               | N/A                                    |

**Key Findings:**

- Main render path already uses `CompiledTemplate -> TemplateNode -> NodeInstance`
- `CompiledSchemaNode` has `@internal` annotation on interface definition
- Debugger receives compiled nodes via plugin contract, not render path
- No runtime-facing or renderer component usage exists

Exit Criteria:

- [x] There is a complete repo-observable inventory of remaining `CompiledSchemaNode` usage.
- [x] Each remaining usage has an explicit owner decision.

### Phase 2 - Boundary Narrowing

Status: completed
Targets: same as Phase 1 plus focused tests

- [x] Narrow removable public leakage.
- [x] Where tooling still needs compiled-node information, keep the smallest explicit compiler/tooling-facing contract instead of leaving the old public teaching surface intact.
- [x] Add or update focused tests covering the retained boundary.

**Phase 2 Results (2026-04-16):**

No code changes required. The Phase 1 audit found:

- **Zero removable leakage** - all 34 usages are either compiler-internal (28), intentional plugin contract (2), or legitimate tooling via plugin (4)
- The existing `@internal` annotation on `CompiledSchemaNode` interface already marks it as non-public
- The plugin contract `afterCompile(node)` is intentional and correctly documented as compile-time extension point
- Debugger tooling correctly uses the plugin contract, not runtime-facing APIs

Focused verification: `CompiledSchemaNode` does not appear in any renderer component, React hook, or runtime-facing contract.

Exit Criteria:

- [x] `CompiledSchemaNode` is no longer described or exposed as part of the runtime-facing render contract.
- [x] Any retained usage is explicitly compiler/tooling-only in live code and tests.

### Phase 3 - Reverse Update And Audit

Status: completed
Targets: `docs/architecture/flux-core.md`, `docs/logs/`

- [x] Reverse-update `docs/architecture/flux-core.md` in the same slice as the code landing.
- [x] Record focused verification and the remaining retained boundary, if any, in the daily log.
- [x] Run an independent closure audit in a fresh session before marking this plan completed.

**Phase 3 Results (2026-04-16):**

Documentation updated:

- `docs/architecture/flux-core.md` - Updated `CompiledSchemaNode` section to explicitly mark it as `@internal` compiler artifact with boundary classification table
- Removed "remaining gaps" item about `CompiledSchemaNode` public exposure since boundary is now correctly documented
- Added explicit notes that `afterCompile` is compile-time hook, not runtime-facing API

Exit Criteria:

- [x] The owner doc matches the live retained boundary.
- [x] Closure evidence distinguishes interface presence from actual render-path semantics.

## Validation Checklist

- [x] remaining `CompiledSchemaNode` usage is fully inventoried and classified
- [x] runtime-facing render docs no longer treat `CompiledSchemaNode` as the active render contract
- [x] focused verification for retained or narrowed tooling boundary completed
- [x] independent fresh-session closure audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Plan 100 is now complete. The retained `CompiledSchemaNode` boundary is explicit, focused verification is recorded, and independent fresh-session audit confirms there is no remaining plan-owned public/runtime ambiguity.

Closure Audit Evidence:

- Reviewer / Agent: Independent subagent session `ses_26af228e0ffeSdRUtEALgbnskn`
- Evidence: All 8 verification items passed:
  - `@internal` annotation on `CompiledSchemaNode` in `renderer-compiler.ts:95-98`
  - Not in renderer component props (uses `TemplateNode`/`NodeInstance`)
  - Render path is `CompiledTemplate -> TemplateNode -> NodeInstance`
  - `flux-core.md` has boundary classification table at lines 315-349
  - "Remaining Gaps" section clean (no `CompiledSchemaNode` mention)
  - Clear compiler vs runtime separation
  - No overengineering (minimal changes, no new abstractions)
  - Non-goals respected (no render-path or debugger redesign)

Follow-up:

- No additional tooling-specific residue needs to be split into a successor plan.
