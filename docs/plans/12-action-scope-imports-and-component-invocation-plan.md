# Action Scope, Imports, And Component Invocation Implementation Plan

> Plan Status: completed
> Last Reviewed: 2026-04-02


> **Implementation Status: ✅ COMPLETED**
> All core items implemented: `ActionScope` class (`action-scope.ts`, 79 lines), `ComponentHandleRegistry` (`component-handle-registry.ts`, 223 lines), `xui:import` processing (`imports.ts`, 260 lines), `component:<method>` dispatch, and `designer:*` namespace provider in designer-page. Full action extension architecture is operational.
>
> This status was verified against the codebase on 2026-03-30.

## Purpose

This plan defines how to implement the action extension architecture described in `docs/architecture/action-scope-and-imports.md`.

The goal is to introduce three complementary runtime mechanisms without collapsing them into one overloaded abstraction:

- data scope for values and updates
- action scope for namespaced non-built-in actions
- component handle registry for explicit instance-targeted capability invocation

This is a major runtime and authoring change. The implementation must therefore be staged, observable, and reversible at clear boundaries.

## Background

The current repository already has a working baseline for:

- data scope reads and writes through `ScopeRef` in `packages/flux-runtime/src/scope.ts`
- built-in action dispatch through `packages/flux-runtime/src/action-runtime.ts`
- explicit host-bound fragment rendering through `packages/flux-react/src/index.tsx`
- domain-host bridge direction in Flow Designer and Report Designer docs

The current system does not yet have first-class support for:

- namespaced host actions resolved from a local runtime-owned action scope
- declarative `xui:import` loading and namespace registration
- targeting one concrete component instance by `componentId` or `componentName` and invoking its explicit public capabilities

This plan turns that architectural direction into an execution sequence.

## Success Criteria

The plan is successful when the repository can support all of the following without violating existing package boundaries:

1. built-in platform actions still behave as they do today
2. one host renderer can expose namespaced actions through an explicit action scope
3. one component type such as form can be targeted by id or name and invoked through an explicit component-handle contract
4. `xui:import` can declare one imported namespace with order-independent, deduplicated semantics
5. schema fragments can use these features without direct access to internal stores or domain-core internals
6. the runtime can monitor and diagnose all three dispatch modes clearly

## Non-Goals For The First Implementation Pass

This plan does not require the first implementation pass to:

- migrate every existing custom action to action scope immediately
- expose every renderer instance through the component registry
- support arbitrary remote module import URLs
- build a full plugin marketplace or third-party sandbox system
- replace all current `actionHandlers` usage in one change
- route high-frequency drag and pointer updates through action dispatch

## Current Constraints To Preserve

The implementation must preserve the following repository-level constraints:

- `ScopeRef` remains a data scope contract
- built-in actions remain explicitly owned by the runtime action dispatcher
- `@nop-chaos/flow-designer-core` and future domain cores stay free of React/runtime registry dependencies
- renderer subtree scope changes stay explicit through render handles and fragment options
- action authoring remains based on `ActionSchema.action` plus structured fields such as `args`

## Target Architecture Summary

The target runtime after this plan should have three distinct lookup and execution paths:

### 1. Data scope path

- used for `${...}` lookup and local value updates
- still based on `ScopeRef`

### 2. Namespaced action path

- used for actions such as `designer:addNode`, `report-designer:preview`, and imported namespaces
- resolved through `ActionScope`

### 3. Component-targeted path

- used for actions that identify `componentId` or `componentName`
- resolved through `ComponentHandleRegistry`

These paths must remain conceptually separate even if some runtime plumbing is shared.

## Package Impact

### `packages/flux-core`

Likely changes:

- add types for `ActionScope`, `ActionNamespaceProvider`, `ResolvedActionHandler`
- add types for `ComponentHandleRegistry`, `ComponentHandle`, `ComponentCapabilities`, `ComponentTarget`
- extend runtime-facing contracts where needed to carry action-scope and component-registry information
- document any new action shape for component-targeted invocation

### `packages/flux-runtime`

Likely changes:

- implement action-scope creation and resolution helpers
- implement component-handle registry
- evolve `action-runtime.ts` so built-in dispatch can delegate to component-targeted or action-scope resolution
- add import loader and import registration support in a later phase

### `packages/flux-react`

Likely changes:

