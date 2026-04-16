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

> **Type Reference**: Complete TypeScript type definitions are in `docs/references/form-validation-runtime-types.md`. This section describes the conceptual model; refer to the reference for exact interface signatures.

### Core Abstractions

The validation runtime model has three core abstractions:

1. **`ValidationScopeRuntime`** — The base runtime for any scope with validation semantics
2. **`FormRuntime`** — A specialization of ValidationScopeRuntime for forms with touch/dirty tracking
3. **`CompiledValidationModel`** — Immutable validation graph produced by the compiler

### Key Types Summary

| Type | Purpose |
|------|---------|
| `ValidationError` | Single validation error with path, owner, rule, message, and sourceKind |
| `ValidationResult` | Result for single-path validation (ok, errors, validating) |
| `ScopeValidationResult` | Result for subtree/scope validation (adds fieldErrors map) |
| `FormSubmitResult` | Result for form submit (ok, errors) |
| `FieldValidationStateSnapshot` | Per-field validation state snapshot |
| `ScopeValidationStateSnapshot` | Scope-wide validation state summary |

### ValidationScopeRuntime

The core runtime abstraction exists for any scope that has validation semantics:

1. normal forms
2. draft editors
3. non-form filter scopes
4. row-local editors when they own local validation

Key APIs:
- `validateAt(path, reason)` — validate single path
- `validateSubtree(path, reason)` — validate path and descendants
- `validateAll(reason)` — validate entire scope
- `getFieldState(path)` — read field validation state
- `getScopeState()` — read scope summary state
- `registerField(state)` — register field participation

### FormRuntime

`FormRuntime` extends `ValidationScopeRuntime` with:

1. tracking touched/dirty/visited state
2. implementing `showErrorOn: 'touched'` policy
3. providing `submit()` with form-specific validation and gating
4. computing `canSubmit` and `allTouched`

### Owner Lifecycle

Rules:

1. each owner assumes its `compiledModel` is stable for the lifetime of one active model generation
2. dynamic schema replacement is an owner lifecycle event, not a silent in-place mutation
3. `compiledModel === null` is only valid while the owner is `bootstrapping`, `refreshing`, or `disposed`
4. `compiledModel !== null` is required before ordinary validation work may execute
5. `disposed` owners must reject new validation and registration requests
6. owners in `bootstrapping` or `refreshing` may delay validation requests until the owner becomes `active`, but they must not execute validation against a `null` model

`compiledModel: null` therefore does not mean “registration-only validation mode”.

It means the owner currently has no executable compiled validation model attached.

`getScopeState()` and any debugger-facing snapshot must surface the current `lifecycleState` so callers can distinguish `active` from transitional states.

Validation entry arbitration is also owner-local.

Rules:

1. one owner may have multiple validation entry requests in flight, but it must publish only the latest effective result for each owned path
2. `submit` and `commit` entry points supersede older in-flight `change`, `blur`, or `manual` validation work in the same owner
3. for `validateAll('submit' | 'commit')`, the supersession set is the full current owner traversal set plus any already-running lower-priority targets in that owner
4. for `validateSubtree(path, 'submit' | 'commit')`, the supersession set is the validated subtree plus any already-running lower-priority targets whose latest published result would write into that subtree
5. superseding a lower-priority entry cancels any pending debounce for the supersession set and prevents stale async completions from publishing
6. superseding never requires waiting for stale lower-priority runs to finish before the newer `submit` or `commit` run starts
7. `submit` and `commit` validate against the latest owner value snapshot available when that entry begins execution

Current implementation note:

- the architecture baseline is wider than `FormRuntime`
- current code already models validation around `ValidationScopeRuntime`
- but the most mature concrete implementation path in live code is still `FormRuntime` and the shared owner-validation machinery assembled around it

Readers should therefore distinguish:

1. the target owner model, which is not form-only
2. the current implementation center of gravity, which is still form-first in several concrete runtime paths

### Touched And Error Display Policy

Touched / dirty / visited state is stored per field, while UX policy lives in `FormRuntime`.

`ValidationScopeRuntime` does not aggregate touched state for display behavior.

`FormRuntime` adds:

1. `allTouched`
2. `showErrorOn: 'touched'`
3. `canSubmit` derived from scope readiness and touch policy

`showErrorOn` controls when validation results become visible in UI, not whether validation executes.

It also does not control whether owner state, effective rules, or effective requiredness are recomputed.

Default display policy:

1. `FormRuntime` defaults to `showErrorOn: 'blur'`
2. non-form `ValidationScopeRuntime` also defaults to `showErrorOn: 'blur'`

`ValidationScopeRuntime.showErrorOn` is the owner-level display policy for non-form scopes.

Non-form scopes may use `change`, `blur`, `submit`, or `manual`, but not `touched`.

