# NOP Chaos AMIS Renderer Internal Design

> Canonical runtime design now lives in `docs/architecture/renderer-runtime.md`.
> Use `docs/index.md` as the documentation entry point.

## 1. Design Goal and Context

Based on `docs/architecture/amis-core.md`, the overall direction is already clear: JSON-driven rendering, lexical data scope, PageStore/FormStore separation, expression compilation, unified actions, and high-performance large-page rendering. That direction is correct, but before implementation there are still four critical gaps that need to be nailed down:

1. what the internal renderer interfaces look like
2. how runtime data and capabilities flow through the tree
3. how custom components render nested schema fragments easily
4. how to keep the design high-performance under deeply nested pages

This document focuses on those four questions.

To avoid confusing "JSON format" with "rendering responsibility", this document uses `SchemaRenderer` as the core name instead of `JSONRenderer`. If later the team prefers `JsonRenderer`, `AmisRenderer`, or `NopRenderer`, the design remains the same.

## 2. Reading of the Existing Requirements

The existing design in `docs/architecture/amis-core.md` has several strong decisions:

- use lexical scope instead of repeatedly merging data objects
- split page-level state and form-level state
- precompile expressions instead of parsing on every render
- centralize actions through `doAction`
- treat dialog/table/form as first-class runtime containers

But if we directly start coding from that document, several implementation ambiguities will quickly appear:

- a renderer component needs `schema`, `scope`, `path`, `env`, `store`, `actions`, `registry`, `expression helpers`, and maybe `form` - should all of them be passed as props?
- if everything is hidden in `useXX`, local override rendering such as `render this sub-body with record/index` becomes awkward
- if custom components receive the whole runtime object as props, every parent render may create new references and trigger broad rerenders
- if custom components directly receive raw child schema and manually call the root renderer, performance and consistency will drift over time

Also, `docs/references/expression-processor-notes.md` captures one very important implementation insight from the early prototype even though its concrete mechanism should not be kept as-is:

- the current `new Function(...)` approach is not acceptable as the production expression engine
- expression compilation must be delegated to injected `amis-formula`-based compiler services
- but its core optimization target is correct: when evaluated parameter results do not change, the returned object reference should remain stable
- and when a schema fragment contains no expression at all, compilation should return the original object as a static fast path, so runtime execution cost becomes zero for that fragment

So the main architectural decision is not "props or hooks", but rather:

`boundary inputs stay explicit; ambient runtime capabilities come from hooks; local fragment rendering uses explicit render handles.`

This is the core decision of this document.

## 3. Design Principles

### 3.1 Explicit at boundaries, implicit in the middle

Renderer root boundaries should use explicit props because they define ownership and are easier to test.

Examples:

- root `schema`
- root `data`
- `env`
- optional `registry`
- optional `plugins`

Once inside the renderer tree, repeatedly drilling these objects through every node is wasteful. Internal nodes should instead use split contexts and hooks.

### 3.2 Data access must be selective, not broad

If a component only cares about `record.status`, it should not rerender because `page.users` changed elsewhere. Therefore internal data access cannot be `useScope()` + destructuring everywhere. It must support selector-style access.

### 3.3 Rendering sub-schema must be easier than bypassing the renderer

A custom component should be able to render a local body region with one line of code. If that is hard, developers will bypass the renderer and directly code JSX, which breaks low-code consistency.

### 3.4 Runtime services must be stable references

Anything like `evaluate`, `dispatch`, `renderFragment`, `createChildScope`, `resolveSchema` should come from a stable runtime object. Otherwise prop identity churn will become the main rerender source.

### 3.5 Compile once, execute many times

Schema should be compiled into an internal node model once per schema identity/version. Runtime rendering should mostly execute compiled plans, not reinterpret raw JSON repeatedly.

### 3.6 Static fast path is mandatory

If a schema fragment contains no expression, interpolation, or dynamic binding, the compiler must mark it as static and the executor must return the original object reference directly.

This is not a micro-optimization. In low-code pages, most schema fields are static. If static fragments still flow through the expression executor, the runtime cost will be dominated by useless traversal.

### 3.7 Dynamic fragments must preserve reference identity when results are unchanged

