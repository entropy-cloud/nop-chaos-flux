# Frontend Programming Model Improvement Design

> Status: active follow-up design - 2026-04-06
> Companion to: `docs/architecture/frontend-programming-model.md`
> Related discussion: `docs/discussions/02-programming-model-optimality-critique.md`

## Purpose

This document records the narrow improvement design that survives the independent critique of the top-level frontend programming model.

It is not a replacement primitive system.

It exists to answer a narrower question:

> given the current seven-primitive closure, what should still be tightened so the model remains the best-known feasible baseline for Nop's Java-loader, final-schema runtime architecture?

This document is normative for follow-up convergence direction, but it does not replace the precedence of `docs/architecture/frontend-programming-model.md`.

## Scope

This document applies only inside the existing architecture envelope:

- Java backend and loader-side schema assembly remain real platform constraints
- `Flux` remains a `Final Execution Schema` runtime, not an authoring-time structure assembler
- the seven-primitive closure remains unchanged
- collaboration, CRDT, OT, local-first replication, and editor-specific concerns remain outside `Flux` core unless they later pass the promotion test

## Closed Decisions

The critique process produced the following closed decisions.

1. Do not replace the current primitive set.
2. Do not replace `Final Execution Schema` with a broader staged-program ontology.
3. Do not collapse `Value`, `Resource`, and `Host Projection` into one new primitive.
4. Do not treat SSR, hydration, CRDT, OT, or local-first replication as reasons by themselves to redesign the core primitive closure.
5. Do continue tightening `Action Algebra`, `Operation Control`, semantic lifecycle entry, resource publication convergence, structural DSL boundaries, and host-boundary contracts.

## Improvement Standard

Any future adjustment should be judged first by `DSL` continuity rather than by runtime elegance alone.

The required standard is:

- when a simple requirement already has a natural simple authoring form, later complexity should extend that form rather than replace it
- runtime unification is good only when it does not destroy author-visible progressive evolution
- internal lowering freedom must not force a worse external `DSL`

## Improvement Track 1: `Capability` Versus `Action Algebra`

### Problem

The top-level model already distinguishes authority from orchestration, but the follow-up design should make that split operationally sharper in docs, types, and runtime behavior.

Without that tightening, action growth risks being misread as primitive inflation.

### Design

Keep the split strict:

- `Capability` answers authority lookup and targeting only
- `Action Algebra` answers graph composition, branching, aggregation, result classification, and chain control

Authoring should remain progressive:

1. single-step dispatch
2. guarded dispatch through `when`
3. success continuation through `then`
4. failure continuation through `onError`
5. aggregate fan-out through `parallel`

Execution semantics should still be defined as `DAG`-shaped even when authoring remains simple.

### Required Convergence

1. Keep `Capability` resolution semantics in `docs/architecture/frontend-programming-model.md` and `docs/architecture/action-scope-and-imports.md` focused on built-in, instance, and lexical authority lookup only.
2. Keep graph execution rules in `Action Algebra` documents and runtime code, not in capability lookup rules.
3. State explicitly that the action execution graph is compiler-assembled from nested schema structure and therefore should be treated as structurally acyclic under normal authoring.
4. Push structurally knowable action validation into compile-time contracts instead of relying on executor-time discovery for ordinary shape errors.
5. Standardize `success-class`, `failure-class`, and `neutral-class` as the control-flow baseline.
6. Standardize reserved chained-result names `result`, `error`, and `prevResult` for branch evaluation.
7. Standardize parent/child `onError` isolation: a child failure inside `onError` must not recursively retrigger the parent branch.
8. Standardize framework fallback only when no explicit failure branch handles the result.

### Explicit Non-Adoptions From The Formal Spec

The action formal-spec document contains useful material, but not every detail should be promoted into the top-level programming-model follow-up.

The following points are intentionally not adopted here as top-level convergence requirements yet:

- a fixed global action-priority ladder across semantic lifecycle, user interaction, reactions, resources, and background sync
- a mandatory priority-queue scheduler wording beyond the existing settled-update and reaction-order rules
- fixed numeric cascade thresholds such as one universal default limit of `100`

Those may become narrower runtime or executor contracts later, but they are not yet stable enough to be promoted into the programming-model baseline.

