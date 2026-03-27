# Action Scope And Imports

## Purpose

This document defines the future extension model for non-built-in actions and declarative external library imports.

Use it when:

- extending the action system for complex domain hosts such as flow-designer or report-designer
- introducing declarative external library imports through `xui:import`
- deciding how schema fragments should invoke host or imported capabilities
- changing the boundary between data scope, action dispatch, and host runtime bridges

This document replaces the earlier lexical-scope-method-dispatch proposal. The active direction is not to turn `ScopeRef` into a general method table, but to add a separate action-scope layer that keeps data lookup and behavior lookup distinct.

It also defines a separate component-targeted invocation model for actions that need to locate a specific rendered component instance by `componentId` or `componentName` and invoke an explicitly exposed capability such as form submission.

## Current Baseline

The active runtime today has these properties:

- `ScopeRef` is a data scope, not a behavior registry; see `packages/flux-runtime/src/scope.ts`
- actions are dispatched by a centralized built-in dispatcher keyed by `action.action`; see `packages/flux-runtime/src/action-runtime.ts:70`
- `ActionSchema` uses `action: string` and optional structured fields such as `args?: Record<string, SchemaValue>`; see `packages/flux-core/src/index.ts:847`
- React renderers can only change descendant scope explicitly through fragment render options such as `render({ scope })` or `render({ data })`; see `packages/flux-react/src/index.tsx:195` and `packages/flux-react/src/index.tsx:202`
- flow-designer and report-designer architecture already assume `schema reads fixed host scope snapshot` and `writes go through namespaced actions or a bridge dispatch API`; see `docs/architecture/flow-designer/design.md:192` and `docs/architecture/report-designer/design.md:292`

Those constraints mean the extension model must preserve:

- data scope semantics
- namespaced action semantics
- explicit component instance targeting when a caller must reach one specific renderer instance
- explicit host-scope rendering boundaries
- pure domain-core package boundaries

## Problem

The current action model is effective for platform actions such as:

- `setValue`
- `ajax`
- `dialog`
- `closeDialog`
- `refreshTable`
- `submitForm`

But it becomes awkward for complex domain hosts and imported libraries because:

- every new domain action tends to push more logic toward a centralized dispatcher
- complex hosts often end up with direct imperative calls in renderer code instead of going through the schema action pipeline
- external library capabilities have no first-class declarative import and invocation model
- action authors sometimes need to reach one specific component instance such as a form, table, or designer shell by id or name
- data scope and behavior lookup are currently forced through unrelated mechanisms

Flow-designer already demonstrates the pressure point. The current renderer has direct `core.*` calls for canvas and palette behavior in `packages/flow-designer-renderers/src/index.tsx:154`, `packages/flow-designer-renderers/src/index.tsx:226`, and nearby code, while the documented target architecture prefers `designer:*` actions or bridge dispatch.

## Main Design Rule

Keep two distinct lookup systems:

- data scope resolves values such as `${doc.name}` or `${activeNode.id}`
- action scope resolves callable namespaces such as `designer.addNode` or `demo.open`

And add a third explicit targeting mechanism:

- component registry resolves one specific rendered component instance such as `componentId: userForm`

Do not overload `ScopeRef` so that one mechanism must serve both roles.

## Non-Goals

This design does not attempt to:

- migrate built-in platform actions into a generic scope method table
- let domain cores such as `@nop-chaos/flow-designer-core` depend on `ScopeRef`
- introduce implicit bare-name override semantics such as `save` shadowing `save`
- make action visibility depend on sibling render order
- allow arbitrary remote JavaScript execution without a controlled loader boundary

## Core Concepts

### Data Scope

Current `ScopeRef` remains the data lookup and update mechanism.

It keeps current semantics:

- path lookup along the parent chain via `get(path)`
- own-scope writes via `update(path, value)`
- optional merged-object materialization via `read()`

It must not become the main registry for arbitrary callable behaviors.

### Action Scope

`ActionScope` is a new runtime layer for behavior lookup.

It resolves namespaced actions that are not built-in platform actions.

Recommended shape:

