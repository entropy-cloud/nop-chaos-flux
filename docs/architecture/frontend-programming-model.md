# Flux Frontend Programming Model

## Purpose

This document defines the closed core programming model executed by `Flux`.

It answers four questions:

1. What are the true `Flux` core `Primitive Category` values?
2. Why is this primitive set sufficient?
3. Through which channels may `Schema` cause visible effects?
4. What must remain outside `Flux` core?

This is a normative architecture document.

## Precedence

This document is the top-level contract for:

- `Flux` primitive categories
- primitive sufficiency and promotion rules
- the authority model for `Schema`-visible effects
- the boundary between `Flux` core and host/domain concerns

If a narrower document conflicts with this document about whether a concept is a `Primitive Category`, a host concept, a domain concept, or an implementation concern, this document wins.

## Canonical Term Policy

This document uses a strict `Canonical Term Policy`.

Rules:

1. If a core concept already has a stable English name in code or in the active architecture baseline, this document must use that name as the only canonical term.
2. Explanatory prose may clarify a concept, but must not replace the canonical term with a synonym.
3. Once adopted, a canonical term must remain stable and unique throughout the document.
4. Historical names may appear only in a dedicated legacy-mapping section.
5. New core concepts should prefer English names that align with code, diagnostics, and debugger output.

### Canonical Terms

| Canonical Term | Meaning |
| --- | --- |
| `Final Execution Schema` | the already-assembled schema consumed by `Flux` at runtime after static structure decisions, default expansion, and static trimming are complete |
| `Primitive Category` | an irreducible author-visible semantic role in `Flux` core |
| `Base Tree` | the core structural tree of schema nodes |
| `Region` | a named child fragment of a node |
| `ScopeRef` | the lexical data-environment primitive |
| `Schema-visible Scope` | the lexical data visible to `Schema` evaluation |
| `Lexical Ownership` | ownership that follows scope or subtree boundaries |
| `Value` | the unified executable value model |
| `Logical Value` | one authoritative published binding target |
| `Resource` | the runtime-owned value-producer primitive |
| `Reaction` | the watch/effect primitive |
| `Capability` | the only author-visible authority path for effects |
| `ActionScope` | the lexical capability environment |
| `ComponentHandleRegistry` | the explicit instance-capability lookup layer |
| `Host Projection` | readonly host snapshot data admitted into `Schema-visible Scope` |
| `Authoring Model` | the editable, round-trip-preserving source model |
| `Execution Model` | the `Final Execution Schema` plus runtime-owned state and sidecars |
| `Semantic Overlay` | a runtime layer orthogonal to ordinary scope data whose ownership follows the `Base Tree` or lexical scopes |
| `ActionSchema` | the runtime action descriptor type |
| `ActionResult` | the normalized runtime result of an action |
| `ActionContext` | the runtime dispatch context for actions |
| `RendererRuntime` | the runtime orchestrator visible to renderers |
| `FormRuntime` | the runtime interface for forms |
| `PageRuntime` | the runtime interface for pages |
| `DomainBridge` | a host-private bridge contract, not a core primitive |
| `Known-Solution Envelope` | the set of known architectural solution families relevant to this problem space, including non-mainstream but feasible ones |
| `Feasibility Baseline` | the current platform constraints under which a superior solution must be implementable today |

### Terms To Avoid As Canonical Names

| Avoid As Canonical Name | Use Instead |
| --- | --- |
| `ComponentTree` | `Base Tree` |
| `StateTree` | `ScopeRef` / `Schema-visible Scope` |
| `ActionTree` | `ActionScope` |
| “data-source primitive” | `Resource` |
| “watcher primitive” / “effect primitive” | `Reaction` |
| “host bag” / “host scope” | `Host Projection` |
| “authoring model” and “execution model” used interchangeably | distinguish `Authoring Model` and `Execution Model` |

## Key Terms

| Term | Definition |
| --- | --- |
| `Schema-visible Scope` | the lexical data visible to `Schema` evaluation and `Schema`-authored behavior |
| `Lexical Ownership` | runtime lifetime, shadowing, replacement, and disposal that follow the current scope or subtree boundary |
| `Logical Value` | one authoritative published binding target together with producer-owned runtime status |
| `Known-Solution Envelope` | the relevant set of industry-known solutions, including non-mainstream but implementable ones |
| `Feasibility Baseline` | the current browser and application infrastructure baseline within which a superior design must work |

## Core Claim

`Flux` is a `Final Execution Schema` frontend runtime for a frontend programming model.

That has a precise meaning:

- `Flux` executes an already-assembled `Final Execution Schema`
- `Flux` does not use runtime interface growth as its main answer to variation
- `Flux` does not treat design tools or domain runtimes as reasons to keep inventing new `Primitive Category` values

The design target is the smallest primitive set that can standardize frontend structure, data visibility, value derivation, runtime-owned value production, watched consequences, authority, and host snapshot admission:

- without overlapping responsibility
- without collapsing everything into one giant mutable runtime bag
- without forcing domain complexity into `Flux` core vocabulary

## Best-Known Feasible Standard

In this document, “optimal” does not mean timeless perfection. It means:

> the best-known feasible design inside the current `Known-Solution Envelope` and inside the `Optimization Envelope` defined below.

### Known-Solution Envelope

The `Known-Solution Envelope` includes all known architectural solution families relevant to next-generation low-code frontend runtimes, including:

- schema-driven mega-runtime systems such as `AMIS`, `AppSmith`, and `Retool`
- form-centric or field-graph reactive systems such as `Formily`
- data runtime libraries such as `TanStack Query`, `SWR`, `RTK Query`, and `Apollo`
- local-first and sync-first systems such as `ElectricSQL`, `PowerSync`, `Triplit`, and `RxDB`
- workflow and state-machine systems such as `XState` and BPMN-like runtimes
- collaborative document engines and patch/transaction systems such as `JSON Patch`, `ProseMirror` transactions, OT, and CRDT engines
- server-first assembly approaches such as loader-based schema assembly and `RSC`-style server computation boundaries
- non-mainstream innovative designs, but only if they are concretely implementable on the `Feasibility Baseline`

### Feasibility Baseline

For a solution to beat `Flux`, it must be implementable today on a realistic frontend stack with:

- browser execution
- `TypeScript`
- `React` or an equivalent UI host
- `useSyncExternalStore`-class store integration
- a loader layer that can run on server or pre-render assembly infrastructure
- ordinary network, caching, and host-shell facilities already available in current products

Architectures that require unavailable platform primitives, speculative browser capabilities, or a total rewrite of host infrastructure are not counted as superior solutions here.

### Optimization Envelope

This document claims optimality only for systems that:

- execute already-assembled `DSL` programs rather than owning authoring-time structural assembly inside the runtime
- must support ordinary pages, forms, data views, dialogs, and complex workbench-like hosts under one runtime
- prefer stable author-visible semantics and domain isolation over plugin-marketplace-first runtime extensibility

Outside this envelope, other architectures may be locally preferable.

