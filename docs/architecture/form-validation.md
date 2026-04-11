# Form Validation Design

## Purpose

This document defines the final validation architecture for Flux.

It is self-contained and is the active source of truth for:

- schema-driven validation rules
- nested form/object/array/table validation behavior
- draft/detail/dialog validation boundaries
- field, subtree, and scope validation APIs
- renderer and runtime participation in validation

## Core Claim

Validation in Flux is owned by the nearest **validation-capable scope runtime**.

This means:

1. Validation is not owned by the React mount tree.
2. Validation is not owned only by `form`.
3. Validation is not owned by arbitrary UI nesting.
4. Validation is not rebuilt ad hoc from mounted controls.

The owner of validation is the runtime that currently owns:

1. the compiled validation template graph for a scope
2. the active participating validation instances for that scope
3. the field-addressed validation state for that scope
4. the APIs that trigger validation for that scope

`form` is a specialization of this runtime, not the definition of validation itself.

This document uses three distinct terms:

1. `render scope`: any runtime scope used for rendering or data lookup
2. `validation scope`: a render scope that has validation semantics
3. `validation owner`: the runtime instance that owns one validation scope

In this document, each validation scope has exactly one validation owner.

## Design Goals

1. Keep compile-time validation structure as the primary source of truth.
2. Support validation outside `form`, such as filter panels, inline editors, and local draft scopes.
3. Support field rules, object rules, array rules, and branch-dependent rules in one model.
4. Support expression-based rule parameters without reparsing schema at validation time.
5. Keep UI policy such as `showErrorOn` and submit gating separate from rule execution.
6. Keep dynamic runtime participation, but do not let runtime registration become the sole source of truth.
7. Isolate child draft validation state from parent scopes until commit.
8. Keep async validation centralized and cancellable.
9. Make partial validation path-based and subtree-based.
10. Allow a phased implementation path without changing the target architecture.

## Non-Goals

1. Do not make React mount and unmount the only way validation structure is discovered.
2. Do not turn validation into a builder-style fluent schema library.
3. Do not require every UI scope to create a validation runtime.
4. Do not require every complex control to be expressible only through declarative rule templates.
5. Do not expose all child-scope field errors to parent scopes by default.

## Main Principles

### Value Axis And Owner Axis

Validation must be modeled on two axes at the same time.

The **value axis** answers:

1. which paths exist in the validation structure
2. which rules belong to each path
3. which aggregate relationships exist
4. which paths depend on other paths

The **owner axis** answers:

1. which runtime currently owns those values
2. where validation state is stored
3. which validation APIs are allowed to act on those paths
4. where draft isolation begins and ends

Neither axis is sufficient alone.

### Compile-Time Graph First

Flux compiles validation structure ahead of time.

That compiled graph defines what validation may exist.

Runtime state determines what currently participates.

### Runtime Participation Is Supplementary

Runtime field registration is important, but it is not the only truth.

It tells the owner runtime:

1. which field instances are currently materialized
2. which paths are visible or hidden
3. which dynamic child paths or overlays have appeared

It does not define the full validation graph.

### Form Is A Specialized Validation Scope

Validation must work in scopes that are not submit-oriented forms.

Examples include:

1. dashboard filters
2. search panels
3. inline row editors
4. local draft editors

`FormRuntime` extends the common validation scope runtime with submit, touch policy, and error display policy.

## Runtime Model

### Minimal Normative Types

This document defines the following minimum contract types.

```ts
type ValidateOnPolicy = 'change' | 'blur' | 'submit' | 'manual';
type ShowErrorOnPolicy = 'change' | 'blur' | 'submit' | 'touched' | 'manual';

type ValidationRuleKind = string;

type CompiledRuntimeValue<T> =
  | { kind: 'static'; value: T }
  | { kind: 'expression'; code: string; dependencies: string[] };

interface ValidationError {
  path: string;
  ownerId: string;
  rule: string;
  message: string;
  sourceKind:
    | 'field'
    | 'object'
    | 'array'
    | 'row'
    | 'scope-root'
    | 'runtime-overlay'
    | 'runtime-opaque';
}

interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
  validating?: boolean;
}

interface ScopeValidationResult {
  ok: boolean;
  errors: ValidationError[];
  fieldErrors: Record<string, ValidationError[]>;
  validating?: boolean;
}

interface FormSubmitResult {
  ok: boolean;
  errors: ValidationError[];
}
```

