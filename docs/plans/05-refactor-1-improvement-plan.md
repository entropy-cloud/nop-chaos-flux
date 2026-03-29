# Refactor-1 Improvement Plan

## Purpose

This plan defines how to improve `refactor-1` after comparing it with `refactor-2`.

The key conclusion from the comparison is:

- keep `refactor-1` as the architectural baseline
- preserve its modular runtime split
- selectively absorb the strongest ideas from `refactor-2`
- avoid reintroducing large entry files or mixed responsibilities

This is an implementation plan, not a retrospective. Each workstream should land as a small, reviewable change with tests.

## Decision Summary

### Keep from `refactor-1`

`refactor-1` should remain the base because it already has the stronger shape in these areas:

- thin runtime assembly in `packages/flux-runtime/src/index.ts`
- explicit runtime modules such as `action-runtime.ts`, `request-runtime.ts`, `form-runtime.ts`, and `validation-runtime.ts`
- targeted handling of deep schema structures in `schema-compiler.ts`
- cleaner package entry points in `amis-renderers-form`

### Import from `refactor-2`

The ideas worth adopting are:

- validation rule registry and validator module split
- shared form renderer presentation primitives
- further reduction of package entry files to assembly-only roles
- better separation between validation rule collection, message building, and validator execution

## Goals

1. Improve extensibility without weakening the current modular structure.
2. Make validation rules easier to add, test, and reason about.
3. Reduce duplication in form renderer presentation code.
4. Keep complex runtime behavior split across focused modules.
5. Add guardrails so future refactors do not collapse back into large files.

## Non-Goals

- no intentional public API redesign
- no broad runtime behavior rewrite
- no migration toward a single-file runtime model
- no speculative abstraction that is not backed by repeated use

## Target End State

After this work:

- `packages/flux-runtime/src/index.ts` remains an assembly layer
- validation logic is split into a dedicated directory with stable module boundaries
- renderer shared UI pieces live in focused shared files
- schema compiler keeps deep-region handling while delegating validation concerns cleanly
- tests cover both current runtime behavior and the new extension points

## Workstreams

## W1 - Introduce a validation module boundary inside `amis-runtime`

### Goal

Adopt the best part of `refactor-2`: a more extensible validation subsystem, but without moving form runtime logic back into `index.ts`.

### Why

`refactor-1` already separates runtime validation execution well, but the rule system is still more coupled than it needs to be. `refactor-2` shows a useful direction by splitting:

- rule collection
- message building
- validator implementation
- validator registration

### Planned structure

Add or evolve toward:

- `packages/flux-runtime/src/validation/index.ts`
- `packages/flux-runtime/src/validation/rules.ts`
- `packages/flux-runtime/src/validation/message.ts`
- `packages/flux-runtime/src/validation/errors.ts`
- `packages/flux-runtime/src/validation/validators.ts`
- `packages/flux-runtime/src/validation/registry.ts`

Keep runtime execution flow in runtime-specific files such as:

- `packages/flux-runtime/src/validation-runtime.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`

### Checklist

- extract schema-to-rule collection helpers from `packages/flux-runtime/src/schema-compiler.ts`
- move message formatting helpers into `packages/flux-runtime/src/validation/message.ts`
- move error normalization helpers into `packages/flux-runtime/src/validation/errors.ts`
- move built-in sync validators into `packages/flux-runtime/src/validation/validators.ts`
- add `packages/flux-runtime/src/validation/registry.ts` for validator lookup and future extension
- keep async rule execution in runtime flow code rather than pushing it into generic validators
- make `packages/flux-runtime/src/validation/index.ts` the public barrel for validation internals
- update imports so `schema-compiler.ts` and `validation-runtime.ts` depend on validation modules, not the other way around

### Acceptance criteria

- adding a new built-in validation rule requires touching one focused area instead of several unrelated files
- runtime execution order and async debounce behavior remain unchanged
- `packages/flux-runtime/src/index.ts` does not grow because of this change

## W2 - Keep `amis-runtime` modular and prevent backsliding

### Goal

Protect the strongest part of `refactor-1`: the runtime decomposition.

### Why

The main weakness in `refactor-2` is that too much logic moved back into `packages/flux-runtime/src/index.ts`. That should not happen here.

### Checklist

- keep `packages/flux-runtime/src/index.ts` limited to wiring, factory composition, and exports
- if a new helper exceeds trivial assembly logic, move it into a named runtime module
- review `packages/flux-runtime/src/form-runtime.ts` for additional internal split opportunities only when responsibilities are clearly separable
- preserve dedicated modules for request handling, action dispatch, subtree traversal, registration lookup, and form state helpers
- add a simple maintenance rule in docs: no runtime entry file should become the default home for new behavior

