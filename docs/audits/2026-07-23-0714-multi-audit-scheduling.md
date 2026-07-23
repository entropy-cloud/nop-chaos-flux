> Audit Status: closed
> Audit Type: multi-dimensional
> Mission: scheduling

# Multi-Dimensional Audit: `flux-renderers-scheduling`

**Package**: `@nop-chaos/flux-renderers-scheduling`
**Components**: Gantt, Kanban, Calendar, BarcodeInput
**Audit Date**: 2026-07-23
**Baseline**: v1 / no compatibility burden / no transitional main-path allowances
**Sub-agents deployed**: 7 (5× first-round group + 2× independent review)

---

## Scope & Methodology

Audited 23 dimensions across `packages/flux-renderers-scheduling/` (95 source files, 72 test files). First-round analysis via 5 parallel group agents covering architecture, state/async, renderer/UI, quality/safety, and display/integration. Independent review verified all P1/P2 findings against live code.

---

## Finding Index

| ID      | Dimension        | Severity | Summary                                                                                                |
| ------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| **F01** | 03 (API Surface) | P2       | Gantt lifecycle `onMount`/`onUnmount` uses `kind: 'meta'` vs `kind: 'event'` in all others             |
| **F02** | 10 (Styling)     | P2       | Hardcoded hex colors in CSS (kanban.css worst, >15 values)                                             |
| **F03** | 10 (Styling)     | P2       | Unscoped `[data-slot]` selectors in barcode-input.css leak cross-package                               |
| **F04** | 12 (Field/Slot)  | P2       | BarcodeInput `wrap:true` + internal `<Label>` produces double label rendering                          |
| **F05** | 12 (Field/Slot)  | P2       | BarcodeInput missing `aria-describedby` for validation errors                                          |
| **F06** | 20 (A11y)        | P2       | BarcodeInput missing `aria-required` when field is required                                            |
| **F07** | 19 (Error)       | P2       | BarcodeInput scanner failure (handleScanClick/handleFocus) silently hidden from user                   |
| **F08** | 19 (Error)       | P2       | Calendar `exportToPNG` never rejects — callers cannot catch errors                                     |
| **F09** | 19 (Error)       | P2       | Kanban filter expression compilation error silently dropped (console.warn only)                        |
| **F10** | 04 (State)       | P2       | Calendar `_resourceOpenMap` not reconciled when `resourcesData` changes                                |
| **F11** | 14 (Test)        | P2       | Deprecated dead code exported: `useKanbanCollab`, `useKanbanAdder`, `GanttCompact`                     |
| **F12** | 16 (Docs)        | P2       | `quick-reference.md` missing `flux-renderers-scheduling` package entry                                 |
| **F13** | 05 (Reactivity)  | P2       | Kanban `useScopeSelector` returns full `BoardData` with only `Object.is` comparison                    |
| **F14** | 15 (Perf)        | P3       | `detectConflicts` uses `Array.includes()` inside loop — Set would be O(1)                              |
| **F15** | 02 (Module)      | P2       | `kanban-board.tsx` (739 lines) mixes 6 concerns; `calendar.tsx` (581 lines) duplicates scope branching |
| **F16** | 13 (Types)       | P2       | GanttStore `as unknown as new (...)` type assertion misleads consumers                                 |
| **F17** | 03 (API)         | P3       | `BarcodeInputSchema` missing from type-contract regression tests (`boundary-narrowing.test.ts`)        |
| **F18** | 17 (Naming)      | P3       | `prepare-wasm.ts` naming inconsistent with `*-utils.ts` convention                                     |
| **F19** | 11 (UI)          | P3       | Raw `<table>` in `gantt-grid.tsx` — acceptable due to virtual scrolling requirements                   |
| **F20** | 15 (Perf)        | P3       | `kanban-helpers` splice mutation concern — REJECTED by review (uses `structuredClone`)                 |

---

## Detailed Findings

### F01 — Gantt lifecycle `kind` mismatch [Dim03-1]

- **File**: `packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.ts:45-46`
- **Evidence**:
  ```typescript
  // Gantt (line 45-46)
  { key: 'onMount', kind: 'meta' },
  { key: 'onUnmount', kind: 'meta' },
  // Kanban (line 92-93), Calendar (line 151-152), BarcodeInput (barcode-input-schemas.ts:30-31)
  { key: 'onMount', kind: 'event' },
  { key: 'onUnmount', kind: 'event' },
  ```
