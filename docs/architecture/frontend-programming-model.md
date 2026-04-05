# Flux Frontend Programming Model

## Purpose

This document defines the closed core programming model that Flux executes.

It answers four questions:

1. What are the true Flux core primitives?
2. Why is this primitive set sufficient?
3. Through which channels may schema cause effects?
4. What must stay outside Flux core?

This is a normative architecture document.

## Precedence

This document is the top-level contract for:

- Flux primitive categories
- primitive sufficiency and promotion rules
- the authority model for schema-visible effects
- the boundary between Flux core and host/domain concerns

More specific architecture docs still own subsystem detail.

If a narrower document conflicts with this document about whether a concept is a Flux core primitive, a host concept, or a domain concept, this document wins.

## Key Terms

- **final execution schema**: the already-assembled schema consumed by Flux at runtime after static structure decisions, default expansion, and static trimming are complete
- **primitive category**: an irreducible, author-visible semantic role in Flux core
- **schema-visible scope**: the lexical data visible to schema evaluation and schema-authored behavior, subject to the scope admission rule
- **lexical ownership**: runtime lifetime, shadowing, replacement, and disposal that follow the current scope or subtree boundary
- **logical value**: one authoritative published binding target together with producer-owned runtime status, not multiple unrelated writes spread across the schema
- **capability**: an author-visible authority path that may cause effects
- **host projection**: readonly snapshot data projected from host/domain runtime into schema-visible scope
- **authoring model**: an editable, round-trip-preserving model that may include source metadata, aliases, editor-only structure, or other concerns not executed directly by Flux
- **execution model**: the final execution schema plus runtime-owned state and sidecars that Flux actually evaluates
- **semantic overlay**: a runtime layer whose ownership follows the base tree or lexical scopes while remaining orthogonal to ordinary scope data values

## Core Claim

Flux is a **final-model frontend runtime** for a **frontend programming model**.

That claim has a precise meaning.

- Flux executes an already-assembled final execution schema.
- Flux does not use runtime interface growth as its main answer to variation.
- Flux does not treat design tools or domain runtimes as reasons to keep inventing new core primitives.

The design target is:

- the smallest primitive set that can standardize frontend structure, data visibility, value derivation, runtime-owned value production, consequences, authority, and host projection
- without overlapping responsibility
- without collapsing everything into one giant context or scope object
- without forcing domain complexity into Flux core vocabulary

This is what "optimal" means in this document.

## Optimization Envelope

This document claims optimality for a specific class of systems:

- next-generation low-code platforms whose frontend core executes already-assembled DSL programs rather than owning authoring-time structural assembly
- platforms that must support ordinary pages, forms, data views, dialogs, and complex workbench-like hosts under one runtime
- platforms that prefer stable author-visible semantics and domain isolation over plugin-marketplace-first runtime extensibility

Outside this envelope, other architectures may be locally preferable.
Inside it, the correct optimization target is the smallest stable cross-domain primitive set that keeps new complexity in domain or host layers rather than in Flux core.

## Practical Success Test

The model should be considered successful only if all of the following remain true as the platform grows:

- new domain complexity mainly grows domain schema, domain core, or thin host protocols
- renderer authors can reuse existing value/resource/reaction/capability rules without inventing renderer-local lifecycle semantics
- adding a new complex host does not require new Flux-wide provider families, ambient registries, or extra schema authority channels

This is the architecture acceptance test for the optimality claim.

## Platform Layering

A next-generation low-code platform built on Flux should be read as four separated layers:

1. authoring model and round-trip concerns
2. loader / projection / policy trimming / final schema assembly
3. Flux final execution runtime
4. host and domain runtimes behind projection and capability boundaries

Flux is the execution core of the platform, not the whole platform.
The optimality claim in this document depends on keeping those layers separate rather than collapsing them into one browser-side mega-runtime.

## Execution Schema Boundary

Flux core executes a final execution schema.

That means:

- structure is already assembled
- static defaults are already expanded
- static feature and policy trimming is already done
- schema node kinds are already decided

Flux core still performs runtime work, but only runtime work such as:

- value evaluation
- resource lifecycle
- reaction scheduling
- capability resolution
- host projection consumption

Flux core does not perform major structural assembly at runtime.

Allowed runtime structural multiplication is narrow and derivative only.

It includes cases such as:

- rendering already-declared child templates against item scopes
- conditional activation or omission of already-compiled regions or nodes
- virtualization or retention strategies that do not change the final node kinds or author-visible structural contract

It does not include open-ended loader-like schema rewriting, type invention, inheritance expansion, or profile assembly in the browser runtime.

## Authoring Model And Execution Model

Flux core owns only the execution model.

Normative rules:

1. authoring models may preserve round-trip fidelity, source locations, aliases, editor-only fields, and domain editing concerns
2. loader/projection layers translate those authoring models into the final execution schema consumed by Flux
3. Flux runtime semantics must not depend on authoring-only metadata
4. if removing authoring-only metadata changes runtime execution semantics, the boundary is wrong
5. complex designers may maintain their own editable document/session models, but Flux still consumes only execution projections plus host capabilities