The non-form default is intentionally not `change`, because cross-field validation such as date-range constraints is usually too noisy during mid-input editing.

When path `A` changes and closure expansion causes path `B` to revalidate, visibility of `B`'s error still follows `B`'s own resolved display policy rather than the trigger source path.

For `FormRuntime`, `showErrorOn` and touched state do not weaken submit-time validity.

Rules:

1. a field may remain visually hidden by `showErrorOn: 'touched'` after a `system` run if it has not been touched yet
2. the same field still contributes to owner `valid`, `ready`, and `canSubmit` immediately once the owner has materialized effective rules and found an error
3. `system` never marks fields as touched or visited by itself
4. `submit()` may mark fields touched according to form policy, but that is a submit orchestration rule, not a side effect of ordinary `system` validation

Debounce policy is not a separate owner-level authoring feature.

Rules:

1. debounce belongs to async rule configuration, not to `showErrorOn` or to the owner boundary itself
2. the owner runtime schedules and cancels debounced async runs owner-locally
3. if an async rule does not declare debounce, it executes without debounce
4. `submit` and `commit` bypass change-oriented debounce and run required async validation immediately
5. a debounced async rule that is scheduled but not yet started still counts as owner-local pending validation work for `validating` and readiness purposes
6. `blur` and `manual` validation use the debounce declared on the async rule unless a higher-priority owner policy explicitly supersedes that run

## What Counts As A Validation Scope

Not every render scope creates a validation runtime.

Validation does not introduce a second parallel author-facing scope DSL.

A validation scope exists when an existing data/value owner owns validation-participating nodes.

Typical cases are:

1. `form` owning bound fields and aggregate validation
2. page/root data scope owning bound fields when there is no nearer form or draft owner
3. a local draft/value owner created by an existing value-lifecycle construct

A plain visual container with no validation content does not create a validation runtime.

Native DOM validation inside a `no-owner` subtree is outside Flux validation semantics.

Flux does not guarantee capture, aggregation, or lifecycle coordination for browser-native validation errors originating from uncontrolled DOM attributes such as `required`.

Runtime discovery alone must not create a new validation owner.

If a control needs owner-level runtime validation, it must register into an owner boundary that was already classified by the compiler as `inherit-owner` or `create-owner`.

Therefore:

1. runtime registration may enrich an existing owner
2. runtime registration may not create a brand-new owner at an unclassified boundary

### Inference From Data Scope Ownership

Validation ownership should be inferred from existing data/value ownership, not from a second explicit `validationScope` authoring block.

Authoring guidance:

1. use `form` when the subtree really has form semantics and a submit/confirm lifecycle
2. let ordinary fields inside `page` / current lexical data scope attach to that existing owner by default
3. use existing local-value or draft owner patterns when edits must stay isolated before commit
4. do not require authors to invent a validation-only id or kind for ordinary containers

This keeps validation attached to the same owner model that already governs data scope and value lifecycle.

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
2. a dialog child form that owns local editable values
3. a detail/draft editor that validates before commit
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

Owner-boundary changes across schema recompilation are not runtime reclassification.

They are model-replacement lifecycle events that either refresh the current owner generation or dispose and recreate the owner tree.

## Layered State Model

> **Type Reference**: Complete TypeScript type definitions for state structures are in `docs/references/form-validation-runtime-types.md`.

Validation uses three separate kinds of state:

### Compiled Validation Model

Immutable runtime input produced by the compiler, containing:
- `rootPath` and `ownerId` for scope identity
- `nodes` map of `CompiledFieldTreeNode` keyed by path
- `validationOrder` for deterministic traversal
- `dependents` map for dependency-triggered revalidation

Each `CompiledFieldTreeNode` has a `kind` that is one of: `scope-root`, `form-root`, `field`, `object`, `array`, `variant-root`, `variant-branch`, or `repeated-template`.

For repeated templates, `id` is the template identity (e.g., `contacts[].email`) and runtime indexed paths (e.g., `contacts.0.email`) are materialized from that template.

### Field Registration State

Runtime participation state tracking:
- `registrationId` — stable for one mounted field instance
- `path`, `mounted`, `visible`, `disabled`
- `touched`, `dirty`, `visited` — maintained by FormRuntime

Registration updates are generation-aware. Key rules:
1. Owner runtime binds each accepted registration to the current `modelGeneration`
2. Late callbacks from older generations must not mutate newer generation state
3. Registration requests during `disposed` state must be rejected

### Field Validation State

Runtime validation result state per field:
- `ownerId`, `path`
- `errors: ValidationError[]`
- `validating: boolean`

### Form Store State Structure

Form state uses a normalized flat structure:
- Single `fieldStates` map instead of five separate maps (touched, dirty, visited, validating, errors)
- `true | undefined` pattern for boolean flags (memory efficiency)
- Empty entries automatically cleaned up
- Array remapping traverses map once instead of five times

