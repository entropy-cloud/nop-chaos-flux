# Flow Designer Canvas Adapters

## Purpose

This document explains how `flow-designer2` models canvas rendering as adapter variants that all reuse one host-owned command boundary.

Use it when changing:

- `packages/flow-designer-renderers/src/canvas-bridge.tsx`
- `packages/flow-designer-renderers/src/index.tsx`
- `designer-page.canvasAdapter` behavior
- live `@xyflow/react` callback translation

## Core Model

Flow Designer does not let each canvas implementation mutate graph state directly.

Instead, every canvas adapter sits behind the same bridge contract:

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

The host keeps graph mutation ownership. Adapters only translate UI gestures into these callbacks.

## Adapter Kinds

Current adapter union:

```ts
type DesignerCanvasAdapterKind = 'card' | 'xyflow-preview' | 'xyflow'
```

### `card`

- Legacy parity harness rendered as cards and SVG edges.
- Useful for focused regression tests and fallback behavior.
- Still follows the same callback contract as the newer adapters.

### `xyflow-preview`

- Contract rehearsal layer, not a real graph canvas.
- Exposes explicit buttons for selection, connect, reconnect, move, and viewport sync.
- Useful for locking behavior before depending on live `@xyflow/react` event details.

### `xyflow`

- Real `@xyflow/react` integration.
- Controlled by host snapshot and translated back into shared callbacks.
- This is now the default adapter when `designer-page` does not specify `canvasAdapter`.

## Default Behavior

`designer-page` and `designer-canvas` now default to `xyflow`.

That means:

- omitted `canvasAdapter` -> live `xyflow`
- explicit `canvasAdapter: 'card'` -> fallback parity canvas
- explicit `canvasAdapter: 'xyflow-preview'` -> contract preview harness

The default should only change when the live adapter is considered the most representative host experience.

## Host Responsibilities

The adapter host lives in `DesignerCanvasContent` inside `packages/flow-designer-renderers/src/index.tsx`.

Its responsibilities are:

- own transient UI intent such as `pendingConnectionSourceId` and `reconnectingEdgeId`
- map bridge callbacks onto adapter-backed `dispatch(...)` calls
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

This behavior must remain consistent across:

- `card`
- `xyflow-preview`
- `xyflow`

## Live Xyflow Translation Rules

The live `xyflow` adapter translates library callbacks back into the host contract.

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

The adapter may keep UI-library-local transient state such as controlled viewport bookkeeping, but document updates still belong to the host command path.

For live `xyflow`, reconnect completion must carry both the edge id and the source/target pair produced by the library callback, because reconnect gestures are allowed to move either side of the edge instead of assuming the original source is unchanged.

## Testing Expectations

When changing adapter behavior, keep coverage in at least these places:

- `packages/flow-designer-renderers/src/canvas-bridge.test.tsx`
- `packages/flow-designer-renderers/src/index.test.tsx`

Minimum regression areas:

- default adapter selection
- explicit adapter switching
- connect and reconnect success translation
- warning visibility on semantic failures
- failure-intent retention after rejected connect or reconnect commands
- viewport normalization
- node move and delete translation

## Code Anchors

- `packages/flow-designer-renderers/src/canvas-bridge.tsx`
- `packages/flow-designer-renderers/src/index.tsx`
- `packages/flow-designer-renderers/src/canvas-bridge.test.tsx`
- `packages/flow-designer-renderers/src/index.test.tsx`