## Primitive Sufficiency And Promotion Rule

Flux core primitive design follows two hard tests.

### Sufficiency test

The primitive set is sufficient if every new frontend behavior worth standardizing can be expressed as one of the following:

- structure over the base tree
- value evaluation against lexical scope
- runtime-owned value production
- watched consequence dispatch
- capability lookup or explicit instance targeting
- readonly host projection
- domain or host semantics built behind those boundaries

If a feature needs more than that, the first assumption must be:

- the feature belongs to host/domain architecture or schema convention

and not:

- Flux needs a new primitive.

### Promotion test

A concept may become a new Flux primitive only if all of the following are true:

1. it is cross-domain
2. it is not reducible to existing primitives plus schema/domain conventions
3. it is semantically stable
4. it is author-visible at the Flux schema level
5. it is not merely an implementation convenience
6. it is not only a host/domain escape hatch

If any item fails, the concept stays outside Flux core.

## Three Exclusion Rules

The following rules govern the whole document.

1. Not every important runtime system is a primitive.
2. Schema-visible scope carries data, not imperative authority objects.
3. Schema causes author-visible effects only through capabilities.

### Derived runtime systems are not automatically primitives

Flux may have many important runtime systems built from the primitive set.

Examples:

- form runtime
- page runtime
- dialog runtime
- debugger runtime
- complex host wiring

These may be important and first-class in implementation.
They still do not automatically become Flux core primitives.

Implementation importance is not the same thing as primitive status.

## Final Closed Primitive Set

Flux core has exactly seven primitive categories.

### 1. Structure

Flux has one real structural primitive:

- a **base tree** of schema nodes

Each node is identified by:

- `type`
- named `regions`

The base tree owns:

- structure
- parent/child relationships
- lifecycle anchoring
- renderer selection

This is what older documents called `ComponentTree`.

### 2. Scope

Flux has one lexical data-environment primitive:

- `ScopeRef`

`ScopeRef` owns:

- path-based reads
- own-scope writes
- parent shadowing
- optional materialization fallback

`optional materialization fallback` means the runtime may construct a temporary whole-object view of the currently visible lexical data only for APIs or evaluation paths that truly need object materialization. It is a fallback, not the preferred hot path.

This is the real core behind what older documents loosely called `StateTree`.

But Flux does not have one giant state object tree.
It has lexical data scopes plus runtime-owned sidecars attached to scope ownership.

`runtime-owned sidecars` means runtime registries or state holders whose lifetime follows a lexical scope boundary without becoming fields or methods on `ScopeRef` itself.

### 3. Value

Flux has one executable value model.

Values may be:

- literals
- expressions
- templates
- arrays
- objects

All of them compile through one value IR and evaluate against `ScopeRef`.

Hard rule:

- a value is a read result, not a behavior surface

### Constructive reduction examples

The primitive set is not only restrictive; it is constructively expressive.

Examples:

1. A field bound by `name` reduces to:

- structure: one node in the base tree
- scope: one read/write location in lexical data scope
- value: expressions reading that location
- capability: events dispatching actions

2. Dynamic select options loaded from a remote API reduce to:

- resource: one `data-source` publishes `options`
- scope: `options` becomes visible at its binding path
- value: the select node reads options as an ordinary value

No select-specific async primitive is needed.

3. A designer toolbar button that adds a node reduces to:

- structure: toolbar region content
- capability: `designer:addNode` resolved through lexical capability scope
- host projection: updated readonly snapshot becomes visible after host mutation

No separate designer platform primitive is needed.

4. A validation message derived from current form state reduces to:

- scope: form values and scope-intrinsic editable validation summaries owned by the form runtime itself
- value: expressions derive what to show
- capability: submit/validate actions remain effect paths

No second UI-state primitive is needed.

### 4. Resource

Flux has one runtime-owned value-producer primitive.

Current schema syntax uses:

- `type: 'data-source'`

Core conceptually, this primitive is the **resource model**.

Hard rules:

- one resource publishes one logical value
- publication target is normatively explicit through `dataPath`
- resource lifecycle is runtime-owned
- resource is not a hidden imperative effect engine

`data-source` remains the public schema keyword.
`resource` is core architecture vocabulary, not a second public schema primitive.

### 5. Reaction

Flux has one watch/effect primitive.

Current schema syntax uses:

- `type: 'reaction'`

Hard rules:

- a reaction watches values
- a reaction dispatches consequences
- a reaction does not own authoritative business values
- a reaction is not a general scripting runtime

### 6. Capability

Flux has one behavior primitive category with two resolution modes.

#### 6.1 Lexical capability

- `ActionScope`

`ActionScope` owns:

- namespaced capability lookup
- lexical shadowing of namespaces

This is the real core behind what older documents called `ActionTree`.

