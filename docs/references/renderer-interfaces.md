# Renderer Interface Reference

## Purpose

This document is a human-readable interface map for the active renderer system.

Use it to understand the roles of the major contracts without reading every source file in full.

This is a reference document, not the architecture source of truth.

Code-level source of truth lives primarily in `packages/flux-core/src/index.ts`.

## Core Schema Types

Key shapes:

- `SchemaValue`
- `SchemaObject`
- `BaseSchema`
- `SchemaInput`
- `ApiSchema`
- `DataSourceSchema`

Role summary:

- `BaseSchema` is the common schema base for renderers
- `BaseSchema.frameWrap` is the per-instance FieldFrame override for wrap-compatible renderers
- `SchemaInput` allows one schema node or an array of nodes
- `ApiSchema` describes request configuration, adaptors, scope injection, and query params
- `DataSourceSchema` describes declarative data fetching with optional polling

## Runtime Environment

Key contracts:

- `RendererEnv`
- `RendererMonitor`
- `ApiFetcher`

Role summary:

- `fetcher` handles request transport
- `fetcher` returns `ApiResponse` only at the host boundary; runtime consumers should see successful data or a thrown error, not a non-OK response object
- `notify` handles user-facing messages
- optional navigation, confirmation, functions, and filters extend the runtime environment
- monitor hooks expose render, action, API, and error observability

## Scope And Store Contracts

Key contracts:

- `ScopeRef`
- `ScopeStore`
- `PageStoreApi`
- `FormStoreApi`

Role summary:

- `ScopeRef` owns lexical lookup and current-scope updates
- `ScopeStore` is the snapshot store abstraction behind scopes
- `PageStoreApi` owns page data and refresh ticks
- `FormStoreApi` owns form-local values and validation state

## Expression Contracts

Key contracts:

- `FormulaCompiler`
- `ExpressionCompiler`
- `CompiledExpression`
- `CompiledTemplate`
- `CompiledValueNode`
- `CompiledRuntimeValue`
- `RuntimeValueState`

Important semantics:

- compile once, execute many times
- preserve static fast path
- preserve identity reuse when evaluated values do not change
- keep expression execution pluggable through the compiler abstraction

## Compiled Schema Contracts

Key contracts:

- `TemplateNode`
- `TemplateRegion`
- `NodeMetaProgram`
- `NodeRuntimeState`
- `SchemaCompiler`

Role summary:

- `TemplateNode` is the immutable compiled node model produced by `SchemaCompiler`, consumed by runtime and React rendering
- `TemplateRegion` describes child renderable fragments within a template
- `SchemaCompiler` transforms raw schema directly into `TemplateNode` (and `CompiledTemplate` graphs)

Important current note:

- compiled template nodes also carry event metadata, optional compiled validation metadata, scope plans, and provider plans

## Renderer Definition Contracts

Key contracts:

- `RendererDefinition`
- `RendererRegistry`
- `SchemaFieldRule`
- `ScopePolicy`
- `RendererPropContract`
- `RendererEventContract`
- `RendererCapabilityContract`
- `ResolvedAuthoringContract`

Role summary:

- `RendererDefinition` is the unified static discovery entry for one renderer `type`; it binds runtime component registration, policy metadata, ordinary renderer authoring metadata, and optional host-boundary metadata without flattening them into one universal envelope
- `RendererRegistry` is the lookup table for renderer definitions
- field rules tell the compiler whether a field is `meta`, `prop`, `region`, `value-or-region`, `event`, or `ignored`
- field rules may carry `lazyEval` (deferred evaluation into `structuralFields`) or `compile` (renderer-owned custom compilation) for advanced field semantics
- the `compile` function on a field rule lets the renderer definition control how nested template schemas within a prop are compiled, avoiding default `compileValue` recursion into template expressions that belong to a different scope

### Unified `RendererDefinition` Field Map

Stable field groups:

- Runtime registration: `type`, `component`, `fields`, `scopePolicy`, `actionScopePolicy`, `componentRegistryPolicy`, `wrap`, `schemaValidator`, `validation`, `compilation`, `validationDefaults`, `frameRootTag`, `staticCapable`
- Discovery metadata: `displayName`, `icon`, `category`, `sourcePackage`, `defaultSchema`
- Renderer classification: `rendererClass`, `rendererTraits`, `injectedLocals`
- Ordinary renderer authoring contracts: `propContracts`, `eventContracts`, `componentCapabilityContracts`, `scopeExportContracts`
- Authoring adaptation: `propSchema`, `authoringTransform`
- Host-only contract: `hostContract`

