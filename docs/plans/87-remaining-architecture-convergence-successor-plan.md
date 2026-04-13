# 87 Remaining Architecture Convergence Successor Plan

> Plan Status: in progress
> Last Reviewed: 2026-04-13
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/82-architecture-contract-implementation-convergence-plan.md`, `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/form-validation.md`, `docs/architecture/api-data-source.md`, `docs/architecture/template-instantiation-and-node-identity.md`, `docs/architecture/surface-owner.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`, `docs/architecture/field-frame.md`, `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flow-designer/config-schema.md`, `docs/architecture/report-designer/inspector-design.md`
> Related: `docs/plans/82-architecture-contract-implementation-convergence-plan.md`

## Purpose

Own the remaining open architecture-convergence debt that was previously mixed into the oversized umbrella scope of Plan 82.

This successor exists so Plan 82 can close as a completed historical record of the baseline freeze plus value-adaptation / inline-composite convergence slice, while the still-open runtime, identity, surface, styling, and platform-host work keeps one explicit owner.

## Current Baseline

- Plan 82 Phase 1 and Phase 6 are complete and already reflected in the live repo.
- The remaining open work from the old umbrella scope is still real, but it is no longer helpful to keep it attached to a plan whose completed slice is now closure-ready.
- The still-open implementation lag is the same debt already identified in `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md`: `Final Execution Schema` / `Host Projection`, foundational runtime substrate, node identity/runtime carriers, surface ownership/import boundaries, styling-contract enforcement, and Flow/Report host-bridge alignment.

## Goals

- Converge the remaining runtime/React execution boundaries with the current architecture docs.
- Finish the still-open identity, surface-ownership, styling, and platform-host alignment that Plan 82 no longer owns.
- Provide the closure audit and full-verification path for the remaining architecture-drift backlog.

## Non-Goals

- Do not reopen the already-landed Phase 6 decision that `object-field`, `array-field`, and `variant-field` are inline live-edit controls by default.
- Do not treat this successor as a generic repo cleanup plan.
- Do not silently inherit closed scope from Plan 82; only the explicitly listed remaining debt belongs here.

## Scope

### In Scope

- Remaining open scope previously described by Plan 82 Phase 2, Phase 3, Phase 4, Phase 5, Phase 7, Workstream 8A, Workstream 8B, and Phase 9
- Required code/docs/tests across `packages/flux-core`, `packages/flux-runtime`, `packages/flux-react`, renderer packages, debugger, Flow Designer, Report Designer, Spreadsheet, and affected docs/logs

### Out Of Scope

- Re-litigating the completed Plan 82 Phase 6 ownership baseline
- New product features outside architecture-conformance work

## Execution Plan

### Workstream 1 - Execution Boundary And Host Projection

Status: in progress
Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/`, `packages/flux-react/src/render-nodes.tsx`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/workbench/`, related tests

- [ ] Finish the `Final Execution Schema` boundary convergence.
- [ ] Finish `Host Projection` shared-contract convergence.
  Progress: the first substrate slice is now landed. `RendererRuntime` exposes `createHostProjectionScope(...)` as a shared runtime contract, `packages/flux-runtime/src/index.ts` owns the projected-host readonly/write-guard behavior that previously existed only inside `packages/flux-react/src/workbench/hooks.ts`, and `useHostScope()` now delegates to that runtime surface instead of inlining the contract locally.
- [ ] Add focused tests covering projected host read/write semantics and normalized execution inputs.

Exit Criteria:

- [ ] The root execution path no longer depends on ad hoc `SchemaInput` compilation as the steady-state runtime contract.
- [ ] `Host Projection` is exposed as an explicit shared runtime/core boundary rather than mostly a React-local helper surface.
  Current evidence: `packages/flux-core/src/types/renderer-core.ts` and `packages/flux-runtime/src/index.ts` now expose `createHostProjectionScope(...)`, and `packages/flux-react/src/workbench/hooks.ts` delegates to that shared runtime boundary instead of owning the projected-field write-guard logic locally.

### Workstream 2 - Runtime, Identity, And Surface Ownership

Status: planned
Targets: `packages/flux-runtime/src/`, `packages/flux-react/src/`, `packages/nop-debugger/src/`, focused tests

- [ ] Finish the remaining foundational runtime substrate alignment from old Plan 82 Phase 3.
- [ ] Finish the remaining `cid`-first / no-`NodeLocator` identity convergence from old Plan 82 Phase 4.
- [ ] Finish the remaining surface-owner and import/action-scope boundary convergence from old Plan 82 Phase 5.

Exit Criteria:

- [ ] Runtime/data-source/reaction semantics match the current owner docs under focused tests.
- [ ] Mounted-node lookup, debugger inspection, DOM `data-cid`, and runtime targeting converge on the live `cid` model.
- [ ] Surface open/close/stack behavior and import/action-scope publication match the documented runtime boundaries.

### Workstream 3 - Styling Contract Enforcement

Status: planned
Targets: `packages/flux-react/src/field-frame.tsx`, affected renderer files, shared tests

- [ ] Finish the remaining renderer styling-contract audit from old Plan 82 Phase 7.
- [ ] Add/finish focused DOM assertions that lock the semantic-marker / `data-slot` / presence-only state-attribute contract.

Exit Criteria:

- [ ] Audited renderers no longer carry implicit layout through semantic root markers.
- [ ] Focused tests prove the documented semantic-marker and slot/state-attribute contract.

### Workstream 4 - Flow And Report Host Convergence

Status: planned
Targets: `packages/flow-designer-*`, `packages/report-designer-*`, `packages/spreadsheet-*`, focused tests

- [ ] Finish the remaining Flow Designer host/bridge alignment from old Plan 82 Workstream 8A.
- [ ] Finish the remaining Report Designer / Spreadsheet host and inspector alignment from old Plan 82 Workstream 8B.

Exit Criteria:

- [ ] Flow host scope, command/bridge, and `createDialog` semantics match the family docs under focused tests.
- [ ] Report/Spreadsheet host projection, dirty/session/status publication, and inspector semantics match the family docs under focused tests.

### Workstream 5 - Final Audit And Verification

Status: planned
Targets: touched code/docs/tests, `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md`, `docs/logs/`

- [ ] Re-audit the remaining drift areas after implementation lands.
- [ ] Update the architecture audit from open lag to closure evidence for the work owned by this successor.
- [ ] Run full verification and an independent closure audit before closing this successor.

Exit Criteria:

- [ ] The successor-owned drift areas are no longer described as active implementation lag in the audit doc.
- [ ] Full workspace verification and an independent closure audit are recorded.

## Validation Checklist

- [ ] `Final Execution Schema` and `Host Projection` behavior conform to the architecture baseline
- [ ] Runtime/data-source/reaction semantics match the current owner docs
- [ ] `NodeLocator` is absent from active runtime/debugger/action implementation paths
- [ ] Mounted-node lookup, debugger, DOM `data-cid`, and registry converge on unique live `cid`
- [ ] Dialog/drawer/surface behavior conforms to the surface-owner contract
- [ ] `xui:imports` / action-scope publication follows the documented node-boundary model
- [ ] Live renderers conform to the semantic-marker / no-implicit-layout styling contract
- [ ] Flow Designer host/bridge behavior conforms to the family docs
- [ ] Report Designer host/bridge behavior conforms to the family docs
- [ ] `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md` is updated to closure evidence for this successor-owned scope
- [ ] `docs/logs/` updated with execution notes and closure evidence
- [ ] independent closure audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: open until the remaining runtime, identity, surface, styling, and platform-host convergence debt inherited from Plan 82 is actually landed and independently audited.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- No remaining successor plan determined yet.