### ValidationScopeRuntime

The core runtime abstraction is `ValidationScopeRuntime`.

```ts
type ValidationReason = 'change' | 'blur' | 'submit' | 'commit' | 'system';

interface ValidationScopeRuntime {
  readonly scopeId: string;
  readonly rootPath: string;
  readonly compiledModel: CompiledValidationModel | null;

  validateAt(path: string, reason?: ValidationReason): Promise<ValidationResult>;
  validateSubtree(path: string, reason?: ValidationReason): Promise<ScopeValidationResult>;
  validateAll(reason?: ValidationReason): Promise<ScopeValidationResult>;

  applyChangesAndRevalidate(input: ApplyScopeChangesInput): Promise<ScopeValidationResult>;

  getFieldState(path: string): FieldValidationStateSnapshot;
  getScopeState(): ScopeValidationStateSnapshot;
  getScopeRootErrors(): ValidationError[];
  isPathOwned(path: string): boolean;

  registerField(state: FieldRegistrationState): () => void;
  updateFieldRegistration(path: string, patch: Partial<FieldRegistrationState>): void;
}

interface ApplyScopeChangesInput {
  writes: Record<string, unknown>;
  changedPaths: string[];
  reason: ValidationReason;
}

interface ScopeValidationStateSnapshot {
  valid: boolean;
  hasErrors: boolean;
  validating: boolean;
  /**
   * Whether this scope is in a state where it can be submitted or confirmed.
   * FormRuntime: valid && allTouched (or per validateOn policy).
   * Non-form ValidationScopeRuntime: equivalent to valid.
   * Parent scopes read this field instead of valid when gating on a child scope,
   * to prevent misreading a FormRuntime child as ready when allTouched is false.
   */
  ready: boolean;
}
```

This runtime exists for any scope that has validation semantics.

That includes:

1. normal forms
2. draft editors
3. non-form filter scopes
4. row-local editors when they own local validation

### FormRuntime

`FormRuntime` is a specialization of `ValidationScopeRuntime`.

```ts
interface FormRuntime extends ValidationScopeRuntime {
  readonly validateOn: ValidateOnPolicy;
  readonly showErrorOn: ShowErrorOnPolicy;

  touchField(path: string): void;
  visitField(path: string): void;
  isTouched(path: string): boolean;
  isDirty(path: string): boolean;
  isVisited(path: string): boolean;

  submit(): Promise<FormSubmitResult>;
  readonly canSubmit: boolean;
  readonly allTouched: boolean;
}
```

The additional responsibilities of `FormRuntime` are:

1. submit gate
2. touched / dirty / visited policy
3. `showErrorOn` policy
4. submit action orchestration

Rule execution, dependency expansion, subtree validation, and async ownership come from the base validation scope runtime.

### Touched And Error Display Policy

Touched / dirty / visited state is stored per field, while UX policy lives in `FormRuntime`.

`ValidationScopeRuntime` does not aggregate touched state for display behavior.

`FormRuntime` adds:

1. `allTouched`
2. `showErrorOn: 'touched'`
3. `canSubmit` derived from scope readiness and touch policy

`showErrorOn` controls when validation results become visible in UI, not whether validation executes.

Default display policy:

1. `FormRuntime` defaults to `showErrorOn: 'blur'`
2. non-form `ValidationScopeRuntime` also defaults to `showErrorOn: 'blur'`

The non-form default is intentionally not `change`, because cross-field validation such as date-range constraints is usually too noisy during mid-input editing.

When path `A` changes and closure expansion causes path `B` to revalidate, visibility of `B`'s error still follows `B`'s own display policy rather than the trigger source path.

## What Counts As A Validation Scope

