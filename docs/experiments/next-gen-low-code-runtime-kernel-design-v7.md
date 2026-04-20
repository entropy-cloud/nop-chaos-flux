# Next-Gen Low-Code Runtime Kernel Design v7

## Status

- Status: revised draft for adversarial review
- Scope: clean-slate runtime-kernel design derived only from `docs/low-code-dsl-runtime-requirements.md` and `docs/architecture/flux-design-principles.md`
- Non-goal: preserve compatibility with the current project implementation
- Goal: define a next-generation execution kernel that is simpler, more analyzable, more optimizable, and more extensible than mainstream low-code runtime baselines while staying inside Flux core principles

## 1. Design Target

This document defines a clean-slate low-code runtime kernel whose primary unit is not a React component tree, a form engine, or an API orchestration framework, but a compiled declarative execution fabric derived from DSL.

The target system is built around six hard requirements:

1. DSL remains the first-class product, independent from runtime representation.
2. Authoring and execution are separated by a strict precompile boundary.
3. All dynamic behavior is reduced to reactive read dependencies plus capability-dispatched writes.
4. Complexity grows progressively from a small set of stable primitives.
5. Ownership of data, resources, reactions, and actions follows lexical subtree boundaries.
6. Domain-specific editors integrate through narrow projection and capability contracts rather than leaking their internal protocols into the schema-visible runtime.

The result is a runtime kernel called **Flux Execution Fabric v7**, abbreviated below as **Fabric**.

## 2. Why Existing Frameworks Plateau

Most low-code engines stop improving because they accumulate one more runtime subsystem for each problem:

1. a value engine
2. a form engine
3. a fetch engine
4. a dialog engine
5. a table engine
6. a watcher engine
7. a designer bridge

That layering creates local solutions but loses global optimality:

1. dependency tracking becomes fragmented
2. refresh logic becomes heuristic instead of semantic
3. ownership becomes ambient or globally routed
4. dynamic behavior becomes hard to statically analyze
5. performance work becomes patch-based rather than structural

Fabric v7 avoids this by collapsing runtime semantics into a small set of primitives that all obey the same dependency and ownership rules.

## 3. Semantic Primitives

Fabric keeps the semantic primitive set small.

### 3.1 Primitive Set

1. **Template**: immutable compiled structural program derived from DSL.
2. **Scope**: lexical read/write environment with precise patch propagation.
3. **Value**: pure read computation over scope and slot parameters.
4. **Capability**: the only effect channel for visible writes and side effects.
5. **Resource**: named lifecycle-owned refresh contract that schedules value publication through Capability.
6. **Reaction**: dependency-tracked observer that conditionally dispatches capabilities.

Compiled artifacts such as `ValueProgram`, `CapabilityProgram`, validation graphs, collection plans, and render selectors are execution forms of these primitives, not extra semantic categories.

### 3.2 Surface As Derived Kernel Service

Dialog and drawer behavior still needs a kernel-owned service because it bundles:

1. fresh owned execution roots
2. stack ordering
3. active focus ownership
4. close-and-restore behavior

But `surface` is kept as a derived kernel service rather than a promoted top-level author-visible primitive family.

### 3.3 Derived Systems

Everything else stays derived:

1. forms are semantic owners built from Template + Scope + Value + Capability + Reaction
2. tables are compiled collection instantiation patterns
3. dialogs and drawers are surface variants
4. async pending states are operation-control metadata on resource/capability execution
5. validation is a compiled graph layered on Value

This is the first major optimization: the engine does not create separate ad hoc runtime metaphors when the same primitive algebra already covers the problem.

## 4. Macro Architecture

Fabric has four layers.

### 4.1 Authoring Layer

Owns editable DSL, round-trip metadata, composition, inheritance, permissions, i18n replacement, and schema transforms.

### 4.2 Assembly Layer

Consumes authoring artifacts and produces a normalized executable package:

1. final schema graph
2. symbol tables
3. renderer bindings
4. static diagnostics
5. typed projection/capability manifests
6. compiled value IR
7. compiled action pipelines
8. validation graph
9. template instantiation plan
10. i18n key-prefix diagnostics and substituted locale payloads