- carry action-scope and component-registry ownership through host rendering boundaries
- expose hooks or helper plumbing if needed
- ensure fragment rendering can explicitly replace or inherit action-scope context the same way data scope is explicitly controlled today

### host renderer packages

Likely changes:

- Flow Designer host renderer registers a `designer` action provider
- future spreadsheet/report host renderers register their own providers
- addressable component renderers such as forms register component handles with explicit capabilities

## Key Design Decisions To Lock Before Coding

Implementation should not start until these decisions are explicit:

### D1. Namespace syntax

Choose one canonical dispatch syntax for namespaced actions.

Recommended:

- use `:` in `action.action` for runtime dispatch names
- examples: `designer:addNode`, `demo:open`, `report-designer:preview`

Do not carry mixed `:` and `.` runtime syntax into implementation.

### D2. Action-scope ownership boundary

Action scope is owned by runtime hosts and import containers.

It is not owned by:

- pure domain cores
- arbitrary child components with no host responsibility
- global mutable singleton registries

### D3. Component-handle public contract

The public contract is explicit capability invocation.

That means:

- component handle may optionally expose `store`
- `store` is not the public callable surface
- no implicit fallback from unknown method to store method name lookup

### D4. Import policy boundary

`xui:import` must load through a trusted module registry or policy layer.

It must not be implemented as arbitrary untrusted script URL execution.

## Proposed Execution Phases

## Phase 0 - Contract Lock And Prototype Boundary

### Goals

- freeze the minimum contract shapes before runtime code spreads across packages
- avoid implementing three mechanisms with inconsistent semantics

### Tasks

- finalize canonical namespaced action syntax
- finalize whether `ActionContext` is extended directly or wrapped internally for runtime-only fields
- define the minimum type additions in `packages/flux-core/src/index.ts`
- define one concrete component-targeted action shape for v1, recommended as `component:<method>`
- define one concrete pilot namespace for v1, recommended as `designer:*`

### Deliverables

- locked contract list for schema/runtime/react changes
- documented naming and priority rules

### Exit criteria

- no open disagreement about namespaced syntax, targeting fields, or ownership boundaries

## Phase 1 - Runtime Types And Internal Infrastructure

### Goals

- add the foundational types and internal registries without changing feature behavior yet

### Tasks

- add `ActionScope`-related interfaces to `packages/flux-core/src/index.ts`
- add `ComponentHandleRegistry`-related interfaces to `packages/flux-core/src/index.ts`
- add internal implementation for action-scope creation and parent-chain resolution in `packages/flux-runtime`
- add internal implementation for component-handle registration and resolution in `packages/flux-runtime`
- add tests for registration, replacement, shadowing, unregister, and not-found behavior

### Deliverables

- typed runtime primitives with tests

### Exit criteria

- action-scope and component-handle registries can be created and tested independently of React

## Phase 2 - Dispatch Pipeline Refactor

### Goals

- evolve the built-in dispatcher into a layered dispatcher without breaking existing built-in action semantics

### Tasks

- refactor `packages/flux-runtime/src/action-runtime.ts` so built-in actions remain first-class but unsupported actions can be delegated
- add resolution order:
  1. built-in platform actions
  2. component-targeted invocation matching `component:<method>` pattern
  3. namespaced action through action scope
  4. structured not-found error
- evaluate `args` into structured payload objects before provider or component-handle invocation
- extend monitor payload so delegated actions can report namespace, method, and component target details
- preserve debounce, plugin hooks, `prevResult`, and error semantics across the new paths

### Deliverables

- layered action dispatcher
- regression tests proving built-in behavior is unchanged
- new tests for namespaced and component-targeted delegation

### Exit criteria

- the runtime supports all three dispatch paths without regressions in built-in actions

## Phase 3 - React Host Integration

### Goals

- make action-scope and component-handle ownership work inside the real React render tree

### Tasks

- define how the active action-scope and component registry are carried through `packages/flux-react/src/index.tsx`
- decide whether to use explicit React contexts, runtime-owned host wrappers, or another equivalent explicit mechanism
- ensure host renderers can render fragments with inherited or replaced action-scope boundaries explicitly, similar to current data-scope rendering
- ensure component handles register and unregister during owned lifecycle boundaries, not render phase
- add tests for nested host boundaries, fragment rendering, and teardown behavior

### Deliverables

- stable React integration contract for action scope and component handles

