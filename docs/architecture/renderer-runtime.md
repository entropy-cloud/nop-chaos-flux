# Renderer Runtime Design

## Purpose

This document defines the normative runtime, renderer, and React integration shape for Flux's React host.

Use it when changing:

- renderer component contracts
- hooks and context usage
- fragment rendering and region handling
- scope flow through React render trees
- render-time performance behavior

For detailed slot and field-semantics rules, use `docs/architecture/field-metadata-slot-modeling.md` as the primary document.

For the clean-slate template/instance split, compiled-node identity, and table/loop instance rules, use `docs/architecture/template-instantiation-and-node-identity.md`.

## Reference Anchors

When this document needs to be checked against implementation progress, start with:

- `packages/flux-core/src/index.ts` for renderer contracts
- `packages/flux-react/src/index.tsx` for hooks, rendering helpers, and React boundaries
- `packages/flux-runtime/src/node-runtime.ts` for resolved prop/meta behavior
- `packages/flux-runtime/src/page-runtime.ts` and `packages/flux-runtime/src/form-runtime.ts` for runtime container creation

For compiled-node identity, template/instance split, and table/loop instance rules, see `docs/architecture/template-instantiation-and-node-identity.md`.

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

Prefer selector-style reads over broad `scope.materializeVisible()` access.

The runtime baseline carries this one step further for compiled node resolution:

- dynamic value execution records the scope paths it actually read
- scope subscriptions carry `ScopeChange.paths`
- `NodeRenderer` only re-runs `resolveNodeMeta()` / `resolveNodeProps()` when the incoming changed paths intersect the node's last dependency set
- wildcard or broad-access reads remain conservatively invalidated on any scope change
- runtime owners must expose explicit teardown for long-lived resources; the current `RendererRuntime` surface includes `dispose()` to stop owned data sources, reactions, imported namespace registrations, and in-flight requests when a host unmounts or replaces a runtime instance

### Compile once, execute many times

Template compilation should happen once per schema identity, while runtime mostly instantiates templates and resolves live node instances.

Normative compile model:

- `SchemaCompiler.compile()` returns `CompiledTemplate` containing a `TemplateNode` tree
- all compilation calls within one `RendererRuntime` share a single counter, giving every `templateNodeId` a globally unique value within that runtime
- `TemplateNode.component` carries the resolved `RendererDefinition` directly from compile time — no per-render registry lookup
- `NodeRenderer` receives `TemplateNode` and constructs `NodeInstance` directly; the older `CompiledSchemaNode` step has been eliminated and does not appear in the render path
- `templateNodeId` is the compiled structural identity
- `cid` is the live inspectable bridge token written to `data-cid` when a mounted node needs DOM/debugger/registry bridging
- `NodeLocator` is a retired transitional wrapper and must not remain in runtime-facing contracts
- repeated structure remains available through `instancePath`, but mounted lookup/debugger/registry entry is `cid`

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
- React host effects should not republish owner summaries that already belong to runtime owners. For example, `DialogHost` / `DrawerHost` may render the mounted surface tree, but `statusPath` publication belongs to `SurfaceRuntime` so React rendering does not create a second source of truth or write to the wrong scope.

Use `docs/references/architecture-guardrails-from-bugs.md` for concrete anti-patterns, regression examples, and verification checks.

## Active Internal Shape

The current renderer stack is effectively split into:

1. `SchemaCompiler` → produces `CompiledTemplate` (containing `TemplateNode` tree)
2. `RendererRegistry`
3. `RendererRuntime`
4. split React contexts and hooks
5. `SchemaRenderer` and `NodeRenderer`

```text
raw schema
  -> SchemaCompiler
CompiledTemplate (TemplateNode tree)
  -> SchemaRenderer
runtime + root scope + page context
  -> NodeRenderer(templateNode, instancePath?)
NodeInstance (cid, templateNode, instancePath, scope, state)
resolved meta + resolved props + regions + events + helpers
  -> concrete renderer component
```

## End-To-End Render Pipeline

The current mental model is:

1. `SchemaRenderer` is the explicit root boundary
2. `RenderNodes` normalizes raw schema input into compiled nodes and handles fragment-local rendering concerns
3. `NodeRenderer` executes one compiled node against the current scope and runtime
4. the concrete renderer component receives already-resolved inputs plus ambient runtime contexts