```ts
interface ActionScope {
  id: string;
  parent?: ActionScope;
  resolve(actionName: string): ResolvedActionHandler | undefined;
  registerNamespace(namespace: string, provider: ActionNamespaceProvider): void;
  unregisterNamespace(namespace: string): void;
  listNamespaces?(): readonly string[];
}

interface ResolvedActionHandler {
  namespace: string;
  method: string;
  provider: ActionNamespaceProvider;
  sourceScopeId: string;
}

interface ActionNamespaceProvider {
  invoke(method: string, payload: Record<string, unknown> | undefined, ctx: ActionContext): Promise<ActionResult> | ActionResult;
  dispose?(): void;
  listMethods?(): readonly string[];
}
```

### Host Bridge

Complex domain hosts should continue to expose a bridge, not their internal store implementation.

For example, flow-designer should keep a bridge shaped like the documented `DesignerBridge` in `docs/architecture/flow-designer/api.md:98`, and spreadsheet/report designer should keep typed command dispatch contracts such as those described in `docs/architecture/report-designer/contracts.md:314`.

The action-scope layer sits on top of that bridge and maps namespaced actions to bridge commands.

### Component Handle Registry

Some actions are not best expressed as host-scoped namespace lookup. They need to locate one concrete rendered component instance by `componentId` or `componentName` and invoke an explicitly exposed capability.

Common examples:

- submit a specific form instance
- refresh a specific table instance
- export a specific designer shell
- focus or open a specific widget instance

This requires a separate registry for component handles.

Recommended shape:

```ts
interface ComponentHandleRegistry {
  register(handle: ComponentHandle): void;
  unregister(handle: ComponentHandle): void;
  resolve(target: ComponentTarget): ComponentHandle | undefined;
}

interface ComponentTarget {
  componentId?: string;
  componentName?: string;
}

interface ComponentHandle {
  id?: string;
  name?: string;
  type: string;
  capabilities: ComponentCapabilities;
}

interface ComponentCapabilities {
  store?: unknown;
  invoke(method: string, payload: Record<string, unknown> | undefined, ctx: ActionContext): Promise<ActionResult> | ActionResult;
  hasMethod?(method: string): boolean;
  listMethods?(): readonly string[];
}
```

`store` is optional metadata, not the public contract. The public contract is the explicitly exposed capability surface.

### Store Versus Capability

A component may have a store, a runtime object, both, or neither.

Examples:

- form has `FormRuntime` and a store-backed state model
- page has `PageRuntime` and a store-backed state model
- flow-designer host has a bridge and a graph runtime, but the public capability should still be exposed through a handle rather than leaking its entire internal state object
- some widgets may expose useful methods such as `focus()` or `open()` without having a meaningful public store at all

Because of that, the design must not assume:

- every addressable component has a store
- every store method is safe to expose externally
- a missing explicit handler should automatically fall through to arbitrary store method invocation

Instead, each component handle must explicitly map the methods it chooses to expose.

### Why Not Fall Through To Store Methods

Automatic fallback from special cases to arbitrary store methods looks convenient, but it creates an unstable public boundary.

Problems:

- not every component has a store
- store methods often include internal mutation helpers that should not become schema-callable API
- callers cannot know which store methods are stable contracts versus implementation details
- monitoring, permissions, validation, and error handling become inconsistent

Therefore the rule is:

- a component may optionally attach its store to the handle for diagnostics or specialized host code
- externally callable behavior must still be explicitly surfaced through `capabilities.invoke()`
- no implicit fallback from unknown method name to `handle.store[method]`

### `xui:import`

`xui:import` is a declarative dependency import mechanism for action namespaces.

It is intentionally modeled after import semantics:

- declaration-oriented, not event-oriented
- independent of sibling order
- repeatable and idempotent
- actually loaded once per normalized import key
- visible by scope, not by render sequence

It is not a normal imperative node whose meaning depends on whether it renders before another sibling.

## Why Not Lexical Method Dispatch On `ScopeRef`

The earlier lexical-method idea identified a real pain point, but it is not the right main mechanism here.

Reasons:

- current `ScopeRef` in `packages/flux-runtime/src/scope.ts:128` is a data contract, not a behavior contract
- React fragment scope replacement is explicit, so hidden method shadowing would be hard to reason about
- flow/report designer docs already standardize on namespaced actions and bridge dispatch, not implicit bare method lookup
- package boundaries would be damaged if domain cores had to register methods on `ScopeRef`

The active design therefore keeps namespaced action lookup explicit and separate.

## Action Resolution Model