### Exit criteria

- nested renderer trees can explicitly inherit or replace action-scope ownership without relying on hidden global state

## Phase 4 - Form As The First Component-Targeted Capability

### Goals

- prove the component registry model with the most obvious addressable component: form

### Tasks

- create a form component handle adapter exposing explicit methods such as `submit`, `validate`, `reset`, and `setValue`
- register form handles when form runtime/renderer ownership becomes active
- implement `component:<method>` pattern for `componentId` and `componentName` targeting
- add tests for form submit, validation, reset, and not-found or unsupported method cases
- explicitly verify that no arbitrary store method fallback exists

### Deliverables

- first production-ready component-targeted capability path

### Exit criteria

- schema can target one concrete form instance and invoke supported methods through the unified dispatcher

## Phase 5 - Flow Designer As The First Namespaced Host

### Goals

- prove action-scope integration with a complex host that already needs namespaced actions

### Tasks

- define a `designer` namespace provider that maps namespaced actions to the Flow Designer bridge
- adapt Flow Designer renderer boundaries so toolbar, inspector, dialogs, and shortcuts execute inside the correct host action scope
- keep high-frequency gesture handling in the imperative canvas bridge, not per-event action dispatch
- remove or reduce direct `core.*` calls in schema-driven host interaction paths where namespaced actions are the intended architecture
- add tests for `designer:*` actions from toolbar and inspector fragments

### Deliverables

- first host-backed action scope in active use

### Exit criteria

- Flow Designer host can expose schema-driven actions through `designer:*` without leaking core internals

## Phase 6 - `xui:import` Infrastructure

### Goals

- implement import declaration semantics without introducing unsafe or order-dependent behavior

### Tasks

- define `xui:imports` authoring shape in the active schema model
- implement import spec normalization and module-load dedupe
- implement trusted module loader boundary and policy checks
- implement namespace registration for imported libraries on container-owned action scopes
- define loading, ready, and error states with deterministic runtime behavior
- add tests for repeated imports, same-scope idempotence, namespace collisions, and child-scope visibility

### Deliverables

- import loader
- imported namespace registration
- diagnostics for loading and failure cases

### Exit criteria

- one imported namespace can be declared once or repeatedly and still load once with stable container-scoped visibility

## Phase 7 - Documentation, Examples, And Adoption Guidance

### Goals

- make the new model teachable and safe to adopt

### Tasks

- update examples to demonstrate namespaced host action and component-targeted invocation separately
- add one example showing why data scope, action scope, and component-targeted invocation are distinct concepts
- add one example showing `xui:imports` declaration and dedupe semantics
- update reference docs or terminology if new public vocabulary is finalized in code

### Deliverables

- examples and adoption notes aligned with implementation

### Exit criteria

- a new contributor can tell when to use built-in action, namespaced action, or component-targeted invocation

## Detailed Work Breakdown By Area

### A. Core contracts and types

Files likely touched:

- `packages/flux-core/src/index.ts`

Expected work:

- add registry and provider interfaces
- add any additional dispatch context fields or runtime helper contracts
- define component-target action metadata fields if they become public contract

Risk:

- widening public types too early or with unstable names

Mitigation:

- keep v1 contract minimal and tightly aligned with the plan

### B. Runtime dispatch

Files likely touched:

- `packages/flux-runtime/src/action-runtime.ts`
- `packages/flux-runtime/src/index.ts`
- new helper files for action-scope and component-registry implementation

Expected work:

- split built-in dispatch from delegated dispatch
- preserve plugin, debounce, and monitor semantics
- add structured diagnostics for delegated actions

Risk:

- regressions in built-in actions or chained action behavior

Mitigation:

- keep a regression test matrix for every built-in action before delegation is enabled

### C. React ownership and rendering boundaries

Files likely touched:

- `packages/flux-react/src/index.tsx`

Expected work:

- carry active action-scope and component-registry ownership through the render tree
- preserve current explicit render-boundary rules
- ensure nested hosts behave predictably

Risk:

- hidden global state or lifecycle leaks

Mitigation:

- keep ownership local to host renderers and explicit subtree rendering

### D. Form integration

Files likely touched:

- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-react/src/index.tsx`
- form-related renderer files if needed

Expected work:

- register form handles
- expose explicit form capabilities
- test `component:<method>` pattern

Risk:

- accidentally exposing too much internal form surface

Mitigation:

- only expose a small explicit handle method set in v1

### E. Flow Designer integration

Files likely touched:

- `packages/flow-designer-renderers/src/index.tsx`
- possibly `docs/architecture/flow-designer/api.md` later if implementation refines contracts

Expected work:

- map `designer:*` to bridge/provider model
- ensure toolbar and inspector fragments execute inside the correct host action scope

Risk:

- mixing direct `core.*` UI interactions with schema-driven action paths inconsistently

Mitigation:

- clearly separate gesture-loop internals from schema-driven command submission

### F. Import system

Files likely touched:

- new runtime files for import normalization and loading
- schema compiler or renderer metadata paths if `xui:imports` becomes a first-class schema field

Expected work:

- declaration collection
- deduplicated loading
- namespace registration
- security and diagnostics

Risk:

- unsafe import loading, ambiguous namespace collision semantics, or lifecycle leaks

Mitigation:

- trusted loader only, explicit collision rules, explicit provider disposal

## Verification Plan

### Contract verification

- typecheck all new runtime and schema contracts
- ensure public interfaces remain coherent and minimal

### Runtime verification

- built-in action regression tests
- action-scope resolution tests
- component-targeted invocation tests
- import dedupe and collision tests

### React verification

- nested host boundary tests
- fragment rendering tests with explicit host ownership
- lifecycle registration and cleanup tests

### Host verification

- Flow Designer toolbar/inspector action tests
- form submit/validate/reset targeting tests

### Repository verification

- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`
- `pnpm test`

## Acceptance Matrix

### Contract acceptance

- `ScopeRef` remains data-only
- namespaced action contracts are explicit and documented
- component-targeted invocation uses explicit capability handles, not arbitrary store fallback

### Runtime acceptance

- built-in actions still pass their regression suite
- delegated namespaced actions resolve correctly through local and parent action scopes
- `component:<method>` resolves a target instance and invokes only explicit methods

### Import acceptance

- repeated equivalent imports load once
- import visibility is container-scoped, not render-order-scoped
- namespace collisions produce deterministic errors or explicit shadowing behavior

### Architecture acceptance

- domain cores remain free of action-scope and component-registry dependencies
- host renderers remain the owners of bridge/provider/handle registration
- no hidden global mutable registry is required for normal operation

## Main Risks

### 1. Overgeneralizing too early

Risk:

- building a highly abstract system before the first concrete host and component proofs exist

Mitigation:

- prove the design with one component target (`form`) and one namespaced host (`designer`) first

### 2. Regressing built-in action semantics

Risk:

- delegation changes may subtly alter debounce, chaining, error flow, or monitoring

Mitigation:

- freeze current action-runtime behavior with tests before refactoring

### 3. Leaking internal stores as public API

Risk:

- convenience shortcuts may expose unstable internal mutation helpers

Mitigation:

- require explicit component capability mapping and reject implicit store fallback

### 4. Hidden ownership bugs in React integration

Risk:

- stale providers, duplicate registration, or missed cleanup in nested hosts

Mitigation:

- implement registration in owned lifecycle boundaries and test teardown rigorously

### 5. Import system becoming a hidden script execution channel

Risk:

- a convenience import feature may become an unsafe runtime escape hatch

Mitigation:

- trusted loader policy only, explicit module ids, and constrained namespace provider API

## Recommended Implementation Order

1. lock contract shapes and canonical namespace syntax
2. add schema/runtime types for action scope and component handles
3. refactor the dispatcher into built-in plus delegated phases
4. add React ownership plumbing for action-scope and component-registry boundaries
5. prove `component:<method>` with form
6. prove namespaced host actions with Flow Designer
7. add `xui:import` loading, dedupe, and namespace registration
8. add examples, diagnostics, and adoption guidance

## Concrete First Milestone Recommendation

The first milestone should be intentionally narrow:

- one component-targeted action: form submit/validate
- one namespaced host: `designer:*`
- no import loading yet

If that milestone succeeds, the architecture has proven:

- explicit capability exposure works
- action-scope boundaries can live inside the React tree
- the dispatcher refactor does not break built-in actions

Only after that should `xui:import` be implemented.

## Related Documents

- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/amis-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/api.md`
- `docs/architecture/report-designer/design.md`
- `docs/architecture/report-designer/contracts.md`



