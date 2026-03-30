# Form Validation Improvement Execution Plan

> **Implementation Status: ✅ COMPLETED**
> All 8 execution steps implemented: aggregate errors, array field operations, subscription-based validation, node traversal utilities, normalization helpers, custom validators, debug export, and issue export. See `packages/flux-runtime/src/validation/` and `packages/flux-runtime/src/form-runtime-array.ts`.
>
> This status was verified against the codebase on 2026-03-30.

## Purpose

This document converts the broader validation design work into a concrete execution plan.

It answers one question:

What should we change next, in what order, and what exactly belongs in each step?

This plan is meant to be executed incrementally. Each step should land as a coherent change with tests and, when useful, playground coverage.

## Context

This plan builds on:

- `docs/architecture/form-validation.md`
- `docs/plans/03-form-validation-completion-plan.md`
- `docs/references/react-hook-form-template-notes.md`
- `docs/references/yup-template-notes.md`

It assumes the current repository state already has:

- compiler-extracted field rules
- relational field validators such as `equalsField`, `requiredWhen`, `requiredUnless`
- array/object validation nodes in the compiled model
- subtree validation support
- array aggregate validators such as `minItems`, `maxItems`, `atLeastOneFilled`, `allOrNone`, and `uniqueBy`
- object aggregate validators such as `atLeastOneOf` and object-level `allOrNone`

## Planning Principles

Every step in this plan should follow these rules:

- keep validation compiler-first and runtime-driven
- keep `amis-runtime` React-independent
- do not reorganize around `react-hook-form` or `yup`
- prefer explicit runtime and compiler types over implicit behavior
- each step must leave the system in a shippable state
- each step must add or update tests

## Current Gap Summary

At this point, the biggest remaining gaps are no longer the basic validators.

The most important missing capabilities are:

1. aggregate error ownership and projection
2. first-class array operation semantics
3. richer path-scoped state subscriptions
4. node-driven subtree traversal instead of path scanning
5. normalization phase design
6. custom validator execution context and registry
7. debug/introspection exports

## Execution Order

The recommended execution order is:

1. formalize aggregate error ownership and projection
2. add first-class runtime array operation APIs
3. add path-scoped node state subscription helpers
4. move subtree validation toward node-driven traversal
5. introduce a normalization phase model
6. add custom validator execution context and registry
7. add compiled validation description and debug export
8. add optional standardized issue export

This order intentionally starts with the pieces that affect correctness and runtime semantics, then moves to extension and tooling.

## Step 1: Aggregate Error Ownership and Projection

## Goal

Make aggregate errors explicit and predictable instead of inferring them from rule kind and path shape.

## Why first

We already have multiple aggregate validators.

Before adding more operations and custom rules, we need a stable model for:

- who owns an error
- where it is displayed
- whether it came from a field, object, array, form, or runtime registration

This is the cleanest next foundation step.

## Changes

### Type changes

Update `packages/flux-core/src/index.ts`:

- extend `ValidationError` with ownership metadata
- add explicit source-kind typing
- add projection metadata if needed

Suggested direction:

```ts
type ValidationErrorSourceKind = 'field' | 'object' | 'array' | 'form' | 'runtime-registration';

interface ValidationError {
  path: string;
  rule: string;
  message: string;
  ruleId?: string;
  ownerPath?: string;
  sourceKind?: ValidationErrorSourceKind;
  relatedPaths?: string[];
}
```

### Runtime changes

Update `packages/flux-runtime/src/index.ts`:

- make aggregate validators emit explicit `ownerPath` and `sourceKind`
- distinguish display path from owner path where needed
- preserve projection consistency for array/object root errors

### Renderer changes

Update renderer-facing helpers so aggregate renderers can intentionally read:

- node/root error
- child error

without guessing by rule kind.

## Tests

- runtime tests for aggregate error metadata
- renderer tests for root-vs-child error rendering
- ensure existing aggregate validators still display correctly

## Success Criteria