Classification baseline:

- `instance-renderer`: no new Flux semantic owner boundary, no `hostContract`
- `flux-owner-renderer`: owns Flux-native semantic or interaction state, may publish scope exports and component capabilities, but still no `hostContract`
- `domain-host-renderer`: host/domain boundary publisher; this is the only class that should define `hostContract`

Representative mapping:

- `button` -> `instance-renderer`
- `form` -> `flux-owner-renderer` + `semantic-owner`
- `crud` -> `flux-owner-renderer` + `composite`
- `designer-page` -> `domain-host-renderer` + `workbench-shell`

### Static Contract Responsibilities

`propContracts`

- Responsibility: author-editable schema field metadata for one renderer type
- Consumers: inspector/editor tooling, autocomplete, authoring adapters, diagnostics closed-prop checks
- Contract language: uses `FluxValueShape` as the shared structural IR
- Important boundary: this is not the same thing as runtime `RendererComponentProps['props']`

`eventContracts`

- Responsibility: author-declarable event entry points such as `onClick` or `submitAction`
- Consumers: action authoring UI, event autocomplete, docs/examples
- Runtime relationship: event handlers still resolve to `props.events` at render time; this field only describes the authored event surface

`componentCapabilityContracts`

- Responsibility: static metadata for instance-targeted `component:<method>` calls
- Consumers: action authoring tooling, diagnostics/docs, inspector affordances
- Runtime relationship: methods resolve through `ComponentHandleRegistry`, not through `ActionScope`
- Shared contract language: methods reuse the same `CapabilityMethodContract` language as host manifest methods, but not the same envelope

`scopeExportContracts`

- Responsibility: narrow readonly Flux-native exports such as `$form`, `$crud`, or owner summaries
- Consumers: tooling, docs, diagnostics fixtures, future autocomplete
- Runtime relationship: describes readonly Flux-owned scope publications; it does not create host projection and does not replace runtime store ownership
- Important boundary: this is not a host manifest and not a substitute for `hostContract.projection`

`hostContract`

- Responsibility: host/domain manifest publication entry with family, default version, manifest resolver, and capability publication attribution
- Consumers: compiler host-contract validation, host-aware tooling, workbench documentation
- Runtime relationship: host capability lookup still resolves through `ActionScope`; `hostContract` only describes the host boundary statically
- Important boundary: `hostContract` is host-only and should exist only on `domain-host-renderer`

### Authoring Surface Versus Runtime Surface

Important distinction:

- `editableProps` in `ResolvedAuthoringContract` is the tooling-facing adapter over `RendererDefinition.propContracts`
- runtime `props` in `RendererComponentProps` is the resolved render-time value object after expression evaluation, defaults, and runtime resolution
- the two surfaces are related but not identical, and tooling must not treat runtime `props` as the authored schema contract

Current adapter baseline:

- `ResolvedAuthoringContract.rendererClass` comes from `RendererDefinition.rendererClass`
- `ResolvedAuthoringContract.editableProps` comes from `RendererDefinition.propContracts`
- `ResolvedAuthoringContract.events` comes from `RendererDefinition.eventContracts`
- `ResolvedAuthoringContract.componentCapabilityContracts` comes from `RendererDefinition.componentCapabilityContracts`
- `ResolvedAuthoringContract.scopeExports` comes from `RendererDefinition.scopeExportContracts`
- `ResolvedAuthoringContract.hostProjection` and `hostActions` are present only when `RendererDefinition.hostContract` resolves a manifest

## Render-Time React Contracts

Key contracts:

- `RendererComponentProps`
- `RendererHelpers`
- `RendererEventHandler`
- `ReactionHandle`
- `RenderRegionHandle`
- `RenderFragmentOptions`
- `RenderNodeInput`
- `ComponentHandle`

Role summary:

- `RendererComponentProps` is the concrete renderer boundary
- `RendererHelpers` exposes stable runtime helpers such as `render`, `evaluate`, `createScope`, `dispatch`, and `executeSource`
- `RendererEventHandler` is the runtime callback shape used for declarative event fields (`kind: 'event'`)
- `ReactionHandle` is the renderer-facing handle for `kind: 'reaction'` fields (parallel to `events`); it is both reactive (auto-fires on declared `dependsOn` root changes) and imperative (renderer calls `dispatch()`/`force()`)
- `RenderRegionHandle` gives components an easy way to render declared child regions
- `ComponentHandle` may optionally expose `ref?: HTMLElement | null` alongside explicit imperative capabilities