Expanded flow:

```text
JSON schema
  -> RendererRegistry resolves `schema.type`
  -> SchemaCompiler classifies fields as meta / prop / region / event / value-or-region
  -> compiled node tree
  -> SchemaRenderer creates runtime + page runtime + root scope + root action scope + root component registry
  -> RenderNodes picks the current child scope / fragment scope
  -> NodeRenderer resolves node meta and props against that scope
  -> NodeRenderer builds regions, events, helpers, and node identity context
  -> concrete renderer runs
```

Practical ownership split:

- compilation decides what each field means
- runtime resolution decides what each dynamic field evaluates to now
- `NodeRenderer` assembles the final renderer contract
- owner renderers such as `form` create descendant runtime boundaries

## NodeRenderer Responsibilities

`NodeRenderer` is the single-node execution orchestrator. Its current responsibilities are:

- resolve `meta` from the current node and scope
- resolve `props` from the current node and scope
- subscribe selectively so unrelated scope writes do not recompute unrelated nodes
- build `events` from declarative event fields
- build region handles for child schema
- create stable `helpers`
- execute node-local optional provider closures such as class-alias publication
- synchronously install compiled import-owned capability boundaries from preloaded import data
- dispatch node lifecycle actions
- invoke the concrete renderer component

It is intentionally not the owner of every runtime boundary in the tree.

`NodeRenderer` does not own:

- page runtime creation
- form runtime creation
- fragment child scope creation for `render({ data })`
- dialog / drawer surface runtime ownership

Those boundaries belong to the concrete creator path that introduces them.

## Renderer Component Contract

Renderer components receive:

```ts
interface RendererComponentProps<S extends BaseSchema = BaseSchema> {
  id: string;
  path: SchemaPath;
  schema: S;
  templateNode: TemplateNode<S>;
  node: NodeInstance<S>;
  props: Readonly<Record<string, unknown>>;
  meta: ResolvedNodeMeta;
  regions: Readonly<Record<string, RenderRegionHandle>>;
  events: Readonly<Record<string, RendererEventHandler | undefined>>;
  helpers: RendererHelpers;
}
```

Meaning:

- `schema` is the declared source shape
- `templateNode` is the immutable structural definition produced at compile time; `templateNode.component` carries the resolved `RendererDefinition` directly
- `node` is the live runtime `NodeInstance` for this mounted node; `node.cid` is the unique live mounted-node id used by DOM/debugger/registry lookup
- `props` is the resolved runtime prop object for the current render
- `meta` is the resolved node meta such as visibility or disabled state
- `meta.testid` is the resolved testid for `data-testid` attribute output on the root element
- `schema.frameWrap` is the per-instance override for `RendererDefinition.wrap`; it can suppress wrapping or switch wrap-compatible renderers to grouped `<fieldset>` layout
- `regions` is the map of precompiled child render handles
- `events` is the map of runtime event handlers derived from declarative event fields
- `helpers` exposes stable imperative runtime helpers
- `templateNode.lifecycleActions` carries compiled `onMount` / `onUnmount` actions when the schema declares them

## Renderer-Level Static Metadata

`RendererDefinition` is not only the runtime component-registration record.
It is also the normative place for ordinary renderer static metadata.

Typical renderer-level metadata needs include:

- display name, icon, and category for discovery/palette tooling
- static property metadata for inspector/editor tooling
- instance-targeted capability metadata for `component:<method>` authoring and diagnostics
- layout hints or placement metadata for future builder tooling

Important boundary:

- ordinary renderer metadata belongs on `RendererDefinition`
- host/domain manifest envelope belongs on `RendererDefinition.hostContract`
- do not turn ordinary renderers into host-family manifests

Renderer classification rule:

- `instance-renderer`: no new semantic owner boundary, no `hostContract`
- `flux-owner-renderer`: owns Flux-native semantic or interaction state, may publish local summaries and component capabilities, but still no `hostContract`
- `domain-host-renderer`: defines `hostContract`, publishes readonly host projection and namespaced host capabilities for inner schema

This classification is about ownership/publication boundary, not about whether a component looks visually simple or complex.

Important clarification:

- `domain-host-renderer` identifies the owner class, not automatic whole-subtree namespace visibility
- actual host capability visibility still follows manifest publication attribution and explicit render boundaries such as `render({ actionScope })`

Recommended direction:

```ts
interface RendererPropContract {
  shape: FluxValueShape;
  displayName: string;
  description?: string;
  editorType?: string;
  defaultValue?: unknown;
}

interface RendererCapabilityContract {
  handle: string;
  displayName: string;
  description?: string;
  args?: FluxValueShape;
  result?: FluxValueShape;
}
```

The key rule is that renderer-level contracts may reuse `FluxValueShape` as the shared structural contract IR, while still remaining renderer metadata rather than host manifests.

Current implementation baseline:

- `packages/flux-core/src/types/renderer-core.ts` now defines `rendererClass`, `rendererTraits`, `propContracts`, `eventContracts`, `componentCapabilityContracts`, and `scopeExportContracts` directly on `RendererDefinition`
- `packages/flux-core/src/types/renderer-authoring-contract.ts` provides the tooling-facing `ResolvedAuthoringContract` adapter over those fields
- current pilot metadata is wired for `button`, `form`, `crud`, and `designer-page`

Authoring/runtime split reminder:

- `propContracts` and tooling `editableProps` describe authored schema fields
- runtime `RendererComponentProps['props']` remains the resolved render-time value bag
- `scopeExportContracts` describes narrow readonly Flux-native exports such as `$form` and `$crud`; it is not host projection
- `hostContract` remains host-only and should appear only on `domain-host-renderer`

Representative mapping:

- `button` -> `instance-renderer`
- `form` -> `flux-owner-renderer` + `semantic-owner`
- `table` -> `flux-owner-renderer` + `interaction-owner`
- `crud` -> `flux-owner-renderer` + `composite`
- `designer-page`, `report-designer-page`, `spreadsheet-page`, `word-editor-page` -> `domain-host-renderer` + `workbench-shell`

Important boundary for `domain-host-renderer` + `workbench-shell` families:

- they share the host-manifest / host-projection / namespaced-action / `WorkbenchShell` pattern
- they do **not** imply one universal workbench schema or one shared baseline type for visible UI composition
- each host family owns its own built-in default UI and its own explicit override surfaces
- tooling may later consume those per-family override contracts, but runtime should not assume a cross-family ambient "workbench registry" or one canonical host-page baseline object

Cross-reference:

- `docs/architecture/capability-contract-model.md`
- `docs/architecture/capability-projection-manifest.md`

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

This split matches actual ownership and change frequency better than either "everything by props" or "everything by hooks".

### `props` versus `meta`

`props` and `meta` are both resolved by runtime, but they serve different purposes.

- `props` contains the node's business-facing runtime values such as `label`, `options`, `placeholder`, `name`, or `items`
- `meta` contains node control state and outer-frame information such as `visible`, `hidden`, `disabled`, `className`, `testid`, or `cid`

Quick rule:

- if the concrete component needs it as a normal input, it is usually in `props`
- if the runtime needs it to control the node or its outer wrapper, it is usually in `meta`

### Per-Slot ClassName Props

Layout container renderers (page, container, form, fieldset, tabs) support per-slot `className` props that route Tailwind classes to inner slot wrappers (`data-slot` elements) instead of the root element.

- `props.meta.className` targets the root element (`.nop-page`, `.nop-container`, `.nop-form`, `.nop-fieldset`, `.nop-tabs`)
- Per-slot props like `bodyClassName`, `headerClassName`, etc. target the corresponding inner `data-slot` wrapper

| Renderer | Slot Prop | Target |
|----------|-----------|--------|
| Page | `bodyClassName`, `headerClassName`, `footerClassName`, `toolbarClassName` | `page-body`, `page-header`, `page-footer`, `page-toolbar` |
| Container | `bodyClassName`, `headerClassName`, `footerClassName` | `container-body`, `container-header`, `container-footer` |
| Form | `bodyClassName`, `actionsClassName` | `form-body`, `form-actions` |
| Fieldset | `bodyClassName`, `titleClassName` | `fieldset-body`, `fieldset-title` |
| Tabs | `contentClassName`, `toolbarClassName` | `tabs-content`, `tabs-toolbar` |

