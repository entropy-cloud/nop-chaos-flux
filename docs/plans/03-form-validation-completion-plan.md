# Form Validation Completion Plan

> **Implementation Status: ✅ COMPLETED**
> All four levels of validation capability (field-level, form-level, cross-field, async) have been implemented in `packages/flux-runtime/src/validation/` (8 files: errors.ts, message.ts, registry.ts, rules.ts, validators.ts, index.ts + tests). Form-runtime array operations (appendValue, insertValue, removeValue, moveValue, swapValue) and custom validators (equalsField, requiredWhen, requiredUnless, atLeastOneFilled, allOrNone, uniqueBy) are all present.
>
> This status was verified against the codebase on 2026-03-30.

## Purpose

This document describes how to close the remaining form-validation gaps in `nop-amis` so the system can approach the practical capability level people expect from a `React Hook Form + Yup` stack without adopting either library as the core runtime.

The goal is not API parity for its own sake.

The goal is to make the current schema compiler, runtime, and renderer system strong enough to support:

- common production form behaviors
- nested object and array validation
- cross-field and form-level rules
- composite controls with child-path precision
- async validation and cancellation
- predictable error visibility and trigger policies
- future external adapter layers if they are ever needed

## Current Position

The current implementation already supports:

- compile-time extraction of standard field validation rules
- field state tracking for `touched`, `dirty`, `visited`, `validating`, and `submitting`
- configurable `validateOn` and `showErrorOn`
- sync and async field validation
- submit-time final validation gate
- runtime registration for complex controls
- child-path validation for composite controls such as `key-value` and `array-editor`

That means the project is past the prototype stage. The remaining work is mostly about breadth, consistency, and deeper modeling rather than inventing the basic architecture.

## Design Constraints

All future work in this area must preserve these constraints:

- validation remains compiler-first and runtime-driven, not JSX-registration-driven
- `amis-runtime` stays React-independent
- no hard dependency on `react-hook-form`, `yup`, or other React-only validation stacks
- runtime registration remains a supplement for complex controls, not the main architecture
- standard path semantics stay uniform across scalar, object, array, and composite fields
- submit remains the final validation gate even if earlier triggers exist

## Target Capability Model

To judge whether the system is "complete enough", we should target the following capability set.

### Level 1: strong field validation

- scalar field rules
- async field rules
- normalized error model
- trigger and visibility policies
- correct state transitions

Status: mostly implemented.

### Level 2: strong nested structure validation

- object subtree validation
- array item validation
- stable path semantics for add/remove/reorder
- field arrays and composite controls sharing the same path model

Status: partially implemented.

### Level 3: strong relational validation

- field A depends on field B
- object-level constraints
- array-level constraints
- form-level constraints

Status: not yet implemented as a first-class compiled model.

### Level 4: strong authoring and operational ergonomics

- clear schema authoring rules
- predictable default behavior
- reusable validation helpers
- comprehensive tests
- diagnostics that help track why a rule fired

Status: partially implemented.

## What "Parity" Means Here

We do not need to reproduce `React Hook Form` or `Yup` literally.

Instead, practical parity means:

- a schema author can describe the same business constraints
- the runtime can evaluate them with equivalent correctness
- the UI can reveal them with equivalent precision
- complex controls can participate without hacks

We explicitly do not need:

- `useForm`, `Controller`, or `resolver` API parity
- Yup's exact fluent DSL
- React-only lifecycle semantics as the source of truth

## Remaining Gaps

The remaining gaps fall into six areas.

### 1. Cross-field and form-level validation

Current model is strongly field-centric.

Missing pieces:

- one field depending on another field value
- object-level rule evaluation
- array-level aggregate rules
- full form-level rule evaluation
- error projection from a non-field rule back onto one or more paths

Examples:

- `confirmPassword` must equal `password`
- `adminCode` required when `role === 'admin'`
- at least one reviewer must be a non-empty value
- start date must be before end date

### 2. Structured nested validation

Current model supports child paths in runtime registration and compiled flat path ordering, but it still needs a stronger structural model.

Missing pieces:

- object node validation metadata
- array node validation metadata
- item schema reuse
- parent-child path invalidation and revalidation rules
- stable handling of remove and reorder operations

### 3. Validation rule expressiveness

Current rule model is still compact.

Missing pieces:

- conditional rule activation
- relational rule operands and dependency lists
- schema-level custom rules with arguments
- reusable named validators with normalized signatures
- value transforms and normalization hooks at validation boundaries

### 4. Value observation and dependency tracking

Cross-field validation cannot scale if every change validates the entire form.

Missing pieces:

- a dependency graph between rules and paths
- targeted revalidation when an upstream dependency changes
- runtime APIs for dependency-aware subscriptions
- explicit distinction between direct-path and dependent-path invalidation

