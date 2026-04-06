# Flux Frontend Programming Model V6

## Purpose

This document defines the closed core programming model executed by `Flux`.

It answers six questions:

1. What are the true `Flux` core `Primitive Category` values?
2. Why is this primitive set sufficient?
3. What is the best-known feasible execution model for next-generation low-code frontend runtimes inside the current envelope?
4. Through which channels may `Schema` cause visible effects?
5. Which runtime systems are derived from the primitive set rather than promoted into it?
6. What must remain outside `Flux` core?

This document is normative architecture.

This document is the successor to `docs/architecture/frontend-programming-model.md`.

## Precedence

This document is the top-level contract for:

- `Flux` primitive categories
- primitive sufficiency and promotion rules
- the authority model for `Schema`-visible effects
- the boundary between `Flux` core and host/domain concerns
- the execution baseline connecting `Value`, `Resource`, `Reaction`, and semantic lifecycle-driven action entry

If a narrower document conflicts with this document about whether a concept is a `Primitive Category`, a host concept, a domain concept, or a derived runtime system, this document wins.

## Canonical Term Policy

This document uses a strict `Canonical Term Policy`.

Rules:

1. If a core concept already has a stable English name in code or in the active architecture baseline, this document must use that name as the only canonical term.
2. Explanatory prose may clarify a concept, but must not replace the canonical term with a synonym.
3. Once adopted, a canonical term must remain stable and unique throughout the document.
4. Historical names may appear only in a dedicated legacy-mapping section.
5. New core concepts should prefer English names that align with code, diagnostics, and debugger output.
6. Derived runtime systems may receive canonical names, but they must not be promoted into `Primitive Category` status unless they pass the promotion test.

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
| `Dependency Set` | the path set collected during dynamic evaluation and used for targeted invalidation or re-evaluation |
| `Resource` | the runtime-owned value-producer primitive |
| `Reaction` | the watch/effect primitive |
| `Capability` | the only author-visible authority path for effects |
| `ActionScope` | the lexical capability environment |
| `ComponentHandleRegistry` | the explicit instance-capability lookup layer |
| `Action Algebra` | the derived runtime system that composes, sequences, branches, aggregates, and classifies `Capability` dispatch through `ActionSchema` and `ActionResult` |
| `Operation Control` | the shared execution-control layer above transport details and below consumer-specific policy |
| `Semantic Lifecycle Entry` | a node-owned semantic entry point such as form submit, page enter, dialog open, or host-specific semantic activation |
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
| `Settled Update Turn` | the runtime boundary after synchronous writes for the current mutation path have completed and before asynchronous consequence work is flushed |

### Terms To Avoid As Canonical Names

| Avoid As Canonical Name | Use Instead |
| --- | --- |
| `ComponentTree` | `Base Tree` |
| `StateTree` | `ScopeRef` / `Schema-visible Scope` |
| `ActionTree` | `ActionScope` |
| `workflow primitive` | `Action Algebra` when describing derived control flow, or host/domain workflow engine when describing long-running process semantics |
| `data-source primitive` | `Resource` |
| `watcher primitive` / `effect primitive` | `Reaction` |
| `host bag` / `host scope` | `Host Projection` |
| `authoring model` and `execution model` used interchangeably | distinguish `Authoring Model` and `Execution Model` |
| `api config` used for timeout/throttle/retry/dedup as one undifferentiated thing | distinguish `ApiObject`, `Operation Control`, and consumer-specific policy |

## Key Terms

| Term | Definition |
| --- | --- |
| `Schema-visible Scope` | the lexical data visible to `Schema` evaluation and `Schema`-authored behavior |
| `Lexical Ownership` | runtime lifetime, shadowing, replacement, and disposal that follow the current scope or subtree boundary |
| `Logical Value` | one authoritative published binding target together with producer-owned runtime status |
| `Dependency Set` | the tracked path set that links dynamic reads to targeted invalidation |
| `Known-Solution Envelope` | the relevant set of industry-known solutions, including non-mainstream but implementable ones |
| `Feasibility Baseline` | the current browser and application infrastructure baseline within which a superior design must work |

## Core Claim

`Flux` is a `Final Execution Schema` frontend runtime for a frontend programming model.

That has a precise meaning:

- `Flux` executes an already-assembled `Final Execution Schema`
- `Flux` does not use runtime interface growth as its main answer to variation
- `Flux` does not treat design tools, collaboration engines, local-first replication, or domain runtimes as reasons to keep inventing new `Primitive Category` values

The design target is the smallest primitive set that can standardize frontend structure, data visibility, value derivation, runtime-owned value production, watched consequences, authority, and host snapshot admission:

- without overlapping responsibility
- without collapsing everything into one giant mutable runtime bag
- without forcing domain complexity into `Flux` core vocabulary

## Best-Known Feasible Standard

In this document, "optimal" does not mean timeless perfection. It means:

> the best-known feasible design inside the current `Known-Solution Envelope` and inside the `Optimization Envelope` defined below.

### Known-Solution Envelope

The `Known-Solution Envelope` includes all known architectural solution families relevant to next-generation low-code frontend runtimes, including:

- schema-driven mega-runtime systems such as `AMIS`, `AppSmith`, and `Retool`
- form-centric or field-graph reactive systems such as `Formily`
- data runtime libraries such as `TanStack Query`, `SWR`, `RTK Query`, and `Apollo`
- workflow and state-machine systems such as `XState` and BPMN-like runtimes
- server-first assembly approaches such as loader-based schema assembly and `RSC`-style server computation boundaries
- collaboration engines, patch/transaction systems, OT systems, and CRDT systems
- local-first and sync-first systems such as `ElectricSQL`, `PowerSync`, `Triplit`, and `RxDB`
- non-mainstream innovative designs, but only if they are concretely implementable on the `Feasibility Baseline`

Important boundary:

- collaboration, CRDT, OT, and local-first concerns are real and important
- they are not objections to the primitive closure by themselves
- inside this architecture they remain producer strategies, editor architectures, or host/domain systems unless a future cross-domain author-visible semantic passes the promotion test

### Feasibility Baseline

For a solution to beat `Flux`, it must be implementable today on a realistic frontend stack with:

- browser execution
- `TypeScript`
- `React` or an equivalent UI host
- `useSyncExternalStore`-class store integration
- a loader layer that can run on server or pre-render assembly infrastructure
- ordinary network, caching, tracing, and host-shell facilities already available in current products

