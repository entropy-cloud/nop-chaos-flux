# Template Instantiation And Node Identity

## Purpose

This document is the canonical architecture note for:

- compile-time template structure
- runtime node instances
- `cid` / live runtime node identity
- repeated-instance identity for table rows and future `type: 'loop'`
- the relationship between node state, scope, registry, debugger, and DOM markers

## Main Rule

Compile once into an immutable template graph, then instantiate that template graph many times at runtime.

If one table column/body DSL is structurally fixed, it should produce one compiled template result. Every row reuses that template and gets its own runtime instance state.

## Design Position

The architecture must separate these layers:

1. author schema
2. compiled template
3. runtime node instance
4. lexical data scope
5. live component-handle registry

Any design that lets one object behave as both "compiled node" and "live instance" will eventually break repeated rendering, debugger lookup, and performance reasoning.

## Terminology

### Recommended terms

- `templateNodeId`: the compiled identifier of a node inside a compiled template graph; globally unique within one `RendererRuntime` instance because all compilation calls share the same runtime-level counter
- `repeatedTemplateId`: the identifier of a repeated template boundary such as a table row template or loop body template
- `instanceKey`: the identity of one concrete repeated materialization
- `instancePath`: the chain of repeated instances from the runtime root to the current node
- `cid`: the compact live-node bridge token for DOM markers and registry lookup; equals `templateNodeId` for singleton nodes, and is unique per mounted node instance

### Retired terms

- `templateGraphId`: removed. `templateNodeId` is globally unique within one runtime so no graph qualifier is needed.
- `NodeLocator`: removed. The old `{ runtimeId, templateGraphId, templateNodeId, instancePath }` bundle added allocation and serialization overhead with no benefit over using `cid` and `instancePath` directly.

### About `cid`

In the current architecture, `cid` equals `templateNodeId`.

- `cid` is assigned from the `templateNodeId` that the compiler allocates at compile time
- `cid` identifies one live node instance at runtime via DOM and registry
- for singleton nodes `cid === templateNodeId`
- for repeated nodes each row/item instance carries the same `cid` (from the template) plus a distinct `instancePath` that makes it unique

## Core Artifacts

### 1. Author schema

Author schema is the declarative DSL input. It owns author intent only.

It does not own:

- compiled node ids
- runtime caches
- live instance identity

### 2. Compiled template

Compilation produces an immutable template graph.

```ts
type TemplateNodeId = number;
type RepeatedTemplateId = string;

interface CompiledTemplate {
  root: TemplateNode | readonly TemplateNode[];
  repeatedTemplates: ReadonlyMap<RepeatedTemplateId, RepeatedTemplate>;
}

interface TemplateNode {
  templateNodeId: TemplateNodeId;   // globally unique within one RendererRuntime
  id: string;
  type: string;
  schema: BaseSchema;
  templatePath: string;
  rendererType: string;
  component: RendererDefinition;    // resolved at compile time; no runtime registry lookup needed
  propsProgram: CompiledRuntimeValue<Record<string, unknown>>;
  metaProgram: CompiledSchemaMeta;  // same structure as CompiledSchemaNode.meta
  eventPlans: Readonly<Record<string, unknown>>;
  regions: Readonly<Record<string, TemplateRegion>>;
  scopePlan: ScopePlan;
  registryPlan?: RegistryPlan;
  validationPlan?: ValidationPlan;
}

interface TemplateRegion {
  key: string;
  path: string;
  node: TemplateNode | readonly TemplateNode[] | null;
}

interface RepeatedTemplate {
  repeatedTemplateId: RepeatedTemplateId;
  root: TemplateNode | readonly TemplateNode[];
  itemBindings: {
    item?: string;
    index?: string;
    key?: string;
    record?: string;
  };
}
```

`templateNodeId` uniqueness rule: all compilation calls within one `RendererRuntime` share a single counter. `templateNodeId` values are globally unique across pages, dialogs, and dynamic fragments compiled by the same runtime instance.

Template owns:

- structure
- compiled expressions/programs
- node ids
- template paths
- region topology
- static action lowering
- validation structure
- scope/registry creation plans
- resolved renderer definition reference

Template does not own:

- resolved values
- dependency caches
- mounted state
- form/page/dialog live objects
- row/item-specific state

### 3. Runtime instance

Instantiation materializes the template into live instances.