### 5. Array and composite helper semantics

Current composite controls work, but runtime semantics are still low-level.

Missing pieces:

- first-class array operations in form runtime
- item identity model separate from numeric path indexes
- path remapping on insert/remove/reorder
- cleaner support for dynamic nested composite editors

### 6. Error lifecycle and operational tooling

Current errors render correctly for many cases, but the lifecycle is still basic.

Missing pieces:

- stronger distinction between stale, hidden, and active errors
- clear behavior when visibility changes hide an invalid field
- diagnostics for why a field is currently invalid
- optional debug metadata for rule execution traces

## Proposed End-State Architecture

The validation system should evolve into five coordinated layers.

1. schema authoring model
2. compiled validation graph
3. runtime dependency-aware execution engine
4. form state and error lifecycle store
5. renderer-facing field and composite helpers

## Layer 1: Schema Authoring Model

Schema authors should keep using normal schema fields rather than embedding a foreign DSL.

We should extend the existing authoring surface with structured fields instead of relying only on scalar flags.

### Proposed schema directions

```ts
interface BaseValidationConfig {
  validateOn?: ValidationTrigger | ValidationTrigger[];
  showErrorOn?: ValidationVisibilityTrigger | ValidationVisibilityTrigger[];
}

interface FieldValidationSchema extends BaseValidationConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  equalsField?: string;
  validate?: AsyncValidateSchema | AsyncValidateSchema[];
  validators?: SchemaValidatorRef[];
}

interface FormValidationSchema extends BaseValidationConfig {
  validators?: SchemaValidatorRef[];
}

interface SchemaValidatorRef {
  name: string;
  args?: Record<string, unknown>;
  when?: string;
  target?: string | string[];
  message?: string;
}
```

Notes:

- `when` uses the existing expression system and must compile through the safe expression path
- `target` lets a relational or form-level validator decide where its error should surface
- simple built-ins such as `required` and `minLength` remain first-class for readability

## Layer 2: Compiled Validation Graph

The current `CompiledFormValidationModel` should evolve from a flat field map into a richer graph.

### Proposed compiled structures

```ts
interface CompiledValidationNode {
  path: string;
  kind: 'field' | 'object' | 'array' | 'form';
  controlType?: string;
  label?: string;
  rules: CompiledValidationRule[];
  children?: string[];
  parent?: string;
}

interface CompiledValidationDependency {
  sourcePath: string;
  affectsPath: string;
  reason: 'rule-dependency' | 'visibility' | 'normalization';
}

interface CompiledFormValidationModel {
  nodes: Record<string, CompiledValidationNode>;
  fieldOrder: string[];
  validationOrder: string[];
  dependencies: CompiledValidationDependency[];
  rootPaths: string[];
}
```

### Why a graph is needed

Flat `path -> rules` is enough for simple fields.

It is not enough for:

- object-level rules that should run after child values are normalized
- array-level aggregate rules
- dependent revalidation when `role` changes and `adminCode` must be reconsidered
- remapping of child errors when an array changes shape

### Rule compilation responsibilities

The compiler should normalize every rule into a compiled form with:

- stable rule id
- rule kind
- target path list
- dependency path list
- optional activation expression
- optional async request metadata

Example direction:

```ts
interface CompiledValidationRule {
  id: string;
  kind: string;
  targetPaths: string[];
  dependencyPaths: string[];
  message?: string;
  when?: CompiledExpression;
  args?: Record<string, unknown>;
  async?: {
    api: ApiObject;
    debounce?: number;
  };
}
```

## Layer 3: Runtime Dependency-Aware Execution Engine

The runtime should stop thinking only in terms of "validate a field" and start thinking in terms of "evaluate one or more validation nodes whose dependencies changed".

### Required runtime capabilities

- validate one path directly
- validate one path and its dependents
- validate one subtree
- validate the whole form
- cancel superseded async rules per rule id or path group
- project form-level or object-level errors back to concrete paths

### Proposed runtime APIs

```ts
interface ValidateOptions {
  mode?: 'direct' | 'with-dependents' | 'subtree' | 'form';
  reason?: 'change' | 'blur' | 'submit' | 'manual';
}

interface FormRuntime {
  validateField(path: string, options?: ValidateOptions): Promise<ValidationResult>;
  validatePaths(paths: string[], options?: ValidateOptions): Promise<FormValidationResult>;
  validateSubtree(path: string, options?: ValidateOptions): Promise<FormValidationResult>;
  validateForm(options?: ValidateOptions): Promise<FormValidationResult>;
}
```

### Dependency-driven revalidation