All slot className props are optional. When omitted, no class is emitted. See `docs/architecture/container-spacing-design.md` for the full per-slot className reference.

Current orchestration boundary note:

- `NodeRenderer` remains the orchestration boundary for compiled-node resolution, lifecycle dispatch, import/capability setup, and final renderer invocation.
- `NodeRenderer` should not remain a generic creator for every possible descendant boundary. Data scope and owner runtime creation belong to the concrete creator path such as fragment rendering, page/form owners, and surface hosts.
- Compiler-owned node-local optional boundaries may still be precompiled as node-local closures when the boundary truly belongs to the node itself, such as node-local `classAliases` publication or `xui:imports`-driven capability setup.
- The React runtime should execute those node-local closures directly instead of re-deriving generic provider structure from scattered runtime props.
- Effect helpers such as lifecycle dispatch, render-monitor wiring, and narrow boundary execution can still be extracted when they reduce file-level complexity without moving ownership into renderers that do not actually own that boundary.

## `page` -> `form` -> `input` Walkthrough

The cleanest way to understand props versus context is to follow a typical nested render path.

Example schema shape:

```json
{
  "type": "page",
  "body": [
    {
      "type": "form",
      "body": [
        {
          "type": "input-text",
          "name": "userName",
          "label": "User Name"
        }
      ]
    }
  ]
}
```

### Step 1: page

At the root, `SchemaRenderer` creates:

- renderer runtime
- page runtime
- root render scope
- root action scope
- root component registry

The compiled `page` node is then passed to `NodeRenderer`.

The concrete `page` renderer mainly consumes explicit renderer props:

- `props.regions.body`
- `props.regions.header`
- `props.regions.footer`
- `props.meta.className`
- `props.meta.testid`

This is a good example of a renderer that mostly just consumes resolved inputs and renders regions.

### Step 2: form

When `page` renders its `body` region, `RenderNodes` renders the child `form` node under the inherited page scope.

The concrete `form` renderer still receives explicit renderer props such as:

- `props.regions.body`
- `props.regions.actions`
- `props.events.submitAction`
- `props.node.validation`

But `form` is also an owner renderer. It creates a new `FormRuntime` and publishes:

- `FormContext`
- a new active child `ScopeContext` pointing at `form.scope`

This is the key boundary transition: descendants of the form now read and write through form-owned scope and form runtime, not directly through the page root scope.

### Step 3: input

When the form body region renders an `input-text` node, `NodeRenderer` again resolves the node and calls the input renderer.

The input renderer typically consumes explicit node-local inputs from props:

- `props.props.name`
- `props.props.placeholder`
- `props.meta.disabled`
- `props.props.label` or a renderer-owned `regions.label` contract when that renderer models label as value-or-region

But it reads ambient form/runtime services through hooks:

- `useCurrentForm()`
- `useRenderScope()`
- form controller hooks such as `useFormFieldController(...)`

That means:

- field configuration comes from renderer props
- field state, validation state, and write-back behavior come from context-backed hooks

This split is what lets ordinary renderers stay small while still participating in the full low-code runtime.

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

