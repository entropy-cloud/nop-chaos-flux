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

## Keyboard Binding Contract

Status: implemented and verified against live behavior (owner plan
`docs/plans/2026-08-30-2312-1-d1-gb2-keyboard-navigation-framework.md`, Phase 4
finalization 2026-08-31; red-first matrices in
`packages/flux-renderers-basic/src/__tests__/keyboard-bindings.test.tsx` +
`packages/flux-react/src/keyboard.test.ts`).

The `keyboard` renderer type is an invisible logic renderer
(`flux-renderers-basic`, `category: 'logic'`, `reaction` sibling) giving schema
authors a keyboard-sequence → action binding channel: single key combos and
chord sequences, with input-focus gating, surface-stack routing, and dual-track
execution. It resolves the framework-level gap that renderer-local ad-hoc
listeners (command-palette `hotkey`, kanban gesture handlers) could not express:
chords, page-level bindings, and scope-local dispatch.

Key contracts:

- `KeyboardSchema` (`type: 'keyboard'`) — `bindings`
  (`KeyboardBindingConfig[]`), `chordTimeout` (ms, default 1000), `onTrigger`
  event.
- `KeyboardBindingConfig` — `keys` (single combo `"mod+shift+s"` or
  space-separated chord sequence `"g o"`), `when` (raw expression, no `${}`,
  evaluated against the node scope per keypress — `checkableWhen` precedent),
  `allowInInput` (default false), `preventDefault` (default true), `action`
  (`ActionSchema | ActionSchema[]` static dispatch track).
- Shared helpers (`@nop-chaos/flux-react`, `keyboard.ts`): `parseKeyCombo` /
  `parseModifierHotkey` / `parseKeySequence` / `comboMatchesKey` /
  `isEditableKeyboardTarget` / chord buffer matcher. The command palette
  consumes `parseModifierHotkey` (behavior-identical single-combo contract that
  requires ≥1 modifier).

Matching semantics:

- Token syntax: each `keys` token is `[(mod|ctrl|shift|alt)+]key` (`mod` =
  meta‖ctrl); `event.key` compares lowercased, modifiers compare exactly
  (`shiftKey === binding.shift`). `mod` + `ctrl` together is invalid.
- Chord state machine: space-separated tokens buffer left-to-right. A token
  that is both a complete binding and a longer sequence's prefix waits
  (longest-match): continuation within `chordTimeout` dispatches the long
  binding; timeout falls back to the short binding. A prefix-only token waits
  silently. Mismatch or timeout resets the buffer; the mismatching key is then
  re-evaluated from idle (overlapping starts work).
- Input gating (kb-input-focus): bindings do not fire while the event target is
  `input`/`textarea`/`select`/`contenteditable` unless `allowInInput: true`.
- Built-in priority: the dispatcher skips events with
  `event.defaultPrevented === true` — earlier-registered built-in handlers that
  consume a key (palette hotkey, kanban undo) win. Authors must not declare
  bindings on built-in-owned keys (no cross-tree runtime detection).
- Conflicts (kb-conflict): duplicate normalized sequences inside one node →
  registration order wins + one mount-time dev warn.
- Surface routing (kb-surface-stack): when the SurfaceRuntime stack is
  non-empty, a `keyboard` node stays active only if its scope is the top
  surface's scope or a descendant of it; page-level bindings pause while a
  dialog/drawer/sheet is open and resume on close.
- Execution: static track (`binding.action` via `helpers.dispatch`, CX-10 ctx:
  normalized event + evaluation bindings = the hit payload `{ keys, index,
nativeEvent }` + node scope + nodeInstance) fires first, then the `onTrigger`
  event with the same payload. Dispatch errors follow the existing action
  error convention (dev warn); the listener never unbinds on errors.
- The component renders `null` — zero DOM, zero markers (styling-system
  no-op). Listener lifecycle is React effect mount/cleanup (strict-mode safe).

## Table Modifier Selection Contract

