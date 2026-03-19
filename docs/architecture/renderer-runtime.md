# Renderer Runtime Design

## Purpose

This document defines the internal renderer, runtime, and React integration shape used to implement the architecture in `docs/architecture/amis-core.md`.

Use this document when changing component contracts, hooks, regions, scope flow, or rendering performance behavior.

## Main Design Rule

The core rule is:

`boundary inputs stay explicit; ambient runtime capabilities come from hooks; local fragment rendering uses explicit render handles.`

This choice exists to keep the renderer ergonomic, testable, and performant under deeply nested schema trees.

## Design Principles

### Explicit at boundaries, implicit in the middle

- root boundaries use explicit props
- internal nodes avoid long prop-drilling chains
- shared runtime services are exposed through split contexts and hooks

### Selective data access

Components that only need one value should not rerender for unrelated page changes.

Prefer selector-style reads over broad scope reads.

### Sub-schema rendering must stay easy

If rendering a nested fragment is harder than bypassing the renderer, low-code authoring will drift back to handwritten JSX.

### Runtime services must be reference-stable

Helpers such as `evaluate`, `dispatch`, `render`, and `createScope` should remain stable references.

### Compile once, execute many times

Schema compilation should happen once per schema identity or version, while rendering mostly executes compiled plans.

### Static fast path and identity reuse are mandatory

- no expression means zero execution cost and original reference return
- unchanged dynamic results should reuse previous references whenever possible

## Recommended Internal Shape

The renderer is split into five internal layers:

1. `SchemaCompiler`
2. `RendererRegistry`
3. `RendererRuntime`
4. split render contexts
5. `SchemaRenderer`

```text
raw schema
  -> SchemaCompiler
compiled node tree
  -> SchemaRendererRoot
runtime + root scope + root contexts
  -> NodeRenderer(compiledNode)
resolved props + regions + helpers
  -> concrete renderer component
```

## Component Contract

Concrete renderer components should see a small, explicit contract.

```ts
interface RendererComponentProps<S extends BaseSchema = BaseSchema> {
  id: string;
  path: string;
  schema: S;
  node: CompiledSchemaNode<S>;
  props: Record<string, unknown>;
  regions: Record<string, RenderRegionHandle>;
  helpers: RendererHelpers;
}
```

Meaning:

- `schema`: declared shape
- `node`: compiled metadata
- `props`: resolved runtime props for the current render
- `regions`: precompiled renderable child fragments
- `helpers`: stable imperative APIs

## Props Versus Hooks

### Rejected: everything through props

Problems:

- too much prop drilling
- runtime identity churn spreads rerenders
- every new capability changes many signatures

### Rejected: everything through hooks

Problems:

- ownership becomes unclear
- local fragment rendering becomes awkward
- explicit child-region knowledge disappears

### Chosen: hybrid contract

Pass by props:

- `schema`
- `node`
- resolved `props`
- `regions`
- stable `helpers`
- per-render local fragment inputs

Pass by hooks:

- `useRendererRuntime()`
- `useRenderScope()`
- `useScopeSelector()`
- `useRendererEnv()`
- `useActionDispatcher()`
- `useCurrentForm()`
- `useCurrentPage()`
- `useCurrentNodeMeta()`

This matches the actual change frequency of data and services.

## Recommended Hooks

Key hooks:

```ts
function useRendererRuntime(): RendererRuntime;
function useRenderScope(): ScopeRef;
function useScopeSelector<T>(selector: (scopeData: any) => T, equalityFn?: (a: T, b: T) => boolean): T;
function useRendererEnv(): RendererEnv;
function useActionDispatcher(): RendererRuntime['dispatch'];
function useCurrentNodeMeta(): { id: string; path: string; type: string };
function useRenderFragment(): RendererHelpers['render'];
```

`useScopeSelector()` is especially important and should be preferred over broad `scope.read()` style access.

## Regions and Fragment Rendering

Local schema rendering should use region handles rather than raw child schema whenever possible.

```ts
interface RenderRegionHandle {
  key: string;
  node: CompiledSchemaNode | CompiledSchemaNode[] | null;
  render(options?: RenderFragmentOptions): React.ReactNode;
}
```

Why regions are better than raw child schema:

- child schema is compiled once
- the handle is already bound to the correct runtime
- scope creation and path tracking stay consistent
- profiling, debug metadata, and monitor hooks remain centralized

### Pattern 1: render declared regions directly

```tsx
function PanelRenderer(props: RendererComponentProps<PanelSchema>) {
  return (
    <section>
      <header>{props.regions.header?.render()}</header>
      <main>{props.regions.body?.render()}</main>
      <footer>{props.regions.actions?.render()}</footer>
    </section>
  );
}
```

### Pattern 2: render a fragment with local override data

```tsx
function ListRenderer(props: RendererComponentProps<ListSchema>) {
  const items = props.props.items as unknown[];

  return (
    <div>
      {items.map((item, index) => (
        <div key={index}>
          {props.regions.item?.render({
            data: { item, index },
            scopeKey: `item:${index}`
          })}
        </div>
      ))}
    </div>
  );
}
```

