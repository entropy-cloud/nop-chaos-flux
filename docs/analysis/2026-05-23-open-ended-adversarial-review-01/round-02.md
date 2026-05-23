# Open-Ended Adversarial Review — 2026-05-23 — Round 02

**Execution date**: 2026-05-23
**Result directory**: `docs/analysis/2026-05-23-open-ended-adversarial-review-01/`
**Exploration areas**: `flow-designer-core`, tree-mode owner/history recovery semantics
**Discovery source**: residual-path audit after excluding already-reported tree-mode undo/redo owner desync

---

## Finding 1: Flow Designer tree mode `save()` / `restore()` still lose owner-tree truth even though undo/redo was paired with it

- **Where**:
  - `packages/flow-designer-core/src/core.ts:63-66,120,129-137,326-328,344-346,426-443`
  - `packages/flow-designer-core/src/core/history.ts:19-25,38-55`
  - `packages/flow-designer-renderers/src/designer-command-adapter.ts:212-217`
  - `docs/architecture/flow-designer/tree-mode.md:411-416`
- **What**: tree mode explicitly defines `TreeDocument` as owner truth and requires history-style recovery to keep owner tree and projected graph aligned. Live code already does the right thing for `undo()` / `redo()`: history entries store `treeDocument`, and replay calls `treeOwner.setTreeDocument(...)`. But `save()` only snapshots `savedDoc`/`savedRevision`, and `restore()` only reinstalls that saved graph document. It never snapshots or restores the paired owner `treeDocument`, and the renderer command path simply forwards `designer:save` / `designer:restore` to `core.save()` / `core.restore()` with no tree-mode repair layer.
- **Why it matters**: this leaves a live recovery hole right next to the previously known undo/redo family. In tree mode, a user can save a baseline, make structural edits that update both tree owner and graph projection, then call restore and get only the projected graph rolled back. The real owner tree stays newer. The next tree-owned command or prop sync can therefore re-project the newer tree and silently overwrite the restored graph. So `restore` becomes a false rollback for exactly the same owner-truth reason the docs say tree mode must avoid.
- **Confidence**: Certain
- **Non-duplication note**: this is not the older "undo/redo does not restore owner tree" finding. Live code has already paired undo/redo with `treeOwner.setTreeDocument(...)`. The remaining defect is a new residual on the adjacent `save()` / `restore()` path, which still restores only graph state.

## Round Assessment

This round found a useful pattern: **partial fixes on one recovery path but not its sibling path**. Tree mode already learned to pair owner-tree restoration with undo/redo history replay, yet the save/restore baseline path still behaves like plain graph mode.

Immediate improvement direction: make the saved baseline carry the paired `TreeDocument` in tree mode, and have `restore()` replay both the projected graph and the owner tree the same way undo/redo already does.

## Blind-Spot Self-Assessment

This round stayed strictly inside `flow-designer-core` recovery semantics. I did not verify whether tree-mode UI exposes restore prominently enough for users to hit this often, and I did not inspect whether export/import has a similar owner-graph asymmetry. The next round should switch away from tree-mode unless another clearly distinct non-duplicate residual appears.