Not every render scope creates a validation runtime.

A scope becomes a validation scope only if at least one of these is true:

1. the compiler produces a non-empty validation model for it
2. it declares a validation scope boundary in schema
3. it hosts a local draft editor that must validate before commit

A plain visual container with no validation content does not create a validation runtime.

Native DOM validation inside a `no-owner` subtree is outside Flux validation semantics.

Flux does not guarantee capture, aggregation, or lifecycle coordination for browser-native validation errors originating from uncontrolled DOM attributes such as `required`.

Runtime discovery alone must not create a new validation owner.

If a control needs owner-level runtime validation, it must register into an owner boundary that was already classified by the compiler as `inherit-owner` or `create-owner`.

Therefore:

1. runtime registration may enrich an existing owner
2. runtime registration may not create a brand-new owner at an unclassified boundary

### Validation Scope Declaration In Schema

Non-form validation scopes must be declared explicitly in schema or be implied by a component family whose semantics are fixed by this document.

The minimal schema-side declaration is:

```ts
interface ValidationScopeSchemaContract {
  validationScope?: {
    id: string;
    kind?: 'form' | 'scope' | 'draft';
    validateOn?: ValidateOnPolicy;
  };
}
```

Rules:

1. `form` implies `validationScope.kind = 'form'`
2. a non-form container such as a filter panel must declare `validationScope` if it wants its own validation owner
3. a draft editor surface must declare or imply `validationScope.kind = 'draft'`
4. if no such declaration exists, the boundary cannot become a new owner and must resolve to `inherit-owner` or `no-owner`

### Owner Resolution Algorithm

Owner resolution is normative.

Each schema boundary that may introduce a scope must be classified by the compiler as one of:

1. `inherit-owner`
2. `create-owner`
3. `no-owner`

The rules are:

1. `no-owner`: the subtree contributes no validation structure and has no runtime validation registration needs
2. `inherit-owner`: the subtree contributes validation nodes into the nearest ancestor owner
3. `create-owner`: the subtree creates a new validation scope and a new validation owner

The compiler and runtime must both follow the same resolution rules.

Use `inherit-owner` when the subtree writes directly into parent-owned values and has no local draft isolation.

Examples:

1. inline object editor bound directly to parent values
2. inline array editor bound directly to parent values
3. editable table cell bound directly to parent values
4. visual layout containers whose descendants contain fields but do not introduce a new draft or submit boundary

Use `create-owner` when the subtree owns a local validation lifecycle distinct from the parent.

Examples:

1. `form`
2. a draft editor that validates before commit
3. a filter/search scope that has validation rules but no submit semantics
4. a row-local draft editor

Use `no-owner` when the subtree has no validation structure and no runtime validators.

Examples:

1. pure layout containers
2. read-only surfaces
3. action controls with no validation semantics

“Nearest owner” therefore means the nearest ancestor boundary whose resolution is `create-owner`, unless the current subtree itself resolves to `create-owner`.

### Additional Owner Boundary Rules

The compile-time classification above is the only source of owner-boundary truth.

Dynamic runtime behavior may activate or dispose owners, but it may not reclassify boundaries.

Additional rules:

1. the same renderer family may resolve to `inherit-owner` or `create-owner` depending on schema options such as draft mode
2. child owners register their parent contract only when they become active
3. owner runtimes must reject runtime validation descriptors whose `ownerId` does not match the receiving owner or whose target paths fall outside the owner's `rootPath` subtree

## Layered State Model

Validation uses three separate kinds of state.

### Compiled Validation Model

This is immutable runtime input produced by the compiler.

```ts
interface CompiledValidationModel {
  rootPath: string;
  ownerId: string;
  nodes: Record<string, CompiledFieldTreeNode>;
  validationOrder: string[];
  dependents: Record<string, string[]>;
}

type FieldTreeNodeKind =
  | 'scope-root'
  | 'form-root'
  | 'field'
  | 'object'
  | 'array'
  | 'variant-root'
  | 'variant-branch'
  | 'repeated-template';

interface CompiledFieldTreeNode {
  id: string;
  path: string;
  ownerId: string;
  kind: FieldTreeNodeKind;
  parent?: string;
  children: string[];
  ruleTemplates: CompiledRuleTemplate[];
  dependencyPaths: string[];
  aggregateDependencies?: string[];
}
```

