# Development Plan

## Purpose

This document tracks the implementation plan for the NOP Chaos AMIS renderer framework and records which parts are already in place.

It should be read together with:

- `docs/architecture/amis-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/frontend-baseline.md`

## Delivery Strategy

The implementation strategy is:

1. stabilize architecture first
2. implement compiler and runtime foundations second
3. add renderer sets and scenario demos third
4. harden observability, performance, and extension points last

This avoids the most expensive failure mode: shipping many renderers before the underlying value, scope, and runtime models are stable.

## Current Status Snapshot

Already in place:

- workspace bootstrap and package layout
- expression compilation package with static fast path and identity reuse behavior
- schema and runtime foundations
- React integration with contexts, hooks, and dialog host
- basic, form, and data renderers
- monitored playground demo
- tests for runtime, React integration, renderers, debounce, cancellation, and monitor hooks

Still strategically important next:

- migrate implementation toward `scope.get/has/readOwn`
- converge runtime toward unified compiled value trees
- evolve `amis-formula` toward resolver-driven `EvalContext`
- finish the documentation migration under `docs/`

## Reference Documents by Concern

### Architecture baseline

- `docs/architecture/amis-core.md`
  - official schema semantics
  - scope direction
  - EvalContext direction
  - action and runtime boundaries

### Renderer and React contracts

- `docs/architecture/renderer-runtime.md`
  - props versus hooks split
  - region rendering
  - context split
  - performance rules

### Workspace and engineering baseline

- `docs/architecture/frontend-baseline.md`
  - package boundaries
  - naming rules
  - scripts and quality gates

### Interface reference

- `docs/references/renderer-interfaces.md`
  - key type and contract overview

### Expression prototype notes

- `docs/references/expression-processor-notes.md`
  - semantic lessons from the early prototype

## Phase Overview

| Phase | Goal | Status |
| --- | --- | --- |
| P0 | workspace and framework bootstrap | done |
| P1 | expression compiler foundation | done for current model |
| P2 | schema compiler core | done for current model |
| P3 | runtime and React integration | done for current model |
| P4 | basic renderer set | done |
| P5 | form and action system | done in first usable version |
| P6 | data renderers and CRUD scenario | done in first usable version |
| P7 | convergence, performance hardening, and release-quality docs | active |

## Phase Details

### P0 - Workspace and framework bootstrap

Goal:

- set up the `pnpm` workspace
- establish TypeScript, testing, linting, and playground entry points

Exit result:

- complete

### P1 - Expression compiler foundation

Goal:

- compile expressions and template strings once
- preserve static fast path
- preserve dynamic identity reuse
- avoid `new Function(...)` in the formal design direction

Current result:

- current implementation works and is tested
- next convergence step is resolver-driven evaluation with `EvalContext`

References:

- `docs/architecture/amis-core.md`
- `docs/references/expression-processor-notes.md`

### P2 - Schema compiler core

Goal:

- compile raw schema into executable node trees
- identify regions and stable node paths
- give runtime a directly consumable compiled model

Current result:

- first version implemented
- next convergence step is reducing long-term reliance on separate `staticProps` and `dynamicProps`

References:

- `docs/architecture/amis-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/references/renderer-interfaces.md`

### P3 - Runtime and React integration

Goal:

- connect runtime logic to React without collapsing the architecture layers
- support context-driven rendering, fragment rendering, and action dispatch

Current result:

- implemented and tested
- next convergence step is narrower scope access and unified value-node evaluation

References:

- `docs/architecture/renderer-runtime.md`
- `docs/references/renderer-interfaces.md`

### P4 - Basic renderer set

Goal:

- support a minimal page-rendering loop before advanced forms and data workflows

Current result:

- `page`, `container`, `tpl`, `text`, and `button` are implemented

### P5 - Form and action system

Goal:

- support the first complex interaction loop: form plus action plus API plus dialog

Current result:

- first usable version implemented
- includes `setValue`, `ajax`, `submitForm`, `dialog`, `closeDialog`, `refreshTable`, `then`, debounce, and cancellation

### P6 - Data renderers and CRUD scenario

Goal:

- support data-oriented renderers and a realistic CRUD demo flow

Current result:

- table renderer and operation column are implemented
- playground demonstrates a local CRUD-style loop

### P7 - Convergence and hardening

Goal:

- align the implementation with the latest official architecture direction
- finish documentation organization
- keep performance and observability guarantees strong

Current priority tasks:

1. implement `ScopeRef.get`, `ScopeRef.has`, and `ScopeRef.readOwn` as the main access path
2. move runtime toward a unified compiled value tree model
3. evolve `amis-formula` toward resolver-based execution using `EvalContext`
4. align runtime behavior with the latest `closeDialog` semantics
5. keep docs and code synchronized when architecture decisions change

## Milestone View

Useful milestone names for future work:

- M1: framework skeleton
- M2: expression engine ready
- M3: minimal renderer loop
- M4: form and dialog demo
- M5: CRUD demo
- M6: convergence-ready alpha

The repo has effectively reached M5 and is now working through M6-style convergence and hardening.

## Testing Strategy

Core testing focus remains:

- expression compile and evaluate semantics
- schema compilation behavior
- runtime prop and meta resolution
- action dispatch behavior
- scope creation and selector behavior
- dialog lifecycle
- row scope behavior
- static fast path and dynamic identity reuse

The baseline verification commands are:

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`

## Implementation Rules

Keep following these rules during further development:

1. update architecture docs before or together with major architectural code changes
2. keep the `runtime` layer independent from React
3. do not reintroduce `new Function(...)` as the production expression path
4. keep static fast path and identity reuse covered by tests
5. add or update playground demos before expanding complex renderer behavior
6. keep custom renderer authoring ergonomic; do not let the API become ceremony-heavy

## Immediate Next Actions

Recommended next sequence:

1. finish the `docs/` migration and treat the new docs tree as the primary documentation entry
2. implement the `ScopeRef` API convergence work
3. refactor value compilation toward the unified compiled value tree model
4. refit `amis-formula` around resolver-based evaluation

## Related Documents

- `docs/architecture/amis-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/references/renderer-interfaces.md`
- `docs/examples/user-management-schema.md`