### Pattern 3: render an ad hoc schema fragment

```tsx
function EmptyStateWrapper(props: RendererComponentProps<EmptyWrapperSchema>) {
  const render = useRenderFragment();
  const isEmpty = useScopeSelector((scope) => !scope.items?.length);

  if (isEmpty) {
    return render(props.schema.emptyBody, {
      data: { reason: 'empty' }
    });
  }

  return <>{props.regions.body?.render()}</>;
}
```

This path should exist, but precompiled regions remain the preferred path.

## Field Semantics for Slots

When a renderer needs slot-like behavior such as `title`, `empty`, or `item`, field interpretation should come from renderer field metadata rather than renderer-local guesses.

Rule:

- schema authors declare intent with normal schema fields
- renderer definitions declare how each field is interpreted
- the compiler normalizes those fields into `props` or `regions`
- renderer components adapt normalized values to third-party component APIs

Recommended direction:

- plain values remain normal compiled props
- child fragments become compiled regions
- render-prop functions are synthesized inside the renderer adapter layer
- selected fields such as `title` may eventually support `value-or-region` semantics through richer field metadata

See `docs/architecture/field-metadata-slot-modeling.md` for the detailed slot and field-metadata design.

## Render Context Split

Do not put all runtime and render state into one giant React context.

Recommended split:

- `RendererRuntimeContext`
- `RenderNodeContext`
- `RenderScopeContext`
- `FormRuntimeContext`
- `PageRuntimeContext`

Reason:

- `runtime` is mostly stable
- scope data changes frequently
- splitting contexts avoids unrelated rerenders

## Scope and Local Render Options

Fragment rendering should accept explicit local overrides.

```ts
interface RenderFragmentOptions {
  data?: object;
  scope?: ScopeRef;
  scopeKey?: string;
  isolate?: boolean;
  pathSuffix?: string;
}
```

Recommended behavior:

- if `scope` is provided, use it directly
- otherwise, if `data` is provided, create a child scope
- if `isolate` is true, do not chain to the current scope
- `scopeKey` helps keep repeated scopes stable
- `pathSuffix` improves debugging and cache keys

## Performance Rules

### Compiled nodes should not be reinterpreted every render

At compile time:

- detect regions
- precompile expressions and templates
- classify static versus dynamic work
- attach the renderer definition once

At runtime:

- reuse compiled nodes
- evaluate only dynamic fields
- preserve references when results do not change

### Preserve static fast path

Rule:

- no expression means return the original input reference
- only dynamic fragments may allocate new objects, and only when results actually change

### Preserve dynamic identity reuse

Keep the good semantic target from the old prototype:

- unchanged leaf expression results should preserve parent references where possible
- object and array nodes should compare shallowly and reuse old references when equal
- template outputs compare by primitive equality

### Keep helpers stable

`helpers` should be stable objects, not recreated with inline lambdas every render.

### Reuse region handles

`props.regions.body.render()` should use a stable handle object rather than reconstructing region descriptors repeatedly.

### Create child scopes lazily

List, table, and tree renderers should create child scopes only for visible or actually rendered items.

## Root Entry Contract

Root renderer boundaries stay explicit.

```ts
interface SchemaRendererProps {
  schema: BaseSchema | BaseSchema[];
  data?: object;
  env: RendererEnv;
  formulaCompiler: FormulaCompiler;
  registry?: RendererRegistry;
  plugins?: RendererPlugin[];
  pageStore?: PageStoreApi;
  parentScope?: ScopeRef;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}
```

Why root uses props:

- root inputs define ownership
- boundary behavior is easy to test
- embedding, plugin, and SSR scenarios stay simpler
- the expression compiler remains explicitly injectable

## Form and Table Expectations

### Form renderer

A form renderer should:

1. create an isolated `FormRuntime`
2. create a form scope
3. expose `FormRuntimeContext`
4. render `body` and `actions` through regions

Child controls should use `useCurrentForm()` rather than receiving repeated form props.

### Table renderer

A table renderer should:

- create a child scope from `{ record, index }` for each row
- let cells read only what they need
- render operation columns with row-local override data

This is the core pattern for row scope and local fragment rendering.

## Suggested Implementation Order

1. define schema, compiled node, renderer definition, and component prop contracts
2. implement `FormulaCompiler` on top of `amis-formula`
3. implement recursive `ExpressionCompiler`
4. implement `RendererRegistry` and `SchemaCompiler`
5. implement `RendererRuntime` with stable helpers
6. test static fast path and identity reuse before wiring React
7. implement split contexts and selector hooks
8. implement `RenderRegionHandle`
9. implement core renderers such as `page`, `form`, `dialog`, `table`, and `button`

## Related Documents

- Official architecture: `docs/architecture/amis-core.md`
- Field metadata and slot modeling: `docs/architecture/field-metadata-slot-modeling.md`
- Interface map: `docs/references/renderer-interfaces.md`
- Example schema: `docs/examples/user-management-schema.md`
