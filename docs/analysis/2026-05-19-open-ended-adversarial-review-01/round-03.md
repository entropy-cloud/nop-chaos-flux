# Open-Ended Adversarial Review — 2026-05-19 — Round 03

**Execution date**: 2026-05-19
**Result directory**: `docs/analysis/2026-05-19-open-ended-adversarial-review-01/`
**Exploration areas**: `flow-designer-renderers`, `word-editor-renderers`, shared host-summary/status publication
**Discovery source**: host-protocol contract reread + live provider/status-path verification

---

## Finding 1: Flow Designer publishes contradictory host summaries for the same live selection/busy state

- **Where**:
  - `packages/flow-designer-renderers/src/designer-context.ts:116-138`
  - `packages/flow-designer-renderers/src/designer-page-body.tsx:292-305`
  - `packages/flow-designer-renderers/src/renderer-definitions.ts:193-210`
  - `packages/flow-designer-core/src/types.ts:390-398`
- **What**: Flow Designer currently has two summary surfaces for essentially the same host state:
  - internal host scope `$designer` from `buildDesignerScopeData()` reports `selectionKind: 'branch' | 'node' | 'edge' | 'none'` and hardcodes `busy: false`
  - external `statusPath` publication reports `busy: layoutBusy` and `error: layoutError`, but its `DesignerHostStatusSummary` type only allows `'node' | 'edge' | 'none'`, so active branch selection is collapsed to `'none'`
  - static scope export contracts also still declare `$designer.selectionKind` as only `'node' | 'edge' | 'none'`
- **Why it matters**: host consumers get contradictory answers depending on which supported surface they read. A toolbar/inspector schema reading `$designer` can see branch selection while an external host reading `statusPath` sees no selection; conversely `statusPath` can see layout busy/error while `$designer.busy` is permanently false. This is a true summary split-brain at the supported host boundary.
- **Confidence**: Certain
- **Non-duplication note**: this is not the earlier config/core split-brain in tree mode. The defect here is current publication inconsistency between two live summary contracts for the same runtime instance.

---

## Finding 2: Flow Designer's built-in toolbar bypasses `ActionScope` for most `designer:*` actions

- **Where**:
  - `docs/architecture/flow-designer/api.md:58,97,138,241-277`
  - `docs/architecture/flow-designer/collaboration.md:150-154,223-224,232-261`
  - `packages/flow-designer-renderers/src/designer-toolbar.tsx:69-91`
  - `packages/flow-designer-renderers/src/designer-toolbar.tsx:235-297`
  - `packages/flow-designer-renderers/src/designer-action-provider.ts:15-53,310-367`
- **What**: the architecture docs explicitly say toolbar actions such as `designer:undo`, `designer:redo`, `designer:beginTransaction`, `designer:commitTransaction`, and `designer:rollbackTransaction` should go through the local `ActionScope` and resolve to the `designer` namespace provider. But the built-in toolbar only uses `ActionScope.resolve()` for the special `back` item. Normal `button` and `switch` items go through `toCommand(...)` and call imperative `dispatch(command)` directly, and `toCommand()` only covers a small hardcoded subset.
- **Why it matters**: valid provider methods already exposed by `createDesignerActionProvider()` are silently unreachable from toolbar config, and any lexical namespace override/shadowing is bypassed. The repo therefore advertises a unified `designer:*` host-action path while the built-in toolbar still uses a second, narrower command-only path for most actions.
- **Confidence**: Certain
- **Non-duplication note**: this is different from old surface lifecycle or transaction bugs. The live defect is that the built-in toolbar violates the documented action-resolution path itself.

---

## Finding 3: Word Editor `statusPath` never reports save busy state, even while a save is actively in flight

- **Where**:
  - `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:221-235`
  - `packages/word-editor-renderers/src/hooks/use-word-editor-save.ts:23-27,41-58,93-98`
  - `packages/word-editor-core/src/host-status.ts:1-10`
- **What**: Word Editor has a real in-flight save lifecycle in `useWordEditorSave()` via `isSavingRef` and an abort controller, but `useStatusPathPublication()` always publishes `busy: false`.
- **Why it matters**: external host observers cannot distinguish idle from saving. That breaks any host logic relying on `statusPath.busy` for leave guarding, duplicate-save suppression, shell disablement, or save-progress UI. The type contract already includes `busy`; the live publication simply never uses it.
- **Confidence**: Certain
- **Non-duplication note**: distinct from the earlier Word Editor save-envelope defect. That one was about payload shape on success; this one is about live status publication fidelity during save execution.

---

## Finding 4: Word Editor still persists datasets before save success/abort is known, leaving a partial-commit residual after the earlier dirty-state fix

- **Where**:
  - `packages/word-editor-renderers/src/word-editor-action-provider.ts:45-69`
  - `packages/word-editor-core/src/document-io.ts:334-336`
  - historical adjacent issue for comparison: `docs/analysis/2026-05-02-adversarial-audit-review-4.md:65-77`
- **What**: current `word-editor:save` no longer clears `dirty` before the host save returns, but it still calls `saveDatasets(...)` immediately before awaiting `saveEvent(...)` and before the abort check.
- **Why it matters**: a failed or aborted save can still persist the new dataset set to local storage while the document save itself is rejected. On the next reload, users can observe a partially committed recovery state: old document snapshot plus new datasets. This is exactly the kind of silent persistence skew that is hard to notice until recovery or remount.
- **Confidence**: Certain
- **Non-duplication note**: this is a new residual next to the older May 2 finding. The previous defect was the early `dirty=false` lie; that part is fixed. The remaining live issue is premature dataset persistence creating partial commit even when the overall save does not succeed.

---

## Round Assessment

This round reinforces a specific pattern: **the shared host protocol exists on paper, but some families still publish different truths on adjacent supported surfaces**.

- Flow Designer's `$designer`, `statusPath`, static export contract, and built-in toolbar are not actually converged on one action/summary model.
- Word Editor's save machinery has become more correct than before, but status publication and local persistence timing still lag behind the intended host contract.

The most important next directions are:

1. **Summary convergence**: each complex-control family should have one authoritative host summary model, then derive both host scope and `statusPath` from that same narrowed DTO.
2. **Protocol obedience in built-ins**: built-in shells like Flow Designer toolbar should not bypass the same `ActionScope` path they expose to schema authors.
3. **Persistence transactionality**: local recovery artifacts should not commit earlier than the save outcome they are supposed to represent.

## Blind-Spot Self-Assessment

This round stayed mostly on host summaries and provider/action-path fidelity. I did not yet deep-audit Word Editor insert/import/export actions, spreadsheet shell publication, or cross-family manifest/test parity. The next best cut is to inspect whether public manifests and renderer definition contracts still overstate what each family actually publishes or resolves at runtime.