#### 6.2 Explicit instance capability

- `ComponentHandleRegistry`

This owns:

- explicit targeting of one mounted component instance
- invocation of explicitly exposed instance capabilities

Hard rule:

- lexical capability lookup and instance capability lookup are different resolution modes inside the same capability primitive
- `componentId` targeting must be unique within the visible runtime host tree; ambiguity is a configuration error
- `componentName` targeting is secondary convenience only; multiple matches are an error, not an implicit first-match rule
- if a targeted handle is gone or replaced before dispatch resolves, the action fails with a stale-target or not-found diagnostic
- explicit instance-capability lookup is limited to the current visible runtime host tree or an explicitly composed registry boundary; there is no hidden ambient parent walk across disjoint host trees

In this document, `visible runtime host tree` or `explicitly composed registry boundary` means the renderer-owned `ComponentHandleRegistry` chain that the active render/action context intentionally composes for descendant execution.

### 7. Host projection

Flux has one host-boundary primitive category:

- readonly host projection into schema-visible scope

At core level, this means only:

- readonly snapshot data enters schema-visible scope
- writes leave through capabilities or env-backed effect paths behind capabilities

This is not:

- a bridge object in scope
- a controller bag
- a session primitive
- a domain model

## Minimal Reconciliation With Existing Vocabulary

| Older language | Normative interpretation |
| --- | --- |
| `ComponentTree` | base tree |
| `StateTree` | lexical data scope plus scope-owned runtime sidecars |
| `ActionTree` | lexical capability scope |
| `base tree + overlays` | correct operational picture; the overlays are runtime organization over the same primitive categories, not an extra ontology |

Important clarification:

- Flux core is not "one scope chain explains everything"
- Flux core is one structure tree plus a few orthogonal primitive categories

## Operational Picture: Base Tree Plus Semantic Overlays

Operationally Flux is best understood as:

- one base tree anchoring structure, mount lifetime, and renderer selection
- a lexical data overlay through `ScopeRef`
- a lexical capability overlay through `ActionScope`
- runtime-owned execution overlays for resources and reactions, keyed by lexical ownership
- explicit instance capability lookup through `ComponentHandleRegistry`
- host projection overlays that inject readonly host snapshots into schema-visible data scope

This is the recommended architecture-review mental model.
It is not a second primitive ontology.
The seven primitive categories above remain normative.

At author-facing level, lookup stays simple:

- expressions and dynamic values read from the currently visible data scope
- actions resolve from the current capability scope
- component methods require explicit instance targeting
- projected host data reads like ordinary readonly scope data once admitted

Internally these overlays must remain orthogonal.
Flux must not collapse them into one mixed runtime bag.

## Structural Model

### `type`

`type` is the canonical final-model node kind.

It selects:

- compile-time field interpretation
- renderer binding
- runtime policies for that node kind

It is a runtime execution concept, not the full authoring metadata contract for design tools.

### Regions

A region is a named child fragment of a node.

Typical examples:

- `body`
- `actions`
- `header`

Regions are structural composition points. They are not arbitrary untyped schema blobs.

## Lexical Model

Flux deliberately separates data lookup, behavior lookup, and instance targeting.

### Data scope

`ScopeRef` is the lexical data environment.

It is used by:

- expressions
- templates
- dynamic props and meta
- resource publication targets

It must not become a behavior registry.

### Action scope

`ActionScope` is the lexical capability environment for namespaced actions.

It must stay separate from `ScopeRef`.

### Component handle registry

`ComponentHandleRegistry` is the explicit instance-capability lookup layer.

It must stay separate from both `ScopeRef` and `ActionScope`.

### Resolution model

| Category | Mechanism | Resolution style |
| --- | --- | --- |
| Data | `ScopeRef` | lexical path lookup |
| Lexical capability | `ActionScope` | lexical namespace lookup |
| Instance capability | `ComponentHandleRegistry` | explicit target lookup |

This split is architectural, not incidental.

### Author-facing lookup rule

At usage level, Flux should feel lexically uniform without becoming internally monolithic:

- value reads follow `ScopeRef`
- capability lookup follows `ActionScope`
- instance capability calls require explicit target identity
- host-projected data becomes readable only after passing the scope admission rule

The user-facing simplicity is deliberate.
The internal separation is non-negotiable.

### Ordinary scope data owned by runtime subsystems

Some runtime subsystems such as page or form runtime may own ordinary lexical scope fields inside the scopes they already govern.

This does not create a new primitive or publication channel.

Hard rules:

- once admitted, that data is just ordinary scope data
- it must obey the scope admission rule
- it must not expose imperative handles, protocol controllers, or mutable host/domain objects
- if it needs producer lifecycle, acquisition policy, refresh/invalidation, or async coordination, it is a resource instead
- if it originates from an external host or domain runtime snapshot, it is host projection instead
- its owning subsystem and write authority must be identifiable from the execution model and narrower subsystem contract, not ambient runtime behavior
- collisions with reserved host projection paths or authoritative resource binding targets are invalid and must fail fast
- if a subsystem wants schema-visible companion summaries for its own ordinary scope data, those summaries must be declared as ordinary named scope fields in that subsystem contract rather than ambient hidden publication

