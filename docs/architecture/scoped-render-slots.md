# Scoped Render Slots

## Purpose

This document defines the long-term design for parameterized child fragments in Flux.

Use it when designing:

- render-prop-like component APIs such as `itemRender(row, index)` or `renderEmpty()`
- nested slot scope semantics
- compiler-visible slot parameter contracts
- author-facing slot expressions such as `$slot.item`
- the relationship between `region`, `slot`, child scope creation, and repeated identity

## Position

- `docs/architecture/field-metadata-slot-modeling.md` defines the broader field-semantics baseline (`prop`, `region`, `value-or-region`, `event`).
- `docs/architecture/renderer-runtime.md` defines how `NodeRenderer`, `RenderNodes`, and region handles execute at runtime.
- `docs/architecture/scope-ownership-and-isolation.md` defines lexical inheritance and the rejection of generic `$parentScope`-style escape hatches.
- `docs/architecture/template-instantiation-and-node-identity.md` defines repeated-instance identity and instance-path rules.

This document narrows one specific gap left open by those files: how a compiled child fragment should accept declared local parameters and how nested slot scopes should behave.

## Main Decision

Flux should support scoped render slots as **parameterized regions**, not as raw JavaScript function props.

The long-term baseline is:

1. keep `region` as the runtime/compiler term
2. allow a region field to declare a parameter signature
3. expose those parameters to author expressions through a fixed reserved `$slot` binding
4. model nested slot scopes as lexical slot frames with an explicit slot-parent chain
5. do not flatten slot parameters into normal top-level scope names
6. do not support renaming the `$slot` root binding

In short:

```text
author-facing concept: scoped slot
runtime/compiler concept: parameterized region
expression access: $slot.xxx
```

## Why This Is Needed

Today the runtime already supports region rendering with local `data` injection.

Example current pattern:

```tsx
const rowScope = helpers.createScope({ record, index }, { isolate: true });
cellRegion.render({ scope: rowScope });
```

This is already enough to adapt many third-party render-prop APIs.

The gap is that the parameter contract is still implicit and renderer-local:

- the compiler does not know which names the region expects
- IDE and diagnostics cannot treat those names as declared slot bindings
- nested slot access rules are undocumented and inconsistent
- authors must rely on renderer-specific conventions like `record` or `row`

The design goal is to move that contract from runtime convention into renderer metadata.

## Keep `region`, Do Not Rename It To `slot`

The project should not rename the core runtime term `region` to `slot`.

Reasoning:

- `region` is the better compiler/runtime term for a precompiled child fragment channel
- `slot` is the better author/component term for content insertion semantics
- the repository already uses `data-slot` for DOM structure markers, which is a separate concern
- collapsing all of these into one word would make architecture, tooling, and debugging terminology less precise over time

Recommended terminology split:

- author-facing docs may say `slot` or `scoped slot`
- compiler/runtime contracts should continue to use `region`
- a region with declared params is a `parameterized region`

## Authoring Model

### Schema stays declarative

Raw JSON still declares child schema, not JavaScript callbacks.

Avoid authoring forms such as:

- `renderTitle`
- `itemRender`
- `cellRender`

Prefer one field per concept, owned by renderer metadata.

Example:

```json
{
  "type": "list",
  "items": "${rows}",
  "item": {
    "type": "container",
    "body": [
      { "type": "text", "text": "${$slot.item.name}" },
      { "type": "text", "text": "${$slot.index}" }
    ]
  }
}
```

### Slot parameters are not top-level scope names

Do not inject slot parameters into the ordinary lexical top level as bare names like:

- `item`
- `index`
- `row`
- `value`

Authors should instead access slot arguments through the reserved slot frame object:

- `$slot.item`
- `$slot.index`
- `$slot.row`

This avoids collisions with ordinary business data and keeps slot-local data clearly visible in expressions.

## Renderer Metadata Contract

Scoped slots should extend the existing `region` field contract rather than introduce a parallel top-level concept.

Recommended direction:

```ts
interface RegionFieldRule {
  key: string;
  kind: 'region';
  params?: readonly string[];
  isolate?: boolean;
}
```

Example:

```ts
{
  key: 'item',
  kind: 'region',
  params: ['item', 'index'],
  isolate: false
}
```

Meaning:

- the field still compiles as a normal region topology entry
- the region additionally declares a local parameter signature
- when rendered with local data, that data is exposed under `$slot`
- `isolate` controls whether the created slot child scope inherits parent lexical visibility