Architectures that require unavailable platform primitives, speculative browser capabilities, or a total rewrite of host infrastructure are not counted as superior solutions here.

### Optimization Envelope

This document claims optimality only for systems that:

- execute already-assembled `DSL` programs rather than owning authoring-time structural assembly inside the runtime
- must support ordinary pages, forms, data views, dialogs, and complex workbench-like hosts under one runtime
- prefer stable author-visible semantics and domain isolation over plugin-marketplace-first runtime extensibility
- need one shared execution baseline for declarative values, runtime-owned producers, watched consequences, and semantic lifecycle-driven effects

Outside this envelope, other architectures may be locally preferable.

### Practical Acceptance Test

This model should be considered optimal only if all of the following remain true as the platform grows:

- new domain complexity mainly grows domain schema, domain core, or thin host protocols
- renderer authors can reuse the same `Value` / `Resource` / `Reaction` / `Capability` rules without inventing renderer-local lifecycle semantics
- adding a new complex host does not require new `Flux`-wide provider families, ambient registries, or new schema authority channels
- `Action Algebra`, `Operation Control`, and `Semantic Lifecycle Entry` can evolve without increasing the primitive count
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

`dynamic-renderer` and `data-source` are not the same thing:

- `dynamic-renderer` performs fragment assembly and decides what fragment to render
- `data-source` declares a `Resource` and decides how a `Logical Value` is produced and published

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
- dependency collection and targeted invalidation
- `Resource` lifecycle management
- `Reaction` scheduling
- `Capability` resolution
- `Host Projection` consumption
- semantic lifecycle dispatch at runtime-owned node boundaries

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
5. complex designers may keep their own editing session models, collaboration state, or local-first synchronization layers, but `Flux` still consumes only execution projections plus host capabilities

## Primitive Sufficiency And Promotion

### Sufficiency Test

The primitive set is sufficient if every behavior worth standardizing can be expressed as one of:

- structure over the `Base Tree`
- `Value` evaluation against `ScopeRef`
- runtime-owned value production via `Resource`
- watched consequence dispatch via `Reaction`
- `Capability` lookup or explicit instance targeting
- readonly `Host Projection`
- derived runtime systems built from those boundaries
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
- `Action Algebra`
- `Operation Control`
- `Semantic Lifecycle Entry`
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
- operation coordination tables

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
3. change detection should converge on semantic top-level equality where a narrower subsystem does not define a different comparator
4. identity reuse is an optimization, not the public semantic definition of equality
5. every dynamic `Value` evaluation may produce both a value result and a `Dependency Set`

`semantic top-level equality` means:

- primitives compare using `Object.is`-style semantics
- arrays and objects compare by top-level structure and top-level entry identity/value only
- deeper equivalence is not the default contract unless a narrower subsystem says otherwise

Current baseline note:

- the active `Reaction` runtime in this repo still compares watched values with `Object.is`
- broader semantic top-level equality remains the preferred convergence target for subsystems that need structural top-level comparison
- narrower docs must state explicitly when they keep the current `Object.is` baseline or adopt a stronger comparator

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

## Dependency Tracking Is A Core Execution Baseline

Dependency tracking is not only an implementation hint. It is a top-level execution rule.

`Flux` uses dependency tracking to connect `Value`, `Resource`, and `Reaction` semantics under one model.

### Baseline Rules

1. every dynamic evaluation may collect a `Dependency Set`
2. scope writes carry changed paths through the runtime change surface
3. dependency hits trigger targeted re-evaluation or invalidation rather than eager full-tree recomputation
4. `Value` dependency hits re-evaluate values only
5. `Resource` dependency hits invalidate or refresh producers according to resource policy
6. `Reaction` dependency hits schedule watched-value re-evaluation and only dispatch effects after the watched value is rechecked under normal `Reaction` rules
7. dependency change alone does not directly dispatch arbitrary `ActionSchema`
8. crossing from dependency change into an effect still requires `Reaction` or a `Semantic Lifecycle Entry`
9. `changedPaths` diagnostics may be conservative when precise provenance is unavailable

### Why This Matters

This rule prevents category drift:

- a pure derived value remains a `Value`
- a runtime-owned producer remains a `Resource`
- watched consequences remain a `Reaction`
- arbitrary effects do not leak directly out of dependency change

That is the best-known feasible baseline because it keeps the dataflow engine and the effect boundary distinct without losing declarative reactivity.

### `Value`, `Resource`, And `Reaction` Under One Dependency Model

| Role | Dependency consequence |
| --- | --- |
| `Value` | recompute the read result |
| `Resource` | mark dirty, recompute, or refresh according to producer policy |
| `Reaction` | re-evaluate the watched value and possibly dispatch through `Capability` |

This table is normative.

### 4. `Resource`

`Resource` is the runtime-owned value-producer primitive.

The current public schema surface remains:

- `type: 'data-source'`

Hard rules:

- one `Resource` publishes one `Logical Value`
- publication target is normatively explicit through `name` or `dataPath`
- `Resource` lifecycle is runtime-owned
- `Resource` is not a hidden imperative effect engine
- author-visible mutation requests do not happen through `Resource`; they happen through `Capability`

#### Public Surface And Identity

`name` is the preferred author-visible identity.

Normative identity rules:

1. new schema should use `name` as the preferred author-visible `Resource` identity
2. `id` remains the active runtime registration and refresh key in the current repo and therefore remains required for current executable targeting
3. if both `name` and `id` exist today, current runtime targeting still resolves by `id`; `name` is the preferred convergence direction for future author-visible identity
4. `name` is an identifier, not a path expression; it must not contain path syntax such as `.` or `[]`
5. anonymous resources are valid only when they do not need explicit targeting through `Capability`

| Configuration | Runtime target identity | Published path |
| --- | --- | --- |
| `name` only | convergence target: `name`; current repo targeting may still require `id` | `name` |
| `name` + `dataPath` | convergence target: `name`; current repo targeting may still require `id` | `dataPath` |
| legacy `id` + `dataPath` | `id` | `dataPath` |
| anonymous `dataPath` only | none | `dataPath` |

#### Why `name` Instead Of Legacy Merge-Into-Scope

The legacy AMIS-style behavior of publishing without an explicit binding target by merging into the current scope is non-normative and rejected because:

- it causes namespace pollution
- it hides ownership
- it makes collisions and debugging ambiguous

#### Publication Contract

The authoritative publication-path contract is:

- `name`, when present and `dataPath` is absent
- `dataPath`, when present

Current runtime compatibility note:

- `refreshSource` and source-registry lookup are still keyed by runtime `id` in the current repo
- formula-backed publication currently falls back to `dataPath ?? id`
- therefore `name`-first identity should be read as the preferred convergence direction, not as a statement that current runtime targeting has already moved away from `id`

`statusPath`, when present, is the preferred readonly status-summary contract.

#### Initial Value And `statusPath`

Before the first successful publication, a `Resource` binding path evaluates to `undefined`.

If a `Schema` needs to distinguish "not published yet" from "published empty value", the preferred design is to use `statusPath` rather than value-shape guessing.

When `statusPath` is used, the `Resource` may publish a readonly summary DTO containing fields such as:

- `loading`
- `ready`
- `stale`
- `error`
- `optimisticPending`
- `canRollback`

`statusPath` is not a second `Logical Value`. It is runtime-owned summary data.

`Resource` runtime state is not ambient schema-visible data. Host code and debuggers may inspect it out of band. If schema must render producer status, it must declare `statusPath` explicitly; there is no implicit hidden sibling-path or second hidden publication channel.

Current runtime compatibility note:

- the current source registry in this repo does not yet publish `statusPath` summary DTOs
- therefore `statusPath` should be read here as the preferred convergence contract, not as a statement that current runtime wiring is already complete

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

#### `Operation Control` And `ApiObject`

`ApiObject` is not the right dumping ground for every execution-control concern.

The normative layering is:

1. `ApiObject` = transport and adaptor contract
2. `Operation Control` = timeout, cancellation, throttle, debounce, retry, dedup, tracing, and related execution coordination
3. consumer-specific policy = resource polling, stop conditions, merge policy, stale policy, publication rules, or action-branch behavior

Current compatibility note:

- the active repo still carries some execution-control-adjacent fields on `ApiObject`, notably `cacheTTL`, `cacheKey`, and `dedupStrategy`
- v6 classifies those as compatibility-era placement, not as a reason to keep growing `ApiObject` into a universal policy bag
- during convergence, selected control fields may remain on current consumer-specific schema surfaces even when their conceptual layer is `Operation Control`
- when the same concern can appear on multiple current surfaces during convergence, the narrower consumer contract must define the effective precedence explicitly; silent ambiguity is invalid

This means:

- `ApiObject` should remain focused on request inputs and output adaptation
- `transport timeout` is not a new primitive and is not the whole meaning of timeout across the system
- `Resource` may use shared `Operation Control` machinery without forcing all resource schema into action-shaped control flow
- `Action Algebra` may use the same substrate without collapsing `ActionSchema` and `DataSourceSchema` into one authoring shape
- current `Resource` contracts may still expose resource-natural controls such as `interval`, `stopWhen`, and compatibility request-coordination fields nested under `api`
- current `ActionSchema` may still expose action-natural controls such as `timeout`, `retry`, `debounce`, and `parallel`

### Carrier And Precedence Rule

During convergence, `Operation Control` may be carried through different author-visible surfaces.

Allowed current carriers include:

- `ActionSchema` fields such as `timeout`, `retry`, and `debounce`
- `ApiObject` compatibility fields such as `cacheTTL`, `cacheKey`, and `dedupStrategy`
- `DataSourceSchema` resource-owned controls such as `interval` and `stopWhen`

Hard rule:

- when more than one carrier can influence the same execution concern, the narrower consumer contract must define which carrier wins
- if no narrower contract defines precedence, the configuration is architecturally incomplete

#### `TanStack Query` Concept Alignment

Using `TanStack Query` to implement API-backed `Resource` behavior such as caching, stale/freshness, dedup, background refetch, polling, observer lifecycle, and optimistic cache coordination is both feasible and appropriate.

It is an implementation strategy for `Resource`, not a new `Primitive Category`.

| `Flux` concept | `TanStack Query` analogue | Boundary rule |
| --- | --- | --- |
| `Resource` | a query-backed producer/controller or observer-backed runtime entry | query observer lifecycle stays behind `Resource` runtime |
| `name` / `dataPath` | none | they are `Flux` publication identity/path, not `queryKey` |
| producer cache identity | `queryKey` | `queryKey` is a runtime-owned internal cache identity derived from evaluated producer config and dependency inputs |
| published `Logical Value` | selected/adapted query `data` | publication still writes to the authoritative `name` or `dataPath` binding target |
| `statusPath` | preferred readonly projection of query status | only a summary DTO is exposed, never the query object itself |
| `refreshSource` / invalidation | `refetch` / `invalidateQueries` | schema still accesses them only through `Capability` |
| polling | `refetchInterval` or equivalent | belongs to producer/runtime policy |
| retry / stale / cache / dedup | query options and observer state | remain `Resource` runtime implementation detail |
| `Optimistic Update` | mutation-side optimistic cache update | remains a `Capability`-side policy over a target `Resource` |

Boundary rules:

1. `queryKey` must never become the author-visible `Resource` identity; the public contract remains `name` / `dataPath`
2. shared cache is allowed, but publication ownership still follows `Lexical Ownership`; one cache entry may serve multiple `Resource` instances, but each active `Resource` still publishes only within its own lexical boundary
3. `TanStack Query` does not define `Operation Control` for all of `Flux`; shared timeout/cancellation/debounce/dedup concepts may exist above transport and below consumer-specific policy
4. formula-backed `Resource` instances do not need query infrastructure
5. stream/subscription producers are not a first-class query-library primitive; query cache may be used as a cache sink, but connection lifecycle remains producer-owned
6. `QueryClient`, `QueryObserver`, mutation objects, and query result objects must not enter `Schema-visible Scope`
7. `mergeStrategy` is not a natural query-library schema contract; `append`, `prepend`, and `upsert` belong in `Resource` runtime or producer adapters at the publication layer

So the alignment is correct, but only if `TanStack Query` implements `Resource` rather than defining `Flux` schema ontology.

#### `Resource` Rules

