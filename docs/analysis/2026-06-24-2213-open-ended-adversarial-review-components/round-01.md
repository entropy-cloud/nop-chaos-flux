# Round 01 — `ui` / `flux-renderers-data` / `flux-renderers-form-advanced`

> Execution: `2026-06-24-2213-open-ended-adversarial-review-components`
> Lenses: _contract archaeologist_, _dead-code scavenger_, _cross-boundary messenger_, _lifecycle tracker_, _timing attacker_.
> Dedup baseline: prior `docs/audits/2026-06-24-2213-open-audit-components.md` (F1–F4 / S1–S3) was scoped to `flux-renderers-content` + `flux-renderers-layout`. This round deliberately probed the three packages that prior audit listed as blind spots (`ui`, `flux-renderers-data`, `flux-renderers-form-advanced`). Every finding below was verified against live source (line numbers cited).

---

## HEADLINE (the one finding that reframes the others)

### H1 — The "advertised-but-unimplemented contract" defect is a repo-wide structural pattern, not a new-package teething problem

- **Where (new instances this round)**:
  - `flux-renderers-data`: `data-source` advertises `onSuccess` + `onError` event contracts (full payload schemas in `data-renderer-definitions.ts:400-422`, declared as `kind:'event'` fields at `:447-448`) but `data-source-renderer.tsx` is an 86-line component that returns `null` and **never reads `props.events`** (verified: zero references in the body). Error handling is routed only through `env.notify`.
  - `flux-renderers-data`: `chart` advertises a `resize` capability (`chart-renderer.tsx:240-254`) whose handler is `const handleResize = () => { void chartRef.current; };` (`:229-231`) — a literal no-op that returns `{ ok: true }`.
  - `flux-renderers-data`: `pagination` advertises `pageOwnership: 'local'|'controlled'|'scope'` + `pageStatePath` (`w2a-data-composition-definitions.ts:104-122`, `schemas.ts:282-285`) that `pagination-renderer.tsx` never reads.
- **Why this is the headline, not three separate P2s**: The prior audit (F2 onPageChange/selectionOwnership, F3 qrcode onLoadError) already named this defect class and recommended _"a one-time contract ↔ renderer body diff pass over `flux-renderers-content` + `flux-renderers-layout`"_. That recommendation assumed the drift was confined to the two NEW packages. These new instances live in **`flux-renderers-data`** — an _established, stable_ package — proving the drift is not new-package churn. The root cause is the absence of an **automated guard**: nothing asserts that every `eventContracts` / `propContracts` / `componentCapabilityContracts` entry declared in a renderer definition is actually referenced by the renderer body (or by a capability handle it registers).
- **Confidence**: Certain (verified each renderer body against its manifest).
- **Root-cause fix (highest ROI)**: add a contract test (one per package, or a shared `docs/references/audit-rules` guard) that, for each `RendererDefinition`, greps the component/handle source for every field key declared under `eventContracts`/`fields`(`kind:'event'`)/`componentCapabilityContracts` and fails on zero references. This converts an entire family of silent-fail bugs into a compile-time/test-time error instead of requiring per-package adversarial rediscovery.

---

## P0 — Silent functional correctness defects (verified)

### P0-1 — Table row-drag `statePath` is wired to `columnWidthsStatePath` (copy-paste contract bug)

- **Where**: `packages/flux-renderers-data/src/table-renderer.tsx:303-309`
  ```ts
  const rowDragSortApi = useRowDragSort({
    enabled: schemaProps.draggable === true,
    orderField: schemaProps.orderField,
    statePath: schemaProps.columnWidthsStatePath, // ← column-widths path, not a row-order path
    ownership: 'local',
    rows: processedData,
  });
  ```
- **What**: Row order is written to the scope slot meant for column-width persistence. Worse, `useRowDragSort` (`use-row-drag-sort.ts:50-130`) has **no internal `useState` for order** — in `'local'` ownership the only persistence path is `renderScope.update(statePath...)` (`:113-121`); without a `statePath` the reorder is discarded on the next render. And `'controlled'` ownership is in the type union but **never handled** (falls through, no-op). The dev warning (`:57-61`) only mentions `orderField`.
- **Why it matters**: A schema author setting `draggable: true` + `orderField` gets a drag that (a) doesn't persist anywhere correct, and (b) corrupts any consumer of `columnWidthsStatePath`. `draggable` + `columnWidthsStatePath` together write row-order payloads into the column-widths slot.
- **Confidence**: Certain.

### P0-2 — `<Toaster>` self-sabotages: trailing `{...props}` overwrites every default it just set

