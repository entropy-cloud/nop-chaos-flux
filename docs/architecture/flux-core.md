# NOP Chaos Flux Core Architecture

## Purpose

This document records the current architecture baseline for the active `nop-chaos-flux` codebase.

Use it when you need the highest-level answer to:

- how schema values are compiled and evaluated
- how runtime, scope, forms, pages, and actions fit together
- which design directions are current behavior versus future refinement

Code-level source of truth lives primarily in `packages/flux-core/src/index.ts`, `packages/flux-runtime/src/index.ts`, and `packages/flux-react/src/index.tsx`.

## Package Role: `@nop-chaos/flux-core`

flux-core is the **foundation contracts and shared utilities** package — the lowest-level shared layer that all other packages depend on. It contains:

- **Type definitions and interfaces**: Core contracts (`ScopeRef`, `FormRuntime`, `RendererRuntime`, `CompiledValueNode`, etc.) that define the boundaries between packages.
- **Constants**: Shared constants like `META_FIELDS`.
- **Side-effect-free pure utility functions**: Functions that have no external dependencies and no side effects — e.g. `getIn`, `isPlainObject`, `shallowEqual`, `buildCompiledFormValidationModel`. These are shared across all packages because they operate on language-level primitives, not business logic.
- **Validation model data transforms**: Pure functions for validation model construction (`buildCompiledFormValidationModel`, `buildCompiledValidationOrder`, etc.) that are needed by both `flux-formula` and `flux-runtime`.

**What does NOT belong in flux-core**: Business logic with side effects, framework-specific code (React/Zustand), or any function that depends on external state. The dependency direction is strictly `flux-core ← all other packages`.

 ## flux-core Package


When this document needs to be checked against code, start with:

- `packages/flux-core/src/index.ts` for core contracts and shared utilities
- `packages/flux-runtime/src/schema-compiler.ts` for compiled node assembly
- `packages/flux-runtime/src/action-runtime.ts` for action semantics
- `packages/flux-runtime/src/page-runtime.ts` and `packages/flux-runtime/src/form-runtime.ts` for page/form runtime behavior
- `packages/flux-react/src/index.tsx` for React integration boundaries

## Current Architecture Baseline

### Unified value semantics

All schema fields follow one primary rule:

- plain values stay plain values
- expression syntax means expression semantics
- do not introduce parallel suffix-based field families such as `xxxExpr` or `xxxOn` as the default design path

Which fields allow literals, templates, pure expressions, events, or renderable fragments is determined by schema typing plus renderer field metadata, not by proliferating alternate field names.

### Whole value-tree compilation

Schema values compile as one value tree.

In current code that means two related layers:

- `CompiledValueNode` is the internal node tree used by the expression compiler
- `CompiledRuntimeValue` is the runtime-facing wrapper used for fast static return or dynamic execution

Current `CompiledValueNode` kinds are:

```ts
type CompiledValueNode<T = unknown> =
  | { kind: 'static-node'; value: T }
  | { kind: 'expression-node'; source: string; compiled: CompiledExpression<T> }
  | { kind: 'template-node'; source: string; compiled: CompiledTemplate<T> }
  | { kind: 'array-node'; items: ReadonlyArray<CompiledValueNode<unknown>> }
  | { kind: 'object-node'; keys: readonly string[]; entries: Readonly<Record<string, CompiledValueNode<unknown>>> };
```

Current runtime wrapper shape is directionally:

```ts
type CompiledRuntimeValue<T = unknown> =
  | { kind: 'static'; isStatic: true; value: T }
  | { kind: 'dynamic'; isStatic: false; exec(...): ValueEvaluationResult<T> };
```

The long-term architectural intent still matches the original goal:

- static subtrees should stay zero-cost at runtime
- dynamic subtrees should preserve identity reuse when results do not change
- runtime should not expose a long-term external model centered on `staticProps` plus `dynamicProps`

### Scope chain reads over merged objects

The preferred hot path is:

- `scope.get(path)`
- `scope.has(path)`
- `scope.readOwn()`
- `scope.read()` only when whole-object materialization is truly needed

Current implementation keeps `read()` as a cached merged-object fallback, but the main design path is lexical path lookup rather than rebuilding a full scope object for every evaluation.

### `flux-formula` is the expression base

Expression execution is built on `flux-formula` through `FormulaCompiler` and `ExpressionCompiler`.

Current implementation detail:

- `flux-formula` currently wraps `amis-formula` for parsing and evaluation.
- This is an intentional adapter boundary, not a leak of AMIS runtime concerns into the rest of the workspace.
- Direct `amis-formula` imports should stay confined to `@nop-chaos/flux-formula`; other packages depend only on Flux contracts such as `FormulaCompiler`, `ExpressionCompiler`, and `EvalContext`.
- Replacing `amis-formula` is a future option only if expression semantics need to diverge materially or the dependency becomes a maintenance burden.

The production direction is:

- compile expressions and templates once
- execute against `EvalContext`
- resolve variables through `resolve(path)` and `has(path)`
- avoid prototype `new Function(...)` and `with(scope)` execution

### `closeDialog` default behavior

`closeDialog` closes the nearest active dialog by default.

- normal schema authors should not need to pass `dialogId`
- explicit dialog targeting exists as a narrow extension path

Current runtime behavior matches this through the page dialog stack.

## Main Layers

The active system is organized into five layers:

1. `SchemaCompiler`
2. `ExpressionCompiler`
3. `RendererRuntime`
4. `Store` and `Scope`
5. React renderer and hooks

```text
raw schema
  -> SchemaCompiler
compiled schema node tree
  -> RendererRuntime
resolved node meta + resolved props + action dispatch + page/form runtimes
  -> React renderer
concrete component render
```

## Layer Responsibilities

### `SchemaCompiler`

Owns:

- raw schema normalization
- region extraction such as `body`, `actions`, and renderer-owned nested regions
- field classification through renderer field metadata
- compiled props, meta, event, and validation assembly

### `ExpressionCompiler`

Owns:

- literal, expression, template, array, and object recognition
- value-tree compilation
- static versus dynamic classification
- runtime state creation for dynamic execution and identity reuse

### `RendererRuntime`

Owns:

- node meta and prop resolution
- layered action dispatch
- page runtime creation
- form runtime creation
- child-scope creation

Current action dispatch now resolves through three explicit paths in order:

1. built-in platform actions such as `setValue`, `ajax`, `dialog`, `closeDialog`, `refreshTable`, and `submitForm`
2. component-targeted actions matching `component:<method>` pattern through `ComponentHandleRegistry`
3. namespaced actions such as `designer:export` through `ActionScope`

This keeps data scope, namespaced behavior lookup, and instance-targeted capability invocation separate even though all three are available from the same runtime host tree.

### `Store` and `Scope`

Own:

- `PageStoreApi` for page data, dialogs, and refresh ticks
- `FormStoreApi` for values, errors, validating state, touched state, dirty state, visited state, and submitting state
- `ScopeRef` for lexical lookup, shadowing, and current-scope updates

The active runtime now also exposes two non-data runtime registries:

- `ActionScope` for namespaced non-built-in action providers; treat it as capability lexical scope, not a global registry
- `ComponentHandleRegistry` for explicit component-handle registration and lookup by `componentId` or `componentName`

These are intentionally not folded into `ScopeRef`.

Current design direction also treats `data-source` / `reaction` ownership as scope-scoped runtime state, but still not as part of the `ScopeRef` behavior surface:

- `ScopeRef` stays the pure data lookup and update contract
- source/reaction registration should live in runtime-owned sidecar registries keyed by `ScopeRef.id`
- this keeps source/reaction lifecycle aligned with lexical data scopes without turning `ScopeRef` into a mixed data-plus-behavior abstraction
- a practical first implementation is `RendererRuntime`-owned `scopeEntries: Map<scopeId, Map<entryId, Entry>>`

Detailed `ActionScope` resolution, `xui:import`, collision, and lifecycle semantics live in `docs/architecture/action-scope-and-imports.md`.

### React renderer

Owns:

- runtime and scope context wiring
- fragment rendering
- dialog hosting
- selector-based subscriptions and renderer hooks

## Current Value And Node Model

### `EvalContext`

Current execution context:

```ts
interface EvalContext {
  resolve(path: string): unknown;
  has(path: string): boolean;
  materialize(): Record<string, any>;
  collector?: ScopeDependencyCollector;
}
```

Rules:

- variable access should go through `resolve(path)`
- `materialize()` exists for the minority case that needs a complete object view
- when dynamic values are evaluated on the tracked path, runtime may attach a dependency collector so each successful run refreshes the actual path set it read

### `ScopeRef`

Current exported contract:

```ts
interface ScopeChange {
  paths: readonly string[];
  sourceScopeId?: string;
  kind?: 'update' | 'merge' | 'replace';
}

interface ScopeStore<T = Record<string, any>> {
  getSnapshot(): T;
  getLastChange(): ScopeChange | undefined;
  setSnapshot(next: T, change?: ScopeChange): void;
  subscribe(listener: (change: ScopeChange) => void): () => void;
}

interface ScopeRef {
  id: string;
  path: string;
  parent?: ScopeRef;
  store?: ScopeStore;
  value: Record<string, any>;
  get(path: string): unknown;
  has(path: string): boolean;
  readOwn(): Record<string, any>;
  read(): Record<string, any>;
  update(path: string, value: unknown): void;
}
```

Current invalidation baseline:

- scope writes report changed paths through `ScopeChange`
- `update(path, value)` reports the exact path it wrote
- `merge(data)` reports changed top-level keys and can conservatively fall back to `['*']` when enumeration is not trustworthy
- composite child scopes preserve the original `sourceScopeId` when parent changes flow through

Lookup preserves lexical shadowing:

1. check whether the current scope owns the top-level key
2. if yes, continue lookup inside that owned object
3. otherwise climb to the parent scope

### `CompiledSchemaNode`

Current exported node contract is directionally:

```ts
interface CompiledSchemaNode<S extends BaseSchema = BaseSchema> {
  id: string;
  type: S['type'];
  path: string;
  schema: S;
  component: RendererDefinition<S>;
  meta: CompiledSchemaMeta;
  props: CompiledRuntimeValue<Record<string, unknown>>;
  validation?: CompiledFormValidationModel;
  regions: Readonly<Record<string, CompiledRegion>>;
  eventActions: Readonly<Record<string, unknown>>;
  eventKeys: readonly string[];
  flags: CompiledNodeFlags;
  createRuntimeState(): CompiledNodeRuntimeState;
}
```

Important note:

- current compiled nodes carry resolved event metadata and validation metadata in addition to props and regions
- `props` is a compiled runtime value, not a raw plain object

## Action Baseline

Current action system supports at least:

- `setValue`
- `ajax`
- `submitForm`
- `dialog`
- `closeDialog`
- `refreshTable`

Current behavior includes:

- `then`
- `continueOnError`
- debounce
- request cancellation
- plugin interception
- `prevResult` propagation across chained actions

## React Rendering Baseline

The React side follows one stable rule:

- boundary inputs stay explicit
- shared runtime services come from hooks and contexts
- local fragment rendering uses `RenderRegionHandle` or `helpers.render(...)`

Important current hooks include:

- `useRendererRuntime()`
- `useRenderScope()`
- `useScopeSelector()`
- `useOwnScopeSelector()`
- `useCurrentForm()`
- `useCurrentPage()`
- `useActionDispatcher()`
- `useCurrentNodeMeta()`
- `useRenderFragment()`

Current scope selector semantics:

- `useScopeSelector()` reads and subscribes against the lexical-scope-visible snapshot.
- `useOwnScopeSelector()` reads and subscribes against the current scope's own snapshot only.
- `readOwn()` stays narrowly defined as "current layer only" and should not be overloaded with parent-chain data.

Current env-handling baseline:

- `env` remains the host integration boundary for fetch/notify/navigation/import hooks.
- runtime internals read the latest env via a stable getter instead of assuming the first `env` object identity is permanent.
- React hosts should still treat `env` as semantically stable, but accidental wrapper re-creation no longer implies runtime teardown.

## Performance Principles

Priority order:

1. preserve static fast path
2. preserve dynamic identity reuse
3. avoid merged-object construction in hot paths
4. keep selector subscriptions narrow
5. apply debounce and cancellation to high-frequency actions and async validation

## What Is Current Versus Future

### Current implementation

- `value-or-region` and `event` field kinds already exist in active code
- dialog state is represented by `DialogState`
- form runtime already supports validation state and first-class array operations
- subtree validation already has graph-aware entry points

### Future or still-evolving areas

- richer validation normalization phases
- more compiler-described composite validation in place of runtime registration
- further reduction of duplicated validation projections where it can be done safely

Those topics should be described as design direction, not as already-finalized public behavior.

## Designs No Longer Preferred

- prototype-chain objects used directly as the expression execution context
- always materializing and merging a full scope object before evaluation
- suffix-based parallel field systems such as `xxxExpr`
- a long-term external runtime model built around `staticProps` plus `dynamicProps`
- `new Function` plus `with(scope)` expression execution
- hard-wiring a specific form or validation library into the core

## Related Documents

- `docs/references/terminology.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/references/renderer-interfaces.md`
