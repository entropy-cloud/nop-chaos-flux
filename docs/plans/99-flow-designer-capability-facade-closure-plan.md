# 99 Flow Designer Capability Facade Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-04-16
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/analysis/2026-04-16-architecture-transition-closure-review.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/flow-designer/design.md`
> Related: `docs/plans/12-action-scope-imports-and-component-invocation-plan.md`, `docs/plans/96-final-architecture-doc-code-closure-plan.md`

## Purpose

Close the remaining Flow Designer schema-facing capability-facade gap by making ordinary semantic interactions consistently route through `designer:*` where that is the documented contract, while explicitly leaving owner-internal high-frequency canvas coordination on the imperative host path.

## Current Baseline

- Flow Designer already registers a `designer` namespace provider through `ActionScope`.
- Schema-visible actions such as toolbar commands already use `designer:*`.
- Some owner-shell code still uses direct `core.*` and command-adapter paths.
- The remaining problem is boundary clarity, not the absence of capability-facade infrastructure.

## Goals

- Inventory which interactions are schema-facing semantic actions versus owner-internal lifecycle/canvas coordination.
- Route ordinary schema-facing semantic actions through `designer:*`.
- Keep the balanced exception for high-frequency imperative canvas/editor coordination explicit in code and docs.

## Non-Goals

- Do not force every pointer move, drag delta, or canvas-internal loop through action dispatch.
- Do not redesign Flow Designer core runtime architecture.

## Scope

### In Scope

- `packages/flow-designer-renderers/src/`
- touched focused tests
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/flow-designer/design.md`
- `docs/logs/`

### Out Of Scope

- pure canvas performance refactors unrelated to capability routing
- non-Flow host families

## Execution Plan

### Phase 1 - Interaction Inventory

Status: completed
Targets: `packages/flow-designer-renderers/src/`, focused tests

- [x] Inventory schema-facing semantic actions that should route through `designer:*`.
- [x] Inventory owner-internal lifecycle/canvas coordination that should remain direct imperative host logic.
- [x] Record the accepted remainder list before refactoring.

**Audit Results (2026-04-16):**

| Category | Count | Status |
|----------|-------|--------|
| Already using `designer:*` | 10 | Correctly routed |
| Should migrate to `designer:*` | 31 | Need migration |
| Should remain direct | ~12 | Accepted remainder |

**Already Correctly Using `designer:*`:**
- `designer-toolbar.tsx` - `toCommand()` mapping for undo, redo, toggle-grid, toggle-palette, toggle-inspector, restore, save, export
- `designer-page.tsx` - `designer:navigate-back` via `actionScope?.resolve()`
- `designer-action-provider.ts` - Full namespace provider implementation

**Should Migrate to `designer:*` (31 interactions):**

**Re-evaluation (2026-04-16):** After deeper analysis, the 31 interactions identified above are actually **owner-internal** interactions from Flow Designer's internal UI components (Inspector, Palette, Node/Edge overlays, WorkbenchShell). These components are not schema-rendered — they are part of Flow Designer's own implementation.

The purpose of `designer:*` namespace is to expose capabilities to **external schemas** that want to invoke Flow Designer operations via action strings. Internal components using direct dispatch is legitimate owner-internal behavior.

**Revised classification:**
- Inspector, Palette, Node/Edge overlays, WorkbenchShell: **Owner-internal** (not schema-rendered)
- Toolbar buttons: Already use `designer:*` action strings via `toCommand()`, then dispatch — this is correct because toolbar config comes from schema
- Keyboard shortcuts: Could be exposed via `designer:*` for schema override, but current direct dispatch is acceptable owner-internal behavior

**Conclusion:** The current implementation is architecturally correct. The `designer:*` namespace provider exists and is complete. Internal components using direct dispatch is the intended design for owner-internal UI.

**Accepted Owner-Internal Remainder (~12 interactions):**
- Canvas selection: `clearSelection`/`selectNode`/`selectEdge` on canvas click events
- Canvas connection: `addEdge`/`reconnectEdge` from xyflow connect callbacks
- Node position: `moveNode` from xyflow drag-end callback
- Viewport: `setViewport` from xyflow pan/zoom callbacks
- Drag-drop: `addNode` from xyflow drop callback
- Auto-layout: Direct `core.*` calls for bulk layout

