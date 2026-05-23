# Open-Ended Adversarial Review — 2026-05-14 — Round 4

This round followed the Flow Designer canvas bridge after round 3 found owner-boundary leaks in another domain editor. The interesting signal was a local React Flow position-preservation cache that is not scoped to just the drag reconciliation window.

## Finding 1: After a Node Drag, Flow Designer Can Ignore Later Core Snapshot Updates for That Node

**Where**

- `packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-interactions.ts:75-97` records `lastCommittedPositionsRef.current.set(change.id, signature)` when a React Flow position change is committed, then dispatches `onMoveNode(...)`.
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-sync.ts:30-73` keeps returning the existing local React Flow node whenever the snapshot node's position signature equals that cached committed signature.
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/xyflow-utils.ts:44-78` builds React Flow node render data from the core snapshot, including `node.data`, `label`, `selected`, type metadata, and tree-mode flags.
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:27-64`, `142-154`, and `211-219` render from that node data, including the visible node label/body schema data.
- `packages/flow-designer-renderers/src/designer-field.tsx:28-35` updates active node/edge data from inspector fields through `dispatch({ type: 'updateNodeData', ... })`.
- `packages/flow-designer-core/src/core-node-commands.ts:82-98` replaces the node in the core document and emits `documentChanged` for node-data edits.

**What**

The React Flow sync layer uses `lastCommittedPositionsRef` to avoid snapping local drag state back when the core snapshot catches up to a moved node. That is a reasonable transient reconciliation trick, but the ref is never cleared after the snapshot has caught up.

After a node is dragged once, any later snapshot for that node whose position still matches the committed signature is discarded in favor of the old local node object:

```ts
if (committedSignature && snapshotSignature === committedSignature) return localNode;
```

That comparison ignores all render-relevant node fields other than position. If the inspector edits the node label, an action updates `node.data`, active selection changes, type/body-derived display fields change, or tree-mode focused metadata changes while the node remains at the same position, `useXyflowSync` can keep the stale local node and never pass the new snapshot data to `DesignerXyflowNode`.

**Why It Matters**

This breaks the core-owner model in a subtle direction: the core document is correct, export/save/history can be correct, but the visible canvas can remain stale after a common interaction sequence:

1. Drag a node.
2. Edit that node's label or other inspector-backed data.
3. The inspector/core state updates, but the canvas node can keep rendering the old React Flow `data` object because its position still equals the cached drag signature.

The issue is not the accepted local React Flow state bridge itself; it is that a drag-specific cache becomes an unbounded veto over later core snapshots. The sync decision should preserve only the transient position field needed for drag reconciliation, or clear the committed-position entry once the snapshot has acknowledged the move. It should not use position equality as proof that the whole node object is still current.

This is distinct from the older Flow Designer batch-move performance finding. That finding was about `onNodesChange` issuing many single-node move commands. This one is a correctness stale-render bug caused by the post-drag reconciliation cache ignoring node render data.

**Confidence**: High.

## Round Summary

The Flow Designer canvas has the right high-level ownership direction: React Flow is local UI state and core remains the document owner. The fragile part is reconciliation. A cache introduced to smooth one owner handoff, drag position commit, now outlives that handoff and can suppress unrelated core-owned updates.

## Blind-Spot Self-Assessment

I did not run a browser-level drag-plus-inspector repro. The static path is strong because the stale branch is deterministic once `lastCommittedPositionsRef` contains the node id and the snapshot position remains unchanged. A focused test should simulate `onNodesChange([{ type: 'position', dragging: false, ... }])`, then feed a snapshot with the same position and changed `data.label`, and assert the rendered React Flow node receives the new label.