### Why extend `region` instead of introducing `kind: 'slot'`

The long-term design should prefer `region + params`.

Reasoning:

- a no-arg slot is just a normal region
- region topology, rendering, and identity already exist
- adding a parallel `slot` kind would duplicate concepts without adding runtime value
- the real architectural distinction is not region versus slot; it is unparameterized versus parameterized region

## Compiled Model

Compiled regions should carry their declared parameter metadata.

Recommended shape:

```ts
interface CompiledRegion {
  key: string;
  path: string;
  node: TemplateNode | readonly TemplateNode[] | null;
  params?: readonly string[];
  isolate?: boolean;
}
```

Compiler responsibilities:

1. preserve the region structure exactly as today
2. record declared `params` and `isolate` metadata on the compiled region
3. make that metadata available to expression analysis for the region subtree
4. reject or warn on invalid duplicate param names within one region signature

The important shift is that region parameter names become compiler-visible architecture, not renderer-local folklore.

## Expression Model

### Fixed reserved root: `$slot`

The current slot frame must always be exposed as `$slot`.

Do not support:

- renaming `$slot`
- flattening slot args into ordinary lexical root fields
- per-slot custom root names such as `$rowSlot` or `$cellScope`

Reasoning:

- one stable root gives the best authoring consistency
- tooling can always recognize slot-local bindings
- debugger output remains predictable
- nested behavior stays simple

### Current slot frame

If a region declares:

```ts
params: ['item', 'index']
```

and the renderer calls:

```tsx
props.regions.item?.render({
  data: { item, index }
});
```

then expressions inside that rendered region should see:

```text
$slot.item
$slot.index
```

The slot frame object should be a reserved runtime binding, not a business-data object that authors can redefine.

### Nested slot scopes

Nested slot scopes should use lexical shadowing.

Rule:

- the innermost active slot frame is always `$slot`
- if another slot is rendered inside it, that inner slot becomes the new `$slot`
- outer slot frames remain available through a slot-parent chain

Recommended access model:

- current slot: `$slot`
- parent slot frame: `$slot.$parent`
- grandparent slot frame: `$slot.$parent.$parent`

Example:

```text
$slot.cell
$slot.column
$slot.$parent.row
$slot.$parent.rowIndex
```

This is intentionally narrower than a generic `$parentScope` feature. It exposes only slot-frame ancestry, not arbitrary lexical scope internals.

### Reserved fields on slot frames

Slot-frame metadata should reserve `$`-prefixed names so user-declared params cannot collide with them.

Recommended reserved names:

- `$parent`
- `$name`
- `$key`
- `$depth`

Do not allow renderer metadata to declare params using these reserved names.

## Runtime Execution Model

The design should reuse the current region render path.

Recommended behavior:

1. renderer calls `region.render(...)`
2. if no local slot data is provided, execution behaves like an ordinary region render
3. if local slot data is provided, runtime creates a child scope
4. that child scope publishes a reserved `$slot` frame object containing the declared param bindings
5. the region subtree renders under that child scope

Important point:

- this does not require a second rendering system
- it is an extension of the current `render({ data })` child-scope path

Illustrative runtime shape:

```ts
region.render({
  data: {
    $slot: {
      item,
      index,
      $parent: previousSlotFrame
    }
  }
});
```

Whether the internal implementation stores a literal `$slot` object or a narrower slot-frame carrier is an implementation detail. The architectural contract is the visible expression model and scope behavior.

## Scope And Isolation Rules

Scoped render slots follow the same general scope baseline as the rest of the runtime:

- default is lexical inheritance
- local patch shadows parent fields
- `isolate: true` cuts off parent lexical fallback

Recommended slot rule:

- generic UI slots default to `isolate: false`
- high-frequency repeated render slots may opt into `isolate: true`

Examples:

- `renderEmpty()` style slots should usually inherit parent lexical data
- table row or cell slots may choose isolation for performance if their renderer family already depends on isolated repeated scopes

The existence of `$slot.$parent` does not weaken the no-`$parentScope` rule. Slot-parent access is limited to prior slot frames, not arbitrary parent data environments.

## Identity And Repeated Rendering

Parameterized regions do not remove the need for stable repeated identity.

For repeated rendering scenarios such as:

- list rows
- table cells
- tree nodes
- nested repeated item templates

