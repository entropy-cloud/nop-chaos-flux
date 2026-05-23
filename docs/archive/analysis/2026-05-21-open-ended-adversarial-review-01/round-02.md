# Open-Ended Adversarial Review — 2026-05-21 — Round 02

**Execution date**: 2026-05-21
**Result directory**: `docs/analysis/2026-05-21-open-ended-adversarial-review-01/`
**Exploration areas**: `word-editor-renderers`, component docs, renderer authoring contracts
**Discovery source**: authoring-contract drift check after avoiding spreadsheet follow-up and prior runtime-fixed Word Editor save/back bugs

---

## Finding 1: `word-editor-page` still publishes empty event payload contracts for `onBack` / `onSave` even though docs and runtime now guarantee real payloads

- **Where**:
  - `docs/components/word-editor-page/design.md:58-65`
  - `packages/word-editor-renderers/src/renderers.tsx:68-78`
  - `packages/word-editor-renderers/src/hooks/use-word-editor-actions.ts:22,36-40`
  - `packages/word-editor-renderers/src/word-editor-action-provider.ts:38-41,50-89`
- **What**: the active Word Editor component doc now explicitly promises that `onBack` receives the original click event and that `onSave` receives the full `SavedDocumentData` envelope. The live runtime matches that stronger contract: `handleBack` forwards the React button event, and the save provider passes the captured `saved` snapshot into `saveEvent(saved, ctx)`. But the renderer definition's formal `eventContracts` still declare both payloads as `{ kind: 'object', fields: {} }`, i.e. effectively “some empty object”.
- **Why it matters**: `eventContracts` are not documentation garnish; they are the formal authoring/tooling discovery surface for event payload shape. Builder autocomplete, diagnostics, generated examples, and future schema authoring UIs that rely on renderer metadata will keep presenting `onBack` / `onSave` as payload-less events even though the runtime and owner docs now support richer values. This creates a particularly bad drift because the runtime is already stronger than the public static contract, so advanced consumers have to reverse-engineer real payloads from implementation instead of learning them from the supported authoring surface.
- **Confidence**: Certain
- **Non-duplication note**: this is not the older Word Editor defect where runtime failed to pass the save envelope or click event. Those runtime paths are already fixed in live code. The residual issue here is the stale static `eventContracts` metadata that still advertises the pre-fix contract.

## Round Assessment

The pattern in this round is **runtime/doc convergence without metadata convergence**. The project fixed the real Word Editor behavior, and the component doc was updated accordingly, but the renderer-definition contract that tooling consumes still describes the old weaker surface.

Immediate improvement direction: update `wordEditorRendererDefinitions[0].eventContracts` so `onBack` describes an event-like payload and `onSave` describes the `SavedDocumentData` envelope shape or at least a named host payload contract that matches the documented/runtime-supported surface.

## Blind-Spot Self-Assessment

This round stayed narrowly on Word Editor event metadata and did not inspect every other host renderer for similar `eventContracts` drift. I also did not verify how current tooling renders these payloads in practice. The next round should switch to a different subsystem or do a quick broad scan for another contract mismatch family rather than keep mining Word Editor.