- **Severity**: P2
- **Risk**: Gantt lifecycle actions bypass the action pipeline (treated as meta data). Authors writing `onMount`/`onUnmount` across scheduling renderers get inconsistent behavior.
- **Fix**: Change Gantt's `onMount`/`onUnmount` from `kind: 'meta'` to `kind: 'event'`.

### F02 — Hardcoded CSS color values [Dim10-01]

- **Files**: `kanban.css` (~15 values), `gantt.css` (2 values: `#fff`, `#f3f4f6`), `calendar.css` (event type colors), `barcode-input.css` (`#f1f5f9`)
- **Evidence**: `kanban.css:6` (`#fff`), `kanban.css:18` (`#f9fafb`), `kanban.css:22` (`#e5e7eb`), etc.
- **Severity**: P2
- **Risk**: Breaks dark mode/theme customization. The project's theme-independence mandate requires CSS variables.
- **Fix**: Replace with `var(--color-background)`, `var(--color-muted)`, `var(--color-border)`, `var(--color-foreground)`, `var(--color-primary)`, etc. Available variables: `--color-background`, `--color-foreground`, `--color-muted`, `--color-muted-foreground`, `--color-border`, `--color-primary`, `--color-ring`, `--color-card`, `--color-accent`, `--color-destructive`, `--color-warning`, `--color-success`, `--color-info`.

### F03 — Unscoped `[data-slot]` selectors in barcode-input.css [Dim10-02]

- **File**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.css:16-43`
- **Evidence**:
  ```css
  [data-slot='barcode-scan-button']:hover { ... }
  [data-slot='barcode-scanner-overlay'] { ... }
  ```
- **Severity**: P2
- **Risk**: Global selectors leak to any component in the document with matching `data-slot` attributes.
- **Fix**: Scope under `.nop-barcode-input [data-slot='...']`.

### F04 — BarcodeInput double label rendering [Dim12-04]

- **File**: `packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.ts:169` (`wrap: true`) + `barcode-input.tsx:227-228`
- **Evidence**: `wrap: true` causes `FieldFrame` to render a label. The renderer independently renders `<Label>` from `resolved.label`. Default `frameWrap` resolution returns `'label'` mode.
- **Severity**: P2
- **Risk**: Visible double-label in DOM — accessibility violation (duplicate label associations) and visual layout duplication.
- **Fix**: Either set `frameWrap: 'none'` in the definition and let the renderer manage its own label, or remove the internal `<Label>` and rely on `FieldFrame`.

### F05 — BarcodeInput missing `aria-describedby` for errors [Dim12-02 / Dim20-01]

- **File**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:230-272`
- **Evidence**: Validation error `<div>` rendered but not associated with input via `aria-describedby`.
- **Severity**: P2
- **Risk**: Screen readers cannot announce validation errors automatically.
- **Fix**: Use `useId()` to generate matching `id` on error div and `aria-describedby` on input.

### F06 — BarcodeInput missing `aria-required` [Dim12-01 / Dim20-02]

- **File**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:230-243`
- **Evidence**: `InputGroupInput` props include `aria-label` but not `aria-required`.
- **Severity**: P2
- **Risk**: Screen readers do not announce the field as required.
- **Fix**: Add `aria-required={!!resolved.required ?? undefined}`.

### F07 — BarcodeInput scanner failure silently hidden [Dim19-01]

- **File**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:99-103`
- **Evidence**:
  ```typescript
  } catch (err) {
    if (ac.signal.aborted) return;
    console.warn('BarcodeInput: failed to open scanner', err);
    setCameraAvailable(false);  // No user-facing error message
  }
  ```
- **Severity**: P2
- **Risk**: User clicks scan, nothing happens (scanner button disappears), no explanation. Compare with overlay's error display (barcode-scanner-overlay.tsx:119-124) which properly shows errors.
- **Fix**: Set a user-facing error state and display it (e.g., `setScannerError('Camera unavailable')`).

### F08 — Calendar `exportToPNG` never rejects [Dim19-05]

- **File**: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts:66-70`
- **Evidence**:
  ```typescript
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return;
    const msg = err instanceof Error ? err.message : String(err) || 'PNG export failed';
    setExportError(msg);  // Sets state but never re-throws
  }
  ```
- **Severity**: P2
- **Risk**: Callers using `await exportToPNG()` silently succeed on failure. Error observable only via state polling.
- **Fix**: Re-throw after setting state, or change to return type `Promise<{ success: boolean; error?: string }>`.

### F09 — Kanban filter compilation error silently dropped [Dim19-08]

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:266-268`
- **Evidence**:
  ```typescript
  } catch (err) {
    console.warn('[kanban] Failed to compile filter expression:', err);
  }
  ```
  Returns `undefined` — no filter applied, no user feedback.
