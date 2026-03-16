# Renderer Interface Reference

## Purpose

This document is a human-readable interface map for the renderer system.

Use it to understand the roles of the major contracts without reading the full legacy draft file.

Code-level source of truth lives in the current package exports, especially `packages/amis-schema/src/index.ts`.

## Core Schema Types

Key shapes:

- `SchemaValue`
- `SchemaObject`
- `BaseSchema`
- `SchemaInput`
- `ApiObject`

Role summary:

- `BaseSchema` is the common renderer schema base
- `SchemaInput` allows a single schema node or an array of nodes
- `ApiObject` describes request configuration and adaptors

## Runtime Environment

Key contracts:

- `RendererEnv`
- `RendererMonitor`
- `ApiFetcher`

Expected responsibilities:

- transport requests through `fetcher`
- expose user feedback through `notify`
- optionally provide navigation and confirmation
- optionally emit render, action, API, and error monitoring events

## Scope and Store Contracts

Key contracts:

- `ScopeRef`
- `ScopeStore`
- `PageStoreApi`
- `FormStoreApi`

Directionally important notes:

- current implementation already exposes a scope abstraction
- long-term convergence should emphasize `get`, `has`, and `readOwn`
- page and form stores should stay separated

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

## Renderer Definition Contracts

Key contracts:

- `RendererDefinition`
- `RendererRegistry`
- `SchemaFieldRule`
- `ScopePolicy`

Role summary:

- `RendererDefinition` binds a schema type to a concrete renderer component and policy metadata
- `RendererRegistry` is the lookup table for renderer definitions
- field rules tell the compiler whether a field is metadata, prop, region, or ignored

## Render-Time React Contracts

Key contracts:

- `RendererComponentProps`
- `RendererHelpers`
- `RenderRegionHandle`
- `RenderFragmentOptions`
- `RenderNodeInput`

Role summary:

- `RendererComponentProps` is the concrete renderer boundary
- `RendererHelpers` exposes stable runtime helpers such as `render`, `evaluate`, `createScope`, and `dispatch`
- `RenderRegionHandle` gives components an easy way to render declared child regions

## Form, Page, and Dialog Contracts

Key contracts:

- `FormRuntime`
- `PageRuntime`
- `DialogInstance`

Role summary:

- `FormRuntime` owns form-local submission and field updates
- `PageRuntime` owns page-level behavior such as dialog orchestration
- `DialogInstance` records the schema and scope for an open dialog

## Action Contracts

Key contracts:

- `ActionSchema`
- `ActionContext`
- `ActionResult`

Supported action system direction:

- common actions such as `setValue`, `ajax`, `submitForm`, `dialog`, `closeDialog`, and `refreshTable`
- chaining through `then`
- debounce and request cancellation
- plugin interception through runtime hooks

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

- `docs/architecture/amis-core.md`
- `docs/architecture/renderer-runtime.md`

For the original interface draft source, see `docs/archive/nop-chaos-amis-renderer-interfaces.ts`.