### 4.3 Runtime Kernel Layer

Executes immutable templates against owned scopes, resources, reactions, and the derived surface service.

### 4.4 Host Adapter Layer

Supplies network, navigation, notifications, storage, and domain-specific bridge delegates. Host adapters are capabilities, never ambient globals.

## 5. Authoring-Execution Boundary

The clean-slate design uses a hard precompile artifact named **Execution Package**.

```text
Authoring DSL
  -> normalization
  -> static composition
  -> i18n substitution
  -> permission/profile pruning
  -> type/capability/projection validation
  -> value/action/validation compilation
  -> Execution Package
  -> runtime instantiation
```

The Execution Package is the only input accepted by the kernel. Runtime never sees:

1. source locations except diagnostic/debug metadata
2. inheritance and override structures
3. authoring aliases
4. permission branches already pruned
5. locale substitution instructions
6. design-time editor hints
7. untranslated i18n directives or prefix-validation rules

This preserves DSL-first and authoring-execution separation while maximizing runtime simplicity.

## 6. Template Model

Each compiled node is a **Template Node** with immutable identity.

```ts
type TemplateNode = {
  tid: number;
  typeId: number;
  flags: TemplateNodeFlags;
  propSlots: CompiledPropSlot[];
  metaSlots: CompiledMetaSlot[];
  regionDefs: RegionDef[];
  eventDefs: EventDef[];
  scopePolicy: ScopePolicy | null;
  scopeSeed: ScopeSeedDef | null;
  semanticOwner: 'none' | 'page' | 'form' | 'surface';
  debug: DebugLocator | null;
};
```

Key rules:

1. `tid` is template identity, not mounted instance identity.
2. Static values are stored as frozen literals and incur zero reevaluation cost.
3. Dynamic slots point to compiled Value Programs.
4. Regions are pre-partitioned; runtime never reparses child ownership.
5. Scope bootstrap and semantic ownership are explicit on the template node.

This is the second major optimization: runtime instantiates an already classified structure instead of rediscovering semantics from raw schema objects.

## 7. Value System

### 7.1 Unified Value IR

All dynamic value forms compile into one IR family:

1. literal node
2. path-read node
3. operator node
4. function/filter call node
5. template-string node
6. object/array constructor node
7. conditional node
8. slot-parameter read node
9. runtime constant node
10. bound-resource read node

The runtime never cares whether the author originally wrote `${user.name}`, `Hello ${user.name}`, or a structured object containing expressions. They all become Value Programs.

### 7.2 Value Program Contract

```ts
type ValueProgram<T = unknown> = {
  vid: number;
  execute(ctx: ValueExecutionContext): ValueResult<T>;
  staticShape: ValueShape;
  compileTag: 'static' | 'pathOnly' | 'general';
  reusePlan: 'identity' | 'fixedShape' | 'opaque';
};
```

`execute` is pure. It can only:

1. resolve values from the scope interface
2. read slot parameters
3. call registered pure built-ins
4. allocate deterministic aggregates

It cannot:

1. mutate scope
2. perform network I/O
3. access ambient globals
4. generate code dynamically

### 7.3 Evaluation Semantics

Evaluation returns:

```ts
type ValueResult<T> = {
  value: T;
  deps: DependencySet;
  stableClass: 'none' | 'certified';
};
```

`stableClass: 'certified'` is emitted only for compiler-proved cases such as literals, direct path projections, and fixed-shape aggregates whose children are themselves certified. Referential reuse is therefore a bounded optimization, not a blanket promise.

Beyond certified cases, every ValueProgram still carries a `reusePlan`. If recomputation produces a semantically unchanged result, runtime should retain the previous published reference. Certified cases make that decision cheap; `fixedShape` and `opaque` cases may require bounded compare or publisher normalization, but the reuse goal remains part of the runtime contract.

### 7.4 Compile Tags

To beat common frameworks on hot-path cost while staying simple, Fabric uses only three compile tags:

1. `static`: frozen literal or compile-time folded result; zero runtime subscription.
2. `pathOnly`: direct path projection; subscribes to exact selector sets.
3. `general`: expression, template, or aggregate assembly over tracked reads.