Current typing baseline:

- `RendererComponentProps<S, P>` lets a renderer declare both its authored schema shape `S` and its resolved runtime prop bag `P`.
- `RendererResolvedProps<S>` defaults to `Record<string, any> & Partial<S>` so runtime prop bags stay honest for low-code dynamic fields without forcing every schema-only field into `props`.
- `RendererDefinition.component`, `RendererHelpers.render`, and `RenderRegionHandle.render` share a host-neutral render-result alias in `flux-core`; React element typing stays in `@nop-chaos/flux-react` aliases rather than flowing back into core.

### `ReactionHandle` interface

`kind: 'reaction'` fields compile into `TemplateNode.reactionPlans[key]` (`CompiledReactionPlan`) and are surfaced as `props.reactions[key]` (`ReactionHandle`). The handle starts in the `initial-paused` phase; the renderer must call `ready()` to enable firing.

```ts
interface ReactionHandle {
  dispatch(ctx?: Partial<ActionContext>): Promise<ActionResult>;
  force(paths?: readonly string[]): void;
  ready(): void;
  pause(): void;
  resume(): void;
  dispose(): void;
  getDebugState(): ReactionHandleDebugState;
}

interface ReactionHandleDebugState {
  phase: 'initial-paused' | 'ready' | 'explicit-paused' | 'disposed';
  fireCount: number;
  pauseCount: number;
  pendingChange: boolean;
  pendingChangedPaths: readonly string[];
  disposed: boolean;
}
```

Method semantics:

- `dispatch(ctx?)` — imperative fire; injects `evaluationBindings`, owns the per-fire `AbortController` chain (new fire aborts in-flight), resolves to `{ ok: false, cancelled: true }` after `dispose()`.
- `force(paths?)` — force a reactive fire as if `dependsOn` roots changed, without a real scope write.
- `ready()` — leave `initial-paused`; required for firing. Pending change accumulated before `ready()` is flushed once.
- `pause()` / `resume()` — counter-based nested gating; `dependsOn` hits accumulate into `pendingChange` while paused, flushed once on counter return to zero.
- `dispose()` — handle becomes inert; pending `dispatch()` promises resolve to the canonical cancelled result.
- `getDebugState()` — readonly diagnostic snapshot.

`ReactiveActionSchema extends ActionSchema` requires `dependsOn: string[]` (root-level paths) and supports optional `ignoreWritesTo?: string[]` (root-level self-write filter). v1 does not support `immediate`/`debounce`/`once`/`control`. Source design: `docs/plans/2026-07-07-loadAction-reaction-kind-plan.md`.

## Runtime Family Contracts

Key contracts:

- `RendererRuntime`
- `FormRuntime`
- `PageRuntime`
- `SurfaceRuntime`
- `SurfaceEntry`

Role summary:

- `RendererRuntime` is the root runtime services container for one schema execution root
- `FormRuntime` owns form-local validation, submission, and value updates
- `PageRuntime` owns page-level scope and page shell behavior such as refresh
- `SurfaceRuntime` owns the shared dialog/drawer/sheet-style surface stack and open/close behavior
- `SurfaceEntry` records one opened surface instance including its scope and render context

## Validation Contracts

Key contracts:

- `ValidationRule`
- `ValidationError`
- `ValidationResult`
- `FormValidationResult`
- `CompiledFormValidationModel`
- `CompiledValidationNode`
- `ValidationContributor`
- `RuntimeFieldRegistration`

Role summary:

- `ValidationRule` is the schema-neutral rule union used by compiler and runtime
- `ValidationError` is the structured error format used by the runtime
- `CompiledFormValidationModel` holds field, node, order, behavior, and dependency information
- `ValidationContributor` lets renderer definitions describe validation participation
- `RuntimeFieldRegistration` supports complex controls that still need runtime participation

## Action Contracts

Key contracts:

- `ActionSchema`
- `ActionContext`
- `ActionResult`

Role summary:

- `ActionSchema` is the declarative low-code action format
- `ActionContext` carries runtime, scope, form, page, surface, node, structured `event`, and `prevResult` context
- `ActionResult` is the normalized runtime result of an action

Current action system supports directionally:

- `setValue`
- `ajax`
- `submitForm`
- `openDialog`
- `openDrawer`
- `closeSurface`
- `refreshTable`
- chaining through `then`
- debounce and request cancellation
- plugin interception

