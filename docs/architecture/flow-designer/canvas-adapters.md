# Flow Designer React Flow Canvas Integration

## Purpose

This document explains how Flow Designer integrates `@xyflow/react` behind one host-owned command boundary.

Use it when changing:

- `packages/flow-designer-renderers/src/canvas-bridge.tsx`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/`
- live `@xyflow/react` callback translation

## Core Model

Flow Designer does not let the canvas layer mutate graph state directly.

Instead, the React Flow integration sits behind the same host-owned bridge contract:

```ts
interface DesignerCanvasBridgeProps {
  snapshot: DesignerSnapshot
  pendingConnectionSourceId: string | null
  reconnectingEdgeId: string | null
  onPaneClick(): void
  onNodeSelect(nodeId: string, event: React.MouseEvent): void
  onEdgeSelect(edgeId: string, event: React.MouseEvent): void
  onStartConnection(nodeId: string, event: React.MouseEvent): void
  onCancelConnection(nodeId: string, event: React.MouseEvent): void
  onCompleteConnection(nodeId: string, event: React.MouseEvent): void
  onStartReconnect(edgeId: string, event: React.MouseEvent): void
  onCancelReconnect(edgeId: string, event: React.MouseEvent): void
  onCompleteReconnect(edgeId: string, sourceId: string, targetId: string, event: React.MouseEvent): void
  onDuplicateNode(nodeId: string, event: React.MouseEvent): void
  onDeleteNode(nodeId: string, event: React.MouseEvent): void
  onDeleteEdge(edgeId: string, event: React.MouseEvent): void
  onMoveNode(nodeId: string, event: React.MouseEvent, position?: { x: number; y: number }): void
  onViewportChange(viewport: { x: number; y: number; zoom: number }, event: React.MouseEvent): void
}
```

The host keeps graph mutation ownership. The React Flow layer only translates UI gestures into these callbacks.

## Single Supported Implementation

- The current public architecture baseline supports only `@xyflow/react` (React Flow).
- There is no supported `designer-page.canvasAdapter` selection in the active design baseline.
- If code still keeps names such as `canvas-bridge` or a single-value kind like `'xyflow'`, treat those as implementation details of the React Flow boundary, not as a promise of multiple canvas implementations.

This is a deliberate product choice: Flow Designer only needs one real canvas implementation, and that implementation is React Flow.

## Host Responsibilities

The bridge host lives in `DesignerCanvasContent`.

Its responsibilities are:

- own transient UI intent such as `pendingConnectionSourceId` and `reconnectingEdgeId`
- map bridge callbacks onto React Flow-backed `dispatch(...)` calls
- keep warning visibility centralized through shared command failure handling
- decide when transient intent clears after success or remains after failure

The host is allowed to keep temporary UI intent, but it must not become a second graph document store.

## Failure Semantics

Connect and reconnect completion do not always clear local intent.

If `addEdge` or `reconnectEdge` fails because of shared constraints such as:

- `duplicate-edge`
- `self-loop`
- `missing-node`
- `missing-edge`

the host keeps the pending connection or reconnect intent active.

This rule exists so users can immediately retry another target or cancel, instead of losing the gesture context after a rejected command.

This behavior must remain consistent across all React Flow entry points in the renderer shell.

## Live Xyflow Translation Rules

The React Flow integration translates library callbacks back into the host contract.

Key mappings:

- `onConnect` -> `onStartConnection` then `onCompleteConnection`
- `onReconnect` -> `onStartReconnect` then `onCompleteReconnect`
- `onSelectionChange(nodes)` -> `onNodeSelect`
- `onSelectionChange(edges)` -> `onEdgeSelect`
- empty `onSelectionChange` -> `onPaneClick`
- `onNodesChange(position)` and `onNodeDragStop` -> `onMoveNode`
- `onNodesChange(remove)` -> `onDeleteNode`
- `onEdgesChange(remove)` -> `onDeleteEdge`
- `onMove` and `onMoveEnd` -> normalized `onViewportChange`

The React Flow layer may keep UI-library-local transient state such as controlled viewport bookkeeping, but document updates still belong to the host command path.

Reconnect completion must carry both the edge id and the source/target pair produced by the library callback, because reconnect gestures are allowed to move either side of the edge instead of assuming the original source is unchanged.

## Testing Expectations

When changing React Flow bridge behavior, keep coverage in at least these places:

- `packages/flow-designer-renderers/src/canvas-bridge.test.tsx`
- `packages/flow-designer-renderers/src/index.test.tsx`

Minimum regression areas:

- connect and reconnect success translation
- warning visibility on semantic failures
- failure-intent retention after rejected connect or reconnect commands
- viewport normalization
- node move and delete translation

## Code Anchors

- `packages/flow-designer-renderers/src/canvas-bridge.tsx`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx`
- `packages/flow-designer-renderers/src/canvas-bridge.test.tsx`
- `packages/flow-designer-renderers/src/index.test.tsx`