Action-based value producers are lowered during assembly either into pure Value or into Resource wiring before runtime starts. Runtime does not perform concept promotion.

## 8. Scope Model

### 8.1 Scope As Semantic Contract

The normative contract is semantic, not storage-specific. A Scope must provide:

1. lexical reads with shadowing
2. path-targeted writes
3. canonical changed-path receipts
4. selector subscriptions over canonical paths
5. optional isolation with explicit parent projections

The internal representation may use cell graphs, structural snapshots, path indexes, or other equivalent strategies. Those are implementation choices, not kernel law.

```ts
type ScopeRef = {
  scopeId: number;
  ownerNodeId: MountedNodeId;
  parent: ScopeRef | null;
  isolation: 'inherit' | 'isolate';
  resolve(path: PathToken[]): unknown;
  has(path: PathToken[]): boolean;
  patch(ops: ScopePatchOp[], origin: WriteOrigin): PatchReceipt;
  subscribe(selector: DependencySelector, sub: Subscriber): Unsubscribe;
};
```

### 8.2 Lexical Inheritance

By default, scopes use lexical inheritance with shadowing. A child read walks:

1. own bindings
2. compiled projected bindings
3. parent lexical chain

Isolated scopes skip parent reads except for explicit compiled projections.

### 8.3 Compiled Projected Bindings

To solve high-frequency subtree isolation without losing expressiveness, an isolated scope can import selected parent values through explicit compiled projected bindings.

Example:

```json
{
  "scope": {
    "isolate": true,
    "project": {
      "currency": "${page.currency}",
      "permissions": "${session.tableOps}"
    }
  }
}
```

At compile time this becomes explicit bound Value Programs. These bindings are live read-only imports, not one-time seed copies. They participate in read resolution after local bindings and before any inherited parent chain. No arbitrary parent tunneling exists at runtime.

### 8.4 Scope Bootstrap Semantics

Every owned scope is created from an explicit seed order:

1. host-provided root input for the execution root
2. node-declared `data` or equivalent initial patch on the owning container
3. subsequent runtime writes through Capability

Precedence is last-writer-wins at the path level within owned bindings. Projected bindings are not ownership transfer and are not copied into local state. A projected parent value can be shadowed locally without mutating the parent.

### 8.5 Path-Level Invalidations

Writes produce structural patch receipts:

```ts
type PatchReceipt = {
  changedPaths: CanonicalPath[];
  insertedPaths: CanonicalPath[];
  removedPaths: CanonicalPath[];
  version: number;
};
```

All consumers subscribe against canonical selectors. The guaranteed selector kinds are:

1. exact path
2. subtree path
3. collection shape
4. existence

`collection shape` covers insert, remove, reorder, and derived reads such as `length`. `existence` covers `has(path)` style checks. This gives precise invalidation for values, resources, reactions, validation, and UI subscriptions without overcommitting to one indexing structure.

## 9. Dependency Tracking

### 9.1 Unified Read Tracking

Whenever a Value Program executes, the context records every resolved path read and every slot-parameter read. The exact same dependency collection protocol is used by:

1. renderer props/meta computations
2. named resources
3. reactions
4. validation rules
5. semantic-owner selectors

### 9.2 Deterministic Update Transactions

Runtime state changes proceed in deterministic transactions:

1. Capability writes patch scopes.
2. Patch receipts mark dependent pure computations dirty.
3. Dirty pure computations propagate in bounded waves over the instantiated dependency graph until no dirty nodes remain for the current transaction.
4. Resource refreshes and Reactions are scheduled as effect work after pure quiescence.
5. One committed snapshot is published to render hosts and devtools.

Effect work may start a later transaction if it writes again, but it does not interleave into the current pure recomputation phase.

### 9.3 Self-Write Protection

Each Resource refresh receives an execution token. Scope patches published under that token mark origin metadata. A Resource ignores invalidations originating from its own currently active publication token unless explicit strategy says otherwise.

### 9.4 Bounded Transaction Rules