For repeated templates, `id` is the template identity and runtime indexed paths are materialized from that template.

Example:

```ts
// compiled template node
{ id: 'contacts[].email', path: 'contacts[].email', kind: 'field' }

// runtime active instances
'contacts.0.email'
'contacts.1.email'
'contacts.2.email'
```

Rules:

1. `validationOrder` may contain template identities for repeated structures
2. runtime validation expands each repeated template entry into all current active indexed instances before execution
3. field validation state buckets and materialization cache are keyed by runtime indexed paths, not template ids

### Field Registration State

This is runtime participation state.

```ts
interface FieldRegistrationState {
  path: string;
  mounted: boolean;
  visible: boolean;
  disabled: boolean;
  touched: boolean;
  dirty: boolean;
  visited: boolean;
}
```

### Field Validation State

This is runtime validation result state.

```ts
 interface FieldValidationStateSnapshot {
   ownerId: string;
   path: string;
   errors: ValidationError[];
   validating: boolean;
 }
```

Conceptually, errors belong to field-addressed validation state.

Operationally, the owning validation scope runtime stores and manages these field states in an owner-local map keyed by path.

### Canonical Identity

Canonical bookkeeping identity is not plain path alone.

```ts
interface OwnerQualifiedPath {
  ownerId: string;
  path: string;
}
```

Rules:

1. `path` is always an absolute path inside the owning scope's address space
2. `ownerId` distinguishes parent-owned committed state from child-owned draft state
3. caches, async run ownership, runtime overlays, and field validation buckets are keyed by `OwnerQualifiedPath`
4. public APIs may accept plain absolute paths only when the owner runtime is already known from context

Repeated instances use absolute indexed paths inside their owner, such as `items.3.email`, plus owner identity for isolation when needed.

When repeated items have a stable logical identity, validation and UX state migration should prefer that logical identity over raw positional index.

Pure index-based remapping is only the fallback when no stable item identity exists.

## Error Ownership And Query Model

Errors are field-addressed validation state owned by the nearest validation scope runtime.

The practical model is:

1. each path has a field validation state bucket
2. the owner runtime stores those buckets
3. field UI reads errors through path-based field state queries
4. scope-level APIs expose summaries, not arbitrary parent-side deep inspection of child scope internals

Rules:

1. `getFieldState(path)` is the primary read API for field errors
2. `getScopeState()` is the primary read API for summary state
3. parent scopes do not automatically enumerate child-scope internal field errors
4. if a parent needs child validity for gating, it reads child scope summary state or uses an explicit dependency contract

Each `ValidationError` must include a `sourceKind` that distinguishes at least:

1. `field`
2. `object`
3. `array`
4. `row`
5. `scope-root`
6. `runtime-overlay`
7. `runtime-opaque`

### Aggregate And Root Error Attach Points

Aggregate and root errors attach to structural root paths.

Rules:

1. object-level errors attach to the object root path
2. array-level errors attach to the array root path
3. row-level errors attach to the row object root path
4. scope-root errors attach to the scope root path

Rendering rules:

1. field chrome reads the field state's own errors
2. object or array chrome may read the subtree root field state to render aggregate errors
3. scope-level summary UI may read `getScopeRootErrors()` when it needs scope-root messages

`getScopeRootErrors()` returns only errors whose `sourceKind === 'scope-root'`.

It does not duplicate ordinary object, array, or row aggregate errors even when they attach to the same `rootPath`.

It is equivalent to reading scope-root messages from the root field state without requiring external code to depend on the owner's `rootPath` string.

## Compile-Time Collection

Validation structure is compiled by component-aware collector hooks.