### Per-Path Subscription API

`FormStoreApi` exposes fine-grained subscription methods:
- `subscribeToPath(path, listener)` — fires only for that path's changes
- `subscribeToSubmitting(listener)` — fires only for submitting flag
- `getPathState(path)` — snapshot for useSyncExternalStore
- `getFieldState(path)` / `setFieldState(path, state)` — direct access

This per-path subscription model ensures O(1) hook wake-up cost per field change, regardless of form size.

### Canonical Identity

Canonical bookkeeping identity is `OwnerQualifiedPath`:
- `ownerId` — distinguishes parent-owned committed state from child-owned draft state
- `path` — absolute path inside the owning scope's address space

Caches, async run ownership, and field validation buckets are keyed by owner-qualified path.

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
6. `external`
7. `runtime-overlay`
8. `runtime-opaque`

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

External error injection is owner-local as well.

Rules:

1. `applyExternalErrors(...)` is the normative API for server-returned or host-returned field errors that should enter owner field state without being modeled as compiled rules
2. injected errors must still target paths owned by the current owner
3. injected errors do not create dependency edges and do not participate in rule materialization
4. `replace: true` replaces prior injected errors from the same `sourceId`; otherwise the owner merges them with existing errors from that source
5. `applyExternalErrors(...)` publishes field state and owner summary state atomically and returns the resulting owner snapshot for the applied error set
6. owner-local value writes clear external errors from the same `sourceId` for the changed leaf path and its owned ancestor chain up to the current owner root, unless a caller deliberately reapplies them
7. subtree-wide or scope-root external errors therefore clear when a descendant write invalidates the same owner-local external error context

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
  args: Record<string, CompiledRuntimeValue<unknown>>;
  message?: CompiledRuntimeValue<string>;
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

Rule execution does not short-circuit on the first failing rule.

Rules:

1. all active effective rules for a target path execute in materialized order
2. the owner collects all produced errors for that path in one run
3. a failing `required` rule does not by itself suppress later `pattern`, `minLength`, aggregate, or async rules
4. future per-rule short-circuit semantics, if ever introduced, must be explicit rule metadata rather than an implicit runtime optimization

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

Dependency closure must be cycle-safe.

Rules:

1. owner-local dependency graphs may contain cycles such as mutual cross-field comparisons
2. closure expansion must therefore track visited paths and converge to a fixed owner-local target set rather than recurse indefinitely
3. cycles are not by themselves a compile-time error
4. the compiler may emit diagnostics for suspicious or needlessly large strongly connected components, but benign owner-local cycles remain legal

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
2. it recomputes effective rules, effective requiredness, validating state, and owner summary state normally
3. it does not bypass the target field's own resolved display policy for user-visible error-message surfacing
4. owner summary validity, diagnostics, and submit/readiness state may still update immediately
5. it is appropriate for branch activation, array remap follow-up validation, and other owner-managed participation changes

## Validation APIs

### `validateAt(path, reason)`

Leaf or local-root trigger. The owner validates the impacted closure around that path.

### `validateSubtree(path, reason)`

Validates an object, array, or local section.

When called with `reason: 'submit'` or `reason: 'commit'`, it waits for all required async rules within that subtree before resolving.

`validateSubtree()` remains owner-local.

Rules:

1. it validates only paths owned by the current owner
2. it does not recurse into child owners, even when `reason` is `submit` or `commit`
3. parent-to-child recursive submit coordination belongs to explicit submit orchestration through `ChildValidationContract`, not to implicit `validateSubtree()` traversal

### `validateAll(reason)`

Validates all active participating paths owned by the current scope.

`validateAll()` is not the normative keystroke-path baseline for large inline-edit tables.

Rules:

1. hosts must not use `validateAll('change')` as the default response to ordinary cell typing in large editable collections
2. aggregate-heavy owners, especially tables with array rules such as `uniqueBy(...)`, must treat owner-wide validation on every keystroke as a real performance risk rather than an acceptable default
3. when the interaction requires broad aggregate correctness, the owner may still run `validateAll()` on `blur`, `commit`, or `submit`, but that must be an explicit interaction policy rather than an accidental fallback from missing finer-grained coordination

### `applyChangesAndRevalidate(...)`

Coordinates value writes and revalidation atomically for structural edits, branch switches, draft commits, and other system-side participation changes.

Its atomicity is owner-local.

Rules:

1. all `writes` and `changedPaths` must belong to the current owner
2. passing paths outside the current owner is an error and must be rejected, not silently filtered
3. its atomic publish guarantee covers only the current owner's value writes, field validation state, and scope summary state
4. cross-owner coordination must be modeled as explicit parent/child orchestration rather than one `applyChangesAndRevalidate(...)` call spanning multiple owners

## Large Inline Tables And Aggregate Rules

