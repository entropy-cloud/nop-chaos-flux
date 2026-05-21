# Open-Ended Adversarial Review — 2026-05-21 — Round 03

**Execution date**: 2026-05-21
**Result directory**: `docs/analysis/2026-05-21-open-ended-adversarial-review-01/`
**Exploration areas**: `word-editor-renderers`, renderer `propContracts`, component docs
**Discovery source**: quick host-renderer metadata sweep after round-02 event contract drift

---

## Finding 1: `word-editor-page.config` is still published as an opaque object even though docs, types, and runtime now support a real minimal structure

- **Where**:
  - `docs/components/word-editor-page/design.md:30,50-52,59,94-95`
  - `packages/word-editor-renderers/src/types.ts:4-11,23-24`
  - `packages/word-editor-renderers/src/word-editor-page.tsx:25-59` and the live `showLeftPanel` / `showRightPanel` logic in this component's config path
  - `packages/word-editor-renderers/src/renderers.tsx:30-36`
- **What**: the active Word Editor owner doc and exported TypeScript types both define a concrete minimal public config surface:

  ```ts
  interface WordEditorConfig {
    leftPanel?: { generator?: 'default' };
    rightPanel?: { generator?: 'default' };
  }
  ```

  The live page renderer uses exactly that shape to decide whether the left and right workbench panels exist. But the formal renderer metadata still publishes `config` as `shape: { kind: 'object', fields: {} }`, i.e. a fully opaque object with no discoverable supported keys.

- **Why it matters**: `propContracts` are the formal authoring/tooling contract surface, not just an implementation note. Leaving `config` as an untyped opaque object means inspectors, autocomplete, schema editors, and diagnostics cannot discover the two stable, already-supported configuration keys that the doc and runtime both rely on. That pushes schema authors back to reverse-engineering docs or source even though this information is already stable enough to be part of the public contract.
- **Confidence**: Certain
- **Non-duplication note**: this is distinct from round-02's `eventContracts` drift. There the stale metadata was on `onBack` / `onSave` payloads; here the stale metadata is on the `config` prop shape itself.

## Round Assessment

The repeated pattern is now clearer: **Word Editor's runtime and docs have advanced faster than the renderer-definition metadata that authoring tooling consumes**. First the events lagged; now the config surface does too.

Immediate improvement direction: tighten `wordEditorRendererDefinitions[0].propContracts.config.shape` to at least expose `leftPanel` and `rightPanel` with their current minimal `generator?: 'default'` structure, so the formal metadata stops underspecifying the supported public surface.

## Blind-Spot Self-Assessment

This round intentionally stayed within the same metadata-drift family long enough to confirm it is a pattern, but did not scan every other host renderer for similar opaque-object contracts. A good next continuation would be a broader cross-host pass over `designer-page`, `report-designer-page`, and `spreadsheet-page` metadata to see whether the same drift exists elsewhere.