For dynamic fragments, the executor should reuse the last object or array reference whenever all evaluated child results are unchanged.

This is required for:

- `React.memo`
- selector-based prop comparison
- stable table cell and form item rendering
- avoiding needless rerender cascades in container components

## 4. Recommended Overall Shape

The renderer is split into five internal layers:

1. `SchemaCompiler`: raw schema -> compiled schema tree
2. `RendererRegistry`: schema type -> component definition
3. `RendererRuntime`: stable runtime services and caches
4. `RenderContext`: runtime, node meta, scope access, form/page ownership
5. `SchemaRenderer`: recursive execution entry that binds compiled nodes to React

Recommended high-level flow:

```text
raw schema
  -> SchemaCompiler
compiled node tree
  -> SchemaRendererRoot
runtime + root scope + root contexts
  -> NodeRenderer(compiledNode)
resolved props + slots + render handles
  -> concrete component renderer
```

## 5. Core Internal Interfaces

## 5.1 Schema Basics

```ts
type SchemaValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | SchemaObject
  | SchemaValue[];

interface SchemaObject {
  [key: string]: SchemaValue;
}

interface BaseSchema extends SchemaObject {
  type: string;
  id?: string;
  name?: string;
  visibleOn?: string;
  disabledOn?: string;
  className?: string;
}
```

## 5.2 Compiled Node Model

```ts
type SchemaPath = string;

interface CompiledExpression<T = unknown> {
  kind: 'expression';
  source: string;
  exec(scope: object, env: RendererEnv): T;
}

interface CompiledTemplate<T = unknown> {
  kind: 'template';
  source: unknown;
  exec(scope: object, env: RendererEnv): T;
}

interface StaticValue<T = unknown> {
  kind: 'static';
  value: T;
}

type CompiledValue<T = unknown> =
  | StaticValue<T>
  | CompiledExpression<T>
  | CompiledTemplate<T>;

interface CompiledRegion {
  key: string;
  node: CompiledSchemaNode | CompiledSchemaNode[] | null;
}

interface CompiledSchemaNode<S extends BaseSchema = BaseSchema> {
  id: string;
  type: S['type'];
  path: SchemaPath;
  schema: S;
  staticProps: Record<string, unknown>;
  dynamicProps: Record<string, CompiledExpression | CompiledTemplate>;
  regions: Record<string, CompiledRegion>;
  component: RendererDefinition<S>;
  flags: {
    hasVisibilityRule: boolean;
    hasDisabledRule: boolean;
    isContainer: boolean;
    isStatic: boolean;
  };
}
```

Key point:

- raw schema is not passed around as the only source of truth
- compiled node already knows which props are static, which need evaluation, and which fields are render regions
- fully static fragments must be recognized during compile time so runtime can bypass expression execution entirely

## 5.2.1 Expression Compiler Contract

The expression engine must be injectable. The renderer runtime should depend on an abstraction, not on `new Function(...)` and not on a hard-coded parser implementation.

```ts
interface FormulaCompiler {
  compileExpression(source: string): CompiledExpression;
  compileTemplate(source: string): CompiledTemplate;
  hasExpression(value: string): boolean;
}

interface ExpressionCompiler {
  compileValue<T = unknown>(input: T): CompiledRuntimeValue<T>;
}

type CompiledRuntimeValue<T = unknown> =
  | {
      kind: 'static';
      value: T;
      isStatic: true;
    }
  | {
      kind: 'dynamic';
      exec(scope: object, env: RendererEnv): T;
      isStatic: false;
    };
```

Recommended implementation rule:

- `FormulaCompiler` is provided from outside, and the default implementation should wrap `amis-formula`
- `ExpressionCompiler` recursively compiles arbitrary JSON-like values
- if no expression exists anywhere inside the input, return `{ kind: 'static', value: input }`
- that `value` should be the original object reference, not a cloned copy

This preserves both performance and identity semantics.

## 5.3 Renderer Definition and Registry