### Resolution Order

When an action is dispatched, runtime should resolve it in this order:

1. built-in platform action handled directly by the core dispatcher
2. namespaced action resolved from the current `ActionScope`
3. parent `ActionScope` chain lookup
4. not-found error with namespace and scope trace

This means built-in actions such as `ajax` and `submitForm` remain first-class runtime features, while `designer:addNode` or `demo.open` are delegated to the action-scope layer.

### Naming Rule

Use explicit namespaces.

Preferred examples:

- `designer:addNode`
- `designer:export`
- `spreadsheet:setCellValue`
- `report-designer:preview`
- `demo.open`
- `chart.render`

Do not make the design depend on implicit bare action names like `save` or `validate`.

For clarity, the preferred runtime action namespace separator is `:` for dispatched action names such as `designer:addNode` and `report-designer:preview`.

Imported library examples such as `demo.open` in this document describe namespace-plus-method intent, but the implementation should normalize on one dispatch syntax instead of mixing multiple separators at runtime.

### Built-In Versus Extended Actions

Built-in actions stay inside `action-runtime` because they are platform semantics.

Examples:

- data mutation in the current scope or form
- dialog stack control
- AJAX execution
- form submission

Extended actions should be delegated only when they are domain-specific or import-provided.

Examples:

- graph editing commands for flow-designer
- workbook/report editing commands for report-designer
- imported library capabilities such as `demo.open`

## Schema Shape

The current `ActionSchema` contract uses `action: string` and structured fields, not a separate `type` union.

The extension path should stay compatible with that model.

Recommended authoring shape:

```ts
interface ActionSchema {
  action: string;
  args?: Record<string, SchemaValue>;
  // existing fields remain valid
}
```

Examples:

```json
{
  "action": "designer:addNode",
  "args": {
    "nodeType": "task",
    "position": {
      "x": "${canvas.defaultX}",
      "y": "${canvas.defaultY}"
    }
  }
}
```

```json
{
  "action": "demo.open",
  "args": {
    "id": "${activeNode.id}",
    "mode": "inspect"
  }
}
```

`args` should continue to be object-shaped, not positional arrays. That keeps expression evaluation, future extensibility, and debugging aligned with the current schema runtime.

Runtime compatibility note:

- the dispatcher now evaluates `args` when present
- if `args` is omitted, namespaced actions also treat non-reserved top-level action fields as payload
- that compatibility path keeps existing schemas such as `{ action: 'designer:addNode', nodeType: 'task' }` working while newer shared docs can still prefer `args`

In practice this means both of the following are valid today:

```json
{
  "action": "designer:addNode",
  "nodeType": "task",
  "position": {
    "x": 160,
    "y": 120
  }
}
```

```json
{
  "action": "designer:addNode",
  "args": {
    "nodeType": "task",
    "position": {
      "x": 160,
      "y": 120
    }
  }
}
```

For component-targeted invocation, use `component:<method>` syntax:

```json
{
  "action": "component:submit",
  "componentId": "userForm"
}
```

```json
{
  "action": "component:validate",
  "componentId": "userForm"
}
```

```json
{
  "action": "component:refresh",
  "componentName": "ordersTable",
  "args": {
    "reason": "external-filter-changed"
  }
}
```

The method name is extracted from the action string after the `component:` prefix. Additional arguments are passed through `args` if needed.

## Action Scope Ownership

### Ownership Principle

`ActionScope` belongs to runtime hosts and import containers, not to pure domain cores.

That means:

- `designer-page` may create a designer action scope
- `report-designer-page` may create a report action scope
- an import-aware container may create an action scope for imported namespaces
- `@nop-chaos/flow-designer-core` and future spreadsheet core packages should not import `ScopeRef` or know about the action-scope protocol

Component handles follow the same ownership principle:

- handles are registered by runtime hosts or renderer instances
- pure domain cores do not register themselves in the UI registry directly
- registration lifecycle follows renderer mount/unmount ownership

### Bridge Mapping

Host renderers should expose action namespaces by adapting a bridge.

Example shape:

```ts
interface DesignerActionProviderInput {
  bridge: DesignerBridge;
}

function createDesignerActionProvider(input: DesignerActionProviderInput): ActionNamespaceProvider {
  return {
    async invoke(method, payload, ctx) {
      switch (method) {
        case 'addNode':
          return {
            ok: true,
            data: input.bridge.dispatch({
              type: 'addNode',
              nodeType: String(payload?.nodeType ?? ''),
              position: payload?.position as { x: number; y: number } | undefined
            })
          };
        case 'export':
          return {
            ok: true,
            data: input.bridge.dispatch({ type: 'export' as never })
          };
        default:
          return { ok: false, error: new Error(`Unknown designer method: ${method}`) };
      }
    }
  };
}
```

The important point is not the exact code, but the boundary:

- schema talks to namespaced actions
- the provider maps that to bridge commands
- the bridge talks to the domain runtime

### Component Handle Example

Form is the representative example for component-targeted invocation.

```ts
function createFormComponentHandle(form: FormRuntime): ComponentHandle {
  return {
    id: form.id,
    type: 'form',
    capabilities: {
      store: form.store,
      async invoke(method, payload) {
        switch (method) {
          case 'submit':
            return form.submit(payload?.api as never);
          case 'validate':
            return form.validateForm();
          case 'reset':
            form.reset(payload?.values as object | undefined);
            return { ok: true };
          case 'setValue':
            form.setValue(String(payload?.name ?? ''), payload?.value);
            return { ok: true };
          default:
            return { ok: false, error: new Error(`Unknown form method: ${method}`) };
        }
      }
    }
  };
}
```

The important rule is that `submit`, `validate`, `reset`, and `setValue` are explicit public capabilities. The caller is not permitted to assume that every property or method on the underlying store is externally callable.

## `xui:import` Design

### Semantics

`xui:import` behaves like import declaration semantics, not like sequential execution.

Rules:

- order-independent
- repeatable
- deduplicated by normalized import key
- scope-visible according to the container that declares it
- not tied to sibling render order

### Recommended Authoring Model

Prefer container-level imports rather than a body node with execution-like semantics.

Recommended shape:

```json
{
  "type": "container",
  "xui:imports": [
    { "from": "demo-lib", "as": "demo" }
  ],
  "body": [
    {
      "type": "button",
      "onEvent": {
        "click": {
          "actions": [
            { "action": "demo.open", "args": { "id": "${id}" } }
          ]
        }
      }
    }
  ]
}
```

This avoids the misleading impression that import success depends on whether the import node rendered before the button.

### Import Spec

Recommended minimal shape:

```ts
interface XuiImportSpec {
  from: string;
  as: string;
  options?: Record<string, SchemaValue>;
}
```

`from` should be a controlled module identifier, not an arbitrary untrusted URL.

### Import Loader

Recommended runtime boundary:

```ts
interface ImportedLibraryModule {
  createNamespace(context: ImportedNamespaceContext): Promise<ActionNamespaceProvider> | ActionNamespaceProvider;
}

interface ImportedLibraryLoader {
  load(spec: XuiImportSpec): Promise<ImportedLibraryModule>;
}
```

The loader may cache modules globally, but scope visibility is still controlled by the action-scope chain.

### Deduplication Rules

There are two distinct dedupe layers.

#### Module Load Dedupe

Equivalent import specs should load once.

Recommended cache key:

- normalized `from`
- normalized static loader options if they affect the module instance

Repeated declarations with the same normalized key should reuse the same pending or resolved load.

#### Scope Registration Dedupe

Even if a module loads once globally, each declaring action scope may register its own visible namespace facade.

This means:

- one module load can back many scope-local namespace registrations
- visibility remains lexical by container ownership, not globally ambient

### Namespace Collision Rules

Within the same action scope:

- same `from` + same `as` + equivalent options -> allowed and idempotent
- different `from` with the same `as` -> error
- different options with the same `as` but semantically different namespace behavior -> error unless an explicit merge rule exists

Across parent/child action scopes:

- child scopes may shadow parent namespaces deliberately
- the runtime must make the winning namespace debuggable

### Import Visibility

Import visibility is owned by the container that declares the import.

Recommended rule:

- all descendants of the declaring container can resolve that imported namespace through action-scope inheritance
- siblings do not gain access because one sibling happened to render first
- parent containers do not automatically see child imports

That produces stable behavior:

```text
PageActionScope
  â””â”€â”€ ContainerActionScope(namespaces: demo)
        â”œâ”€â”€ ButtonA -> demo.open
        â”œâ”€â”€ ButtonB -> demo.close
        â””â”€â”€ ChildPanel -> demo.validate
```

