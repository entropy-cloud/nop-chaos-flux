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

For the clean-slate template/instance split, compiled-node identity, and table/loop instance rules, use `docs/architecture/template-instantiation-and-node-identity.md`.

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

Current runtime baseline now carries this one step further for compiled node resolution:

- dynamic value execution records the scope paths it actually read
- scope subscriptions carry `ScopeChange.paths`
- `NodeRenderer` only re-runs `resolveNodeMeta()` / `resolveNodeProps()` when the incoming changed paths intersect the node's last dependency set
- wildcard or broad-access reads remain conservatively invalidated on any scope change

### Compile once, execute many times

Template compilation should happen once per schema identity, while runtime mostly instantiates templates and resolves live node instances.

Current later-compile note:

- runtime-assembled fragments such as `dynamic-renderer` payloads or dialog title/body should follow the same two-step rule: compile to template, then instantiate into the current runtime context
- the long-term architecture goal is to stop treating compiled nodes as live instances and instead pass explicit runtime node instances through the render path
- live mounted nodes should receive runtime `cid` at mount time so DOM/debugger round-trips can stay compact via `data-cid`

Current code still renders `CompiledSchemaNode` directly. Treat that as the active implementation, not the target contract.

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

Current registry baseline:

- duplicate renderer types now fail fast by default during both initial registry construction and later `register(...)` calls
- hosts still have an explicit override path via `register(definition, { override: true })`
- explicit overrides emit a warning instead of silently replacing the previous renderer definition
- `RendererDefinition` now also carries the first tooling metadata baseline directly on the runtime contract: `displayName`, `icon`, `category`, `defaultSchema`, `propSchema`, and `sourcePackage`
- these metadata fields are intended to be the canonical source for tooling/loader/AI inspection rather than a separate parallel manifest

Current complex-state ownership baseline:

- complex renderers no longer need to treat all interactive state as implicitly local
- the first explicit ownership slice is `table.paginationOwnership`, currently supporting `local`, `controlled`, and `scope`
- the second explicit ownership slice is `table.selectionOwnership`, also supporting `local`, `controlled`, and `scope`
- `local` keeps the renderer's internal state as the source of truth
- `controlled` treats schema/runtime props as the source of truth and expects external updates after `onPageChange` / `onSelectionChange`
- `scope` treats explicit current-scope paths as the source of truth through `paginationStatePath` and `selectionStatePath`; renderer interactions write back to those paths directly and re-read them reactively through the normal scope subscription model
- table also now exposes the first instance capability baseline through its component handle: `component:refresh`, `component:getSelection`, and `component:setSelection`
- `component:refresh` preserves the caller action context when delegating to `onRefresh`, so runtime-owned actions such as `refreshSource` still resolve against the correct scope-owned source registry entry
- this baseline is still intentionally narrow; `sort`, `filter`, and `expand` are not yet moved into the same ownership model here

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
  locator?: NodeLocator;
  templateNode: TemplateNode<S>;
  node: CompiledSchemaNode<S>;
  nodeInstance: NodeInstance<S>;
  props: Readonly<Record<string, unknown>>;
  meta: ResolvedNodeMeta;
  regions: Readonly<Record<string, RenderRegionHandle>>;
  events: Readonly<Record<string, RendererEventHandler | undefined>>;
  helpers: RendererHelpers;
}
```

Meaning:

- `schema` is the declared source shape
- `locator` is the current live-node locator when the active render path can derive one
- `templateNode` is the current immutable structural definition mirrored off `nodeInstance`
- `node` is the compiled node metadata
- `nodeInstance` is the current live runtime instance and carries locator/state ownership for the mounted node
- `props` is the resolved runtime prop object for the current render
- `meta` is the resolved node meta such as visibility or disabled state
- `meta.testid` is the resolved testid for `data-testid` attribute output on the root element
- `schema.frameWrap` is the per-instance override for `RendererDefinition.wrap`; it can suppress wrapping or switch wrap-compatible renderers to grouped `<fieldset>` layout
- `regions` is the map of precompiled child render handles
- `events` is the map of runtime event handlers derived from declarative event fields
- `helpers` exposes stable imperative runtime helpers
- `node.lifecycleActions` carries compiled `onMount` / `onUnmount` actions when the schema declares them

### Target contract

The clean-slate target contract should move from compiled nodes to runtime node instances:

```ts
interface RendererComponentProps<S = unknown> {
  locator: NodeLocator;
  templateNode: TemplateNode<S>;
  node: NodeInstance<S>;
  props: Readonly<Record<string, unknown>>;
  meta: ResolvedNodeMeta;
  regions: Readonly<Record<string, RenderRegionHandle>>;
  events: Readonly<Record<string, RendererEventHandler | undefined>>;
  helpers: RendererHelpers;
}
```

Target meaning:

- `locator` is the canonical live-node identity
- `templateNode` is the immutable structural definition
- `node` is the live runtime instance
- renderers no longer receive a bare compiled node as if it were also the live instance

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
- `useCurrentNodeInstance()`
- `useRenderFragment()`

Current compatibility note:

- the active code still exposes `CompiledSchemaNode` through `RendererComponentProps.node` and `useCurrentNodeMeta()` for compatibility
- `locator` / `templateNode` are now also mirrored onto `RendererComponentProps` and `useCurrentNodeMeta()` so renderers and hooks can adopt live identity without waiting for the full `node: NodeInstance` contract flip
- `nodeInstance` / `useCurrentNodeInstance()` remain the preferred live-node source for locator-aware helpers and future template-instance migration work

This split matches actual ownership and change frequency better than either â€œeverything by propsâ€ or â€œeverything by hooksâ€.

Current orchestration boundary note:

- `NodeRenderer` remains the orchestration boundary for compiled-node resolution, lifecycle dispatch, import/capability setup, and final renderer invocation.
- `NodeRenderer` should not remain a generic creator for every possible descendant boundary. Data scope and owner runtime creation belong to the concrete creator path such as fragment rendering, page/form owners, and surface hosts.
- Compiler-owned node-local optional boundaries may still be precompiled as node-local closures when the boundary truly belongs to the node itself, such as node-local `classAliases` publication or `xui:imports`-driven capability setup.
- The React runtime should execute those node-local closures directly instead of re-deriving generic provider structure from scattered runtime props.
- Effect helpers such as lifecycle dispatch, render-monitor wiring, and narrow boundary execution can still be extracted when they reduce file-level complexity without moving ownership into renderers that do not actually own that boundary.

## Event Passthrough Contract

Renderer event handlers should forward the native UI event when one exists.

Required rule:

- DOM or React event entry points such as `onClick`, `onChange`, `onSubmit`, `onFocus`, and `onBlur` should call `props.events.onXxx?.(event)` rather than dropping the event object

Runtime then normalizes that payload into `ActionContext.event` as a structured `FluxActionEvent` shape.

Current normalized baseline includes:

- `type`
- `nativeEvent?`
- `currentTarget?`
- `target?`
- `preventDefault?()`
- `stopPropagation?()`

This rule exists so imported namespace providers, component-handle actions, and debugger/automation integrations can rely on one action-event contract instead of renderer-by-renderer ad hoc behavior.

Non-DOM semantic payloads are still allowed when a renderer emits higher-level interaction data, but those payloads should still carry a meaningful `type` field.

## Lifecycle Actions

`BaseSchema` now reserves two lifecycle action fields:

- `onMount?: ActionSchema`
- `onUnmount?: ActionSchema`

Compiler/runtime rule:

- lifecycle actions are compiled onto `CompiledSchemaNode.lifecycleActions`
- they do not participate in normal `eventActions` / `eventKeys`
- renderers do not adapt them manually
- `NodeRenderer` owns mount/unmount dispatch centrally

This keeps lifecycle behavior consistent across all renderers and avoids per-renderer hook duplication.

React 19 ROI note:

- This layer should adopt `useEffectEvent` only when a real subscription or long-lived effect needs the latest values without re-subscribing.
- The current orchestration refactor does not treat `useEffectEvent`, `startTransition`, or `useDeferredValue` as mandatory syntax migrations for `NodeRenderer` or `DialogHost`; no high-ROI case was identified in the current live code for these extracted paths.

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
function useCurrentNodeMeta(): {
  id: string;
  path: string;
  type: string;
  locator?: NodeLocator;
  templateNode: TemplateNode;
};
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

### Target region contract

The clean-slate target is an instantiation-oriented region handle:

```ts
interface RenderRegionHandle {
  key: string;
  instantiate(options?: {
    scope?: ScopeRef;
    bindings?: Record<string, unknown>;
    ownerLocator?: NodeLocator;
    instancePath?: readonly InstanceFrame[];
  }): React.ReactNode;
}
```

Rules:

- `bindings` is optional convenience input for creating a child scope when the caller wants to inject local values
- `scope` is for callers that already created the right scope explicitly
- renderers should not pass both `scope` and `bindings` unless the child-scope merge rule is well-defined for that region
- repeated renderers should prefer explicit `instancePath` plus stable-key-derived bindings over index-only conventions
- `instancePath` is the full absolute repeated-instance path for the instantiated child subtree, not an owner-relative suffix

This makes repeated rendering explicit instead of smuggling identity through `scopeKey` and `pathSuffix`.

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
        <div key={String((item as { id?: string }).id ?? index)}>
          {props.regions.item?.instantiate({
            bindings: { item, index },
            instancePath: [{ repeatedTemplateId: 'list.item', instanceKey: String((item as { id?: string }).id ?? index) }],
            ownerLocator: props.locator
          })}
        </div>
      ))}
    </div>
  );
}
```