### Practical Acceptance Test

This model should be considered optimal only if all of the following remain true as the platform grows:

- new domain complexity mainly grows domain schema, domain core, or thin host protocols
- renderer authors can reuse the same `Value` / `Resource` / `Reaction` / `Capability` rules without inventing renderer-local lifecycle semantics
- adding a new complex host does not require new `Flux`-wide provider families, ambient registries, or new schema authority channels
- no other known feasible architecture clearly dominates it on primitive minimality, cross-domain sufficiency, host isolation, and implementation feasibility

## Platform Layering

A next-generation low-code platform built on `Flux` should be understood as four separate layers:

1. `Authoring Model` and round-trip concerns
2. loader / projection / policy trimming / final schema assembly
3. `Flux` `Execution Model`
4. host and domain runtimes behind `Host Projection` and `Capability` boundaries

`Flux` is the execution core of the platform, not the whole platform.

### Loader Responsibilities

Permissions, `feature flag` structure, `i18n`, inheritance, and authoring-time structural assembly do not belong to the `Flux` runtime surface.

| Need | Layer | Mechanism |
| --- | --- | --- |
| role-based node trimming | loader | remove unauthorized nodes before `Final Execution Schema` reaches `Flux` |
| `feature flag` structure trimming | loader | static trimming before runtime |
| `i18n` string replacement | loader | pure structure transformation |
| inheritance / override expansion | loader | `x:extends`-style structure assembly |
| static defaults | loader | final default expansion |
| runtime visibility / disabled state | `Value` | expression evaluation inside the runtime |
| lazy remote schema fragment loading | `dynamic-renderer` host type | controlled runtime assembly boundary |

Key rule:

> if a problem can be solved in structure transformation, it must not be dragged into the runtime surface.

### `dynamic-renderer` Versus `data-source`

`dynamic-renderer` and ``data-source`` are not the same thing:

- `dynamic-renderer` performs fragment assembly and decides what fragment to render
- ``data-source`` declares a `Resource` and decides how a `Logical Value` is produced and published

`dynamic-renderer` is therefore not a second `Resource` surface. It is a controlled runtime assembly boundary.

When the input that determines `dynamic-renderer` loading changes, the old fragment must be disposed and a new fragment must be assembled. That is re-assembly, not ordinary `Resource` invalidation.

## `Final Execution Schema` Boundary

`Flux` core executes a `Final Execution Schema`.

That means:

- structure is already assembled
- static defaults are already expanded
- static policy trimming is already done
- node kinds are already decided

`Flux` still performs runtime work, but only runtime work such as:

- `Value` evaluation
- `Resource` lifecycle management
- `Reaction` scheduling
- `Capability` resolution
- `Host Projection` consumption

`Flux` does not perform open-ended loader-like schema rewriting, type invention, inheritance expansion, or profile assembly in the browser runtime.

Allowed runtime structural multiplication is narrow and derivative only. It includes:

- rendering already-declared child templates against item scopes
- conditional activation or omission of already-compiled nodes or `Region` fragments
- virtualization or retention strategies that do not change the author-visible structural contract

## `Authoring Model` And `Execution Model`

`Flux` owns only the `Execution Model`.

Normative rules:

1. the `Authoring Model` may preserve source locations, aliases, round-trip fidelity, editor-only metadata, and domain editing structure
2. loader/projection layers translate the `Authoring Model` into the `Final Execution Schema`
3. runtime semantics must not depend on authoring-only metadata
4. if removing authoring-only metadata changes runtime behavior, the boundary is wrong
5. complex designers may keep their own editing session models, but `Flux` still consumes only execution projections plus host capabilities

## Primitive Sufficiency And Promotion

### Sufficiency Test

The primitive set is sufficient if every behavior worth standardizing can be expressed as one of:

- structure over the `Base Tree`
- `Value` evaluation against `ScopeRef`
- runtime-owned value production via `Resource`
- watched consequence dispatch via `Reaction`
- `Capability` lookup or explicit instance targeting
- readonly `Host Projection`
- domain or host semantics built behind those boundaries

If a feature seems to need more than that, the first assumption must be that it belongs to host/domain architecture or schema convention, not that `Flux` needs a new `Primitive Category`.

### Promotion Test

A concept may become a new `Primitive Category` only if all of the following are true:

1. it is cross-domain
2. it is not reducible to existing primitives plus conventions
3. it is semantically stable
4. it is author-visible at the `Flux` schema layer
5. it is not merely an implementation convenience
6. it is not only a host/domain escape hatch

### Three Exclusion Rules

1. Not every important runtime system is a primitive.
2. `Schema-visible Scope` carries data, not imperative authority objects.
3. `Schema` causes author-visible effects only through `Capability`.

## Derived Runtime Systems Are Not Automatically Primitives

`Flux` may have many important runtime systems built from the primitive set, for example:

- `FormRuntime`
- `PageRuntime`
- dialog runtime
- debugger runtime
- complex host wiring

These may be very important in implementation. They still do not automatically become `Primitive Category` values.

## The Closed Primitive Set

`Flux` core has exactly seven `Primitive Category` values.

### 1. `Base Tree`

The only real structural primitive is the `Base Tree` of schema nodes.

Each node is identified by:

- `type`
- named `Region` values

The `Base Tree` owns:

- structure
- parent/child relationships
- lifecycle anchoring
- renderer selection

#### `type`

`type` is the canonical final-model node kind. It selects:

- compile-time field interpretation
- renderer binding
- runtime policies for that node kind

It is a runtime execution concept, not the full authoring metadata contract for design tools.

#### `Region`

A `Region` is a named child fragment of a node.

Typical examples:

- `body`
- `actions`
- `header`

`Region` values are structural composition points. They are not arbitrary untyped schema blobs.

### 2. `ScopeRef`

`ScopeRef` is the unique lexical data-environment primitive.

`ScopeRef` owns:

- path-based reads
- own-scope writes
- parent shadowing
- optional materialization fallback

`optional materialization fallback` means the runtime may construct a temporary whole-object view of the currently visible lexical data only for APIs that truly need object materialization. It is a fallback, not the preferred hot path.

`Flux` does not have one giant mutable state object tree. It has lexical scopes plus runtime-owned sidecars whose lifetime follows `Lexical Ownership`.

#### Runtime Sidecars

Runtime sidecars may exist for:

- `Resource` runtime state
- `Reaction` runtime state
- scope-scoped caches
- diagnostics and monitors

They must not become methods or mutable protocol objects attached to `ScopeRef` itself.

#### `Schema-visible Scope`

`Schema-visible Scope` is the lexical data visible to:

- expressions
- templates
- dynamic props and meta values
- `Resource` publication targets
- `Reaction` watched values
- `ActionSchema` argument evaluation

`Schema-visible Scope` must never become a behavior registry.

#### Scope Admission Rule

Allowed in `Schema-visible Scope`:

- readonly DTO-style snapshot data
- ids, labels, summaries, and expression-friendly derived data
- published `Resource` values
- readonly `Host Projection` snapshot fields
- ordinary runtime-subsystem-owned lexical data whose owning subsystem is clear

