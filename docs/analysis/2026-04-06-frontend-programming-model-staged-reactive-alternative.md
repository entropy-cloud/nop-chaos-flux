# Frontend Programming Model Alternative Reassessment

## Status

This file remains an analysis document, not the active normative baseline.

It originally proposed a broad staged-reactive replacement for `docs/architecture/frontend-programming-model.md`.

After the follow-up discussion recorded in `docs/discussions/2026-04-06-programming-model-optimality-critique.md`, that broad replacement proposal is no longer considered appropriate for Nop's clarified architecture.

This document is therefore rewritten as a reassessment memo:

- what the earlier alternative got right
- what later discussion showed was too broad or misframed
- which narrow improvements are still worth carrying forward

## Why The Original Alternative Is No Longer A Good Replacement Baseline

The original proposal overreached in four ways.

### 1. It was too frontend-centric for Nop's actual architecture

Nop is not a generic browser-first or Node/SSR-first low-code runtime.

Its real baseline is:

- Java backend
- Java-side loader and structural assembly
- XML/JSON conversion before frontend execution
- policy trimming, i18n, inheritance, and profile expansion before Flux runtime execution

Under that architecture, `Flux` is better understood as a final-model runtime than as a broader staged program VM.

So replacing `Final Execution Schema` with a new `Compiled Program` top-level ontology is not the right move here.

### 2. It collapsed too much DSL-visible distinction into one `Binding` concept

The original proposal tried to replace `Value` / `Resource` / `Host Projection` with a single `Binding` primitive.

That now looks wrong for Nop because the more important standard is not maximum runtime unification. The more important standard is DSL-level progressive evolution.

The DSL should preserve a stable path from simple to complex:

1. static value
2. expression value
3. anonymous dynamic value
4. named dynamic value (`data-source`)

From the component read side, these are all values.

But from the DSL authoring side, the promotion from ordinary value to named dynamic value is meaningful and should remain visible.

So the original `Binding` replacement thesis should be considered withdrawn.

### 3. It gave SSR and hydration too much architectural weight

SSR and hydration still matter, but under Nop's Java-loader architecture they are not the main force that should redesign the frontend primitive model.

They belong more naturally to host integration and deployment strategy than to the primary reason for replacing Flux core concepts.

So the earlier argument that SSR/hydration readiness should strongly drive primitive redesign should be treated as overstated.

### 4. It over-generalized runtime structure under `Composition Boundary`

The earlier proposal tried to gather several runtime structure cases under a new `Composition Boundary` primitive.

The later discussion showed that this is too coarse for the DSL surface.

The more natural authoring stratification is:

- `when` for activation / structural presence guard
- `loop` for collection-driven structural expansion
- `dynamic-renderer` only for genuinely dynamic fragment loading or delayed assembly

Internally, these may share compilation patterns.

But externally they should not be prematurely collapsed into one heavier author-visible abstraction.

## What The Follow-Up Discussion Clarified

The later discussion established the following stronger principles.

### DSL Continuity Matters More Than Runtime Elegance

Architecture should not be judged mainly by whether the runtime ontology is beautifully unified.

It should first be judged by whether DSL semantics evolve progressively from simple to complex without breaking earlier simple forms.

That is now the main evaluation rule.

### `data-source` Is Better Understood As Named Dynamic-Value Registration

The most useful reframing from the alternative discussion is not "everything is a binding".

It is this narrower point:

- components read values without caring about origin
- `data-source` is the named registration form of a dynamic value
- once named, it gains status, error, refresh, targeting, and reuse semantics

That point should survive.

### `name` Should Be The Normal Path

The later discussion narrowed publish semantics considerably:

- `name` is the normal and sufficient path
- `dataPath` should not remain the general-purpose recommended publication mechanism
- the only clearly justified special publish case is object-result merge into the current scope

That special case should be expressed explicitly as:

```json
{
  "type": "data-source",
  "name": "userProfile",
  "mergeToScope": true,
  "api": {
    "url": "/api/profile"
  }
}
```

Meaning:

1. `name` remains the resource identity
2. `${userProfile}` remains the named registered value
3. `mergeToScope: true` additionally shallow-merges object result fields into the current scope
4. this is a special publish behavior, not a second independent authoritative root

