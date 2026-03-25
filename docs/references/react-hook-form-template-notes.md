# React Hook Form Template Notes

## Purpose

This note records what is worth learning from `C:/can/nop/templates/react-hook-form` and what should not be copied directly into `flux`.

This is a research note, not the implementation source of truth for the current repository.

The goal is not to adopt `react-hook-form`.

The goal is to extract design ideas that can strengthen the current compiler-first form runtime and validation model.

## Scope Reviewed

The review focused on the parts most relevant to our current validation work:

- `C:/can/nop/templates/react-hook-form/src/useForm.ts`
- `C:/can/nop/templates/react-hook-form/src/useFieldArray.ts`
- `C:/can/nop/templates/react-hook-form/src/useFormState.ts`
- `C:/can/nop/templates/react-hook-form/src/useWatch.ts`
- `C:/can/nop/templates/react-hook-form/src/formStateSubscribe.tsx`
- `C:/can/nop/templates/react-hook-form/src/logic/createFormControl.ts`
- `C:/can/nop/templates/react-hook-form/src/logic/getProxyFormState.ts`
- `C:/can/nop/templates/react-hook-form/src/logic/updateFieldArrayRootError.ts`
- `C:/can/nop/templates/react-hook-form/src/types/resolvers.ts`

## High-Level Assessment

Yes, there are important design ideas worth borrowing.

The main value is not the public hook API.

The main value is the internal architecture around:

- selective subscription
- array state operations
- root-level aggregate errors for field arrays
- form-control separation from React hooks
- resolver boundaries

Those ideas map well to the direction we are already taking.

What does not map well is the JSX registration model and the assumption that React component lifecycle is the primary source of truth for field registration.

## Quick Takeaway

If you only need the practical conclusion, it is this:

1. keep `FormRuntime` as the central orchestration boundary
2. keep expanding fine-grained state subscriptions in `flux-react`
3. treat array operations and aggregate errors as first-class runtime semantics
4. do not adopt JSX registration as the main field model

## What RHF Gets Right

## 1. Form Control Is Separate From Hook Facade

In `C:/can/nop/templates/react-hook-form/src/useForm.ts`, the hook mostly creates and wires a `formControl` object from `createFormControl(...)`.

The more important logic is in `C:/can/nop/templates/react-hook-form/src/logic/createFormControl.ts`.

That is a good architectural move.

### Why this matters for us

This matches our direction:

- React layer should stay thin
- runtime should own state and validation
- hooks should just subscribe and bridge to runtime

### What to borrow

- keep pushing real form behavior into `flux-runtime`
- avoid putting validation orchestration into renderers or React hooks
- treat React hooks as an ergonomic shell around runtime state

### What not to borrow

- field registration as a primary JSX concern
- component mount order as a core runtime assumption

## 2. Fine-Grained Subscription Is a Major Performance Pattern

`react-hook-form` uses subject-style internal subscriptions and proxy-based form-state access tracking.

Relevant files:

- `C:/can/nop/templates/react-hook-form/src/logic/createFormControl.ts`
- `C:/can/nop/templates/react-hook-form/src/logic/getProxyFormState.ts`
- `C:/can/nop/templates/react-hook-form/src/useFormState.ts`
- `C:/can/nop/templates/react-hook-form/src/useWatch.ts`
- `C:/can/nop/templates/react-hook-form/src/formStateSubscribe.tsx`

The key idea is:

- do not make every field subscribe to the whole form state
- allow consumers to subscribe only to the slices they read
- avoid re-rendering unrelated parts of the tree

### Why this matters for us

We already have the beginnings of this pattern:

- `useCurrentFormState(...)`
- field-local selectors
- child-level UI helpers for composite controls

But RHF shows that subscription granularity should be treated as a first-class design concern, not a minor optimization.

### What to borrow

- continue expanding selector-based subscriptions in `flux-react`
- keep field UI reading only the state it truly needs
- add more path-scoped selectors for aggregate/object/array nodes
- consider a renderless subscribe helper for diagnostics or advanced components