```ts
interface RendererDefinition<S extends BaseSchema = BaseSchema> {
  type: S['type'];
  component: React.ComponentType<RendererComponentProps<S>>;
  regions?: string[];
  memo?: boolean;
  scopePolicy?: 'inherit' | 'isolate' | 'form' | 'dialog' | 'row';
  resolveProps?: (args: ResolvePropsArgs<S>) => Record<string, unknown>;
}

interface RendererRegistry {
  register<S extends BaseSchema>(definition: RendererDefinition<S>): void;
  get(type: string): RendererDefinition | undefined;
  has(type: string): boolean;
}
```

`regions` defines which schema fields should be treated as renderable child fragments, such as `body`, `actions`, `toolbar`, `tabs`, `columns[].body`.

## 5.4 Runtime Interface

```ts
interface RendererEnv {
  fetcher: ApiFetcher;
  notify: (level: 'info' | 'success' | 'warning' | 'error', msg: string) => void;
  navigate?: (to: string, options?: unknown) => void;
  confirm?: (msg: string, options?: unknown) => Promise<boolean>;
  monitor?: RendererMonitor;
}

interface RendererRuntime {
  registry: RendererRegistry;
  env: RendererEnv;
  expressionCompiler: ExpressionCompiler;

  compile(schema: BaseSchema | BaseSchema[]): CompiledSchemaNode | CompiledSchemaNode[];
  evaluate<T>(target: unknown, scope: ScopeRef): T;
  renderNode(node: RenderNodeInput, options?: RenderFragmentOptions): React.ReactNode;
  renderRegion(region: RenderRegionHandle, options?: RenderFragmentOptions): React.ReactNode;
  createChildScope(parent: ScopeRef, patch?: object, options?: CreateScopeOptions): ScopeRef;
  dispatch(action: ActionSchema | ActionSchema[], ctx: ActionContext): Promise<ActionResult>;
}
```

This interface should be created once per renderer root and remain reference-stable.

## 5.5 Scope Model

```ts
interface ScopeRef {
  id: string;
  path: string;
  value: object;
  parent?: ScopeRef;
  store?: ScopeStore;
  update(path: string, value: unknown): void;
}

interface ScopeStore {
  getSnapshot(): object;
  subscribe(listener: () => void): () => void;
}
```

Important note:

- `value` is the lexical-scope object used for expression resolution
- `store` is the subscription source used for selective React updates

This split is important for performance. Expression evaluation wants a scope object. React components want subscription granularity.

## 5.6 Render Context Model

```ts
interface RenderContextValue {
  runtime: RendererRuntime;
  scope: ScopeRef;
  node: CompiledSchemaNode;
  path: string;
  form?: FormRuntime;
  page?: PageRuntime;
}
```

In practice this should not be stored in one giant React context. It should be split.

Recommended split:

- `RendererRuntimeContext`: immutable runtime services
- `RenderNodeContext`: current node meta such as `path`, `node.id`, `node.type`
- `RenderScopeContext`: current lexical scope ref
- `FormRuntimeContext`: current form runtime if any

The split avoids unrelated rerenders.

## 5.7 Component Props Seen by Concrete Renderers

