# Field Metadata and Slot Modeling

## Purpose

This document defines how schema fields should be interpreted when a renderer needs a mix of plain values, renderable child fragments, and adapter-only function props.

Use this document when designing renderer definitions, schema DSL fields such as `title` or `empty`, or low-code support for component slots and render props.

## Current Code Anchors

When this document needs to be checked against code, start with:

- `packages/flux-core/src/index.ts` for `SchemaFieldRule` and renderer contracts
- `packages/flux-compiler/src/schema-compiler.ts` for field classification and region extraction
- `packages/flux-react/src/index.tsx` for slot-resolution helpers
- renderer package definitions such as `packages/flux-renderers-basic/src/index.tsx` and `packages/flux-renderers-data/src/index.tsx`

## Main Decision

Field behavior should be defined by renderer field metadata, not by ad hoc renderer guesses and not by hard-coded global field-name rules.

That means:

- schema authors describe intent with schema fields
- renderer definitions declare how each field is interpreted
- the schema compiler applies that field metadata
- renderer components consume normalized results from `props` and `regions`

## Why This Is Needed

Some component APIs need more than plain scalar props.

Examples:

- a `title` may be a plain string
- a `title` may need to render a schema fragment
- a third-party component may require `titleRender: () => ReactNode`
- a list may require `itemRender(item, index)`

These cases should not force raw JSON to contain JavaScript functions.

They also should not force each renderer to guess whether a field is a plain value or a sub-schema.

## Design Rule

### External schema stays declarative

Raw JSON should describe:

- values
- child schema fragments
- actions
- options

Raw JSON should not directly carry runtime function props such as:

- `renderTitle`
- `itemRender`
- `cellRender`

Those function props belong to the renderer adapter layer.

### Renderer metadata defines field semantics

Each renderer definition should declare how a field behaves.

The compiler should then map the raw field into one of the normalized execution channels:

- `meta`
- `props`
- `regions`

### Renderer components only consume normalized outputs

Concrete renderer components should not repeatedly inspect raw schema to decide whether a field is:

- a normal value
- a schema fragment
- a slot

That interpretation belongs in field metadata plus compiler logic.

For field chrome, the exception is intentional and narrow: `BaseSchema.frameWrap` is a schema-level instance override consumed by `NodeRenderer` to refine `RendererDefinition.wrap` without turning field wrapper layout into a normal renderer prop.

## Current Foundation in the Codebase

The current architecture already has the base pieces for this direction:

- `RendererDefinition.fields` in `packages/flux-core/src/index.ts`
- `SchemaFieldRule` in `packages/flux-core/src/index.ts`
- `classifyField()` in `packages/flux-compiler/src/schema-compiler.ts`
- `TemplateRegion` in `packages/flux-core/src/index.ts`
- `RenderRegionHandle` in `packages/flux-core/src/index.ts`

Today the active field rule model already supports:

- `meta`
- `prop`
- `region`
- `value-or-region`
- `event`
- `ignored`

Each `SchemaFieldRule` also supports optional `params?: readonly string[]` (parameter names for scoped slot regions) and `isolate?: boolean` (isolation policy for the region).

That means the repository has already moved beyond the older `meta / prop / region / ignored` split.

What is still evolving is not the existence of `value-or-region` itself, but how broadly and formally renderer metadata should describe more advanced field semantics.

## Recommended Field Semantics Model

Renderer field metadata should evolve to express field semantics more precisely.

Field metadata may also opt specific value fields into anonymous source execution when the field is a value channel that can safely consume `type: 'source'`.

Recommended opt-in flag:

- `allowSource?: boolean`
- `sourceStateKey?: string`

Meaning:

- only fields explicitly marked with `allowSource` may treat `type: 'source'` objects as source carriers
- unmarked `prop` or `value-or-region` fields keep their existing plain-value or region semantics
- this avoids global object-shape guessing and preserves the design rule that renderer metadata owns field interpretation
- when `sourceStateKey` is present, runtime also injects one companion prop carrying transient execution state for that source-enabled field

Recommended transient state shape:

```ts
interface SourceTransientState {
  loading: boolean;
  error: unknown;
  status: 'idle' | 'loading' | 'ready' | 'error';
}
```

This is intended for lightweight renderer chrome such as loading indicators, temporary disabled state, or inline error affordances. It should stay a narrow UI-facing execution summary, not a second full data-source controller API.

Recommended semantic categories:

- `meta`
  - node-level metadata such as visibility or disabled state
- `value`
  - normal compiled runtime value stored in `props`
- `region`
  - nested schema compiled into a `TemplateRegion`
- `value-or-region`
  - field accepts either a plain value or a renderable schema fragment
- `event`
  - event-like field that carries action intent rather than a JavaScript callback
- `ignored`
  - compiler skips the field entirely

The most important addition is `value-or-region`.

## Recommended Compiler Behavior

For each field on a schema node:

1. read the renderer field metadata
2. decide how the field should be interpreted
3. normalize the result into either `props` or `regions`