Not allowed in `Schema-visible Scope`:

- mutable domain-core objects
- bridges, command buses, or adapters
- provider registries
- `ComponentHandle` objects
- long-lived controllers or protocol state machines
- objects whose main meaning is imperative methods

Admission test:

- if it has imperative methods, lifecycle ownership, or protocol state, it is not a scope value
- if `Schema` must mutate it directly to make the system work, it does not belong in scope

### 3. `Value`

`Flux` has one executable `Value` model.

`Value` may be:

- literal
- expression
- template
- array
- object

All of them compile through one value IR and evaluate against `ScopeRef`.

Hard rule:

- a `Value` is a read result, not a behavior surface

#### `Value` Rules

1. `Flux` has one executable `Value` model
2. derived business values belong to `Value` or `Resource`, not to `Reaction`
3. change detection uses semantic top-level equality
4. identity reuse is an optimization, not the public semantic definition of equality

`semantic top-level equality` means:

- primitives compare using `Object.is`-style semantics
- arrays and objects compare by top-level structure and top-level entry identity/value only
- deeper equivalence is not the default contract unless a narrower subsystem says otherwise

#### `Value` Versus `Resource`

A derivation stays a plain `Value` when all of the following are true:

- it needs no runtime-owned lifecycle
- it needs no loading/error/stale state
- it needs no cancellation, polling, refresh policy, or cache coordination
- it is simply reevaluated against current scope

A derivation becomes a `Resource` when any of the following are true:

- it needs runtime-owned lifecycle
- it needs explicit publication into scope
- it needs loading/error/stale semantics
- it needs invalidation, refresh, cancellation, polling, dedup, subscribe, or cache coordination

#### Constructive Example

If `B = f(A)`, the correct modeling is a `Value`, not a `Reaction`.

```json
{
  "type": "input-text",
  "name": "shipping.province",
  "value": "${getDefaultProvince(shipping.country)}"
}
```

No `Reaction` is required because no effect is being caused.

### 4. `Resource`

`Resource` is the runtime-owned value-producer primitive.

The current public schema surface remains:

- ``type: 'data-source'``

Hard rules:

- one `Resource` publishes one `Logical Value`
- publication target is normatively explicit through `name` or `dataPath`
- `Resource` lifecycle is runtime-owned
- `Resource` is not a hidden imperative effect engine
- author-visible mutation requests do not happen through `Resource`; they happen through `Capability`

#### Public Surface And Identity

`name` is the preferred author-visible identity.

Normative identity rules:

1. new schema should use `name` as the unique `Resource` identity
2. `id` remains a legacy compatibility field
3. if both `name` and `id` exist, runtime targeting resolves by `name`; `id` is compatibility metadata only
4. `name` is an identifier, not a path expression; it must not contain path syntax such as `.` or `[]`
5. anonymous resources are valid only when they do not need explicit targeting through `Capability`

| Configuration | Runtime target identity | Published path |
| --- | --- | --- |
| `name` only | `name` | `name` |
| `name` + `dataPath` | `name` | `dataPath` |
| legacy `id` + `dataPath` | `id` | `dataPath` |
| anonymous `dataPath` only | none | `dataPath` |

#### Why `name` Instead Of Legacy Merge-Into-Scope

The legacy AMIS-style behavior of publishing without an explicit binding target by merging into the current scope is non-normative and rejected because:

- it causes namespace pollution
- it hides ownership
- it makes collisions and debugging ambiguous

#### Publication Contract

The authoritative binding contract is:

- `name`, when present and `dataPath` is absent
- `dataPath`, when present

`statusPath`, when present, is the normative readonly status-summary contract.

#### Initial Value And `statusPath`

Before the first successful publication, a `Resource` binding path evaluates to `undefined`.

If a `Schema` needs to distinguish “not published yet” from “published empty value”, it must use `statusPath` and not value-shape guessing.

When `statusPath` is used, the `Resource` may publish a readonly summary DTO containing fields such as:

- `loading`
- `ready`
- `stale`
- `error`
- `optimisticPending`
- `canRollback`

`statusPath` is not a second `Logical Value`. It is runtime-owned summary data.

`Resource` runtime state is not ambient schema-visible data. Host code and debuggers may inspect it out of band. If schema must render producer status, it must declare `statusPath` explicitly; there is no implicit hidden sibling-path or second hidden publication channel.

#### `mergeStrategy`

Incoming producer values may be reconciled using `mergeStrategy`:

| `mergeStrategy` | Meaning |
| --- | --- |
| `replace` | replace the current value |
| `append` | append new array items to the end |
| `prepend` | prepend new array items to the beginning |
| `merge` | shallow object merge: `{ ...oldValue, ...newValue }` |
| `upsert` | keyed array merge using `mergeKey` |

`upsert` rules:

1. old and new values must both be arrays
2. `mergeKey` is required
3. if an incoming item has the same `mergeKey` value as an existing item, it replaces that item
4. otherwise it is appended in input order
5. if an item is missing the `mergeKey` field, publication fails with a diagnostic

Deep recursive object merge is not part of the core `Resource` contract.

#### Streams And Push Producers

A push-backed producer such as WebSocket or SSE is still a `Resource`, not a new primitive.

```json
{
  "type": "data-source",
  "name": "liveOrders",
  "api": {
    "url": "/ws/orders",
    "method": "subscribe"
  },
  "mergeStrategy": "upsert",
  "mergeKey": "id"
}
```

Stream lifecycle such as connect, reconnect, heartbeat, and unsubscribe belongs to the producer implementation contract, not to a new schema primitive.

If subscription parameters are expression-derived, parameter changes invalidate the old subscription and establish a new one. That is ordinary `Resource` invalidation, not fragment re-assembly.

#### `Lexical Activation`

`Resource` activation is determined by `Lexical Ownership` together with the currently active rendered subtree.

For the core model, `currently active rendered subtree` means:

- the subtree is mounted in the live runtime host tree
- it is not disposed or replaced
- it is not marked inactive by a narrower host/runtime contract such as a retained-but-suspended subtree

If a host or narrower subsystem introduces retained, preloaded, virtualized, hidden, or suspended subtrees, it must explicitly define whether `Resource` and `Reaction` instances in that boundary are active, suspended, or disposed. Activation semantics must not remain implicit.

#### `TanStack Query` Concept Alignment

Using `TanStack Query` to implement API-backed `Resource` behavior such as caching, stale/freshness, dedup, background refetch, polling, observer lifecycle, and optimistic cache coordination is both feasible and appropriate.

It is an implementation strategy for `Resource`, not a new `Primitive Category`.

