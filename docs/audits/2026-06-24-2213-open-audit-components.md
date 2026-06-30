> Audit Status: closed
> Audit Type: open-ended
> Mission: components

# Open-Ended Adversarial Audit — Mission `components`

- **Date**: 2026-06-24 (timestamp 22:13), execution `2026-06-24-2213-open-ended-adversarial-review-components`
- **Scope**: renderer + UI component packages. Rounds saved under `docs/analysis/2026-06-24-2213-open-ended-adversarial-review-components/`. This run deliberately probed the packages the predecessor audit (`docs/audits/2026-06-24-2213-open-audit-components.md`, status `planned`, F1–F4 / S1–S3, scoped to `flux-renderers-content` + `flux-renderers-layout`) listed as blind spots: **`ui`, `flux-renderers-data`, `flux-renderers-form-advanced`**, with spot-checks of `flux-renderers-basic` / `flux-renderers-form`.
- **Method**: `docs/skills/open-ended-adversarial-review-prompt.md`, code-driven (not dimension-driven). Lenses used opportunistically: _contract archaeologist_, _dead-code scavenger_, _cross-boundary messenger_, _lifecycle tracker_, _timing attacker_, _combination-explosion tester_. Every P0/P1 below was verified against live source (line numbers cited), not just reported from tooling.
- **Dedup baseline**: predecessor audit F1–F4/S1–S3 + `docs/references/reopened-design-decisions-and-audit-adjudications.md`. None of the findings below duplicate an adjudicated/reopened item. One finding (R3-1) is a _live residual_ previously noticed by a 2026-05-19 deep-audit but never remediated — reported as live, not as duplicate. The "lying contract" theme (H1) extends the predecessor's F2/F3 into new packages (new instances, broader impact) — explicitly distinguished below.

---

## HEADLINE

### H1 — The "advertised-but-unimplemented contract" defect is a repo-wide structural pattern; the missing piece is an automated guard, not more review

- **New verified instances this run** (all in `flux-renderers-data`):
  - `data-source` advertises `onSuccess` + `onError` event contracts with full payload schemas (`data-renderer-definitions.ts:400-422`, declared `kind:'event'` at `:447-448`), but `data-source-renderer.tsx` is an 86-line component that returns `null` and **never reads `props.events`** (verified: zero references). Error handling is routed only through `env.notify`.
  - `chart` advertises a `resize` capability (`chart-renderer.tsx:240-254`) whose handler is `const handleResize = () => { void chartRef.current; };` (`:229-231`) — a literal no-op returning `{ ok: true }`.
  - `pagination` advertises `pageOwnership: 'local'|'controlled'|'scope'` + `pageStatePath` (`w2a-data-composition-definitions.ts:104-122`, `schemas.ts:282-285`) that `pagination-renderer.tsx` never reads.
- **Why this is the headline**: the predecessor audit (F2 onPageChange/selectionOwnership, F3 qrcode onLoadError) already named this defect class and recommended _"a one-time contract ↔ renderer body diff pass over `flux-renderers-content` + `flux-renderers-layout`"_. That assumed the drift was confined to the two NEW packages. These new instances live in **`flux-renderers-data`** — an _established, stable_ package — proving the drift is not new-package churn. A grep shows `eventContracts:` declarations span **all 5 renderer packages** (basic, form, layout, data, content) with **no automated guard** asserting each declared contract is referenced. Spot-checking `flux-renderers-form` (`form-definition.ts:245-266`) shows its eventContracts are clean — so the drift correlates with **per-renderer test coverage**, not package age.
- **Confidence**: Certain.
- **Root-cause fix (highest ROI)**: add a contract guard (one test per package, or a shared `docs/references/audit-rules` rule) that, for each `RendererDefinition`, asserts every key under `eventContracts` / `fields`(`kind:'event'`) / `componentCapabilityContracts` is referenced by the renderer body or its registered `ComponentHandle`. This would have caught H1 (3 instances), the predecessor's F2/F3, and converts a _recurring adversarial rediscovery_ into a _test-time failure_. Prioritise the guard over `flux-renderers-data` + `flux-renderers-content` + `flux-renderers-layout` (the lower-coverage cluster).

