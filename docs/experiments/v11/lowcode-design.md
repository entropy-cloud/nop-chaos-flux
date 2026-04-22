# Low-Code Runtime Design Derived From Requirements

Status: draft-1, derived from `docs/low-code-dsl-runtime-requirements.md` after an independent clean-slate design pass

## 1. Purpose

This document converts the requirement specification for a declarative low-code DSL runtime into a concrete programming model and runtime architecture.

The goal is not merely to satisfy the listed requirements. The goal is to satisfy them with a model that is:

- semantically unified,
- compile-first,
- runtime-efficient,
- host-embeddable,
- suitable for serious low-code authoring and debugging.

The key claim is that a low-code runtime should not execute raw schema trees directly. It should compile schema into a semantic execution graph where rendering, actions, validation, data sources, and scoped data all share one runtime contract.

## 2. Semantic Kernel

To avoid collapsing back into a traditional schema-renderer architecture, the runtime must preserve a small semantic kernel above the implementation machinery.

The kernel primitives are:

- `Node`: semantic runtime unit,
- `Lens`: canonical address into node-owned values,
- `Guard`: unified participation derivation,
- `Rule`: pure derivation and validation unit,
- `Intent`: semantic input request,
- `Owner`: edit/submit/draft boundary,
- `Projection`: materialization target.

`TemplateNode` and `RuntimeInstance` are compile/runtime machinery that realize these primitives. They are not the primary conceptual model.

### 2.1 Node

Each compiled schema node lowers to one or more semantic nodes.

A semantic node owns:

- value contract,
- guard contract,
- action surface,
- projection bindings,
- owner membership.

### 2.2 Lens

All dependency tracking, diagnostics, validation targeting, submit slices, and row/branch addressing should use canonical lenses rather than informal string paths.

Lens forms include:

- value lens: `customer.name`
- collection item lens: `items[id=42]`
- active variant lens: `payment#active`
- explicit variant branch lens: `payment#invoice.taxId`
- owner-qualified lens: `owner:checkoutForm::payment#card.cardNo`

For implementation, each lens compiles to a normalized path key plus structural metadata.

### 2.3 Guard

Participation semantics must remain unified.

Every interactive node derives these states from one guard algebra:

- mounted,
- visible,
- enabled,
- writable,
- required,
- validatable,
- serializable,
- submit-blocking.

### 2.4 Rule

Rules are pure units that may derive:

- computed values,
- guard states,
- validation issues,
- data source inputs,
- projection-local derived props.

Rules never perform I/O.

### 2.5 Intent

User input, action steps, host callbacks, and effect results all enter the runtime as typed intents.

Examples:

- `set-value`
- `submit-owner`
- `open-surface`
- `invoke-action`
- `resource-loaded`
- `resource-failed`
- `validate-subtree`

## 3. Requirement-Driven Design Principles

The requirements imply several hard constraints:

- schema is a first-class structural artifact before runtime,
- compilation and execution must be sharply separated,
- expression evaluation must be safe and reusable,
- scope is lexical and path-addressable,
- dependency tracking must be precise and shared across values, data sources, and reactions,
- actions are declarative control flow, not widget callbacks,
- forms, surfaces, and repeated structures need explicit ownership boundaries,
- host capabilities must be injected through explicit contracts,
- static schema portions must be zero-overhead at runtime.

These constraints lead to a runtime centered on seven executable layers:

1. schema template layer,
2. compiled semantic node layer,
3. scope and value graph layer,
4. dependency and invalidation layer,
5. intent/action execution layer,
6. projection layer,
7. host capability layer.

## 4. Core Runtime Model

## 4.1 Template Node and Runtime Instance

The input schema is a tree, but execution cannot treat it as a mutable tree of props.

Instead, compilation produces:

- `TemplateNode`: immutable compiled node definition,
- `RuntimeInstance`: mounted instance of a template node under a specific owner and scope,
- `SemanticBinding`: canonical address from a runtime instance to scope-backed values and actions.

This preserves the requirement that schema compiles once while repeated structures instantiate many times.

### 4.1.1 Template Node

Each compiled template node contains:

- `cid`: compile-time stable node ID,
- `type`: resolved component type,
- `propsPlan`: compiled business prop plan,
- `metaPlan`: compiled control metadata plan,
- `regionPlans`: compiled child region handles,
- `eventPlans`: compiled event-to-action bindings,
- `scopePlan`: scope creation or reuse strategy,
- `ownerPlan`: owner creation or reuse strategy,
- `diagnostics`: compile-time warnings and errors.

