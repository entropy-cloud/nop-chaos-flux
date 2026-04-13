# 83 Scope Debug Renderer And Component Lab Integration Plan

> Plan Status: in progress
> Last Reviewed: 2026-04-13
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/playground-experience.md`, `docs/architecture/styling-system.md`, `apps/playground/src/route-model.ts`, `apps/playground/src/component-lab/SchemaLabPage.tsx`, `apps/playground/src/component-lab/MultiScenarioLabPage.tsx`
> Related: `docs/plans/79-playground-component-lab-and-live-renderer-coverage-plan.md`, `docs/plans/80-component-lab-rich-examples-plan.md`, `docs/plans/81-playground-component-lab-e2e-behavior-coverage-plan.md`

## Purpose

Add a real Flux shared renderer that can be inserted anywhere in a schema tree to display the current scope as reactive JSON for local debugging, then use the playground Component Lab as the first host surface to validate and expose that capability.

## Current Baseline

- The repo already has debugger-oriented inspection tooling, but no schema-level renderer that can be dropped into any local subtree to inspect the scope visible at that exact render position.
- `apps/playground/src/component-lab/SchemaLabPage.tsx` and `MultiScenarioLabPage.tsx` are the shared host wrappers for almost every shared renderer lab page, making them the smallest integration point for broad lab coverage.
- `apps/playground/src/route-model.ts` currently owns the shared renderer route inventory and must stay aligned with the live registered renderer definitions.
- The `@nop-chaos/ui` package already exports `DataViewer` / `JsonViewer`, so a debug renderer can reuse the existing JSON visualization surface instead of inventing a second viewer.

## Goals

- Add a shared Flux renderer that reads the current scope reactively and renders a safe JSON snapshot.
- Make the renderer usable from schema JSON at any local subtree, not only from playground shell code.
- Add a dedicated Component Lab route/page for the new renderer.
- Inject the renderer into the shared Component Lab lab wrappers so every lab page gets a built-in local scope probe.
- Keep route inventory, docs, and focused tests aligned with the new shared renderer count.

## Non-Goals

- Do not turn this into a full debugger replacement with action timeline, network capture, or DOM targeting.
- Do not add mutation/editing capabilities to the renderer; it is read-only debug output.
- Do not introduce production-only host toggles or feature flags in this slice.
- Do not redesign existing debugger architecture beyond documenting the local schema-level probe use case.

## Scope

### In Scope

- `packages/flux-renderers-basic/src/` renderer implementation, schema typing, registration, and focused tests
- `apps/playground/src/component-lab/` shared wrapper integration and dedicated lab page
- `apps/playground/src/route-model.ts` and registry alignment for the new shared renderer route
- `docs/plans/`, `docs/logs/`, and relevant baseline docs that mention current shared renderer counts

### Out Of Scope

- standalone debugger panel UX redesign
- domain page rollout outside Component Lab
- edit-in-place JSON inspector behavior

## Execution Plan

### Phase 1 - Shared Renderer Landing

Status: completed
Targets: `packages/flux-renderers-basic/src/scope-debug.tsx`, `packages/flux-renderers-basic/src/index.tsx`, `packages/flux-renderers-basic/src/schemas.ts`, `packages/flux-renderers-basic/src/index.test.tsx`

- [x] Add `scope-debug` as a real shared renderer definition in `@nop-chaos/flux-renderers-basic`.
- [x] Make the renderer subscribe to current scope changes via the standard React runtime hook surface.
- [x] Normalize debug output safely for circular references, `undefined`, functions, and `Error` values.
- [x] Add a focused renderer test proving the JSON view updates after a scope write.

Exit Criteria:

- [x] `basicRendererDefinitions` includes `scope-debug`.
- [x] A focused test proves `scope-debug` rerenders after a `setValue`-driven scope update.

### Phase 2 - Component Lab Integration

Status: completed
Targets: `apps/playground/src/component-lab/SchemaLabPage.tsx`, `apps/playground/src/component-lab/MultiScenarioLabPage.tsx`, `apps/playground/src/component-lab/renderers/ScopeDebugLabPage.tsx`, `apps/playground/src/component-lab/renderer-lab-registry.ts`, `apps/playground/src/route-model.ts`

- [x] Add a dedicated lab page that demonstrates root-scope and nested-scope probing.
- [x] Register the new renderer in the shared route inventory and lab registry.
- [x] Inject a `scope-debug` node into the shared lab wrappers so every Component Lab page exposes a local scope probe.

Exit Criteria:

- [x] `#/lab/scope-debug` resolves to a lab page.
- [x] Shared lab wrappers append a visible scope probe without per-page manual edits.

### Phase 3 - Docs And Verification Sync

Status: completed
Targets: `docs/architecture/playground-experience.md`, `docs/plans/83-scope-debug-renderer-and-component-lab-integration-plan.md`, `docs/logs/2026/04-13.md`

- [x] Add an owner plan documenting the feature and rollout scope.
- [x] Update baseline documentation that states the current shared renderer count.
- [x] Run verification and record the results in the daily log.

Exit Criteria:

- [x] Current baseline docs no longer claim the old shared renderer count.
- [x] Verification results are recorded alongside the implementation summary.

## Validation Checklist

- [x] `scope-debug` can be inserted anywhere in schema JSON as a normal renderer node.
- [x] Component Lab exposes the renderer both as its own route and as a shared page-level probe.
- [x] Relevant docs/logs are updated for the new route inventory baseline.
- [x] focused verification has been completed and recorded
- [ ] independent closure-audit has been completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: open until repo-wide verification and closure audit are recorded.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- Revisit whether `scope-debug` should remain automatically injected in all lab pages or become a toggleable lab-shell option after real usage feedback.