If repeated pure recomputation fails to reach quiescence within a bounded internal limit, runtime raises a deterministic cycle diagnostic. Kernel semantics assume acyclic pure dependency propagation inside one transaction.

## 10. Capability System

### 10.1 Capability As The Only Effect Surface

All visible effects compile into Capability Programs. A Capability Program may:

1. write scope patches
2. call host network delegate
3. call host navigation delegate
4. emit host notifications
5. open or close surfaces
6. invoke component instance methods
7. invoke namespaced host or domain methods

No schema-visible path exists around this channel.

### 10.2 Action Pipeline

Author-facing action schemas compile into a structured action pipeline aligned with the requirement surface:

1. `dispatch`
2. `guard`
3. `then`
4. `onError`
5. `parallel`

`retry`, `timeout`, and `debounce` are operation-control annotations on dispatch or parallel stages, not separate kernel graph primitives.

The runtime executes the compiled pipeline with explicit result channels:

```ts
type ActionOutcomeKind = 'success' | 'failure' | 'skipped';
```

Each step sees a typed execution frame containing:

1. `input`
2. `result`
3. `prevResult`
4. `error`
5. `scope`
6. `surface`
7. `capabilities`

### 10.3 Three-Tier Action Resolution

Action target resolution is lexical and explicit:

1. built-in capability table
2. `component:<method>` through local component handle registry
3. `namespace:method` through lexical action-scope registry

There is no global mutable action bus.

### 10.4 Operation Control Plane

Timeout, cancellation, deduplication, retry, concurrency policy, and debouncing are managed by a shared **Operation Control Plane**. Resources and action dispatches both attach to it through operation metadata.

This is a core advantage over existing frameworks that duplicate async policy in fetch, submit, and watcher layers.

## 11. Resource Model

### 11.1 Resource Definition

Resource is a lifecycle-owned named refresh contract.

```ts
type ResourceDef = {
  rid: number;
  name: string;
  outputBinding: BindingTarget;
  loadingBinding: BindingTarget | null;
  errorBinding: BindingTarget | null;
  trigger: ResourceTriggerPolicy;
  refreshAction: ResourceRefreshActionRef;
  refreshDeps: DependencySeed | 'implicit';
  publishMode: 'replace' | 'patch';
};
```

```ts
type ResourceRefreshActionRef = CapabilityProgramRef;

type ResourceRefreshResult = {
  value?: unknown;
  patch?: ScopePatchOp[];
  error?: unknown;
};
```

Resource does not own a second effect lane. It owns lifecycle, dependency refresh policy, loading or error bindings, and self-write protection. Actual request execution and scope publication still occur by dispatching a Capability program through the unified effect channel. The assembly contract for a resource refresh action is stricter than general user actions: it must resolve to a publishable `ResourceRefreshResult` and must not perform unrelated visible side effects such as navigation, notifications, or surface control.

Declarative API schema compiles into first-class API request IR rather than opaque host code:

```ts
type ApiRequestDef = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: ValueProgramRef;
  query: Record<string, ValueProgramRef> | null;
  headers: Record<string, ValueProgramRef> | null;
  body: ValueProgramRef | null;
  injectScope: ScopeInjectionPolicy | null;
  responseAdapter: ValueProgramRef | null;
  cancelPolicy: 'latest' | 'inflight-parallel' | 'manual';
};
```

Execution still delegates actual I/O to the host `network` adapter. The kernel owns declarative request semantics; the host owns transport. At assembly time an API resource lowers to a dedicated refresh Capability program that executes this request definition and returns a publishable `ResourceRefreshResult`.

### 11.2 Resource Trigger Policies

Supported policies:

1. mount
2. manual
3. interval
4. dependency-driven

### 11.3 Progressive Authoring, Fixed Runtime Lowering

At the DSL layer, authors can start with literals, expressions, templates, action-based value producers, and named data sources. At assembly time, anonymous async value producers are lowered into either:

1. pure Value when no lifecycle or publication is needed
2. Resource when lifecycle-owned async publication is needed

Runtime therefore executes a fixed concept set.

## 12. Reaction Model

Reaction is a dependency-tracked observer that bridges read changes to capability dispatch.