- **Severity**: P2
- **Risk**: User writes invalid filter expression, system silently falls back to unfiltered view, user confused.
- **Fix**: Surface error via state and display feedback, or match-nothing fallback.

### F10 — Calendar `_resourceOpenMap` stale on prop change [Dim04-01]

- **File**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:402-408`
- **Evidence**: Initialized from `resourcesData` once but no `useEffect` to reconcile when `resourcesData` changes. If parent updates resources prop, open/close state desyncs.
- **Severity**: P2
- **Risk**: UI confusion — resources appear collapsed/expanded contrary to schema intent after dynamic update.
- **Fix**: Add `useEffect(() => { /* rebuild from resourcesData */ }, [resourcesData])`.

### F11 — Deprecated dead code exported [Dim23-09, Dim23-10]

- **Files**: `use-kanban-collab.ts`, `use-kanban-adder.ts`, `gantt-compact.tsx`
- **Evidence**: Zero production importers (confirmed by grep). Exported via barrel files. `GanttCompact` marked `@deprecated` with "kept only for reference" per remediation plan.
- **Severity**: P2
- **Risk**: Bloated bundle, misleading API surface (consumers see these exports and assume features are active).
- **Fix**: Remove files and exports, or gate behind feature flags.

### F12 — `quick-reference.md` missing scheduling package [Dim16-01]

- **File**: `docs/references/quick-reference.md:12-44`
- **Evidence**: Package Directory Map lists up to `flux-renderers-layout`. No mention of `flux-renderers-scheduling` or `@nop-chaos/flux-renderers-scheduling`.
- **Severity**: P2
- **Risk**: Developers using the primary reference doc miss the scheduling package entirely.
- **Fix**: Add entry with npm name `@nop-chaos/flux-renderers-scheduling`, layer 7.

### F13 — Kanban `useScopeSelector` returns full `BoardData` [Dim05-01]

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:76-85`
- **Evidence**: Selector returns full `BoardData | undefined` with `Object.is` comparison. Any nested scope change creates a new reference, re-rendering the entire board.
- **Severity**: P2
- **Risk**: Performance regression under heavy board mutation. Architectural trade-off documented in comments.
- **Fix**: Add structural comparison (`shallowEqual`), or narrow selector to only the data path the board actually uses.

### F14 — O(n^2) in `detectConflicts` [Dim15-02]

- **File**: `packages/flux-renderers-scheduling/src/calendar/utils/calendar-layout-utils.ts:190-212`
- **Evidence**: `overlapping.includes(item.event)` called inside loop over parsed events (O(n) per iteration). Screens active is typically small, but degrades with 1000+ daily events.
- **Severity**: P3
- **Fix**: Replace `overlapping[]` with `overlappingSet: Set<CalendarEvent>` for O(1) lookups.

### F15 — Large files with mixed responsibilities [Dim02-01, Dim02-02]

- **Files**: `kanban-board.tsx` (739 lines), `calendar.tsx` (581 lines)
- **Evidence**: `kanban-board.tsx` manages state orchestration, undo/redo, DnD, mutation handlers, filtering, and rendering in one file. `calendar.tsx` duplicates controlled/uncontrolled/scope branching for both `view` and `date` axes.
- **Severity**: P2
- **Fix**: Extract shared ownership hook (`useCalendarOwnership`) and move Kanban toolbar/column-adder to separate files.

### F16 — GanttStore misleading type assertion [Dim13-06]

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:332`
- **Evidence**: `export const GanttStore = createGanttStore as unknown as new (config?) => GanttStoreApi`
- **Severity**: P2
- **Risk**: Functional pattern disguised as class. `instanceof GanttStore` fails. Misleads consumers about construction pattern.
- **Fix**: Replace with factory function or add JSDoc explaining the assertion.

### F17 — BarcodeInputSchema missing from type-contract tests [Dim03-05]

- **File**: `packages/flux-renderers-scheduling/src/scheduling-boundary-narrowing.test.ts:8-12`
- **Evidence**: Only `GanttSchema`, `KanbanSchema`, `CalendarSchema` tested. `BarcodeInputSchema` is part of `SchedulingRendererSchema` union but has zero type-contract verification.
- **Severity**: P3
- **Fix**: Add `BarcodeInputSchema` test cases to all three test phases.

### F18 — Inconsistent utils naming [Dim17-05]

- **File**: `packages/flux-renderers-scheduling/src/barcode-input/utils/`
- **Evidence**: Mixes `*-utils.ts`, `barcode-queue.ts`, `prepare-wasm.ts` patterns.
- **Severity**: P3
- **Fix**: Standardize to `*-utils.ts` naming.

### F19 — Raw `<table>` in Gantt grid [Dim11-01]

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt-grid.tsx:90-172`
- **Severity**: P3 (not actionable)
- **Status**: `@nop-chaos/ui` Table component cannot support virtual scrolling with dynamic row heights and tree expand/collapse. Raw `<table>` is justified for this high-performance host surface.