### `when` Should Stay A Property In DSL

The earlier alternative leaned too strongly toward explicit structural operators.

The better conclusion is:

- `when` should stay a natural node property in authoring DSL
- internally it may lower to a wrapper-like structural operator
- `visible` and `when` must stay semantically distinct

Recommended semantic split:

- `visible`: visual presence only
- `when`: activation / structural existence / lifecycle participation

### `loop` Should Stay A Structural Node

`loop` carries item scope, index, keying, and collection rendering semantics, so it is more natural as a node than as an ordinary property.

Internally it may still compile to a shared structural operator form.

## Action: The Most Important Surviving Insight

One part of the original alternative remains strongly useful after reassessment: the execution model should be described more explicitly.

But the corrected conclusion is not "replace everything with a general workflow primitive".

The corrected conclusion is:

- action authoring should stay progressive
- action execution semantics should be recognized as a DAG already

## Progressive Action Authoring

The current and near-future authoring shape can remain simple:

1. single action step
2. `when` as execution guard
3. `then` for success continuation
4. `onError` for failure continuation
5. `parallel` for fan-out subbranches

This is already enough for most practical flows.

## DAG Execution Semantics

Even with that simple surface, the execution semantics are already graph-shaped:

- one step is one node
- `when` is a guard on that node
- `then` is a success edge
- `onError` is a failure edge
- `parallel` is a fan-out and join shape
- `parallel` completion may continue into downstream `then`

So the right statement is:

> Flux action authoring can remain progressive and simple while its execution semantics are already a DAG.

This matters because it gives the runtime permission to unify:

- cancellation
- timeout
- retry
- monitoring
- result aggregation
- error propagation

without forcing authors to start from an explicit graph syntax.

## What Still Seems Worth Carrying Forward

The original alternative should not survive as a replacement baseline, but several narrow ideas still look valuable.

### 1. Strengthen `dynamic-renderer` Boundary Wording

`dynamic-renderer` is not wrong.

But its boundary should stay narrow:

- use `when` for conditional activation
- use `loop` for collection expansion
- use `dynamic-renderer` only for genuine dynamic fragment loading or deferred assembly

### 2. Clarify Multi-Surface Runtime Boundaries

The original `Runtime Boundary` idea was too large as a primitive replacement.

But the concern remains valid in narrower form.

Dialogs, portals, embedded runtimes, and multiple visible host trees still need clearer boundary wording for:

- scope visibility
- component-handle targeting
- action-scope resolution
- disposal and stale-target diagnostics

This is still worth documenting, but likely as a narrower extension of the current model rather than as a replacement primitive.

### 3. Clarify Projection Patch/Version Contracts

The current `Host Projection` model should remain readonly.

But the analysis still suggests that the transport contract may need to become clearer about:

- snapshot replacement
- patch feed shape
- version tracking
- ordering and stale-update handling

That should be treated as host protocol clarification, not primitive replacement.

### 4. Share One Operation Execution Substrate

The analysis still supports one important execution insight:

- `Action`
- `data-source` producer execution
- API-backed operations

should share one lower execution substrate where appropriate for:

- timeout
- cancellation
- retry
- dedup
- monitoring
- structured results

But they should not be collapsed into one author-visible DSL form.

## Revised Verdict

The broad staged-reactive replacement proposed earlier should now be considered not suitable as the next baseline for Nop.

The current `docs/architecture/frontend-programming-model.md` direction is closer to the right architecture because it better fits:

- Java-side loader ownership
- final-model runtime positioning
- language-neutral DSL contracts
- progressive authoring semantics

The useful outcome of the alternative exercise is now narrower:

1. clarify promotion from ordinary value to named dynamic value
2. center `data-source` authoring on `name`, with `mergeToScope: true` as the special publish case
3. clarify `when` / `visible` / `loop` / `dynamic-renderer` boundaries
4. explicitly describe action execution as DAG semantics under progressive authoring
5. strengthen multi-surface and host-projection edge contracts where the current docs are still thin

## Related Documents

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/api-data-source.md`
- `docs/architecture/flux-dsl-vm-extensibility.md`
- `docs/discussions/2026-04-06-programming-model-optimality-critique.md`