Imported namespaces and component-targeted handles are complementary:

- imports expose capabilities by namespace within an action scope
- component handles expose capabilities by instance identity through the component registry

Do not try to model imported library capabilities by pretending they are component instances, and do not force component instance invocation through generic namespace lookup when a caller needs one exact target.

## Runtime Integration

### Renderer Runtime Surface

The runtime will eventually need an action-scope-aware dispatch path, but the contract should remain consistent with the current `RendererRuntime.dispatch()` shape in `packages/flux-core/src/index.ts:881`.

One reasonable evolution path is:

```ts
interface ActionDispatchContext extends ActionContext {
  actionScope?: ActionScope;
}
```

or an equivalent internal mechanism where runtime can derive the current action scope from the active render host.

The key rule is:

- do not force all callers to know the full action-scope chain manually
- do make action-scope use explicit at host boundaries

The runtime will also need a component-target dispatch path for actions that identify `componentId` or `componentName`.

Recommended internal direction:

```ts
interface ActionRuntimeExtensions {
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
}
```

The concrete placement can evolve, but runtime must be able to:

- resolve namespaced actions through the current action scope
- resolve component-targeted actions through the current component registry
- keep both mechanisms available without making normal callers assemble these chains by hand

### React Integration

React integration must follow current explicit fragment rendering rules.

That means host renderers must explicitly render schema fragments with the correct host scope and, if introduced, the correct host action scope.

Current data-scope precedent already exists through `RenderRegionHandle.render(options)` and `helpers.render(..., options)` in `docs/architecture/renderer-runtime.md:163` and `docs/architecture/renderer-runtime.md:215`.

The same explicitness should hold for action-scope-aware subtrees.

Do not assume that creating an action scope inside a renderer automatically changes all descendants unless the renderer explicitly renders those descendants through that host boundary.

The same rule applies to component-target registration:

- renderer instances register handles during owned lifecycle
- descendant fragments only see those handles if they execute inside the same runtime host tree
- there is no hidden global ambient registry that bypasses renderer ownership

### Component-Targeted Action Resolution

Component-targeted actions use `component:<method>` syntax and are resolved separately from namespaced action lookup.

Recommended order:

1. built-in platform action
2. component-targeted action matching `component:<method>` pattern
3. namespaced action through `ActionScope`
4. not-found error

Execution model for `component:<method>`:

1. match action name against `component:<method>` pattern
2. extract method name from action string
3. locate the target component by `componentId` or `componentName`
4. validate that the component handle exposes the requested method
5. call `capabilities.invoke(method, payload, ctx)`
6. return a normal `ActionResult`

This keeps instance targeting and namespace targeting conceptually separate while providing a concise syntax.

## Flow-Designer Use

### What This Solves

Flow-designer needs schema-driven toolbar, inspector, dialog, and shortcut actions to reach a graph runtime bridge without exposing the raw graph store.

This design helps by:

- keeping `designer:*` as explicit namespaced actions
- allowing the host renderer to register a `designer` namespace provider on a local action scope
- letting toolbar/inspector schema fragments call `designer:*` actions through the normal action pipeline
- preserving the architecture rule that schema reads host snapshot but writes through commands
- still allowing other parts of the page to target one specific designer shell through a component handle when explicit instance addressing is needed

### What This Does Not Solve

It does not mean every pointer move or drag delta should go through action dispatch.

High-frequency canvas interactions still belong in the imperative canvas/bridge layer, which then emits normalized commands at stable boundaries.

### Recommended Flow-Designer Shape

- `designer-page` creates a designer bridge
- `designer-page` injects a fixed host data scope for `doc`, `selection`, `activeNode`, `activeEdge`, and runtime summary
- `designer-page` also owns a local action scope with the `designer` namespace provider
- toolbar, inspector, and dialog schema fragments are rendered explicitly inside that host boundary
- those fragments use `designer:*` actions, not direct `core.*` calls

This aligns with the existing bridge and fixed-host-scope intent in `docs/architecture/flow-designer/api.md:85` and `docs/architecture/flow-designer/design.md:192`.

## Report-Designer And Spreadsheet Use

The same pattern applies to spreadsheet and report-designer, but the provider should map to typed command buses rather than ad hoc free-form methods.