- aggregate errors carry explicit ownership metadata
- array and object root errors render without inference hacks
- runtime registration child errors remain distinct from root aggregate errors

## Step 2: First-Class Runtime Array Operation APIs

## Goal

Stop treating arrays as only `setValue(path, nextArray)`.

## Why now

Both the current design work and the RHF review point to this as the biggest structural missing piece.

Without first-class operations, remove/reorder/insert semantics stay fragile.

## Changes

### Runtime API changes

Extend `FormRuntime` in `packages/flux-core/src/index.ts` and implementation in `packages/flux-runtime/src/index.ts` with:

```ts
appendValue(path, value)
prependValue(path, value)
insertValue(path, index, value)
removeValue(path, index)
moveValue(path, from, to)
swapValue(path, a, b)
replaceValue(path, value)
```

### State changes

Update runtime to remap:

- values
- errors
- touched
- dirty
- visited
- validating

for array index changes.

### Identity model

Introduce internal item identity for managed arrays.

The public path format can remain numeric, but runtime state remapping should preserve semantic item identity across reorder operations.

### Composite renderer changes

Gradually update composite renderers such as:

- `array-editor`
- `key-value`

to use array operation helpers instead of rebuilding whole arrays by hand.

## Tests

- runtime tests for append/insert/remove/move/swap
- tests for remapping aggregate errors and child errors after reorder
- renderer tests for stable UI behavior after remove and reorder

## Success Criteria

- no stale child errors after remove or reorder
- runtime supports explicit array semantics
- composite controls stop reimplementing low-level array update logic repeatedly

## Step 3: Path-Scoped Node State Subscription Helpers

## Goal

Improve render isolation and make object/array/aggregate UI easier to build.

## Why now

Once aggregate ownership is explicit and array operations are first-class, we need better ways for renderers to subscribe only to the state they care about.

This is where the RHF review is most relevant.

## Changes

### React helper additions

Add hooks or helpers in `packages/flux-react/src/index.tsx` such as:

```ts
useValidationNodeState(path)
useFieldError(path)
useAggregateError(path)
useChildFieldState(path)
```

### Selector behavior

Make these helpers subscribe only to the needed slices, not the full form state.

### Renderer refactors

Migrate composite controls and custom node renderers to these helpers.

## Tests

- hook-level subscription tests where possible
- renderer tests proving aggregate/root errors update without unrelated re-renders being required

## Success Criteria

- object/array node renderers can read root error state directly
- child-field and aggregate-field UI are easier to implement consistently
- render subscriptions stay path-scoped

## Step 4: Node-Driven Subtree Validation Traversal

## Goal

Move subtree validation from flat path scanning toward compiled node traversal.

## Why now

The current `validateSubtree(path)` is useful but still flatter than the long-term model.

Yup's recursive composition strongly suggests that node traversal should become the real execution path.

## Changes

### Compiler/model changes

Strengthen `CompiledValidationNode` to explicitly support traversal order and child relationships.

Potential additions:

- stronger `children`
- explicit node-local validation order
- optional node-local normalization hooks later

### Runtime changes

Update `validateSubtree(path)` to:

1. resolve the node
2. validate node rules
3. traverse compiled children
4. merge compiled and runtime-registered child results

### Runtime registration integration

Define how runtime-registered composite children are attached to subtree traversal so node-driven traversal still sees them.

## Tests

- subtree validation ordering tests
- mixed compiled + runtime-registered subtree tests
- aggregate root + child-level combined error tests

## Success Criteria

- subtree validation follows node structure, not only path prefix matching
- mixed compiled/runtime subtree validation remains correct
- future normalization can plug into node traversal naturally

## Step 5: Normalization Phase Design and First Implementation Slice

## Goal

Introduce a formal normalization stage before validation.

## Why now

The Yup review shows that production-grade validation benefits from separating:

- transform / cast / normalize
- validate

We should not wait until custom validators and adapters force us into a messy retrofit.

## Changes

### Type/model changes

