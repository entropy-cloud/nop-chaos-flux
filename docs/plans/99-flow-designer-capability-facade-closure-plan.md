# 99 Flow Designer Capability Facade Closure Plan

> Plan Status: planned
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

Status: planned
Targets: `packages/flow-designer-renderers/src/`, focused tests

- [ ] Inventory schema-facing semantic actions that should route through `designer:*`.
- [ ] Inventory owner-internal lifecycle/canvas coordination that should remain direct imperative host logic.
- [ ] Record the accepted remainder list before refactoring.

Exit Criteria:

- [ ] The repo has an explicit inventory of what belongs on each side of the boundary.
- [ ] The accepted owner-internal remainder is documented up front.

### Phase 2 - Capability-Facade Closure

Status: planned
Targets: same as Phase 1 plus focused tests

- [ ] Move the inventoried schema-facing semantic interactions onto `designer:*` where they still bypass the documented contract.
- [ ] Keep the accepted owner-internal remainder direct.
- [ ] Add or update focused tests for the moved semantic actions.

Exit Criteria:

- [ ] Inventoried schema-facing semantic actions use `designer:*`.
- [ ] Remaining direct calls are only the accepted owner-internal remainder.

### Phase 3 - Reverse Update And Audit

Status: planned
Targets: `docs/architecture/action-scope-and-imports.md`, `docs/architecture/flow-designer/design.md`, `docs/logs/`

- [ ] Reverse-update owner docs in the same slice as implementation landing.
- [ ] Record the accepted direct-call remainder, if any, in the daily log.
- [ ] Run an independent closure audit in a fresh session before marking this plan completed.

Exit Criteria:

- [ ] Owner docs describe the live schema-facing capability contract and accepted imperative remainder precisely.
- [ ] Closure evidence shows the boundary is semantic, not just syntactic.

## Validation Checklist

- [ ] schema-facing semantic interactions are inventoried and routed consistently
- [ ] accepted owner-internal direct-call remainder is explicit and documented
- [ ] focused verification covers the moved semantic actions
- [ ] independent fresh-session closure audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: complete this section only after the schema-facing versus owner-internal interaction boundary is re-audited in the live repo, reverse docs are updated, and an independent fresh-session audit confirms there is no remaining plan-owned ambiguity.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- Move any broader Flow Designer architectural work into a narrower successor plan instead of expanding this closure plan beyond capability-facade routing.