Large inline-edit tables are a performance-sensitive validation domain.

Typical high-risk shape:

1. hundreds of rows
2. many editable columns
3. array aggregate rules such as `uniqueBy(...)`, `atLeastOneFilled(...)`, or object/array-level cross-field checks
4. high-frequency `change` validation while the user is typing

In that shape, the expensive part is not only async work or final rule execution.

Closure expansion, target expansion, and effective-rule materialization can dominate before any remote validation starts.

Normative constraints:

1. the architecture must treat large inline-table aggregate validation cost as a first-class design constraint, not as an implementation detail to be ignored until profiling
2. compile-time graph truth does not require owner-wide aggregate execution on every `change`; it requires that any deferred or incremental strategy preserve the same semantic graph once the chosen interaction boundary is reached
3. hosts and renderers must not silently weaken aggregate correctness just to keep typing responsive
4. if per-keystroke aggregate execution is too costly for the owner shape, the implementation must choose an explicit strategy rather than rely on ad hoc hidden shortcuts

Allowed strategies include:

1. validate the edited path and its local dependency closure during `change`, then run broader aggregate validation at `blur`, `commit`, or `submit`
2. split the interaction into smaller validation owners such as row-local draft editors when the value lifecycle genuinely supports that boundary
3. use an incremental aggregate algorithm that preserves the same aggregate semantics as the compiled rule graph at publish time

Rejected baseline:

1. treating owner-wide aggregate revalidation on every cell keystroke as the required default for all table shapes
2. introducing non-normative shortcuts that skip aggregate rules without making the weaker interaction policy explicit
3. claiming compile-time graph fidelity while depending on undocumented heuristics that can miss aggregate violations in ordinary editing flows

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

Overlay merge order is normative.

Rules:

1. compiled rule templates materialize first
2. active overlays merge after compiled templates for the same path
3. deduplication key is `CompiledRuleTemplate.id`
4. if an overlay reuses an existing rule id, the overlay entry replaces the earlier entry for that id
5. rules with different ids but the same `kind` all participate unless a higher-level rule kind explicitly defines mutual exclusion

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

Async ownership is generation-aware.

Rules:

1. new runs supersede old runs for the same path and rule
2. stale runs must not publish results
3. deactivated paths invalidate their runs
4. submit-owned runs do not wait behind change debounce
5. `validateAll('submit')` and `validateAll('commit')` wait for required async rules
6. model-generation changes invalidate all older-generation runs, even when the same path string still exists in the new model

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

An active child contract requires:

1. child `lifecycleState === 'active'`
2. child `compiledModel !== null`
3. completion of that child owner's current model-refresh reconciliation

Mode resolution happens when the child owner activates and registers its contract.

Resolution priority is:

1. an explicit child/host semantic contract, if that owner family defines one
2. otherwise the runtime default for that child owner family
3. otherwise `ignore`

Parent `canSubmit` semantics:

1. parent-owned errors always affect parent `canSubmit`
2. child scopes in `ignore` mode do not affect parent `canSubmit`
3. child scopes in `summary-gate` mode affect parent `canSubmit` through `ready` and `validating` (using `ready` rather than `valid`, to prevent misreading a FormRuntime child as ready when allTouched is false)
4. child scopes in `recurse-submit` mode are validated during parent submit and may block submit

Parent submit orchestration uses a deterministic child snapshot.

Rules:

1. parent `submit()` first waits for the parent owner's own `bootstrapping` or `refreshing` work to settle before snapshotting child contracts
2. the set of child contracts consulted by one submit attempt is the set of active contracts at that snapshot point
3. a child owner that has not reached `active` state by that snapshot point does not participate in that submit attempt because it does not yet have an active contract
4. a child owner already included in the submit snapshot but still refreshing at invocation time blocks completion until it becomes `active` or is disposed

Commit propagation is also owner-local.

Rules:

1. a child owner commit writes only into its immediate parent owner
2. a grandchild owner does not write directly into a grandparent owner
3. multi-level draft propagation therefore proceeds one owner boundary at a time, with each successful writeback followed by parent-local impacted-path revalidation
4. there is no implicit multi-hop commit that skips an intermediate owner boundary

Default contracts:

1. child draft editors default to `ignore` until commit time
2. standalone filter/search scopes use `summary-gate` only when an action explicitly depends on them
3. nested submit-capable forms default to `ignore` unless explicitly configured otherwise
4. a literal nested `form` remains a child owner; if a dialog must edit parent live values directly, use bound editable content rather than introducing a nested `form`

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

## Related Documents

- `docs/references/form-validation-runtime-types.md` — Complete TypeScript type definitions (companion reference)
- `docs/architecture/field-binding-and-renderer-contract.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/scope-ownership-and-isolation.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/dependency-tracking.md` (Section 1.9: validation uses a separate dependency substrate)