```ts
interface ValidationCompileContribution<S = unknown> {
  ownerResolution?: 'inherit-owner' | 'create-owner' | 'no-owner';
  kind: FieldTreeNodeKind | 'none';
  collectNode?(schema: S, ctx: ValidationCompileContext<S>): CompiledFieldTreeNodeInput | undefined;
  collectChildren?(schema: S, ctx: ValidationCompileContext<S>): ValidationChildDescriptor[];
  collectRules?(schema: S, ctx: ValidationCompileContext<S>): CompiledRuleTemplate[];
  collectDependencies?(schema: S, ctx: ValidationCompileContext<S>): string[];
}
```

`ownerResolution` is the compile-time contract that participates in owner-boundary partitioning.

Rules:

1. if a renderer family has fixed ownership semantics, it may declare `ownerResolution` statically
2. if ownership depends on schema options, the compiler must resolve `ownerResolution` from schema before model partitioning
3. model partitioning must not rely on runtime guesswork

The compiler must partition compiled validation models by owner boundary.

That means:

1. nodes collected under `inherit-owner` merge into the parent owner's model
2. nodes collected under `create-owner` start a new compiled validation model
3. dependencies may not cross owner boundaries directly

Cross-owner coordination happens through explicit commit or child-scope contracts, not through shared dependency edges.

Default mapping rules:

1. `scope-root` and `form-root` imply `create-owner`
2. `field`, `object`, `array`, `variant-root`, `variant-branch`, and `repeated-template` default to `inherit-owner`
3. `object` and `array` may be promoted to `create-owner` by schema options such as draft mode
4. `kind: 'none'` implies no validation node contribution

The compiler is responsible for:

1. path rebasing during authoring-to-canonical compilation
2. field tree assembly
3. dependency graph assembly
4. validation ordering
5. aggregate child-to-parent dependency registration

## Template Graph And Active Instance Graph

The compiled graph is a template graph.

At runtime, each validation scope materializes an active instance graph.

The active instance graph answers:

1. which branch is active
2. which repeated item instances exist
3. which paths are currently participating
4. which paths have become inactive and must be cleaned up

The active instance graph is derived from:

1. the compiled validation template graph
2. current values and branch guards
3. runtime participation signals such as mounted field registrations and dynamic child paths

The minimal active instance graph algorithm is required for correctness.

At minimum, each owner must be able to:

1. activate and deactivate branches
2. materialize repeated item instances
3. mark paths as participating or not participating
4. clean up deactivated field state and async runs

Structural cleanup has two layers:

1. immediate cleanup when structural mutations deactivate paths
2. idempotent participation refresh at the start of every validation run

These complement each other. Structural mutations should clear obviously stale state immediately, and each run still recomputes participation before executing rules.

## Rule Template Model

Rules are compiled once as templates, then materialized per validation run.

```ts
interface CompiledRuleTemplate {
  id: string;
  kind: ValidationRuleKind;
  when?: CompiledRuntimeValue<boolean>;
  args: Record<string, CompiledRuntimeValue<unknown> | unknown>;
  message?: CompiledRuntimeValue<string> | string;
  dependencyPaths: string[];
}

interface EffectiveValidationRule {
  id: string;
  kind: ValidationRuleKind;
  args: Record<string, unknown>;
  message?: string;
}

interface EffectiveRuleMaterialization {
  path: string;
  rules: EffectiveValidationRule[];
  effectiveRequired: boolean;
}
```

Rules may use expressions for activation, thresholds, cross-field comparisons, and messages.

Schema is not reparsed during validation.

## Materialization Service

Each validation scope runtime exposes one internal rule materialization service.

That service must be the single source for:

1. validator execution
2. effective required state
3. future diagnostics or rule inspection UI

The materialization cache is owner-local, keyed by path, and invalidated by dependent writes, overlay changes, structural changes, and participation changes.

## Dependency Model

The dependency graph merges three sources:

1. explicit rule dependencies such as `equalsField` and `requiredWhen`
2. expression dependencies from `when`, `args`, or `message`
3. aggregate child-to-parent dependencies added by the compiler

This dependency graph is used to expand validation impact beyond a single leaf path.

Dependency edges are owner-local.