```ts
interface RenderRegionHandle {
  key: string;
  node: CompiledSchemaNode | CompiledSchemaNode[] | null;
  render(options?: RenderFragmentOptions): React.ReactNode;
}

interface RendererHelpers {
  render: (input: RenderNodeInput, options?: RenderFragmentOptions) => React.ReactNode;
  evaluate: <T>(target: unknown, scope?: ScopeRef) => T;
  createScope: (patch?: object, options?: CreateScopeOptions) => ScopeRef;
  dispatch: (action: ActionSchema | ActionSchema[], ctx?: Partial<ActionContext>) => Promise<ActionResult>;
}

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

This is the key component contract.

Notice the separation:

- `schema`: raw declared shape, mainly for type-safe component logic
- `node`: compiled metadata
- `props`: already resolved runtime props for this render
- `regions`: easy-to-render child fragments
- `helpers`: stable imperative rendering/action APIs

## 6. Props vs `useXX`: Final Decision

## 6.1 Rejected Option A: everything via props

This looks explicit, but is the wrong internal design.

Problems:

- severe prop drilling in recursive trees
- every level needs to forward runtime objects it does not actually use
- runtime object identity churn causes unnecessary rerenders
- adding one new capability means changing many component signatures
- custom components become harder to author because ceremony dominates the code

Conclusion: do not pass `scope`, `env`, `form`, `page`, `dispatch`, `registry`, and `runtime` through every level as normal props.

## 6.2 Rejected Option B: everything via hooks

This is also wrong if taken to the extreme.

Problems:

- ownership boundaries become implicit
- rendering a child fragment with local override data becomes awkward
- testing pure rendering contracts becomes harder
- custom components lose obvious knowledge of which child regions exist
- some render behavior should stay explicit at the call site, especially local `record`, `item`, `index`, `dialogId`

Conclusion: do not hide schema regions and local render inputs entirely in hooks.

## 6.3 Chosen Option C: hybrid contract

The recommended rule is:

### Pass by props

Use props for data that is local, declarative, or render-call specific:

- `schema`
- `node`
- resolved `props`
- `regions`
- stable `helpers`
- local `renderRegion(..., { data })` inputs

### Pass by hooks

Use hooks for ambient runtime capabilities and selective subscriptions:

- `useRendererRuntime()`
- `useExpressionCompiler()`
- `useRenderScope()`
- `useScopeSelector(selector)`
- `useRendererEnv()`
- `useActionDispatcher()`
- `useCurrentForm()`
- `useCurrentNodeMeta()`

### Why this is the right split

Because it matches how data changes in practice:

- declared structure changes rarely -> keep explicit in props
- runtime services are shared everywhere -> expose through hooks
- data subscription must be selective -> expose through selector hooks
- sub-schema rendering often needs local override data -> keep render call explicit

This design is both ergonomic and fast.

## 7. Recommended Hooks

```ts
function useRendererRuntime(): RendererRuntime;

function useExpressionCompiler(): ExpressionCompiler;

function useRenderScope(): ScopeRef;

function useScopeSelector<T>(
  selector: (scopeData: any) => T,
  equalityFn?: (a: T, b: T) => boolean
): T;

function useRendererEnv(): RendererEnv;

function useActionDispatcher(): RendererRuntime['dispatch'];

function useCurrentNodeMeta(): {
  id: string;
  path: string;
  type: string;
};

function useRenderFragment(): RendererHelpers['render'];
```

`useScopeSelector` is especially important. Internal components should prefer this over reading the entire scope object.

Example:

```tsx
function StatusBadge() {
  const status = useScopeSelector((scope) => scope.record?.status);
  return <Badge>{status}</Badge>;
}
```

This is much better than:

```tsx
function StatusBadge() {
  const scope = useRenderScope();
  return <Badge>{scope.value.record?.status}</Badge>;
}
```

The second version subscribes too broadly unless extra machinery is added later.

## 8. How Custom Components Render Local Pages Easily

This is the most important practical requirement.

The custom component should not need to know how recursion, scope chain wiring, expression evaluation, or region compilation work internally. It should only need one of these two patterns:

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

This should be the default path for most container-like components.

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

This is the core mechanism for rows, tabs, cards, steps, timeline items, tree nodes, etc.

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

This should exist, but it is the secondary path. The preferred path is precompiled regions.

## 9. Why Regions Are Better Than Passing Raw Child Schema

Instead of giving custom components only raw `body` JSON, the runtime should give them prebuilt `RenderRegionHandle`s.

Benefits:

- child schema is compiled only once
- region render function is already bound to the correct runtime
- consistent scope creation and path tracking
- easy to attach profiling, error boundary, and debug metadata
- custom components stay simple and do not reimplement renderer plumbing

So for custom component ergonomics and performance, `regions` is a better abstraction than raw child schema.

## 10. `RenderFragmentOptions` Design

```ts
interface RenderFragmentOptions {
  data?: object;
  scope?: ScopeRef;
  scopeKey?: string;
  isolate?: boolean;
  pathSuffix?: string;
}