1. `data-source` remains the public schema keyword; `Resource` is the primitive term
2. one `Resource` publishes one `Logical Value`
3. a `Logical Value` means one authoritative published binding target in scope
4. a `Resource` may additionally expose one optional readonly status-summary DTO through `statusPath` as a convergence target
5. `statusPath` summary is runtime-derived, not authoritatively writable business data
6. explicit binding through `name` or `dataPath` is mandatory for normative behavior
7. compatibility behavior that publishes without an explicit target is non-normative
8. `Resource` lifecycle is runtime-owned and scope-owned
9. registration, replacement, and disposal follow `Lexical Ownership`
10. runtime state and controllers do not become methods on `ScopeRef`
11. loading, error, stale, retry, dedup, polling, cancellation, and cache coordination belong to `Resource` runtime state
12. `Operation Control` may be shared with actions, but resource authoring shape still remains resource-specific
13. external I/O belongs to the producer implementation contract
14. the only author-visible `Resource` control paths are activation, invalidation, refresh, and status observation
15. author-visible mutation requests must still occur through `Capability`
16. formula-backed resources require explicit binding and may infer dependencies automatically
17. within one owning lexical scope, a binding target should converge toward one active publisher
18. multiple active publishers for the same binding target in one owning scope are architecturally invalid even though current runtime registry enforcement is still incomplete
19. child scopes may shadow a parent publication only through ordinary lexical shadowing
20. unrelated writes to an active `Resource` binding target are architectural errors unless a narrower subsystem defines a handoff or replacement transition
21. writes beneath a `Resource`-owned binding target count as writes to that authoritative value and are therefore invalid unless a narrower subsystem explicitly allows them
22. if `statusPath` is present, collisions or writes to that path are invalid once that contract is wired by the runtime
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

- `type: 'reaction'`

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

Preferred convergence rule:

- these names should be available for `Reaction` guard and action-payload evaluation without becoming ordinary ambient `Schema-visible Scope`

Current baseline note:

- the active runtime already provides these names to `Reaction.when`
- action dispatch triggered by a reaction currently carries them as `ActionContext.event`, not as general expression-scope bindings for `args`, `value`, or nested `when`
- full expression-scope injection for reaction-triggered action evaluation remains a convergence target

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
12. dependency changes do not bypass `Reaction` semantics and directly call arbitrary actions

### Active Baseline Versus Convergence Target

At the time of writing, the active runtime behavior in `packages/flux-runtime/src/reaction-runtime.ts` compares watched values with `Object.is`.

Therefore:

- the current baseline for `Reaction` change detection is identity-style comparison of the watched result
- the broader semantic top-level equality language in this document is the preferred convergence direction for watcher semantics, not a claim that the current repo already applies structural top-level comparison here
- any subsystem that standardizes a stronger comparator must document that comparator explicitly rather than relying on implication

### 6. `Capability`

`Capability` is the only authority primitive category.

It answers one question:

> who has the authority to perform an effect, and how is that authority resolved?

`Capability` does not answer the whole question of how effect steps are sequenced, branched, aggregated, retried, or timed. That is the job of the derived `Action Algebra` layer.

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

## Derived Runtime System: `Action Algebra`

`Action Algebra` is layered on top of `Capability`.

It answers these questions:

- how one or more effect steps are composed
- when a step is skipped
- how success, failure, timeout, cancellation, and neutral outcomes are classified
- how branch control such as `then` or `onError` works
- how aggregate control such as `parallel` works

Important boundary:

- `Capability` is the primitive authority layer
- `Action Algebra` is a derived runtime system
- `Action Algebra` may evolve without changing the primitive count

### Gradual Expansion Path

`Action Algebra` should expand gradually instead of jumping directly to a general workflow graph.

Recommended growth path:

1. single-step dispatch with `{ action, args }`
2. success/failure branching with `then` and `onError`
3. stable sequential lists plus `parallel` aggregates
4. explicit `DAG`-style dependency graphs only if simpler sequence/branch/aggregate forms stop being sufficient

By default, ordered action lists execute sequentially in stable input order unless a narrower aggregate node such as `parallel` says otherwise.

This is the best-known feasible path because it preserves a small, understandable action model while still leaving room for future control-flow growth.

### Active Baseline Versus Convergence Target

At the time of writing, the active runtime already supports important parts of this algebra, including:

- `when`
- `parallel`
- `retry`
- `timeout`
- `debounce`
- sequential action-list execution
- `continueOnError`
- `then` chaining using `prevResult`

But the full convergence target described in this document is stricter than the current implementation in some areas.

In particular, the long-term top-level contract expects:

- explicit `success-class` versus `failure-class` branching semantics
- explicit `onError` branch execution
- reserved branch-result context names such as `result` and `error`

Until narrower docs and runtime code fully converge, current behavior should be read as the active baseline and the stricter algebra here should be read as the normative target contract.

### `ActionSchema` And `ActionResult`

`Capability` dispatch is described by `ActionSchema` and returns `ActionResult`.

Current typed schema fields already include:

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

The normalized `ActionResult` vocabulary already includes:

- `ok`
- `cancelled`
- `skipped`
- `timedOut`
- `data`
- `results`
- `attempts`
- `error`

### Result Classes

For control-flow purposes, `ActionResult` values fall into three classes:

1. `success-class`: `ok === true` and not `skipped`, not `cancelled`, not `timedOut`
2. `failure-class`: `ok === false` or `cancelled === true` or `timedOut === true`
3. `neutral-class`: `skipped === true`

Current baseline note:

- the active runtime executes `then`, but it does not yet implement full `failure-class` branching through `onError`
- current sequential dispatch mainly stops on `!result.ok` unless `continueOnError` is set
- current `parallel` aggregation also treats `cancelled` as non-failing for aggregate `ok` calculation

Therefore the result classes above are the preferred convergence contract for future control-flow semantics, not a claim that every branch rule is already active in the executor today.

### Chained Action Result Context

When the action algebra fully converges, actions executing inside `then` or `onError` should expose a reserved branch-result context for expression evaluation.

Reserved names are:

- `result`: the triggering `ActionResult`
- `error`: `result.error` when the triggering result is `failure-class`; otherwise `undefined`
- `prevResult`: the prior action result in the current chain when one exists

Convergence rules:

1. `result` is the canonical schema-visible name for the triggering `ActionResult`
2. `error` is a convenience alias for `result.error`, not an independent channel
3. `prevResult` aligns with `ActionContext.prevResult` on the runtime side
4. these names are reserved for chained-action evaluation and must not be published into ordinary `Schema-visible Scope` as ambient data
5. `then`, `onError`, `args`, `value`, `values`, and nested `when` expressions may read this branch-result context
6. branch action chains run in the current lexical scope; there is no second hidden payload bag beyond normal field evaluation and the reserved branch-result context