Compiled expression dependencies may only create reactive edges within the current owner.

If a rule needs data originating from another owner, that data must be projected into the current owner as an explicit input value rather than modeled as a cross-owner reactive dependency edge.

## Participation Rules

### Bound Subtree Participation

If a subtree edits parent-owned values directly, it stays in the parent validation scope.

Examples:

1. inline object editing
2. inline array editing
3. table cell editing bound directly to parent values

### Local Draft Participation

If a subtree edits a local draft before commit, it uses a child validation scope runtime.

In these cases:

1. draft errors stay in the child scope
2. parent scope is unaffected until commit
3. commit first validates child scope
4. successful commit writes back and triggers parent revalidation of impacted paths

### Non-Form Validation Scope Participation

A filter or search panel may create a validation scope without being a form.

In that case:

1. there is no submit gate by default
2. validation still runs on change or blur
3. errors still show through field state
4. actions may read scope summary validity if needed

Validation APIs remain owner-local in this case as well.

`validateAll()` only traverses paths owned by the current owner and does not recurse into child owners unless an explicit parent-child contract requires submit-time recursion.

## Hidden And Inactive Content

Hidden and inactive paths are owner-scoped participation concerns.

Default rules:

1. hidden fields keep their value unless policy says otherwise
2. hidden fields skip validation unless policy says otherwise
3. hidden transitions clear stale errors for non-participating paths
4. if policy requires clearing the value, that value change participates in the same validation preparation flow

Branch inactivity follows the same principle:

1. inactive branches do not participate in validation
2. inactive branch async runs are invalidated
3. inactive branch stale errors are removed from active scope state

## Validation Execution Model

Every validation entry point follows the same high-level flow.

1. prepare participation
2. compute impacted closure
3. expand validation targets
4. materialize rules
5. execute sync rules
6. execute async rules
7. publish field-addressed state and scope summary state

The `system` reason is reserved for owner-driven structural and lifecycle revalidation.

Rules for `system`:

1. it does not update touched / visited policy state
2. it may publish field state immediately regardless of display policy, because its purpose is to keep owner state consistent after structural changes
3. it is appropriate for branch activation, array remap follow-up validation, and other owner-managed participation changes

## Validation APIs

### `validateAt(path, reason)`

Leaf or local-root trigger. The owner validates the impacted closure around that path.

### `validateSubtree(path, reason)`

Validates an object, array, or local section.

### `validateAll(reason)`

Validates all active participating paths owned by the current scope.

### `applyChangesAndRevalidate(...)`

Coordinates value writes and revalidation atomically for structural edits, branch switches, draft commits, and other system-side participation changes.

## Aggregate Rules

Aggregate rules remain first-class.

Supported categories include:

1. object-level rules
2. array-level rules
3. row-level rules
4. scope-root rules when needed

Aggregate roots do not need to correspond to a mounted leaf field.

## Complex Controls And Dynamic Overlays

Complex controls should prefer dynamic rule overlays over opaque black-box validation when possible.

### Declarative Rule Overlay

```ts
interface RuntimeRuleOverlayDescriptor {
  ownerId: string;
  targetPaths: string[];
  dependencyPaths: string[];
  childPaths?: string[];
  ruleTemplatesByPath: Record<string, CompiledRuleTemplate[]>;
  unregister(): void;
}
```

Declarative overlays merge into the same materialization pipeline as compiled rule templates.

Overlay participation still follows the active instance graph.

An overlay only contributes rules while its target path is active in the current owner. If the underlying compiled node becomes inactive because of branch or structure changes, the overlay becomes inactive as well until the target path participates again.

### Opaque Runtime Validator

```ts
interface RuntimeOpaqueValidationDescriptor {
  ownerId: string;
  targetPaths: string[];
  dependencyPaths: string[];
  childPaths?: string[];
  attachTo?: 'target-path' | 'scope-root';
  unregister(): void;
  validatePath?(path: string): Promise<ValidationError[]> | ValidationError[];
  validateRoot?(): Promise<ValidationError[]> | ValidationError[];
}
```

