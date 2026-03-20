# Yup Template Notes

## Purpose

This note records what is worth learning from `C:/can/nop/templates/yup` and what should not be adopted directly into `nop-amis`.

The goal is not to replace the current validation model with Yup.

The goal is to identify schema-validation design ideas that can strengthen our compiler-first, runtime-driven validation system.

## Scope Reviewed

The review focused on the files most relevant to validation architecture:

- `C:/can/nop/templates/yup/src/schema.ts`
- `C:/can/nop/templates/yup/src/object.ts`
- `C:/can/nop/templates/yup/src/array.ts`
- `C:/can/nop/templates/yup/src/util/createValidation.ts`
- `C:/can/nop/templates/yup/src/Condition.ts`
- `C:/can/nop/templates/yup/src/Reference.ts`
- `C:/can/nop/templates/yup/src/ValidationError.ts`
- `C:/can/nop/templates/yup/src/standardSchema.ts`

## High-Level Assessment

Yes, there are meaningful ideas worth borrowing from Yup.

The most valuable parts are not the fluent API itself.

The most valuable parts are:

- the distinction between cast/transform and validate
- condition and reference modeling
- normalized test execution context
- structured nested error aggregation
- schema description and introspection
- standard external issue format export

These ideas fit our current direction better than RHF's JSX-centric field model.

## What Yup Gets Right

## 1. Cast and Validate Are Separate Phases

In `C:/can/nop/templates/yup/src/schema.ts`, `C:/can/nop/templates/yup/src/object.ts`, and `C:/can/nop/templates/yup/src/array.ts`, Yup clearly separates:

- transformation / casting
- validation

Examples:

- `_cast(...)` in object and array schemas
- `_validate(...)` in object and array schemas

### Why this matters for us

This is highly relevant.

Right now our validation work is still mostly focused on rule execution over current values.

Yup is a good reminder that a production-grade validation system usually needs a clear boundary between:

- normalization of values
- validation of values

### What to borrow

- formalize a normalization phase in our validation pipeline
- avoid mixing transformation semantics directly into rule logic
- let object and array nodes own subtree normalization before descendant validation runs

### Suggested future direction for us

Potential model:

```ts
interface CompiledNormalizationRule {
  path: string;
  kind: string;
  args?: Record<string, unknown>;
}
```

Then runtime can run:

1. normalize subtree
2. validate subtree

## 2. Conditions and References Are First-Class Concepts

`C:/can/nop/templates/yup/src/Condition.ts` and `C:/can/nop/templates/yup/src/Reference.ts` are especially relevant.

Yup models:

- conditional schema branching
- dependency references
- value/parent/context resolution

### Why this matters for us

This maps directly onto our relational-validation roadmap.

We already introduced:

- `equalsField`
- `notEqualsField`
- `requiredWhen`
- `requiredUnless`

Yup confirms that references and conditions should be explicit architectural concepts, not just ad hoc rule parameters.

### What to borrow

- explicit dependency/reference modeling
- a unified way to resolve value, sibling, parent, and context inputs
- conditional activation as a first-class rule concern

### What not to borrow directly

- the exact `ref('$foo')` / `when(...)` surface API

Our schema authoring should remain aligned with our own low-code schema shape and safe expression model.

### Recommended direction for us

Keep our compiled dependency graph, but consider a more explicit internal reference representation such as:

```ts
interface ValidationReference {
  source: 'value' | 'parent' | 'context' | 'path';
  path?: string;
}
```

## 3. Test Execution Has a Strong Context Model

`C:/can/nop/templates/yup/src/util/createValidation.ts` is very useful.

Its test context carries:

- current path
- original value
- parent value
- schema
- options/context
- `resolve(...)`
- `createError(...)`

That is a strong design.

### Why this matters for us

Our custom-validator direction would benefit from a more structured execution context.

We already discussed registry-based custom validators. Yup confirms that custom tests become much more maintainable when they receive a normalized context instead of random arguments.

### What to borrow

- standardized validator execution context
- a single error-construction path
- access to current value, parent, full context, and resolved references

### Recommended direction for us

Our eventual custom validator API should likely look closer to this style:

```ts
interface ValidationExecutionContext {
  path: string;
  value: unknown;
  parent?: unknown;
  values: Record<string, unknown>;
  scope: ScopeRef;
  createError(input?: {
    path?: string;
    message?: string;
    rule?: string;
    params?: Record<string, unknown>;
  }): ValidationError;
  resolve(ref: ValidationReference): unknown;
}
```

## 4. Nested Validation Is Treated as Recursive Composition

`C:/can/nop/templates/yup/src/object.ts` and `C:/can/nop/templates/yup/src/array.ts` show a very important pattern:

- node validates itself
- then nested child tests are constructed and executed
- nested errors are accumulated and sorted

### Why this matters for us

This strongly supports our current Phase 2 direction around:

- validation nodes
- subtree validation
- array/object aggregate rules

### What to borrow

- validate node-level rules and child-level rules as two distinct phases
- keep recursive traversal explicit
- allow node-level aggregate rules to run before or after child validation based on policy

### Recommended future refinement for us

Our `validateSubtree(path)` should eventually become node-driven rather than just path-list-driven.

That means:

- lookup node
- validate node rules
- traverse children in node order
- merge child results

Right now our subtree support is useful, but still flatter than Yup's recursive model.

## 5. Error Aggregation Structure Is Rich and Practical

`C:/can/nop/templates/yup/src/ValidationError.ts` is worth studying.

Yup distinguishes:

- a top-level error
- `errors` as message list
- `inner` as nested detailed errors
- path and type metadata

### Why this matters for us

We already have structured errors, but our model can still become richer.

Yup confirms that error systems need both:

- display-friendly messages
- machine-friendly nested detail

