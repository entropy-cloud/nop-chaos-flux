import type { Node, Edge } from '@xyflow/react';
import {
  type ApprovalData,
  type CondData,
  type EdgeLeg,
  type EndData,
  type FlowData,
  BRANCH_EXTRA,
  BRANCH_SHORT_LEG,
  BRANCH_W,
  CARD_H,
  COLORS,
  END_W,
  MERGE_EXTRA,
  MERGE_SHORT_LEG,
  ROW_STEP,
  W,
} from './types.js';

export function buildFlowData(): FlowData {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let nid = 0;
  let eid = 0;
  const nextNodeId = () => `n${++nid}`;
  const nextEdgeId = () => `e${++eid}`;

  const cx = 300;
  const lx = cx - BRANCH_W / 2;
  const rx = cx + BRANCH_W / 2;
  const y0 = 20;

  const id0 = nextNodeId();
  nodes.push({
    id: id0,
    type: 'dtApproval',
    position: { x: cx - W / 2, y: y0 },
    data: {
      label: 'Initiator',
      desc: 'Everyone',
      color: COLORS.promoter,
      icon: 'user',
      showAddBtn: true,
    } satisfies ApprovalData,
  });

  const y1 = y0 + ROW_STEP;
  const id1 = nextNodeId();
  nodes.push({
    id: id1,
    type: 'dtApproval',
    position: { x: cx - W / 2, y: y1 },
    data: {
      label: 'Manager Approval',
      desc: 'Direct Manager',
      color: COLORS.approval,
      icon: 'user-check',
      showAddBtn: true,
    } satisfies ApprovalData,
  });
  edges.push({ id: nextEdgeId(), source: id0, target: id1, type: 'dtEdge' });

  const y2 = y1 + ROW_STEP + BRANCH_EXTRA;
  const id2l = nextNodeId();
  nodes.push({
    id: id2l,
    type: 'dtCond',
    position: { x: lx - W / 2, y: y2 },
    data: {
      title: 'Long Leave',
      desc: 'Leave days > 7',
      priority: 1,
      showAddBtn: true,
    } satisfies CondData,
  });
  edges.push({
    id: nextEdgeId(),
    source: id1,
    target: id2l,
    type: 'dtEdge',
    data: { leg: 'near-target' as EdgeLeg },
  });

  const id2r = nextNodeId();
  nodes.push({
    id: id2r,
    type: 'dtCond',
    position: { x: rx - W / 2, y: y2 },
    data: {
      title: 'Short Leave',
      desc: 'Other conditions',
      priority: 2,
      showAddBtn: true,
    } satisfies CondData,
  });
  edges.push({
    id: nextEdgeId(),
    source: id1,
    target: id2r,
    type: 'dtEdge',
    data: { leg: 'near-target' as EdgeLeg },
  });

  const y3 = y2 + ROW_STEP;
  const id3l = nextNodeId();
  nodes.push({
    id: id3l,
    type: 'dtApproval',
    position: { x: lx - W / 2, y: y3 },
    data: {
      label: 'Director Approval',
      desc: 'Alice',
      color: COLORS.approval,
      icon: 'user-check',
      showAddBtn: true,
    } satisfies ApprovalData,
  });
  edges.push({ id: nextEdgeId(), source: id2l, target: id3l, type: 'dtEdge' });

  const id3r = nextNodeId();
  nodes.push({
    id: id3r,
    type: 'dtApproval',
    position: { x: rx - W / 2, y: y3 },
    data: {
      label: 'Manager Approval',
      desc: 'Direct Manager',
      color: COLORS.approval,
      icon: 'user-check',
      showAddBtn: true,
    } satisfies ApprovalData,
  });
  edges.push({ id: nextEdgeId(), source: id2r, target: id3r, type: 'dtEdge' });

  const y4 = y3 + ROW_STEP + MERGE_EXTRA;
  const id4 = nextNodeId();
  nodes.push({
    id: id4,
    type: 'dtApproval',
    position: { x: cx - W / 2, y: y4 },
    data: {
      label: 'CC',
      desc: 'Bob',
      color: COLORS.cc,
      icon: 'send',
      showAddBtn: true,
    } satisfies ApprovalData,
  });
  edges.push({
    id: nextEdgeId(),
    source: id3l,
    target: id4,
    type: 'dtEdge',
    data: { leg: 'near-source' as EdgeLeg },
  });
  edges.push({
    id: nextEdgeId(),
    source: id3r,
    target: id4,
    type: 'dtEdge',
    data: { leg: 'near-source' as EdgeLeg },
  });

  const y5 = y4 + ROW_STEP;
  const id5 = nextNodeId();
  nodes.push({
    id: id5,
    type: 'dtEnd',
    position: { x: cx - END_W / 2, y: y5 },
    data: {} as EndData,
  });
  edges.push({ id: nextEdgeId(), source: id4, target: id5, type: 'dtEdge' });

  const branchLineY = Math.round(y2 - BRANCH_SHORT_LEG);
  const mergeLineY = Math.round(y3 + CARD_H + MERGE_SHORT_LEG);

  return {
    nodes,
    edges,
    overlays: [
      { x: cx, y: branchLineY, type: 'addCondition' as const, sourceId: id1 },
      { x: cx, y: mergeLineY + 36, type: 'mergeAdd' as const, sourceId: `merge:${id4}` },
    ],
  };
}

