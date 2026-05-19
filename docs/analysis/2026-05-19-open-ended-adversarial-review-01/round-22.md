# Open-Ended Adversarial Review 22

## Finding 1: Word Editor chart/code dialogs can save core-invalid metadata that later disappears during recovery

**Where**

- `packages/word-editor-renderers/src/dialogs/chart-dialog.tsx:60-83`
- `packages/word-editor-renderers/src/dialogs/code-dialog.tsx:40-53,182-184`
- `packages/word-editor-renderers/src/hooks/use-word-editor-actions.ts:107-119`
- `packages/word-editor-renderers/src/word-editor-action-provider.ts:92-108`
- `packages/word-editor-core/src/chart-model.ts:35-58`
- `packages/word-editor-core/src/code-model.ts:29-48`
- `packages/word-editor-core/src/document-io.ts:100-162`

**What**

The chart and code dialogs currently use much weaker save gates than the core model they feed.

`ChartDialog` saves as soon as `chartName` is non-empty:

```ts
const handleSave = () => {
  if (!chartName.trim()) {
    return;
  }
  onSave({
    ...,
    datasetId: datasetId.trim() || '',
    categoryField: categoryField.trim() || '',
    valueField: valueField.split(',').map(...).filter(...),
  });
}
```

But the core chart model requires all of these to be valid:

- `datasetId` non-empty
- `categoryField` non-empty
- `valueField` non-empty array

Likewise `CodeDialog` only blocks on `codeName` and `valueField`:

```ts
if (!codeName.trim() || !valueField.trim()) {
  return;
}
```

but the core code model also requires non-empty `datasetId`.

The renderer save path does not repair that mismatch:

- `handleChartSave` / `handleCodeSave` immediately call `bridge.insertChart(...)` / `bridge.insertCode(...)`
- then append the objects into renderer-owned `charts` / `codes` state

The action provider is similarly weak and only checks `id + name` before inserting:

```ts
if (!chart?.id || !chart.chartName) fail(...)
if (!code?.id || !code.codeName) fail(...)
```

But later, recovery/persistence normalization is stricter and drops invalid entries entirely:

```ts
const validation = validateDocChart(candidate);
if (!validation.valid) {
  return null;
}
```

and likewise for codes via `validateDocCode(...)`.

So the live authoring flow can currently create metadata that is accepted into the running editor/session state, inserted into the bridge layer, and persisted into saved snapshots, but then silently discarded on reload/recovery because it never met the core model's actual validity requirements.

**Why it matters**

This is a live correctness and recovery-integrity bug, not just missing validation polish. The authoring UI and action-provider surface tell users their chart/code placeholders were accepted, while the persistence/recovery layer treats those same objects as invalid and removes them.

That creates a split-brain truth surface:

- in-session: placeholder/metadata appears accepted
- after recovery/remount: the invalid chart/code entry can disappear

This is exactly the kind of authoring loss that is hard to diagnose because the rejection is deferred to normalization time instead of being blocked honestly at the dialog/provider boundary.

**Confidence**

High. The dialog save guards, renderer/action-provider insertion paths, core validators, and recovery normalization behavior are all explicit in live code.

**Non-duplication note**

This is distinct from the older retained `ChartDialog` / `CodeDialog` draft-leak issue. That earlier residual was about close/reopen state leaking unsaved local draft values across sessions. The new issue is different: even a deliberate save can produce metadata that the core model later rejects and drops during recovery.

---

## Round summary

This round found another live Word Editor authoring contract drift: dialog/provider acceptance is looser than the core persistence model. The next productive slice is to keep checking renderer-owned dialogs whose save buttons construct domain objects directly and compare their UI gating against the corresponding core validators or recovery normalizers.