Static values are stored directly. Dynamic values are stored as compiled value plans.

### 4.1.2 Runtime Instance

Each mounted instance contains:

- `instanceId`: runtime stable instance identity,
- `cid`: originating template node ID,
- `ownerId`: effective owner boundary,
- `scopeId`: effective lexical scope,
- `pathBinding`: canonical value path prefix when applicable,
- `projectionState`: UI-projection-local ephemeral state only,
- `subscriptions`: dependency subscriptions for dynamic plans.

## 4.2 Compiled Value Model

Requirement 2.1 and 2.2 demand gradual value semantics.

Every schema field compiles into exactly one `CompiledValueNode` of these kinds:

- `static`: zero-runtime literal,
- `expr`: compiled expression over scope,
- `template`: compiled string interpolation plan,
- `actionValue`: value produced by an action pipeline,
- `sourceRef`: named data source binding,
- `regionRef`: child region handle,
- `composite`: structured object or array whose children are compiled value nodes.

This gives one canonical runtime value protocol instead of special-casing each field category.

### 4.2.1 Evaluation Contract

A compiled value node evaluates against one `EvalContext`:

- `resolve(path)`
- `has(path)`
- `slot(name)`
- `owner()`
- `scope()`
- `previous()`

Expression code never sees raw JavaScript ambient scope.

### 4.2.2 Reference Reuse

Every dynamic value node has explicit equality semantics:

- scalar equality,
- shallow structural equality,
- keyed collection equality,
- custom stable adapter equality.

If a recomputed result is equal, runtime reuses the previous reference to satisfy the performance requirement on stable outputs.

## 4.3 Scope as the Universal Data Plane

The requirements define scope more clearly than most UI systems. The runtime should make scope the only readable data plane.

Scope is a lexical environment with path-addressable values and explicit parentage.

Each scope contains:

- `scopeId`,
- `parentScopeId`,
- `isolate` flag,
- `dataRoot`,
- `namespaceRegistry`,
- `projectionImports`,
- `observerIndex`.

### 4.3.1 Scope Read Rules

Read lookup follows:

1. local scope root,
2. local projected imports,
3. lexical parent chain if not isolated,
4. special built-ins such as `$slot`, `result`, `error`, `prevResult` when inside action continuation scopes.

### 4.3.2 Scope Write Rules

All writes are path-specific and structural.

Allowed write forms:

- `set(path, value)`
- `patch(path, objectPatch)`
- `splice(path, collectionPatch)`
- `remove(path)`

Writes always emit a normalized change set of affected paths.

### 4.3.3 Scope Isolation Profiles

To satisfy both expressiveness and high-frequency performance, the runtime supports three scope profiles:

- `lexical`: inherit normally,
- `isolated`: no parent reads except explicit projections,
- `projected`: isolated plus whitelisted imports from ancestor scope.

Table rows and loop items should default to `projected` rather than unrestricted lexical inheritance.

### 4.3.4 Container Data Initialization

Container-like nodes such as page, form, dialog, drawer, fragment-owner, and domain-owner may declare initial data patches.

Initialization order:

1. inherited owner or scope base,
2. host-injected initial data,
3. container `data` patch,
4. explicit fragment or surface open arguments,
5. local defaults from object, variant, or field nodes.

Later layers overwrite earlier layers structurally.

## 4. Owners: The Missing Primitive In Most Low-Code Runtimes

The requirements separately mention page/form/dialog/subform/draft/surface, but these are all owner boundaries.

An `Owner` is the runtime primitive that controls:

- local scope root creation,
- local mutation authority,
- validation aggregation,
- submit lifecycle,
- async pending state,
- discard/reset policy,
- status exposure to parent.

Without an owner model, forms, dialogs, draft editors, and nested editing regions remain inconsistent.

### 4.1 Owner Kinds

Minimum owner kinds:

- `page-owner`
- `form-owner`
- `surface-owner`
- `draft-owner`
- `row-owner`
- `fragment-owner`
- `domain-owner`

These are semantic presets over one owner protocol, not unrelated systems.

### 4.2 Owner State

Each owner has:

- `ownerId`,
- `scopeId`,
- `draftRoot`,
- `baselineRoot`,
- `pendingActions`,
- `validationIndex`,
- `submitState`,
- `statusSnapshot`.

### 4.3 Owner Inheritance Modes

Child structures may:

- inherit parent owner,
- create child owner,
- reference foreign owner.

