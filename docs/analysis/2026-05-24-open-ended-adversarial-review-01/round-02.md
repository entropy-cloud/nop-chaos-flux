# Open-Ended Adversarial Review — 2026-05-24 — Round 02

**Execution date**: 2026-05-24
**Result directory**: `docs/analysis/2026-05-24-open-ended-adversarial-review-01/`
**Exploration areas**: `flow-designer-core`, tree-mode transaction rollback semantics, owner-truth preservation
**Discovery source**: lifecycle/recovery audit after excluding the already-reported tree-mode `save()` / `restore()` owner-tree residual

---

## Finding 1: Flow Designer tree-mode `rollbackTransaction()` still restores only the projected graph and leaves owner tree truth ahead

- **Where**:
  - `packages/flow-designer-core/src/core/transactions.ts:4-25,75-113`
  - `packages/flow-designer-core/src/core.ts:62-64,324-357,503-519`
  - `packages/flow-designer-renderers/src/designer-command-adapter.ts:54-68,113-203`
  - `docs/architecture/flow-designer/tree-mode.md:411-416`
- **What**: the tree-mode owner doc explicitly freezes the baseline that transaction-style recovery must preserve both the projected `GraphDocument` and the owner `TreeDocument`. Live undo/redo already does that by replaying `result.entry.treeDocument` back into `treeOwner.setTreeDocument(...)`. But transaction rollback still snapshots only `GraphDocument` in `DesignerTransaction.snapshotBefore`, and `rollbackTransaction()` only reinstalls `result.snapshotBefore` via `replaceDocument(...)`. No paired owner-tree snapshot is stored or restored.
- **Why it matters**: this is a false rollback right next to the previously known `save()/restore()` family. In tree mode, tree-owned commands mutate the owner tree first through `treeOwner.setTreeDocument(nextTree)` and then project back into core. If a transaction later rolls back, the graph can appear reverted while the owner tree remains newer. The next tree-owned mutation, prop sync, or re-projection can silently overwrite the rolled-back graph with the newer owner state. That breaks the document continuity guarantee the tree-mode baseline claims to preserve.
- **Confidence**: Certain
- **Non-duplication note**: this is not the earlier undo/redo defect and not the already-reported `save()` / `restore()` residual. Undo/redo already restore owner tree correctly; the remaining live defect is specifically on transaction rollback.

## Round Assessment

This round exposed another strong pattern: **a subsystem fixed owner-truth restoration for some recovery paths, but adjacent recovery APIs still retain the pre-fix semantics**. That is easy to miss because everything goes through the same `DesignerCore`, yet tree mode actually has multiple rollback surfaces with different guarantees.

Immediate improvement direction: extend `DesignerTransaction` to snapshot the paired `TreeDocument` when tree mode is active, and make `rollbackTransaction()` replay that owner tree alongside the graph snapshot, mirroring the existing undo/redo repair logic.

## Blind-Spot Self-Assessment

This round stayed on rollback semantics and did not inspect whether nested transactions have any additional tree-mode edge cases once owner-tree snapshots are introduced. I also did not verify whether transaction boundaries are heavily used by schema actions today. The next round can either continue on transaction API truthfulness or switch back to public host/manifest seams.
