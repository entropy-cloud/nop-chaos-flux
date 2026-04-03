# Renderer Runtime Design

## Purpose

This document defines the current runtime, renderer, and React integration shape used by the active codebase.

Use it when changing:

- renderer component contracts
- hooks and context usage
- fragment rendering and region handling
- scope flow through React render trees
- render-time performance behavior

For detailed slot and field-semantics rules, use `docs/architecture/field-metadata-slot-modeling.md` as the primary document.

## Current Code Anchors

When this document needs to be checked against code, start with:

- `packages/flux-core/src/index.ts` for renderer contracts
- `packages/flux-react/src/index.tsx` for hooks, rendering helpers, and React boundaries
- `packages/flux-runtime/src/node-runtime.ts` for resolved prop/meta behavior
- `packages/flux-runtime/src/page-runtime.ts` and `packages/flux-runtime/src/form-runtime.ts` for runtime container creation

## Main Design Rule

The core rule is:

`boundary inputs stay explicit; ambient runtime capabilities come from hooks; local fragment rendering uses explicit render handles.`

## Design Principles

### Explicit at boundaries, implicit in the middle

- root boundaries use explicit props
- internal nodes avoid prop-drilling chains for shared runtime capabilities
- shared runtime services come from contexts and hooks

### Selective data access

Components that need one piece of state should not rerender for unrelated changes.

Prefer selector-style reads over broad `scope.read()` access.

### Compile once, execute many times

Schema compilation should happen once per schema identity, while renders mostly resolve compiled nodes.

### Static fast path and identity reuse are mandatory

- no expression means original-reference return
- unchanged dynamic results should reuse previous references whenever possible

### Runtime helpers should stay reference-stable

Helpers such as `evaluate`, `dispatch`, `render`, and `createScope` should be stable across renders unless ownership truly changes.

## Architecture Guardrails (Bug-Derived)

The following are architecture-level constraints distilled from historical regressions.

- Reactive render paths must subscribe. Components that need reactive scope data in render must use selector/subscription APIs such as `useScopeSelector`, not imperative reads such as `scope.get(...)`.
- Render phase must stay side-effect free. Renderer paths must not call store writers or state setters during render. If synchronization is needed, buffer and flush in an effect.
- Root page scope should be seeded when `SchemaRenderer` creates the page runtime. Effects should only reconcile subsequent prop changes so mount-time child effects do not lose writes to a later root-data sync.
- Scope identity and lifecycle must stay stable. Fragment/dialog render paths should avoid unnecessary scope recreation and must preserve parent-child reactivity when parent scope data changes.

Use `docs/references/architecture-guardrails-from-bugs.md` for concrete anti-patterns, regression examples, and verification checks.

## Active Internal Shape

The current renderer stack is effectively split into:

1. `SchemaCompiler`
2. `RendererRegistry`
3. `RendererRuntime`
4. split React contexts and hooks
5. `SchemaRenderer` and `NodeRenderer`

```text
raw schema
  -> SchemaCompiler
compiled node tree
  -> SchemaRenderer
runtime + root scope + page context
  -> NodeRenderer(node)
resolved meta + resolved props + regions + events + helpers
  -> concrete renderer component
```

## Renderer Component Contract

Current renderer components receive a contract shaped like:

```ts
interface RendererComponentProps<S extends BaseSchema = BaseSchema> {
  id: string;
  path: string;
  schema: S;
  node: CompiledSchemaNode<S>;
  props: Readonly<Record<string, unknown>>;
  meta: ResolvedNodeMeta;
  regions: Readonly<Record<string, RenderRegionHandle>>;
  events: Readonly<Record<string, RendererEventHandler | undefined>>;
  helpers: RendererHelpers;
}
```

Meaning:

- `schema` is the declared source shape
- `node` is the compiled node metadata
- `props` is the resolved runtime prop object for the current render
- `meta` is the resolved node meta such as visibility or disabled state
- `meta.testid` is the resolved testid for `data-testid` attribute output on the root element
- `regions` is the map of precompiled child render handles
- `events` is the map of runtime event handlers derived from declarative event fields
- `helpers` exposes stable imperative runtime helpers

## Props Versus Hooks

### Pass by props

Use props for data that is renderer-local and explicit:

- `schema`
- `node`
- resolved `props`
- resolved `meta`
- `regions`
- `events`
- stable `helpers`

### Pass by hooks

Use hooks for ambient runtime state and services:

- `useRendererRuntime()`
- `useRenderScope()`
- `useCurrentActionScope()`
- `useCurrentComponentRegistry()`
- `useScopeSelector()`
- `useOwnScopeSelector()`
- `useRendererEnv()`
- `useActionDispatcher()`
- `useCurrentForm()`
- `useCurrentPage()`
- `useCurrentNodeMeta()`
- `useRenderFragment()`

This split matches actual ownership and change frequency better than either â€œeverything by propsâ€ or â€œeverything by hooksâ€.

## Current Hooks

Key hooks in the active React package are:

```ts
function useRendererRuntime(): RendererRuntime;
function useRenderScope(): ScopeRef;
function useCurrentActionScope(): ActionScope | undefined;
function useCurrentComponentRegistry(): ComponentHandleRegistry | undefined;
function useScopeSelector<T>(selector: (scopeData: any) => T, equalityFn?: (a: T, b: T) => boolean): T;
function useOwnScopeSelector<T>(selector: (scopeData: any) => T, equalityFn?: (a: T, b: T) => boolean): T;
function useRendererEnv(): RendererEnv;
function useActionDispatcher(): RendererRuntime['dispatch'];
function useCurrentForm(): FormRuntime | undefined;
function useCurrentPage(): PageRuntime | undefined;
function useCurrentNodeMeta(): { id: string; path: string; type: string };
function useRenderFragment(): RendererHelpers['render'];
```

