# Open-Ended Adversarial Review 23

## Finding 1: Word Editor exposes a watermark authoring dialog, but watermark is outside the persisted document truth surface

**Where**

- `packages/word-editor-renderers/src/toolbar/page-controls.tsx:55-60,106-117,160-165,207-248`
- `packages/word-editor-core/src/document-io.ts:29-33,212-265`
- `packages/word-editor-core/src/template-model.ts:5-20`
- `docs/architecture/word-editor/design.md:85-101`

**What**

The Word Editor toolbar exposes a first-class watermark authoring surface:

- toolbar button titled `Watermark`
- dialog with `Watermark text` input
- confirm path calling `bridge?.command?.executeAddWatermark({ data: watermarkText.trim() })`
- delete path calling `bridge?.command?.executeDeleteWatermark()`

So from the renderer UI, watermark behaves like a supported editing feature, not a debug-only experiment.

But the persisted document truth surface does not include watermark anywhere.

Current saved envelope:

```ts
interface SavedDocumentData {
  data: WordDocument;
  paperSettings: PaperSettings;
  savedAt: string;
}
```

Current document model:

```ts
interface WordDocument {
  header: WordEditorElement[];
  main: WordEditorElement[];
  footer: WordEditorElement[];
  charts?: DocChart[];
  codes?: DocCode[];
}
```

and `createSavedDocumentData(...)` / `captureDocumentSnapshot(...)` only persist:

- `header`
- `main`
- `footer`
- `charts`
- `codes`
- `paperSettings`

with no watermark field at all.

The architecture doc is explicit about the same reality:

```md
- the live document model does not currently expose `watermark`
```

So the live product currently offers watermark editing through the toolbar, while the canonical saved/recovered document model does not represent watermark as part of persisted state.

**Why it matters**

This is a live truth-surface drift. The UI presents watermark as a normal authoring capability, but the renderer's documented and implemented persistence boundary does not treat it as part of the saved document contract.

That means watermark currently lives on the imperative editor-command side without a corresponding saved-envelope field. Even if watermark appears during the current session, the persisted/recovered truth surface has no slot to carry it through save/load semantics in the same way charts, codes, paper settings, and document content do.

This is exactly the kind of authoring feature that can mislead users and future maintainers: the surface exists, the commands exist, but the canonical model says the feature is not part of durable document state.

**Confidence**

High. The watermark dialog and bridge commands are explicit in renderer code, while the live saved envelope, `WordDocument` type, snapshot creation code, and architecture doc all explicitly omit watermark.

**Non-duplication note**

This is distinct from:

- `round-22`, which was about chart/code dialogs accepting core-invalid metadata that later gets dropped during normalization
- `round-20` / `round-21`, which were about template-tag insertion kind drift

Here the defect is broader truth-surface mismatch: watermark authoring exists, but watermark is not part of the persisted document model at all.

---

## Round summary

This round found another live Word Editor authoring feature whose UI surface extends beyond the persisted contract. The next productive slice is to keep checking renderer-owned toolbar/dialog features that call imperative bridge commands and verify whether each one has a corresponding field in the saved/recovered model rather than living only in transient editor state.
