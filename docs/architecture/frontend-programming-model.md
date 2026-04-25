# Flux Frontend Programming Model

## Purpose

This document defines the top-level frontend programming model executed by `Flux`.

It answers four questions:

1. What does `Flux` execute?
2. What are the seven core primitives?
3. How do those primitives compose into one execution model?
4. What is derived from the primitive set, and what stays outside `Flux` core?

This document is normative architecture.

Detailed subsystem rules belong in narrower documents. Use this file for primitive identity, macro layering, core execution boundaries, and hard invariants.

## Precedence

This document is the top-level contract for:

- the closed primitive set
- primitive sufficiency and promotion rules
- the boundary between authoring, loader assembly, runtime execution, and host/domain systems
- the only author-visible effect path for `Schema`
- the macro execution model connecting structure, scope, values, resources, reactions, capabilities, and host snapshots

If a narrower document conflicts with this document about primitive identity, core boundaries, or what counts as a derived runtime system, this document wins.

## Canonical Terms

This document uses these canonical terms:

| Term | Meaning |
| --- | --- |
| `Final Execution Schema` | the already-assembled schema consumed by `Flux` at runtime after static structure decisions, default expansion, and static trimming are complete |
| `Authoring Model` | the editable, round-trip-preserving source model |
| `Execution Model` | the `Final Execution Schema` plus runtime-owned state and sidecars |
| `Lexical Ownership` | ownership that follows scope or subtree boundaries |
| `Logical Value` | one authoritative published binding target |
| `Semantic Lifecycle Entry` | a node-owned semantic entry point such as form submit, page enter, dialog open, or host-specific semantic activation |

For broader terminology, use `docs/references/terminology.md`.

## Core Claim

`Flux` is a `Final Execution Schema` frontend runtime.

That means:

- structure is assembled before runtime execution
- the runtime surface stays small and stable
- domain and host complexity do not automatically justify new primitives
- `Schema` may cause visible effects only through `Capability`

The design target is one closed primitive set that can standardize frontend structure, data visibility, value derivation, runtime-owned value production, watched consequences, effect authority, and readonly host snapshot admission without collapsing everything into one mutable runtime bag.

## Design Standard

This model is optimized for the current practical envelope:

- browser execution
- `TypeScript`
- `React` or an equivalent UI host
- loader-side assembly of the final schema before runtime execution

It prefers stable author-visible semantics and domain isolation over runtime-surface growth.

For design rationale, use `docs/architecture/flux-design-principles.md`.

## Design Continuity Rules

The current programming model includes these stable design rules:

1. Keep the seven-primitive closure.
2. Keep `Flux` as a `Final Execution Schema` runtime, not a staged-program system or authoring-time structure assembler.
3. Do not collapse `Value`, `Resource`, and `Host Projection` into one generic binding primitive.
4. Do not treat SSR, hydration, CRDT, OT, local-first replication, or editor-specific concerns as reasons by themselves to reopen the primitive closure.
5. Judge future adjustments first by `DSL` continuity rather than runtime elegance alone.
6. Preserve progressive authoring surfaces:

| Concern | Progressive path |
| --- | --- |
| value production | plain value -> `${expr}` -> `type: 'source'` -> `type: 'data-source'` |
| effect orchestration | single-step dispatch -> `when` -> `then` / `onError` -> `parallel` |
| structure | `visible` -> `when` -> `loop` -> `dynamic-renderer` |

7. Keep `Capability` focused on authority lookup and targeting; keep `Action Algebra` as derived control flow layered above it.
8. `ApiSchema` is the internal transport descriptor used by the `ajax` action; it is not an independent execution path. Authoring-level `api` fields compile to standard `ajax` actions. `Operation Control` remains the shared execution-control layer.
9. Keep `Semantic Lifecycle Entry` owned by semantic nodes such as forms, pages, dialogs, and semantic hosts instead of scattering the full business pipeline across UI triggers.
10. Keep `Resource` publication converged around `name` as the identity and default publication path, `mergeToScope: true` as the only narrowed special publish extension, and `statusPath` as readonly status summary.
11. Keep host boundaries strict: read through readonly `Host Projection`, write through `Capability`, and keep bridge/controller/protocol objects host-private.

## Platform Layering

A platform built on `Flux` should be understood as four layers:

| Layer | Owns |
| --- | --- |
| `Authoring Model` | source locations, aliases, editor metadata, round-trip fidelity, editing structure |
| loader / assembly | inheritance expansion, policy trimming, `i18n`, static defaults, final schema assembly |
| `Flux` `Execution Model` | value evaluation, dependency tracking, `Resource` lifecycle, `Reaction` scheduling, `Capability` resolution, host projection consumption |
| host and domain runtimes | domain cores, bridges, collaboration engines, session models, workbench shells, special host protocols |

`Flux` is the execution core of the platform, not the whole platform.

The four platform layers describe end-to-end ownership only. They must not be confused with the internal taxonomy used inside the `Flux` `Execution Model`.

## Execution-Model Taxonomy

Inside the `Flux` `Execution Model`, concepts fall into three categories:

| Category | Meaning |
| --- | --- |
| `Core Primitive` | an irreducible semantic category in the closed primitive set |
| `Primitive-Owned Surface` | an author-visible or evaluator-visible surface that expresses one primitive without becoming a new primitive |
| `Derived Runtime System` | a stable runtime system composed from the primitive set |

This taxonomy is internal to the `Flux` `Execution Model`. It is not a second platform-layer stack.

Examples:

| Concept | Platform layer | Execution-model category |
| --- | --- | --- |
| JSON/XML authoring schema | `Authoring Model` | not part of execution-model taxonomy |
| `Final Execution Schema` | boundary into `Flux` `Execution Model` | assembled execution contract, not a primitive |
| expression and template interpolation | `Flux` `Execution Model` | `Primitive-Owned Surface` of `Value` |
| `Action Algebra` | `Flux` `Execution Model` | `Derived Runtime System` above `Capability` |
| `ApiSchema` | `Flux` `Execution Model` | internal transport descriptor for the `ajax` action |
| `Operation Control` | `Flux` `Execution Model` | `Derived Runtime System` |
| `FormRuntime` / `PageRuntime` / `SurfaceRuntime` | `Flux` `Execution Model` | `Derived Runtime System` |
| CRDT / OT / domain bridge / graph engine | host and domain runtimes | outside `Flux` core |

Two clarifications are required:

1. `Action Algebra` is inside `Flux` execution, but outside the primitive closure.
2. authoring syntaxes such as JSON or XML stay outside `Flux` core even when they eventually compile into `Final Execution Schema`.

Key rule:

> if a problem can be solved by structure transformation before runtime, it should not be promoted into the `Flux` runtime surface.

### Structural Authoring Baseline

The author-visible structural baseline remains:

- `visible` = visual presence only
- `when` = structural activation and lifecycle participation
- `loop` = collection-driven structural expansion
- `dynamic-renderer` = controlled delayed or remote fragment assembly
- `data-source` = `Resource` declaration, not fragment assembly

`visible` and `when` are not synonyms. `dynamic-renderer` is not a second `Resource` surface.

## `Final Execution Schema` Boundary

`Flux` executes a `Final Execution Schema`.

That means:

- structure is already assembled
- static defaults are already expanded
- static policy trimming is already complete
- node kinds are already decided

The architectural rule is about the contract that enters execution, not about where the last compile step physically runs.

If a delayed or host-admitted fragment is introduced after initial page load, it must still cross the same boundary before execution:

- it is compiled or normalized into the same execution contract as the rest of the tree
- it receives the same primitive model (`Template`, `ScopeRef`, `Value`, `Resource`, `Reaction`, `Capability`, `Host Projection`)
- it does not reopen authoring-time inheritance expansion or ad hoc loader semantics inside the execution core

`Flux` still owns runtime work, including:

- `Value` evaluation
- dependency collection and targeted invalidation
- `Resource` lifecycle and publication
- `Reaction` scheduling
- `Capability` resolution and dispatch
- `Host Projection` consumption
- semantic lifecycle dispatch at runtime-owned node boundaries

`Flux` does not perform open-ended loader-style schema rewriting, inheritance expansion, or profile assembly in the browser runtime.

Allowed runtime structural multiplication is narrow and derivative only:

- rendering already-declared child templates against item scopes
- conditional activation or omission of already-compiled nodes or fragments
- virtualization or retention strategies that do not change the author-visible structural contract

## The Closed Primitive Set

`Flux` core has exactly seven primitives.