## Scope Admission Rule

Flux must be strict about what may appear in schema-visible scope.

Allowed in scope:

- readonly DTO-style snapshot data
- ids, labels, summaries, and expression-friendly derived data
- published resource values
- readonly host-projected snapshot fields

Not allowed in scope:

- mutable domain-core objects
- bridges, command buses, or command adapters
- provider registries and adapter registries
- component handles
- long-lived controllers or state machines
- objects whose main meaning is imperative methods

Admission test:

- if it has imperative methods, lifecycle ownership, or protocol state, it is not a scope value
- if schema must mutate it directly to make the system work, it does not belong in scope

## Execution Boundary Matrix

| Primitive | Owns authoritative value | May cause side effects | Lifecycle owner | Reads from | Writes to | Change basis | Schema-visible |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Value | no | no | none beyond evaluation state | `ScopeRef` | nowhere | semantic top-level equality | yes |
| Resource | yes, for its authoritative published value | producer-internal acquisition effects only; never arbitrary schema-addressable effects | runtime, scoped by lexical ownership | `ScopeRef` plus producer config | one explicit authoritative value target, plus optional explicit readonly status-summary target | semantic top-level equality on published value and summary DTO | yes, through its authoritative value target and optional explicit readonly status-summary target |
| Reaction | no | yes, by dispatching consequences | runtime, scoped by lexical ownership | watched values from `ScopeRef` / runtime evaluation | no authoritative business value target | semantic top-level equality on watched value | yes, as schema node; runtime state may be partially inspectable |
| Capability | no | yes | runtime / host / addressed component | action payload, current scope, runtime context | host/domain effects or targeted instance methods | n/a | yes |
| Host projection | no | no | host renderer | host snapshot | nowhere directly | host snapshot refresh semantics | yes |

This table is normative.

It closes the boundary between value, resource, reaction, authority, and host projection.

## Execution Model

### Value rules

1. Flux has one executable value model: literal, expression, template, array, and object values all compile to the same value IR and evaluate against `ScopeRef`.
2. Derived business values belong to expressions or resources, not to reactions.
3. Change detection uses semantic top-level equality with `Object.is`-style baseline semantics.

In this document, `semantic top-level equality` means:

- primitive comparison follows `Object.is`
- arrays and objects compare by top-level structure and top-level entry identity/value only
- deeper structural equivalence is not the default semantic contract unless a narrower subsystem explicitly says otherwise

4. Identity reuse is an optimization, not the public semantic definition of value equality.

### When a derivation stays a value versus becomes a resource

A derivation stays a plain value when all of the following are true:

- it needs no runtime-owned lifecycle
- it needs no loading/error/stale state
- it needs no cancellation, polling, or refresh policy
- it is simply re-evaluated against current scope

A derivation becomes a resource when any of the following are true:

- it needs runtime-owned lifecycle
- it needs explicit publication into scope
- it needs loading/error/stale semantics
- it needs invalidation, refresh, cancellation, polling, or dedup policy

This rule is normative.

### Resource rules

1. `data-source` is the current schema surface for the resource primitive.
2. One resource publishes one logical value.
3. A logical value means one authoritative published binding target in scope.
4. A resource may additionally expose one optional readonly status-summary DTO through an explicit `statusPath`.
5. That status summary is runtime-derived, not authoritatively writable business data, and not a second logical value.
6. Explicit `dataPath` is the normative binding contract.
7. Explicit `statusPath`, when used, is the normative schema-visible status contract.
8. Any compatibility behavior that publishes without explicit `dataPath` is non-normative and outside the architecture baseline.
9. Resource lifecycle is runtime-owned and scope-owned.
10. Resource registration, replacement, and disposal follow lexical scope ownership.
11. Resource runtime state and controllers do not become methods on `ScopeRef`.
12. Loading, error, stale, cancellation, retry, dedup, and polling belong to resource runtime state, not to plain values and not to reactions.
13. External I/O performed by a resource belongs to the producer implementation contract, not to a second schema authority model.
14. The only author-visible resource control paths are lexical activation, dependency invalidation, and explicit capability-driven refresh or invalidate.
15. If a schema feature needs arbitrary protocol commands rather than value publication, it is not a resource primitive; it belongs behind capabilities or outside Flux core.
16. Formula-backed resources require explicit `dataPath`.
17. Ordinary resource dependencies are runtime-owned and inferred from evaluation or narrower subsystem rules; schema authors should not manually enumerate dependencies for normal derived-value usage.
18. Within one owning lexical scope, a binding target may have at most one active resource publisher.
19. Declaring multiple active resources that publish to the same `dataPath` in the same owning lexical scope is invalid and must fail fast.
20. Child scopes may shadow a parent publication only through ordinary lexical scope shadowing; this does not create multiple publishers for one owning scope.
21. While a resource is active, unrelated schema writes to its authoritative binding target are an architectural error unless a narrower subsystem doc explicitly defines a replacement or disposal transition first.
22. Descendant writes beneath a resource-owned binding target are treated as writes to that authoritative value and are therefore invalid unless a narrower subsystem doc explicitly defines a handoff, editable draft projection, or replacement transition.
23. If `statusPath` is present, it is reserved for that resource's readonly summary DTO, and collisions or schema writes to that path are invalid.
24. Resource ids used for built-in resource targeting are scoped by lexical ownership first, not globally.
25. Duplicate resource ids in different lexical scopes are allowed; built-in targeting resolves within the current visible scope-owned resource registry boundary before any parent scope boundary.
26. Duplicate resource ids within the same owning lexical scope are invalid and must fail fast.
27. Synchronous resource-to-resource dependency chains within one settled update turn must resolve to quiescence before reactions for that turn evaluate watched values.
28. Cycles in synchronous resource dependency chains are invalid and must stop with a structured cycle diagnostic rather than degrade into implicit repeated publication.