### Suggested follow-up for us

Potential future APIs:

```ts
useFormNodeState(path)
useFieldError(path)
useValidationState(path)
subscribeFormState(selector, callback)
```

We do not need RHF's exact proxy mechanism, but the selective-subscription principle is highly relevant.

## 3. Array Operations Are Treated as First-Class Runtime Semantics

`C:/can/nop/templates/react-hook-form/src/useFieldArray.ts` is important because it treats arrays as more than just `setValue(name, nextArray)`.

It has explicit operations such as:

- append
- prepend
- insert
- remove
- swap
- move
- update

It also maintains a separate identity list with generated ids.

### Why this matters for us

This strongly validates our current Phase 2 direction.

We already identified that array semantics need to become first-class in `flux`, not just be modeled as generic nested paths.

### What to borrow

- explicit array operation APIs in runtime
- stable identity separate from numeric index paths
- dedicated remapping logic for errors, touched, dirty, and visited state

### What this suggests for our roadmap

We should likely add runtime methods along the lines of:

```ts
appendValue(path, value)
prependValue(path, value)
insertValue(path, index, value)
removeValue(path, index)
moveValue(path, from, to)
swapValue(path, a, b)
replaceValue(path, value)
```

This is one of the strongest references from the RHF template.

## 4. Field Array Root Errors Are Explicitly Modeled

`C:/can/nop/templates/react-hook-form/src/logic/updateFieldArrayRootError.ts` is small but conceptually important.

RHF clearly distinguishes:

- child item errors
- root-level array aggregate errors

It projects aggregate array errors to a reserved root location.

### Why this matters for us

This directly matches the direction we are already moving toward with:

- `minItems`
- `maxItems`
- `atLeastOneFilled`
- `allOrNone`
- `uniqueBy`

Those are aggregate errors. They are not child-path errors.

### What to borrow

- continue treating aggregate node errors as a distinct category
- make root-level node error ownership explicit in the runtime model
- avoid collapsing aggregate errors into arbitrary child paths by default

### Recommended design refinement for us

We should eventually formalize projection metadata such as:

```ts
type ValidationErrorSourceKind = 'field' | 'object' | 'array' | 'form' | 'runtime-registration';

interface ValidationError {
  path: string;
  rule: string;
  message: string;
  sourceKind?: ValidationErrorSourceKind;
  ownerPath?: string;
}
```

This is more important for us than mirroring RHF's exact root-error shape.

## 5. Resolver Boundary Is a Good Integration Pattern

`C:/can/nop/templates/react-hook-form/src/types/resolvers.ts` defines a clear contract between the form control and an external schema validator.

The important idea is not the exact resolver API.

The important idea is that:

- the runtime owns when validation runs
- an external schema engine, if used, returns a normalized result
- the runtime stays the orchestrator

### Why this matters for us

This is a very useful reference for future optional adapters.

We do not want to make Yup or other libraries the core validation engine.

But we may want a boundary that lets external validators plug into our internal validation model.

### What to borrow

- keep one normalized validation result shape
- if external adapters ever exist, make them feed our runtime model rather than replace it
- define adapter contracts in terms of values in, normalized errors out

### What not to borrow

- do not reorganize the system around a resolver-first architecture
- do not reduce our compiler model to a generic resolver bridge

## 6. Built-In Validation and Aggregated State Are Managed Centrally

`C:/can/nop/templates/react-hook-form/src/logic/createFormControl.ts` consolidates:

- validity
- validating state
- errors
- dirty state
- touched state
- array update effects

This is good evidence that complex form behavior wants one central orchestrator.

### Why this matters for us

It supports our decision to keep validation execution inside `flux-runtime`, rather than scattering it across renderers.

### What to borrow

- keep expanding `FormRuntime` as the single orchestration boundary
- keep child renderers dumb where possible
- use runtime-level helpers for aggregate semantics and state updates

## What RHF Does That We Should Not Copy