```ts
type InstanceKey = string;

interface InstanceFrame {
  repeatedTemplateId: RepeatedTemplateId;
  instanceKey: InstanceKey;
}

interface NodeInstance {
  cid: number;                             // equals templateNode.templateNodeId
  templateNode: TemplateNode;
  instancePath?: readonly InstanceFrame[]; // undefined for singleton nodes
  scope: ScopeRef;
  state: NodeState;
}

interface NodeState {
  metaState: Record<string, RuntimeProgramState>;
  propsState?: RuntimeProgramState;
  metaDependencies?: ScopeDependencySet;
  propsDependencies?: ScopeDependencySet;
  resolvedMeta?: unknown;
  resolvedProps?: unknown;
  mounted: boolean;
}
```

Runtime instance owns:

- current scope
- runtime evaluation state
- dependency caches
- last resolved props/meta
- mounted/unmounted lifecycle
- live form/page/dialog linkage
- live component handle

`NodeState` is execution/cache state only. It is not the authoritative carrier of structural identity.

### 4. Scope

`ScopeRef` stays purely lexical and data-oriented.

Scope owns:

- page/form data
- row/record/item/index/key bindings
- lexical lookup and updates
- change publication for dependency tracking

Scope does not own:

- compiled-node identity
- component-handle identity
- registry lookup

### 5. Registry

The component registry owns live capability lookup only.

Registry owns:

- live handle registration
- lookup by `cid`, `id`, or `name` within visible registry boundaries

Registry does not own:

- raw schema
- template compilation
- lexical data lookup
- locator serialization

## Identity Model

### Layer 1: Author selectors

- `id`
- `name`
- `testid`

These are authoring concepts, not canonical runtime addresses.

### Layer 2: Template identity

- `templateNodeId`
- `templatePath`
- `repeatedTemplateId`

These identify structure inside the compiled template. `templateNodeId` is globally unique within one runtime, so no graph qualifier is needed.

### Layer 3: Instance identity

- `cid` (equals `templateNodeId`)
- `instanceKey`
- `instancePath`

`instancePath` matters specifically for repeated materialization. For singleton nodes `instancePath` is `undefined`.

### Singleton optimization

The vast majority of nodes are singletons, not inside any repeated boundary. For these nodes `instancePath` must be `undefined`, not an empty array.

Canonical singleton rule:

- `undefined` is the canonical singleton representation
- an empty array must be normalized to `undefined`
- `[]` must not be treated as a distinct identity from `undefined`

## Compilation Model

### Compile once

```ts
interface SchemaCompiler {
  compile(schema: SchemaInput, options?: CompileSchemaOptions): CompiledTemplate;
}
```

Compilation should happen once per schema identity.

For a table:

- table node compiles once
- columns compile once
- cell/body/button regions compile once
- row body does not recompile per row

For a future `type: 'loop'`:

- loop body compiles once
- each item instantiates that one compiled body template

### templateNodeId global counter