## Plugin Contracts

Key contract:

- `RendererPlugin`

Expected extension points:

- `beforeCompile`
- `afterCompile`
- `wrapComponent`
- `beforeAction`
- `onError`

## Root Entry Contract

Key contract:

- `SchemaRendererProps`

Boundary inputs remain explicit:

- `schema`
- `schemaUrl`
- `data`
- `env`
- `formulaCompiler`
- optional `registry`, `plugins`, `pageStore`, `surfaceRuntime`, `moduleCache`, `parentScope`, `actionScope`, `componentRegistry`, `strictValidation`, `onRuntimeChange`, `onComponentRegistryChange`, `onActionScopeChange`, and `onActionError`

## Option-Row Interaction-State Contract

The `optionRow` semantic field family gives row-like renderers a schema-expressable
channel for interactive state (selected / disabled) and a standard marker output
that CSS can consume. Owner plan: `docs/plans/2026-08-30-1333-2-d1-gf-option-row-primitive.md`.

Key contracts:

- `OptionRowConfig` (schema field `optionRow` on `list`, `table`)
- `getOptionRowStateAttributes` (shared helper, `@nop-chaos/flux-react`)
- `optionRowValueMatches` (shared helper, `@nop-chaos/flux-react`)

Role summary:

- `optionRow.value` is a `SchemaValue` binding (e.g. `"${selectedId}"`) evaluated by the
  compiled props program against the owner scope; a row is marked selected when its
  `valueField` value (list default `keyField`, table default `rowKey`; array binding =
  any-match) equals the resolved binding. A failed or empty binding resolution degrades
  to the declared state source — the internal selection when one is co-declared,
  otherwise no selection — and never crashes.
- `optionRow.selectedClass` is a schema-authored class applied to rows in the selected
  state (explicit override channel; baseline visual styling stays in CSS).
- When `optionRow` is declared without `value`, the selected state source is the
  renderer's existing internal selection (list `selectionMode`, table `rowSelection`).
- When `optionRow.value` is declared alongside an internal selection configuration, the
  binding exclusively drives the row state markers; the internal selection keeps working
  and dispatching events (a dev warning is emitted for the clash).

Marker output (only when `optionRow` is declared; absence = byte-identical legacy output):

| Attribute                | When                                                |
| ------------------------ | --------------------------------------------------- |
| `data-option-row="true"` | always, on the row element                          |
| `data-state`             | space-joined tokens: `selected`, `disabled`         |
| `data-selected="true"`   | row is selected                                     |
| `aria-selected`          | `"true"` on the selected row, `"false"` on the rest |
| `aria-disabled="true"`   | owner node `meta.disabled` is true                  |

Transient hover/pressed states are deliberately **not** JS state: CSS consumes
`[data-option-row]:hover` / `:active` gated by `@media (hover: hover)` (touch-safe no-op).
Keyboard focus exposes only the marker + native `:focus-visible`; focus-management
frameworks are out of scope (G-B2).

## Command Palette Surface Contract

The `command-palette` renderer type packages the `@nop-chaos/ui` Command family
(cmdk) as a schema-expressable overlay surface: search filtering, grouped command
list, keyboard selection, command execution, and close-after-execute. Owner plan:
`docs/plans/2026-08-30-1737-1-d1-gb1-command-palette-renderer-primitive.md`.

Key contracts:

- `CommandPaletteSchema` (schema type, `type: 'command-palette'`)
- `CommandPaletteItemSchema` / `CommandPaletteGroupSchema` (item shapes)
- `commandPaletteRendererDefinition` (`packages/flux-renderers-basic/src/surface-renderer-definitions.ts`)
- `CommandPaletteRenderer` (`packages/flux-renderers-basic/src/command-palette.tsx`)
- `registerBasicRenderers` registration; rendered self-contained (not a `SurfaceRuntime` stack entry)

Role summary:

- Items data is dual-track; `items`, `groups`, and `source` are expression-capable
  `SchemaValue` fields. Static: `items` (flat list; per-item `group` clusters
  under headings in first-seen order) and `groups` (`[{ label?, items }]`
  sections, rendered first). Dynamic: `source` (`kind: 'prop'` with
  `allowSource: true` + `sourceStateKey: 'sourceState'` — a `SourceSchema`
  fetched by the source-prop controller, or an expression/array). Source items
  append after static sections; loading/empty/error degrades to the empty state
  (`palette-empty`: the transient `sourceState` patch guarantees the failing
  source re-renders instead of freezing the node's prop bag).
- Item shape: `{ id?, label?, description?, shortcut?, group?, icon?, disabled?, action? }`.
  Missing `label` falls back to `id` then `''`; missing `id` falls back to a
  synthetic `item-${index}` key; non-object entries are skipped — degraded items
  render, the list never breaks (`palette-item-invalid`).
- Search: `placeholder` (default i18n `flux.common.search`) and `shouldFilter`
  (default `true` = cmdk built-in filter; `false` = schema-driven external
  filtering). Empty state: `emptyText` (default i18n `flux.common.noResults`)
  rendered through `CommandEmpty` only when nothing matches. Keyboard selection
  (↑↓/Enter/Esc), filter scoring, and the `data-selected` focus pointer are
  cmdk built-ins consumed through the wrapper; they require the ui composition
  `CommandDialog > Command > CommandInput + CommandList > groups/items +
CommandEmpty` (items outside `CommandList` lose selection/empty semantics).
- Open/close semantics mirror the dialog surface family: `open` (controlled,
  external value wins; a simple `${path}` expression is written back to `false`
  on user-initiated closes so idempotent `setValue(path, true)` reopens —
  dialog plan-459 parity, captured at compile time via the field `compile` hook
  with no runtime raw-schema read), `defaultOpen` (synced after async prop
  resolution), `closeOnEsc` (default true), `closeOnOutsideClick` (default
  true), `showMask`, `container` (portal container), `statusPath` (publishes
  `{ id, kind: 'command-palette', open }`), events `onOpen`/`onClose` with
  payload `{ surfaceId, kind: 'command-palette', open }` (payload keys
  resolvable in action args via evaluation bindings).
- Handles `component:open` / `component:close` / `component:toggle` (addressed
  by the palette node's schema `id`) follow the surface handle contract: no-op
  `{ ok: true, skipped: true }` when already in the target state or when
  externally controlled via the `open` prop.
- Command execution is dual-track. Event track: `onCommand` fires on every
  execution with payload `{ id, item, groupId }`. Static track: an item-level
  `action` (`ActionSchema | ActionSchema[]`) dispatches on execution. Both
  channels may be combined (static dispatch first). Execution order is
  close-then-dispatch: the palette closes first (onClose fires), then `action`
  dispatches, then `onCommand` fires — "面板即关". Dispatch failures follow the
  existing action error convention; the palette does not reopen.
- `hotkey` (e.g. `"mod+k"`) binds one local invocation key: renderer-scoped
  `window` keydown listener with unmount cleanup. `mod` = meta‖ctrl; `ctrl`/
  `shift`/`alt` modifiers supported. No-op (dev warn) on controlled palettes —
  the `open` channel belongs to the author expression. No chord sequences, no
  modifier range selection, no global keybinding registry or conflict
  arbitration (G-B2 scope).

Marker output: the palette panel root carries the `nop-command-palette` marker
class plus `data-testid`/`data-cid`; inner regions use the ui `data-slot="command*"`
markers (`command-input`, `command-list`, `command-group`, `command-item`,
`command-empty`, `command-shortcut`) and cmdk's `data-selected` focus pointer.
Keyboard selection (↑↓/Enter/Esc) and filter scoring are cmdk built-ins consumed
through the wrapper — no keyboard framework is introduced here (G-B2 boundary).

## Page Header Semantic Fields

Status: landed (live-verified 2026-08-30, `page.tsx`). Every field below is both
declared and consumed at render time — no declared-but-unwired entries.

The `page` renderer carries page-header template semantics so enterprise pages
do not hand-assemble breadcrumbs from text nodes (P2a evidence: 5-node text
breadcrumb). Owner plan:
`docs/plans/2026-08-30-1737-2-d1-ga-page-template-semantic-components.md`.

Key contracts (carrier decision: `page` renderer semantic enhancement, L2,
zero new type — C2 G-A row):

- `breadcrumb?: SchemaValue` — expression-capable array of
  `{ label: string; href?: string }` entries rendered above the title row as
  `<nav data-slot="page-breadcrumb" aria-label>` with an `<ol>`/`<li>` list
  (composed from the `@nop-chaos/ui` Breadcrumb family; the root
  `data-slot` is overridden to `page-breadcrumb`).
  Entries with `href` render anchors (`BreadcrumbLink`); others render text
  (`BreadcrumbPage`). A chevron separator
  sits between entries. Malformed entries (non-object, missing label) are
  skipped — rendering never breaks.
- `extra` region — action area rendered at the right end of the title row
  (`data-slot="page-extra"`, `ml-auto` inside `page-heading`).
- The semantic branch (breadcrumb nav + `page-heading` row wrapping
  title/subTitle/remark/extra) renders when breadcrumb or extra content is
  present; otherwise the legacy header structure renders byte-identical to
  pre-enhancement behavior. The header block itself renders when any of
  title / subTitle / remark / breadcrumb / extra (or the mobile aside toggle)
  is present. The `header` region is orthogonal: it keeps rendering into
  the `page-toolbar` slot (free-form content), never merged with the semantic
  header fields.
- Overflow: breadcrumb items truncate with ellipsis (`min-w-0 max-w-40
truncate`) and expose a native `title` hint; deep hierarchies wrap, the
  layout never overflows. Content tabs are deliberately NOT part of this
  family — compose the existing `tabs` renderer in the page body.

## Query Filter Semantic Component

Status: landed (live-verified 2026-08-30, `query-filter.tsx` +
`query-filter-definition.ts`). The standalone component's full field set is
consumed; note the deliberate boundary below — crud's own
`queryForm.defaultCollapsed` family stays deprecated-and-warned, not wired.

The `query-filter` renderer type is a standalone query-region semantic
component (search/reset built in, expand/collapse, grid layout) usable outside
`crud` — crud keeps its own `queryForm` + `filterTogglable` channel unchanged.
Owner plan:
`docs/plans/2026-08-30-1737-2-d1-ga-page-template-semantic-components.md`.

Key contracts:

- `QueryFilterSchema` (`type: 'query-filter'`,
  `packages/flux-renderers-data`) — `body` (query fields), `actions`
  (custom action buttons replacing the defaults), `mode`/`layout`/
  `columnCount`/`gap` (forwarded to the embedded form), `submitLabel`/
  `resetLabel`, `togglable`, `onSubmit`/`onReset`.
- Authoring transform lowers `body` into an embedded `{ type: 'form' }`
  (region `filterForm`, crud `queryFormRegion` precedent). Default actions:
  Search (`component:submit` on the embedded form; `onSubmit` is lowered to the
  form's `submitAction` — validation then submit pipeline) and Reset
  (`component:reset` + the `onReset` chain). Without declared chains, Search
  dispatches nothing (no implicit fetch, no throw) and Reset only resets field
  values.
- `togglable: boolean | { defaultCollapsed?, collapsedLabel?, expandedLabel? }`
  wraps the form in a collapse envelope (crud toggle shape). Collapsed shows
  `collapsedLabel`; the expand control's label resolves `expandedLabel`.
- No implicit host detection: `query-filter` and `crud.queryForm` are
  independent channels with no runtime conflict surface; the crud-embedded
  query region convention is `crud.queryForm` (documentation-level agreement,
  no dev warn). crud-side dead config disposition (same plan): the
  `queryForm.defaultCollapsed/collapsedLabel/expandedLabel` family is
  `@deprecated` (use `filterTogglable`) and emits authoring warnings;
  `filterTogglable.collapsedLabel/expandedLabel` IS wired into the crud
  toggle envelope.

## Result Semantic Component

Status: landed (live-verified 2026-08-30, `result.tsx`). Every field below is
both declared and consumed at render time.

The `result` renderer type is an operation-final-state page block
(`empty` sibling in `flux-renderers-content`). Owner plan:
`docs/plans/2026-08-30-1737-2-d1-ga-page-template-semantic-components.md`.

Key contracts:

- `ResultSchema` (`type: 'result'`) — `status`
  (`'success' | 'error' | 'warning' | 'info'`, default `info`), `icon`
  (lucide override of the status default), `title`/`description`
  (value-or-region), `actions` region (single action channel; the AntD `extra`
  naming was rejected for in-package consistency with empty/card/alert).
- Status mapping (alert precedent): success → check-circle + success color,
  error → x-circle + destructive, warning → alert-triangle + warning, info →
  info + info color. Invalid `status` degrades to `info` with a dev warn —
  rendering never breaks.
- Markers: root `nop-result`, `data-slot="result"`, `data-status`, plus the
  standard `data-testid`/`data-cid`.

## Recommended Reading Path

For deeper design intent, continue with:

- `docs/references/maintenance-checklist.md`
- `docs/references/terminology.md`
- `docs/references/runtime-and-renderer-faq.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/form-validation.md`

For historical draft material, see `docs/archive/nop-chaos-amis-renderer-interfaces.ts`.
