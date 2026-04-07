# Table Row Identity And Scope Performance

## Purpose

This document is the canonical architecture note for:

- table row identity
- stable row keys
- repeated row instance identity inside `instancePath`
- row-scope creation and reuse
- row-local invalidation and same-row data access
- hot-path rules for large editable tables

Use it when changing:

- table row materialization
- `rowKey` semantics
- repeated row `instanceKey` behavior
- row-local scope wiring
- how table cell renderers access same-row values
- performance-sensitive table update behavior

## Related Documents

- `docs/architecture/template-instantiation-and-node-identity.md`
- `docs/architecture/dependency-tracking.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/performance-design-requirements.md`
- `docs/architecture/form-validation.md`

## Main Rule

Separate array index addressed values from stable row identity.

- form values, validation state, and array remapping stay index-addressed
- React list keys, repeated instance identity, row-scope reuse, and row-following table UI state stay `rowKey`-addressed
- row-local render invalidation should stop at the row boundary by default, not widen to the whole collection

## Current Code Anchors

When this document needs to be checked against code, start with:

- `packages/flux-renderers-data/src/table-renderer.tsx`
- `packages/flux-react/src/render-nodes.tsx`
- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-react/src/hooks.ts`
- `packages/flux-runtime/src/scope.ts`
- `packages/flux-runtime/src/scope-change.ts`
- `packages/flux-runtime/src/form-runtime-array.ts`

## Why This Split Exists

Tables are both collection renderers and repeated-instance renderers.

Those are different concerns:

- collection semantics care about array ordering, insertion, removal, and validation remapping
- repeated-instance semantics care about which live row instance a cell, button, or expanded fragment belongs to

Treating one moving array index as both the authoritative value path and the stable runtime identity causes avoidable churn during insert, remove, sort, filter, pagination, and reorder operations.

## Core Model

### 1. Value Path Versus Runtime Identity

The architecture must keep these concepts separate:

1. value path
2. runtime row identity

Value paths stay index-addressed:

- `users.0.name`
- `users.1.email`

Runtime identity stays `rowKey`-addressed:

- React list `key`
- repeated `instanceKey`
- row-scope cache key
- row-level component-handle targeting

`index` is a location.

`rowKey` is an identity.

They must not be treated as interchangeable.

### 2. Table Row Entry

Table renderers should normalize source data into an explicit row-entry model before sort, filter, pagination, and render:

```ts
interface TableRowEntry {
  rowKey: string;
  sourceIndex: number;
  record: Record<string, unknown>;
  viewIndex?: number;
}
```

Rules:

- `sourceIndex` is the item's index in the current source array before table-local projection
- `record` is the row object
- `rowKey` is the stable runtime identity
- `viewIndex` is optional display-order metadata and should only be computed when a table feature or row content actually needs visible-order semantics

The renderer should build base entries once, then project those entries through sort, filter, and pagination. It should not recover indices later with `source.indexOf(record)` inside row render loops.

The renderer should reconcile row entries by `rowKey` with O(1) keyed lookup. Repeated linear lookups in the render loop are prohibited on the hot path.

Optional source-level optimization metadata such as row revision or changed-row payloads may be carried alongside row entries when available. The minimal architecture does not require a specific token field, but implementations should prefer stable source-level change markers over repeated ad hoc row comparison work.

### 3. Row Scope Data

Each materialized row gets one row-local scope payload:

```ts
interface TableRowScopeData {
  record: Record<string, unknown>;
  index: number;
  viewIndex?: number;
  rowKey?: string;
}
```

Rules:

- `index` means `sourceIndex`, not visible position
- `record` is the primary same-row data binding
- `viewIndex` is optional and should not be part of the default hot-path row scope unless a visible-order feature actually needs it
- `rowKey` is optional in row scope and should only be exposed when expression ergonomics or debugging need it; repeated identity still belongs to `instancePath`

The default minimal row scope payload is:

```ts
{
  record,
  index,
}
```

### 4. Same-Row Access Model

Row-local expressions and renderers should read same-row values through `record`:

- `${record.name}`
- `${record.status}`
- `${record.total}`

Do not model same-row access through sibling component lookup, DOM lookup, or component-handle lookup.

Table row state is data-first, not component-first.

### 5. Expression Carrier Flexibility

Formula execution is not inherently tied to one full `ScopeRef` object per row.

The formula layer can already execute against:

- a `ScopeRef`
- a custom `EvalContext`
- a plain object that can be adapted into an `EvalContext`

That means row-local data transport may be implemented more flexibly than "always create one more composite scope".

Current baseline:

- reactive row fragments and renderer hooks still assume `ScopeRef`
- the current React renderer path therefore uses row scopes as the baseline carrier

Future optimization direction:

- pure-display tables or other tightly constrained row renderers may use lighter row-local evaluation carriers or extra row-local parameters instead of full inherited child scopes, as long as they preserve the same row-local binding contract

This flexibility should be used to reduce unnecessary scope count, not to introduce parallel competing row-state models.

## Stable Row Key

### Authoring Contract

Table renderers should expose an explicit `rowKey?: string` schema field that names the record field or field path used as the stable row identity.

Editable tables, or any table that must preserve row-local continuity across save/remap, must specify `schema.rowKey`. Compatibility fallbacks are not the normative editable baseline for those tables.

Recommended editable baseline:

- resolve identity from a stable client-owned field such as `__rowKey`
- hydrate that field for persisted rows when data enters the table owner when the incoming source only has server `id`
- keep that field stable when a later save introduces or changes server `id`

Examples:

- `rowKey: 'id'`
- `rowKey: '__rowKey'`

### Resolution Rules

Normative editable baseline:

1. explicit `schema.rowKey`
2. development warning plus compatibility fallback only for legacy or read-only tables

Compatibility fallback order:

1. `record.__rowKey`
2. `record.id`
3. development warning plus last-resort compatibility fallback only while migrating older data

The compatibility fallback is not the normative editable architecture.

Save-time continuity rule:

- if a row first materializes with a generated key such as `__rowKey`, later arrival of `id` must not silently promote the active live row identity from `__rowKey` to `id`
- identity promotion requires an explicit owner-defined alias/remap policy; otherwise the generated key stays authoritative for that logical row until it leaves the collection

### Key Rules

- `rowKey` must be stable for the lifetime of the row
- `rowKey` must not be derived from the current array index
- `rowKey` may originate from string or number source values, but runtime must normalize it to a stable string token before using it as React `key`, `instanceKey`, or scope-id fragment
- `null`, `undefined`, and empty string are invalid `rowKey` values
- duplicate `rowKey` values are invalid and must surface development diagnostics; conflicting rows must not silently share reused scopes, repeated identity, or row-local table UI state
- changing `rowKey` is semantically delete plus insert, not in-place update
- unsaved client-side rows should receive and retain a generated hidden key such as `__rowKey` until the logical row leaves the collection or an explicit remap policy runs

## Repeated Instance Identity

`instancePath` stays responsible for repeated-instance identity, not row-local data transport.

For table rows the row frame appended to the absolute `instancePath` should be:

```ts
[
  {
    repeatedTemplateId: '<compiled-table-row-boundary-id>',
    instanceKey: rowKey
  }
]
```

Rules:

- `repeatedTemplateId` must come from the compiled repeated boundary for that table row template, not from a hardcoded renderer-type literal such as `table.row`
- if the table itself is rendered inside another repeated owner, append the row frame to the existing absolute `instancePath`; do not restart repeated identity at the row
- React local row `key` may use `rowKey` inside one table instance, but any runtime identity or cache key that escapes that local row list must also be qualified by the owning table instance
- React `key`, row `instanceKey`, row-scope cache key, and row-following table UI state should all resolve from the same `rowKey` once owner qualification is applied where required
- `instancePath` exists to answer "which repeated live instance is this?"
- `instancePath` is not the primary update-granularity mechanism

This keeps repeated-instance identity aligned with `docs/architecture/template-instantiation-and-node-identity.md` without overloading it with row-state responsibilities.

## Table-Owned Row-Local UI State

Selection, expansion, inline edit mode, draft badges, measurement caches, and similar row-following table UI state should be keyed by `rowKey`, not `sourceIndex`.

Rules:

- if a piece of table-owned UI state should follow the logical row across reorder, filter, pagination, save, or rematerialization, key it by `rowKey`
- use `sourceIndex` only for source-array addressing or other transient position semantics
- duplicate or invalid `rowKey` values must disable safe reuse for that conflicting turn rather than aliasing two rows onto one row-state bucket

## Row Scope Lifecycle

### One Scope Per Materialized Row

Each visible row should have exactly one row scope.

That scope is shared by:

- cell fragments
- button fragments
- expanded row fragments
- row-level events

There should not be separate child scopes per cell by default.

### Stable Reuse

Table renderers should cache row scopes by `rowKey` and reuse them while that row remains materialized.

Do not recreate `ScopeRef` objects on every parent render.

Do not derive scope identity from `sourceIndex`.

This cache is renderer-owned. It is not a new generic runtime scope registry.

### Required Reconciliation Algorithm

The row-scope reuse mechanism must define explicit ownership and eviction rules.

Preferred React implementation:

- render a memoized row component keyed by `rowKey`
- let that row component own one row scope for its materialized lifetime
- localize row synchronization and cleanup to that row component instead of sweeping all rows from one table-level effect
- when an existing row payload changes, synchronize that row scope in a pre-paint lifecycle such as `useLayoutEffect`; at most one extra rerender of that changed row is acceptable, but sibling rows must not rerender just because one row changed

Allowed alternative:

- keep a renderer-local keyed cache such as `Map<rowKey, ScopeRef>`
- use an equivalent row-scope pool keyed by `rowKey`

In either implementation, the reuse rules below are required.

Required baseline:

1. build visible row entries with stable `rowKey`
2. keep one stable row-scope owner per materialized `rowKey`
3. for each visible entry:
   - reuse the existing row scope when present
   - otherwise create one new row scope and cache it
4. compare the next row payload against `scope.readOwn()`
5. publish only the changed row-local roots
6. after reconciliation or unmount, remove row scopes whose `rowKey` is no longer materialized

No publication fast path:

- if the reconciled row keeps the same semantic row payload, the renderer must not republish the row scope
- identical `record` reference plus identical required row-local bindings is one valid fast path, but implementations must not assume referential equality is the only practical source of row stability
- when upstream data routinely recreates row objects, prefer stable row change markers such as revision counters, explicit changed-row payloads, or other source-owned row-dirty signals over deep ad hoc comparison on the hot path
- if optional fields such as `viewIndex` or `rowKey` are not exposed, they must not participate in publication or equality checks

Disposal rule:

- evict the row scope when its `rowKey` is no longer materialized in the current table render output
- do not retain hidden-page or filtered-out row scopes by default

React note:

- if an implementation synchronizes an existing row scope after render, it should do so in a pre-paint phase so descendants do not visibly commit stale row data
- one extra rerender of the changed row caused by that pre-paint synchronization is acceptable; mutating shared row-scope state during render to avoid that rerender is not

Render-phase rule:

- do not mutate external row-scope caches, publish row-scope changes, or evict row scopes as a render-phase side effect
- row-scope synchronization and eviction belong either to a commit/pre-paint lifecycle owned by the row instance or to an explicit owner-controlled reconciliation step before render

This algorithm is required because the current runtime only offers fresh child-scope creation and generic scope stores; keyed row-scope reuse is a table-owned lifecycle, not an automatic runtime behavior.

### Reconciliation Turn And Batching

One collection update turn should reconcile rows as one coherent turn.

Required rules:

- derive added, removed, and changed rows before publishing row-scope updates when practical
- do not intentionally spread one source update across many avoidable async ticks, one per row
- if the owner layer offers explicit batch semantics, use them for bulk row publication and eviction

The architecture does not require a single specific batching primitive today, but it does require that collection-to-row reconciliation remain deterministic and avoid avoidable per-row turn fragmentation.

### Scope Identity

The scope should have a stable id derived from `rowKey` and the full owning table identity, not from the moving source index.

Row scope ids must also be namespaced by the owning table instance, including the table's own repeated-instance path when the table can appear inside another repeated owner.

Good examples:

- `table:${tableTemplateNodeId}:${serializedTableInstancePath ?? 'root'}:row:${rowKey}`
- another equivalent owner-qualified form derived from the full owning table locator

- optional debug path suffix derived from `rowKey`

Bad example:

- `pathSuffix: rows.${index}` as the canonical scope identity
- `table:${tableTemplateNodeId}:row:${rowKey}` when the same table template can materialize under multiple repeated parents
- `scopeKey: row:${rowKey}` when multiple table instances may materialize the same `rowKey`

Index-based path suffixes are acceptable only as transient compatibility data, not as the canonical row-scope identity.

`scope.path` is diagnostic and trace-oriented. It must not become a second semantic identity model parallel to `rowKey` and `instancePath`.

### Materialization Boundary

Row scopes only need to exist for materialized rows.

Default rule:

- create scope when the row becomes materialized
- reuse scope while the row stays materialized
- release scope when the row is no longer materialized

The table architecture does not require retaining row scopes for hidden pages or filtered-out rows.

### Rematerialization Semantics

Row scope is a materialization-local carrier, not durable row storage.

What survives row rematerialization:

- source data, because it lives in the collection owner or form runtime
- form-owned validation, dirty, touched, visited, and related field state, because those remain index-addressed in the form runtime

What does not survive by default:

- row-scope-local transient data that is not reconstructible from the source data
- DOM focus and uncontrolled component-local UI state once the row subtree is unmounted
- row-owned resources or reactions whose lifetime is tied to the materialized subtree

If a future virtualization or retention subsystem needs hidden rows to preserve more state than this baseline, that subsystem must explicitly define retained-versus-disposed semantics instead of assuming row-scope caches provide durable retention implicitly.

### Virtualization Compatibility

This document does not require virtualization as the baseline table implementation.

It is compatible with virtualization.

If a table introduces a materialization window, the same rules still apply:

- only materialized rows need live row scopes
- `rowKey` remains the stable row identity
- `instancePath` semantics do not change
- the implementation must explicitly define whether offscreen rows are disposed or retained

Window size, overscan policy, and retained-offscreen behavior are implementation choices, not hidden side effects of the row identity model.

### Parent Fan-Out And `isolate`

Row scopes may be isolated or non-isolated.

In the current runtime that also means:

- the row scope subscribes to both its own store and its parent store
- parent changes still fan out callbacks to all materialized row descendants even when dependency gating prevents most rerenders

Baseline rule:

- materialized row scopes should be isolated by default
- the row-scope owner must require an explicit opt-out when lexical fallback to parent bindings is needed; performance-sensitive tables must not make non-isolated row scopes the silent default
- the concrete opt-out may be a schema field or renderer-owned option, but it must be local and explicit

Use non-isolated row scopes only when:

- row descendants intentionally read parent lexical bindings
- row-scoped actions need parent lexical fallback
- another table feature requires inherited bindings that are not copied into the row-local carrier

When opting out:

- treat parent fan-out as a deliberate cost
- keep row descendants' reads narrow so the extra callback fan-out does not widen into avoidable rerenders

## Row-Local Invalidation

### Default Granularity

The default invalidation unit for table content is the row.

That means:

- collection-level consumers depend on the collection binding
- row-local consumers depend on row-local bindings such as `record` and `index`
- changing one row should not force unrelated row scopes to re-run

This follows the lexical-root direction in `docs/architecture/dependency-tracking.md`.

### Row Scope Publication

When the table synchronizes a cached row scope, it should publish only the row-local roots that changed.

Examples:

- record object replaced: `paths: ['record']`
- source index changed after insert/remove/reorder: `paths: ['index']`
- visible order changed after sort/filter/pagination: `paths: ['viewIndex']` only when `viewIndex` is actually exposed

This document does not require `record.name`-level change publication as the baseline. Row-root invalidation is the required minimum design because it is simpler, aligns with the root-binding tracking direction, and already prevents whole-table invalidation.

Finer-grained row-field publication is a possible future optimization, not a prerequisite for the table architecture baseline.

Future refinement rule:

- if the dependency substrate later supports narrower row-field publication without conflicting with the broader dependency architecture, table implementations may refine `record` publication into narrower row-local change paths
- renderers must not assume that row-local publication is permanently limited to the root path only
- until that substrate exists, row-root publication remains the required interoperable baseline

### Row-Local Reads Are Required For Row-Local Performance

Row-local invalidation only helps when row descendants also read row-local data narrowly.

Required rules:

- row descendants, especially cell renderers, must not use broad selectors such as `useScopeSelector((scope) => scope)` when they only need row-local bindings
- prefer narrow reads such as `record`, `record.name`, or `index`
- if a renderer only needs one row-local field, prefer a path selector helper over a whole-scope selector

If one cell needs `record.name` and another needs `viewIndex`, those dependencies should remain separate. Optional row bindings do not widen unrelated cells as long as cell renderers keep narrow row-local reads.

Child scopes still inherit parent-scope visibility and parent subscriptions. Narrow row-local read patterns are therefore a required part of the performance contract, not an optional style preference.

### Current Provenance Limitation

The current dependency gate matches changed paths, not scope provenance.

That means a non-isolated row scope can still be conservatively over-notified when an ancestor scope exposes the same binding name as a row-local root such as `record`.

Examples:

- row-local cell depends on `record.name`
- ancestor scope also exposes a binding named `record`
- ancestor change to that binding may still hit the row dependency gate even though the row's own `record` shadows it

Current mitigation rules:

- keep row scopes isolated by default; use non-isolated row scopes only through the explicit opt-out described above when parent fallback is necessary
- avoid reusing row-local root names such as `record` in ancestor scopes for the same subtree when practical
- otherwise accept conservative over-invalidation until dependency matching becomes provenance-aware

## Table Shell Subscription Rules

The table shell must not subscribe to the entire visible lexical scope just to read a few ownership fields.

Bad pattern:

- `useScopeSelector((scope) => scope)`

Required pattern:

- subscribe only to explicit scope-owned paths such as pagination or selection state
- keep source data reads on the resolved renderer props path unless the source is intentionally scope-owned

A small path-selector helper such as `useScopePath(...)` is preferred over new context layers when a renderer only needs one scope binding.

This same rule applies to row descendants. The table shell alone is not enough; row-local performance requires row-local subscriptions throughout the row subtree.

## Context Minimization

Table row architecture should reuse the existing render/runtime carriers instead of adding new React context layers for row metadata.

Reuse:

- `ScopeContext` for row-local data
- `RenderInstancePathContext` for repeated identity
- existing action, registry, page, and form contexts already provided by `NodeRenderer`

Avoid introducing:

- `RowContext`
- `RowMetaContext`
- `RowKeyContext`
- per-cell metadata contexts

If a renderer only needs one row-local value, prefer a selector hook over a new context.

If a renderer needs row-local data plus repeated identity, use the existing row scope plus `instancePath`; do not add a second parallel row carrier.

## Hot-Path Rules

The following are mandatory for performance-sensitive tables:

- no `index`-as-identity fallback in the normative design
- no hardcoded repeated-template literals such as `table.row` as the canonical row repeated boundary id
- no row-scope recreation on every table render
- O(1) row reconciliation by `rowKey`
- no row-scope publication when `record` reference and required row-local bindings are unchanged
- no per-render allocation of fresh row-scope stores for unchanged rows
- no `source.indexOf(record)` or equivalent repeated linear lookup inside row render loops
- no whole-scope table subscriptions for row-agnostic behavior
- no whole-scope row descendant subscriptions when a row-local binding is sufficient
- no default per-cell scope creation inside one row
- no silent default to non-isolated row scopes when row-local bindings are sufficient
- no component-to-component same-row value lookup when `record` already provides the data
- row-following table UI state must use `rowKey`, not `sourceIndex`
- row record updates must use immutable replacement semantics; in-place mutation is out of contract for row invalidation

## Rejected Baselines

### 1. Index As Row Identity

Rejected because reorder, insert, remove, and sort change index without changing the logical row.

### 2. Flattening All Record Fields Into Top-Level Row Scope

Rejected as the default because it:

- increases collision risk with parent bindings
- makes row-scope shape less explicit
- encourages broad reads of many top-level keys

The baseline row binding is `record`, not automatic field flattening.

### 3. Dedicated Row React Contexts

Rejected as the default because they duplicate existing scope and repeated-identity carriers while adding provider nesting and more moving parts.

### 4. Per-Cell Child Scopes

Rejected as the baseline because one row scope already carries the row-local bindings needed by cells, buttons, and expanded content. Per-cell scopes add churn without a clear ownership win.

### 5. Deep Row-Field Change Publication As The Required Baseline

Rejected as the required starting point because the dependency-tracking architecture is converging toward lexical roots. Row-root invalidation is the simpler required baseline; finer field publication remains optional future work.

### 6. Treating Visible Order Metadata As Mandatory Row State

Rejected as the baseline because visible-order metadata changes more often than row identity or row data. `viewIndex` should stay opt-in so sort, filter, and pagination do not widen row churn unless a feature actually depends on visible order.

## Interaction With Form Runtime

This document does not change the form runtime's index-addressed value model.

Array remapping for validation, touched, dirty, visited, and validating state remains owned by the form runtime and its array remap helpers.

The split is:

- form runtime owns index-addressed value semantics
- table rendering owns `rowKey`-addressed runtime identity and row-scope reuse

### Row Index Bridge

The collection owner must maintain or derive a current bridge between `rowKey` and `sourceIndex` for each reconciliation turn.

Required properties:

- O(1) lookup by `rowKey` during reconciliation
- correct routing of source-index changes into row-local `index` publication
- deterministic behavior across insert, remove, reorder, filter, and pagination projection

This bridge may be:

- an ephemeral keyed map built during row-entry normalization
- a retained owner-side index structure when other subsystems need it

The architecture does not require one exported `ArrayIndexMap` type today, but it does require that the collection owner explicitly own this bridge rather than reconstructing indices with repeated linear scans.

## Verification Checklist

Before a table row implementation is considered aligned with this document, verify all of the following:

- rows have stable `rowKey` values that do not depend on index
- editable tables that require continuity use explicit `schema.rowKey` or an equivalent retained generated key field; later server `id` arrival does not silently switch active live row identity
- the row repeated boundary uses a unique compiled `repeatedTemplateId`, not a hardcoded renderer literal
- nested repeated parents preserve the full absolute `instancePath` for table rows
- React row keys, repeated `instanceKey`, row-scope cache keys, and row-following table UI state all use the same `rowKey` with owner qualification where needed
- row scopes are reused while the row remains materialized
- row scope ids are namespaced by the full owning table instance, not just bare `rowKey` or source index
- row reconciliation is keyed by `rowKey` with O(1) lookup
- unchanged rows do not republish when semantic row payload and required row-local bindings are unchanged
- row-local changes do not force unrelated row scopes to update
- same-row reads work through `record.xxx`
- the table shell is not subscribed to the entire lexical scope
- row descendants, especially cells, do not rely on whole-scope selectors when row-local data is sufficient
- immutable row record replacement is used when row data changes
- isolated row scopes are the default baseline; non-isolated row scopes are an explicit opt-out justified by real parent-binding usage
- row reconciliation side effects do not run as uncontrolled render-phase mutations
- collection-to-row reconciliation stays within one coherent update turn for one source update when practical
- no avoidable O(n^2) index recovery remains in row render paths

## Related Terms

- `rowKey`: stable logical identity of one row
- `sourceIndex`: source-array location used by form semantics
- `viewIndex`: optional current visible position after table-local projection
- `instanceKey`: repeated-instance identity token carried in `instancePath`
- `rowScope`: reused row-local lexical scope carrying `record`, `index`, and optional row display/debug bindings