`RendererRuntime` holds one shared `CompiledCidState` for its lifetime. All `compile()` calls use this shared counter by default. Compilation calls that explicitly pass their own `cidState` (such as dialog body compilation reusing the owner node's cidState) are still correct because the counter they draw from is the same runtime-level monotone.

This means:

- page nodes, dialog nodes, and dynamic fragment nodes all get distinct `templateNodeId` values
- no `templateGraphId` namespace qualifier is needed
- debugger and registry can use bare `templateNodeId` (= `cid`) as the stable key

### Static lowering

Compile-time lowering targets `_targetCid` directly.

Safe lowering:

- unique singleton `componentId` → `_targetCid: resolvedCid`

The compiler resolves `componentId` references within the same compiled schema to `_targetCid` at compile time. At runtime, the registry resolves `_targetCid` directly via `handlesByCid` without any locator serialization.

Unsafe lowering (do not do):

- global `componentName → templateNodeId`
- storing serialized locators in compiled action schemas

## Instantiation Model

### Instantiate many

```ts
interface RendererRuntime {
  // NodeRenderer internally constructs NodeInstance from TemplateNode + scope + state
}
```

Instantiation is the step that:

- binds the template node to a concrete scope
- allocates `NodeState`
- creates the `NodeInstance` with `cid = templateNode.templateNodeId`

Mount is the host step that:

- registers the `cid` in the component registry (for interactive nodes)
- writes `data-cid` to the DOM
- creates live handle/registry attachments for mounted interactive nodes

### Materialization lifecycle

The architecture distinguishes three layers:

1. semantic repeated item: an item identified by `instanceKey` and position inside repeated ownership logic
2. materialized runtime instance: a `NodeInstance` subtree currently instantiated by the runtime
3. mounted inspectable node: a materialized runtime instance that currently has mounted host output, a live `data-cid`, and registry/debugger visibility

Required rules:

- `cid` + `instancePath` describes semantic/runtime identity and may outlive a specific mounted DOM node
- `cid` exists only for a currently mounted inspectable node
- `NodeState` exists only for a currently materialized runtime instance
- component-handle registry entries exist only while the corresponding live instance is materialized and registered
- debugger and action resolution must distinguish `notMaterialized` from `notFound`

### Resolution result categories

Minimum categories:

- `resolved`: the live node instance is materialized and usable
- `notMaterialized`: the structural target is valid, but there is no current materialized instance
- `notFound`: the target identity itself is invalid in the current runtime/template context

### `cid` allocation policy

`cid` equals `templateNodeId`. It is assigned at compile time and carried through to the runtime instance.

Required rule:

- `cid` is unique within one runtime host tree (guaranteed by the runtime-level shared counter)
- uniqueness is required within one runtime instance, not as a process-global id space
- if tooling needs a wider debug key, it should compose `runtimeId + cid` by reading `data-runtime-id` from the DOM

### Runtime-assembled fragments

Remote or delayed fragments are compiled by the same runtime's shared counter. They receive globally unique `templateNodeId` values within that runtime automatically.

Steps:

1. compile the new fragment using the runtime's shared compiler
2. `NodeRenderer` instantiates it with the owner-provided `instancePath` / scope context

Template reuse remains the key optimization direction.

### Runtime-assembled fragment ownership

Runtime-assembled fragments need an explicit owner context:

- `runtimeId` comes from the `data-runtime-id` attribute on the `SchemaRenderer` root
- fragment scope starts from `parentScope`
- fragment registry visibility composes with the owner's visible registry boundary
- fragment disposal removes all live instances registered under that fragment owner subtree

## Scope Plan

Template describes scope creation. Runtime performs it.

```ts
type ScopePlan =
  | { kind: 'inherit' }
  | { kind: 'child'; bindings?: Readonly<Record<string, CompiledRuntimeValue<unknown>>> }
  | { kind: 'form' }
  | { kind: 'dialog' }
  | {
      kind: 'repeated-item';
      item?: string;
      index?: string;
      key?: string;
      record?: string;
    };
```

This keeps the responsibilities clean:

- template says what lexical boundary the node needs
- runtime creates the actual `ScopeRef`
- node state tracks runtime evaluation against that scope

## Table And Future `loop`

### Table rows

Table row rendering should be treated as repeated template instantiation.

Recommended model:

1. compile row/cell/action body once
2. assign a `repeatedTemplateId` to the row template boundary
3. for each row, create:
   - row scope
   - row `instanceKey`
   - row `instancePath`
   - fresh `NodeState` for every instantiated node

### Future `type: 'loop'`

`type: 'loop'` should use exactly the same repeated-instance model.

Recommended scope baseline for `loop`:

- each repeated item creates one repeated child scope
- the item scope inherits parent lexical visibility by default
- item-local bindings such as `item`, `index`, optional `key`, and future `itemData` are injected into that child scope

### Nested repeated structures

Nested table/loop/combo/tab repeated structures extend `instancePath`.

Example:

```ts
// A node inside a nested repeated structure is identified by:
const cid = 42;  // templateNodeId, stable across all rows
const instancePath = [
  { repeatedTemplateId: 'table.row', instanceKey: 'user:1001' },
  { repeatedTemplateId: 'loop.line-item', instanceKey: 'line:3' }
];
```

### Instance-key rule

Prefer, in order:

1. explicit schema/runtime key extractor
2. stable record primary key
3. index as last resort

## Registry Model

The registry is a live-handle index only. Structural resolution belongs to the runtime.

```ts
interface ComponentHandleRegistry {
  register(handle: ComponentHandle, options?: { cid?: number; id?: string; name?: string }): () => void;
  unregister(handle: ComponentHandle): void;
  resolve(target: ComponentTarget): ComponentHandle | undefined;
  getHandleByCid(cid: number): ComponentHandle | undefined;
  inspectCid(cid: number): InspectResult;
  setHandleDebugData(cid: number, data: ComponentHandleDebugData | undefined): void;
  getHandleDebugData(cid: number): ComponentHandleDebugData | undefined;
}
```

Internal registry indexes:

- `handlesByCid`: primary index for fast O(1) `_targetCid` resolution
- `handlesById`: lookup by schema `id`
- `handlesByName`: lookup by schema `name` (may be ambiguous)

Removed indexes:

- `handlesByLocator`: removed along with `NodeLocator`
- `dynamicHandles`: removed; repeated instances register under their `cid` directly

`ComponentTarget` for action dispatch:

```ts
interface ComponentTarget {
  _targetCid?: number;    // compiler-resolved at compile time; preferred path
  componentId?: string;   // fallback author selector
  componentName?: string; // fallback author selector
}
```

`staticPlan`, `repeatedPlan`, `repeatedSelector`, `_targetTemplateId`, and `componentInstanceKey` are removed. The compiler resolves `componentId` to `_targetCid` at compile time, and `_targetCid` is the only structural resolution path at runtime.

## Debugger And DOM Identity

### DOM markers

Every mounted inspectable node writes `data-cid` to the DOM.

```html
<div data-cid="42"></div>
```

The `SchemaRenderer` root writes `data-runtime-id`:

```html
<div data-runtime-id="runtime-abc123">
  <!-- rendered tree -->
</div>
```

`runtimeId` is not stored in any runtime data structure. Tooling that needs it reads `data-runtime-id` from the DOM by walking up from the target element.

### Inspect flow

```
user picks DOM element
  -> read data-cid from nearest ancestor with data-cid
  -> walk up DOM to find data-runtime-id
  -> look up runtime in globalRuntimeRegistry (Map<runtimeId, RendererRuntime>)
  -> runtime.inspectByCid(cid)
  -> returns { templateNode, scope, state, resolvedMeta, resolvedProps }
```

### Required runtime mapping

```ts
interface NodeRefRegistry {
  inspectCid(cid: number): InspectResult;
}

type InspectResult =
  | { kind: 'resolved'; payload: NodeInspectPayload }
  | { kind: 'notMaterialized' }
  | { kind: 'notFound' };

interface NodeInspectPayload {
  cid: number;
  templateNodeId: TemplateNodeId;
  instancePath?: readonly InstanceFrame[];
  state?: NodeState;
  scopeChain?: readonly ScopeSnapshot[];
  resolvedMeta?: unknown;
  resolvedProps?: unknown;
}
```

`inspectByCid` is the sole debugger entry point. `inspectNode(locator)` is removed.

### Design rules

- `data-cid` is the canonical DOM-to-runtime bridge
- every mounted inspectable node must have a live `cid`
- `templateNodeId` must never be written directly to DOM as if it were a separate live-node bridge id (they are equal, but only `data-cid` is the DOM contract)
- debugger events carry `instancePath` for repeated-safe correlation

```ts
interface DebuggerEvent {
  kind: string;
  summary: string;
  instancePath?: readonly InstanceFrame[];
  rendererType?: string;
  interactionId?: string;
  requestKey?: string;
}
```

## Performance And Memory

The performance rule is:

- share compiled template structure aggressively
- allocate runtime state only per live instance

### Key gains from this architecture

- `NodeLocator` object allocation per render eliminated (was created every frame)
- `createCompatibilityNodeInstance` eliminated (was rebuilding regions map every render)
- `handlesByLocator` serialization eliminated (was JSON.stringify per registry operation)
- `TemplateNode.component` resolved at compile time (no registry lookup per render)

### Virtualization

Virtualization affects mount lifetime, not identity semantics.

- offscreen repeated instances may have no live `NodeState`
- offscreen repeated instances may have no registered handle
- their semantic identity is still the same `cid` + `instancePath`

If an action or debugger query targets an unmounted virtualized instance, runtime should return an explicit `notMaterialized` result.

## Dependency Tracking For Repeated Instances

Repeated collections should keep dependency tracking instance-local.

Rules:

- each mounted repeated instance has its own `NodeState` and dependency caches
- collection owners reconcile instances by `instanceKey`, not by mount order
- stable `instanceKey` means the runtime may preserve row/item `NodeState` across reorder and pagination changes

## Guardrails

- do not write compiled ids back to raw schema
- do not let one object act as both template node and live node instance
- do not make `ScopeRef` carry component identity or registry semantics
- do not use global compile-time `name -> cid` maps
- do not treat `data-cid` as the canonical repeated-node identity (pair it with `instancePath`)
- do not cache full compiled-instance trees across repeated or remounted instances
- do not use `NodeLocator` (removed); use `cid` + `instancePath` separately

## Related Documents

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/dependency-tracking.md`