`lexical activation` means resource activation caused by the resource node being present within the currently active rendered subtree and owned lexical scope.

For the core model, `currently active rendered subtree` means:

- the subtree is mounted in the live runtime host tree
- it is not disposed or replaced
- it is not marked inactive by an explicit host/runtime boundary contract that narrows activation semantics, such as retained-but-suspended subtrees

If a host or narrower subsystem introduces retained, preloaded, virtualized, hidden, or suspended subtrees, it must explicitly define whether resources and reactions in that boundary are active, suspended, or disposed.
It must not leave activation semantics implicit.

Resource runtime state is not ambient schema-visible data.
Host code and debuggers may inspect it out of band.
Flux core defines no implicit sibling-path, hidden status-summary, or second publication rule for resources.

If schema must render producer status such as loading, stale, or error, the resource must declare `statusPath` explicitly.
`statusPath` publishes one readonly summary DTO owned by that resource primitive.
This is not a second business-value publication, and it is not an ambient hidden channel.

### Resource versus host projection

The distinction is normative:

- use a resource when the execution schema declares how a value is produced, refreshed, invalidated, or polled
- use host projection when an external host/domain runtime already owns the value, its session, and its refresh semantics, and Flux only consumes snapshot data
- do not model a workbench snapshot as a resource merely because it changes over time
- do not model schema-authored fetch/compute policy as host projection merely because the data originates outside the browser

### Reaction rules

1. `reaction` is a watch/effect primitive only.
2. A reaction watches values, compares them, optionally checks guards, and dispatches actions.
3. A reaction does not publish authoritative values.
4. If a reaction dispatches an action that writes scope, that write is still an indirect consequence path, not the reaction's own authoritative published value model.
5. `immediate` means evaluate on activation and dispatch only when normal guard/change rules allow it.
6. `debounce` delays reaction dispatch, not resource publication.
7. `once` disposes the reaction after its first successful trigger.
8. Guards and action payload evaluation may read a readonly reaction context.
9. The reserved reaction-context names are `value`, `prev`, `changed`, and `changedPaths`.
10. Those names are injected only for reaction guard/payload evaluation, not into ordinary lexical scope.
11. Reaction-context names take precedence over same-named ordinary scope fields during that evaluation.
12. On first activation before any prior observed value exists, `prev` is `undefined`, `changed` is `true` only if the reaction is running under `immediate` and the current evaluation produced a value eligible for normal guard/change checks, and `changedPaths` is `[]`.
13. `changedPaths` is a readonly list of paths relative to the reaction's owning lexical scope, reported for the current settled update turn.
14. Paths use the same path notation as normal scope-path addressing, and runtimes may conservatively report parent or wildcard paths when finer-grained provenance is unavailable.
15. A reaction never executes host logic inline; it only dispatches through the capability model.

### Scheduling rules

1. Resource invalidation happens before reaction dispatch.
2. Scope writes settle before reactions run.
3. Reactions run asynchronously after the settled update cycle, never inline inside the originating mutation path.
4. Formula-backed resources are invalidated by dependency changes and, when their next value is synchronously computable in the current turn, they publish before reactions for that turn evaluate watched values.
5. API-backed and other asynchronous resources invalidate immediately but publish new values only when the producer completes in a later settled update turn.
6. Per-turn dedupe means repeated triggers for the same reaction within one settled update turn coalesce into one execution attempt.
7. Bounded cascade protection means reaction-triggered writeback may cascade only up to a finite runtime limit before the cycle is stopped and surfaced as an error.
8. No re-trigger occurs when writeback leaves the watched value semantically unchanged.
9. High-frequency gesture loops, animation-frame coordination, and protocol-state machines are not required to route each tick through reaction scheduling; they may remain host/domain systems that interact with Flux only at stable publication or command boundaries.
10. Within one settled update turn, ready reactions execute in stable base-tree path order of their owning reaction nodes; when multiple live instances share the same compiled node path, execution order is the stable lexical-instance order created by the runtime for that boundary.
11. Scope writes or async completions produced by a reaction schedule a later settled update turn rather than interleaving into the already-running reaction flush.
12. If the bounded cascade limit is reached, runtime aborts the remaining reaction queue for that turn and surfaces a structured cycle error.