### Affected Documents

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/action-algebra-formal-spec.md`

## Improvement Track 2: `Operation Control` Above `ApiSchema`

### Problem

The architecture direction is correct, but the carrier and precedence rules still need a cleaner convergence target.

The main risk is letting declarative request schema absorb more and more execution-control fields just because request-backed consumers are common.

### Design

Keep the three-layer split explicit:

1. `ApiSchema` = declarative transport and adaptor contract
2. `Operation Control` = timeout, cancellation, debounce, throttle, retry, dedup, tracing, and concurrency coordination
3. consumer-specific policy = action branching, resource polling, merge strategy, stale policy, form duplicate-submit rules, and similar higher-layer semantics

Also keep the naming split explicit:

- `ApiSchema` = declarative schema authoring contract
- `ExecutableApiRequest` = runtime-canonical request passed to the fetch layer

### Required Convergence

1. Do not treat `ApiSchema` as the generic home for every execution-control concern.
2. Allow different author-visible carriers during convergence, but require each narrower contract to define precedence explicitly.
3. Move toward one shared runtime execution substrate for request-backed resource producers and action execution where appropriate.
4. Keep authoring surfaces distinct even when the substrate is shared.

### Recommended Runtime Shape

The runtime may converge toward one internal operation descriptor along the following lines:

```ts
interface OperationDescriptor {
  kind: 'action' | 'resource';
  transport?: ApiSchema;
  control?: OperationControlConfig;
  consumerPolicy?: Record<string, unknown>;
}
```

This is an implementation direction, not a new schema primitive.

## Improvement Track 2A: `Source` And `data-source` Convergence

### Problem

The earlier follow-up text clarified named versus anonymous dynamic values, but later discussion rounds converged further: anonymous execution-backed values should reuse action execution shape rather than grow a second unrelated DSL.

### Design

Keep three levels explicit:

1. plain `${expr}` remains the synchronous value form
2. `type: 'source'` is the anonymous action-based value producer form
3. `type: 'data-source'` is the named and scheduled extension of source

This keeps the field-value triad explicit while still unifying execution-backed producers around action-shaped execution contracts.

### Required Convergence

1. document field values as `staticValue | exprValue | sourceValue`
2. allow `type: 'source'` to reuse `action`, `args`, `api`, `control`, and action-graph fields when producing a value
3. treat `data-source` as the named publication and scheduling extension above source
4. preserve one root action object at event entry even if runtime convenience APIs continue to accept lists internally

### Affected Documents

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/api-data-source.md`
- `docs/architecture/action-scope-and-imports.md`

## Improvement Track 3: Semantic Lifecycle Entry

### Problem

The top-level model correctly recognizes semantic lifecycle entry as a derived runtime system, but author-visible ownership of lifecycle-shaped business flows still needs a clearer schema contract.

The core problem is not whether buttons can trigger actions. They can.

The real problem is that `form` submit, page enter, dialog open, validation failure, and success/error follow-up are semantic node boundaries and should not be modeled only as scattered UI event payloads.

### Design

Node-owned lifecycle entry should be explicit.

Recommended shape:

```json
{
  "type": "form",
  "id": "shipping-form",
  "initAction": {
    "action": "refreshSource",
    "targetId": "countries"
  },
  "submitAction": {
    "action": "ajax",
    "api": {
      "url": "/api/shipping/submit",
      "method": "post",
      "data": "${$form.values}"
    }
  },
  "onSubmitSuccess": [
    {
      "action": "navigate",
      "args": {
        "to": "/confirmation"
      }
    }
  ],
  "onSubmitError": [
    {
      "action": "showToast",
      "args": {
        "level": "error",
        "message": "${error.message}"
      }
    }
  ]
}
```

UI triggers remain thin:

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

### Required Convergence

1. `form`, `page`, `dialog`, and future semantic host nodes should own their lifecycle-shaped business entry points.
2. Button, keybinding, toolbar, and host shell triggers should dispatch those semantic entries instead of duplicating business pipelines.
3. Validation-before-submit remains part of semantic lifecycle ownership, not button-local scripting.
4. Success and error branches following semantic actions should align with `Action Algebra` result-class semantics.