### What to borrow

- keep error type/rule metadata explicit
- allow aggregated node errors to preserve child detail when useful
- think in terms of both flat path lookup and grouped nested reporting

### Suggested future direction for us

We may eventually want a richer runtime result shape like:

```ts
interface ValidationResultNode {
  path: string;
  errors: ValidationError[];
  children?: ValidationResultNode[];
}
```

Not necessarily as the main storage format, but at least as an optional debug or reporting format.

## 6. Schema Description and Introspection Are First-Class

Yup's `SchemaDescription` and `describe(...)` support in `C:/can/nop/templates/yup/src/schema.ts` and `C:/can/nop/templates/yup/src/array.ts` are very relevant.

They expose:

- type
- label
- metadata
- tests
- nested fields / inner type

### Why this matters for us

This aligns very well with our compiler approach.

We already have compiled validation metadata, but we do not yet expose a polished introspection layer.

### What to borrow

- treat compiled validation description as a public diagnostic asset
- support human-readable inspection of compiled node/rule structure
- use descriptions for playground diagnostics, docs generation, and tests

### Recommended direction for us

Eventually expose a debug/introspection API such as:

```ts
describeValidation(path?: string): CompiledValidationDescription
```

This could become one of the easiest ways to debug low-code validation behavior.

## 7. Standard External Issue Format Is a Good Interop Pattern

`C:/can/nop/templates/yup/src/standardSchema.ts` is especially interesting.

It provides:

- a normalized validate contract
- standardized issue path export
- a clean bridge to external consumers

### Why this matters for us

This is a good reference for our future adapter boundary.

Just like RHF's resolver type, Yup's standard-schema export suggests that interoperability works best when the core engine keeps its own internals but can emit a normalized public issue format.

### What to borrow

- a stable external error export format
- explicit path segmentation, not only dot strings
- optional conversion helpers from internal errors to interoperable issue lists

### Recommended direction for us

We should consider a future converter such as:

```ts
toStandardValidationIssues(result: FormValidationResult): StandardIssue[]
```

That would help if we later integrate with other tooling, editors, or protocol-style APIs.

## What Yup Does That We Should Not Copy Directly

## 1. Fluent API as the Primary Authoring Surface

Yup's fluent schema builder is elegant, but it does not fit our primary architecture.

Our source of truth is low-code schema plus compile-time extraction, not imperative builder chains in application code.

### Conclusion

Do not adopt Yup-style fluent authoring as the core API.

## 2. Runtime Schema Mutation as the Main Composition Strategy

Yup relies heavily on immutable cloning and chaining, with methods like:

- `clone()`
- `concat()`
- `withMutation()`

This is appropriate for a schema builder library, but we already have a compiled schema system.

### Conclusion

Borrow the ideas about composition and metadata merging, not the exact runtime schema object model.

## 3. Validation as an Opaque Schema Engine

Yup often hides execution behind schema instances and recursive method dispatch.

That is fine for a general-purpose validation library, but our system needs a more explicit compiled graph and runtime orchestration because:

- we support renderer-defined rules
- we support runtime-registered composite controls
- we need precise field and child-path UI state

### Conclusion

Do not collapse our runtime back into a generic black-box schema interpreter.

## Most Relevant Reference Ideas For NOP AMIS

If we rank the Yup template ideas by usefulness for our current direction, the order is:

1. separate normalization from validation
2. explicit references and conditions
3. structured validator execution context
4. recursive node-oriented validation traversal
5. richer error aggregation and standardized issue export
6. introspection and schema description

## Mapping To Our Current Work

## Already aligned with useful Yup ideas

We already have partial alignment in these areas:

- compiler-first rule extraction
- nested object and array validation nodes
- relational rule dependencies
- structured error objects
- subtree validation direction

## Gaps where Yup gives useful guidance

Yup strongly suggests that the next deeper improvements for our system should include:

- explicit normalization phase design
- richer validator execution context
- better node-driven traversal for subtree validation
- better introspection of compiled validation graphs
- eventual standardized issue export

## New Design Suggestions Triggered By This Review

## Suggestion 1: add validation normalization as a formal concept

Today we mostly validate whatever value currently exists.

Yup is a good reminder that normalization and validation should be related but distinct stages.

## Suggestion 2: strengthen custom-validator context before exposing more extension points

If we expose custom validators too early with weak context shape, we will create long-term API debt.

Yup's test context is a good model for what "enough context" looks like.

## Suggestion 3: evolve subtree validation from path scanning toward node traversal

Our current implementation is useful, but still flatter than Yup's recursive composition model.

Longer term, node traversal should probably become the authoritative execution strategy.

## Suggestion 4: make introspection a real product feature

Because we are building a low-code engine, compiled validation description is not just a dev convenience.

It can become part of:

- debug panels
- docs tooling
- AI-assisted schema editing
- playground explainability

## Concrete Conclusions

## Yes, worth borrowing

- separate cast/normalize from validate
- explicit condition and reference modeling
- rich validator execution context
- recursive node validation composition
- nested error aggregation
- standard issue export and introspection patterns

## No, not worth borrowing directly

- fluent chain API as the main authoring model
- opaque schema object execution as the core runtime architecture
- full Yup-style builder semantics and mutation model

## Recommended Follow-Up For This Repo

The most useful immediate follow-up from this review is:

1. define a normalization phase in the validation pipeline
2. strengthen custom-validator execution context
3. plan the transition from path-scanned subtree validation to node-driven traversal
4. add a compiled validation description/debug export

Those changes would borrow the strongest ideas from Yup while keeping the `nop-amis` architecture intact.

## Related Documents

- `docs/architecture/form-validation.md`
- `docs/plans/03-form-validation-completion-plan.md`
- `docs/references/react-hook-form-template-notes.md`