| Primitive | Question it answers | Owns |
| --- | --- | --- |
| `Template` | What is the compiled program structure? | immutable structural template, `Region` composition, lifecycle anchoring, renderer selection |
| `ScopeRef` | Which data is visible here? | lexical lookup, own-scope writes, shadowing, scope-local ownership |
| `Value` | How is a value read or derived here? | literal, expression, template, array, and object evaluation against `ScopeRef` |
| `Resource` | Does runtime own production and publication of a value here? | lifecycle-owned value production, publication of one `Logical Value`, status/refresh/invalidation semantics |
| `Reaction` | Does a watched change trigger a consequence? | watch/effect behavior over `Value` results |
| `Capability` | Who has the authority to perform an effect? | built-in, explicit instance-targeted, and lexical namespaced effect dispatch |
| `Host Projection` | Which readonly host snapshot is visible here? | admission of host-owned readonly snapshot data into schema-visible scope |

### Primitive Notes

- `Template` is the only structural primitive. It is a compile-time artifact: the compiler produces an immutable structural template, and the runtime never modifies it. One `Template` can be instantiated multiple times, each producing independent live runtime state.
- In the current implementation, `Template` is primarily carried by `CompiledTemplate` and `TemplateNode`; other execution-package carriers are allowed as long as they preserve the same structural contract.
- `ScopeRef` is a data environment, not a behavior registry.
- `Value`, `Resource`, and `Reaction` are distinct categories and must not collapse into one generic binding concept.
- `Capability` is the only author-visible effect authority path.
- `Host Projection` is readonly snapshot data, not a host bridge object or mutable session bag.

## How The Primitives Compose

The seven primitives are not independent features. They form one execution model.

### Execution Loop

1. `Template` anchors structure, renderer ownership, and lexical boundaries. It is compiled once and instantiated zero or more times at runtime.
2. `ScopeRef` defines the lexical data visible at each boundary.
3. `Host Projection` may admit readonly host snapshot fields into that visible scope.
4. `Value` reads from `ScopeRef` and may collect dependencies while evaluating.
5. `Resource` uses runtime-owned lifecycle to publish one `Logical Value` back into scope.
6. `Reaction` watches `Value` results and queues possible consequences when dependencies hit.
7. `Capability` is the only path by which those consequences cross into effects.
8. Effects re-enter `Flux` only through scope writes, `Resource` targeting, component targeting, or host snapshot replacement.

### Shared Dependency Baseline

`Value`, `Resource`, and `Reaction` share one dependency model, but a dependency hit has different consequences:

| Primitive | Dependency consequence |
| --- | --- |
| `Value` | recompute the read result |
| `Resource` | invalidate, recompute, or refresh according to resource policy |
| `Reaction` | re-evaluate the watched value and only then decide whether to dispatch through `Capability` |

Dependency change alone does not directly dispatch arbitrary actions. Crossing from dataflow into effects still requires `Reaction` or a `Semantic Lifecycle Entry`.

### Operational Picture

Operationally, `Flux` is best understood as:

- one immutable `Template` anchoring structure and mount lifetime
- one lexical data layer through `ScopeRef`
- one host snapshot layer through `Host Projection`
- runtime-owned sidecars for `Resource` and `Reaction`, keyed by `Lexical Ownership`
- one authority layer through `Capability`

`Capability` itself resolves through two supporting runtime layers plus built-in platform actions:

- built-in platform capabilities
- explicit instance targeting via `ComponentHandleRegistry`
- lexical namespaced lookup via `ActionScope`

Those lookup layers are part of the `Capability` model. They are not extra primitives.

## Sufficiency And Promotion

### Sufficiency Test

The primitive set is sufficient if every behavior worth standardizing in `Flux` reduces to one of:

- structure and lifecycle over the compiled `Template`
- `Value` evaluation against `ScopeRef`
- runtime-owned publication through `Resource`
- watched consequence dispatch through `Reaction`
- effect authority through `Capability`
- readonly host snapshot admission through `Host Projection`
- derived runtime systems built from those boundaries

If a feature appears to need more than that, the first assumption should be that it belongs to host/domain architecture or schema convention, not that `Flux` needs a new primitive.

### Promotion Test

A concept may become a new primitive only if all of the following are true:

1. it is cross-domain
2. it is not reducible to the existing primitives plus conventions
3. it is semantically stable
4. it is author-visible at the `Flux` schema layer
5. it is not merely an implementation convenience
6. it is not only a host or domain escape hatch