| `Flux` concept | `TanStack Query` analogue | Boundary rule |
| --- | --- | --- |
| `Resource` | a query-backed producer/controller or observer-backed runtime entry | query observer lifecycle stays behind `Resource` runtime |
| `name` / `dataPath` | none | they are `Flux` publication identity/path, not `queryKey` |
| producer cache identity | `queryKey` | `queryKey` is a runtime-owned internal cache identity derived from evaluated producer config and dependency inputs |
| published `Logical Value` | selected/adapted query `data` | publication still writes to the authoritative `name` or `dataPath` binding target |
| `statusPath` | readonly projection of query status | only a summary DTO is exposed, never the query object itself |
| `refreshSource` / invalidation | `refetch` / `invalidateQueries` | schema still accesses them only through `Capability` |
| polling | `refetchInterval` or equivalent | belongs to producer/runtime policy |
| retry / stale / cache / dedup | query options and observer state | remain `Resource` runtime implementation detail |
| `Optimistic Update` | mutation-side optimistic cache update | remains a `Capability`-side policy over a target `Resource` |

Boundary rules:

1. `queryKey` must never become the author-visible `Resource` identity; the public contract remains `name` / `dataPath`
2. shared cache is allowed, but publication ownership still follows `Lexical Ownership`; one cache entry may serve multiple `Resource` instances, but each active `Resource` still publishes only within its own lexical boundary
3. `TanStack Query` does not make transport timeout a core semantic unit; request timeout remains part of the producer/fetch layer or action/request execution contract
4. formula-backed `Resource` instances do not need query infrastructure
5. stream/subscription producers are not a first-class query-library primitive; query cache may be used as a cache sink, but connection lifecycle remains producer-owned
6. `QueryClient`, `QueryObserver`, mutation objects, and query result objects must not enter `Schema-visible Scope`
7. `mergeStrategy` is not a natural query-library schema contract; `append`, `prepend`, and `upsert` belong in `Resource` runtime or producer adapters at the publication layer

So the alignment is correct, but only if `TanStack Query` implements `Resource` rather than defining `Flux` schema ontology.

#### `Resource` Rules

1. ``data-source`` remains the public schema keyword; `Resource` is the primitive term
2. one `Resource` publishes one `Logical Value`
3. a `Logical Value` means one authoritative published binding target in scope
4. a `Resource` may additionally expose one optional readonly status-summary DTO through `statusPath`
5. `statusPath` summary is runtime-derived, not authoritatively writable business data
6. explicit binding through `name` or `dataPath` is mandatory for normative behavior
7. compatibility behavior that publishes without an explicit target is non-normative
8. `Resource` lifecycle is runtime-owned and scope-owned
9. registration, replacement, and disposal follow `Lexical Ownership`
10. runtime state and controllers do not become methods on `ScopeRef`
11. loading, error, stale, retry, dedup, polling, cancellation, and cache coordination belong to `Resource` runtime state
12. transport timeout belongs to the producer/request execution contract, not to a new primitive
13. external I/O belongs to the producer implementation contract
14. the only author-visible `Resource` control paths are activation, invalidation, refresh, and status observation
15. author-visible mutation requests must still occur through `Capability`
16. formula-backed resources require explicit binding and may infer dependencies automatically
17. within one owning lexical scope, a binding target may have at most one active publisher
18. multiple active publishers for the same binding target in one owning scope are invalid
19. child scopes may shadow a parent publication only through ordinary lexical shadowing
20. unrelated writes to an active `Resource` binding target are architectural errors unless a narrower subsystem defines a handoff or replacement transition
21. writes beneath a `Resource`-owned binding target count as writes to that authoritative value and are therefore invalid unless a narrower subsystem explicitly allows them
22. if `statusPath` is present, collisions or writes to that path are invalid
23. `name` or legacy `id` targeting is scoped by `Lexical Ownership`, not globally
24. duplicate `name` / legacy `id` values are allowed across different lexical scopes and invalid within the same owning lexical scope
25. synchronous `Resource` dependency chains must settle before `Reaction` evaluation for that turn
26. cycles in synchronous dependency chains are invalid and must stop with a structured diagnostic

#### `Resource` Versus `Host Projection`

The distinction is normative:

- use a `Resource` when the execution schema declares how a value is produced, refreshed, invalidated, polled, subscribed, or cached
- use `Host Projection` when an external host/domain runtime already owns the value, its session, and its refresh semantics, and `Flux` only consumes snapshot data
- do not model a workbench snapshot as a `Resource` merely because it changes over time
- do not model schema-authored fetch or compute policy as `Host Projection` merely because the data originates outside the browser

### 5. `Reaction`

`Reaction` is the watch/effect primitive.

The current public schema surface remains:

- ``type: 'reaction'``

Hard rules:

- a `Reaction` watches `Value` results
- a `Reaction` dispatches consequences through `Capability`
- a `Reaction` does not own authoritative business values
- a `Reaction` is not a general scripting runtime

#### `Reaction` Context

Reserved `Reaction` context names are:

- `value`
- `prev`
- `changed`
- `changedPaths`

They are injected only for `Reaction` guard/payload evaluation, not into ordinary `Schema-visible Scope`.

During that evaluation, `Reaction` context names take precedence over same-named ordinary scope fields.

#### `Reaction` Rules

1. `Reaction` is watch/effect only
2. it watches values, compares them, optionally checks guards, and dispatches actions
3. it does not publish authoritative values
4. if a dispatched action writes scope, that write is still an indirect consequence path, not `Reaction` publication
5. `immediate` means evaluate on activation and dispatch only when normal guard/change rules allow it
6. `debounce` delays dispatch, not `Resource` publication
7. `once` disposes the `Reaction` after its first successful trigger
8. on first activation before any prior observed value exists, `prev` is `undefined`, `changed` is `true` only if the reaction is running under `immediate` and the current evaluation passes normal change/guard checks, and `changedPaths` is `[]`
9. `changedPaths` is a readonly list of paths relative to the owning lexical scope for the current settled update turn
10. runtimes may conservatively report parent or wildcard paths when finer-grained provenance is unavailable
11. `Reaction` never executes host logic inline; it only dispatches through `Capability`

### 6. `Capability`

`Capability` is the only behavior primitive category.

It has two lookup modes plus one built-in authority family.

#### `ActionScope`

`ActionScope` is the lexical capability environment.

It owns:

- namespaced capability lookup
- lexical shadowing of namespaces

This is the real core behind what older language called `ActionTree`.

#### `ComponentHandleRegistry`

`ComponentHandleRegistry` owns explicit instance-target capability lookup.

It supports:

- explicit targeting of one mounted component instance
- invocation of explicitly exposed instance methods such as `component:submit`

Hard rules:

- lexical capability lookup and instance capability lookup are different resolution modes inside the same `Capability` primitive
- `componentId` targeting must be unique within the visible runtime host tree; ambiguity is a configuration error
- `componentName` targeting is secondary convenience only; multiple matches are an error, not an implicit first-match rule
- if a targeted handle is gone or replaced before dispatch resolves, the action fails with a stale-target or not-found diagnostic
- explicit instance-capability lookup is limited to the current visible runtime host tree or an explicitly composed registry boundary; there is no hidden ambient parent walk across disjoint host trees

#### Built-in `Capability`