Status: implemented and verified against live behavior (owner plan
`docs/plans/2026-08-30-2312-1-d1-gb2-keyboard-navigation-framework.md`, Phase 4
finalization 2026-08-31; red-first matrices in
`packages/flux-renderers-data/src/__tests__/table-modifier-select-hook.test.tsx`

- `packages/flux-renderers-data/src/__tests__/table-modifier-select.test.tsx`).

`rowSelection.modifierSelect?: boolean` (default false, checkbox mode only —
inert under `radio`) enables modifier-key selection gestures on `table`:

- Anchor: every unmodified selection change (checkbox toggle, row toggle,
  select-all) sets the range anchor to the acted row; `setSelectionExternal`
  never moves it.
- ⇧click range select (additive union): selection := current ∪ view-order range
  [anchor..clicked] (no anchor → clicked row). Non-checkable rows
  (`checkableWhen`) are skipped; `maxSelectionLength` truncates in view order
  (same rule as select-all). Shift-click never deselects. `keepOnPageChange`
  retained cross-page keys are preserved (retainedKnown parity).
- ⌘/ctrl-click: independent toggle of that row (existing checkbox / row-toggle
  behavior — contract restated, no new code).
- ⌘/ctrl+A: with focus inside the table container and a non-editable target,
  select-all within the current view (reuse of `handleSelectAll(true)` +
  preventDefault). Editable targets (inputs inside the table) keep native
  select-all.
- All modifier changes dispatch the same `table:selection-change` payload via
  `onSelectionChange`. With `modifierSelect` absent/false, ⇧click behaves
  exactly as today (compat parity).

## Table Select-All Mode Contract

Status: landed (live-verified 2026-08-31; owner plan
`docs/plans/2026-08-30-2312-2-d1-gb3-batch-bar-semantic-component.md`; red-first
matrix in `packages/flux-renderers-data/src/__tests__/table-select-all-mode.test.tsx`).

`rowSelection.selectAllMode?: 'all' | 'page'` (default `'all'` — zero
regression) scopes the header select-all and the header checkbox state on
`table` (adopted symmetrically by `crud` via `selection.selectAllMode`
pass-through to the internal table carrier):

- `'all'` — header select-all acts on the full row set (existing behavior;
  deselect clears the entire selection).
- `'page'` — header select-all acts on the **current display page**
  (client-paged tables: the `paginateTableData` slice; server-paged tables:
  the flowed-in row set — same source as `handleSelectAll`'s rows, no
  invented accumulation). Semantics = check/uncheck-all-visible, mirroring
  manual row-check semantics: check unions the page rows into the existing
  selection (`maxSelectionLength` truncates along page row order); deselect
  removes the page rows and keeps other-page keys. The header checkbox checked
  state follows the page scope (checked = every checkable page row selected;
  indeterminate otherwise when part of the page scope is selected).
- `checkableWhen` filters non-checkable rows within the page slice;
  `modifierSelect` composes (⌘/ctrl+A reuses `handleSelectAll(true)` and thus
  the page scope; ⇧click ranges stay view-order, unchanged); inert under
  `radio` (no header select-all shape).
- Invalid `selectAllMode` values emit `invalid-property-shape` diagnostics on
  both hosts (`data-schema-validation.ts`).

## Batch Bar Semantic Component

Status: landed (live-verified 2026-08-31, `batch-bar.tsx` +
`batch-bar-definition.ts`; owner plan
`docs/plans/2026-08-30-2312-2-d1-gb3-batch-bar-semantic-component.md`, Phase 1
Decision Record + Phase 2/3 implementation records). Every field below is both
declared and consumed at render time.

The `batch-bar` renderer type is a selection-set-driven batch-operation bar
(count template + action area + built-in clear + built-in non-empty visibility
gate). It dissolves the hand-assembled "toolbar text node + buttons + visible
gate" alert-envelope gap registered twice in C2 write-backs ③ (AntD Pro) and ⑤
(Linear). Owner plan: see above; naming deliberately avoids the dead
`crud.bulkActions` config surface (normalization drop + validation error stay
untouched).