`settled update cycle` or `settled update turn` means the runtime boundary after synchronous writes for the current mutation path have completed and before asynchronous reaction work is flushed.

## Authority Model

Flux core allows schema to cause author-visible effects through one authority model only:

- **capability invocation**

This has three operational forms:

1. built-in platform capabilities
2. lexical namespaced capabilities through `ActionScope`
3. explicit instance capabilities through `ComponentHandleRegistry`

Built-in schema actions resolve to reserved built-in capabilities, not a second unrelated authority model.

Built-in platform capabilities may carry built-in targeting fields only for a closed set of Flux-core-owned target classes explicitly defined by narrower core docs.
Current baseline examples are:

- the current lexical/runtime context owned by the action dispatch path
- registered resource ids owned by the resource registry
- core dialog/page stack semantics already defined by Flux runtime

Current baseline rule:

- built-in targets are limited to contextual scope/form/page/dialog semantics and registered resource ids
- built-in targets do not address host bridges, domain runtimes, imported namespaces, or component instances

Built-in targeting must not expand into a generic runtime-object address space.
They must not become a generic targeting surface for host or domain runtimes.
Anything host-specific or domain-specific must still route through namespaced capabilities or explicit instance capabilities.

Built-in targeting fields are part of each built-in action contract.
They are not implicitly shared with `component:<method>` targeting.
Reusing a field name such as `componentId` for backwards compatibility does not change the semantic target class.

Capability resolution order is normative:

1. built-in platform capability
2. explicit instance capability matching `component:<method>` through `ComponentHandleRegistry`
3. lexical namespaced capability resolution through the current `ActionScope` chain
4. not-found diagnostic

Built-in action names are reserved by Flux core.
Hosts, imports, and schema conventions must not redefine or shadow them.
`component:` is also a reserved instance-capability prefix.
Lexical capability providers and imports must not claim or shadow that prefix.
A `component:<method>` action without explicit target identity is invalid and must fail before lexical capability lookup.

Component-targeted capability surfaces are explicit.
There is no implicit fallback to arbitrary store, controller, or bridge methods.

Env hooks are not schema-level behavior primitives.
They are host implementation behind capability execution.

`env` means the host-provided environment boundary for side-effect integrations such as fetch, notify, navigate, open external resources, or similar runtime host services.

### Capability surface and final-model closure

The final execution schema declares the capability names, imports, target identities, and host-boundary placements that authored behavior may refer to.

Current import surface:

- capability imports are declaration-style provisioning specs in the final execution schema, currently surfaced as `xui:imports`
- they provision namespaces into the owning `ActionScope` boundary
- they are order-independent, lexical by ownership, and may shadow parent namespaces intentionally
- they do not create a new primitive or a second dispatch system

The embedding host/runtime may provide, deny, or policy-filter the corresponding handlers, but it may not:

- reinterpret the meaning of an action name after compilation
- make capability visibility depend on sibling render order
- turn ambient global registration into the primary authority mechanism
- invent new author-visible capability categories at runtime

In other words, runtime provisioning is part of the execution environment contract, not a license for semantic drift.

Resource execution does not create a second schema authority channel.
A resource may perform producer-internal acquisition effects such as fetch, subscribe, poll, retry, and cancel only through a host-registered producer contract.
Schema authorizes publication of one logical value at `dataPath`; it does not gain arbitrary external command authority by declaring a resource.
Any author-visible start, stop, refresh, invalidate, or mutation request must still occur through capability invocation.

Hard rule:

- schema causes effects through capabilities
- env is host implementation behind that path
- host projection itself is not an authority channel

## Host Projection Model

Host projection is the minimal Flux-core boundary for complex hosts.

Normative rules:

1. Host-visible schema data is readonly snapshot projection only.
2. Schema-visible host surface contains only DTO-style snapshot data.
3. Snapshot freshness is host-driven: the host owns when a new snapshot is projected, and schema observes the latest projected state through normal scope reactivity.
4. Projection is mounted at a host-owned lexical boundary as ordinary readonly fields such as `session`, `doc`, `selection`, `activeNode`, `activeEdge`, or `runtime`; Flux core does not require one universal reserved `host.*` root object.
5. Projected host data is read by value semantics; no stable mutable identity contract is implied beyond ordinary runtime identity reuse optimizations.
6. Hosts must replace projected snapshots rather than rely on schema-visible in-place mutation of nested objects.
7. Renderer-private internals may exist in renderer code, React context, or host helpers, but they are not schema contract.
8. Temporary debug exposure of richer objects is non-normative and must not become author-facing contract.
9. A "special host type" means only a specialized renderer and shell integration pattern over the same Flux primitive set. It does not authorize new core primitives by itself.
10. If schema authors own fetch, refresh, invalidation, or polling policy for a value, that value belongs to the resource model rather than to host projection.
11. Projection field names are fixed by the host contract for that special host type, not ad hoc aliases per renderer instance.
12. Those projected field names are reserved within the host-owned lexical boundary.
13. A projection path collision with schema-owned ordinary scope data or resource publication in the same owning boundary is invalid and must fail fast.
14. Writes to projected host fields are invalid and must fail with a diagnostic rather than silently shadow-writing or mutating the host snapshot.
15. Host snapshot replacement enters the normal settled update mechanism as scope-visible readonly data; multiple host updates may coalesce within a turn, and reactions observe the latest settled projection for that turn.
16. Descendant ordinary scopes inside the same host-owned lexical boundary must not shadow reserved projection field names such as `session`, `doc`, `selection`, `activeNode`, `activeEdge`, or `runtime` unless a narrower host contract explicitly defines a nested host boundary that rebinds them.
17. Projection becomes schema-visible only after the host boundary is created; it is available to descendant schema rendered inside that boundary, not to the special host node's own pre-boundary prop resolution unless a narrower host contract explicitly says otherwise.

In other words, a `special host type` is still just a normal schema node kind rendered through specialized host integration; it is not a privileged primitive class.

### Thin host protocol pattern

Complex platforms may standardize a thin host-side protocol for workbench-like nodes.
Typical host-side concerns include:

- snapshot subscription
- command dispatch
- session summaries such as dirty/busy/undo/redo/leave-guard
- namespace registration for host capabilities

Normative rules:

- this protocol is host architecture, not a schema-visible primitive category
- schema still reads only projected snapshot data and invokes capabilities
- domain cores remain behind the host boundary
- the existence of a shared host protocol does not authorize exposing raw bridges or session controllers into schema-visible scope
- the protocol must stay reducible to snapshot subscription, command dispatch, session summaries, and namespace wiring
- it must not become a generic plugin/provider registry, arbitrary method table, or schema-defined free-form command bus
- host policy may deny or filter declared capabilities, but must not invent new author-visible capability classes at runtime
- shared helper types such as bridge interfaces, busy-state summaries, undo/redo summaries, leave-guard summaries, or interaction-policy DTOs are acceptable only as host-private contracts or projected readonly data, never as new schema-visible primitive families

## What Stays Outside Flux Core

The following are outside Flux core, even if they matter to real products.

These exclusions are direct applications of the promotion test and the three exclusion rules above.

- authoring-model round-trip concerns
- XML/JSON round-trip concerns
- source-preserving document metadata
- domain document semantics
- graph, spreadsheet, report, and other domain algorithms
- typed domain command vocabularies
- workbench shells
- session models
- collaboration protocols
- high-frequency gesture loops
- layout, hit-testing, collision, and other domain algorithm internals
- domain plugin, adapter, and provider families

The reason they stay outside Flux core is not that they are unimportant.
It is that they are either:

- domain-specific
- host-specific
- reducible to existing primitives plus conventions
- or implementation systems rather than author-visible core semantics

These may appear to Flux only through:

- readonly host projection
- capability invocation
- explicit instance targeting
- env-backed host behavior behind capability execution
- a special host `type`

Hard rule:

- if it has imperative methods, protocol state, session ownership, or domain mutation authority, it is outside Flux core

### Time, protocol, and collaboration processes

Flux may standardize the author-visible surface of these systems without absorbing their internals.

- cross-domain value publication enters through resources when the execution schema owns production policy
- watched consequences enter through reactions
- host-owned snapshots enter through host projection
- arbitrary protocol commands, collaboration engines, gesture state machines, and spatial algorithms remain host/domain systems unless a future cross-domain semantic passes the promotion test

This is why the model can remain closed without pretending every process must collapse into ordinary scope values.

## Flow Designer As A Minimal Example

Flow Designer may be used as a minimal example of host-boundary integration, but it must not define Flux core vocabulary.

At Flux core level, it demonstrates only this pattern:

- a special host `type`
- readonly snapshot projection through host projection
- namespaced capability dispatch such as `designer:*`
- optional explicit instance capability escape hatch
- region-based shell composition

Its graph algorithms, layout behavior, collision logic, and other domain-core semantics are outside Flux core.

Flow Designer is a specimen, not a source of truth for Flux primitive design.

## Why This Primitive Set Is Enough

This document claims the primitive set is sufficient. The reason is structural.

Every frontend behavior worth standardizing in Flux must answer some combination of these questions:

1. Where is this node in the program structure?
2. Which data is visible here?
3. How is a value derived here?
4. Does some runtime-owned producer publish a value here?
5. Does some watched change trigger a consequence here?
6. Which authority may perform the effect?
7. Which readonly host snapshot is visible here?