Built-in platform actions are part of the same `Capability` model, not a second authority system.

Examples of built-in target classes include:

- the current runtime context
- registered `Resource` identities
- core form/page/dialog semantics

Built-in targeting must not expand into a generic runtime-object address space.

Built-in targeting fields belong to each built-in action contract. Reusing a field name for compatibility does not change the semantic target class.

#### Resolution Order

`Capability` resolution order is normative:

1. built-in platform capability
2. explicit instance capability via `ComponentHandleRegistry` for `component:<method>`
3. lexical namespaced capability via `ActionScope`
4. not-found diagnostic

Built-in names and the `component:` prefix are reserved and may not be shadowed.

#### Capability Provisioning And `xui:imports`

Capability imports are declaration-style provisioning specs in the `Final Execution Schema`, currently surfaced as `xui:imports`.

They:

- provision namespaces into the owning `ActionScope`
- are lexical by ownership
- are order-independent with respect to sibling render order
- do not create a new primitive or a second dispatch system

The embedding host/runtime may provide, deny, or policy-filter the corresponding handlers, but it may not reinterpret the meaning of an action name after compilation, make capability visibility depend on sibling render order, turn ambient global registration into the primary authority mechanism, or invent new author-visible capability categories at runtime.

#### `env`

`env` is not a schema-level behavior primitive. It is the host-provided implementation boundary behind capability execution for side-effect integrations such as fetch, notify, navigate, or opening external resources.

#### `ActionSchema` And `ActionResult`

`Capability` dispatch is described by `ActionSchema` and returns `ActionResult`.

Normative `ActionSchema` fields include:

- `action`
- `targetId`
- `componentId`
- `componentName`
- `componentPath`
- `formId`
- `dialogId`
- `api`
- `dataPath`
- `value`
- `values`
- `args`
- `when`
- `parallel`
- `retry`
- `timeout`
- `debounce`
- `continueOnError`
- `then`
- `onError`

The normalized `ActionResult` vocabulary includes:

- `ok`
- `cancelled`
- `skipped`
- `timedOut`
- `data`
- `results`
- `attempts`
- `error`

#### Result Classes

For control-flow purposes, `ActionResult` values fall into three classes:

1. `success-class`: `ok === true` and not `skipped`, not `cancelled`, not `timedOut`
2. `failure-class`: `ok === false` or `cancelled === true` or `timedOut === true`
3. `neutral-class`: `skipped === true`

`then` is triggered only by `success-class`.

`onError` is triggered only by `failure-class`.

`neutral-class` triggers neither `then` nor `onError`.

#### Chained Action Result Context

When an action executes inside `then` or `onError`, the runtime must expose a reserved branch-result context for expression evaluation.

Reserved names are:

- `result`: the triggering `ActionResult`
- `error`: `result.error` when the triggering result is `failure-class`; otherwise `undefined`
- `prevResult`: the prior action result in the current chain when one exists

Normative rules:

1. `result` is the canonical schema-visible name for the triggering `ActionResult`
2. `error` is a convenience alias for `result.error`, not an independent channel
3. `prevResult` aligns with `ActionContext.prevResult` on the runtime side
4. these names are reserved for chained-action evaluation and must not be published into ordinary `Schema-visible Scope` as ambient data
5. `then`, `onError`, `args`, `value`, `values`, and nested `when` expressions may read this branch-result context
6. branch action chains run in the current lexical scope; there is no second hidden payload bag beyond normal field evaluation and the reserved branch-result context

#### `ActionSchema` Control Flow

1. `when` is a structured precondition
2. if `when` evaluates false, dispatch returns a normal `ActionResult` with `skipped: true`
3. `then` executes only for `success-class`
4. `onError` executes only for `failure-class`
5. if `onError` is absent, framework default error handling applies
6. `continueOnError` affects only chain abortion behavior; it does not convert a `failure-class` result into `success-class`
7. `cancelled` and `timedOut` are `failure-class` by default
8. `then` and `onError` are sibling control-flow branches; they do not both execute for one result

#### `parallel`

`parallel` is an aggregate action node with `Promise.allSettled` semantics.

Normative rules:

1. all child actions are dispatched concurrently
2. aggregate `ActionResult.results` contains one child `ActionResult` per child action in stable input order
3. the aggregate result is `success-class` only if every child is `success-class` or `neutral-class`
4. if any child is `failure-class`, the aggregate result is `failure-class`
5. `parallel` does not automatically cancel sibling actions when one child fails
6. `then` or `onError` attached to the aggregate node read the aggregate `ActionResult`

#### `onError` Chain Semantics

1. `onError` may be a single `ActionSchema` or an array
2. actions inside `onError` may themselves have their own `onError`
3. a child inside `onError` failing does not recursively re-trigger the parent `onError`; it is handled by that child’s own `onError` or by framework fallback
4. if an `onError` child fails and has no own failure handling, framework fallback handles it and the remaining parent `onError` chain is aborted

#### Framework Fallback Error Handling

If no explicit `onError` handles a `failure-class` result, the runtime must provide a default observable failure path.

Baseline rule:

1. the framework should surface an error toast or equivalent host notification
2. message selection priority is: `error.userMessage` -> `error.message` -> generic fallback text
3. duplicate same-turn same-source fallback notifications should be deduplicated
4. localization of fallback text belongs to the host environment

#### `Reaction` Versus `ActionSchema` Control Flow

Use `then` / `onError` when the next step depends on completion, success, or failure of the current action.

Use `Reaction` when the trigger condition is a watched `Value` over time.

Do not use `Reaction` as a substitute for immediate action success/failure branching, and do not stretch `then` / `onError` into a long-running business workflow language.

#### `Optimistic Update` Policy

`Optimistic Update` is not a separate primitive and not a `Resource` mutation primitive.

It is a `Capability`-side control policy that temporarily updates the published `Logical Value` of a target `Resource` while an action is in flight.

This is the best-known feasible design because:

- it preserves the rule that author-visible mutation requests still go through `Capability`
- it avoids turning `Resource` into a mutation primitive
- it matches known query/mutation implementation structure such as `TanStack Query` without turning query and mutation into new primitive categories

Recommended shape:

```ts
interface OptimisticUpdatePolicy {
  targetId: string;
  value?: SchemaValue;
  mergeStrategy?: 'replace' | 'merge' | 'append' | 'prepend' | 'upsert';
  mergeKey?: string;
  rollback?: 'auto' | 'manual';
  mode?: 'reject-while-pending' | 'replace-pending';
}
```

Normative rules:

1. `Optimistic Update` targets a published `Resource`, not arbitrary scope data
2. the default `mode` is `reject-while-pending`
3. `replace-pending` is allowed only when the target `Resource` explicitly tolerates optimistic replacement
4. default `rollback` is `auto`
5. in `auto` mode, failure restores the pre-action published value before `onError` runs
6. in `manual` mode, failure marks `statusPath.canRollback = true` and leaves rollback to explicit `Capability` such as `rollbackSource`
7. `append`, `prepend`, and `upsert` are allowed only when the optimistic payload shape matches the target `Resource` publication shape
8. `Optimistic Update` modifies the target `Resource` publication and its `statusPath` summary, not unrelated scope fields