### F20 — `splice()` mutation concern REJECTED [Dim15-05]

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-helpers.ts:3-5`
- **Severity**: Not an issue
- **Evidence**: Every function calls `cloneBoard(board)` (uses `structuredClone`) before any `splice()` operations. Original is never mutated.

---

## Dimensions with Zero Issues

- **Dimension 01 (Dependency Graph)**: Clean. All `@nop-chaos/*` dependencies are allowed stable public APIs. No internal/private path imports detected. `exports` field matches `index.ts`. No cyclic dependencies.
- **Dimension 06 (Async Safety)**: Clean. No `eval`/`new Function`. `AbortController` used for WASM loading, camera streams. All `.then()` chains have `.catch()`. SetInterval/SetTimeout have cleanup.
- **Dimension 07 (Lifecycle)**: Clean. No render-phase store mutations. Cleanup patterns correct. Runtime logic properly separated from React effects.
- **Dimension 08 (Validation)**: Clean. BarcodeInput uses standard form field pattern through `useCurrentForm`/`useCurrentFormState`.
- **Dimension 09 (Renderer Contract)**: Clean. All components receive `RendererComponentProps`. No `templateNode.schema` access. No ad-hoc contexts. `registerSchedulingRenderers` follows standard pattern. Events use `void` return pattern.
- **Dimension 18 (Cross-Package)**: Clean. Registration pattern consistent. Intentional store pattern variation well-documented. Undo/redo patterns consistent across Gantt and Kanban.
- **Dimension 21 (Display & Positioning)**: Clean. All layout math verified: `dateToPixel`, `pixelToDate`, `linkToPolyline`, `computeScaleIntervals`, `splitMultiDayEvents`, `positionEventsInMonth`, `detectConflicts`, `timePointToPercentage`, `eventToVerticalRange`. Consistent UTC usage. Milestones render as diamonds. Today line and weekend shading correct.
- **Dimension 22 (Integration Wiring)**: Clean. Schema→store wiring complete. Internal state drives rendering (not schema values). Events dispatched at all interaction points. Imperative handles implemented. Regions propagated to children. Interaction loops complete. Error fallbacks operational.

---

## Summary Statistics

| Metric                           | Value  |
| -------------------------------- | ------ |
| Dimensions audited               | 23     |
| Dimensions with confirmed issues | 16     |
| Dimensions clean                 | 7      |
| Total findings (confirmed)       | 20     |
| **P0**                           | **0**  |
| **P1**                           | **0**  |
| **P2**                           | **13** |
| **P3**                           | **6**  |
| Rejected/Not an issue            | 1      |

## P2 Action Items (by component)

| Component        | Issues                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| **Gantt**        | F01 (lifecycle kind), F15 (large file), F16 (store type)                                             |
| **Kanban**       | F09 (filter error), F11 (dead code), F13 (broad selector), F15 (large file)                          |
| **Calendar**     | F08 (export error), F10 (stale resource state), F15 (large file)                                     |
| **BarcodeInput** | F03 (CSS scope), F04 (double label), F05 (aria-describedby), F06 (aria-required), F07 (silent error) |
| **All CSS**      | F02 (hardcoded colors)                                                                               |
| **Docs**         | F12 (missing quick-reference entry)                                                                  |

## Assessment

The scheduling package is **structurally sound** with strong architecture compliance. No P0/P1 issues found — no data corruption, no contract breakage, no integration wiring failures. All renderers correctly follow the `RendererComponentProps` contract, avoid `templateNode.schema` access, and dispatch events through the proper channels.

The main areas requiring attention are (1) **BarcodeInput** has the most dense cluster of issues (5 P2 items — accessibility, error handling, CSS scoping), (2) **CSS thematic compatibility** affects all four components, and (3) **documentation gap** in `quick-reference.md` would mislead developers.

The independent review confirmed the accuracy of first-round findings and rejected one false positive (splice mutation). All layout/positioning algorithms were verified correct. All interaction loops were traced end-to-end and found complete.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
