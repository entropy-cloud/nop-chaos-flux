# Open-Ended Adversarial Review — 2026-05-14 — Round 1

This round started from the Spreadsheet/Report Designer family because recent reviews found many host-boundary and undo issues there, but not the concrete readonly/default-canvas path below.

## Finding 1: `spreadsheet-page` Documents a Built-In Canvas, but the Live Default Body Only Renders a Diagnostic Fallback

**Where**

- `docs/architecture/report-designer/api.md:85-90` says `spreadsheet-page` initializes the spreadsheet runtime and, when `body` is not overridden, the renderer provides the default spreadsheet canvas.
- `packages/spreadsheet-renderers/src/page-renderer.tsx:77-87` defines `renderFallbackBody(...)` as a diagnostic block with `flux.spreadsheet.canvasNotConfigured` and summary counts.
- `packages/spreadsheet-renderers/src/page-renderer.tsx:201-204` uses that fallback whenever `props.regions.body` is absent.
- `packages/spreadsheet-renderers/src/index.ts:21-25` exports `SpreadsheetToolbar` / `SpreadsheetGrid`, so the package contains the shared canvas primitives, but the page renderer does not compose them for the default standalone page.

**What**

The standalone `spreadsheet-page` owner contract and architecture docs describe it as a reusable workbook editor host with an internal default canvas. The actual renderer creates the core and namespace provider, then renders only `Spreadsheet canvas region is not configured.` unless callers supply a custom `body` region. That turns the standalone page into a shell that cannot edit or view the workbook by default.

**Why It Matters**

This is a contract-level trap rather than a cosmetic omission. Schema authors following `spreadsheet-page` docs get a non-functional page unless they already know to manually wire `SpreadsheetGrid`, `SpreadsheetToolbar`, `useSpreadsheetInteractions`, and `SheetTabBar` into a body region. That also means core features such as `readOnly`, `statusPath`, and `spreadsheet:*` namespace registration can appear to work in tests while the actual documented default UX is absent.

This is separate from the previously reported Report Designer / Spreadsheet split-brain issues: the root here is not two truth sources, but that the documented standalone host never mounts its own shared canvas at all.

**Confidence**: Certain.

## Finding 2: Spreadsheet `readOnly` Is Enforced Only at Core Dispatch; Shared UI Still Presents and Enters Editing Paths

**Where**

- `packages/spreadsheet-renderers/src/page-renderer.tsx:94-103` passes schema `readOnly` into `createSpreadsheetCore(...)`.
- `packages/spreadsheet-core/src/core-dispatch.ts:18-20` rejects every non-`READ_ONLY_COMMANDS` command with `Document is readonly`.
- `packages/spreadsheet-core/src/command-handlers/index.ts:26-37` allows selection/copy/find/undo/redo in readonly mode, but not cell/sheet/style/structure mutations.
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:427-442` still starts edit mode on Enter or typed characters without checking `snapshot.readonly`.
- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:17-29` starts double-click editing without a readonly gate.
- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:31-47` only exits edit mode when the save command returns `ok`; a readonly rejection leaves `editingCell` active.
- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-cell-value-sync.ts:17-27` optimistically updates local formula/cell-editor state and dispatches `spreadsheet:setCellValue` without awaiting or inspecting failure.
- `packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-groups.tsx:62-79`, `83-106`, `187-247` disable mutating toolbar buttons only by selection, not by `snapshot.readonly`.
- `packages/spreadsheet-renderers/src/spreadsheet-grid/spreadsheet-grid-context-menu.tsx:47-70`, `102-171` exposes cut/paste/clear/merge/freeze/insert/delete actions without a readonly gate.

**What**

The core has a clear readonly guard, and the host snapshot exposes `runtime.readonly`, but the shared spreadsheet interaction layer does not use it. Users can still enter edit mode, type into cells, change the formula bar, click mutation toolbar items, and invoke mutation context menu items on a readonly spreadsheet. The commands then fail at dispatch time, often silently or with local UI state already changed.

**Why It Matters**

Readonly is a user-facing contract, not just a command firewall. With the current split, readonly spreadsheets can look editable, accept typing, then either trap the user in the inline editor because save never returns `ok`, or show local formula-bar values that never persisted. This is especially risky because the standalone `spreadsheet-page` already publishes `readonly` in `statusPath`, so downstream schema can observe a readonly state while the default shared UI still behaves as editable.

The pattern also creates an integration hazard for Report Designer and custom bodies: any caller that composes the exported `SpreadsheetGrid` / `SpreadsheetToolbar` primitives must independently remember to gate all mutating affordances, even though the canonical readonly signal is already present in `SpreadsheetHostSnapshot`.

**Confidence**: High.

## Round Summary

The Spreadsheet family currently has a hidden contract gap at the host/widget seam. The core and docs talk in owner-level terms (`spreadsheet-page`, `readOnly`, default canvas), but the actual editable canvas lives only as exported primitives that callers must compose correctly. That makes both default functionality and readonly behavior depend on undocumented caller discipline.

## Blind-Spot Self-Assessment

This round did not execute UI tests or build a repro schema. It also did not inspect every spreadsheet command path for readonly feedback quality; the evidence is already enough to show the UI/core contract split, but there may be more readonly leaks in resize, fill-handle, sheet-tab, and field-drop paths.