### Exclusion Rules

1. Not every important runtime system is a primitive.
2. Schema-visible scope carries data, not imperative authority objects.
3. `Schema` causes author-visible effects only through `Capability`.

## Derived Runtime Systems

The following systems are important, but they are derived from the primitive set rather than promoted into it:

| System | Role | Primary doc |
| --- | --- | --- |
| `Action Algebra` | composes, branches, aggregates, and classifies `Capability` dispatch | `docs/architecture/action-algebra-formal-spec.md` |
| `Operation Control` | shared timeout/cancel/retry/dedup substrate above transport and below consumer policy | `docs/architecture/api-data-source.md` |
| `Semantic Lifecycle Entry` | node-owned business entry such as form submit, page enter, or dialog confirm | `docs/architecture/form-validation.md` |
| `FormRuntime` / `PageRuntime` / `SurfaceRuntime` | domain-shaped execution surfaces built on the primitive set | `docs/architecture/flux-core.md` |
| debugger runtime and complex host wiring | inspection, tooling, and host protocol layers | `docs/architecture/debugger-runtime.md`, `docs/architecture/complex-control-host-protocol.md` |

These systems may evolve without increasing the primitive count.

They still belong to the `Flux` `Execution Model` unless a narrower owner document explicitly places them in host/domain architecture.

## What Stays Outside `Flux` Core

The following remain outside `Flux` core even when they matter to real products:

- round-trip authoring concerns and source-preserving metadata
- XML/JSON syntax preservation concerns
- domain document semantics
- graph, spreadsheet, report, and other domain algorithms
- collaboration protocols, CRDT, OT, and local-first sync engines
- workbench shells and session models
- high-frequency gesture loops, layout, hit-testing, and spatial algorithms
- plugin or provider families that exist only for one domain
- host bridge objects, controllers, and protocol state machines

These are outside core not because they are unimportant, but because they are domain-specific, host-specific, reducible to existing primitives plus conventions, or implementation systems rather than author-visible cross-domain semantics.

They may appear to `Flux` only through narrow boundaries such as:

- readonly `Host Projection`
- `Capability` invocation
- explicit instance targeting
- special host node kinds
- `Resource` when the execution schema truly owns production policy

## Hard Invariants

`Flux` core must keep these invariants:

1. `Flux` is a `Final Execution Schema` runtime.
2. `Authoring Model` and `Execution Model` stay separate.
3. `Template` owns structure and lifecycle anchoring. It is immutable at runtime.
4. `ScopeRef` is a data environment, not a behavior registry.
5. `Value`, `Resource`, and `Reaction` remain distinct.
6. One `Resource` publishes one authoritative `Logical Value`.
7. `Reaction` is for watched consequences, not value derivation.
8. `Resource` and `Reaction` ownership follow `Lexical Ownership`.
9. `Host Projection` is readonly snapshot data.
10. `Schema` causes visible effects only through `Capability`.
11. `Capability` is the authority primitive; `Action Algebra` is derived control flow layered above it.
12. Dependency tracking is a first-class execution baseline, and dependency change does not directly dispatch arbitrary actions.
13. New domain complexity does not automatically create new primitives.
14. `ApiSchema` is the internal transport descriptor used by the `ajax` action; all runtime execution goes through action dispatch. `Operation Control` remains the shared execution-control layer.
15. `Semantic Lifecycle Entry` belongs to the owning semantic node when that boundary exists.
16. Host integration follows readonly `Host Projection` plus `Capability` write boundaries.

## Related Documents

Use the narrowest document that owns the detail you need:

| Need | Document |
| --- | --- |
| design rationale and principles | `docs/architecture/flux-design-principles.md` |
| current code-level architecture baseline | `docs/architecture/flux-core.md` |
| dependency tracking details | `docs/architecture/dependency-tracking.md` |
| action composition, `then`, `onError`, `parallel`, result classes | `docs/architecture/action-algebra-formal-spec.md` |
| capability lookup, `ActionScope`, `xui:imports`, component targeting | `docs/architecture/action-scope-and-imports.md` |
| `source`, `data-source`, `Resource`, and `Reaction` schema details | `docs/architecture/api-data-source.md` |
| host snapshot and editable-host protocol details | `docs/architecture/complex-control-host-protocol.md` |
| form-owned lifecycle and validation behavior | `docs/architecture/form-validation.md` |