- **Where**: `packages/ui/src/components/ui/sonner.tsx:14-41`
- **What**: `className="toaster group"`, the custom `icons` map, `toastOptions`, and `style` (which carries `zIndex: TOASTER_Z_INDEX` + the three `--normal-*` CSS vars) are all set, then `{...props}` (line 39) spreads last and overrides them. Because most call sites render `<Toaster />` with no props, `props.className`/`props.icons`/`props.toastOptions` are `undefined` → those props become `undefined`. Net: the exported `TOASTER_Z_INDEX = 10000` is **never applied**, the `toaster group` className is dropped, and the Sonner default icons/config win.
- **Why it matters**: A silent feature regression hiding in plain sight. The file _looks_ like it configures z-index, theme vars, and icons, but doesn't. Fix is ` <Sonner {...props} theme={...} className={...} ... />` (explicit last).
- **Confidence**: Certain.

### P0-3 — Chart `resize` capability is a literal no-op AND the ResizeObserver never attaches in the common async-load case

- **Where**: `packages/flux-renderers-data/src/chart-renderer.tsx`
  - `resize` no-op: `:229-231` (`const handleResize = () => { void chartRef.current; };`) exposed via `:240-254`.
  - ResizeObserver empty deps: `:101-118` (`useEffect(..., [])`) bails when `chartRef.current` is null (`:106-108`), but the canvas `<div data-slot="chart-canvas" ref={chartRef}>` is only rendered when `!isEmpty` (`:396-446`).
- **What**: A chart bound to an async source mounts in the empty state → `chartRef.current === null` → the effect bails and never re-runs (empty deps) → when data arrives and the canvas mounts, **no `ResizeObserver` is ever attached** → `containerWidth` stays `null` → `data-responsive-supported` never becomes `'true'`, the narrow-height mobile clamp (`:197-200`) never engages, the compact legend (`:206`) never applies. The chart's responsive behavior silently dies in the single most common usage (fetch-driven data).
- **Why it matters**: Responsive chart sizing is broken for every async chart; the `resize` capability that an author would call to "force a re-layout" does nothing and returns `{ ok: true }`. Two independent defects in one component, both invisible to the type system.
- **Confidence**: Certain.

### P0-4 — List fallback key `item:${per-window-index}` collides across pages → cross-page selection bleed + reconciliation state leak

- **Where**: `packages/flux-renderers-data/src/list-renderer.tsx:40-49` (`toListItemKey` fallback `item:${index}`) + `:395-396` (`visibleItems.map((item, index) => { const itemKey = toListItemKey(item, keyField, index); ... key={itemKey}`).
- **What**: `index` is the position within `visibleItems` (the paginated window), so every page reuses the same fallback keys `item:0..pageSize-1`. Consequences: (1) React reconciles `ListItemView` instances across pages via identical keys → item-scope state leaks between unrelated records; (2) `selectedKeys.has('item:0')` is true on page 2 if row 0 was selected on page 1 → selection drift across pages; (3) the instance-frame path (`instanceKey: itemKey`, `:399`) is non-unique across pages, confusing per-item scoping.
- **Why it matters**: Wrong selection highlight + stale scope state whenever rows lack a stable `keyField` (or `keyField` is unset). The fallback is unsafe under any pagination/infinite mode.
- **Confidence**: Certain.

### P0-5 — `projected-form-runtime` drops the `AbortSignal` on every validation method, and `clearErrors()` wipes the entire parent form

- **Where**: `packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.ts:285-378` (validation methods omit the `options?: { signal? }` arg) and `:336-338`.
- **What**:
  1. `FormRuntime.validateAt/validateField/validateSubtree/validateAll` (`flux-core` interface) accept an optional `options?: { signal?: AbortSignal }`. The projected proxy forwards only `(path, reason)` — the signal is silently dropped on every call. TypeScript does not catch it (fewer-param fns are assignable to more-param signatures). The sibling `projected-validation-runtime.ts:280-288` forwards it correctly. Any nested editor (object-field, condition-builder item, variant-field) that passes an `AbortSignal` loses abort capability.
  2. `clearErrors(path)` forwards `path === undefined ? undefined : options.prefixPath(path)`. `FormRuntime.clearErrors(undefined)` means "clear **all** errors". So a nested renderer calling `projectedForm.clearErrors()` (intending "clear my projected scope") wipes errors across the **entire parent form**.
- **Why it matters**: One shared factory (`createProjectedFormRuntime`) feeds `array-field-runtime`, `object-field`, `condition-builder`, `variant-field-runtime`, `projected-inline-form` — so both gaps ripple across every composite/projected editor. The clearErrors footgun can silently destroy validation state of unrelated sibling fields.
- **Confidence**: Certain.

### P0-6 — `array-field` Add/Remove buttons silently no-op when there is no parent form

- **Where**: `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:434-463`
- **What**: `handleAdd` and `handleRemove` are both guarded `if (parentForm) { … }` with no `else`. The buttons still render (`addable && !readOnly && !presentation.effectiveDisabled`, `:578`; `removable && …`, `:570`). In scope-only mode (no `parentForm`), clicking does nothing. Every sibling composite editor (`combo`, `input-table`, `array-editor`, `key-value`) routes through a `writeValue`/`syncItems` path that handles both modes; array-field is the lone outlier.
- **Why it matters**: User-visible silent failure in a primary interaction (add/remove array item) for a legitimate configuration.
- **Confidence**: Certain.