Key contracts:

- `BatchBarSchema` (`type: 'batch-bar'`, `packages/flux-renderers-data`) —
  `selectionPath` (raw scope path, no `${}`, to the `string[]` selection;
  required), `countTemplate` (string template; default i18n
  `flux.batchBar.selectedCount`), `actions` region (rendered between count
  and clear), `clearTarget` (componentId of the owning crud/table; declaring
  it renders the clear button), `clearLabel` (override of i18n
  `flux.batchBar.clearSelection`).
- `selectionPath` is a raw scope path (no `${}`) and reactive through the
  scope store: empty selection / missing path / failed resolution → the
  envelope renders null and never throws.
- `countTemplate` is compiled via `lazyEval` into `structuralFields` and
  evaluated at render time against a child scope `{ count, selectedRowKeys }`
  (the props pipeline would otherwise evaluate the template before the bar can
  inject `count`). A genuine evaluation failure falls back to the raw count
  with a one-time dev warn (`batch-bar-count-expr`); templates the formula
  compiler cannot compile degrade to static strings platform-wide, unchanged.
  Template expressions may also reference ambient scope (`$crud.*` resolves
  for a crud-nested bar) through the child scope's parent chain.
- Dual-host binding boundary (the two selection APIs stay parallel, unmerged):
  crud host nests the bar in `toolbar`/`listActions`/`footerToolbar` and binds
  `selectionPath: "$crud.selectedRowKeys"`; table host places the bar as a
  sibling and binds the same scope path as `selectionStatePath` (e.g.
  `"selectionPath": "issueSelection"`).
- Built-in clear = unified handle resolution facade inside the component:
  resolve `clearTarget` through the component registry, prefer the crud
  `clearSelection` method, else invoke table `setSelection` with
  `{ selectedRowKeys: [] }`. Missing target / neither method → no-op + one-time
  dev warn (`batch-bar-target-invalid`).
- Visibility: the built-in non-empty gate (empty selection / missing path /
  failed evaluation → renders null, no placeholder) ANDs with schema-level
  `visible` — authors may narrow further but cannot defeat the non-empty gate.
  Count-template evaluation failure falls back to the raw count + dev warn
  (`batch-bar-count-expr`); the envelope never breaks.
- Marker output: root `nop-batch-bar` + `data-slot="batch-bar"` + standard
  `data-testid`/`data-cid` + `data-count`; inner slots `batch-bar-count`,
  `batch-bar-actions`, `batch-bar-clear`. Empty selection renders nothing
  (zero DOM, zero markers). Widget renderer, self-styled; zero `@nop-chaos/ui`
  export changes.

## Tabs View Collection Management Contract

Status: landed (live-verified 2026-08-31; owner plan
`docs/plans/2026-08-31-0721-1-d1-gc-multiview-database-semantic-components.md`,
Phase 1 Decision Record + Phase 2 implementation record; red-first matrix in
`packages/flux-renderers-basic/src/__tests__/tabs-view-management.test.tsx`).

The `tabs` renderer grows a view-collection management surface (C2 G-C 多视图
数据库语义件第二成员): runtime add / close / rename / reorder of tab items,
resolving the write-back-⑥ unreachable surfaces (runtime view-branch addition
I2, tab drag reorder + overflow dynamization I13) and wiring the three dead
declarations (`closable`/`draggable`/`addable` at `TabsSchema`) that were
declared + registered but never implemented (guide Rule 11 boundary — G-A dead
config disposition precedent, "wire" track).

Key contracts:

- Collection ownership axis (kanban `kanbanOwnership` naming precedent):
  `itemsOwnership?: 'local' | 'controlled' | 'scope'` (default `'local'`) +
  `itemsStatePath?: string` (scope read/write path for the `'scope'` track).
  Without management activity (all three flags falsy, zero handle calls) the
  render source is the resolved `items` verbatim — zero regression. First
  management mutation (UI affordance or handle) clones the then-current items
  into a managed collection; `'local'` owns it in component session state (no
  re-seed from later schema items — expression items re-evaluate per render and
  reference-compare re-seeds would wipe user management), `'scope'` writes each
  mutation back to `itemsStatePath`, `'controlled'` drops mutations (handles
  return `{ok:false}`, affordances inert, no events — kanban controlled
  mutation-drop precedent).
