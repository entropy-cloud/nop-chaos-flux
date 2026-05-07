# Renderer Interface Reference

## Purpose

This document is a human-readable interface map for the active renderer system.

Use it to understand the roles of the major contracts without reading every source file in full.

This is a reference document, not the architecture source of truth.

Code-level source of truth lives primarily in `packages/flux-core/src/index.ts`.

## Core Schema Types

Key shapes:

- `SchemaValue`
- `SchemaObject`
- `BaseSchema`
- `SchemaInput`
- `ApiSchema`
- `DataSourceSchema`

Role summary:

- `BaseSchema` is the common schema base for renderers
- `BaseSchema.frameWrap` is the per-instance FieldFrame override for wrap-compatible renderers
- `SchemaInput` allows one schema node or an array of nodes
- `ApiSchema` describes request configuration, adaptors, scope injection, and query params
- `DataSourceSchema` describes declarative data fetching with optional polling

## Runtime Environment

Key contracts:

- `RendererEnv`
- `RendererMonitor`
- `ApiFetcher`

Role summary:

- `fetcher` handles request transport
- `fetcher` returns `ApiResponse` only at the host boundary; runtime consumers should see successful data or a thrown error, not a non-OK response object
- `notify` handles user-facing messages
- optional navigation, confirmation, functions, and filters extend the runtime environment
- monitor hooks expose render, action, API, and error observability

## Scope And Store Contracts

Key contracts:

- `ScopeRef`
- `ScopeStore`
- `PageStoreApi`
- `FormStoreApi`

Role summary:

- `ScopeRef` owns lexical lookup and current-scope updates
- `ScopeStore` is the snapshot store abstraction behind scopes
- `PageStoreApi` owns page data and refresh ticks
- `FormStoreApi` owns form-local values and validation state

## Expression Contracts

Key contracts:

- `FormulaCompiler`
- `ExpressionCompiler`
- `CompiledExpression`
- `CompiledTemplate`
- `CompiledValueNode`
- `CompiledRuntimeValue`
- `RuntimeValueState`

Important semantics:

- compile once, execute many times
- preserve static fast path
- preserve identity reuse when evaluated values do not change
- keep expression execution pluggable through the compiler abstraction

## Compiled Schema Contracts

Key contracts:

- `TemplateNode`
- `TemplateRegion`
- `NodeMetaProgram`
- `NodeRuntimeState`
- `SchemaCompiler`

Role summary:

- `TemplateNode` is the immutable compiled node model produced by `SchemaCompiler`, consumed by runtime and React rendering
- `TemplateRegion` describes child renderable fragments within a template
- `SchemaCompiler` transforms raw schema directly into `TemplateNode` (and `CompiledTemplate` graphs)

Important current note:

- compiled template nodes also carry event metadata, optional compiled validation metadata, scope plans, and provider plans

## Renderer Definition Contracts

Key contracts:

- `RendererDefinition`
- `RendererRegistry`
- `SchemaFieldRule`
- `ScopePolicy`
- `RendererPropContract`
- `RendererEventContract`
- `RendererCapabilityContract`
- `ResolvedAuthoringContract`

Role summary:

- `RendererDefinition` is the unified static discovery entry for one renderer `type`; it binds runtime component registration, policy metadata, ordinary renderer authoring metadata, and optional host-boundary metadata without flattening them into one universal envelope
- `RendererRegistry` is the lookup table for renderer definitions
- field rules tell the compiler whether a field is `meta`, `prop`, `region`, `value-or-region`, `event`, or `ignored`

### Unified `RendererDefinition` Field Map

Stable field groups:

- Runtime registration: `type`, `component`, `fields`, `scopePolicy`, `actionScopePolicy`, `componentRegistryPolicy`, `wrap`, `schemaValidator`, `validation`, `staticCapable`
- Discovery metadata: `displayName`, `icon`, `category`, `sourcePackage`, `defaultSchema`
- Renderer classification: `rendererClass`, `rendererTraits`, `injectedLocals`
- Ordinary renderer authoring contracts: `propContracts`, `eventContracts`, `componentCapabilityContracts`, `scopeExportContracts`
- Authoring adaptation: `propSchema`, `authoringTransform`
- Host-only contract: `hostContract`