Those questions correspond exactly to the seven primitive categories:

1. structure
2. scope
3. value
4. resource
5. reaction
6. capability
7. host projection

Anything not covered by these questions is either:

- a domain concern
- a host concern
- an implementation/runtime-system concern
- or a sign that a new candidate primitive must pass the promotion test

This is why the primitive set is closed.

## Hard Invariants

Flux core must keep these invariants.

1. Flux is a final-model runtime.
2. The base tree owns structure and lifecycle.
3. Values, lexical capabilities, and instance capabilities stay distinct.
4. Host-visible scope is readonly host projection.
5. One resource publishes one logical value.
6. Reactions are for consequences, not value derivation.
7. Resource and reaction ownership follow lexical scope lifetime without turning `ScopeRef` into a behavior bag.
8. Schema-visible host surface and renderer-private host internals stay distinct.
9. Schema causes effects only through the capability model.
10. New domain complexity does not automatically create new Flux-wide primitive categories.
11. Authoring-model concerns and execution-model semantics stay separate.
12. Shared workbench/session host protocols may exist, but schema still sees only projection and capabilities.

## Failure Conditions

The model should be considered under architectural failure pressure if any of the following start happening repeatedly.

- `ScopeRef` is asked to carry behavior tables, controllers, or mutable host objects
- domain-core objects are repeatedly exposed into schema-visible scope
- component handles are treated as ordinary scope values
- resources are used as implicit imperative write engines
- resources repeatedly need schema-defined protocol commands or direct external-operation authority beyond value publication
- reactions become general-purpose workflow scripting
- host projection turns into a mutable or imperative host bag
- shared workbench/session helpers start leaking raw bridges, controllers, or domain runtimes into schema-visible scope
- new domains repeatedly require new Flux-wide provider or adapter categories
- authoring-model data leaks into runtime renderer contracts because the authoring/execution boundary is ignored

## Explicitly Closed Decisions

This document closes the following decisions.

1. `data-source` remains the public schema keyword. `resource` is architecture vocabulary for the primitive category.
2. `reaction` is a first-class watch/effect primitive, not future intent only.
3. Explicit `dataPath` is the normative binding rule for resources.
4. Built-in actions are part of the capability model, not a separate authority system.
5. Host/session/workbench/bridge are not Flux core primitives.
6. Flow Designer may validate the host-boundary pattern, but it must not define Flux core concepts.
7. A thin shared host protocol is allowed as host architecture, but it does not change the core primitive set.
8. Authoring model and execution model are distinct layers; Flux owns only the latter.

The following still require narrower subsystem docs, not new core primitives.

1. detailed producer-specific resource behavior
2. detailed debugger surfaces for resource and reaction runtime
3. browser-side authoring document and execution projection details for design tools

## Integrated JSON Example

The following example shows how the core primitives integrate without introducing any extra platform concepts.

It intentionally demonstrates all three capability operational forms:

- built-in platform capability: `refreshSource`
- lexical capability: `designer:addNode`
- explicit instance capability: `component:validate`, `component:submit`

```json
{
  "type": "page",
  "body": [
    {
      "type": "data-source",
      "id": "countries",
      "dataPath": "lookups.countries",
      "api": {
        "url": "/api/countries",
        "method": "get"
      }
    },
    {
      "type": "form",
      "id": "shipping-form",
      "body": [
        {
          "type": "text",
          "text": "Current user: ${currentUserName}"
        },
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
        "action": "designer:addNode",
        "args": {
          "nodeType": "task"
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
      "label": "Submit Shipping",
      "onClick": {
        "action": "component:submit",
        "componentId": "shipping-form"
      }
    }
  ]
}
```

Read the example through these callouts:

1. `/body/0` is **resource publication** to `lookups.countries`.
2. `/body/1/body/0`, `/body/1/body/1`, and `/body/1/body/2` show **ordinary value and scope use** through `${currentUserName}`, `name`, and `${lookups.countries}`.
3. `/body/1/body/3` is a **reaction** watching a scope value and dispatching a consequence.
4. `/body/2` is a **special host type** whose descendants may later consume readonly host projection inside the host boundary.
5. `/body/3/onClick` is **lexical capability** resolution through `designer:addNode`.
6. `/body/4/onClick` is a **built-in platform capability** operating on a registered resource id via `refreshSource`.
7. `/body/5/onClick` is **explicit instance capability** targeting `shipping-form`.

Taken together, the example shows one integrated model:

- one base tree
- one lexical data model
- one value model
- one resource model
- one reaction model
- one capability model
- one host projection model

## Related Documents

- `docs/architecture/flux-core.md`
- `docs/architecture/api-data-source.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-dsl-vm-extensibility.md`
- `docs/architecture/complex-control-host-protocol.md`
- `docs/discussions/01-core-design-clarification.md`