When `setValue('role', 'admin')` runs, the runtime should be able to:

- mark `role` dirty
- look up dependent rules or nodes
- schedule revalidation of `adminCode`
- clear or update errors for rules that are no longer active

This should be driven by compiled dependency metadata, not ad hoc renderer logic.

## Layer 4: Form State and Error Lifecycle Store

The form store currently tracks core state. It should grow in a disciplined way.

### Proposed state additions

```ts
interface FormStoreState {
  values: Record<string, unknown>;
  errors: Record<string, ValidationError[]>;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  visited: Record<string, boolean>;
  validating: Record<string, boolean>;
  hiddenErrors: Record<string, ValidationError[]>;
  submitting: boolean;
  submitCount: number;
  ruleRuns: Record<string, number>;
}
```

### Why hidden errors matter

Some fields may be invalid but not yet visible according to `showErrorOn`.

The runtime must distinguish:

- invalid and visible
- invalid and hidden
- stale and should be removed

That avoids mixing execution truth with display policy.

### Error ownership

Every `ValidationError` should eventually carry:

- `path`
- `ruleId`
- `rule`
- `sourceKind`: `field` | `object` | `array` | `form` | `runtime-registration`
- optional `relatedPaths`

This will make dedupe, updates, and debug output far cleaner.

## Layer 5: Renderer-Facing Helpers

Renderers should keep consuming a small API surface.

The current direction is good and should be extended rather than replaced.

### Standard control helpers

Keep shared helpers for:

- focus/change/blur wiring
- trigger policy checks
- error visibility checks
- field class name derivation

### Composite control helpers

Add a dedicated helper family for composite controls.

Example direction:

```ts
interface CompositeFieldHelpers {
  getChildState(path: string): ChildFieldUiState;
  markChildTouched(path: string): void;
  markChildVisited(path: string): void;
  syncChildValue(path: string, value: unknown): void;
  validateChild(path: string, reason: ValidationTrigger): Promise<void>;
}
```

This avoids each composite control manually assembling the same logic.

## Detailed Workstreams

Implementation should be split into six workstreams.

### Workstream A: strengthen rule model

Add:

- named compiled rule ids
- dependency path lists
- activation expressions
- target path lists
- source kind metadata

Deliverables:

- `ValidationRule` and `CompiledValidationRule` shape expansion
- compiler support for relational rules
- normalized error projection behavior

### Workstream B: add structural validation nodes

Add:

- object nodes
- array nodes
- form node
- parent-child links

Deliverables:

- richer `CompiledFormValidationModel`
- compiler support for subtree-level validation extraction
- validation ordering rules

### Workstream C: add dependency graph and targeted revalidation

Add:

- compiled dependency edges
- runtime invalidation scheduler
- revalidation options for direct path vs dependents

Deliverables:

- `validatePaths()`
- dependency-aware `setValue()` follow-up validation
- tests for cross-field updates

### Workstream D: first-class relational validators

Built-in validators should include:

- `equalsField`
- `notEqualsField`
- `requiredWhen`
- `requiredUnless`
- `beforeField`
- `afterField`
- `atLeastOneOf`
- `allOrNone`

Deliverables:

- schema authoring rules
- compile-time translation
- runtime evaluator implementations

### Workstream E: first-class array semantics

Add runtime APIs:

- `insertValue(path, index, value)`
- `removeValue(path, index)`
- `moveValue(path, from, to)`
- `replaceValue(path, nextValue)`

Deliverables:

- path remapping rules for touched, dirty, visited, and errors
- array node validation
- tests for add/remove/reorder behavior

### Workstream F: diagnostics and debugability

Add:

- optional dev-only rule execution logs
- rule ids in errors
- a helper to inspect active validation state for one path

Deliverables:

- debug output for tests and playground
- improved failure diagnosis when complex rules interact

## Proposed Built-In Validator Catalog

The system should standardize a small built-in validator catalog before adding free-form custom adapters.

### Scalar validators

- `required`
- `minLength`
- `maxLength`
- `min`
- `max`
- `pattern`
- `email`
- `url`

### Relational validators

- `equalsField`
- `notEqualsField`
- `requiredWhen`
- `requiredUnless`
- `beforeField`
- `afterField`

### Aggregate validators

- `minItems`
- `maxItems`
- `atLeastOneFilled`
- `atLeastOneOf`
- `allOrNone`
- `uniqueBy`

### Runtime registration validators

- composite-specific `validate()`
- child-path `validateChild(path)`

These should all emit the same normalized error shape.

## Custom Validator Model

We need custom validation, but not an unbounded callback soup.

### Proposed registry-based custom validator model