---

## P1 — High-value secondary findings (verified or high-likelihood)

### P1-1 — `condition-builder` `useCallback(fn, deps)()` is a memoization no-op

- **Where**: `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:137-140`
- **What**: `const evaluateFormula = useCallback(() => createFormulaEvaluator(...), [deps])();` — the trailing `()` invokes the memoized callback on **every render**, so `evaluateFormula` is a fresh closure each render and the `useCallback` provides zero benefit. Downstream effects depending on it (e.g. `value-input.tsx:174-192`) re-fire every render. Should be `useMemo(() => createFormulaEvaluator(...), [deps])`. (Doubly redundant under React Compiler.)
- **Confidence**: Certain.

### P1-2 — `useDialogDrag` leaves `document.body.userSelect = 'none'` stuck if the dialog unmounts mid-drag

- **Where**: `packages/ui/src/components/ui/use-dialog-drag.ts:170-171` (set), `:125-126` (restored only in `stopDrag`), `:214-224` (unmount cleanup removes listeners but never restores `userSelect`).
- **What**: If the dialog closes/unmounts while a header drag is in progress (outside-click, ESC, parent re-render), the cleanup removes the pointer listeners but not `document.body` `user-select:none`/`-webkit-user-select:none`. The whole document stays un-selectable. (Note: listeners are attached to `el`, so they GC with the node — the leak is specifically the body style.)
- **Why it matters**: Highly visible "can't select text anywhere" regression that is hard to attribute to a closed dialog.
- **Confidence**: Likely.

### P1-3 — `Card` with `onClick` becomes an interactive `<div>` with no role / tabIndex / keyboard handler (a11y)

- **Where**: `packages/ui/src/components/ui/card.tsx:5-25`
- **What**: When `onClick` is passed, `isInteractive` lights up `nop-haptic` and attaches `onClick`, but the card gains no `role="button"`, no `tabIndex={0}`, and no `onKeyDown` (Enter/Space). Keyboard + screen-reader users cannot activate it (WCAG 2.1.1).
- **Confidence**: Certain (a11y defect).

### P1-4 — `Carousel` capture-phase ArrowLeft/Right hijacks in-slide form controls

- **Where**: `packages/ui/src/components/ui/carousel.tsx:77-85` (handler) + `:121` (`onKeyDownCapture`).
- **What**: Capture-phase interception `preventDefault()`s ArrowLeft/Right for the whole carousel region before descendants see them. Slides commonly contain inputs/sliders/nested carousels; caret movement and range thumbs break. Also not the WAI-APG carousel pattern (expects roving tabindex on slide content, not a global key capture).
- **Confidence**: Likely.

### P1-5 — `SidebarProvider` Cmd/Ctrl+B hijacks inside inputs / contenteditable

- **Where**: `packages/ui/src/components/ui/sidebar-context.tsx:68-78`
- **What**: The global `keydown` listener fires `toggleSidebar()` on Cmd/Ctrl+B with no `event.target` filtering. Any host app using Cmd+B for bold (rich-text editor), or a user typing in any input while a sidebar is mounted, gets hijacked + `preventDefault()`ed.
- **Confidence**: Likely.

---

## Overall assessment (this round)

1. **The single most leveraged fix is the automated contract guard described in H1.** It would have caught H1 (3 instances), and would retroactively have caught the prior audit's F2/F3 — i.e. it turns a _recurring adversarial rediscovery_ into a _test-time failure_. Today the project relies on a human remembering to diff each `RendererDefinition`'s manifest against its body; that has already failed across at least two packages and will keep failing.
2. **`flux-renderers-data` has several independent silent-correctness defects in core features** (table drag-sort path wiring P0-1, chart resize/observer P0-3, list cross-page keys P0-4). Unlike the content/layout packages, this package is labeled "stable" — these are not new-package teething bugs; they look like untested edge paths in shipped code. A focused regression pass on `table` + `chart` + `list` pagination/selection is warranted.
3. **The `createProjectedFormRuntime` factory (P0-5) is a single point of contract dishonesty** that silently under-delivers the `FormRuntime` interface across every composite editor. Hardening that one factory (forward `options`, make `clearErrors(undefined)` scope-local) fixes a whole class at once.

## Blind-spot self-assessment

- Did not deeply audit `flux-renderers-basic` (structural/display) or `flux-renderers-form` (basic fields) — Round 2 candidate.
- Did not stress-test the table "select-all ignores filters" / "selection never pruned" claims from exploration (flagged but not yet independently re-verified to "certain"); parked for a verification round.
- Accessibility was only sampled (Card, Carousel, Sidebar). A dedicated a11y pass on table/grid/dialog focus traps is still open.
- Did not measure actual re-render cost at scale (tree O(N) per render, row-scope cache identity churn) — flagged as likely but unmeasured.