Current scope-hook semantics are:

- `useScopeSelector()` subscribes to the lexical-scope-visible snapshot, so child renderers react when parent scope data changes.
- `useOwnScopeSelector()` subscribes only to the current scope's own snapshot, for paths that intentionally ignore parent-scope churn.
- `readOwn()` remains a current-layer-only API; selector inheritance should come from hook choice, not hidden fields on own snapshots.

Form-specific hooks such as `useCurrentFormErrors`, `useCurrentFormFieldState`, `useFieldError`, and `useAggregateError` also exist and are part of the active form integration surface.

## Regions And Fragment Rendering

Local schema rendering should prefer region handles over raw child schema whenever possible.

Current exported shape:

```ts
interface RenderRegionHandle {
  key: string;
  path: string;
  node: CompiledSchemaNode | CompiledSchemaNode[] | null;
  render(options?: RenderFragmentOptions): React.ReactNode;
}
```

Why this is preferred:

- child schema is compiled once
- the handle is already bound to the current runtime model
- scope creation and path tracking stay consistent
- monitor and debug behavior remain centralized

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

### Pattern 2: render with local data override

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

### Pattern 3: render an ad hoc fragment through helpers

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

Precompiled regions remain the preferred path; ad hoc rendering exists as a supplement.

## Slot And Field Semantics

When a renderer needs slot-like behavior such as `title`, `empty`, or `onClick`, field interpretation should come from renderer field metadata and compiler normalization, not renderer-local guessing.

Current implications for renderer authors:

- read renderable child fragments from `regions`
- read value-like content from `props`
- read event handlers from `events`
- use helper utilities such as `resolveRendererSlotContent(...)` when a slot can come from either a region or a value prop

The detailed semantics for `value-or-region`, event fields, and nested region extraction live in `docs/architecture/field-metadata-slot-modeling.md`.

## Render Context Split

The React layer should not collapse all runtime and render state into one giant context.

Current split context areas are:

- runtime context
- scope context
- action-scope context
- component-registry context
- node meta context
- form context
- page context

Why:

- runtime is mostly stable
- scope and form state change more frequently
- split context boundaries reduce unrelated rerenders

## Local Render Options

Fragment rendering accepts explicit local overrides.

Current contract:

```ts
interface RenderFragmentOptions {
  data?: object;
  scope?: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  scopeKey?: string;
  isolate?: boolean;
  pathSuffix?: string;
}
```

The active React layer now carries three separate execution lookups through explicit boundaries:

- `ScopeRef` for data lookup and updates
- `ActionScope` for namespaced action resolution such as `designer:export`
- `ComponentHandleRegistry` for instance-targeted capability invocation such as `component:submit`

`NodeRenderer` may explicitly create a fresh action-scope boundary or component-registry boundary when a renderer definition opts into `actionScopePolicy: 'new'` or `componentRegistryPolicy: 'new'`.

Current concrete uses:

- `designer-page` creates a local action-scope boundary and registers the `designer` namespace provider during owned lifecycle
- `form` creates a local component-registry boundary and registers an explicit form handle exposing `submit`, `validate`, `reset`, and `setValue`
- `DialogHost` keeps dialog rendering on the same React/runtime boundary; floating dialog surfaces inherit `.nop-theme-root` CSS-variable theme contract from the app root

Fragment rendering keeps the same explicitness rule as data scope: callers must pass `actionScope` and `componentRegistry` through `render(options)` when a subtree should inherit or replace those execution boundaries deliberately.

Expected behavior:

- if `scope` is provided, use it directly
- otherwise, if `data` is provided, create a child scope
- if `isolate` is true, do not chain to the current parent scope
- `scopeKey` helps keep repeated scopes stable
- `pathSuffix` helps with path clarity and debugability

## Root Entry Contract

Root renderer boundaries stay explicit.

Current exported root props are:

```ts
interface SchemaRendererProps {
  schema: SchemaInput;
  data?: Record<string, any>;
  env: RendererEnv;
  formulaCompiler: FormulaCompiler;
  registry?: RendererRegistry;
  plugins?: RendererPlugin[];
  pageStore?: PageStoreApi;
  parentScope?: ScopeRef;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}
```

Root uses explicit props because:

- ownership stays obvious
- tests stay straightforward
- embedding and plugin scenarios stay easier to reason about

## Form And Table Expectations

### Form renderer

A form renderer is expected to:

1. create a `FormRuntime`
2. use the form scope as the active child scope
3. expose form context to descendants
4. render `body` and `actions` through regions

Child controls should use `useCurrentForm()` and the form-specific hooks instead of receiving repeated form props by hand.

### Table renderer

A table renderer is expected to:

- create a row scope from `{ record, index }`
- pass row-local scope into cell or button fragments
- keep row rendering aligned with the same fragment and action infrastructure used elsewhere

## Performance Rules

### Do not reinterpret compiled nodes every render

At compile time:

- detect regions
- precompile expressions and templates
- classify static versus dynamic work
- attach renderer definition and validation metadata once

At runtime:

- reuse compiled nodes
- resolve only what is dynamic
- preserve references where results are unchanged

### Keep helpers stable

`helpers` should be stable objects, not recreated with unnecessary inline identity churn.

### Reuse region handles

Region handle objects should be reusable and renderer-friendly.

### Create child scopes only when needed

List, table, and tree renderers should avoid eager child-scope creation for work that is not actually rendered.

## Related Documents

- `docs/references/terminology.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/form-validation.md`
- `docs/references/renderer-interfaces.md`