Add normalization rule concepts to compiled validation metadata.

Potential direction:

```ts
interface CompiledNormalizationRule {
  path: string;
  kind: string;
  args?: Record<string, unknown>;
}
```

### Runtime changes

Define a pipeline where subtree validation can run as:

1. normalize node value
2. update runtime value if needed
3. validate node and descendants

### First implementation scope

Do not add many normalization rules at once.

Start with a very small slice such as:

- trim string
- compact empty array items
- optional object cleanup for known composite controls

## Tests

- normalization before validation tests
- ensure normalization does not break static fast paths or identity reuse unnecessarily

## Success Criteria

- normalization exists as a formal runtime step
- simple normalization rules work before validation
- architecture stays compatible with future richer transforms

## Step 6: Custom Validator Execution Context and Registry

## Goal

Add custom validators without creating callback chaos.

## Why now

By this point we will have stronger traversal, projection, and normalization semantics.

That is the right time to expose extension points.

## Changes

### Registry model

Define a named validator registry in runtime or compiler-adjacent infrastructure.

### Execution context

Create a standardized execution context inspired by Yup's test context, but aligned with our runtime.

Potential direction:

```ts
interface ValidationExecutionContext {
  path: string;
  value: unknown;
  parent?: unknown;
  values: Record<string, unknown>;
  scope: ScopeRef;
  createError(...): ValidationError;
  resolve(...): unknown;
}
```

### Schema model

Add named validator references with:

- `name`
- `args`
- `when`
- `target`
- `message`

## Tests

- custom validator execution tests
- conditional activation tests
- projection tests

## Success Criteria

- custom validators are serializable and named
- runtime stays in control of scheduling and cancellation
- custom validators can participate in object/array/form nodes

## Step 7: Compiled Validation Description and Debug Export

## Goal

Make validation structure explainable.

## Why now

The system is becoming rich enough that debugging and documentation need first-class support.

This is strongly reinforced by the Yup review.

## Changes

### Runtime/compiler additions

Add a description/export API such as:

```ts
describeValidation(path?: string)
```

It should include:

- node kind
- control type
- label
- rules
- dependencies
- projection metadata
- children

### Playground/dev support

Optionally surface this in playground or test utilities.

## Tests

- compiler description tests
- snapshot-friendly debug description tests

## Success Criteria

- compiled validation behavior can be inspected without reading runtime internals directly
- docs and playground can explain validation structure more clearly

## Step 8: Optional Standardized Issue Export

## Goal

Allow validation results to be exported in a normalized external issue format.

## Why last

Interop should come after internal model stability, not before.

## Changes

### Export helper

Add a converter from internal runtime results to a standardized issue shape with segmented paths.

### Use cases

- future adapters
- diagnostics
- AI tooling
- external integration layers

## Tests

- path segmentation tests
- nested error export tests

## Success Criteria

- internal model can be exported without changing the internal architecture
- interoperability is improved without making external standards the source of truth

## Execution Notes

## Commit Discipline

Each numbered step should usually land as one commit or a small set of tightly related commits.

Do not mix unrelated improvements across steps unless they are truly inseparable.

## Testing Discipline

For every step:

- update runtime tests
- update renderer tests if UI behavior changes
- run targeted `vitest` coverage for touched packages
- run `pnpm typecheck`

## Documentation Discipline

After major steps:

- update `docs/architecture/form-validation.md` when the official behavior changes
- update examples or playground where new semantics should be demonstrated

## Recommended Immediate Next Step

The next implementation step should be Step 1: Aggregate Error Ownership and Projection.

That is the best place to resume coding because:

- we already have several aggregate validators
- projection semantics affect both correctness and renderer behavior
- later work on array operations and subscriptions will be cleaner if ownership is explicit first

## Related Documents

- `docs/architecture/form-validation.md`
- `docs/plans/03-form-validation-completion-plan.md`
- `docs/references/react-hook-form-template-notes.md`
- `docs/references/yup-template-notes.md`