---

## P0 — Silent functional correctness defects (verified)

### P0-1 — Table row-drag `statePath` is wired to `columnWidthsStatePath` (copy-paste contract bug) + `useRowDragSort` can't persist in `'local'`

- **Where**: `packages/flux-renderers-data/src/table-renderer.tsx:303-309` (`statePath: schemaProps.columnWidthsStatePath`), `packages/flux-renderers-data/src/table-renderer/use-row-drag-sort.ts:50-130`.
- **What**: Row order is written to the scope slot meant for **column-width** persistence. Worse, `useRowDragSort` has **no internal `useState` for order** — in `'local'` ownership the only persistence is `renderScope.update(statePath...)` (`:113-121`); without a `statePath`, the reorder is discarded on the next render. And `'controlled'` ownership is in the type union but **never handled** (falls through, no-op). The dev warning (`:57-61`) only mentions `orderField`.
- **Why it matters**: `draggable: true` + `orderField` gives a drag that doesn't persist anywhere correct and corrupts any `columnWidthsStatePath` consumer. Two defects (wrong path + missing local state) compound.
- **Confidence**: Certain.

### P0-2 — `<Toaster>` self-sabotages: trailing `{...props}` overwrites every default it just set

- **Where**: `packages/ui/src/components/ui/sonner.tsx:14-41`.
- **What**: `className="toaster group"`, the custom `icons` map, `toastOptions`, and `style` (carrying `zIndex: TOASTER_Z_INDEX` + the three `--normal-*` CSS vars) are set, then `{...props}` (`:39`) spreads last and overrides them. Most call sites render `<Toaster />` with no props → those become `undefined`. Net: the exported `TOASTER_Z_INDEX = 10000` is **never applied**, the className is dropped, Sonner defaults win.
- **Why it matters**: A silent feature regression hiding in plain sight — the file _looks_ like it configures z-index/theme/icons but doesn't. Fix: spread `{...props}` first.
- **Confidence**: Certain.

### P0-3 — Chart `resize` capability is a literal no-op AND the ResizeObserver never attaches in the common async-load case

- **Where**: `packages/flux-renderers-data/src/chart-renderer.tsx` — `resize` no-op `:229-231` (exposed `:240-254`); ResizeObserver empty deps `:101-118` bails when `chartRef.current` is null (`:106-108`), but the canvas `<div ref={chartRef}>` renders only when `!isEmpty` (`:396-446`).
- **What**: A chart bound to an async source mounts empty → `chartRef.current === null` → effect bails and never re-runs (empty deps) → when data arrives and the canvas mounts, **no `ResizeObserver` is ever attached** → `containerWidth` stays `null` → `data-responsive-supported` never becomes `'true'`, the narrow-height mobile clamp (`:197-200`) never engages, the compact legend (`:206`) never applies.
- **Why it matters**: Responsive sizing is broken for every async chart (the common case); the `resize` capability an author would call to force a re-layout does nothing and returns `{ ok: true }`. Two independent defects in one component.
- **Confidence**: Certain.

### P0-4 — List fallback key `item:${per-window-index}` collides across pages → cross-page selection bleed + reconciliation state leak