export function insertNode(
  sourceId: string,
  addType: 'approver' | 'cc',
  prevNodes: Node[],
  prevEdges: Edge[],
  idCounter: { value: number },
  isMergeOverlay: boolean,
): { nodes: Node[]; edges: Edge[] } {
  const nodes = prevNodes.map((n) => ({ ...n }));
  const edges = prevEdges.map((e) => ({ ...e }));
  const id = `n${++idCounter.value}`;
  const eid1 = `e${++idCounter.value}`;
  const eid2 = `e${++idCounter.value}`;

  const label = addType === 'approver' ? 'Approver' : 'CC';
  const desc = 'Please set';
  const color = addType === 'approver' ? COLORS.approval : COLORS.cc;
  const icon = addType === 'approver' ? 'user-check' : 'send';

  const newData: ApprovalData = { label, desc, color, icon, showAddBtn: true };

  if (isMergeOverlay) {
    const targetIdx = nodes.findIndex((n) => n.id === sourceId);
    if (targetIdx < 0) return { nodes: prevNodes, edges: prevEdges };
    const targetNode = nodes[targetIdx];
    const newNodeY = targetNode.position.y;

    for (const n of nodes) {
      if (n.position.y >= targetNode.position.y) {
        n.position = { ...n.position, y: n.position.y + ROW_STEP };
      }
    }

    const newNode: Node = {
      id,
      type: 'dtApproval',
      position: { x: targetNode.position.x, y: newNodeY },
      data: newData as unknown as Record<string, unknown>,
    };
    nodes.push(newNode);

    for (const e of edges) {
      if (e.target === sourceId) {
        e.target = id;
      }
    }
    edges.push({ id: eid1, source: id, target: sourceId, type: 'dtEdge' });
  } else {
    const outEdge = edges.find((e) => e.source === sourceId);
    if (!outEdge) return { nodes: prevNodes, edges: prevEdges };
    const downstreamId = outEdge.target;
    const sourceNode = nodes.find((n) => n.id === sourceId);
    const downstreamNode = nodes.find((n) => n.id === downstreamId);
    if (!sourceNode || !downstreamNode) return { nodes: prevNodes, edges: prevEdges };

    const newNodeY = sourceNode.position.y + ROW_STEP;

    for (const n of nodes) {
      if (n.position.y >= downstreamNode.position.y) {
        n.position = { ...n.position, y: n.position.y + ROW_STEP };
      }
    }

    const newNode: Node = {
      id,
      type: 'dtApproval',
      position: { x: sourceNode.position.x, y: newNodeY },
      data: newData as unknown as Record<string, unknown>,
    };
    nodes.push(newNode);

    const oldIdx = edges.indexOf(outEdge);
    edges.splice(oldIdx, 1);
    edges.push({ id: eid1, source: sourceId, target: id, type: 'dtEdge' });
    edges.push({ id: eid2, source: id, target: downstreamId, type: 'dtEdge' });
  }

  return { nodes, edges };
}

export function insertBranch(
  sourceId: string,
  prevNodes: Node[],
  prevEdges: Edge[],
  idCounter: { value: number },
): { nodes: Node[]; edges: Edge[] } {
  const nodes = prevNodes.map((n) => ({ ...n }));
  const edges = prevEdges.map((e) => ({ ...e }));

  const outEdge = edges.find((e) => e.source === sourceId);
  if (!outEdge) return { nodes: prevNodes, edges: prevEdges };
  const downstreamId = outEdge.target;
  const sourceNode = nodes.find((n) => n.id === sourceId);
  const downstreamNode = nodes.find((n) => n.id === downstreamId);
  if (!sourceNode || !downstreamNode) return { nodes: prevNodes, edges: prevEdges };

  const totalShift = BRANCH_EXTRA + ROW_STEP + MERGE_EXTRA;

  for (const n of nodes) {
    if (n.position.y >= downstreamNode.position.y) {
      n.position = { ...n.position, y: n.position.y + totalShift };
    }
  }

  const cx = sourceNode.position.x + W / 2;
  const lx = cx - BRANCH_W / 2;
  const rx = cx + BRANCH_W / 2;
  const condY = sourceNode.position.y + ROW_STEP + BRANCH_EXTRA;

  const existingBranches = edges.filter((e) => e.source === sourceId).length;

  const idL = `n${++idCounter.value}`;
  const idR = `n${++idCounter.value}`;
  const eidSrcL = `e${++idCounter.value}`;
  const eidSrcR = `e${++idCounter.value}`;
  const eidLDown = `e${++idCounter.value}`;
  const eidRDown = `e${++idCounter.value}`;

  nodes.push({
    id: idL,
    type: 'dtCond',
    position: { x: lx - W / 2, y: condY },
    data: {
      title: 'Condition',
      desc: 'Please set',
      priority: existingBranches + 1,
      showAddBtn: true,
    } as unknown as Record<string, unknown>,
  });
  nodes.push({
    id: idR,
    type: 'dtCond',
    position: { x: rx - W / 2, y: condY },
    data: {
      title: 'Condition',
      desc: 'Please set',
      priority: existingBranches + 2,
      showAddBtn: true,
    } as unknown as Record<string, unknown>,
  });

  const oldIdx = edges.indexOf(outEdge);
  edges.splice(oldIdx, 1);

  edges.push({
    id: eidSrcL,
    source: sourceId,
    target: idL,
    type: 'dtEdge',
    data: { leg: 'near-target' as EdgeLeg },
  });
  edges.push({
    id: eidSrcR,
    source: sourceId,
    target: idR,
    type: 'dtEdge',
    data: { leg: 'near-target' as EdgeLeg },
  });

  edges.push({
    id: eidLDown,
    source: idL,
    target: downstreamId,
    type: 'dtEdge',
    data: { leg: 'near-source' as EdgeLeg },
  });
  edges.push({
    id: eidRDown,
    source: idR,
    target: downstreamId,
    type: 'dtEdge',
    data: { leg: 'near-source' as EdgeLeg },
  });

  return { nodes, edges };
}
