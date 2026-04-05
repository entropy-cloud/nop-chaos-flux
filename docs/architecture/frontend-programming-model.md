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

This is the real core behind what older documents loosely called `StateTree`.

But Flux does not have one giant state object tree.
It has lexical data scopes plus runtime-owned sidecars attached to scope ownership.

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

- scope: form values and error summaries in lexical scope or runtime-fed projection
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

- lexical capability and instance capability are different categories

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
| `base tree + overlays` | acceptable intuition, but not a separate primitive ontology |

Important clarification:

- Flux core is not "one scope chain explains everything"
- Flux core is one structure tree plus a few orthogonal primitive categories

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
| Value | no | no | none beyond evaluation state | `ScopeRef` | nowhere | semantic value equality | yes |
| Resource | yes, for its published value | no direct imperative side effects beyond production lifecycle | runtime, scoped by lexical ownership | `ScopeRef` plus producer config | one explicit binding target | semantic value equality on published value | yes, through published value and optional readonly status summaries |
| Reaction | no | yes, by dispatching consequences | runtime, scoped by lexical ownership | watched values from `ScopeRef` / runtime evaluation | no authoritative business value target | semantic watched-value change | yes, as schema node; runtime state may be partially inspectable |
| Capability | no | yes | runtime / host / addressed component | action payload, current scope, runtime context | host/domain effects or targeted instance methods | n/a | yes |
| Host projection | no | no | host renderer | host snapshot | nowhere directly | host snapshot refresh semantics | yes |

This table is normative.

It closes the boundary between value, resource, reaction, authority, and host projection.

## Execution Model

### Value rules

1. Flux has one executable value model: literal, expression, template, array, and object values all compile to the same value IR and evaluate against `ScopeRef`.
2. Derived business values belong to expressions or resources, not to reactions.
3. Change detection uses semantic top-level equality with `Object.is`-style baseline semantics.
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
3. A logical value means one authoritative published binding target in scope, together with runtime-owned status attached to that producer rather than spread across unrelated schema fields.
4. Explicit `dataPath` is the normative binding contract.
5. Omitted `dataPath` merge-into-scope behavior is legacy compatibility, not the preferred model.
6. Resource lifecycle is runtime-owned and scope-owned.
7. Resource registration, replacement, and disposal follow lexical scope ownership.
8. Resource runtime state and controllers do not become methods on `ScopeRef`.
9. Loading, error, stale, cancellation, retry, dedup, and polling belong to resource runtime state, not to plain values and not to reactions.

### Reaction rules

1. `reaction` is a watch/effect primitive only.
2. A reaction watches values, compares them, optionally checks guards, and dispatches actions.
3. A reaction does not publish authoritative values.
4. If a reaction dispatches an action that writes scope, that write is still an indirect consequence path, not the reaction's own authoritative published value model.
5. `immediate` means evaluate on activation and dispatch only when normal guard/change rules allow it.
6. `debounce` delays reaction dispatch, not resource publication.
7. `once` disposes the reaction after its first successful trigger.

### Scheduling rules

1. Resource invalidation happens before reaction dispatch.
2. Scope writes settle before reactions run.
3. Reactions run asynchronously after the settled update cycle, never inline inside the originating mutation path.
4. Formula-backed resources are invalidated by dependency changes and recompute through resource semantics.
5. API-backed resources invalidate and refresh according to source policy.
6. Per-turn dedupe means repeated triggers for the same reaction within one settled update turn coalesce into one execution attempt.
7. Bounded cascade protection means reaction-triggered writeback may cascade only up to a finite runtime limit before the cycle is stopped and surfaced as an error.
8. No re-trigger occurs when writeback leaves the watched value semantically unchanged.

## Authority Model

Flux core allows schema to cause effects through one authority model only:

- **capability invocation**

This has three operational forms:

1. built-in platform capabilities
2. lexical namespaced capabilities through `ActionScope`
3. explicit instance capabilities through `ComponentHandleRegistry`

Built-in actions are reserved built-in capabilities, not a second unrelated authority model.

Env hooks are not schema-level behavior primitives.
They are host implementation behind capability execution.

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
4. Projected host data is read by value semantics; no stable mutable identity contract is implied beyond ordinary runtime identity reuse optimizations.
5. Renderer-private internals may exist in renderer code, React context, or host helpers, but they are not schema contract.
6. Temporary debug exposure of richer objects is non-normative and must not become author-facing contract.
7. A "special host type" means only a specialized renderer and shell integration pattern over the same Flux primitive set. It does not authorize new core primitives by itself.

## What Stays Outside Flux Core

The following are outside Flux core, even if they matter to real products.

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

## Failure Conditions

The model should be considered under architectural failure pressure if any of the following start happening repeatedly.

- `ScopeRef` is asked to carry behavior tables, controllers, or mutable host objects
- domain-core objects are repeatedly exposed into schema-visible scope
- component handles are treated as ordinary scope values
- resources are used as implicit imperative write engines
- reactions become general-purpose workflow scripting
- host projection turns into a mutable or imperative host bag
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

The following still require narrower subsystem docs, not new core primitives.

1. detailed producer-specific resource behavior
2. detailed debugger surfaces for resource and reaction runtime
3. browser-side authoring document and execution projection details for design tools

## Related Documents

- `docs/architecture/flux-core.md`
- `docs/architecture/api-data-source.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-dsl-vm-extensibility.md`
- `docs/architecture/complex-control-host-protocol.md`
- `docs/discussions/01-core-design-clarification.md`