Rules:

1. descriptors may only register paths owned by their owner
2. descriptors may not create cross-owner dependency edges
3. descriptor removal must clean up child paths, overlays, and async ownership for affected paths
4. opaque validators must still declare target paths and dependency paths so closure calculation remains correct
5. owner runtimes must validate descriptor ownership and target path containment before accepting registration

## Async Validation Semantics

Async validation is part of the same rule pipeline.

Each async run has owner identity, path, rule identity, reason, and run identity.

Rules:

1. new runs supersede old runs for the same path and rule
2. stale runs must not publish results
3. deactivated paths invalidate their runs
4. submit-owned runs do not wait behind change debounce
5. `validateAll('submit')` and `validateAll('commit')` wait for required async rules

## Parent And Child Scope Interaction

Child scopes do not automatically merge their internal field states into parent field state maps.

The parent sees child scopes through explicit contracts.

`ChildValidationContract` applies only to child scopes that resolved to `create-owner`.

Subtrees that resolved to `inherit-owner` do not produce contracts, because their paths already belong to the parent owner.

```ts
type ChildValidationMode = 'ignore' | 'summary-gate' | 'recurse-submit';

interface ChildValidationContract {
  childOwnerId: string;
  mode: ChildValidationMode;
}

interface ChildValidationContractRegistration extends ChildValidationContract {
  active: boolean;
  unregister(): void;
}
```

Modes:

1. `ignore`: parent does not consult the child for gating or submit
2. `summary-gate`: parent may read child summary state for gating, but does not inspect child internals
3. `recurse-submit`: parent submit explicitly invokes child submit-time validation and waits for its required async runs

Lifecycle rules:

1. a child owner registers its contract with the parent when the child owner becomes active
2. a child owner unregisters its contract when it is disposed or no longer participates
3. unopened or disposed child owners have no active contract and do not affect parent gating
4. parent summary and submit gating consider only active contracts

Parent `canSubmit` semantics:

1. parent-owned errors always affect parent `canSubmit`
2. child scopes in `ignore` mode do not affect parent `canSubmit`
3. child scopes in `summary-gate` mode affect parent `canSubmit` through `ready` and `validating` (using `ready` rather than `valid`, to prevent misreading a FormRuntime child as ready when allTouched is false)
4. child scopes in `recurse-submit` mode are validated during parent submit and may block submit

Default contracts:

1. child draft editors default to `ignore` until commit time
2. standalone filter/search scopes use `summary-gate` only when an action explicitly depends on them
3. nested submit-capable forms default to `ignore` unless explicitly configured otherwise

## Scenario Mapping

1. normal form: `FormRuntime`
2. filter panel: `ValidationScopeRuntime`
3. inline table editing bound to parent values: parent owner
4. row draft editor: child validation scope runtime
5. detail dialog editing draft data: child validation scope runtime
6. pure action controls: no validation scope runtime

## Implementation Phases

### Phase 1

1. compiled rule templates
2. expression dependency extraction
3. unified effective required computation
4. shared materialization service

### Phase 2

1. separation of compiled structure, registration state, and field validation state
2. runtime participation cleanup for hidden and dynamic paths
3. owner-coordinated form-wide traversal
4. minimal active instance graph handling for branches and repeated instances

### Phase 3

1. common validation scope runtime beneath form
2. non-form validation scopes
3. draft scope ownership

### Phase 4

1. stronger active instance graph optimizations
2. owner-local caching refinement
3. richer child-scope gating contracts
4. more advanced dynamic overlay management

## Final Decision

Flux validation uses the following architecture:

1. a compiled validation template graph is the primary source of truth
2. each validation-capable scope owns validation through `ValidationScopeRuntime`
3. `FormRuntime` is a specialization of that runtime, not the only owner model
4. runtime field registration supplements active participation, but does not replace the compiled graph
5. field-addressed validation state is stored and coordinated by the owning scope runtime
6. rules are compiled as templates and materialized per run
7. partial validation is owner-scoped and path-aware
8. draft validation is isolated in child scopes until commit
