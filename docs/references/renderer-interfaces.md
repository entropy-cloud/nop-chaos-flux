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
- `ApiObject`
- `DataSourceSchema`

Role summary:

- `BaseSchema` is the common schema base for renderers
- `SchemaInput` allows one schema node or an array of nodes
- `ApiObject` describes request configuration, adaptors, scope injection, and query params
- `DataSourceSchema` describes declarative data fetching with optional polling

## Runtime Environment

Key contracts:

- `RendererEnv`
- `RendererMonitor`
- `ApiFetcher`

Role summary:

- `fetcher` handles request transport
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
- `PageStoreApi` owns page data, dialogs, and refresh ticks
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

- `CompiledSchemaNode`
- `CompiledRegion`
- `CompiledSchemaMeta`
- `CompiledNodeRuntimeState`
- `SchemaCompiler`

Role summary:

- `CompiledSchemaNode` is the executable node model used by runtime and React rendering
- `CompiledRegion` describes child renderable fragments
- `SchemaCompiler` transforms raw schema into stable executable nodes

Important current note:

- compiled nodes also carry event metadata and optional compiled validation metadata

## Renderer Definition Contracts

Key contracts:

- `RendererDefinition`
- `RendererRegistry`
- `SchemaFieldRule`
- `ScopePolicy`

Role summary:

- `RendererDefinition` binds a schema type to a concrete renderer component and policy metadata
- `RendererRegistry` is the lookup table for renderer definitions
- field rules tell the compiler whether a field is `meta`, `prop`, `region`, `value-or-region`, `event`, or `ignored`

## Render-Time React Contracts

Key contracts:

- `RendererComponentProps`
- `RendererHelpers`
- `RendererEventHandler`
- `RenderRegionHandle`
- `RenderFragmentOptions`
- `RenderNodeInput`

Role summary:

- `RendererComponentProps` is the concrete renderer boundary
- `RendererHelpers` exposes stable runtime helpers such as `render`, `evaluate`, `createScope`, and `dispatch`
- `RendererEventHandler` is the runtime callback shape used for declarative event fields
- `RenderRegionHandle` gives components an easy way to render declared child regions

## Form, Page, And Dialog Contracts

Key contracts:

- `FormRuntime`
- `PageRuntime`
- `DialogState`

Role summary:

- `FormRuntime` owns form-local validation, submission, and value updates
- `PageRuntime` owns page-level behavior such as dialog orchestration
- `DialogState` records the dialog config, scope, and compiled title/body fragments for an open dialog

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
- `ActionContext` carries runtime, scope, form, page, node, dialog, and `prevResult` context
- `ActionResult` is the normalized runtime result of an action

Current action system supports directionally:

- `setValue`
- `ajax`
- `submitForm`
- `dialog`
- `closeDialog`
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
- `data`
- `env`
- `formulaCompiler`
- optional `registry`, `plugins`, `pageStore`, `parentScope`, and `onActionError`

## Recommended Reading Path

For deeper design intent, continue with:

- `docs/references/maintenance-checklist.md`
- `docs/references/terminology.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/form-validation.md`

For historical draft material, see `docs/archive/nop-chaos-amis-renderer-interfaces.ts`.