### `ActionSchema` Control Flow

1. `when` is a structured precondition
2. if `when` evaluates false, dispatch returns a normal `ActionResult` with `skipped: true`
3. `then` executes only for `success-class`
4. `onError` executes only for `failure-class`
5. if `onError` is absent, framework default error handling applies
6. `continueOnError` affects only chain abortion behavior; it does not convert a `failure-class` result into `success-class`
7. `cancelled` and `timedOut` are `failure-class` by default
8. `then` and `onError` are sibling control-flow branches; they do not both execute for one result

Current baseline note:

- `when` and `then` are active today
- `onError` is present in the type surface but is not yet executed by `packages/flux-runtime/src/action-runtime.ts`
- because `onError` is not yet reserved from top-level payload extraction, namespaced/component actions without explicit `args` may currently receive `onError` as ordinary payload data
- `prevResult` exists on `ActionContext`, but reserved branch-result names such as `result` and `error` are not yet injected into ordinary expression evaluation
- current fallback behavior is host/runtime specific through `onActionError`, plugin hooks, and env notification paths rather than one fully standardized framework fallback branch

### `parallel`

`parallel` is the aggregate action node for concurrent child dispatch.

Convergence rules:

1. all child actions are dispatched concurrently
2. aggregate `ActionResult.results` contains one child `ActionResult` per child action in stable input order
3. the aggregate result is `success-class` only if every child is `success-class` or `neutral-class`
4. if any child is `failure-class`, the aggregate result is `failure-class`
5. `parallel` does not automatically cancel sibling actions when one child fails
6. `then` or `onError` attached to the aggregate node read the aggregate `ActionResult`

Current baseline note:

- the active executor currently uses `Promise.all` over child dispatches because dispatch normalizes failures into `ActionResult` values
- aggregate `ok` currently evaluates true when every child is `ok`, `skipped`, or `cancelled`
- the stricter failure-class treatment above is the preferred convergence contract rather than the exact current aggregate rule

### `onError` Chain Semantics

The following is convergence-target behavior once explicit failure branching is implemented:

1. `onError` may be a single `ActionSchema` or an array
2. actions inside `onError` may themselves have their own `onError`
3. a child inside `onError` failing does not recursively re-trigger the parent `onError`; it is handled by that child's own `onError` or by framework fallback
4. if an `onError` child fails and has no own failure handling, framework fallback handles it and the remaining parent `onError` chain is aborted

### Framework Fallback Error Handling

If no explicit `onError` handles a `failure-class` result, the framework should provide a default observable failure path once this contract is standardized.

Recommended fallback rule:

1. the framework should surface an error toast or equivalent host notification
2. message selection priority is: `error.userMessage` -> `error.message` -> generic fallback text
3. duplicate same-turn same-source fallback notifications should be deduplicated
4. localization of fallback text belongs to the host environment

### `Reaction` Versus `Action Algebra` Control Flow

Use `then` / `onError` when the next step depends on completion, success, or failure of the current action.

Use `Reaction` when the trigger condition is a watched `Value` over time.

Do not use `Reaction` as a substitute for immediate action success/failure branching, and do not stretch `then` / `onError` into a long-running business workflow language.

### `Optimistic Update` Policy

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

## Derived Runtime System: `Operation Control`

`Operation Control` is the shared execution-control layer that sits above fetcher transport details and below consumer-specific policy.

It is not a primitive category.

It should own concerns such as:

- timeout
- cancellation
- throttle
- debounce
- dedup
- retry coordination
- tracing and monitoring hooks
- concurrency mode and in-flight replacement policy

Important boundary:

- `ApiObject` remains a fetcher input/output contract
- `Operation Control` carries execution-control semantics
- consumer-specific policy stays above both

Consumer-specific policy examples:

- `Resource`: polling, `stopWhen`, merge strategy, stale handling, status publication
- `Action Algebra`: `then`, `onError`, `parallel`, chain abortion, result propagation
- `FormRuntime`: validation-before-submit and duplicate-submit handling

This is the best-known feasible split because it avoids polluting `ApiObject` while still allowing shared runtime machinery for `Resource` and action execution.

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

Current compatibility note:

- some current hosts in this repo, especially Flow Designer, still admit richer host-boundary values such as config fragments and `designerCore` into the host scope
- that current exposure should be read as compatibility-era host wiring, not as the desired long-term `Host Projection` contract
- the normative target remains DTO-style readonly snapshot projection plus capability-based command dispatch
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

Important boundary:

- `namespace:applyPatch` is a recommended cross-host baseline capability family, not a claim that every current host already implements that exact action name
- host-specific semantic commands such as `designer:addNode` may continue to exist beside patch-based mutation surfaces
- current Flow Designer code in this repo is anchored more strongly on commands such as `designer:addNode`; patch-based write surfaces remain the preferred generic cross-host design direction

Recommended baseline `Capability`:

```json
{
  "action": "designer:applyPatch",
  "args": {
    "patches": [
      { "op": "replace", "path": "nodes[id=task-1].data.label", "value": "${form.label}" }
    ]
  }
}
```

Baseline patch contract:

- patch payloads are DTOs, not host objects or bridge handles
- `op` names should be explicit and finite, for example `replace`, `insert`, `remove`, and `move`
- `path` grammar is host-defined but must be documented, stable, and machine-readable
- collection addressing must be explicit; hosts must not rely on ambiguous human shorthand when arrays are authoritative
- when the host document uses arrays as the authoritative shape, path grammar must say how array entries are addressed, for example by stable key selector such as `nodes[id=task-1]`, by explicit index such as `nodes[0]`, or by another documented machine-readable form
- a patch batch should be applied atomically from the schema author's point of view: either the batch succeeds as one command result or fails as one command result
- if a host chooses partial success semantics instead, it must publish that explicitly as a narrower contract and return structured per-patch diagnostics
- failed patch application must return a normal failed `ActionResult` with diagnostics suitable for `onError` or framework fallback handling

Current Flow Designer compatibility note:

- `GraphDocument` currently uses `nodes: GraphNode[]` and `edges: GraphEdge[]`
- `GraphNode` requires `id`, `type`, `position`, and `data`
- the current repo surface is anchored more concretely on semantic commands such as `designer:addNode` than on a generic patch action
- therefore the patch DTO shape above should be read as the recommended cross-host baseline, not as a claim that current Flow Designer already exposes that exact write contract

Normative rules:

1. `namespace:applyPatch` is a recommended cross-host baseline capability surface
2. patch payloads must be DTO-style structured data, not host objects or bridge handles
3. generic inspectors, property panels, and bulk editors should prefer patch-based `Capability` calls over one-action-per-property vocabularies
4. hosts may still expose higher-level semantic commands such as layout, align, group, undo, or redo
5. applying a patch must still produce a new readonly `Host Projection` snapshot; direct mutable host bags remain invalid

## Execution Boundary Matrix

| Primitive | Owns authoritative value | May cause side effects | Lifecycle owner | Reads from | Writes to | Change basis | Schema-visible |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Value` | no | no | none beyond evaluation state | `ScopeRef` | nowhere | semantic top-level equality plus dependency tracking | yes |
| `Resource` | yes, for its `Logical Value` | producer-internal acquisition effects only | runtime, scoped by `Lexical Ownership` | `ScopeRef` plus producer config | one explicit authoritative target plus optional readonly `statusPath` | semantic top-level equality on published value and status DTO | yes |
| `Reaction` | no | yes, by dispatching `Capability` | runtime, scoped by `Lexical Ownership` | watched values | no authoritative business target | current baseline: `Object.is`; preferred convergence: semantic top-level equality if standardized by narrower contract | yes |
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
- shared execution-control overlays for `Operation Control`
- explicit instance-capability lookup through `ComponentHandleRegistry`
- host snapshot overlays injected through `Host Projection`

This is the recommended architecture-review mental model. It is not a second primitive ontology.

## Scheduling Model

Preferred scheduling rules:

1. dependency hits are processed before consequence dispatch
2. `Resource` invalidation happens before `Reaction` dispatch
3. scope writes settle before `Reaction` execution
4. `Reaction` runs asynchronously after the `Settled Update Turn`, never inline inside the originating mutation path
5. synchronously computable `Resource` updates publish before `Reaction` evaluation for that turn
6. async `Resource` producers publish only when they complete in a later `Settled Update Turn`
7. repeated triggers for the same `Reaction` within one `Settled Update Turn` coalesce into one execution attempt
8. reaction-triggered writeback may cascade only up to a finite runtime limit
9. no re-trigger occurs when the watched value is unchanged under the active watcher comparator for that subsystem
10. high-frequency gesture loops, animation-frame coordination, protocol state machines, collaboration engines, and local-first synchronization processes may remain host/domain systems as long as they cross into `Flux` only at stable publication or command boundaries
11. ready `Reaction` values execute in stable `Base Tree` path order; where multiple live instances share one compiled node path, runtime uses stable lexical instance order
12. writes or async completions produced by a `Reaction` schedule a later `Settled Update Turn` instead of interleaving into the active reaction flush
13. if the cascade limit is reached, runtime aborts the remaining queue for that turn and surfaces a structured cycle error
14. dependency change does not directly enter arbitrary action execution; effect crossing still requires `Reaction` or a semantic lifecycle trigger

Implementation notes:

- the active runtime today uses per-reaction microtask scheduling with local coalescing rather than one globally visible ordered scheduler
- stable `Base Tree` path ordering and structured cycle-error surfacing remain preferred convergence behavior rather than fully realized current runtime guarantees
- `Settled Update Turn` is a runtime-store concept, not a `React useEffect` ordering concept
- `React` may replay renders in concurrent mode, but it must not redefine what `Flux` considers the stable set of published values for a turn
- the cascade-protection limit should be configurable and should have a finite nonzero default

## Derived Runtime System: `Semantic Lifecycle Entry`

`Semantic Lifecycle Entry` is the node-owned semantic effect boundary for lifecycle-shaped business operations.

It is not a new primitive category.

It exists because many frontend business flows are not best modeled as raw button `onClick` payloads.

Examples include:

- form submit
- form init
- page enter
- dialog open
- dialog confirm
- host-specific semantic activation

### Why It Exists

The business pipeline for a form submit is not "a button click".

It is typically:

1. enter the form semantic boundary
2. touch fields that should become visible on submit
3. validate
4. stop on validation failure
5. only then run submit-side effects
6. branch by submit result

That pipeline belongs to the owning semantic node boundary, not to every UI trigger that can request submission.

`Semantic Lifecycle Entry` is reducible to the primitive set as follows:

- ownership and activation anchor to the `Base Tree`
- data and status read through `ScopeRef`
- preconditions and payload shaping evaluate through `Value`
- lifecycle-triggered effects still cross authority boundaries only through `Capability`
- optional follow-up consequences may still be watched through `Reaction`

It is therefore a derived execution pattern over the primitive set, not a hidden eighth primitive.

### Core Rules

1. a `Semantic Lifecycle Entry` belongs to a node that truly owns the lifecycle boundary
2. UI events may trigger a semantic entry, but should not duplicate the full business pipeline when a semantic owner already exists
3. semantic entry execution still crosses the effect boundary through `Capability` and may use `Action Algebra`
4. semantic entry does not create a new primitive category or a second authority system
5. dependency changes do not automatically become semantic entry triggers unless a narrower semantic contract says so

### Form Baseline

The preferred baseline is that forms own their submit pipeline.

Current code-level anchor:

- forms already own submit semantics through `FormRuntime.submit(api?)`
- external callers already enter that semantic boundary through `submitForm` or `component:submit`
- the current core schema does not yet expose a universal form-level `submitAction` / `onSubmitSuccess` / `onSubmitError` contract in `flux-core` base schema

Therefore:

- the semantic boundary is already real at runtime
- the generalized schema field shape described below is the preferred convergence direction, not a claim that every field is already active in the current repo-wide schema contract

Recommended semantic fields are:

- `initAction`
- `submitAction`
- `onSubmitSuccess`
- `onSubmitError`
- `onValidateError`

Important boundary:

- these are semantic entry names, not new primitives
- existing runtime contracts such as `FormRuntime.submit(...)`, `submitForm`, and `component:submit` are the code-level anchor for this boundary
- narrower docs may still express equivalent behavior with existing action wiring while schema field convergence continues
- when current code has not yet standardized the schema-owned field shape, trigger-local action wiring remains compatibility behavior rather than proof that the semantic boundary does not exist

### Page, Dialog, And Host Baseline

The same pattern applies to other semantic owners.

There are two major lifecycle-entry families.

#### Activation-Shaped Entries

Examples:

- page `initAction` or `enterAction`
- dialog `openAction`
- host `activateAction`

Baseline rules:

1. activation-shaped entries run only after the owning lexical scope, local `ActionScope`, and required host projections for that boundary are ready
2. they never run during render
3. they run once per activation instance unless a narrower retained/suspended-subtree contract explicitly defines reactivation behavior
4. they execute in the owning lexical scope and capability boundary of that semantic owner

#### Request-Shaped Entries

Examples:

- form `submitAction`
- dialog `confirmAction`
- host `refreshAction`

Baseline rules:

1. request-shaped entries run only when a semantic request is made
2. UI triggers, shortcuts, and external callers should target the semantic owner rather than duplicate the full business pipeline
3. the semantic owner decides preconditions, validation, branching, and effect sequencing for that request
4. result propagation and cancellation semantics for a request-shaped entry are owned by the narrower semantic contract for that node kind
5. retained subtree behavior, re-entry identity, and repeated request coalescing are also narrower semantic-contract concerns unless standardized later

#### Page Timing

- page `initAction` or `enterAction` should run after the page boundary is active and page-owned scope/action facilities are ready
- it should run before page-local user interaction is expected, but after runtime-owned boundary creation has completed

#### Dialog Timing

- dialog `openAction` should run after the dialog instance, scope, and inherited capability boundary are created
- dialog `confirmAction` should represent a semantic confirm request, not a raw click payload on one specific button
- if a narrower contract introduces `closeAction`, it must explicitly say whether that action is pre-close, post-close, or cancellable; ambiguous close timing is invalid

#### Host Timing

- host activation-style entries should run only after host snapshot projection and host-local capability boundaries are visible to the declared child regions that depend on them
- host semantic request entries should remain owned by the host boundary rather than copied into unrelated page-level buttons

Recommended examples:

- page: `initAction` or `enterAction`
- dialog: `openAction`, `confirmAction`, `closeAction`
- host shell: semantic open/activate/refresh actions defined by the host boundary

These should remain node-owned semantic entries, not free-floating UI-event scripts copied across multiple triggers.

### Preferred Convergence Shape

The following example is the preferred schema convergence shape for semantic form submit.

It is not yet the universal active repo-wide schema contract today.

Equivalent current behavior is still anchored by `FormRuntime.submit(...)`, `submitForm`, and `component:submit` while schema field convergence continues.

### Trigger Example

Preferred shape:

```json
{
  "type": "form",
  "id": "shipping-form",
  "submitAction": {
    "action": "ajax",
    "api": {
      "url": "/api/shipping/submit",
      "method": "post",
      "data": {
        "country": "${shipping.country}",
        "city": "${shipping.city}",
        "province": "${shipping.province}"
      }
    }
  },
  "onSubmitSuccess": [
    { "action": "navigate", "args": { "to": "/confirmation" } }
  ],
  "onSubmitError": [
    { "action": "toast", "level": "error", "message": "Submit failed" }
  ]
}
```

The trigger button should remain thin:

```json
{
  "type": "button",
  "label": "Submit",
  "onClick": {
    "action": "component:submit",
    "componentId": "shipping-form"
  }
}
```

That is the correct split because the button triggers the semantic entry, but does not redefine the semantic pipeline.

## Minimal Reconciliation With Older Vocabulary

| Older Language | Normative Interpretation |
| --- | --- |
| `ComponentTree` | `Base Tree` |
| `StateTree` | `ScopeRef` plus runtime-owned sidecars |
| `ActionTree` | `ActionScope` |
| `base tree + overlays` | correct operational picture; overlays are runtime organization over the same primitive categories, not extra primitives |
| `visibleOn` / `disabledOn` | use direct `Value` semantics through `visible` / `disabled` expressions |
| resource `id` as the main identity | `name` is the preferred convergence target for `Resource` identity, while current executable targeting still uses `id` |
| action primitive | use `Capability` for authority, `Action Algebra` for derived control flow |

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
- CRDT or OT engines
- local-first sync engines
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
- `Resource` when the execution schema truly owns value-production policy

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

Its graph algorithms, layout behavior, collision logic, collaboration logic, and domain-core semantics are outside `Flux` core.

## Constructive Reductions

The primitive set is not only restrictive; it is constructively expressive.

### Example 1: a field bound by `name`

- `Base Tree`: one node
- `ScopeRef`: one read/write binding location
- `Value`: expressions read that location
- `Capability`: events dispatch actions

### Example 2: remote select options

- `Resource`: one `data-source` publishes `lookups.countries`
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
- `Capability`: a generic host may expose `namespace:applyPatch`, while current Flow Designer more concretely exposes semantic commands such as `designer:addNode`
- host shell: host-private `DomainBridge` or equivalent bridge adapts domain core

No mutable host bag in scope is needed.

### Example 7: optimistic profile update

- `Capability`: one action dispatches an external mutation with `Optimistic Update` policy targeting `userProfile`
- `Resource`: `userProfile` remains the published `Logical Value`
- `statusPath`: exposes `optimisticPending` and `canRollback`

No separate query primitive and mutation primitive are required at the primitive-category level.

### Example 8: infinite scroll

- `Resource`: one `data-source` with `mergeStrategy: 'append'` publishes `items`
- `Capability` or `Reaction`: a stable-boundary action raises `currentPage`
- `Value`: the list reads `${items}` and renders

No infinite-scroll-specific primitive is needed.

### Example 9: semantic form submit

- `Semantic Lifecycle Entry`: the form owns `submitAction`
- `Capability`: the button only dispatches `component:submit`
- `Action Algebra`: success and error branching remain attached to the form-owned semantic pipeline

No trigger-specific duplicate submit script is needed.

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

`Action Algebra`, `Operation Control`, `Semantic Lifecycle Entry`, `FormRuntime`, `PageRuntime`, and host bridges are important, but they are all reducible to the primitive set plus explicit runtime contracts.

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

### Compared With Mutable Host Bags

Letting schema mutate host-owned objects directly looks convenient, but it destroys ownership boundaries, makes rollback and diagnostics ambiguous, and leaks host protocol state into schema.

Readonly `Host Projection` plus patch-style `Capability` write is the best-known feasible compromise between power and isolation.

### Compared With A Separate Workflow Primitive

A second workflow or scripting primitive would overlap with `Reaction` and `Action Algebra`, enlarge the primitive set, and blur the boundary between UI consequence wiring and long-running business workflow.

The better design is:

- `Reaction` for watched frontend consequences
- `Action Algebra` for immediate effect orchestration
- `Semantic Lifecycle Entry` for node-owned semantic effect boundaries
- host/domain workflow engines outside `Flux` core

### Collaboration, Local-First, And Replicated Data

Collaboration engines, CRDT systems, OT systems, and local-first replication are valid solution families in the larger platform space.

Within this architecture they are best treated as:

- producer strategies behind `Resource`
- host-owned session models behind `Host Projection`
- host/domain command systems behind `Capability`

They are not counterexamples to the primitive closure by themselves, because they do not force a new cross-domain author-visible primitive category in `Flux` core.

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
10. `Capability` is the authority primitive; `Action Algebra` is derived control flow layered on top
11. dependency tracking is a first-class execution baseline shared by `Value`, `Resource`, and `Reaction`
12. dependency changes do not directly dispatch arbitrary actions
13. semantic lifecycle-driven business pipelines should live on the owning semantic node when such a boundary exists
14. new execution-control growth should not treat `ApiObject` as a universal execution-control bag; existing compatibility fields may remain while contracts converge
15. shared execution control may exist across `Resource` and action execution without forcing one schema shape
16. new domain complexity does not automatically create new primitive categories
17. `Authoring Model` and `Execution Model` stay separate
18. shared workbench/session host protocols may exist, but schema still sees only `Host Projection` and `Capability`
19. canonical English terms must remain stable and unique once adopted
20. `Optimistic Update` is a `Capability`-side policy over a target `Resource`, not a new primitive

## Failure Conditions

The model should be considered under architectural failure pressure if any of the following start happening repeatedly:

- `ScopeRef` is asked to carry behavior tables, controllers, or mutable host objects
- domain-core objects are repeatedly exposed into `Schema-visible Scope`
- `ComponentHandle` values are treated as ordinary scope data
- `Resource` is used as an implicit imperative write engine
- `Resource` repeatedly needs schema-defined protocol commands or direct external-operation authority beyond value publication
- `Reaction` becomes a general workflow scripting runtime
- dependency changes repeatedly demand direct arbitrary action execution without `Reaction` or semantic lifecycle boundaries
- `Action Algebra` is repeatedly stretched into a long-running business workflow language
- new execution-control growth repeatedly accretes into `ApiObject` without compatibility rationale or layer discipline
- `Host Projection` turns into a mutable host bag
- host helper protocols leak raw bridges, controllers, or domain runtimes into schema
- new domains repeatedly require new global provider categories
- authoring metadata leaks into runtime semantics
- canonical term usage drifts so that one concept is referred to by multiple unstable names

## Explicitly Closed Decisions

1. `data-source` remains the public schema keyword; `Resource` is the architectural primitive term
2. `Reaction` is a first-class watch/effect primitive
3. `name` is the preferred convergence direction for `Resource` identity, while current executable targeting still relies on `id`
4. publish-without-explicit-binding legacy behavior is non-normative
5. `mergeStrategy` supports `replace`, `append`, `prepend`, `merge`, and `upsert`
6. author-visible mutation requests remain under `Capability`, not `Resource`
7. `Optimistic Update` is a `Capability`-side policy over a target `Resource`, not a new primitive
8. `then` is the canonical success-branch field
9. `onError` is the explicit failure-branch design target, but current executor behavior has not fully implemented it yet
10. built-in actions are part of `Capability`, not a separate authority system
11. `Capability` is the primitive authority layer; `Action Algebra` is derived runtime structure
12. `Operation Control` is shared execution-control substrate, not a primitive category and not a synonym for `ApiObject`
13. `ApiObject` remains the fetcher input/output contract as the design target; existing compatibility fields may remain while contracts converge, but new control growth should not keep accreting there
14. `Resource` and action execution may share execution-control substrate without requiring identical schema shapes
15. dependency tracking is a first-class execution baseline and does not directly trigger arbitrary effects
16. semantic lifecycle entry is the preferred design for node-owned business pipelines such as form submit
17. `Host Projection` read plus patch-style `Capability` write is the baseline editable-host pattern
18. `DomainBridge` is a host-private implementation contract, not a schema-visible primitive
19. `dynamic-renderer` is a controlled fragment assembly boundary, not a `Resource`
20. query/mutation libraries such as `TanStack Query` are valid producer/runtime implementation strategies, not new primitive families
21. capability import provisioning such as `xui:imports` extends `ActionScope` provisioning only and does not create a new dispatch ontology

## Integrated JSON Example

This example compresses multiple host-local fragments into one page-sized sample.

Important compatibility note:

- this integrated example stays close to contracts that are already active in the current repo
- the earlier `Semantic Lifecycle Entry` section shows the preferred convergence shape where a form owns `submitAction`
- any `designer:*` action shown below executes inside the owning `designer-page` host boundary and its local `ActionScope`, not from a sibling page-level button outside that boundary
- the current `designer-page` renderer requires both `document` and `config`; the host fragment below is schematic and focuses on capability locality rather than the full renderer prop contract

```json
{
  "type": "page",
  "body": [
    {
      "type": "data-source",
      "name": "countries",
      "dataPath": "lookups.countries",
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
      "config": {
        "version": "1.0.0",
        "kind": "flow",
        "nodeTypes": [],
        "toolbar": {
          "items": [
            {
              "type": "button",
              "action": "designer:addNode",
              "label": "Add Task Node"
            }
          ]
        }
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
          ]
        }
      }
    ]
}
```

Flow-specific compatibility note:

- the designer toolbar example above uses the current repo's `designer:addNode` command shape rather than the recommended generic patch baseline
- the earlier editable-host section remains the place where `namespace:applyPatch` is proposed as the cross-host convergence direction

## Related Documents

- `docs/architecture/flux-core.md`
- `docs/architecture/api-data-source.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-dsl-vm-extensibility.md`
- `docs/articles/flux-design-introduction.md`
- `docs/references/terminology.md`