the renderer still needs stable repeated-instance identity through the existing instance-key / instance-path model.

This means:

- `params` describe the binding contract only
- `data` carries the concrete invocation values
- repeated identity still comes from stable keys or repeated-instance frames, not from param names

Do not treat slot params as a replacement for repeated-instance identity.

## Performance Position

This design is compatible with the current performance model.

Expected cost profile:

- no second compilation pass
- no arbitrary JavaScript callback execution inside schema
- reuse of the existing region render path and child-scope creation mechanism
- no need to flatten or merge slot params into a wider root namespace

Potential benefits:

- compiler and tooling can reason about declared slot params explicitly
- diagnostics and editor support can distinguish slot-local reads from normal lexical reads
- isolated repeated slot families can keep their current targeted performance strategies

Important caveat:

- parameterized regions still need stable repeated identity rules for large tables, trees, and other high-frequency repeated structures
- performance comes from region reuse, selective subscriptions, and stable identity, not from whether authors write `item` or `$slot.item`

## What This Design Rejects

### Reject: top-level flattened slot bindings

Do not expose slot params directly as plain scope fields like `item` or `index`.

Reasons:

- collisions with normal business data
- ambiguous nested-slot behavior
- debugger/tooling cannot distinguish slot args from ordinary scope fields
- pressures the system toward aliasing and rename features that solve avoidable ambiguity

### Reject: renaming the `$slot` root

Do not support `xui:slotVar`, `slotRoot`, or similar root-renaming features.

Reasons:

- one concept should have one name in expressions
- nested-slot rules become harder to teach and debug
- tooling cannot assume a stable access path
- the authoring payoff is low once slot-local values are already namespaced under `$slot`

### Reject: parameter renaming as a required feature

Do not treat slot-param aliasing as part of the baseline architecture.

In most cases there is no real need to rename:

- `$slot.item`
- `$slot.index`
- `$slot.row`
- `$slot.column`

are already explicit and non-conflicting.

If future evidence shows a narrow authoring need for aliases, it should be evaluated as optional sugar on top of the fixed `$slot` model, not as part of the core slot contract.

### Reject: generic parent-scope escape hatches

Do not use slot design as a back door for:

- `$parentScope`
- `$ancestorScope(n)`
- arbitrary lexical-environment introspection

Nested slot access is limited to slot-frame ancestry only.

## Example Patterns

### Example 1: Empty slot

Definition:

```ts
{ key: 'empty', kind: 'region' }
```

Renderer:

```tsx
<List renderEmpty={() => props.regions.empty?.render()} />
```

This is a normal region used as a callback-shaped slot adapter.

### Example 2: Item slot

Definition:

```ts
{ key: 'item', kind: 'region', params: ['item', 'index'] }
```

Renderer:

```tsx
const itemRender = (item: Row, index: number) =>
  props.regions.item?.render({
    data: { item, index },
    scopeKey: `item:${item.id ?? index}`
  });
```

Author expression:

```text
${$slot.item.name}
${$slot.index}
```

### Example 3: Nested cell slot inside row slot

Outer row slot expression context:

```text
$slot.row
$slot.rowIndex
```

Inner cell slot expression context:

```text
$slot.cell
$slot.column
$slot.$parent.row
$slot.$parent.rowIndex
```

This is the intended nested-slot baseline.

## Migration Direction

The migration path should be incremental.

1. document the scoped-slot contract first
2. extend renderer field metadata so regions may declare `params`
3. preserve current runtime region rendering behavior
4. add `$slot` frame publication to child-scope creation for parameterized region renders
5. update selected renderer families such as table/list/tree adapters to stop relying on undocumented bare-name conventions
6. add diagnostics and tooling support once the contract is stable in code

This keeps the existing runtime substrate and changes only the missing metadata and expression contract.

## Final Rule

For the long-term Flux architecture:

- keep `region` as the runtime term
- model scoped slots as parameterized regions
- surface slot args under fixed `$slot.xxx` access
- use `$slot.$parent` for nested slot ancestry
- avoid root renaming, top-level flattening, and generic parent-scope escape hatches

That baseline is the smallest design that stays declarative, compiler-visible, nested-slot-safe, and compatible with the current runtime/performance model.

## Related Documents

- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/scope-ownership-and-isolation.md`
- `docs/architecture/template-instantiation-and-node-identity.md`