interface CreateScopeOptions {
  pathSuffix?: string;
  isolate?: boolean;
  source?: 'row' | 'dialog' | 'form' | 'custom';
}
```

Recommended behavior:

- if `scope` is provided, use it directly
- else if `data` is provided, create a child scope whose prototype points to current scope
- if `isolate` is true, do not prototype-chain to current scope
- `scopeKey` is used to keep repeated item scopes stable when possible
- `pathSuffix` is appended to current render path for debugging and cache keys

This gives custom components an explicit and understandable way to render local pages.

## 11. Performance Design

## 11.1 Compile schema into static props, dynamic props, and regions

Do not traverse raw schema during every render.

At compile time:

- detect render regions
- precompile expressions and templates through injected `amis-formula` compiler services
- classify fields into static and dynamic groups
- attach renderer definition once
- if a subtree has no expression, mark it static and keep the original object reference

At render time:

- reuse compiled node
- evaluate only dynamic props
- reuse unchanged object references where possible
- return static fragments by original reference without entering the evaluator

## 11.1.1 Static fragment fast path

This rule should be strict:

- input has no expression -> executor returns original input reference
- input has expression -> executor may allocate, but only when evaluated result actually changes

Example:

```ts
const staticClassName = compiler.compileValue({
  size: 'md',
  theme: 'primary'
});

// Every call returns the exact same object reference.
staticClassName.kind === 'static';
staticClassName.value === originalObject;
```

This matters because many renderer props such as layout config, style config, button variants, and column metadata are static for the whole page lifetime.

## 11.1.2 Dynamic fragment identity reuse

For dynamic nodes, keep the core idea described in `docs/references/expression-processor-notes.md`, but replace the unsafe implementation with an injected `amis-formula` evaluator.

Required semantic behavior:

- if all leaf expression results are referentially or primitively unchanged, return the previous object
- if only one nested child changes, reuse unchanged child references where possible and rebuild only the affected parents
- string template output compares by primitive equality
- object and array nodes compare structurally at one level and reuse the previous reference when equal

So the design target is not "cache by scope reference only". It is "cache by evaluated result shape and preserve identity when value graph is unchanged".

## 11.2 Split runtime context from subscription context

`runtime` is almost immutable.

`scope data` changes frequently.

Do not put both into one context value. If you do, every data change risks rerendering components that only need runtime helpers.

## 11.3 Selector-based scope reads

Any component that consumes scope data should prefer selector subscription.

Recommended implementation choices:

- `useSyncExternalStore` over a scope store wrapper
- or a tiny Zustand store per page/form/row boundary with selectors

The design requirement is more important than the exact mechanism: components must subscribe narrowly.

## 11.4 Stable helpers object

`helpers` passed into component props should be memoized once per node boundary, not recreated from inline lambdas on every render.

Wrong:

```tsx
<Comp helpers={{ render: (...args) => runtime.renderNode(...args) }} />
```

Right:

```ts
const helpers = getStableHelpers(nodeId, runtime, scopeRef);
```

## 11.5 Region rendering should reuse compiled handles

`props.regions.body.render()` should not reconstruct the region definition every time. Region handles should be stable objects whose `render` method internally accepts override options.

## 11.6 Scope creation must be lazy

For list/table/tree scenarios, child scopes should be created only for visible or actually rendered items.

This matches the earlier virtual-scroll requirement in `docs/architecture/amis-core.md`.

## 11.7 Resolved prop objects should preserve references when values do not change

This is especially important for container components that pass complex `props` into memoized UI subtrees.

The same idea also appears in `docs/references/expression-processor-notes.md`: if evaluated results are shallow-equal, reuse the previous object reference. That strategy should be kept in the real renderer runtime, but with three corrections:

- the expression engine must come from injected `amis-formula` services
- completely static fragments should return the original object directly
- caching should be attached to compiled nodes or compiled runtime values, not implemented by ad hoc `new Function(...)` executors

## 11.8 Memoization boundary should be renderer-definition aware

Not every renderer benefits equally from `React.memo`.

Recommended rule:

- presentational leaf components: memo by default
- container components with many regions: memo carefully
- form controls: memo plus selector-based field subscription
- table row/item renderers: memo aggressively with stable row scope keys

That is why `RendererDefinition.memo` exists.

## 12. Root Entry Interface

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

function SchemaRenderer(props: SchemaRendererProps): React.ReactElement;
```

Why root uses props rather than hooks:

- root inputs define ownership
- root is easy to test in isolation
- root can be mounted in page, dialog, plugin, or unit test without hidden dependency
- SSR and embedding scenarios are simpler
- the concrete expression compiler can be injected explicitly, which makes `amis-formula` integration replaceable and testable

## 13. Example: Form Renderer Contract

```ts
interface FormRuntime {
  id: string;
  store: FormStoreApi;
  submit(): Promise<void>;
  reset(values?: object): void;
  setValue(name: string, value: unknown): void;
}

interface FormSchema extends BaseSchema {
  type: 'form';
  body?: BaseSchema[];
  actions?: BaseSchema[];
}
```

A `form` renderer should:

1. create an isolated `FormRuntime`
2. create a form scope whose updates go to form store first
3. expose `FormRuntimeContext`
4. render `body` and `actions` through regions

Internal child controls should get form capability through `useCurrentForm()`, not via repeated props.

This is a direct example of the props/hook split working correctly.

## 14. Example: Table Row Rendering Contract

```ts
interface TableSchema extends BaseSchema {
  type: 'table';
  source: string;
  columns: ColumnSchema[];
}

interface RowRenderInput {
  record: object;
  index: number;
  rowKey: string;
}
```

A table renderer should not pass the full page scope into every cell as normal props. Instead:

- row render creates a child scope from `{ record, index }`
- cells read only what they need through selectors or resolved props
- operation columns render their region with row-local override data

This gives both low-code flexibility and large-data performance.

## 15. Error Boundary and Debug Metadata

Because region handles always know `key`, `path`, and `node.id`, the runtime can automatically wrap region rendering with:

- error boundary
- render timing
- debug labels
- monitor hooks

This is another reason to prefer `regions.render()` over raw child schema.

## 16. Final Recommendation Summary

### 16.1 Naming

Use `SchemaRenderer` as the main internal name. It is clearer than `JSONRenderer` because the real input is a compiled schema model, not raw JSON text.

### 16.2 Main interface set

Implement these first:

- `RendererRegistry`
- `SchemaCompiler`
- `FormulaCompiler` and `ExpressionCompiler`
- `RendererRuntime`
- `ScopeRef` and `ScopeStore`
- `RenderRegionHandle`
- `RendererComponentProps`
- `SchemaRenderer`

### 16.3 Parameter passing strategy

Use the following rule consistently:

- root boundary: explicit props
- concrete renderer declared inputs: explicit props
- ambient runtime capability: `useXX`
- scope data reads: selector hooks
- local sub-page rendering inputs: explicit `render(..., options)` arguments

### 16.4 Why this is the best choice

Because it simultaneously solves:

- low prop-drilling cost
- high custom component ergonomics
- easy local fragment rendering
- strong testability at boundaries
- selective rerendering under complex pages
- static-fragment zero-cost fast path
- stable object identity for unchanged dynamic results

### 16.5 The most important ergonomic target

For any custom component, this should feel natural:

```tsx
function CustomBlock(props: RendererComponentProps<CustomBlockSchema>) {
  return (
    <div>
      {props.regions.toolbar?.render()}
      {props.regions.body?.render({ data: { mode: 'detail' } })}
    </div>
  );
}
```

If the real implementation preserves that simplicity while internally using compiled nodes, split contexts, selector subscriptions, and stable helpers, then the renderer architecture is on the right track.

## 17. Suggested Implementation Order

1. define `BaseSchema`, `CompiledSchemaNode`, `RendererDefinition`, `RendererComponentProps`
2. implement `FormulaCompiler` on top of `amis-formula`, then implement recursive `ExpressionCompiler`
3. implement `RendererRegistry` and `SchemaCompiler`
4. implement `RendererRuntime` with stable helper references
5. ensure static fast path and dynamic identity reuse semantics are covered by tests before wiring React
6. implement split contexts and `useScopeSelector`
7. implement `RenderRegionHandle`
8. implement core container renderers: `page`, `form`, `dialog`, `table`, `button`, `service`
9. only after that, wire in action system and advanced plugin hooks

This order keeps the foundation clean and avoids prematurely coupling actions, stores, and rendering recursion.