Recommended behavior by field semantic:

- `meta`
  - compile into node meta handling
- `value`
  - include in `propSource`
  - compile through the normal value-tree compiler
  - if the field also sets `allowSource`, runtime may execute `type: 'source'` carriers for that prop before the renderer receives `props`
  - if `sourceStateKey` is also present, runtime injects a transient state prop alongside the resolved value prop
- `region`
  - require schema or schema array input
  - compile recursively into a `TemplateRegion`
- `value-or-region`
  - if the raw value is a schema or schema array, compile to `region`
  - otherwise compile as a normal value prop
- `event`
  - preserve declarative action data rather than producing a runtime callback at schema level
  - keep the action description available for renderer-level event handler adaptation

This keeps renderer components simple while still allowing a single JSON field name to support both simple and advanced usage.

## Naming Conventions

Prefer natural business-field names for normal renderer content.

Recommended examples:

- `title`
- `header`
- `footer`
- `item`
- `empty`

These names should not be mechanically expanded into schema-level names such as:

- `titleRegion`
- `headerRegion`
- `footerRegion`

unless a renderer truly needs two distinct concepts with different meanings.

For event-style fields, prefer `onXX` naming.

Recommended examples:

- `onClick`
- `onSubmit`
- `onChange`

Those fields still carry declarative action schemas, not raw JavaScript functions.

Do not force every action-bearing field into `onXX` form.

Recommended naming split:

- user interaction events and generic lifecycle notifications use `onXX`
- owner-controlled semantic pipeline entry points may use `xxxAction`
- post-result follow-up hooks use `onXX`

Recommended examples:

- `onClick`, `onChange`, `onSubmit`, `onMount`, `onUnmount`
- `submitAction`, `initAction`, `transformInAction`, `transformOutAction`, `validateValueAction`
- `onSubmitSuccess`, `onSubmitError`, `onValidateError`

Interpretation rule:

- `onXX` means an event-like entry point or notification hook
- `xxxAction` means the owner's primary semantic action slot for a lifecycle stage, transform stage, or commit pipeline stage

Why this distinction exists:

- `submitAction` is the form owner's main submit pipeline, not merely a post-event callback
- `transformInAction` / `transformOutAction` / `validateValueAction` are owner semantic action slots, not DOM-style events
- forcing those fields into `onXX` names would blur the difference between triggering a pipeline and observing a pipeline outcome

Compiler classification note:

- a field may still be classified as `event` metadata even when its schema name is not `onXX`
- field kind and naming convention are related but not identical concerns

## Schema-Level Function Boundary

Do not expose real function props directly at the schema level.

Avoid schema fields such as:

- `renderTitle`
- `itemRender`
- `footerRender`

If an underlying React component needs function props, the renderer adapter should synthesize them from normalized values, regions, or event definitions.

## JSON-Level Authoring Recommendation

At the JSON layer, prefer one field name per concept.

For example, prefer a single `title` field rather than forcing schema authors to choose between:

- `title`
- `titleRegion`

Recommended authoring rule:

- if `title` is a plain value, treat it as a value prop
- if `title` is a schema object or schema array, treat it as a region

Example using a plain value:

```json
{
  "type": "card",
  "title": "User Profile"
}
```

Example using a renderable schema fragment:

```json
{
  "type": "card",
  "title": {
    "type": "tpl",
    "tpl": "Hello ${user.name}"
  }
}
```

This keeps the schema DSL small while still allowing richer rendering behavior.

## Internal Normalization Rule

Even if JSON uses a single field name such as `title`, compiled output should still normalize into separate channels.

Recommended normalization:

- plain-value `title` ends up in `props.title`
- schema `title` ends up in `regions.title`

That means renderer components can use one consistent read pattern:

```tsx
const titleContent = props.regions.title?.render() ?? props.props.title;
```

This is the key simplification:

- JSON stays simple
- compiler handles interpretation
- renderer sees normalized structure

## Render Prop Strategy

If a third-party React component requires a function prop such as `titleRender`, `itemRender`, or `emptyRender`, that function should be created inside the renderer adapter layer.

It should not come directly from raw JSON.

Example:

```tsx
const titleRender = props.regions.title ? () => props.regions.title.render() : undefined;
```

For repeated fragment rendering with local data, use region handles with local render options.

Example:

```tsx
const itemRender = (item: unknown, index: number) =>
  props.regions.item?.render({
    bindings: { item, index },
  });
```

Preferred contract:

- `render({ bindings, instancePath })` is the normative region-render API
- `scopeKey` is an advanced/internal child-scope reuse hint when a renderer truly needs it; it is not the primary public repeated-rendering contract

This preserves:

- declarative schema authoring
- compile-time structure extraction
- runtime scope consistency
- renderer-level adaptation to third-party APIs

## Deep Region Extraction Pattern

Some fields are not top-level node fields but nested renderer-owned structures.

Example: `table.columns[]`.

In these cases, the compiler may still normalize selected nested fields into compiled regions as long as:

- the extraction rule is renderer-owned and explicit
- the compiler rewrites the nested config into a stable handle key such as `labelRegionKey`
- the renderer consumes the rewritten config instead of guessing from raw nested schema

Current concrete pattern:

- `table.columns[].label` -> `columns.N.label` region
- `table.columns[].buttons` -> `columns.N.buttons` region
- `table.columns[].cell` -> `columns.N.cell` region

Recommended compiled result shape:

- extracted nested schema is removed from the plain nested config
- the nested config receives a reference key such as:
  - `labelRegionKey`
  - `buttonsRegionKey`
  - `cellRegionKey`
- the actual compiled fragment lives in `node.regions`

This preserves the same core rule used for top-level fields:

- raw schema stays declarative
- compiler owns interpretation and extraction
- renderer consumes normalized structure

This pattern is especially useful for table, list, tree, and card-grid style renderers where repeated nested definitions need row/item-local scope.

Implementation guidance:

- do not bake each nested field extraction into unrelated renderer code paths
- prefer a small compiler helper that accepts:
  - the nested object
  - the nested path/key prefix
  - the list of extractable nested fields
- let that helper rewrite nested config into stable `...RegionKey` references

When a renderer owns multiple nested structures, prefer a renderer-level deep-normalization registry keyed by field name.

Example direction:

- `table.columns` -> nested region extraction normalizer
- future `list.items` -> nested render-fragment normalizer

This keeps deep extraction scalable when more renderer-owned nested structures appear later.

## Recommended Renderer Patterns

### Pattern 1: plain prop only

Use when a field is always a value.

Examples:

- `placeholder`
- `pageSize`
- `api`

### Pattern 2: region only

Use when a field is always a child fragment.

Examples:

- `body`
- `actions`
- `header`
- `footer`

### Pattern 3: value-or-region

Use when a field should support both a simple value form and an advanced fragment form.

Examples:

- `title`
- `empty`
- `label`

### Pattern 4: render-prop adapter

Use when the underlying component API requires a function prop.

Examples:

- `titleRender`
- `itemRender`
- `cellRender`

In this case the function should be synthesized from normalized `props` or `regions`.

### Pattern 5: event field

Use when a field represents an event response contract rather than render content.

Examples:

- `onClick`
- `onSubmit`
- `onChange`

In this case the schema value should remain an action schema or action list, and the renderer should adapt it into the real callback expected by the concrete component.

## Example: `title`

Recommended renderer metadata intent:

- `title` supports `value-or-region`
- region key is also `title`

Behavior:

- `title: "User Profile"` becomes `props.title`
- `title: { ...schema... }` becomes `regions.title`

Renderer usage:

```tsx
function CardRenderer(props: RendererComponentProps) {
  const titleContent = props.regions.title?.render() ?? props.props.title;

  return <Card title={titleContent}>{props.regions.body?.render()}</Card>;
}
```

If the component needs a function prop:

```tsx
function CardRenderer(props: RendererComponentProps) {
  const titleRender = props.regions.title ? () => props.regions.title.render() : undefined;

  return <ThirdPartyCard title={props.props.title} titleRender={titleRender} />;
}
```

## Benefits

This design gives the system several advantages:

- schema authors keep a small, intuitive field vocabulary
- renderer definitions explicitly own field semantics
- the compiler becomes the single normalization point
- renderer components stay simple and predictable
- third-party React APIs with render props remain supportable
- slots and nested fragments still use the compiled-region path

## Recommended End-to-End Flow

The ideal processing flow is:

1. read field metadata from the renderer definition
2. classify each raw schema field by metadata
3. normalize each field into the correct runtime channel
4. let the renderer consume only normalized outputs

Recommended normalization targets:

- `value` -> `props`
- `region` -> `regions`
- `value-or-region` -> automatic split into `props` or `regions`
- `event` -> declarative action data retained for callback adaptation

The renderer should then consume only standardized inputs rather than raw schema guessing.

For source-enabled value fields, the same rule still applies:

- schema author writes one field such as `options` or `text`
- renderer metadata declares that field as `allowSource`
- renderer metadata may additionally declare a companion transient-state prop such as `optionsSourceState`
- compile/runtime records that opt-in metadata once
- React resolves the source-backed value before the concrete renderer sees `props`

This keeps source execution as a field-level contract, not a renderer-local hook workaround and not a repo-wide magic object interpretation rule.

## Non-Goals

This design does not mean:

- every field in the system should support `value-or-region`
- raw JSON should allow arbitrary JavaScript functions
- renderer components should receive raw, unclassified schema and decide everything themselves

Use `value-or-region` sparingly and only for fields where the authoring payoff is real.

## Recommended Next Step

The next architectural improvement is to keep extending renderer field metadata so richer slot and adapter semantics can be described consistently without pushing renderer-local guessing back into component code.

That change should be implemented in:

- `packages/flux-core/src/index.ts`
- `packages/flux-compiler/src/schema-compiler.ts`

## Related Documents

- `docs/references/terminology.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/scoped-render-slots.md`