This is the generalized answer to subform draft isolation and surface-local data environments.

### 4.4 Owner Transaction Contract

Every owner-level mutation is processed as a transaction:

1. normalize intent,
2. authorize owner-local mutation,
3. apply patch to draft root,
4. emit changed lenses,
5. recompute rules and guards,
6. refresh affected data sources and reactions,
7. update validation and owner status,
8. commit or remain staged according to intent.

### 4.5 Owner Commit And Reset

Each owner kind must define:

- `commit`: copy accepted draft state into committed baseline or publish through return channel,
- `discard`: drop uncommitted changes and restore baseline,
- `reset`: restore declared initialization state,
- `bubble`: expose summary status upward.

## 5. Expressions, Dependencies, and Reactions

## 5.1 Safe Expression Engine

The runtime should parse expressions into a small AST and compile them into safe bytecode-like evaluators or interpreted closures over `EvalContext`.

Non-negotiables:

- no `eval`,
- no `new Function`,
- no ambient scope capture,
- no mutation from expression execution,
- deterministic reads only through `resolve` and `has`.

### 5.1.1 Expression Feature Contract

The expression language must include:

- arithmetic operators,
- comparison operators,
- logical operators,
- null-safe navigation,
- array and object literals,
- built-in functions,
- filter-pipeline style transforms if the DSL chooses that syntax.

Built-ins and filters are registered through a typed expression library manifest and are compiled, not dynamically resolved from ambient globals.

## 5.2 Shared Dependency Model

The requirements correctly insist that value reads, named data sources, and reactions share the same dependency model.

The runtime therefore treats every reactive consumer as a `SubscriberPlan`:

- `value-subscriber`
- `source-subscriber`
- `reaction-subscriber`

Each subscriber execution automatically records path reads. The dependency index maps normalized paths to subscribers.

### 5.2.1 Change Propagation

When a write occurs:

1. runtime emits normalized changed paths,
2. exact and ancestor/descendant-sensitive subscribers are located,
3. self-write protected subscribers are filtered,
4. affected subscribers are invalidated,
5. invalidated subscribers are scheduled by priority.

### 5.2.2 Self-Write Protection

Named data sources and reactions carry a current execution token. Writes tagged with that token do not trigger the same subscriber to refresh recursively unless explicitly configured.

## 5.3 Reaction Model

Reactions are not arbitrary watchers. They are declarative observer nodes.

Each reaction declares:

- `watch`: expression or path set,
- `when`: optional guard,
- `fire`: action plan,
- `mode`: immediate, queued, debounced, once-per-stable-value,
- `distinct`: equality rule for suppressing duplicate firings.

This satisfies requirement 2.9.4 while remaining analyzable.

### 5.3.1 Scheduling Semantics

Reaction scheduling order is:

1. synchronous value and guard recomputation,
2. validation updates,
3. reaction invalidation,
4. reaction execution according to immediate, queued, or debounced mode,
5. resulting intents re-enter the same owner transaction pipeline.

## 5.4 Normalized Path And Patch Algebra

For requirement-level interoperability, the runtime needs a canonical data addressing and write model.

Minimum normalized path grammar must distinguish:

- property segment,
- keyed collection segment,
- positional segment,
- variant branch segment,
- owner root.

Patch algebra must support:

- scalar replace,
- object merge,
- collection insert, remove, move, replace,
- tombstone delete,
- structural no-op.

Every patch lowers to normalized changed lens keys for dependency invalidation.

## 6. Action Algebra

The requirements already imply an action algebra. The runtime should formalize it rather than treating actions as miscellaneous side-effect handlers.

## 6.1 Action Plan Kinds

Compiled action plans include:

- `dispatch { action, args }`
- `guard { when, then }`
- `chain { step, then, onError }`
- `parallel { branches, aggregate }`
- `retry { plan, policy }`
- `timeout { plan, ms }`
- `debounce { key, ms, trailing }`
- `sequence { steps }`

These are not separate runtime subsystems. They are nodes in one action execution tree.

## 6.2 Action Result Algebra

Each action resolves to one of:

- `success(value)`
- `failure(error)`
- `skipped(reason)`

Continuation rules:

- `then` runs only on success,
- `onError` runs only on failure,
- skip propagates neutrally unless explicitly matched,
- `parallel` aggregates all branch result classes.

## 6.3 Continuation Scope

When an action enters `then` or `onError`, runtime creates a continuation scope overlay exposing:

- `result`,
- `error`,
- `prevResult`,
- inherited lexical values.