- Handles (kanban handle precedent): `addTab({ item, index? })` (auto value
  `tab-<ts>` when absent; out-of-range index appends), `removeTab({ value })`,
  `renameTab({ value, title })`, `moveTab({ value, toIndex })` (index clamped).
  Failure paths: unknown value → `{ok:false}`; removing the last remaining tab
  is refused (`gc-tab-remove-last` adjudicated as 禁止删空兜底 — an empty
  collection would dangle the `valueStatePath` active pointer; expression-cleared
  items keep candidate-fix semantics, the guard only guards the component's own
  remove channel).
- Active pointer migration (`gc-tab-remove-active`): removing the active tab
  migrates the active value through the existing `resolveCandidateValue` rule
  (nearest-right → nearest-left) via the same `valueStatePath` write chain; add
  / rename / move never touch the active value.
- Events (CX-10 ctx compliant, kanban `eventCtx` payload precedent):
  `onTabAdd` `{ type:'tabs:tab-add', item, index }`, `onTabClose`
  `{ type:'tabs:tab-close', value, index, item, nextActiveValue }`, `onTabRename`
  `{ type:'tabs:tab-rename', value, index, title, item }`, `onTabMove`
  `{ type:'tabs:tab-move', value, fromIndex, toIndex }`. UI affordances and
  handles share one mutation channel (kanban 22-12 precedent).