In the target architecture, the repeated renderer should not invent identity through `index` alone. The repeated scope bindings and `instancePath` come from the repeated-template instantiation model in `docs/architecture/template-instantiation-and-node-identity.md`.

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

## Execution Boundary Ownership Matrix

Not every boundary in the render tree has the same creator. The table below is the normative classification used to decide where each boundary is created and published.

| Boundary | Owner | Creation Site | Notes |
|---|---|---|------|
| `classAliases` publication | Node-local (compile-time closure) | `NodeRenderer` executes compiled closure | Compiled into `renderPlan.wrapProviders` |
| `xui:imports`-driven `ActionScope` overlay | Node-local (compile-time closure) | `NodeRenderer` executes compiled closure | Only when node declares `xui:imports` |
| Fragment child data scope | Fragment render path (`RenderNodes`) | Created inside `RenderNodes` when `options.data` is passed | Not `NodeRenderer`'s responsibility |
| Page data scope + `PageRuntime` | Page owner/renderer | Created by page renderer/host at mount | Published via `PageContext` |
| Form data scope + `FormRuntime` | Form owner/renderer | Created by form renderer at mount | Published via `FormContext`; form scope is the active child scope for form children |
| Dialog surface scope + `SurfaceRuntime` | Dialog host/renderer | Created per opened dialog entry | `SurfaceRuntime`/`SurfaceStore` shared with drawer; `page` store is NOT reused |
| Drawer surface scope + `SurfaceRuntime` | Drawer host/renderer | Created per opened drawer entry | Same `SurfaceRuntime`/`SurfaceStore` model as dialog, `kind: 'drawer'` |
| `ActionScope` (host-level) | Host owner (e.g. `designer-page`) | Created at host lifecycle | Registered namespace provider during owned lifecycle |
| `ComponentHandleRegistry` | Form renderer (or other explicit boundary owner) | Created by form renderer at mount | Only concrete owners that need a new registry boundary create one |

Rules derived from this table:

- Node-local optional execution boundaries (`classAliases`, `xui:imports` overlays) are compiled into `renderPlan.wrapProviders` closures and executed by `NodeRenderer`. `NodeRenderer` does not re-derive these at React render time.
- Data scope, page/form runtime, and surface state are **creator-owned boundaries**: each is created and published by the concrete owner, not by a generic `NodeRenderer` provider layer.
- `dialog` and `drawer` share one `SurfaceRuntime`/`SurfaceStore` model. `page` runtime/store is NOT the owner of dialog/drawer state.
- `NodeRenderer` does not create or re-publish page, form, fragment data scope, or surface runtime. It only executes the node-local compiled closure and calls the concrete renderer.

## Node Context Convergence

Current node identity is carried by three parallel React contexts:

- `CompiledNodeContext` — used by `RenderNodes` to get the owner node for compile options
- `NodeMetaContext` — carries `{ id, path, type, locator, templateNode, node, nodeInstance }` for hooks
- `NodeInstanceContext` — carries `NodeInstance` for live locator/state

These three overlap. The target is a single node instance carrier:

- `NodeInstanceContext` (or an upgraded equivalent) becomes the single ambient source of current compiled/template/runtime node identity
- `CompiledNodeContext` and `NodeMetaContext` become compatibility projections over the unified carrier
- `useCurrentNodeMeta()` derives its result from the single node instance context
- Fragment owner fallback and helper creation also read from the unified context

Until convergence is complete, all three contexts remain active. The intermediate state is that `NodeMetaContext` mirrors its data from `NodeInstanceContext` rather than being independently populated.

## Render Context Split

The React layer should not collapse all runtime and render state into one giant context.

Current split context areas are:

- runtime context
- scope context
- action-scope context
- component-registry context
- node-instance context (target: single node instance carrier — see Node Context Convergence above)
- form context
- page context

Why:

- runtime is mostly stable
- scope and form state change more frequently
- split context boundaries reduce unrelated rerenders
- current node identity converges on one ambient runtime-instance carrier rather than parallel node-meta and compiled-node compatibility contexts

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

This document only describes how React render boundaries carry those execution contexts. The resolution model, lexical-visibility rules, and `xui:imports` provisioning semantics belong to `docs/architecture/action-scope-and-imports.md`.

Node-local capability boundaries should be created by the owner that actually introduces them.

Current baseline:

- fragment `render({ data })` creates the child data scope in the fragment render path itself
- page and form renderers/owners create and publish their own data/runtime boundaries
- node-local `xui:imports` or similar capability overlays may still be compiled into a node-local closure that `NodeRenderer` executes for that node
- component registries should be created only by the concrete owner that needs a new registry boundary, not by every node pre-emptively

Current concrete uses:

- `designer-page` creates a local action-scope boundary and registers the `designer` namespace provider during owned lifecycle
- `form` creates a local component-registry boundary and registers an explicit form handle exposing `submit`, `validate`, `reset`, and `setValue`
- `DialogHost` owns surface-family rendering and keeps floating dialog/drawer surfaces under one root host while inheriting the app root theme contract

Fragment rendering keeps the same explicitness rule as data scope: callers must pass `actionScope` and `componentRegistry` through `render(options)` when a subtree should inherit or replace those execution boundaries deliberately.

Expected behavior:

- if `scope` is provided, use it directly
- otherwise, if `data` is provided, create a child scope
- if `isolate` is true, do not chain to the current parent scope
- `scopeKey` helps keep repeated scopes stable
- `pathSuffix` helps with path clarity and debugability

Authoring guidance:

- fragment / region render paths should default to lexical inheritance
- use `data` when a fragment needs a narrow own-scope patch
- use `isolate: true` only when the fragment should become own-scope-only for clear boundary or performance reasons
- do not compensate for `isolate: true` by introducing `$parentScope`; explicitly copy/projection-pass the small parent values the fragment really needs

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
   onComponentRegistryChange?: (componentRegistry: ComponentHandleRegistry | null) => void;
   onActionScopeChange?: (actionScope: ActionScope | null) => void;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}
```

Current root lifecycle callbacks exist for host tooling integrations such as the debugger panel:

- `onComponentRegistryChange` exposes the active root component registry boundary
- `onActionScopeChange` exposes the active root action-scope boundary

These callbacks are for diagnostics/tooling handoff, not normal renderer data flow.

Root uses explicit props because:

- ownership stays obvious
- tests stay straightforward
- embedding and plugin scenarios stay easier to reason about

`env` is still conceptually a host-owned long-lived environment object, but current implementation no longer rebuilds runtime/page state just because the outer `env` wrapper identity changes.

- `SchemaRenderer` keeps runtime/page instances stable across non-structural `env` identity churn
- runtime subsystems read the latest `env` through a stable getter instead of closing over the initial object
- `env` changes trigger a lightweight page refresh so env-dependent expressions and props can re-evaluate without dropping form/page state

Hosts should still prefer stable `env` objects when practical, but memoization is now an optimization, not a correctness requirement.

## Surface Ownership In React Runtime

Dialog and drawer should be treated as one surface family in the React runtime.

Current baseline:

- `page`, `form`, and `surface` are different owner families and should not all share one owner runtime/store
- `dialog` and `drawer` should share one `SurfaceRuntime` / `SurfaceStore` model and differ by stable kind metadata such as `kind: 'dialog' | 'drawer'`
- surfaces are rendered by one root surface host stack rather than by recursively nesting independent hosts inside already-open surfaces
- a newly opened surface is appended after existing surfaces in the same host container so DOM/render order determines which surface appears in front
- this ordering rule should be preferred over per-open `z-index` escalation for same-family surfaces inside the same host container
- only the current top surface should own focus trap, escape handling, backdrop dismiss, and active-surface semantics
- closing the top surface should restore active ownership and focus to the previous surface in the stack

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

The current performance baseline further narrows that expectation:

- row scopes should be isolated by default
- non-isolated row scopes are an explicit opt-out for real parent-binding needs

### Chart renderer

Chart now participates in the component-handle registry as a DOM-owning renderer.

Current handle baseline:

- chart registers a `ComponentHandle` with an optional `ref`
- the registered `ref` points at the mounted chart container element when materialized
- the handle exposes narrow chart instance capabilities such as `resize`, `setOption`, and `getDataURL`

This is the preferred bridge for imported libraries or host tooling that need one concrete chart instance or DOM anchor without turning renderer internals into ambient global state.

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