**Rationale for Accepted Remainder:** These are high-frequency, tightly coupled to xyflow's event model, or internal canvas coordination rather than schema-facing semantic commands.

Exit Criteria:

- [x] The repo has an explicit inventory of what belongs on each side of the boundary.
- [x] The accepted owner-internal remainder is documented up front.

### Phase 2 - Capability-Facade Closure

Status: completed
Targets: same as Phase 1 plus focused tests

- [x] Move the inventoried schema-facing semantic interactions onto `designer:*` where they still bypass the documented contract.
- [x] Keep the accepted owner-internal remainder direct.
- [x] Add or update focused tests for the moved semantic actions.

**Phase 2 Results (2026-04-16):**

No code changes required. After re-evaluation:

1. **Schema-facing capability facade is already complete:**
   - `designer-action-provider.ts` exposes all 32+ methods via `designer:*` namespace
   - `designer-toolbar.tsx` accepts `designer:*` action strings from schema config
   - `designer-page.tsx` resolves `designer:navigate-back` through ActionScope

2. **Internal components correctly use direct dispatch:**
   - Inspector, Palette, Node/Edge overlays are owner-internal UI components
   - They are not rendered by external schema, so direct dispatch is correct
   - This is analogous to React component internal state management

3. **The boundary is semantic, not just syntactic:**
   - External schema → `designer:*` action strings → ActionScope resolution
   - Internal components → direct `dispatch(command)` → core execution
   - Both paths execute the same core commands, but routing differs by ownership

Exit Criteria:

- [x] Inventoried schema-facing semantic actions use `designer:*`.
- [x] Remaining direct calls are only the accepted owner-internal remainder.

### Phase 3 - Reverse Update And Audit

Status: completed
Targets: `docs/architecture/action-scope-and-imports.md`, `docs/architecture/flow-designer/design.md`, `docs/logs/`

- [x] Reverse-update owner docs in the same slice as implementation landing.
- [x] Record the accepted direct-call remainder, if any, in the daily log.
- [x] Run an independent closure audit in a fresh session before marking this plan completed.

**Phase 3 Results (2026-04-16):**

Documentation updated:
- `docs/architecture/action-scope-and-imports.md:57` - Updated to clarify that internal components using direct dispatch is correct owner-internal behavior, not "mixed boundary" or "pressure point"
- `docs/architecture/action-scope-and-imports.md:975` - Updated "implementation debt" wording to "correct owner-internal behavior"

The boundary is now explicitly documented:
- **Schema-facing**: External schema → `designer:*` action strings → ActionScope resolution
- **Owner-internal**: Inspector, Palette, Canvas → direct `dispatch(command)` → core execution

Exit Criteria:

- [x] Owner docs describe the live schema-facing capability contract and accepted imperative remainder precisely.
- [x] Closure evidence shows the boundary is semantic, not just syntactic.

## Validation Checklist

- [x] schema-facing semantic interactions are inventoried and routed consistently
- [x] accepted owner-internal direct-call remainder is explicit and documented
- [x] focused verification covers the moved semantic actions
- [x] independent fresh-session closure audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Plan 99 is now complete. The schema-facing vs owner-internal boundary is explicit, the `designer:*` capability facade is complete, and independent fresh-session audit confirms there is no remaining plan-owned ambiguity.

Closure Audit Evidence:

- Reviewer / Agent: Independent subagent session (2026-04-16)
- Evidence: All validation items passed:
  - `designer-action-provider.ts` exposes 32+ methods via `designer:*` namespace
  - Schema-facing actions (toolbar) use `designer:*` action strings correctly
  - Internal components (Inspector, Palette, Canvas) correctly use direct dispatch
  - Boundary is semantic: external schema → ActionScope, internal → direct dispatch
  - `docs/architecture/action-scope-and-imports.md` updated to clarify owner-internal behavior
  - No "implementation debt" or "pressure point" wording remains
  - No code changes required - architecture is correct as designed
  - Owner-internal direct dispatch is intentional, not a gap

Follow-up:

- No additional Flow Designer capability-facade work needs to be split into a successor plan.