```ts
type ReactionDef = {
  xid: number;
  watch: ValueProgramRef;
  compare: 'identity';
  when: ValueProgramRef | null;
  dispatch: CapabilityProgramRef;
  fireOnMount: boolean;
};
```

Execution rules:

1. evaluate `watch`
2. collect dependencies
3. compare with last published value
4. if changed and `when` passes, enqueue dispatch

Reactions cannot synchronously recurse into writes during the same evaluation frame. They always enqueue into later effect work.

## 13. Rendering System

### 13.1 Renderer Contract

Renderers do not interpret schema directly. They receive a fully prepared render contract:

```ts
type RenderNodeContract = {
  nodeId: MountedNodeId;
  tid: number;
  type: string;
  props: PreparedPropsRecord;
  meta: PreparedMetaRecord;
  regions: PreparedRegionRecord;
  events: PreparedEventRecord;
  runtime: RendererRuntimeHandle;
};
```

### 13.2 Containers Versus Widgets

Fabric makes the split strict:

1. layout containers emit structure and stable semantic markers only
2. widgets are complete interactive controls with internal UI implementation

This means the kernel does not smuggle visual policy into layout renderers.

### 13.3 Pull-Based UI Subscriptions

Each dynamic prop, meta, or region binding is represented by selector subscriptions derived from Value Programs. UI frameworks consume stable prepared snapshots. Full render-contract caching is optional rather than normative.

### 13.4 Fragment Rendering

Any compiled region can be instantiated as a fragment with:

1. parent scope inheritance or isolation
2. injected overlay data
3. slot parameter bindings
4. local surface ownership if needed

### 13.5 Parameterized Regions

Slot parameters compile as explicit lexical parameters, not magical ambient names. `$slot.item` and `$slot.index` are lowered to slot-parameter reads in Value Programs.

### 13.6 Dynamic Assembly Boundary

To satisfy progressive structural complexity, Fabric supports dynamic fragment assembly as a controlled boundary:

1. a Resource or Capability may resolve a fragment or template reference
2. assembly output must still be an Execution Package fragment, not raw runtime schema
3. the mounted fragment always enters through a normal Template instantiation boundary
4. lexical ownership, scope seeding, and capability manifests remain explicit

This is intentionally distinct from Resource. Resource produces data; dynamic assembly selects which prevalidated executable fragment is mounted.

## 14. Collection Instantiation

### 14.1 Loop Template Reuse

Loop and table rows compile child structure once. Runtime creates per-item mounted instances with:

1. instance id
2. owned row scope
3. slot parameter frame
4. stable row key
5. local invalidation subscriptions

### 14.2 Row Isolation As Default

High-frequency collections use isolated row scope by default, with only explicit projections allowed from parent scope.

### 14.3 Delta Instantiation

Collection refreshes are diffed on row keys. The kernel performs:

1. retain existing row instances where key matches
2. patch row-local bindings if record changed
3. create only new row instances
4. destroy only removed row instances

This avoids whole-collection remount churn.

### 14.4 Recursive Structures

Recursive rendering uses template self-reference with bounded runtime instance lineage. The recursion contract is explicit in the template graph so the runtime does not need late schema lookup.

### 14.5 Windowed Collections

For very large collections, Fabric supports optional windowed execution:

1. only visible or near-visible row instances stay mounted
2. offscreen row subscriptions are suspended with their mounted scope snapshots retained or pooled
3. row reuse never breaks row-scope isolation or key identity guarantees

Virtualization is an execution strategy layered on the same collection instantiation contract, not a separate renderer-specific semantics.

## 15. Surface Manager

### 15.1 Unified Surface Entry

Dialog and drawer are variants of one derived surface service:

```ts
type SurfaceEntry = {
  surfaceId: number;
  kind: 'dialog' | 'drawer';
  ownerActionId: number | null;
  rootTemplate: TemplateRef;
  scope: ScopeRef;
  status: 'opening' | 'active' | 'closing' | 'closed';
  parentSurfaceId: number | null;
};
```

### 15.2 Stack And Focus Semantics

Only the top active surface receives active keyboard and focus routing. Closing the top surface restores the previous active entry.

