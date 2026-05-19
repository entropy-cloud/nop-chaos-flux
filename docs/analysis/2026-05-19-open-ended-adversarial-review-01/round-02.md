# Open-Ended Adversarial Review — 2026-05-19 — Round 02

**Execution date**: 2026-05-19
**Result directory**: `docs/analysis/2026-05-19-open-ended-adversarial-review-01/`
**Exploration areas**: `word-editor-renderers`, `report-designer-core`, `report-designer-renderers`, `tests/e2e`
**Discovery source**: host-contract reread + supported E2E assertion audit

---

## Finding 1: Word Editor explicit save does not deliver the saved envelope to the host callback it is documented to deliver

- **Where**:
  - `docs/architecture/word-editor/design.md:159-166`
  - `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:186-198`
  - `packages/word-editor-renderers/src/word-editor-action-provider.ts:44-83`
- **What**: the active design doc says explicit save now treats `SavedDocumentData` as the single persisted truth surface and that the success callback receives the full saved envelope. Live code captures `saved`, but then calls `input.saveEvent(undefined, ctx)`. The envelope is never passed to `onSave`; only the renderer-local `onDocumentSaved` callback sees it after persistence succeeds.
- **Why it matters**: the host-visible save event boundary cannot actually observe the just-saved payload it is documented to receive. Hosts therefore cannot reliably persist, export, or validate the saved envelope through the declared contract, and the docs overstate what the live callback surface provides.
- **Confidence**: Certain
- **Non-duplication note**: this is not the earlier dirty/autosave truth-surface family. The new issue is narrower and more concrete: the documented save callback payload is simply missing on the live host event path.

---

## Finding 2: `report-designer:openInspector` / `closeInspector` mutate runtime state, but the page shell ignores that state and keeps inspector visibility config-local

- **Where**:
  - `packages/report-designer-core/src/types.ts:94-100`
  - `packages/report-designer-core/src/core-dispatch.ts:153-169`
  - `packages/report-designer-renderers/src/page-renderer.tsx:509-516`
  - `packages/report-designer-renderers/src/page-renderer.tsx:574-627`
- **What**: report-designer core exposes `inspector.open` and implements `report-designer:openInspector` / `report-designer:closeInspector`. But the renderer shell decides whether the right panel exists only from `hasConfiguredInspector(...)` plus local collapse state; it never consults `snapshot.inspector.open`.
- **Why it matters**: a namespaced action can report success while the visible shell does not actually open or close the inspector. This is a host-boundary contract break: runtime state, actions, and visible UI drift apart on a primary shell control.
- **Confidence**: Certain
- **Non-duplication note**: this is different from the older `ReportDesignerBridge.subscribe()` gap. Even with a correct subscription implementation, the shell still ignores the state bit that the action mutates.

---

## Finding 3: Report field-panel keyboard insert enables unsupported selection targets and can build an invalid `dropFieldToTarget` payload

- **Where**:
  - `packages/report-designer-renderers/src/field-panel-renderer.tsx:59-82`
  - `packages/report-designer-renderers/src/field-panel-renderer.tsx:162-173`
  - `packages/report-designer-core/src/commands.ts:22-26`
  - `packages/report-designer-core/src/runtime/metadata.ts:308-335`
- **What**: `canInsertToSelection()` allows every selection except `workbook`, so the keyboard-accessible insert button remains enabled for `sheet`, `row`, and `column` targets. But `report-designer:dropFieldToTarget` only accepts `cell | range`. The downstream metadata path assumes any non-`cell` target is a `range` and dereferences `target.range`.
- **Why it matters**: this is the accessibility/keyboard equivalent of drag insertion, not a niche path. On valid live selections such as row/column/sheet, the UI can offer an insert action that constructs an unsupported payload and drives the core into the wrong branch or a runtime failure.
- **Confidence**: Certain
- **Non-duplication note**: previous audits reported that this button path dropped async failures. This is a different defect: even before failure handling, the enablement and payload contract are already wrong for several supported selection kinds.

---

## Finding 4: The SQL format-button E2E test passes even if formatting is a complete no-op

- **Where**:
  - `tests/e2e/code-editor.spec.ts:68-88`
- **What**: after clicking Format, the test only asserts `afterLines >= beforeLines` and `afterLines > 0`. If the format handler is disconnected and the editor already contains text, both assertions still pass.
- **Why it matters**: this gives CI a green regression test that does not prove formatting changed anything. It protects presence of content, not correctness of the format action.
- **Confidence**: Certain
- **Non-duplication note**: this is not the earlier untracked-page gate issue. The page can be fully tracked and the test still provides false confidence.

---

## Finding 5: The Word Editor typing E2E test never proves typing changed editor state

- **Where**:
  - `tests/e2e/word-editor.spec.ts:100-112`
- **What**: the test clicks the canvas and types text, but the only assertion afterward is that the word-count widget is visible. That widget is already visible before typing, so editor focus/input can no-op and the test still passes.
- **Why it matters**: this looks like a browser-level typing regression test, but it only proves that the shell rendered. A broken canvas focus path, keyboard bridge, or editor input pipeline would not be caught.
- **Confidence**: Certain
- **Non-duplication note**: distinct from prior diagnostic or page-error findings; this is a weak success criterion in a supported E2E behavior test.

---

## Round Assessment

This round's pattern is **declared host controls that do not actually cross the last mile into the real shell or callback boundary**:

- Word Editor docs promise a saved envelope on explicit save, but the host callback never receives it.
- Report Designer actions mutate inspector-open state, but the page shell ignores that state.
- Report field-panel accessibility insert exposes a button on unsupported targets, so the keyboard path is less trustworthy than the nominal command contract suggests.
- Two supported E2E tests claim to protect meaningful user actions while only asserting surrounding chrome.

The most valuable follow-up directions are:

1. **Host event truthfulness**: callback payload docs should be checked against the exact live invocation site, not only local post-save state.
2. **Shell/state convergence**: if a core command exposes an `open` bit, page renderers should not silently replace it with config-only visibility.
3. **Assertion realism**: supported E2E specs should prove an action changed state, not just that the page stayed mounted.

## Blind-Spot Self-Assessment

This round stayed on host contracts and test quality. I did not deeply inspect Flow Designer branch-specific status publication, Word Editor action coverage beyond save, or report/spreadsheet import/export paths. The next best cut is action/provider result fidelity and statusPath publication in complex-control families that claim a shared host protocol.