```ts
interface ValidationRuleExecutorContext {
  path: string;
  value: unknown;
  values: Record<string, unknown>;
  scope: ScopeRef;
  args?: Record<string, unknown>;
}

type ValidationRuleExecutor = (
  ctx: ValidationRuleExecutorContext
) => ValidationError[] | ValidationError[] | Promise<ValidationError[]>;
```

Custom validators should be registered by name and referenced from schema.

Benefits:

- schema stays serializable
- compiler can keep rule ids and dependencies explicit
- runtime stays in control of scheduling and cancellation

## Conditional Validation Model

Conditionals should be first-class rather than hidden inside ad hoc custom code.

### Authoring rule

- every validator reference may carry `when`
- `when` is evaluated against the same safe expression engine used elsewhere
- if `when` becomes false, the runtime removes errors owned by that rule

### Example

```ts
{
  type: 'input-password',
  name: 'adminCode',
  validators: [
    {
      name: 'required',
      when: 'role === "admin"',
      message: 'Admin code is required for admin submissions'
    }
  ]
}
```

## Error Projection Rules

Not every rule naturally belongs to one field.

We need clear projection rules.

### Projection policy

- field rule defaults to its own path
- relational rule may project to the current field, peer field, or both
- object rule may project to object path or named child paths
- form rule must explicitly name `target`
- if no explicit target exists, project to the owning node path

This avoids a hidden rule producing an invisible error with no render target.

## Array Identity Strategy

One of the biggest differences between a toy validation model and a production one is array identity behavior.

### Problem

Numeric paths like `reviewers.0.value` are necessary, but not sufficient when items are reordered.

### Proposed direction

- keep numeric paths as the public schema and error address format
- allow runtime to maintain an internal item identity map per array path
- on remove or reorder, remap touched/dirty/visited/errors by item identity before reserializing back to numeric paths

This can be introduced incrementally. Public API does not need to expose item ids immediately.

## Interaction with Visibility and Disabled State

Validation participation must remain consistent with schema semantics.

### Rules

- hidden fields may either be excluded from validation or validated but hidden depending on explicit policy
- disabled fields should usually be excluded from validation and submit payload unless a renderer explicitly opts out
- these policies must be compiled, not guessed at render time

This document does not redefine visibility semantics, but validation must consume the same compiled truth.

## Suggested Delivery Phases

The work should land in ordered phases.

### Phase 1: relational field validation

Scope:

- compiled rule ids
- dependencies
- `equalsField`
- `requiredWhen`
- targeted dependent revalidation

Success criteria:

- `password` and `confirmPassword`
- `role` and `adminCode`
- no full-form validation required on every keystroke

### Phase 2: object and array validation nodes

Scope:

- object and array nodes in compiled model
- `minItems`, `maxItems`, `atLeastOneFilled`
- subtree validation APIs

Success criteria:

- array-level errors
- object-level errors
- clean parent-child error ownership

### Phase 3: array operation semantics

Scope:

- insert/remove/move helpers
- state remapping
- composite helpers for dynamic nested structures

Success criteria:

- no stale errors after remove or reorder
- stable UX for dynamic list editors

### Phase 4: custom validator registry and diagnostics

Scope:

- named validator registry
- debug metadata
- playground diagnostics

Success criteria:

- custom business rules are easy to add
- failures are traceable

## Testing Strategy

Every phase must extend both runtime and renderer tests.

### Required test layers

- compiler tests for rule extraction and dependency compilation
- runtime tests for validation scheduling and cancellation
- renderer tests for state classes and error visibility
- playground coverage for representative demo scenarios

### Required scenario coverage

- scalar field validation
- async validation debounce and cancellation
- cross-field dependencies
- conditional required fields
- array add/remove/reorder
- object-level and form-level rules
- composite child-path errors
- hidden and disabled participation policies

## Documentation and Authoring Guidance

When these features land, the docs set should be updated in parallel.

### Required follow-up docs

- update `docs/architecture/form-validation.md` to reflect the new compiled graph model
- add examples for relational validators and array rules
- update playground schema examples as each phase lands

## Non-Goals

This plan does not aim to:

- replace the current expression engine design
- make runtime depend on React Hook Form
- make schema authoring mimic Yup's fluent API
- implement every validation library feature before shipping useful increments

## Recommended Immediate Next Step

The first implementation step should be Phase 1.

Specifically:

1. expand compiled rule metadata with ids and dependency paths
2. add built-in relational rules `equalsField` and `requiredWhen`
3. add runtime dependent-path revalidation
4. add tests and playground examples for those cases

That phase gives the biggest practical jump toward production-grade behavior while fitting cleanly into the current architecture.

## Related Documents

- `docs/architecture/form-validation.md`
- `docs/architecture/amis-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/plans/02-development-plan.md`