- **Where**: `packages/flux-renderers-data/src/list-renderer.tsx:40-49` (`toListItemKey` fallback `item:${index}`) + `:395-396` (`visibleItems.map((item, index) => { const itemKey = toListItemKey(item, keyField, index); ... key={itemKey}`).
- **What**: `index` is the position within the paginated window, so every page reuses `item:0..pageSize-1`. React reconciles `ListItemView` across pages via identical keys → item-scope state leaks between unrelated records; `selectedKeys.has('item:0')` stays true on page 2 after selecting row 0 on page 1; the instance-frame path (`:399`) is non-unique across pages. (Contrast: the structural `loop` renderer uses the _full-array_ index (`structural-loop.tsx:84`), which is safe because it isn't paginated — the list bug is specifically the windowed-index choice.)
- **Why it matters**: Wrong selection highlight + stale scope state whenever rows lack a stable `keyField`, under any pagination/infinite mode.
- **Confidence**: Certain.

### P0-5 — `projected-form-runtime` drops the `AbortSignal` on every validation method, and `clearErrors()` wipes the entire parent form

- **Where**: `packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.ts:285-378` (validation methods omit the `options?: { signal? }` arg) and `:336-338`.
- **What**:
  1. `FormRuntime.validateAt/validateField/validateSubtree/validateAll` accept an optional `options?: { signal?: AbortSignal }`. The projected proxy forwards only `(path, reason)` — the signal is silently dropped. TypeScript doesn't catch it (fewer-param fns are assignable to more-param signatures). The sibling `projected-validation-runtime.ts:280-288` forwards it correctly. Any nested editor (object-field, condition-builder item, variant-field) that passes an `AbortSignal` loses abort capability.
  2. `clearErrors(path)` forwards `path === undefined ? undefined : options.prefixPath(path)`. `FormRuntime.clearErrors(undefined)` means "clear **all** errors" — so `projectedForm.clearErrors()` wipes errors across the **entire parent form**.
- **Why it matters**: One shared factory (`createProjectedFormRuntime`) feeds `array-field-runtime`, `object-field`, `condition-builder`, `variant-field-runtime`, `projected-inline-form` — both gaps ripple across every composite/projected editor. The clearErrors footgun can silently destroy validation state of unrelated sibling fields.
- **Confidence**: Certain.

### P0-6 — `array-field` Add/Remove buttons silently no-op when there is no parent form

- **Where**: `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:434-463`.
- **What**: `handleAdd` and `handleRemove` are both guarded `if (parentForm) { … }` with no `else`. The buttons still render (`addable && !readOnly && !effectiveDisabled`, `:578`). In scope-only mode clicking does nothing. Every sibling composite editor (`combo`, `input-table`, `array-editor`, `key-value`) routes through a `writeValue`/`syncItems` path that handles both modes; array-field is the lone outlier.
- **Why it matters**: User-visible silent failure of a primary interaction in a legitimate configuration.
- **Confidence**: Certain.

---

## P1 — High-value secondary findings

### P1-1 — `condition-builder` `useCallback(fn, deps)()` is a memoization no-op

- **Where**: `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:137-140`.
- **What**: The trailing `()` invokes the memoized callback on **every render**, so `evaluateFormula` is a fresh closure each render and the `useCallback` provides zero benefit; downstream effects (`value-input.tsx:174-192`) re-fire every render. Should be `useMemo(() => createFormulaEvaluator(...), [deps])`. Doubly redundant under React Compiler.
- **Confidence**: Certain.

### P1-2 — `useDialogDrag` leaves `document.body.userSelect = 'none'` stuck if the dialog unmounts mid-drag

- **Where**: `packages/ui/src/components/ui/use-dialog-drag.ts:170-171` (set), `:125-126` (restored only in `stopDrag`), `:214-224` (unmount cleanup removes listeners but never restores `userSelect`).
- **What**: If the dialog closes/unmounts mid-drag (outside-click, ESC, parent re-render), the body `user-select:none` / `-webkit-user-select:none` are never cleared → the whole document stays un-selectable. (Listeners attach to `el`, so they GC with the node — the leak is specifically the body style.)
- **Confidence**: Likely.

### P1-3 — `Card` with `onClick` becomes an interactive `<div>` with no role / tabIndex / keyboard handler (a11y)

- **Where**: `packages/ui/src/components/ui/card.tsx:5-25`.
- **What**: When `onClick` is passed, the card lights up `nop-haptic` and attaches `onClick`, but gains no `role="button"`, no `tabIndex={0}`, no `onKeyDown` (Enter/Space). Keyboard + screen-reader users cannot activate it (WCAG 2.1.1).
- **Confidence**: Certain (a11y defect).

### P1-4 — `Carousel` capture-phase ArrowLeft/Right hijacks in-slide form controls

- **Where**: `packages/ui/src/components/ui/carousel.tsx:77-85` + `:121` (`onKeyDownCapture`).
- **What**: Capture-phase `preventDefault()` on ArrowLeft/Right for the whole carousel region, before descendants see them. Slides commonly contain inputs/sliders/nested carousels; caret movement and range thumbs break. Also not the WAI-APG carousel pattern (expects roving tabindex on slide content).
- **Confidence**: Likely.

### P1-5 — `SidebarProvider` Cmd/Ctrl+B hijacks inside inputs / contenteditable

- **Where**: `packages/ui/src/components/ui/sidebar-context.tsx:68-78`.
- **What**: The global `keydown` listener fires `toggleSidebar()` on Cmd/Ctrl+B with no `event.target` filtering. Any host app using Cmd+B for bold, or a user typing in any input while a sidebar is mounted, gets hijacked + `preventDefault()`ed.
- **Confidence**: Likely.

### P1-6 — Table "select all" operates on the raw source, not the filtered view; header checkbox state is inconsistent

- **Where**: `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:68-71,116-132`; hook invoked with raw `source` at `table-renderer.tsx:209` (filtering is separate, `table-renderer.tsx:225`).
- **What**: Under active column filters/search: (1) `handleSelectAll(true)` selects rowKeys of **every row in the unfiltered source**, including filtered-out rows; (2) `allSelected` returns true only when _all_ unfiltered rows are selected, so the header checkbox can essentially never show "checked" while a filter excludes any row (the header receives a filtered `sourceLength`, but its `checked` predicate uses the unfiltered set).
- **Why it matters**: Bulk selection selects invisible records and leaks them into `$crud.selectedRowKeys` / `getSelection()`; the checkbox state is misleading.
- **Confidence**: Likely.

### P1-7 — Table selection keys are never pruned when rows disappear (selection drifts from reality)

- **Where**: `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:32-34` (initialized once), entire 312-line file (no pruning effect).
- **What**: `localSelectedRowKeys` is mutated only by the three handlers; nothing intersects it against the current `normalizedRows`. After upstream row removal (server delete, filter change, re-query), dead keys linger forever, polluting `getSelection()`, `$crud.selectedRowKeys`, and `selectionCount`. The table-side analog of P0-4 — selection correctness is a weak area across both list and table.
- **Confidence**: Likely.

### P1-8 — The `ui` → `flux-i18n` injection bridge (`setI18nGetter`) is never wired; 18 a11y-critical UI strings are permanently English

- **Where**: Bridge `packages/ui/src/lib/i18n.ts:37-47`; 18 consumers (`carousel.tsx`, `sidebar-layout.tsx`, `sheet.tsx`, `breadcrumb.tsx`, `dialog.tsx`, `drawer.tsx`, `pagination.tsx`) — predominantly `aria-label`/`aria-roledescription`/`sr-only`. Claimed wiring (`docs/logs/2026/05-13.md:147`, `docs/archive/plans/262-…:142`) in `packages/flux-bundle/src/index.tsx` **does not exist** (74-line file imports neither `@nop-chaos/ui` nor `setI18nGetter`). Repo-wide grep = zero production call sites. Previously noticed 2026-05-19 (`docs/archive/analysis/2026-05-19-deep-audit-full/18-cross-package.md:23`) and left open.
- **What**: The DI seam that lets the zero-`@nop-chaos/*`-dep `ui` package localize chrome through the active `flux-i18n` instance is dead. Every `ui`-component `t('flux.*')` resolves to the internal English `messages` map regardless of host locale; renderer packages localize correctly (they import `t` from `@nop-chaos/flux-i18n` directly).
- **Why it matters**: Non-English-locale screen-reader users get English a11y chrome for dialogs/drawers/carousels/pagination/sidebars (WCAG language-of-page expectation); plus a doc↔code contradiction. Live residual, not a duplicate.
- **Confidence**: Certain.

---

## Secondary / lower blast radius (noted, not exhaustively re-verified)

- **S-1** — `use-infinite-scroll.ts` overwrites a shared `window.__crudInfiniteObserver` per instance; concurrent infinite-scroll lists/CRUDs clobber each other's test hook. (`flux-renderers-data`)
- **S-2** — `tree-renderer.tsx` recomputes full-tree `collectTreeNodeIds` + `computeTreeSearch` every render (no memo) — O(N)/render on large trees. (`flux-renderers-data`)
- **S-3** — `key-value.tsx` calls `validateSubtree(name)` without a `'change'` reason while siblings pass `'change'` — inconsistent validation gating. (`flux-renderers-form-advanced`)
- **S-4** — `combo` advertises a `multiple` prop the renderer never reads; `transfer` reads an undeclared `searchOnly` prop. (`flux-renderers-form-advanced`)
- **S-5** — `FieldTitle` and `FieldLabel` both emit `data-slot="field-label"` → ambiguous CSS/test selectors. (`ui`)
- **S-6** — `ChartLegendContent`/`ChartTooltipContent` use `key={item.value}` / `key={name}` which can collide (React dedups → a row vanishes). (`ui`)
- **S-7** — Redundant hand-written `useMemo`/`useCallback`/`React.memo` without `eslint-disable-next-line react-compiler/react-compiler` across the NEW and data packages (e.g. `LoopProvider`/`RecurseProvider` contextValue, chart `chartHandle`, table `DataRowView` memo). Per `docs/skills/react19-best-practices-review.md` these are redundant under React Compiler; low priority but sets the wrong precedent in new code.

---

## Overall assessment — the 3 directions most worth attention

1. **Enforce contract honesty automatically (H1).** The single highest-leverage fix is a "declared contract must be referenced" guard across renderer definitions. It would have caught H1's three new instances _and_ the predecessor's F2/F3, and it converts a defect class that keeps being rediscovered by adversarial audits into a test-time failure. The drift correlates with per-renderer test coverage (forms are clean; data/content/layout drift), so target the guard + a regression pass at the low-coverage cluster.
2. **`flux-renderers-data` has multiple independent silent-correctness defects in "stable" features.** Table drag-sort path wiring + missing local state (P0-1), chart resize/observer (P0-3), list cross-page keys (P0-4), table select-all-vs-filters + stale selection (P1-6/P1-7). These are not new-package teething bugs; they look like untested edge paths in shipped code. A focused regression pass on `table` + `chart` + `list` (pagination/selection) is warranted, with the selection-state-vs-visible-data invariant made explicit in both list and table.
3. **The `createProjectedFormRuntime` factory (P0-5) and the `ui` i18n bridge (P1-8) are each single points of contract dishonesty** that silently under-deliver a documented interface across a whole family. Hardening the factory (forward `options`; make `clearErrors(undefined)` scope-local) fixes every composite editor at once; wiring `setI18nGetter` (or documenting `ui` chrome as English-only) removes the doc↔code contradiction.

## Blind-spot self-assessment

- **`flux-renderers-basic` structural renderers** were body-audited in Round 4 (`loop`/`recurse`/`structural-loop`): found **clean** — full-array index keys (no list-style pagination collision), proper `maxDepth`/`instancePath` threading. Only a redundant `useMemo` and a minor `keyBy` bare-field-name edge (non-`id`/`key`/`name` fields are silently ignored) noted; no high-value defect.
- **`flux-renderers-form` (basic fields)** was only spot-checked (eventContracts clean). A dedicated pass on field-level value binding / `transformIn`/`transformOut` is still open.
- **Accessibility** was sampled (Card, Carousel, Sidebar, i18n chrome). A dedicated keyboard/screen-reader pass on table/grid focus traps and `condition-builder` reorder semantics remains open.
- **Performance at 10× scale** was flagged as likely-but-unmeasured (tree O(N)/render S-2, row-scope cache identity churn, CRUD `$crud` summary identity churn). No empirical measurement was taken.
- **Round 4** found no new high-value issue → the audit stops here per the skill's stop rule.

## Cross-references (for remediation planning)

- Predecessor audit: `docs/audits/2026-06-24-2213-open-audit-components.md` (F1–F4 / S1–S3). H1 extends F2/F3; the others are in disjoint packages.
- Round evidence: `docs/analysis/2026-06-24-2213-open-ended-adversarial-review-components/round-01.md` … `round-04.md`.
- Related contract docs: `docs/references/renderer-interfaces.md`, `docs/architecture/renderer-runtime.md`, `docs/skills/react19-best-practices-review.md`.
