# NOP Chaos AMIS Core Architecture

## Purpose

This document defines the current official architecture direction for the NOP Chaos AMIS renderer core.

It replaces earlier draft-level conclusions where they conflict.

## Current Official Decisions

### Unified value semantics

All schema fields follow one rule:

- plain values are plain values
- expression syntax means expression semantics
- do not keep adding parallel fields such as `visibleOn`, `disabledOn`, or `xxxExpr` as the primary design path

Examples:

```json
{
  "visible": true,
  "disabled": false,
  "label": "Create user"
}
```

```json
{
  "visible": "${currentUser.role === 'admin'}",
  "disabled": "${saving}",
  "label": "Hello ${currentUser.name}"
}
```

Which fields allow pure expressions, templates, or only literals is constrained by schema typing, not by parallel field names.

### Whole value tree compilation

Props and schema values are compiled as one value tree.

- fully static subtrees compile to `kind: 'static'`
- dynamic subtrees compile to expression, template, array, or object nodes
- runtime should not expose a long-term public model based on `staticProps` plus `dynamicProps`

Compiler internals still need static-versus-dynamic analysis, but the public runtime model should move toward a unified compiled value tree.

### Scope chain reads over merged objects

The preferred scope access path is:

- `scope.get(path)`
- `scope.has(path)`
- `scope.readOwn()`
- `scope.read()` only for whole-object materialization with caching

The main path must not be "merge the whole scope object before every evaluation".

### `amis-formula` is modifiable

Expression execution should use a controlled evaluator based on a modifiable `amis-formula`.

- compile expressions into AST or compiled evaluators
- execute against `EvalContext`
- resolve variables through `resolve(path)` and `has(path)`
- only call `materialize()` in the small number of scenarios that truly need a complete object

`new Function(...)` and `with(scope)` are prototype-only ideas and do not belong in the production design.

### `closeDialog` default behavior

`closeDialog` should close the nearest active dialog by default.

- normal schema authors should not need to pass `dialogId`
- explicit dialog targeting should only be a rare extension path

## Architecture Layers

The system is organized into five layers:

1. `SchemaCompiler`
2. `ExpressionCompiler`
3. `RendererRuntime`
4. `Store` and `Scope`
5. `React Renderer`

```text
raw schema
  -> SchemaCompiler
compiled schema tree
  -> RendererRuntime
resolved node meta + compiled value tree + action dispatch
  -> React renderer
concrete component render
```

### `SchemaCompiler`

Responsibilities:

- normalize raw schema
- extract regions such as `body`, `actions`, and table operation fragments
- compile normal field values into `CompiledValueNode`
- bind nodes to renderer definitions

### `ExpressionCompiler`

Responsibilities:

- recognize literals, templates, pure expressions, arrays, and objects
- compile the entire value tree into an executable structure
- detect fully static subtrees
- prepare dependency metadata for caching and execution skipping

### `RendererRuntime`

Responsibilities:

- create page, form, and dialog runtime containers
- resolve node meta and runtime props
- dispatch actions
- manage debounce, cancellation, action chains, plugins, and monitor hooks

### `Store` and `Scope`

Responsibilities:

- `PageStore` manages page data, dialogs, refresh ticks, and page-level helper state
- `FormStore` manages local form values and submission flow
- `ScopeRef` provides lexical lookup and current-scope writes

### `React Renderer`

Responsibilities:

- bind compiled nodes to React components
- provide contexts and hooks
- handle fragment rendering, dialog hosting, and render monitoring

## Value Model

All schema field values compile into a single node model.

```ts
type CompiledValueNode<T = unknown> =
  | { kind: 'static'; value: T }
  | { kind: 'expression'; source: string; compiled: CompiledExpression<T> }
  | { kind: 'template'; source: string; compiled: CompiledTemplate<T> }
  | { kind: 'array'; items: CompiledValueNode[] }
  | { kind: 'object'; keys: string[]; entries: Record<string, CompiledValueNode> };
```

Execution rules:

- `static` returns the original reference directly
- `expression` evaluates through `EvalContext`
- `template` interpolates through `EvalContext`
- `array` and `object` evaluate recursively and reuse references when unchanged

### Static fast path

If a subtree contains no expression:

- compilation must produce `kind: 'static'`
- runtime must return the original reference directly
- runtime must not recurse through a dynamic evaluator for that subtree

### Dynamic identity reuse

If a subtree contains expressions:

- retain previous results per dynamic node
- if the next result is equal, reuse the previous reference
- object and array nodes should preserve unchanged child references whenever possible

## EvalContext and Expression Execution

Official execution context:

