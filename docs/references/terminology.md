# Renderer And Runtime Terminology

## Purpose

This document defines the most important terms used across the active `flux` architecture documents.

Use it when a concept appears in more than one architecture file and you want the shortest shared definition.

This is a reference document.

Current behavior still belongs to the architecture docs and active source code.

## How To Use This File

- use this file for shared vocabulary
- use `docs/architecture/*.md` for behavior, rules, and ownership decisions
- use `packages/flux-core/src/index.ts` as the final type-level contract source

## Core Terms

## `CompiledValueNode`

The internal compiled value tree produced by the expression compiler.

It represents literals, expressions, templates, arrays, and objects before they are wrapped for runtime evaluation.

Current kinds include:

- `static-node`
- `expression-node`
- `template-node`
- `array-node`
- `object-node`

## `CompiledRuntimeValue`

The runtime-facing compiled value wrapper used when resolving node meta or props.

It distinguishes:

- fully static values that can be returned directly
- dynamic values that execute through runtime state and identity reuse rules

## `NodeRuntimeState`

The per-instance runtime state allocated when a `TemplateNode` is instantiated into a live `NodeInstance`.

Defined in `node-identity.ts`, it carries:

- `meta` — per-meta-key runtime value states for dynamic meta resolution
- `props` — optional runtime value state for dynamic props resolution
- `metaDependencies` / `propsDependencies` — tracked scope dependency sets for invalidation
- resolved caches (`resolvedMeta`, `resolvedProps`, `_staticPropsResult`, `_lastPropsResult`)

This type was formerly exposed as `CompiledNodeRuntimeState` via a type alias.

## `NodeMetaProgram`

The compiled meta program for a single template node.

Defined in `node-identity.ts`, it carries compiled runtime values for standard meta fields:

- `id`, `className`, `frameClassName`, `visible`, `hidden`, `disabled`, `testid`

Each field is an optional `CompiledRuntimeValue<T>` that resolves at render time. This type was formerly exposed as `CompiledSchemaMeta` via a type alias.

## `TemplateRegion`

The compiled representation of a named child fragment on a node.

Typical examples are `body`, `actions`, `header`, or renderer-specific nested content areas.

## `RenderRegionHandle`

The host-neutral rendering handle for a compiled region.

`@nop-chaos/flux-core` owns the callable contract shape. `@nop-chaos/flux-react` layers a React-specialized alias on top of it for React hosts.

It gives renderer components a stable way to render a named fragment with optional local scope overrides.

## `ResolvedNodeMeta`

The resolved render-time meta object for a node.

This carries runtime control and outer-layer meta only:

- `id`
- `className`
- `frameClassName`
- `visible`
- `hidden`
- `disabled`
- `testid`
- `changed`
- `cid`

Display text such as `label` or `title` is not part of `ResolvedNodeMeta`; it belongs to resolved `props` or slot semantics.

It is the runtime-evaluated form of compiled meta, not the raw schema.

## `RendererComponentProps`

The explicit boundary contract received by a concrete renderer component.

It includes:

- `id`
- `path`
- `schema`
- `templateNode`
- `node`
- resolved `props`
- resolved `meta`
- `regions`
- `events`
- `helpers`

## `RendererHelpers`

The stable helper object passed to renderer components.

It exposes imperative capabilities such as:

- rendering a fragment
- evaluating a target value
- creating child scope
- dispatching actions
- executing a `source`

## `RendererEventHandler`

The runtime callback shape used for declarative event fields after schema compilation and runtime adaptation.

This is not authored directly in raw schema JSON.

Schema authors provide action definitions; the runtime produces callable handlers.

## `SchemaFieldRule`

The renderer metadata entry that tells the compiler how to interpret a schema field.

In active code, field rules can classify a field as:

- `meta`
- `prop`
- `region`
- `value-or-region`
- `event`
- `ignored`

## `value-or-region`

A field semantic that allows one schema field name to behave either as:

- a normal value prop
- or a renderable child fragment

Typical use cases are fields like `title`, `label`, or `empty`.

The compiler decides which channel to use based on the raw value shape.

## `event` field

A schema field semantic for declarative actions attached to UI events.

Examples are fields like:

- `onClick`
- `onSubmit`
- `onChange`

These fields carry low-code action descriptions, not raw JavaScript callbacks.

## `ScopeRef`

The lexical runtime scope abstraction used for path lookup, shadowing, and current-scope updates.

It provides:

- path-based reads
- own-scope reads
- merged read fallback
- current-scope updates

It is the main bridge between compiled expressions and live runtime data.

## `ImportStackEntry`

A single import alias entry bound inside an `ImportFrame`.

It carries the imported namespace helper or capability reference that makes expressions like `$demo.formatName(...)` resolve at runtime.

## `ImportFrame`

A lexical import boundary frame pushed onto the `ImportStack` when a node with `xui:imports` is mounted.

It owns:

- a set of alias-to-entry bindings (`$demo` → `ImportStackEntry`)
- a parent-frame chain for nearest-frame shadowing
- a lifecycle scoped to the owning node's mount/unmount

It is distinct from `ActionScope` and `ScopeRef`. `ActionScope` carries imported capability providers for action resolution; `ImportFrame` carries alias visibility for expression helpers.

## `ImportStack`

The per-`RendererRuntime` stack of `ImportFrame` objects that manages import alias visibility and lifetime.

It provides:

- `preload(...)` — async preload of import module data before frame creation
- `installPrepared(...)` — synchronous frame creation from compiler-prepared import data
- `push(...)` / `pop(...)` — frame lifecycle during node mount/unmount
- `resolveAlias(...)` — nearest-frame alias lookup with parent-chain fallback
- `currentBindings(...)` — current alias-to-value bindings snapshot for a frame
- `dispose()` — cleanup on runtime teardown

Architecture detail lives in `docs/architecture/module-cache-and-import-stack.md`.

## `RendererRuntime`

The top-level runtime services container for one `SchemaRenderer` execution root.

It owns shared runtime infrastructure such as compile/evaluate/dispatch helpers and creates concrete runtime boundaries such as `PageRuntime`, `FormRuntime`, and `SurfaceRuntime`.

## `PageStoreApi`

The state container API for page-level data.

It owns page-scoped state such as:

- page data
- refresh ticks

Dialog / drawer stack state does not belong to `PageStoreApi` in the current architecture baseline.

That state belongs to the shared `SurfaceRuntime` / `SurfaceStore` family.

## `FormStoreApi`

The state container API for form-local data.

It owns:

- current form values
- validation errors
- validating state
- touched, dirty, and visited flags
- submitting state
- submit-attempted state

## `PageRuntime`

The runtime container for page-level behavior.

It coordinates page state, refresh flows, and page-oriented action context.

It may trigger dialog / drawer actions, but it is not the owner of dialog / drawer stack state.

That ownership belongs to the shared `SurfaceRuntime` / `SurfaceStore` family.

It is a runtime owner boundary, not the same thing as schema `type: 'page'`.

## `FormRuntime`

The runtime container for form-local behavior.

It owns:

- field value updates
- validation entry points
- submit flow
- field-state transitions
- runtime field registration for complex controls
- array operations

## `SurfaceRuntime`

The shared runtime owner for dialog/drawer/future-sheet style surface state.

It owns:

- the opened surface entry stack
- open/close behavior
- surface-family runtime coordination

It does not replace more specific owners inside a surface such as `FormRuntime`.

## `SurfaceEntry`

The runtime record for one opened surface instance inside `SurfaceRuntime`.

It includes the surface identity, kind, local scope, and render context for that one opened entry.

## `page` renderer

The schema-visible renderer type `type: 'page'`.

It is the page shell renderer used to render page regions such as `title`, `header`, `body`, and `footer`.

It commonly appears together with `PageRuntime`, but it is not itself the `PageRuntime`.

## `ValidationRule`

The schema-neutral validation rule union used by compiler and runtime.

It is the rule model that bridges schema declarations and runtime execution.

## `CompiledValidationRule`

The compiled runtime-ready validation rule record.

It adds:

- stable rule id
- dependency paths
- precompiled artifacts such as regexes

## `CompiledValidationNode`

The node-level validation graph entry used for subtree and aggregate validation reasoning.

Kinds include:

- `field`
- `object`
- `array`
- `form`

## `CompiledFormValidationModel`

The compiled form-level validation metadata bundle.

It contains field views, dependency views, and optionally node-graph views used by runtime validation.

## `ValidationContributor`

The optional renderer-side contract that explains how a renderer participates in validation.

It lets the compiler learn:

- whether the renderer is a field, container, or none
- which validation-owner boundary semantics it publishes to descendants
- how to derive its field path
- which rules it contributes
- whether descendant child paths should be compiled under a prefixed owner path

## `RuntimeFieldRegistration`

The runtime registration contract used for complex controls that cannot be modeled entirely through compile-time metadata yet.

It supplements the compiled validation model rather than replacing it.

## `ActionSchema`

The declarative low-code action description used in schema JSON.

Examples include:

- `ajax`
- `submitForm`
- `openDialog`
- `openDrawer`
- `closeSurface`
- `setValue`

## `DataSourceSchema`

A non-rendering source declaration that publishes one derived value into scope.

It supports:

- formula-backed or API-backed producers under one resource model
- `name` as the normative author-visible identity and default publication path
- `mergeToScope: true` as the only narrowed special publish extension beyond the named path
- `stopWhen` expression for conditional polling termination
- `includeScope` on its `ApiSchema` for automatic scope variable injection

## `includeScope`

An `ApiSchema` field that controls automatic scope variable injection into request data.

Values:

- `'*'` - include all scope variables
- `string[]` - include only specified keys
- `undefined` - no automatic injection

Merge rule: `finalData = { ...extractScope(includeScope), ...data }`

## `params`

An `ApiSchema` field for URL query parameters.

Unlike `data` (request body), `params` are automatically appended to the URL as a query string.

## `ApiResponse`

The host-boundary result type returned by `env.fetcher(...)`.

It is not the business-level result type consumed by action, form, or source callers.

Active runtime rule:

- `ok: true` responses continue through adaptor processing and return adapted `data`
- non-OK responses are converted into thrown errors inside request runtime
- thrown fetcher errors also propagate as thrown errors

This keeps the post-fetch runtime contract simple: success returns data, failure throws.

## `ActionContext`

The runtime context object passed through action execution.

It can carry:

- `runtime`
- `scope`
- `instancePath`
- `nodeInstance`
- `getInstanceKey`
- `interactionId`
- `signal`
- `actionScope`
- `componentRegistry`
- structured `event`
- `form`
- `page`
- `surfaceRuntime`
- `dialogId`
- `prevResult`
- `evaluationBindings`

## `prevResult`

The chained action result from the previous action in a `then` sequence.

It allows later actions to consume outputs from earlier ones without inventing ad hoc wiring.

## Related Documents

- `docs/references/maintenance-checklist.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/form-validation.md`
- `docs/references/renderer-interfaces.md`