Classification baseline:

- `instance-renderer`: no new Flux semantic owner boundary, no `hostContract`
- `flux-owner-renderer`: owns Flux-native semantic or interaction state, may publish scope exports and component capabilities, but still no `hostContract`
- `domain-host-renderer`: host/domain boundary publisher; this is the only class that should define `hostContract`

Representative mapping:

- `button` -> `instance-renderer`
- `form` -> `flux-owner-renderer` + `semantic-owner`
- `crud` -> `flux-owner-renderer` + `composite`
- `designer-page` -> `domain-host-renderer` + `workbench-shell`

### Static Contract Responsibilities

`propContracts`

- Responsibility: author-editable schema field metadata for one renderer type
- Consumers: inspector/editor tooling, autocomplete, authoring adapters, diagnostics closed-prop checks
- Contract language: uses `FluxValueShape` as the shared structural IR
- Important boundary: this is not the same thing as runtime `RendererComponentProps['props']`

`eventContracts`

- Responsibility: author-declarable event entry points such as `onClick` or `submitAction`
- Consumers: action authoring UI, event autocomplete, docs/examples
- Runtime relationship: event handlers still resolve to `props.events` at render time; this field only describes the authored event surface

`componentCapabilityContracts`

- Responsibility: static metadata for instance-targeted `component:<method>` calls
- Consumers: action authoring tooling, diagnostics/docs, inspector affordances
- Runtime relationship: methods resolve through `ComponentHandleRegistry`, not through `ActionScope`
- Shared contract language: methods reuse the same `CapabilityMethodContract` language as host manifest methods, but not the same envelope

`scopeExportContracts`

- Responsibility: narrow readonly Flux-native exports such as `$form`, `$crud`, or owner summaries
- Consumers: tooling, docs, diagnostics fixtures, future autocomplete
- Runtime relationship: describes readonly Flux-owned scope publications; it does not create host projection and does not replace runtime store ownership
- Important boundary: this is not a host manifest and not a substitute for `hostContract.projection`

`hostContract`

- Responsibility: host/domain manifest publication entry with family, default version, manifest resolver, and capability publication attribution
- Consumers: compiler host-contract validation, host-aware tooling, workbench documentation
- Runtime relationship: host capability lookup still resolves through `ActionScope`; `hostContract` only describes the host boundary statically
- Important boundary: `hostContract` is host-only and should exist only on `domain-host-renderer`

### Authoring Surface Versus Runtime Surface

Important distinction:

- `editableProps` in `ResolvedAuthoringContract` is the tooling-facing adapter over `RendererDefinition.propContracts`
- runtime `props` in `RendererComponentProps` is the resolved render-time value object after expression evaluation, defaults, and runtime resolution
- the two surfaces are related but not identical, and tooling must not treat runtime `props` as the authored schema contract

Current adapter baseline:

- `ResolvedAuthoringContract.rendererClass` comes from `RendererDefinition.rendererClass`
- `ResolvedAuthoringContract.editableProps` comes from `RendererDefinition.propContracts`
- `ResolvedAuthoringContract.events` comes from `RendererDefinition.eventContracts`
- `ResolvedAuthoringContract.componentCapabilityContracts` comes from `RendererDefinition.componentCapabilityContracts`
- `ResolvedAuthoringContract.scopeExports` comes from `RendererDefinition.scopeExportContracts`
- `ResolvedAuthoringContract.hostProjection` and `hostActions` are present only when `RendererDefinition.hostContract` resolves a manifest

## Render-Time React Contracts

Key contracts:

- `RendererComponentProps`
- `RendererHelpers`
- `RendererEventHandler`
- `RenderRegionHandle`
- `RenderFragmentOptions`
- `RenderNodeInput`
- `ComponentHandle`

