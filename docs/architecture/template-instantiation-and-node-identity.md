# Template Instantiation And Node Identity

## Purpose

This document is the canonical architecture note for:

- compile-time template structure
- runtime node instances
- `cid` / live runtime node identity
- repeated-instance identity for table rows and future `type: 'loop'`
- the relationship between node state, scope, registry, debugger, and DOM markers

This document replaces the earlier `cid`-centric framing. In the clean-slate model, `cid` is not the top-level architecture concept.

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

- `templateGraphId`: the identity of one compiled template graph
- `templateNodeId`: the compiled identifier of a node inside a compiled template graph
- `repeatedTemplateId`: the identifier of a repeated template boundary such as a table row template or loop body template
- `instanceKey`: the identity of one concrete repeated materialization
- `instancePath`: the chain of repeated instances from the runtime root to the current node
- `NodeLocator`: the canonical runtime address of one live node instance

### About `cid`

In the clean architecture, `cid` should mean the live runtime node id.

That means:

- `cid` is allocated when a materialized runtime node becomes a mounted inspectable node
- `cid` identifies one live node instance
- template-level identity is named `templateNodeId`

This deliberately changes the old meaning of `cid`.

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
type TemplateGraphId = string;
type TemplateNodeId = number;
type RepeatedTemplateId = string;

interface CompiledTemplate {
  templateGraphId: TemplateGraphId;
  root: TemplateNode | readonly TemplateNode[];
  repeatedTemplates: ReadonlyMap<RepeatedTemplateId, RepeatedTemplate>;
}