## 1. JSX Registration as the Main Field Model

RHF assumes fields are primarily known because components call `register(...)` or mount through `Controller`.

This does not match our system.

Our primary source of truth is:

- schema compilation
- runtime validation model
- renderer definitions

### Conclusion

Do not copy:

- `register(...)` as the main field discovery mechanism
- controller-style primary integration

Runtime registration should stay reserved for genuinely complex controls.

## 2. React Lifecycle-Coupled Ownership

RHF necessarily ties a lot of bookkeeping to React mount/unmount behavior.

That is reasonable for a React form library, but it is not the right core model for us.

We want the runtime to remain usable outside narrow React component assumptions.

### Conclusion

Do not move ownership of validation truth into component lifecycle.

## 3. Resolver as the Main Validation Worldview

RHF often expects external schema libraries to act as the real validator via resolvers.

That is not our target.

We want:

- compiler-first extraction
- internal rule model
- runtime execution graph
- optional adapters later if needed

### Conclusion

Borrow the integration boundary idea, not the architecture inversion.

## 4. Public API Parity as a Goal

Trying to reproduce `useForm`, `register`, `Controller`, `useFieldArray`, `resolver`, `watch`, and every other RHF public API would be a mistake.

Our system should stay shaped by schema/runtime needs, not by RHF branding.

## Most Relevant Reference Ideas For NOP AMIS

If we rank the RHF template ideas by usefulness for our current architecture, the order is:

1. first-class array operations and identity handling
2. fine-grained subscription and render isolation
3. explicit aggregate root error modeling
4. centralized form-control orchestration
5. adapter boundary design for optional external validators

## Mapping To Our Current Work

## Already aligned with RHF-worthy ideas

We already have strong alignment in these areas:

- centralized runtime validation in `flux-runtime`
- field state tracking (`touched`, `dirty`, `visited`, `validating`, `submitting`)
- child-path validation for complex controls
- aggregate root validation for array nodes
- subtree validation direction

## Gaps where RHF confirms our roadmap

RHF strongly reinforces that we should keep investing in:

- dedicated array operation APIs
- node-level aggregate error ownership
- richer subscription APIs around form state and path-scoped state
- stable item identity for array structures

## New Design Suggestions Triggered By This Review

## Suggestion 1: formalize node-level state hooks

We should consider renderer-facing helpers like:

```ts
useValidationNodeState(path)
useAggregateError(path)
useChildFieldState(path)
```

These would extend the same performance principle RHF uses in `useFormState` and `useWatch`.

## Suggestion 2: add array operation APIs before deepening field-array UX further

The RHF template is a strong signal that array behavior should not remain only `setValue(path, nextArray)`.

This is probably the biggest missing structural piece in our current runtime.

## Suggestion 3: make aggregate error ownership explicit in types

Right now we can infer root aggregate errors by path shape and rule kind.

We should make that explicit in the error model instead of keeping it implicit forever.

## Suggestion 4: design an adapter contract, but keep it optional

We do not need external schema libraries right now.

But it would be wise to define an internal adapter boundary while our validation model is still evolving.

That lets us preserve architectural control while leaving space for future integrations.

## Concrete Conclusions

## Yes, worth borrowing

- centralized control object architecture
- selective subscriptions
- array operation semantics
- explicit aggregate root error handling
- normalized adapter boundary for external validators

## No, not worth borrowing directly

- JSX registration as the core field model
- controller-first integration model
- resolver-first validation worldview
- API-shape parity with RHF

## Recommended Follow-Up For This Repo

The most useful immediate follow-up from this research is:

1. add first-class runtime array operations
2. formalize aggregate error ownership and projection
3. extend path-scoped state subscriptions for object/array nodes

Those changes would capture the most valuable RHF design lessons while staying fully consistent with the current `flux` architecture.

## Related Documents

- `docs/architecture/form-validation.md`
- `docs/plans/03-form-validation-completion-plan.md`
- `docs/architecture/renderer-runtime.md`