This directly satisfies the chained result context requirement.

## 6.4 Action Resolution Layers

Action lookup order is explicit:

1. platform built-in actions,
2. component instance actions,
3. namespace actions from scope.

The action string itself determines the resolution family:

- plain name => built-in,
- `component:<method>` => component instance registry,
- `namespace:method` => scope namespace registry.

Resolution is compile-checkable for static cases and runtime-checkable for dynamic cases.

## 6.5 Read/Write Separation

The requirements demand a strict split:

- read through scope,
- side effects only through capability dispatch.

Therefore built-in actions are also capabilities, even when they mutate local scope. They execute through the same dispatcher and produce observable runtime results.

### 6.5.1 Action To Intent Lowering

Action syntax is authoring sugar.

At runtime, action plans lower into semantic intents plus optional effect requests. This preserves the stronger clean-slate model while still satisfying the requirement for declarative control flow authoring.

### 6.5.2 Effect Re-entry Rule

No effect result may mutate scope or owner state directly.

All effect outcomes re-enter as intents such as:

- `action-succeeded`
- `action-failed`
- `resource-loaded`
- `surface-closed`

## 7. Component and Projection Model

## 7.1 Compiled Node Runtime Shape

Each rendered node resolves to four planes plus regions:

- `props`: business inputs,
- `meta`: runtime control metadata,
- `events`: bound action handlers,
- `capabilities`: optional instance methods exposed upward,
- `regions`: compiled child fragment handles.

This exactly aligns with the requirement's props/meta/regions/events split, but places it on top of the compiled execution graph.

## 7.2 Layout vs Control Components

The runtime must enforce the design distinction:

- layout components only expose semantic structure and marker classes,
- control components are self-contained UI controls.

This should be encoded as component registration metadata, not left as convention only.

### 7.2.1 Registration Contract

Each registered component declares:

- `type`,
- `kind: layout | control | owner | utility | domain`,
- `regions`,
- `propSchema`,
- `metaSchema`,
- `instanceActions`,
- `scopePolicy`,
- `ownerPolicy`.

### 7.2.2 Extension Timing

The component registry supports:

- bootstrap registration before schema compile,
- runtime registration before first use of a lazy-loaded node type,
- host-scoped registration overlays for embedded domains.

Compile-time diagnostics should reject missing components when static resolution is expected.

## 7.3 Fragment and Region Model

A region is a precompiled child fragment with optional parameter schema.

Rendering a region creates a fragment instance with:

- parent compiled template,
- region-local parameter scope,
- optional owner override,
- optional scope override.

Region parameters become `$slot` bindings.

### 7.3.1 Remote Fragment Loading

To satisfy the gradual complexity requirement for remote fragment activation, a region may be backed by a `RemoteFragmentPlan`:

- fragment source capability,
- load trigger,
- schema validation contract,
- fallback projection,
- cache policy,
- error projection.

Remote fragments still compile before execution once loaded; the runtime should not directly interpret unvalidated remote schema payloads inline.

## 8. Composite Business Structures

The independent clean-slate design introduced owner and semantic value boundaries. The requirements around form, validation, loop, and row isolation force us to make these structures first-class.

## 8.1 Form Owner

A form is an owner specialized for editable record state.

It maintains:

- current value draft,
- dirty path set,
- touched path set,
- submitting status,
- validation issue graph,
- field participation state,
- partial validation APIs.

### 8.1.1 Validation Graph

Compiled validation graph contains:

- field validators,
- object validators,
- array validators,
- conditional activators,
- async validator handles.

Validation execution is path-addressable so partial validation can run on any subtree.

### 8.1.2 Validation Triggers And Display Policy

Validation trigger policy and issue display policy are separate.

Trigger policies include:

- on submit,
- on change,
- on blur,
- on explicit validate intent.

Display policies include:

- eager,
- touched-only,
- submit-after-first-attempt,
- custom issue visibility rule.

### 8.1.3 Async Validation Cancellation

Async validators run with cancel tokens bound to:

- owner,
- target lens,
- validator ID,
- validation generation.

Stale async results must be ignored or canceled before they can attach issues.

### 8.1.4 Draft Isolation

Subforms or local editors can create `draft-owner` children.

Parent owner sees only:

- committed child result,
- child summary status,
- optional projected dirty summary.

This is the clean runtime answer to requirement 2.8.6.

## 8.2 Object Field

An object field is not just a grouping widget. It is a path-bound record editor over a relative object root.

It declares:

- `objectPath`,
- `childSchema` relative to object root,
- `ownerMode: inline | staged | linked`,
- `hydratePolicy`,
- `submitPolicy`,
- `validationScope`.

This makes object-field the standard runtime primitive for nested object editing.

## 8.3 Variant Field

A variant field is a discriminated union owner over one path.

It declares:

- discriminator source,
- branch schemas,
- branch activation rules,
- retention mode,
- migration rule,
- submit participation.

Variant is necessary because ordinary visible/hidden logic cannot satisfy validation, retention, and submit requirements simultaneously.

### 8.3.1 Branch Runtime Semantics

The active branch is the only branch that:

- validates by default,
- serializes by default,
- projects editable UI by default.

Inactive branches may be pruned, frozen, detached, or snapshotted depending on policy.

## 8.4 Array and Collection Structures

Arrays must support both semantic editing and rendering performance.

Each collection instance has:

- stable item identity,
- structural mutation APIs,
- optional row owner instances,
- row-local scopes,
- parent aggregation rules.

This is the general basis for input-array, loop, list, table, and repeatable object sections.

## 9. Data Sources and Remote Interaction

## 9.1 Declarative API Node

A declarative API definition compiles to a `RequestPlan`:

- method,
- endpoint template,
- param/body plans,
- scope injection plan,
- response adapter,
- host request capability key,
- cancellation key,
- retry policy,
- timeout policy.

The runtime never performs real HTTP directly. It delegates the request through a host capability.

## 9.2 Named Data Source

A named data source is a subscriber plus request lifecycle manager.

It declares:

- source name,
- published target path,
- loading path,
- error path,
- request plan,
- refresh strategy,
- lifecycle owner,
- distinct/self-write policy.

### 9.2.1 Refresh Strategies

Supported strategies:

- manual,
- mount,
- interval,
- dependency-change,
- action-triggered.

### 9.2.2 Source Lifecycle Contract

Each named source is bound to an owner or fragment lifecycle.

It must define:

- mount behavior,
- teardown behavior,
- refresh cancellation behavior,
- stale result supersession,
- self-write protection key.

## 9.3 Value Producer Ladder

To satisfy gradual complexity, runtime should treat value production as one ladder:

- literal,
- expression,
- template,
- action value,
- named source.

This lets authors scale behavior without switching conceptual systems.

## 10. Surface Runtime

The requirement for dialog/drawer management is best handled with a general `SurfaceManager`.

Each surface entry contains:

- `surfaceId`,
- `kind: dialog | drawer | future-surface-kind`,
- `ownerId`,
- `scopeId`,
- `templateRef`,
- `status: opening | active | suspended | closing`,
- `returnChannel`.

### 10.1 Surface Stack Semantics

- new surface pushes to stack top,
- only top surface processes focus and keyboard intents,
- closing top surface restores prior active surface,
- each surface has isolated scope and owner by default.

This unifies overlay behavior without hard-coding dialog-specific semantics.

## 11. Table, Loop, and Recursive Structures

## 11.1 Loop

`loop` compiles once and instantiates per item.

Each item instance gets:

- isolated or projected scope,
- `item`, `index`, optional `key`,
- stable `instanceId`,
- reusable compiled subtree.

## 11.2 Table

A table is a collection projection with row owners and row-local scopes.

Default rules:

- row scope is isolated,
- row receives `record`, `index`, and projected externals,
- row dependency invalidation is local,
- row-level component instance actions are registered per row instance.

## 11.3 Recursion

Recursive nodes reference compiled template fragments by `cid` rather than cloning schema definitions.

This satisfies recursive rendering while keeping compile-once semantics intact.

## 12. Host Integration Model

## 12.1 Capability Injection

Host injects a stable capability bundle:

- `request`
- `navigate`
- `notify`
- `errorHandler`
- `i18n`
- domain capability registries

The bundle is stored behind stable runtime references so host object identity changes do not rebuild core runtime state.

## 12.2 Domain Control Embedding

Complex controls such as designers or editors integrate through a `DomainBridge` contract.

Each domain control may expose:

- read-only snapshot projection fields,
- namespace actions,
- static type manifest for projected fields and namespace methods.

Domain private protocol remains outside schema-visible scope.

This satisfies the domain embedding requirement without polluting the general low-code data plane.

## 13. Performance Architecture

The requirement spec is unusually clear that performance is architectural, not optional.

## 13.1 Static Zero Cost

Static nodes incur no subscriptions, no expression evaluation, and no dynamic allocation beyond initial compile artifacts.