### 15.3 Surface Scope Ownership

Each surface always owns a fresh scope root. Parent values can be projected in, but never shared by reference as the same writable root.

## 16. Closed Semantic Owners

The kernel itself remains small. `semanticOwner` is a closed set, not an open escape hatch. In this design version the allowed semantic owners are `page`, `form`, and `surface`.

### 16.1 Page Runtime

`page` owns page-enter and page-leave semantic lifecycle entrypoints. UI triggers may dispatch into those entrypoints, but the lifecycle pipeline belongs to the page node rather than to individual buttons or host callbacks.

### 16.2 Form Runtime

Form is a semantic owner layered on the kernel with:

1. authoritative form value scope root
2. authoritative touched state
3. authoritative submit state
4. derived dirty state
5. submission pipeline
6. validation graph
7. partial validation entrypoints
8. draft-isolated child segments

The form submit button does not own submission semantics. The form node owns them. Triggering submit is only one capability entrypoint.

### 16.3 Validation Graph

Validation compiles into a graph of rule programs:

1. field rule nodes
2. object rule nodes
3. array rule nodes
4. condition guard nodes
5. async rule producer nodes

Each rule node has:

1. target path set
2. dependency set
3. trigger policy
4. display policy
5. message or value producers
6. async cancellation token policy

Partial validation executes the minimal affected subgraph.

Rule execution timing and UI error-display timing are separate contracts. Async validation uses latest-only cancellation by default; stale async results are discarded if the target value or dependency version changed before completion.

### 16.4 Draft Islands

Draft isolation is modeled as nested semantic ownership segments. A draft island can accumulate local dirty and validation state without publishing to the parent committed value graph until explicit commit.

This makes nested editors predictable without requiring special-case widget semantics.

### 16.5 Surface Runtime

`surface` owns confirm, cancel, open, and close semantic lifecycle entrypoints for dialog or drawer roots. Trigger widgets remain thin dispatchers; the semantic pipeline stays with the owning surface node.

## 17. Host Integration Boundary

### 17.1 Host Contract

The host exposes a stable runtime adapter:

```ts
type HostRuntimeAdapter = {
  network: NetworkDelegate;
  navigate: NavigationDelegate;
  notify: NotificationDelegate;
  now: ClockDelegate;
  schedule: SchedulerDelegate;
  domainBridges: DomainBridgeRegistry;
  onError: GlobalErrorDelegate;
};
```

The adapter is captured once at runtime creation. Internal state does not rebuild when object identities change; delegates are stored behind stable adapter cells.

### 17.2 Root Input Contract

The host injects root data through an explicit root seed object when creating the execution root. That seed is the first step in the scope bootstrap order defined in `8.4`.

### 17.3 Domain Control Embedding

Complex editors integrate through three things only:

1. projection manifest: which read-only snapshot fields are exposed to schema
2. capability manifest: which namespace actions are allowed
3. domain bridge: host-private protocol object with `getSnapshot`, `subscribe`, `dispatch`

Domain-private state never enters Scope.

### 17.4 Typed Manifests

Projection fields and capability payloads are statically typed at assembly time. Invalid schema usage is rejected before runtime.

## 18. Security Model

Fabric enforces these non-negotiable rules:

1. no `eval`, `new Function`, or `with`
2. all expression execution goes through compiled IR evaluators
3. all effects go through Capability Programs
4. namespaced actions resolve only through lexical action-scope ownership
5. runtime does not perform permission policy decisions; schema must already be pruned
6. host bridge access is never ambiently exposed to expressions

## 19. Performance Strategy

### 19.1 Core Hot-Path Guarantees

1. static template slots have zero reevaluation cost
2. dynamic values resubscribe only to actual reads
3. compiler-certified stable values preserve reference identity
4. isolated high-frequency subtrees prevent invalidation fan-out
5. collection updates are row-delta based, not tree-rebuild based
6. async control policies are centralized, not duplicated

### 19.2 Cache Topology

Fabric may use three cache layers:

1. compile cache for Value Programs and action pipelines
2. scope snapshot cache for structural reads
3. optional prepared render snapshot cache for renderer contracts