Examples:

- `spreadsheet:setCellValue`
- `spreadsheet:mergeRange`
- `report-designer:preview`
- `report-designer:updateMeta`

Component-targeted invocation is also useful here when multiple instances exist on one page and one caller must target a specific host by `componentId`.

This keeps the action model consistent with `docs/architecture/report-designer/design.md:303` and the typed command contracts in `docs/architecture/report-designer/contracts.md:314`.

## Security Model For Imports

`xui:import` must be a controlled capability system, not arbitrary script execution.

Rules:

- `from` should resolve through a trusted registry or loader policy
- imported modules should expose a constrained namespace provider API rather than raw ambient execution
- hosts may reject imports by policy, environment, or allowlist
- import failures should produce explicit runtime diagnostics

Do not treat this as equivalent to injecting a script tag.

## Lifecycle Rules

### Registration

Host and import namespace registration must be lifecycle-aware.

Rules:

- register when the owning host/container becomes active
- unregister when the owning host/container unmounts or is replaced
- call provider `dispose()` if present
- avoid registering from arbitrary render-phase code

### Loading States

Imported namespaces may be:

- `loading`
- `ready`
- `error`

Before a namespace is ready, runtime should either:

- return a structured action error on invocation
- or expose loading state to schema/UI so authors can disable controls

The runtime must not silently no-op.

Current implementation semantics:

- React-owned import registration installs a scope-local placeholder provider immediately during owned lifecycle, so namespaced dispatch can fail explicitly even before the module finishes loading
- dispatch against a still-loading namespace returns a normal failed `ActionResult` with an error message like `Imported namespace <alias> is still loading`
- loader failures and same-scope alias collisions are reported through `env.notify('error', ...)` and `monitor.onError(...)` during render-owned registration
- once a load fails, later dispatches against that namespace continue returning the stored failure instead of falling back to `Unsupported action` until the owning boundary is replaced
- import registrations remain reference-counted per action scope and are released on owning subtree unmount or replacement

## Diagnostics

Action monitoring should be extended so namespaced actions can be inspected clearly.

Useful fields include:

- original `action.action`
- resolved namespace
- resolved method name
- source action scope id
- whether the provider came from a host bridge or an imported library
- import/load state when relevant
- component target id or name when component-targeted invocation is used
- resolved component type when a component handle is invoked

This is necessary because debugging namespaced action resolution otherwise becomes opaque.

## Performance Guidance

- do not add speculative method-resolution caches until the ownership and invalidation model is real
- do cache module loads for normalized import specs
- prefer stable namespace provider instances per host/container lifecycle
- keep action-scope lookup simple exact-match resolution, not fuzzy search or dynamic inheritance rules
- keep component-target resolution explicit and indexed by stable ids/names rather than tree walking on every dispatch

## Migration Plan

### Phase 1: Introduce action-scope infrastructure

- define `ActionScope` and `ActionNamespaceProvider`
- keep `ScopeRef` unchanged as the data scope contract
- add runtime support for delegating non-built-in namespaced actions
- define `ComponentHandleRegistry` and explicit component-targeted invocation contracts

### Phase 2: Adopt in complex hosts

- adapt flow-designer host renderers to expose a `designer` namespace provider
- adapt future spreadsheet/report-designer hosts to expose `spreadsheet` and `report-designer` providers
- register explicit component handles for forms and other addressable component instances that need method invocation by id or name
- keep direct imperative host interaction only for high-frequency canvas/editor loops

### Phase 3: Add `xui:import`

- define import spec authoring
- add trusted module loader policy
- register imported namespaces on container-owned action scopes
- expose import loading/error diagnostics

## Decisions

The active decisions from this document are:

- preserve `ScopeRef` as data scope only
- add a separate action-scope layer for namespaced behavior lookup
- add a separate component-handle registry for instance-targeted capability lookup
- keep built-in platform actions centralized and explicit
- use namespaced actions for domain hosts and imported libraries
- do not treat store methods as automatically callable public API; components explicitly expose supported capabilities
- define `xui:import` with declaration-style import semantics: order-independent, repeatable, deduplicated, and scope-visible by container ownership

## Related Documents

- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/api.md`
- `docs/architecture/report-designer/design.md`
- `docs/architecture/report-designer/contracts.md`