Role summary:

- `RendererComponentProps` is the concrete renderer boundary
- `RendererHelpers` exposes stable runtime helpers such as `render`, `evaluate`, `createScope`, `dispatch`, and `executeSource`
- `RendererEventHandler` is the runtime callback shape used for declarative event fields
- `RenderRegionHandle` gives components an easy way to render declared child regions
- `ComponentHandle` may optionally expose `ref?: HTMLElement | null` alongside explicit imperative capabilities

Current typing baseline:

- `RendererComponentProps<S, P>` lets a renderer declare both its authored schema shape `S` and its resolved runtime prop bag `P`.
- `RendererResolvedProps<S>` defaults to `Record<string, any> & Partial<S>` so runtime prop bags stay honest for low-code dynamic fields without forcing every schema-only field into `props`.
- `RendererDefinition.component`, `RendererHelpers.render`, and `RenderRegionHandle.render` share a host-neutral render-result alias in `flux-core`; React element typing stays in `@nop-chaos/flux-react` aliases rather than flowing back into core.

## Runtime Family Contracts

Key contracts:

- `RendererRuntime`
- `FormRuntime`
- `PageRuntime`
- `SurfaceRuntime`
- `SurfaceEntry`

Role summary:

- `RendererRuntime` is the root runtime services container for one schema execution root
- `FormRuntime` owns form-local validation, submission, and value updates
- `PageRuntime` owns page-level scope and page shell behavior such as refresh
- `SurfaceRuntime` owns the shared dialog/drawer/sheet-style surface stack and open/close behavior
- `SurfaceEntry` records one opened surface instance including its scope and render context

## Validation Contracts

Key contracts:

- `ValidationRule`
- `ValidationError`
- `ValidationResult`
- `FormValidationResult`
- `CompiledFormValidationModel`
- `CompiledValidationNode`
- `ValidationContributor`
- `RuntimeFieldRegistration`

Role summary:

- `ValidationRule` is the schema-neutral rule union used by compiler and runtime
- `ValidationError` is the structured error format used by the runtime
- `CompiledFormValidationModel` holds field, node, order, behavior, and dependency information
- `ValidationContributor` lets renderer definitions describe validation participation
- `RuntimeFieldRegistration` supports complex controls that still need runtime participation

## Action Contracts

Key contracts:

- `ActionSchema`
- `ActionContext`
- `ActionResult`

Role summary:

- `ActionSchema` is the declarative low-code action format
- `ActionContext` carries runtime, scope, form, page, surface, node, structured `event`, and `prevResult` context
- `ActionResult` is the normalized runtime result of an action

Current action system supports directionally:

- `setValue`
- `ajax`
- `submitForm`
- `openDialog`
- `openDrawer`
- `closeSurface`
- `refreshTable`
- chaining through `then`
- debounce and request cancellation
- plugin interception

## Plugin Contracts

Key contract:

- `RendererPlugin`

Expected extension points:

- `beforeCompile`
- `afterCompile`
- `wrapComponent`
- `beforeAction`
- `onError`

## Root Entry Contract

Key contract:

- `SchemaRendererProps`

Boundary inputs remain explicit:

- `schema`
- `schemaUrl`
- `data`
- `env`
- `formulaCompiler`
- optional `registry`, `plugins`, `pageStore`, `surfaceRuntime`, `moduleCache`, `parentScope`, `actionScope`, `componentRegistry`, `strictValidation`, `onRuntimeChange`, `onComponentRegistryChange`, `onActionScopeChange`, and `onActionError`

## Recommended Reading Path

For deeper design intent, continue with:

- `docs/references/maintenance-checklist.md`
- `docs/references/terminology.md`
- `docs/references/runtime-and-renderer-faq.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/form-validation.md`

For historical draft material, see `docs/archive/nop-chaos-amis-renderer-interfaces.ts`.