interface TemplateNode {
  templateNodeId: TemplateNodeId;
  templatePath: string;
  rendererType: string;
  propsProgram: CompiledValueProgram<Record<string, unknown>>;
  metaProgram: CompiledValueProgram<Record<string, unknown>>;
  eventPlans: Readonly<Record<string, ActionPlan>>;
  regions: Readonly<Record<string, TemplateRegion>>;
  scopePlan: ScopePlan;
  registryPlan: RegistryPlan;
  validationPlan?: ValidationPlan;
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

Identity uniqueness rules inside one compiled template graph:

- `templateNodeId` is unique within one `templateGraphId`
- `repeatedTemplateId` is unique within one `templateGraphId`
- one `repeatedTemplateId` identifies exactly one repeated boundary for the lifetime of that compiled template

Template owns:

- structure
- compiled expressions/programs
- template-local node ids
- template paths
- region topology
- static action lowering
- validation structure
- scope/registry creation plans

Template does not own:

- resolved values
- dependency caches
- mounted state
- form/page/dialog live objects
- row/item-specific state

### `templateGraphId` alternatives

The canonical public/runtime/debugger identity uses an explicit serializable `templateGraphId` allocated per compiled template graph.

Implementations may still use `TemplateNode` object reference identity internally for caches or indexing. Since `TemplateNode` objects are immutable and allocated once per compilation, their JS reference identity is naturally unique and can be an efficient private key.

The trade-off:

- canonical `templateGraphId`: serializable, readable in debug output, stable across message boundaries
- object reference identity: internal optimization only, zero extra lookup-key allocation, no collision risk

Design rule:

- `NodeLocator` and any debugger/automation payload that crosses boundaries must keep explicit serializable `templateGraphId`
- object reference identity may optimize internal maps, but it must not replace the public `NodeLocator` contract

### 3. Runtime instance

Instantiation materializes the template into live instances.

```ts
type RuntimeId = string;
type InstanceKey = string;

interface InstanceFrame {
  repeatedTemplateId: RepeatedTemplateId;
  instanceKey: InstanceKey;
}

interface NodeLocator {
  runtimeId: RuntimeId;
  templateGraphId: TemplateGraphId;
  templateNodeId: TemplateNodeId;
  instancePath?: readonly InstanceFrame[];
}

interface NodeInstance {
  cid?: number;
  locator: NodeLocator;
  templateNode: TemplateNode;
  scope: ScopeRef;
  state: NodeState;
}

interface NodeState {
  metaState: RuntimeProgramState;
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
- lookup by canonical runtime locator
- convenience lookup by `id` and `name` within visible registry boundaries
- cleanup of unmounted repeated instances

Registry does not own:

- raw schema
- template compilation
- lexical data lookup

## Identity Model

### Layer 1: Author selectors

- `id`
- `name`
- `testid`

These are authoring concepts, not canonical runtime addresses.

### Layer 2: Template identity

- `templateGraphId`
- `templateNodeId`
- `templatePath`
- `repeatedTemplateId`

These identify structure inside the compiled template graph.

### Layer 3: Instance identity

- `cid`
- `instanceKey`
- `instancePath`

These are runtime-instance identity fields. `instanceKey` and `instancePath` matter specifically for repeated materialization, while `cid` is the compact live-node token for any mounted instance.

### Layer 4: Canonical live node identity

Canonical live node identity is `NodeLocator`:

- `runtimeId`
- `templateGraphId`
- `templateNodeId`
- `instancePath`

This is the stable answer to "which live node are we talking about?"

`cid` is the compact live-instance handle for DOM/debugger round-trips and mounted-node lookup.

### Singleton optimization

The vast majority of nodes are singletons, not inside any repeated boundary. For these nodes `instancePath` should be `undefined` (omitted), not an empty array.

Only nodes materialized inside a repeated boundary (table row, loop item, combo option, tab panel) carry a non-empty `instancePath`.

This avoids per-node array allocation for the common case.

Canonical singleton rule:

- `undefined` is the canonical singleton representation
- an empty array must be normalized to the same singleton case
- `[]` must not be treated as a distinct identity from `undefined`

## Where `cid` Belongs

`cid` belongs to the runtime-instance layer.

In clean architecture terms:

- `cid` is the unique id of one live mounted node instance in a runtime host tree
- `templateNodeId` is the template-level structural id
- `templateGraphId + templateNodeId` identifies one template node inside a runtime
- it is not a scope concept
- it is appropriate as the compact DOM/debugger handle for live instances
- it is not the stable structural identity across remounts or rematerialization

Therefore:

- singleton and repeated mounted nodes may both expose `cid` on DOM/debugger surfaces
- structural reasoning, repeated targeting, and remount-stable meaning still require `NodeLocator`

## Compilation Model

### Compile once

```ts
interface TemplateCompiler {
  compile(schema: SchemaInput): CompiledTemplate;
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

### Static lowering

Compile-time lowering should target template structure, not live handle ids.

Safe lowering examples:

- unique singleton `componentId` -> `StaticTargetPlan { templateGraphId, templateNodeId }`
- relative repeated target inside the same repeated template -> `RepeatedTargetPlan { templateGraphId, templateNodeId, repeatedTemplateId }`

Unsafe lowering examples:

- global `componentName -> templateNodeId`
- lowering compile-time targets directly to live `cid`

## Instantiation Model

### Instantiate many

```ts
interface RendererRuntime {
  instantiate(
    template: CompiledTemplate | TemplateNode | RepeatedTemplate,
    options: {
      runtimeId: RuntimeId;
      parentScope?: ScopeRef;
      instancePath?: readonly InstanceFrame[];
    }
  ): NodeInstance | readonly NodeInstance[];
}
```

Instantiation is the runtime step that:

- binds the template to a concrete scope
- allocates `NodeState`
- derives a `NodeLocator`
- creates runtime-owned materialized instance state

Mount is the host step that:

- allocates `cid`
- creates DOM-facing inspect/debug bridge state
- creates live handle/registry attachments for mounted interactive nodes

### Materialization lifecycle

The architecture distinguishes three layers that are easy to conflate if left implicit:

1. semantic repeated item: an item identified by `instanceKey` and position inside repeated ownership logic
2. materialized runtime instance: a `NodeInstance` subtree currently instantiated by the runtime
3. mounted inspectable node: a materialized runtime instance that currently has mounted host output and therefore a live `cid`, DOM marker, and registry/debugger visibility

Required rules:

- `NodeLocator` describes semantic/runtime identity and may outlive a specific mounted DOM node
- `cid` exists only for a currently mounted inspectable node
- `NodeState` exists only for a currently materialized runtime instance
- component-handle registry entries exist only while the corresponding live instance is materialized and registered
- virtualization may dispose a materialized runtime instance entirely or keep runtime-owned cached state, but that policy must not change `NodeLocator` semantics
- debugger and action resolution must distinguish `not materialized` from `not found`

`NodeInstance` in this document means a materialized runtime instance. A semantic repeated item that is currently virtualized away does not have to own a live `NodeInstance` object.

### Resolution result categories

Whenever runtime, registry, or debugger lookup targets a structurally valid node that is not currently materialized, the result must be explicit.

Minimum categories:

- `resolved`: the live node instance is materialized and usable
- `notMaterialized`: the structural target is valid, but there is no current materialized instance or mounted node
- `notFound`: the target identity itself is invalid in the current runtime/template context

### `cid` allocation policy

`cid` should be allocated by the runtime that owns the live node instance.

Required rule:

- `cid` is allocated at mount time, not merely at materialization time
- `cid` is a per-runtime-host-tree monotonically increasing integer
- uniqueness is required within one runtime host tree, not as a process-global or document-global id space
- if tooling needs a wider debug key, it should compose `runtimeId + cid` or use full `NodeLocator`, not change the meaning of `cid`

This keeps `cid` compact and readable while preserving clean ownership boundaries.

### Runtime-assembled fragments

Remote or delayed fragments such as `dynamic-renderer` payloads are not "just more nodes in the old compiled tree".

They should follow a two-step model as well:

1. compile the new fragment into a template
2. instantiate it into the current runtime with an owner-provided `instancePath` / scope context

The key optimization direction is still template reuse, not full compiled-instance reuse.

Every runtime-assembled fragment must receive a fresh `templateGraphId`, even when it is attached to an existing page runtime.

This keeps `NodeLocator` collision-free for:

- page root templates
- dialog fragments compiled later
- remote `dynamic-renderer` fragments
- future loop/table subtemplates compiled independently

### Runtime-assembled fragment ownership

Runtime-assembled fragments need an explicit owner context.

```ts
interface FragmentOwnerContext {
  runtimeId: RuntimeId;
  ownerLocator: NodeLocator;
  registryBoundaryId: string;
  parentScope: ScopeRef;
}
```

Ownership rules:

- fragment compile allocates a fresh `templateGraphId`
- fragment instantiate reuses the owner `runtimeId`
- fragment scope starts from `parentScope`
- fragment registry visibility composes with the owner's visible registry boundary unless the fragment explicitly creates a new one
- fragment disposal removes all live instances registered under that fragment owner subtree

## Scope Plan

Template describes scope creation. Runtime performs it.

```ts
type ScopePlan =
  | { kind: 'inherit' }
  | { kind: 'child'; bindings?: Readonly<Record<string, ValueProgram>> }
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

The architecture must not invent a second repeated rendering system with different identity rules.

### Instance-key rule

Prefer, in order:

1. explicit schema/runtime key extractor
2. stable record primary key
3. index as last resort

Index-only keys are acceptable only when reorder/filter semantics are understood to remap identity.

### Nested repeated structures

Nested table/loop/combo/tab repeated structures extend `instancePath`.

Example:

```ts
const locator = {
  runtimeId: 'page-1',
  templateGraphId: 'page-root',
  templateNodeId: 42,
  instancePath: [
    { repeatedTemplateId: 'table.row', instanceKey: 'user:1001' },
    { repeatedTemplateId: 'loop.line-item', instanceKey: 'line:3' }
  ]
};
```

This is the general solution. A flat `row:0` string is only a degenerate special case.

## Registry Model

Canonical structural resolution belongs to the runtime-owned resolution layer. The registry is a subordinate live-handle index, not the source of structural truth.

Recommended split:

- runtime resolution resolves structural targets such as `NodeLocator`, static plans, repeated plans, and repeated selectors into explicit resolution results
- component registry resolves currently live handles and convenience selectors inside visible registry boundaries

```ts
type ResolutionResult =
  | { kind: 'resolved'; locator: NodeLocator; handle?: ComponentHandle }
  | { kind: 'notMaterialized'; locator: NodeLocator }
  | { kind: 'notFound' }
  | { kind: 'ambiguous'; matches: readonly NodeLocator[] };

interface RuntimeNodeResolver {
  resolveNode(locator: NodeLocator): ResolutionResult;
  resolveTarget(target: ActionTarget, ctx: ResolutionContext): ResolutionResult;
}
```

Externally, registry exposes live-handle and convenience-selector lookup only.

```ts
interface ComponentHandleRegistry {
  resolveHandle(locator: NodeLocator): ComponentHandle | undefined;
  resolveSelector(selector: { id?: string; name?: string }, ctx?: ResolutionContext): ResolutionResult;
  register(handle: ComponentHandle, locator: NodeLocator): () => void;
  unregister(locator: NodeLocator): void;
}
```

Internally, registry may use:

- locator serialization
- nested repeated-template maps
- singleton fast paths by `templateNodeId`

The exact map layout is an implementation detail. The semantic contract is the canonical `NodeLocator`, but only the runtime-owned resolution layer may decide whether that locator is currently materialized.

Selector resolution inside repeated content follows this rule:

- canonical repeated targeting should use `NodeLocator` or repeated target plans
- `componentId` / `componentName` inside repeated content are convenience selectors against the current visible registry boundary only
- they are not the recommended way to target a different repeated instance from outside that instance

For explicit cross-instance repeated targeting, the action model should expose an instance-aware target shape instead of guessing from selectors.

```ts
type ActionTarget =
  | { locator: NodeLocator }
  | { staticPlan: StaticTargetPlan }
  | { repeatedPlan: RepeatedTargetPlan; instancePath?: readonly InstanceFrame[] }
  | {
      repeatedSelector: {
        templateGraphId: TemplateGraphId;
        repeatedTemplateId: RepeatedTemplateId;
        instanceKey: InstanceKey;
        templateNodeId: TemplateNodeId;
      };
    }
  | { componentId?: string; componentName?: string };
```

## Debugger And DOM Identity

Debugger must not stay `cid`-only.

The canonical debugger target should be `NodeLocator`.

Recommended inspect API shape:

```ts
interface DebuggerApi {
  inspectNode(locator: NodeLocator): InspectResult;
  inspectByElement(element: Element): InspectResult;
}
```

```ts
type InspectResult =
  | { kind: 'resolved'; payload: NodeInspectPayload }
  | { kind: 'notMaterialized'; locator?: NodeLocator }
  | { kind: 'notFound' };
```

DOM markers should expose the live runtime node bridge id.

`data-cid` is the preferred DOM-to-runtime bridge.

### Required DOM node-ref mechanism

The runtime must expose a DOM-level node reference mechanism.

This is not optional. It is required so `nop-debugger` and other host tooling can move from a concrete DOM element back to the exact live runtime node instance and inspect:

- the canonical `NodeLocator`
- the current `NodeState`
- the current resolved props/meta snapshot
- the current scope chain, including nested repeated scopes and page/form/dialog/row/item scopes

The marker name should be short.

Preferred marker:

- `data-cid`

Rationale:

- short enough to appear widely in renderer output without excessive DOM noise
- aligns with debugger and registry expectations for a compact live-instance handle
- keeps the DOM bridge simple and direct

Do not use DOM `id` for this framework-internal bridge.

Reasons:

- DOM `id` belongs to the host page's global id namespace
- host/application code may already need `id` for anchors, labels, accessibility wiring, or CSS hooks
- framework-internal mounted-node refs should not claim that namespace when `data-cid` is sufficient

Recommended shape:

```html
<div data-cid="1042"></div>
```

Where `1042` is the live runtime node `cid`.

### Required runtime mapping

The runtime/debugger layer must maintain a mapping like:

```ts
interface NodeRefRegistry {
  resolveCid(cid: number): NodeLocator | undefined;
  inspectCid(cid: number): InspectResult;
}
```

This means `cid` is the compact live-instance bridge token. The deeper structural identity remains `NodeLocator`.

### Mounted tree source

Debugger component trees, mounted-node snapshots, and similar structural inspection views should be built from `NodeRefRegistry` or equivalent runtime-owned registry state, not by scanning DOM.

Rules:

- `inspectByCid(cid)` should resolve through runtime-owned node-ref/handle registries
- component-tree collection should enumerate mounted nodes from registry state
- DOM traversal is reserved for pointer-driven element inspection such as `inspectByElement(element)` or overlay hit-testing

### Design rule

- `data-cid` is the canonical DOM-to-runtime bridge
- every mounted inspectable node must have a live `cid`
- repeated nodes, virtualized nodes while mounted, and runtime-assembled fragments are all inspectable through `data-cid`
- `templateNodeId` must never be written directly to DOM as if it were the live-node bridge id

The debugger event substrate should also carry locator identity:

```ts
interface DebuggerEvent {
  kind: string;
  summary: string;
  locator?: NodeLocator;
  rendererType?: string;
  interactionId?: string;
  requestKey?: string;
}
```

`nodeId` / `path` may remain as convenience summaries, but `locator` is the canonical repeated-safe identity for correlation, tracing, and anomaly grouping.

### DOM inspect contract

DOM-to-node inspection should use the DOM `data-cid` mechanism above.

Requirements:

- every inspectable mounted node exposes `data-cid`
- the `cid` resolves to the exact live `NodeLocator`
- the `cid` also resolves to the current runtime-owned inspect payload, including nested `scopeChain` when available
- `inspectByElement()` walks from the target element to the nearest inspectable owner marker
- portals and fragment roots still recover the mounted node locator through the nearest host-owned inspect marker
- if an element belongs to a virtualized-offscreen node that is no longer mounted, inspect returns "not mounted" rather than guessing

## Performance And Memory

The performance rule is:

- share compiled template structure aggressively
- allocate runtime state only per live instance

This gives the right balance:

- one compile result for fixed table column/body DSL
- one `NodeState` per mounted row instance
- one live handle per mounted interactive instance

### Virtualization

Virtualization affects mount lifetime, not identity semantics.

Therefore:

- offscreen repeated instances may have no live `NodeState`
- offscreen repeated instances may have no registered handle
- their semantic identity is still the same `instancePath`
- they may or may not retain runtime-owned cached state between materialization cycles; this is an optimization policy, not an identity rule

If an action or debugger query targets an unmounted virtualized instance, runtime should return an explicit "not currently materialized" result.

## Dependency Tracking For Repeated Instances

Repeated collections should keep dependency tracking instance-local.

Rules:

- each mounted repeated instance has its own `NodeState` and dependency caches
- collection owners reconcile instances by `instanceKey`, not by mount order
- stable `instanceKey` means the runtime may preserve row/item `NodeState` across reorder and pagination changes
- missing keys fall back to index semantics and therefore allow identity remapping

Collection-owner responsibilities:

- diff repeated items by `instanceKey`
- preserve existing instance subtrees when keys match
- dispose instance subtrees when keys disappear
- instantiate new subtrees when keys appear
- batch repeated invalidation work so collection changes do not degrade into full sibling re-evaluation by default

## Guardrails

- do not write compiled ids back to raw schema
- do not let one object act as both template node and live node instance
- do not make `ScopeRef` carry component identity or registry semantics
- do not use global compile-time `name -> cid` maps
- do not treat `data-cid` as the canonical repeated-node identity
- do not cache full compiled-instance trees across repeated or remounted instances

## Refactoring Direction

If the codebase is refactored toward this architecture, the preferred direction is:

1. `SchemaCompiler` -> `TemplateCompiler`
2. `CompiledSchemaNode` -> `TemplateNode`
3. remove `TemplateNode.createRuntimeState()`
4. introduce explicit `instantiate(...)`
5. make React rendering consume `NodeInstance`, not bare compiled nodes
6. move debugger/registry targeting to `NodeLocator`

## Related Documents

- `docs/architecture/component-resolution.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/debugger-runtime.md`
- `docs/architecture/dependency-tracking.md`