- lifecycle actions are compiled onto `TemplateNode.lifecycleActions`
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
function useRenderInstancePath(): readonly InstanceFrame[] | undefined;
function useCurrentActionScope(): ActionScope | undefined;
function useCurrentComponentRegistry(): ComponentHandleRegistry | undefined;
function useScopeSelector<T, S = Record<string, unknown>>(selector: (scopeData: S) => T, equalityFn?: (a: T, b: T) => boolean, options?: { enabled?: boolean; fallback?: T }): T;
function useOwnScopeSelector<T, S = Record<string, unknown>>(selector: (scopeData: S) => T, equalityFn?: (a: T, b: T) => boolean): T;
function useRendererEnv(): RendererEnv;
function useActionDispatcher(): RendererRuntime['dispatch'];
function useCurrentForm(): FormRuntime | undefined;
function useCurrentFormErrors(query?: FormErrorQuery): ValidationError[];
function useCurrentFormError(query: FormErrorQuery): ValidationError | undefined;
function useCurrentFormState<T>(selector: (state: FormStoreState) => T, equalityFn?: (a: T, b: T) => boolean, options?: { enabled?: boolean; path?: string }): T;
function useCurrentFormFieldState(path: string, query?: FormErrorQuery): FormFieldStateSnapshot;
function useValidationNodeState(path: string): FormFieldStateSnapshot;
function useFieldError(path: string): ValidationError | undefined;
function useOwnedFieldState(path: string): FormFieldStateSnapshot;
function useChildFieldState(path: string): FormFieldStateSnapshot;
function useAggregateError(path: string): ValidationError | undefined;
function useCurrentPage(): PageRuntime | undefined;
function useCurrentSurfaceRuntime(): SurfaceRuntime | undefined;
function useCurrentNodeMeta(): {
  id: string;
  path: SchemaPath;
  type: string;
  cid?: number;
  templateNode: TemplateNode;
  node: NodeInstance;
};
function useCurrentNodeInstance(): NodeInstance | undefined;
function useStructuralLoopContext(): StructuralLoopRenderContext | undefined;
function useRenderFragment(): RendererHelpers['render'];
function useCurrentFormModelGeneration(): number;
function useCurrentValidationScope(): ValidationScopeRuntime | undefined;
function useDataSourceStatus(path: string, options?: { enabled?: boolean }): DataSourceStatusSummary | undefined;
```

Current scope-hook semantics are:

- `useScopeSelector()` subscribes to the lexical-scope-visible snapshot, so child renderers react when parent scope data changes.
- `useOwnScopeSelector()` subscribes only to the current scope's own snapshot, for paths that intentionally ignore parent-scope churn.
- `readOwn()` remains a current-layer-only API; selector inheritance should come from hook choice, not hidden fields on own snapshots.

Form-specific hooks such as `useCurrentFormErrors`, `useCurrentFormError`, `useCurrentFormState`, `useCurrentFormFieldState`, `useValidationNodeState`, `useFieldError`, `useOwnedFieldState`, `useChildFieldState`, `useAggregateError`, and `useCurrentFormModelGeneration` also exist and are part of the active form integration surface.

Current form-hook implementation note:

- `useCurrentFormState`, `useCurrentFormFieldState`, and `useFieldError` now share named subscription helpers in `packages/flux-react/src/hook-subscriptions.ts`.
- `useCurrentFormState(..., { path })` is the active path-aware subscription surface for single-path value reads; callers that only need one form value should prefer it over whole-store subscriptions.

## Regions And Fragment Rendering

Local schema rendering should prefer region handles over raw child schema whenever possible.

Region handle shape:

```ts
interface RenderRegionHandle {
  key: string;
  templateNode: TemplateNode | TemplateNode[] | null;
  /** Declared slot parameter names for parameterized regions (e.g. ['item', 'index']). */
  params?: readonly string[];
  /**
   * Render the region, optionally injecting slot bindings and instance path.
   * For parameterized regions (params declared), bindings are published under
   * the reserved $slot frame rather than flattened into top-level scope.
   */
  render(options?: {
    scope?: ScopeRef;
    bindings?: Record<string, unknown>;
    instancePath?: readonly InstanceFrame[];
    scopeKey?: string;
    isolate?: boolean;
    pathSuffix?: string;
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    ownerNodeInstance?: NodeInstance;
  }): React.ReactNode;
  /**
   * @deprecated Use render() instead. Kept for back-compat on non-parameterized regions.
   */
  instantiate(options?: {
    scope?: ScopeRef;
    bindings?: Record<string, unknown>;
    instancePath?: readonly InstanceFrame[];
  }): React.ReactNode;
}
```

Why this is preferred:

- child schema is compiled once into `TemplateNode` trees
- the handle is already bound to the current runtime model
- scope creation and path tracking stay consistent
- monitor and debug behavior remain centralized

Rules:

- `bindings` is optional convenience input for creating a child scope when the caller wants to inject local values
- `scope` is for callers that already created the right scope explicitly
- renderers should not pass both `scope` and `bindings` unless the child-scope merge rule is well-defined for that region
- repeated renderers should prefer explicit `instancePath` plus stable-key-derived bindings over index-only conventions
- `instancePath` is the full absolute repeated-instance path for the instantiated child subtree, not an owner-relative suffix

Normative rule:

- use `render({ bindings, instancePath })` as the primary API
- use `scope` only when the caller already owns the right child scope
- treat `data` and `instantiate()` as compatibility carriers rather than the preferred contract
- treat `scopeKey` as an advanced/internal child-scope reuse hint, not the primary repeated-identity contract

`instancePath` and stable bindings are the primary repeated rendering contract. `scopeKey` may still exist for scope/cache reuse, but should not be presented as the author-facing identity model.

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

### Pattern 2: render with local data override (parameterized region)

```tsx
function ListRenderer(props: RendererComponentProps<ListSchema>) {
  const items = props.props.items as unknown[];

  return (
    <div>
      {items.map((item, index) => (
        <div key={String((item as { id?: string }).id ?? index)}>
          {props.regions.item?.render({
            bindings: { item, index },
            instancePath: [{ repeatedTemplateId: 'list.item', instanceKey: String((item as { id?: string }).id ?? index) }]
          })}
        </div>
      ))}
    </div>
  );
}
```

When `params` is declared on the region (e.g. `params: ['item', 'index']`), the `bindings` values are published under the reserved `$slot` frame (`$slot.item`, `$slot.index`) rather than flattened into the parent scope. Schema authors access them as `${$slot.item.name}`.

For non-parameterized regions, `render()` behaves identically to the legacy `instantiate()`. `instantiate()` is retained for back-compat but deprecated.

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
| `xui:imports`-driven import boundary | Import-owned node boundary | `NodeRenderer` creates import-owned `ActionScope` and executes import wiring | Introduces import-owned lexical boundary. `xui:imports` always creates a child `ActionScope` for imported namespace providers; `ImportStack` separately owns alias frames and expression bindings |
| Fragment child data scope | Fragment render path (`RenderNodes`) | Created inside `RenderNodes` when `options.data` is passed | Not `NodeRenderer`'s responsibility |
| Page data scope + `PageRuntime` | Page owner/renderer | Created by page renderer/host at mount | Published via `PageContext` |
| Form data scope + `FormRuntime` | Form owner/renderer | Created by form renderer at mount | Published via `FormContext`; form scope is the active child scope for form children |
| Dialog surface scope + `SurfaceRuntime` | Dialog host/renderer | Created per opened dialog entry | `SurfaceRuntime`/`SurfaceStore` shared with drawer; `page` store is NOT reused |
| Drawer surface scope + `SurfaceRuntime` | Drawer host/renderer | Created per opened drawer entry | Same `SurfaceRuntime`/`SurfaceStore` model as dialog, `kind: 'drawer'` |
| `ActionScope` (host-level) | Host owner (e.g. `designer-page`) | Created at host lifecycle | Capability lexical scope for namespaced actions; not equivalent to host projection |
| `ComponentHandleRegistry` | Form renderer (or other explicit boundary owner) | Created by form renderer at mount | Instance-target lookup boundary for mounted component handles; not equivalent to `ActionScope` |
| `ImportFrame` / `ImportStack` | Runtime import boundary | Pushed/popped during import-owned node lifecycle | Alias visibility and import lifetime only; not a replacement for `ActionScope` or `ScopeRef` |

Rules derived from this table:

- `classAliases` remains a compiled node-local provider closure executed by `NodeRenderer`.
- `xui:imports` is a separate import-owned boundary rule: `NodeRenderer` creates a child `ActionScope` whenever the node declares imports, but this is not derived from renderer `actionScopePolicy` and not encoded as renderer-owned provider metadata.
- Data scope, page/form runtime, and surface state are **creator-owned boundaries**: each is created and published by the concrete owner, not by a generic `NodeRenderer` provider layer.
- `dialog` and `drawer` share one `SurfaceRuntime`/`SurfaceStore` model. `page` runtime/store is NOT the owner of dialog/drawer state.
- `NodeRenderer` does not create or re-publish page, form, fragment data scope, or surface runtime. It only executes the node-local compiled closure and calls the concrete renderer.
- `Host Projection`, `ActionScope`, `ComponentHandleRegistry`, and `ImportFrame` are separate boundary types. One owner may publish more than one, but runtime/docs must not collapse them into one generic stack concept.

Common reading shortcut:

- `RendererRuntime`, `PageRuntime`, and root `SurfaceRuntime` are host-created runtime boundaries
- `type: 'page'` and `type: 'form'` are schema node types rendered inside that runtime environment
- `FormRuntime` is a renderer-created runtime boundary introduced by the concrete `form` owner

For a newcomer-oriented explanation of how these layers fit together, see `docs/references/runtime-and-renderer-faq.md`.

## Node Context Convergence

React integration should converge on one ambient node carrier context for the currently executing node instance.

That carrier owns:

- the current `NodeInstance`
- access to current node meta helpers such as `useCurrentNodeMeta()`
- fragment-owner fallback and helper creation when a subtree needs owner identity

Rule:

- React host implementations may choose the concrete context type/name
- Flux architecture should describe one node carrier, not parallel competing ambient node-identity stories

## Render Context Split

The React layer should not collapse all runtime and render state into one giant context.

Normative split context areas are:

- runtime context
- scope context
- action-scope context
- component-registry context
- node-instance context (single carrier for current node identity)
- form context
- page context
- surface context
- validation context (carries `ValidationScopeRuntime` for `useCurrentValidationScope`)
- import-frame context (carries `ImportFrame` for import boundary alias visibility)
- class-aliases context (carries merged `ClassAliasesMap` for renderer className resolution)
- structural-loop context (carries `StructuralLoopRenderContext` for loop iteration metadata)
- render-instance-path context (carries `InstanceFrame[]` for nested renderer instance tracking)

Why:

- runtime is mostly stable
- scope and form state change more frequently
- split context boundaries reduce unrelated rerenders
- node identity uses one unified carrier instead of parallel ambient node contexts

## Local Render Options

Fragment rendering accepts explicit local overrides.

Normative contract:

```ts
interface RenderFragmentOptions {
  /** @deprecated Use `bindings` instead. */
  data?: object;
  bindings?: Record<string, unknown>;
  scope?: ScopeRef;
  instancePath?: readonly InstanceFrame[];
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  ownerNodeInstance?: NodeInstance;
  scopeKey?: string;
  isolate?: boolean;
  pathSuffix?: string;
}
```

The active React layer now carries three separate execution lookups through explicit boundaries:

- `ScopeRef` for data lookup and updates
- `ActionScope` for namespaced action resolution such as `designer:export`
- `ComponentHandleRegistry` for instance-targeted capability invocation such as `component:submit`

And one related import-visibility layer:

- `ImportFrame` / `ImportStack` for lexical imported alias visibility such as `$demo.formatName(...)`

This document only describes how React render boundaries carry those execution contexts. The resolution model, lexical-visibility rules, and `xui:imports` provisioning semantics belong to `docs/architecture/action-scope-and-imports.md`.

Node-local capability boundaries should be created by the owner that actually introduces them.

Normative baseline:

- fragment `render({ data })` creates the child data scope in the fragment render path itself
- page and form renderers/owners create and publish their own data/runtime boundaries
- node-local `xui:imports` boundaries create an import-owned child `ActionScope` plus import-frame wiring for that node; this remains distinct from renderer-owned `actionScopePolicy` and does not imply host projection or component-registry boundaries
- component registries should be created only by the concrete owner that needs a new registry boundary, not by every node pre-emptively

Representative uses:

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

Normative root props are:

```ts
interface SchemaRendererProps {
  schema: SchemaInput;
  schemaUrl: string;
  data?: Record<string, any>;
  env: RendererEnv;
  formulaCompiler: FormulaCompiler;
  registry?: RendererRegistry;
  plugins?: RendererPlugin[];
  pageStore?: PageStoreApi;
  surfaceRuntime?: SurfaceRuntime;
  moduleCache?: ModuleCache;
  parentScope?: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  onRuntimeChange?: (runtime: RendererRuntime | null) => void;
  onComponentRegistryChange?: (componentRegistry: ComponentHandleRegistry | null) => void;
  onActionScopeChange?: (actionScope: ActionScope | null) => void;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}
```

Root lifecycle callbacks exist for host tooling integrations such as the debugger panel:

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

Normative baseline:

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

Table- and CRUD-like renderers are also the representative example for instance-targeted capability metadata.

Examples of instance-targeted capabilities:

- `component:refresh`
- `component:getSelection`
- `component:setSelection`

Those capabilities should be described as renderer/component metadata and resolved through `ComponentHandleRegistry`, not modeled as host-family manifest methods.

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