### 19.3 Transaction Publication Model

Performance-critical work follows the transaction model from `9.2`:

1. patch
2. pure recompute to quiescence
3. publish one committed snapshot
4. enqueue effect work

Diagnostics and devtools publication are intentionally lower priority than committed runtime correctness.

### 19.4 Why This Beats Typical Frameworks

Compared with common low-code engines, Fabric improves the bottlenecks that usually dominate runtime cost:

1. no repeated schema interpretation in rendering hot paths
2. no watcher graph separate from expression graph
3. no form engine separate from dependency engine
4. no data-source refresh heuristics detached from write origins
5. no implicit parent-scope tunneling in collection-heavy trees

## 20. Diagnostics And Tooling

### 20.1 Compile-Time Diagnostics

Assembly emits diagnostics for:

1. unresolved node types
2. invalid prop or value shapes
3. invalid projection field access
4. invalid capability calls
5. impossible slot parameter references
6. validation rule target errors
7. ownership conflicts such as duplicate authoritative resource publishers
8. invalid declarative API shapes
9. invalid i18n key prefix usage; all keys must use the required unified prefix

### 20.2 Runtime Introspection

Every mounted node exposes:

1. mounted id
2. template id
3. debug locator
4. active scope id
5. current scope snapshot through inspector APIs keyed by `scopeId`
6. current prepared props and meta snapshot
7. validation and resource status where relevant

### 20.3 DOM Correlation

Renderers receive stable debug ids for DOM annotation, enabling inspection tools to jump from DOM back to template and debug metadata.

## 21. Extensibility Model

Extensions can plug into four bounded places:

1. renderer registry
2. pure built-in function registry for Value Programs
3. capability registry
4. host domain manifest registry

Extensions cannot:

1. inject arbitrary ambient scope objects
2. bypass Capability for side effects
3. register global mutable callbacks that expressions can directly call
4. mutate compiled templates at runtime

This keeps the kernel closed for semantic mutation but open for bounded extension.

## 22. Minimal Mental Model For Authors

Even with a strong kernel, the author-facing model remains progressive:

1. values: literal -> expression -> template -> action-based producer -> named resource
2. actions: dispatch -> guard -> then or onError -> parallel -> controlled operation
3. structure: visible -> when -> loop -> fragment -> dynamic fragment -> surface
4. writes: semantic command -> structured patch

The author does not need to learn separate reactive, form, watcher, and fetch languages.

## 23. What Makes v7 Better Than Existing Baselines

The design claims superiority only where there is a structural reason, not marketing language.

### 23.1 Better Semantic Compression

One dependency model covers values, resources, reactions, validation, and render subscriptions.

### 23.2 Better Ownership

Lexical ownership eliminates large classes of ambient runtime coupling and refresh ambiguity.

### 23.3 Better Optimization Surface

The assembly layer produces explicit compile tags, pipelines, manifests, and ownership metadata, so the runtime can optimize by construction instead of inference.

### 23.4 Better Domain Isolation

Complex editors remain private systems with narrow projection and capability contracts, so the core stays stable instead of absorbing domain-specific abstractions.

### 23.5 Better Determinism

Deterministic transactions and explicit effect phases avoid many ordering bugs that appear when low-code runtimes lean on UI-framework lifecycle side effects.

## 24. Open Risks

This design is intentionally ambitious. The main risks are:

1. the assembly layer becomes large and must stay disciplined
2. compiler-certified referential reuse for structured values requires careful implementation
3. validation graph and action pipeline tooling need strong diagnostics to remain understandable
4. projection manifest typing must be ergonomic enough for host teams

These are acceptable because they preserve a small runtime core and push complexity toward analyzable compilation boundaries.

## 25. Final Position

If the goal is not merely to build another configurable renderer but to build the strongest low-code execution substrate, the optimal path is:

1. keep the primitive set small
2. make compilation do the structural work
3. unify all dynamic reads under one dependency model
4. unify all visible writes under one capability model
5. enforce lexical ownership
6. isolate domain-specific complexity behind typed manifests and bridges

That is Fabric v7.