### 7. `Host Projection`

`Host Projection` is the host-boundary primitive category.

At core level it means only:

- readonly snapshot data enters `Schema-visible Scope`
- writes leave through `Capability` or `env`-backed effect paths behind `Capability`

It is not:

- a bridge object in scope
- a controller bag
- a session primitive
- a domain model

#### `Host Projection` Rules

1. host-visible schema data is readonly snapshot projection only
2. the schema-visible host surface contains only DTO-style snapshot data
3. snapshot freshness is host-driven
4. projection fields are mounted at host-owned lexical boundaries as ordinary readonly fields such as `session`, `doc`, `selection`, `activeNode`, `activeEdge`, or `runtime`
5. projected data is read with value semantics; no mutable identity contract is implied
6. hosts must replace snapshots rather than rely on visible in-place mutation
7. renderer-private internals may exist in code, context, or helpers, but they are not schema contract
8. temporary debug exposure of richer objects is non-normative
9. a special host type is still just a normal schema node kind plus special shell integration, not a new primitive
10. if schema authors own fetch, refresh, invalidate, polling, or caching policy for a value, that value belongs to `Resource`, not `Host Projection`
11. projection field names are fixed by host contract, not ad hoc aliases
12. projection field names are reserved inside the host-owned lexical boundary
13. projection path collisions with ordinary scope data or `Resource` publication are invalid
14. writes to projected host fields are invalid and must fail diagnostically
15. host snapshot replacement enters the normal settled-update mechanism
16. descendant scopes inside the same host-owned boundary must not shadow reserved projection names unless a narrower host contract explicitly rebinds them
17. projection becomes visible only after the host boundary is created

#### Thin Host Protocol Pattern

Complex workbench-like hosts may standardize a thin host-side protocol. It remains host architecture, not a schema-visible primitive family.

It should stay reducible to:

- snapshot subscription
- command dispatch
- session summaries such as dirty, busy, undo, redo, and leave-guard
- namespace wiring for host capabilities

It must not become:

- a generic plugin/provider registry
- an arbitrary method table
- a schema-defined free-form command bus

#### `DomainBridge`

`DomainBridge<TSnapshot, TCommand, TResult>` is a useful host-private pattern because it provides a minimal bridge shape:

- `getSnapshot()`
- `subscribe()`
- `dispatch()`

But `DomainBridge` itself must not enter `Schema-visible Scope` and is not a `Primitive Category`.

#### Editable Host Pattern

Complex editable hosts such as Flow Designer, report designer, and spreadsheet-like editors need one stable cross-host write pattern.

The best-known feasible pattern is:

- read through `Host Projection`
- write through `Capability`
- use structured patch DTOs as the baseline write surface for general property editing
- keep `DomainBridge` host-private behind that boundary

Recommended baseline `Capability`:

```json
{
  "action": "designer:applyPatch",
  "args": {
    "patches": [
      { "op": "replace", "path": "nodes.task-1.label", "value": "${form.label}" }
    ]
  }
}
```

Normative rules:

1. `namespace:applyPatch` is a recommended cross-host baseline capability surface
2. patch payloads must be DTO-style structured data, not host objects or bridge handles
3. generic inspectors, property panels, and bulk editors should prefer patch-based `Capability` calls over one-action-per-property vocabularies
4. hosts may still expose higher-level semantic commands such as layout, align, group, undo, or redo
5. applying a patch must still produce a new readonly `Host Projection` snapshot; direct mutable host bags remain invalid

## Execution Boundary Matrix