### Affected Documents

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/action-scope-and-imports.md`

## Improvement Track 4: `Resource` Publication Convergence

### Problem

The direction has already improved substantially, but the remaining compatibility-era mix of `id`, `name`, `dataPath`, and publication targeting still needs an explicit end-state.

### Design

The normal authoring path is:

- `name` as the preferred identity
- `name` as the default publication path
- `mergeToScope: true` as the only narrowed special publish extension

`dataPath` remains compatibility-only.

### Required Convergence

1. New schema should use `name` as the normal path.
2. `dataPath` should not remain a general-purpose publication mechanism in new design guidance.
3. `mergeToScope: true` is the only normative special publish case beyond the named path.
4. `mergeToScope: true` means extra shallow projection into the current scope, not a second independently writable business root.
5. `statusPath` remains the preferred readonly status-summary surface when producer status is schema-visible.
6. Runtime targeting may continue to use legacy `id` during convergence, but docs and future authoring should point toward `name`-first identity.

### Why This Direction Stays Progressive

It preserves the natural path:

1. plain value
2. expression value
3. anonymous dynamic value where only the resulting value matters
4. named `data-source` when refresh, status, reuse, or targeted control becomes necessary

### Affected Documents

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/api-data-source.md`

## Improvement Track 5: `visible`, `when`, `loop`, And `dynamic-renderer`

### Problem

The high-level direction is already correct. What still needs to stay explicit is the author-visible stratification.

### Design

The author-visible baseline remains:

- `visible` = display-level state only
- `when` = activation and lifecycle guard
- `loop` = collection-driven structural expansion
- `dynamic-renderer` = delayed or remote fragment assembly that cannot be expressed as ordinary `when` or `loop`

### Required Convergence

1. Keep `when` as a natural node property in authoring `DSL`.
2. Allow compiler/runtime lowering of `when` to internal wrapper-like machinery without changing author-visible shape.
3. Keep `loop` as a structural node in authoring `DSL`.
4. Keep `dynamic-renderer` narrow; it must not absorb ordinary conditional or looping semantics.
5. Keep `visible` and `when` sharply distinct in lifecycle semantics.

### Naming Rule

`when` should remain the unified guard term across node activation and action-step execution unless a narrower subsystem has a stronger reason to specialize it.

## Improvement Track 6: Host-Boundary Tightening

### Problem

`Host Projection` is correctly kept readonly, but complex multi-surface hosts still need clearer protocol wording so host integration does not backslide into scope-leaked bridge objects or ad hoc mutation bags.

### Design

Keep the host rule strict:

- read through readonly snapshot projection
- write through `Capability`
- keep bridge/controller/protocol objects host-private

For complex editable hosts, strengthen the protocol wording around:

- snapshot replacement
- patch DTO shape
- version feed and stale-update handling
- multi-surface boundary and stale-target diagnostics

### Required Convergence

1. `Host Projection` remains readonly snapshot data only.
2. Complex host mutation should continue moving toward explicit DTO command or patch payloads.
3. Patch/version-feed semantics belong to host protocol design, not to new core primitives.
4. Multi-surface runtime boundaries should define scope visibility, instance-target lookup, and disposal behavior explicitly.

### Affected Documents

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/complex-control-host-protocol.md`

## Delivery Priority

The recommended order is:

1. align narrower architecture docs to the top-level `Action Algebra` / `Operation Control` / `Resource` wording
2. standardize semantic lifecycle entry ownership for forms first
3. converge runtime types and executor behavior around branch result context and `onError`
4. converge resource publication and targeting toward `name`-first authoring
5. tighten host-boundary protocol wording where complex hosts still leak compatibility-era assumptions

## Non-Goals

This document does not propose:

- a new primitive category
- a universal workflow primitive replacing `Action Algebra`
- a unified `Binding` primitive replacing `Value`, `Resource`, and `Host Projection`
- a collaboration-first redesign of `Flux` core
- a Node/SSR-first frontend ontology for Nop

## Summary

The correct next move is not to replace the current programming model.

The correct next move is to keep the seven-primitive closure and tighten the systems that sit above it:

- `Action Algebra`
- `Operation Control`
- semantic lifecycle entry
- `Resource` publication convergence
- structural `DSL` boundaries
- host-boundary protocol wording

That is the narrowest improvement path that preserves the current model's strengths while addressing the real remaining ambiguity.