### Acceptance criteria

- no new runtime god file appears
- module ownership remains obvious from filenames
- future contributors have a clear place to add new behavior

## W3 - Extract shared form renderer primitives

### Goal

Borrow the better UI-layer reuse from `refactor-2` without weakening the existing package entry organization.

### Why

`refactor-2` introduces small shared pieces for label, help text, field hint, and error display. Those are good extractions because they reduce duplication and keep renderers focused on field-specific behavior.

### Planned structure

Add a shared renderer area such as:

- `packages/flux-renderers-form/src/renderers/shared/index.ts`
- `packages/flux-renderers-form/src/renderers/shared/label.tsx`
- `packages/flux-renderers-form/src/renderers/shared/error.tsx`
- `packages/flux-renderers-form/src/renderers/shared/help-text.tsx`
- `packages/flux-renderers-form/src/renderers/shared/field-hint.tsx`

### Checklist

- identify repeated label, hint, and error rendering patterns in form controls
- extract only the repeated presentation pieces, not field-specific behavior
- keep accessibility-related props and semantics consistent during extraction
- update `input.tsx`, `key-value.tsx`, `array-editor.tsx`, and any composite controls to consume the shared pieces
- keep `packages/flux-renderers-form/src/index.tsx` as a package entry and export surface only

### Acceptance criteria

- renderer files become smaller and easier to read
- repeated field chrome markup is reduced
- no behavior change in validation message visibility or field labeling

## W4 - Preserve schema compiler strengths while reducing mixed concerns

### Goal

Keep the compiler strengths unique to `refactor-1`, especially deep-region normalization, while narrowing its responsibilities.

### Why

`refactor-1` already handles complex cases like nested table column regions well. That is a real architectural strength and should stay. The improvement opportunity is to keep that logic while offloading validation-specific helpers into the new validation modules.

### Checklist

- keep table column region extraction logic in `packages/flux-runtime/src/schema-compiler.ts`
- document the current deep-region normalization rules with examples
- move validation rule collection and trigger normalization helpers out of the compiler where practical
- verify compiler output snapshots for nested table column cases before and after extraction
- avoid turning compiler-specific normalization into a generic abstraction too early

### Acceptance criteria

- compiler remains the owner of schema-shape normalization
- validation-specific concerns are reduced inside the compiler
- deep table and nested region behavior remains stable

## W5 - Strengthen extension tests and regression coverage

### Goal

Make sure the follow-up refactor improves extensibility without silently changing runtime behavior.

### Why

The improvements in this plan mostly move code across boundaries. That is exactly where regressions tend to hide.

### Checklist

- add tests for validator registry lookup and duplicate registration behavior
- add focused tests for built-in validator functions independent of full form runtime flows
- add tests confirming compiled validation dependency paths remain correct
- add tests around async validation debounce and stale-run cancellation behavior
- add tests covering shared field chrome rendering if shared renderer primitives are introduced
- keep or expand integration tests in `packages/flux-runtime/src/index.test.ts`

### Acceptance criteria

- moved code is covered at the module level and the integration level
- extension points are tested directly, not only through end-to-end flows
- regression risk from internal file movement is reduced

## W6 - Improve documentation for maintainers

### Goal

Record the architectural rules so the branch keeps its advantages over time.

### Why

Without explicit guidance, later cleanup work can accidentally undo the benefits of this refactor.

### Checklist

- add a short architecture note explaining the module boundaries inside `amis-runtime`
- document where new validation rules should be added
- document what belongs in `schema-compiler.ts` versus validation modules
- document the purpose of shared renderer primitives and when not to add one
- add a brief follow-up completion report after the implementation lands

### Acceptance criteria

- future contributors can find the intended extension points quickly
- code placement decisions are easier to keep consistent during review

## Recommended Execution Order

1. W1 validation module boundary
2. W4 compiler cleanup around validation concerns
3. W5 validation-focused tests
4. W3 shared form renderer primitives
5. W6 documentation updates
6. W2 final modularity review and cleanup pass

## Delivery Strategy

Prefer several small PR-sized commits instead of one large reshuffle.

Suggested commit slices:

1. validation helpers split with no behavior change
2. validation registry and validator wiring
3. compiler import cleanup and focused tests
4. shared form renderer primitives
5. docs and final cleanup

## Success Criteria

This plan succeeds if:

- `refactor-1` keeps its stronger modular architecture
- validation becomes easier to extend than it is today
- renderer code becomes easier to read without losing behavior clarity
- deep schema compilation behavior stays intact
- the branch gains the best ideas from `refactor-2` without inheriting its structural regressions