| Primitive | Owns authoritative value | May cause side effects | Lifecycle owner | Reads from | Writes to | Change basis | Schema-visible |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Value` | no | no | none beyond evaluation state | `ScopeRef` | nowhere | semantic top-level equality | yes |
| `Resource` | yes, for its `Logical Value` | producer-internal acquisition effects only | runtime, scoped by `Lexical Ownership` | `ScopeRef` plus producer config | one explicit authoritative target plus optional readonly `statusPath` | semantic top-level equality on published value and status DTO | yes |
| `Reaction` | no | yes, by dispatching `Capability` | runtime, scoped by `Lexical Ownership` | watched values | no authoritative business target | semantic top-level equality on watched value | yes |
| `Capability` | no | yes | runtime / host / addressed component | `ActionSchema`, `ActionContext`, `ScopeRef` | host/domain effects or instance methods | n/a | yes |
| `Host Projection` | no | no | host renderer | host snapshot | nowhere directly | host refresh semantics | yes |

This table is normative.

## Lexical Model And Resolution Model

`Flux` deliberately separates data lookup, behavior lookup, and instance targeting.

| Category | Mechanism | Resolution style |
| --- | --- | --- |
| data | `ScopeRef` | lexical path lookup |
| lexical `Capability` | `ActionScope` | lexical namespace lookup |
| instance `Capability` | `ComponentHandleRegistry` | explicit target lookup |

This split is architectural, not incidental.

At author-facing level, lookup should still feel simple:

- `Value` reads follow `ScopeRef`
- `Capability` lookup follows `ActionScope`
- instance capability calls require explicit target identity
- `Host Projection` data becomes readable as ordinary readonly scope data once admitted

## Operational Model: `Base Tree` Plus `Semantic Overlay`

Operationally, `Flux` is best understood as:

- one `Base Tree` anchoring structure, mount lifetime, and renderer selection
- a lexical data overlay through `ScopeRef`
- a lexical capability overlay through `ActionScope`
- runtime-owned execution overlays for `Resource` and `Reaction`, keyed by `Lexical Ownership`
- explicit instance-capability lookup through `ComponentHandleRegistry`
- host snapshot overlays injected through `Host Projection`

This is the recommended architecture-review mental model. It is not a second primitive ontology.

## Scheduling Model

Normative scheduling rules:

1. `Resource` invalidation happens before `Reaction` dispatch
2. scope writes settle before `Reaction` execution
3. `Reaction` runs asynchronously after the settled update turn, never inline inside the originating mutation path
4. synchronously computable `Resource` updates publish before `Reaction` evaluation for that turn
5. async `Resource` producers publish only when they complete in a later settled update turn
6. repeated triggers for the same `Reaction` within one settled update turn coalesce into one execution attempt
7. reaction-triggered writeback may cascade only up to a finite runtime limit
8. no re-trigger occurs when the watched value is semantically unchanged
9. high-frequency gesture loops, animation-frame coordination, and protocol state machines may remain host/domain systems as long as they cross into `Flux` only at stable publication or command boundaries
10. ready `Reaction` values execute in stable `Base Tree` path order; where multiple live instances share one compiled node path, runtime uses stable lexical instance order
11. writes or async completions produced by a `Reaction` schedule a later settled update turn instead of interleaving into the active reaction flush
12. if the cascade limit is reached, runtime aborts the remaining queue for that turn and surfaces a structured cycle error

`settled update turn` means the runtime boundary after synchronous writes for the current mutation path have completed and before asynchronous reaction work is flushed.

Implementation notes:

- `settled update turn` is a runtime-store concept, not a `React useEffect` ordering concept
- `React` may replay renders in concurrent mode, but it must not redefine what `Flux` considers the stable set of published values for a turn
- the cascade-protection limit should be configurable and should have a finite nonzero default

## Minimal Reconciliation With Older Vocabulary

| Older Language | Normative Interpretation |
| --- | --- |
| `ComponentTree` | `Base Tree` |
| `StateTree` | `ScopeRef` plus runtime-owned sidecars |
| `ActionTree` | `ActionScope` |
| `base tree + overlays` | correct operational picture; overlays are runtime organization over the same primitive categories, not extra primitives |
| `visibleOn` / `disabledOn` | use direct `Value` semantics through `visible` / `disabled` expressions |
| resource `id` as the main identity | `name` is the preferred `Resource` identity; `id` is compatibility-only |

## What Stays Outside `Flux` Core

The following remain outside `Flux` core even when they matter to real products:

- round-trip authoring concerns
- XML/JSON syntax preservation concerns
- source-preserving metadata
- domain document semantics
- graph, spreadsheet, report, and other domain algorithms
- typed domain command vocabularies
- workbench shells
- session models
- collaboration protocols
- high-frequency gesture loops
- layout, hit-testing, collision, and spatial algorithms
- plugin and provider families specific to one domain

These are outside core not because they are unimportant, but because they are:

- domain-specific
- host-specific
- reducible to existing primitives plus conventions
- or implementation systems rather than author-visible cross-domain semantics

They may appear to `Flux` only through:

- readonly `Host Projection`
- `Capability` invocation
- explicit instance targeting
- host behavior behind `Capability`
- a special host `type`

If a system carries imperative methods, protocol state, session ownership, or domain mutation authority, it is outside `Flux` core.

### Time, Protocol, And Collaboration Processes

`Flux` may standardize the author-visible surface of these systems without absorbing their internals:

- cross-domain value publication enters through `Resource` when the execution schema owns production policy
- watched consequences enter through `Reaction`
- host-owned snapshots enter through `Host Projection`
- arbitrary protocol commands, collaboration engines, gesture state machines, and spatial algorithms remain host/domain systems unless a future cross-domain semantic passes the promotion test

### Flow Designer As A Minimal Example

Flow Designer may be used as a host-boundary specimen, but it must not define `Flux` core vocabulary.

At `Flux` core level, it demonstrates only this pattern:

- a special host `type`
- readonly snapshot projection through `Host Projection`
- namespaced capability dispatch such as `designer:*`
- optional explicit instance capability escape hatch
- region-based shell composition

Its graph algorithms, layout behavior, collision logic, and domain-core semantics are outside `Flux` core.

## Constructive Reductions

The primitive set is not only restrictive; it is constructively expressive.

### Example 1: a field bound by `name`

- `Base Tree`: one node
- `ScopeRef`: one read/write binding location
- `Value`: expressions read that location
- `Capability`: events dispatch actions

### Example 2: remote select options

- `Resource`: one ``data-source`` publishes `lookups.countries`
- `ScopeRef`: `lookups.countries` becomes visible at its binding path
- `Value`: the select reads `${lookups.countries}`

No select-specific async primitive is needed.

### Example 3: field `B = f(A)`

- `Value`: field `B` uses an expression over `A`

No `Reaction` is needed.

### Example 4: validate a form after country changes

- `Reaction`: watch `${shipping.country}`
- `Capability`: dispatch `component:validate`

No new validation primitive is needed.

### Example 5: validation message from form state

- `ScopeRef`: form runtime owns ordinary lexical scope data such as form values and validation summaries
- `Value`: expressions derive the validation message to show
- `Capability`: submit and validate remain effect paths

No second UI-state primitive is needed.

### Example 6: workbench property editing

- `Host Projection`: readonly `doc` snapshot enters scope
- `Capability`: `designer:applyPatch` writes changes back
- host shell: host-private `DomainBridge` or equivalent bridge adapts domain core

No mutable host bag in scope is needed.

### Example 7: optimistic profile update

- `Capability`: one action dispatches an external mutation with `Optimistic Update` policy targeting `userProfile`
- `Resource`: `userProfile` remains the published `Logical Value`
- `statusPath`: exposes `optimisticPending` and `canRollback`

No separate query primitive and mutation primitive are required at the primitive-category level.

### Example 8: infinite scroll

- `Resource`: one ``data-source`` with `mergeStrategy: 'append'` publishes `items`
- `Capability` or `Reaction`: a stable-boundary action raises `currentPage`
- `Value`: the list reads `${items}` and renders

No infinite-scroll-specific primitive is needed.

## Why This Primitive Set Is Enough

Every frontend behavior worth standardizing in `Flux` must answer some combination of these questions:

1. Where is this node in the program structure?
2. Which data is visible here?
3. How is a value derived here?
4. Does some runtime-owned producer publish a value here?
5. Does some watched change trigger a consequence here?
6. Which authority may perform the effect?
7. Which readonly host snapshot is visible here?

These correspond exactly to the seven `Primitive Category` values:

1. `Base Tree`
2. `ScopeRef`
3. `Value`
4. `Resource`
5. `Reaction`
6. `Capability`
7. `Host Projection`

Anything not covered by those questions is either:

- a domain concern
- a host concern
- an implementation/runtime-system concern
- or a future candidate that must pass the promotion test

## Why This Is The Best-Known Feasible Design

Inside the `Known-Solution Envelope`, no known feasible alternative dominates this design across all required axes.

### Compared With Mega-Runtime Schema Systems

Systems that expose one giant mutable runtime bag are easy to start with but do not scale well in ownership clarity, namespace safety, or host isolation.

`Flux` is stronger because `ScopeRef`, `ActionScope`, and `ComponentHandleRegistry` remain separate.

### Compared With Form-Centric Reactive Graph Systems

Field-graph systems are excellent for forms but are not obviously the right universal runtime contract for pages, dialogs, data screens, and workbench hosts.

`Flux` keeps form semantics in `FormRuntime` while preserving a smaller cross-domain primitive set.

### Compared With Query/Mutation Library Ontologies

Libraries such as `TanStack Query` prove that query/mutation separation is useful implementation structure. They do not prove that query and mutation must become separate `Primitive Category` values.

`Flux` keeps `Resource` as the publication primitive and keeps mutation requests inside `Capability`, preserving cross-domain minimality while still allowing the best known runtime implementation strategies behind the boundary.

### Compared With Local-First Replicated Data Architectures

Local-first systems are compelling in collaboration-heavy products, but they are not universally superior across all low-code frontend domains and often require stronger backend and synchronization infrastructure.

Within the current `Feasibility Baseline`, they are best treated as producer strategies behind `Resource` or as host-owned systems behind `Host Projection`, not as mandatory core primitives.

### Compared With Mutable Host Bags

Letting schema mutate host-owned objects directly looks convenient, but it destroys ownership boundaries, makes rollback and diagnostics ambiguous, and leaks host protocol state into schema.

Readonly `Host Projection` plus patch-style `Capability` write is the best-known feasible compromise between power and isolation.

### Compared With A Separate Workflow Primitive

A second workflow or scripting primitive would overlap with `Reaction` and `ActionSchema`, enlarge the primitive set, and blur the boundary between UI consequence wiring and long-running business workflow.

The better design is:

- `Reaction` for watched frontend consequences
- `ActionSchema` / `ActionResult` control flow for immediate effect orchestration
- host/domain workflow engines outside `Flux` core

### Conclusion Of The Comparison Standard

Given the currently known feasible alternatives, this document treats the `Flux` design as optimal because:

- it is smaller than the known alternatives that solve the same cross-domain problem set
- it remains expressive enough for ordinary pages, forms, data views, dialogs, and editable workbench hosts
- it preserves hard ownership boundaries that the more convenient alternatives tend to collapse
- it can be implemented today with current frontend infrastructure

If a future known feasible architecture clearly dominates this one within the same envelope, this document must change. The claim here is best-known feasible optimality, not timeless perfection.

## Hard Invariants

`Flux` core must keep these invariants:

1. `Flux` is a `Final Execution Schema` runtime
2. `Base Tree` owns structure and lifecycle anchoring
3. `Value`, lexical `Capability`, and instance `Capability` stay distinct
4. `Host Projection` is readonly
5. one `Resource` publishes one `Logical Value`
6. `Reaction` is for consequences, not value derivation
7. `Resource` and `Reaction` ownership follow `Lexical Ownership` without turning `ScopeRef` into a behavior bag
8. schema-visible host surface and renderer-private host internals stay distinct
9. `Schema` causes effects only through `Capability`
10. new domain complexity does not automatically create new primitive categories
11. `Authoring Model` and `Execution Model` stay separate
12. shared workbench/session host protocols may exist, but schema still sees only `Host Projection` and `Capability`
13. canonical English terms must remain stable and unique once adopted
14. `Optimistic Update` is a `Capability`-side policy over a target `Resource`, not a new primitive

## Failure Conditions

The model should be considered under architectural failure pressure if any of the following start happening repeatedly:

- `ScopeRef` is asked to carry behavior tables, controllers, or mutable host objects
- domain-core objects are repeatedly exposed into `Schema-visible Scope`
- `ComponentHandle` values are treated as ordinary scope data
- `Resource` is used as an implicit imperative write engine
- `Resource` repeatedly needs schema-defined protocol commands or direct external-operation authority beyond value publication
- `Reaction` becomes a general workflow scripting runtime
- `then` / `onError` are repeatedly stretched into a long-running business workflow language
- `Host Projection` turns into a mutable host bag
- host helper protocols leak raw bridges, controllers, or domain runtimes into schema
- new domains repeatedly require new global provider categories
- authoring metadata leaks into runtime semantics
- canonical term usage drifts so that one concept is referred to by multiple unstable names

## Explicitly Closed Decisions

1. ``data-source`` remains the public schema keyword; `Resource` is the architectural primitive term
2. `Reaction` is a first-class watch/effect primitive
3. `name` is the preferred `Resource` identity; legacy `id` remains compatibility-only
4. publish-without-explicit-binding legacy behavior is non-normative
5. `mergeStrategy` supports `replace`, `append`, `prepend`, `merge`, and `upsert`
6. author-visible mutation requests remain under `Capability`, not `Resource`
7. `Optimistic Update` is a `Capability`-side policy over a target `Resource`, not a new primitive
8. `then` is the canonical success-branch field
9. `onError` is the explicit failure branch
10. built-in actions are part of `Capability`, not a separate authority system
11. `Host Projection` read plus patch-style `Capability` write is the baseline editable-host pattern
12. `DomainBridge` is a host-private implementation contract, not a schema-visible primitive
13. `dynamic-renderer` is a controlled fragment assembly boundary, not a `Resource`
14. query/mutation libraries such as `TanStack Query` are valid producer/runtime implementation strategies, not new primitive families
15. capability import provisioning such as `xui:imports` extends `ActionScope` provisioning only and does not create a new dispatch ontology

## Integrated JSON Example

This example compresses multiple host-local fragments into one page-sized sample. Any `designer:*` action shown below is assumed to execute inside the owning `designer-page` host boundary and its local `ActionScope`.

```json
{
  "type": "page",
  "body": [
    {
      "type": "data-source",
      "name": "countries",
      "dataPath": "lookups.countries",
      "statusPath": "lookups.countriesStatus",
      "api": {
        "url": "/api/countries",
        "method": "get"
      }
    },
    {
      "type": "data-source",
      "name": "items",
      "mergeStrategy": "append",
      "api": {
        "url": "/api/items",
        "params": {
          "page": "${currentPage}",
          "size": 20
        }
      }
    },
    {
      "type": "form",
      "id": "shipping-form",
      "body": [
        {
          "type": "input-text",
          "name": "shipping.city",
          "label": "City"
        },
        {
          "type": "select",
          "name": "shipping.country",
          "label": "Country",
          "options": "${lookups.countries}"
        },
        {
          "type": "input-text",
          "name": "shipping.province",
          "label": "Province",
          "value": "${getDefaultProvince(shipping.country)}"
        },
        {
          "type": "reaction",
          "watch": "${shipping.country}",
          "when": "${value !== prev}",
          "actions": [
            {
              "action": "component:validate",
              "componentId": "shipping-form"
            }
          ]
        }
      ]
    },
    {
      "type": "designer-page",
      "document": "${flowDocument}",
      "readonly": true
    },
    {
      "type": "button",
      "label": "Add Task Node",
      "onClick": {
        "action": "designer:applyPatch",
        "args": {
          "patches": [
            {
              "op": "insert",
              "path": "nodes",
              "value": {
                "id": "task-1",
                "type": "task",
                "label": "Task"
              }
            }
          ]
        },
        "onError": [
          {
            "action": "toast",
            "message": "Add failed: ${error.message}",
            "level": "error"
          }
        ]
      }
    },
    {
      "type": "button",
      "label": "Refresh Countries",
      "onClick": {
        "action": "refreshSource",
        "targetId": "countries"
      }
    },
    {
      "type": "button",
      "label": "Submit And Navigate",
      "onClick": {
        "action": "component:submit",
        "componentId": "shipping-form",
        "then": [
          {
            "action": "navigate",
            "args": { "to": "/confirmation" }
          }
        ],
        "onError": [
          {
            "action": "toast",
            "message": "Submit failed: ${error.message}",
            "level": "error"
          }
        ]
      }
    }
  ]
}
```

## Related Documents

- `docs/architecture/flux-core.md`
- `docs/architecture/api-data-source.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-dsl-vm-extensibility.md`
- `docs/articles/flux-design-introduction.md`
- `docs/references/terminology.md`