```ts
interface EvalContext {
  resolve(path: string): unknown;
  has(path: string): boolean;
  materialize(): Record<string, any>;
}
```

Rules:

- variable and property access should go through the resolver
- do not rely on direct access over a prebuilt scope object
- `materialize()` is lazy, cached, and only used when full object enumeration is required

## Scope Design

Target direction:

```ts
interface ScopeRef {
  id: string;
  path: string;
  parent?: ScopeRef;
  get(path: string): unknown;
  has(path: string): boolean;
  readOwn(): Record<string, any>;
  read(): Record<string, any>;
  update(path: string, value: unknown): void;
}
```

Lookup rules for `scope.get('record.name')`:

1. check whether the current scope owns top-level key `record`
2. if yes, continue inside that object
3. if not, climb to the parent scope
4. once a scope level owns the top-level key, stop climbing

This preserves lexical shadowing behavior.

Write rules:

- `update()` writes to the current scope by default
- form field writes go to `FormStore`
- page-level writes go to `PageStore`
- do not silently write back to parent scopes

## Compiled Schema Nodes

Directionally, render nodes should carry a single compiled props value tree.

```ts
interface CompiledSchemaNode {
  id: string;
  type: string;
  path: string;
  schema: BaseSchema;
  props: CompiledValueNode<Record<string, unknown>>;
  regions: Record<string, CompiledRegion>;
  component: RendererDefinition;
  flags: {
    isStatic: boolean;
    isContainer: boolean;
  };
}
```

`flags.isStatic` means the node has no dynamic props execution cost.

## Action and Runtime Direction

Minimum action set:

- `setValue`
- `ajax`
- `submitForm`
- `dialog`
- `closeDialog`
- `refreshTable`

Required action behavior:

- `then`
- `continueOnError`
- debounce
- request cancellation
- plugin interception

API objects should support:

- `url`
- `method`
- `data`
- `headers`
- `requestAdaptor`
- `responseAdaptor`
- `dataPath`

## React Rendering Direction

The React layer follows one stable rule:

- explicit props at root boundaries
- hooks and split context inside the tree
- explicit `render(...)` or `regions.render()` for local schema fragments

Root inputs typically include:

- `schema`
- `data`
- `env`
- `registry`
- `plugins`

Internal hooks include:

- `useRendererRuntime()`
- `useRenderScope()`
- `useScopeSelector()`
- `useCurrentForm()`
- `useCurrentPage()`
- `useActionDispatcher()`

## Store Model

### `PageStore`

Owns:

- page data
- dialog instances
- refresh tokens
- page-level action and monitor helper state

### `FormStore`

Owns:

- form values
- `submit(api)`
- `setValue(name, value)`
- `reset(values)`

The core architecture does not hard-code a specific external form library.

## Observability

The formal monitor hook direction includes:

- `onRenderStart`
- `onRenderEnd`
- `onActionStart`
- `onActionEnd`
- `onApiRequest`
- `onError`

Coverage should include render lifecycle, action lifecycle, debounce replacement, request cancellation, and adaptor execution.

## Performance Principles

Priority order:

1. avoid merged-object construction in hot paths
2. make `read()` a cached materialization fallback instead of the main path
3. preserve static fast path and identity reuse for compiled value trees
4. apply debounce and cancellation to action and request chains

Key optimization targets:

| Target | Direction |
| --- | --- |
| static schema execution | identify `static` nodes at compile time and return original references |
| dynamic object reuse | use child unchanged information and shallow equality to reuse references |
| scope access | prefer `scope.get(path)` |
| expression evaluation | resolver-driven `EvalContext.resolve(path)` |
| high-frequency requests | debounce plus `AbortController` |
| rerender control | selector subscriptions plus stable runtime helpers |

## Extensions

Stable extension points include:

- `beforeCompile`
- `afterCompile`
- `beforeAction`
- `onError`
- `wrapComponent`

These are used to rewrite schema, modify compiled nodes, intercept actions, wrap components, and emit observability data.

## Designs No Longer Preferred

The following are no longer preferred as the main architecture path:

- prototype-chain objects used directly as the expression execution context
- always materializing and merging a full scope object before evaluation
- a parallel field system centered on `visibleOn` and `disabledOn`
- a long-term external runtime model built around `staticProps` plus `dynamicProps`
- `new Function` plus `with(scope)` execution
- hard-wiring a specific form or validation library into the core

## Related Documents

- Runtime and React contracts: `docs/architecture/renderer-runtime.md`
- Workspace baseline: `docs/architecture/frontend-baseline.md`
- Development phases: `docs/plans/development-plan.md`
- Example schema: `docs/examples/user-management-schema.md`