- UI affordances (all gated by their flag; zero flags → zero affordance):
  `closable` (tabs-level default + item-level override) renders a close ✕
  inside each trigger (`data-slot="tabs-trigger-close"`, click stopPropagation,
  mouse affordance kept `aria-hidden` so tab-list keyboard roving stays
  intact; keyboard/programmatic close runs through the `removeTab` handle).
  The ✕ is hidden on the last remaining tab (the remove guard's UI face);
  `draggable` enables native HTML5 tab drag reorder (drop → `moveTab`);
  `addable` renders a trailing `+` trigger (`data-slot="tabs-trigger-add"`,
  default title i18n `flux.tabs.newTab`, does not auto-activate). No built-in
  destructive confirm (AMIS parity — authors compose confirmation via
  `onTabClose` chains + host confirm action).
- Overflow dynamization (I13 residual): adjudicated `Deferred But Adjudicated`
  (`optimization candidate`) — horizontal scroll + mobile scrollIntoView
  already keep the active tab reachable; successor registered (DropdownMenu
  overflow menu, triggered by a real consuming page).

## Kanban Column Aggregate Contract

Status: landed (live-verified 2026-08-31; owner plan
`docs/plans/2026-08-31-0721-1-d1-gc-multiview-database-semantic-components.md`,
Phase 1 Decision Record + Phase 3 implementation record; red-first matrices in
`packages/flux-renderers-scheduling/src/kanban/kanban-aggregate.test.ts` +
`kanban-column-aggregate.test.tsx`).

The `kanban` renderer grows a per-column header aggregate semantic
(C2 回写 ⑥ 候选 2 residual: "列头原生聚合（Sum/Avg/Min/Max/Count + 列头内嵌
形态）仍为 kanban 语义增强候选"): a board-level declaration, evaluated per
column over that column's own cards — one declaration, per-column values,
resolving the "per-column binding missing" gap (G-A observation surface) via
evaluation instead of region parameterization.

Key contracts:

- `KanbanSchema.columnAggregate?: { field?: string; fn: 'sum' | 'avg' | 'min' | 'max' | 'count'; label?: string }`
  (board-level, single declaration). Rendered inside the default column header
  as `{label ?? fn}: {value}` (`data-slot="kanban-column-aggregate"`, beside
  the count badge). A `columnHeader` region override takes the whole header
  (existing behavior) and suppresses the aggregate (no double rendering).
- Data source: client-side, the column's current filtered-visible card set
  (same source as the header count badge — filter semantics stay consistent).
  `count` ignores `field` and always equals the card count (empty column →
  `0`, `gc-aggregate-empty-column`); sum/avg/min/max read `card.data[field]`,
  coerce via `Number()`, skip missing/`NaN` values; an empty valid-value set
  renders the `'-'` fallback + board-level one-time dev warn
  (`gc-aggregate-missing-field`) — never `NaN`, never throws.
- Server-passthrough boundary: deliberately not built (aggregation is a
  client-side presentation semantic; server pre-computation remains reachable
  through data endpoints — replica-page mock precedent). No `flux-core`
  changes; pure helper `computeColumnAggregate` extracted for unit coverage.
- Zero-regression: without a `columnAggregate` declaration the header renders
  byte-identical to pre-enhancement behavior.

## Table Group And Aggregate Contract

Status: landed (live-verified 2026-08-31; owner plan
`docs/plans/2026-08-31-0721-2-d1-gd-grid-editing-semantic-components.md`, Phase 1
Decision 1 + Phase 2 implementation record; red-first matrices in
`packages/flux-renderers-data/src/__tests__/table-grouping.test.ts` +
`table-group-render.test.tsx`).

The `table` renderer grows client-side grouping/aggregate semantics (C2 G-D
first leg), retiring the replica-page "mock server-side pre-aggregation +
schema loop" posture to a retrofit candidate:

- `TableSchema.group?: TableGroupConfig` — `field` (record path; declaring a
  valid one enables grouping), `aggregates?: Array<{ fn: 'sum'|'avg'|'min'|'max'|'count'; field?: string; label?: string }>`,
  `missingLabel?` (fallback group label, default `'-'`). Grouping acts on the
  sorted/filtered row set in first-appearance group order (stable, never
  re-sorted); aggregates evaluate per group over the **full member set**
  (never the page slice). `count` ignores `field`; numeric aggregates skip
  missing/non-finite values and render `'-'` + a one-time dev warn
  (`gd-aggregate-no-valid-values`) when no valid member remains.
- Header row shape: full-width `colSpan=columnCount` row with
  `data-slot="table-group-header"` + `data-group-key` + `data-collapsed`,
  containing a chevron toggle button (`aria-expanded`, i18n-labelled), the
  group label, the member count, and the aggregate text
  (`{label ?? fn}: {value}`, `·`-joined). Member rows carry
  `data-row-group="<key>"`.
- Collapse: renderer-local state keyed by group key — survives data refreshes
  for surviving keys, evaporates with vanished groups. No schema state
  persistence channel (Follow-up pool).
- Pagination: slices the interleaved header+member display sequence (headers
  consume page slots; a page-leading header may render with zero members);
  `totalPages` derives from the sequence length while the pagination bar keeps
  reporting the row count. `selectAllMode: 'page'` select-all acts on the
  current page's member rows (headers not counted).
- Compatibility matrix: no `group` → byte-identical render (zero regression);
  `group` × treeMode → tree precedence, group inert + one-time warn
  (`gd-group-tree-clash`); `group` × `draggable` → group precedence (drag-sort
  affordances + ordering suppressed) + one-time warn (`gd-group-drag-clash`);
  `group` × `rowSelection` → headers are not selectable/render no checkbox,
  member rows select normally; `group` × `combineNum` → combine suppressed
  while grouped (merges must not cross group boundaries); `group` ×
  `optionRow` → member-row state markers unchanged.
- Fallback: missing/`null`/`undefined`/`''` field values route into the
  `missingLabel ?? '-'` group + one-time dev warn (`gd-group-missing-field`);
  rows are never dropped. Server-side pre-grouped contracts stay a data
  endpoint responsibility (kanban aggregate boundary — client expression
  semantics, server pre-computation reachable).
- Validation (`data-schema-validation.ts`): `group` requires `field`
  (`missing-required-field`); aggregate `fn` restricted to the five-value set
  and non-count aggregates require `field` (`invalid-property-shape`).

## Table Cell In-Place Edit Contract

Status: landed (live-verified 2026-08-31; owner plan
`docs/plans/2026-08-31-0721-2-d1-gd-grid-editing-semantic-components.md`, Phase 1
Decision 2/6 + Phase 3 implementation record; red-first matrices in
`packages/flux-renderers-data/src/__tests__/table-editable-cell.unit.test.tsx` +
`table-cell-edit-render.test.tsx`).

The `table` renderer grows cell-level in-place editing as a **layered channel
beside (not instead of) `quickEdit`** (C2 G-D second leg): a per-cell
navigation↔editing two-state machine with a type-dispatched editor matrix.

- `TableColumnSchema.editable?: boolean | TableCellEditableConfig` — `editor?: 'text'|'number'|'select'|'date'|'checkbox'`
  (default `'text'`, mapped onto the existing input-family widgets — zero
  `@nop-chaos/ui` export changes), `options?` (select editor), `required?`.
- Two-state machine: navigation state renders the same display text as a plain
  cell (`tabIndex=0`); click / Enter / F2 enter editing (editor mounted,
  auto-focused); Enter / blur (on change) commit; Esc cancels with zero writes
  and zero dispatches (`gd-cell-edit-cancel`). Validation failure
  (`required` empty / non-finite number) blocks the commit, surfaces
  `data-slot="table-editable-error"`, and keeps the editing state without
  losing focus or the draft (`gd-cell-edit-invalid`). Checkbox editor
  specializes: the toggle gesture IS edit+commit (two-state collapse, no
  persistent editing state).
- Write channels (CX-10 compliant): with `quickSaveItemAction ?? quickSaveAction`
  present, commit dispatches the save action on a field-override draft row
  scope (`field`/`$slot.record` overrides — `createDraftScopeStore` shared with
  the quickEdit controller), guarded by a save-generation counter and a record
  snapshot; success merges into the row scope, explicit `ok:false` or a throw
  notifies and keeps the draft + editing state (`gd-cell-edit-save-fail`).
  Absent actions, commit takes the pure client scope-write channel
  (`rowScope.update(field, value)` — zero dispatch, zero events). Editable
  cells never join the row-draft (`__row_save_bar__`) channel.
- Precedence and fallbacks: `editable` + `quickEdit` on one column → editable
  wins, the quickEdit control does not render, one-time dev warn
  (`gd-cell-edit-quickedit-coexist`, no double controls); unknown `editor`
  → read-only fallback + one-time warn (`gd-cell-edit-no-editor`); `editable`
  without a column `name` → read-only + one-time warn
  (`gd-cell-edit-no-name`). Without an `editable` declaration the cell renders
  byte-identical to before (zero regression).
- Row gesture isolation: the editable cell stops click/keydown propagation —
  an edit intent never triggers row click / `toggleOnRowClick` selection /
  row expand; cell-level Enter/F2 wins over the row-level Enter/Space relay by
  target.
- Keyboard (Decision 6 landed leg): Enter/F2 enter, Enter commit, Esc cancel,
  blur commit. Arrow-key cell roaming is `Deferred But Adjudicated` (needs a
  grid coordinate model; zero consuming pages — P6b fifteen-key table records
  the gap, not demand); the roving-helper extraction stays not-adopted
  (G-B2 Decision 5① conditional branch).
- Validation (`data-schema-validation.ts`): `editable` accepts boolean or the
  config object; `editor` restricted to the five-value set, `options` an
  array of objects, `required` boolean (`invalid-property-shape`).

## Recommended Reading Path

For deeper design intent, continue with:

- `docs/references/maintenance-checklist.md`
- `docs/references/terminology.md`
- `docs/references/runtime-and-renderer-faq.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/form-validation.md`

For historical draft material, see `docs/archive/nop-chaos-amis-renderer-interfaces.ts`.