## 13.2 Selective Subscription

Dynamic consumers subscribe only to the exact normalized paths they read.

The runtime must support:

- exact path reads,
- subtree reads,
- collection aggregate reads,
- projected import reads.

## 13.3 High-Frequency Subtree Isolation

Tables, loops, and domain controls should be mounted under scope/owner isolation profiles chosen to minimize invalidation fan-out.

## 13.4 Immutable Compiled Templates

All compile outputs are immutable. Runtime only creates instances and subscription state.

## 14. Security and Safety

The requirement spec correctly forbids runtime permission logic and dynamic code generation.

The runtime therefore enforces:

- no schema-time permission evaluation at runtime,
- no global action registry bypassing scope resolution,
- no unrestricted expression host access,
- no capability access except through declared action and domain namespaces,
- no write path outside normalized scope mutation APIs.

## 15. Tooling and Diagnostics

## 15.1 Runtime Inspectability

Each runtime node must expose:

- `cid`
- `instanceId`
- `ownerId`
- `scopeId`
- resolved props/meta snapshot,
- validation snapshot,
- dependency subscriber info.

DOM output should include a stable node marker linking back to `cid` and runtime instance.

### 15.1.1 Explainability Queries

The runtime inspection API should answer:

- why a node is hidden,
- why a node is disabled,
- why a node is invalid,
- why a value changed,
- which owner controls a node,
- which dependencies invalidate a value, source, or reaction.

## 15.2 Compile-Time Diagnostics

Compiler should report:

- unknown component type,
- invalid expression path,
- invalid region name,
- unknown action capability,
- validator shape mismatch,
- unresolvable namespace reference,
- impossible owner/scope configuration,
- invalid variant or object-field contract.

## 16. Theme And Internationalization

## 16.1 Theme Compatibility

The runtime must not ship a mandatory ThemeProvider or runtime theme state layer.

Theme integration contract:

- layout nodes emit stable marker classes,
- control components expose schema-driven `className` and style props,
- host theme systems integrate through CSS variables and external selectors,
- runtime itself remains theme-agnostic.

## 16.2 Internationalization

The requirement says i18n replacement should complete in compile phase where possible.

The right model is:

- translatable literals compile to localized static values when locale is fixed at compile time,
- locale-sensitive runtime switching compiles to keyed lookup nodes only when the host explicitly requires runtime locale changes,
- i18n keys remain structurally separate from business values.

All translation keys used by the runtime should conform to one configurable prefix policy; if the platform standard is fixed, compiler diagnostics should enforce that prefix.

## 17. Canonical Execution Flow

For a mounted schema runtime:

1. parse source schema,
2. compile to immutable template graph,
3. create root owner and root scope,
4. instantiate root template,
5. evaluate dynamic value nodes on demand and subscribe implicitly,
6. render projections,
7. handle user or host intents through action algebra,
8. write scope patches and emit changed paths,
9. invalidate dependent values, sources, and reactions,
10. update owner statuses, validation, and projections,
11. dispatch delegated host capabilities when required.

## 18. Why This Design Better Fits The Requirements

This design directly resolves several tensions inside the requirements:

- tree-shaped schema but graph-shaped execution,
- lexical inheritance but row-level isolation,
- declarative expressions but safe evaluation,
- unified dependency tracking across values, sources, and reactions,
- declarative actions with real control flow semantics,
- local draft isolation without ad hoc nested form state,
- complex domain controls without leaking private protocols into general scope,
- compile-first optimization without sacrificing authoring flexibility.

It also preserves the stronger clean-slate semantics by keeping owners, guards, lenses, intents, and rules as explicit runtime primitives rather than reducing everything to component props and callbacks.

## 19. Hard Edges That Still Need Formalization

The model is now concrete enough to implement, but a production-quality version still needs formal specs for:

- expression AST and bytecode contract,
- normalized path grammar,
- patch algebra,
- validator result format,
- request adapter contract,
- component registration type manifest,
- domain bridge manifest.

These are protocol-completion tasks, not missing conceptual primitives.

## 20. Conclusion

The requirement document describes a low-code DSL runtime, but the right implementation target is a compiled semantic runtime with explicit scope, owner, action, dependency, and projection layers.

That architecture is stronger than direct schema interpretation, stronger than component-only UI frameworks, and stronger than form-library-centric low-code engines. It gives one coherent basis for forms, variant/object fields, tables, surfaces, data sources, and embedded domain controls while remaining safe, host-friendly, and compile-oriented.
