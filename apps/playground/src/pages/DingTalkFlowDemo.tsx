import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  MarkerType,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type DefaultEdgeOptions,
  Handle,
  Position,
  BaseEdge,
  useReactFlow,
  ReactFlowProvider,
  ViewportPortal,
  type NodeProps,
  type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ChevronLeft, Plus, Send, User, UserCheck } from 'lucide-react';
import { Button, cn } from '@nop-chaos/ui';

const CONNECTOR_COLOR = '#cacaca';
const W = 220;
const CARD_H = 72;
const TITLE_H = 24;
const BTN_DIAMETER = 28;
const BTN_DIST = 36;
const ROW_STEP = 156;
const BRANCH_EXTRA = 47;
const MERGE_EXTRA = 86;
const BRANCH_W = 260;
const END_W = 80;
const BRANCH_SHORT_LEG = 32;
const MERGE_SHORT_LEG = 84;

const COLORS = {
  promoter: '#576a95',
  approval: '#ff943e',
  cc: '#3296fa',
  condition: '#15bc83',
} as const;

type EdgeLeg = 'near-target' | 'near-source';

interface ApprovalData {
  label: string;
  desc: string;
  color: string;
  icon: 'user' | 'usercheck' | 'send';
  showAddBtn: boolean;
}
interface CondData {
  title: string;
  desc: string;
  priority: number;
  showAddBtn: boolean;
}
interface EndData { [k: string]: unknown }

interface PopoverState {
  sourceId: string;
  screenX: number;
  screenY: number;
}

type AddType = 'approver' | 'cc' | 'condition';

let _onPlusClick: ((sourceId: string, clientX: number, clientY: number) => void) | null = null;

const ICONS: Record<string, React.ReactNode> = {
  user: <User size={14} />,
  usercheck: <UserCheck size={14} />,
  send: <Send size={14} />,
};

function AddBtn() {
  return (
    <div
      className={cn(
        'flex items-center justify-center cursor-pointer',
        'rounded-full bg-[#3296fa] text-white',
        'shadow-[0_2px_4px_rgba(50,150,250,0.4)]',
      )}
      style={{ width: BTN_DIAMETER, height: BTN_DIAMETER }}
    >
      <Plus size={16} />
    </div>
  );
}

function ApprovalNode({ id, data }: NodeProps) {
  const d = data as unknown as ApprovalData;
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div
        className={cn(
          'overflow-hidden bg-white cursor-pointer',
          'rounded shadow-[0_2px_5px_0_rgba(0,0,0,0.1)]',
        )}
        style={{ width: W, minHeight: CARD_H }}
      >
        <div
          className="flex items-center text-white text-xs font-medium pl-4 pr-[30px] gap-[5px]"
          style={{ height: TITLE_H, backgroundColor: d.color }}
        >
          <span className="flex items-center">{ICONS[d.icon]}</span>
          <span>{d.label}</span>
        </div>
        <div className="p-[15px] text-[13px] text-[#666]">{d.desc}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      {d.showAddBtn && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[2]"
          style={{ bottom: -BTN_DIST }}
          onClick={(e) => { e.stopPropagation(); _onPlusClick?.(id, e.clientX, e.clientY); }}
        >
          <AddBtn />
        </div>
      )}
    </div>
  );
}

function CondNode({ id, data }: NodeProps) {
  const d = data as unknown as CondData;
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div
        className={cn(
          'bg-white cursor-pointer',
          'rounded shadow-[0_2px_5px_0_rgba(0,0,0,0.1)]',
        )}
        style={{ width: W, minHeight: CARD_H, padding: 15 }}
      >
        <div className="flex items-center justify-between leading-[16px]">
          <span
            className="text-[13px] font-medium"
            style={{ color: COLORS.condition }}
          >
            {d.title}
          </span>
          <span className="text-[12px] text-[#999]">P{d.priority}</span>
        </div>
        <div className="pt-[10px] text-[13px] text-[#666]">{d.desc}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      {d.showAddBtn && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[2]"
          style={{ bottom: -BTN_DIST }}
          onClick={(e) => { e.stopPropagation(); _onPlusClick?.(id, e.clientX, e.clientY); }}
        >
          <AddBtn />
        </div>
      )}
    </div>
  );
}

function EndNode() {
  return (
    <div className="relative" style={{ width: END_W }}>
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div className="flex flex-col items-center">
        <div className="w-[10px] h-[10px] rounded-full bg-[#ccc]" />
        <span className="text-[12px] mt-[5px] text-[rgba(25,31,37,0.4)]">End</span>
      </div>
    </div>
  );
}

function DingTalkEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  data,
}: EdgeProps) {
  const sx = Math.round(sourceX);
  const sy = Math.round(sourceY);
  const tx = Math.round(targetX);
  const ty = Math.round(targetY);

  let path: string;
  if (sx === tx) {
    path = `M${sx} ${sy}L${tx} ${ty}`;
  } else {
    const leg = (data as { leg?: EdgeLeg } | undefined)?.leg ?? 'near-target';
    const midY = leg === 'near-target'
      ? Math.round(ty - BRANCH_SHORT_LEG)
      : Math.round(sy + MERGE_SHORT_LEG);
    path = `M${sx} ${sy}L${sx} ${midY}L${tx} ${midY}L${tx} ${ty}`;
  }

  return (
    <BaseEdge
      path={path}
      style={{ stroke: CONNECTOR_COLOR, strokeWidth: 2 }}
      markerEnd={markerEnd}
    />
  );
}

const nodeTypes: NodeTypes = {
  dtApproval: memo(ApprovalNode),
  dtCond: memo(CondNode),
  dtEnd: memo(EndNode),
};

const edgeTypes: EdgeTypes = {
  dtEdge: memo(DingTalkEdge),
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed, color: CONNECTOR_COLOR },
};

interface BranchOverlay {
  x: number;
  y: number;
  type: 'addCondition' | 'mergeAdd';
  sourceId: string;
}

function AddNodeMenu({ popover, onSelect, onClose }: {
  popover: PopoverState;
  onSelect: (type: AddType) => void;
  onClose: () => void;
}) {
  const items: { type: AddType; color: string; icon: React.ReactNode; label: string }[] = [
    { type: 'approver', color: COLORS.approval, icon: <UserCheck size={20} />, label: 'Approver' },
    { type: 'cc', color: COLORS.cc, icon: <Send size={20} />, label: 'CC' },
    { type: 'condition', color: COLORS.condition, icon: <span className="text-xs font-bold">Cond</span>, label: 'Condition' },
  ];
  return (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} />
      <div
        className="fixed z-[101] flex gap-4 bg-white rounded-lg shadow-lg px-5 py-3"
        style={{ left: popover.screenX - 100, top: popover.screenY - 110 }}
      >
        {items.map((item) => (
          <Button
            key={item.type}
            type="button"
            variant="ghost"
            className="h-auto flex-col gap-1 px-0 py-0"
            onClick={(e) => { e.stopPropagation(); onSelect(item.type); }}
          >
            <div
              className="flex items-center justify-center rounded-full text-white"
              style={{ width: 50, height: 50, backgroundColor: item.color }}
            >
              {item.icon}
            </div>
            <span className="text-xs text-[#666]">{item.label}</span>
          </Button>
        ))}
      </div>
    </>
  );
}

function buildFlowData() {
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
      icon: 'usercheck',
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
    data: { title: 'Long Leave', desc: 'Leave days > 7', priority: 1, showAddBtn: true } satisfies CondData,
  });
  edges.push({
    id: nextEdgeId(), source: id1, target: id2l, type: 'dtEdge',
    data: { leg: 'near-target' as EdgeLeg },
  });

  const id2r = nextNodeId();
  nodes.push({
    id: id2r,
    type: 'dtCond',
    position: { x: rx - W / 2, y: y2 },
    data: { title: 'Short Leave', desc: 'Other conditions', priority: 2, showAddBtn: true } satisfies CondData,
  });
  edges.push({
    id: nextEdgeId(), source: id1, target: id2r, type: 'dtEdge',
    data: { leg: 'near-target' as EdgeLeg },
  });

  const y3 = y2 + ROW_STEP;
  const id3l = nextNodeId();
  nodes.push({
    id: id3l,
    type: 'dtApproval',
    position: { x: lx - W / 2, y: y3 },
    data: { label: 'Director Approval', desc: 'Alice', color: COLORS.approval, icon: 'usercheck', showAddBtn: true } satisfies ApprovalData,
  });
  edges.push({ id: nextEdgeId(), source: id2l, target: id3l, type: 'dtEdge' });

  const id3r = nextNodeId();
  nodes.push({
    id: id3r,
    type: 'dtApproval',
    position: { x: rx - W / 2, y: y3 },
    data: { label: 'Manager Approval', desc: 'Direct Manager', color: COLORS.approval, icon: 'usercheck', showAddBtn: true } satisfies ApprovalData,
  });
  edges.push({ id: nextEdgeId(), source: id2r, target: id3r, type: 'dtEdge' });

  const y4 = y3 + ROW_STEP + MERGE_EXTRA;
  const id4 = nextNodeId();
  nodes.push({
    id: id4,
    type: 'dtApproval',
    position: { x: cx - W / 2, y: y4 },
    data: { label: 'CC', desc: 'Bob', color: COLORS.cc, icon: 'send', showAddBtn: true } satisfies ApprovalData,
  });
  edges.push({
    id: nextEdgeId(), source: id3l, target: id4, type: 'dtEdge',
    data: { leg: 'near-source' as EdgeLeg },
  });
  edges.push({
    id: nextEdgeId(), source: id3r, target: id4, type: 'dtEdge',
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
      { x: cx, y: mergeLineY + BTN_DIST, type: 'mergeAdd' as const, sourceId: `merge:${id4}` },
    ] as BranchOverlay[],
  };
}

const initialFlowData = buildFlowData();

function insertNode(
  sourceId: string,
  addType: 'approver' | 'cc',
  prevNodes: Node[],
  prevEdges: Edge[],
  idCounter: { value: number },
  isMergeOverlay: boolean,
): { nodes: Node[]; edges: Edge[] } {
  const nodes = prevNodes.map(n => ({ ...n }));
  const edges = prevEdges.map(e => ({ ...e }));
  const id = `n${++idCounter.value}`;
  const eid1 = `e${++idCounter.value}`;
  const eid2 = `e${++idCounter.value}`;

  const label = addType === 'approver' ? 'Approver' : 'CC';
  const desc = 'Please set';
  const color = addType === 'approver' ? COLORS.approval : COLORS.cc;
  const icon = addType === 'approver' ? 'usercheck' : 'send';

  const newData: ApprovalData = { label, desc, color, icon, showAddBtn: true };

  if (isMergeOverlay) {
    const targetIdx = nodes.findIndex(n => n.id === sourceId);
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
    const outEdge = edges.find(e => e.source === sourceId);
    if (!outEdge) return { nodes: prevNodes, edges: prevEdges };
    const downstreamId = outEdge.target;
    const sourceNode = nodes.find(n => n.id === sourceId);
    const downstreamNode = nodes.find(n => n.id === downstreamId);
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

function insertBranch(
  sourceId: string,
  prevNodes: Node[],
  prevEdges: Edge[],
  idCounter: { value: number },
): { nodes: Node[]; edges: Edge[] } {
  const nodes = prevNodes.map(n => ({ ...n }));
  const edges = prevEdges.map(e => ({ ...e }));

  const outEdge = edges.find(e => e.source === sourceId);
  if (!outEdge) return { nodes: prevNodes, edges: prevEdges };
  const downstreamId = outEdge.target;
  const sourceNode = nodes.find(n => n.id === sourceId);
  const downstreamNode = nodes.find(n => n.id === downstreamId);
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

  const existingBranches = edges.filter(e => e.source === sourceId).length;

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
    data: { title: 'Condition', desc: 'Please set', priority: existingBranches + 1, showAddBtn: true } as unknown as Record<string, unknown>,
  });
  nodes.push({
    id: idR,
    type: 'dtCond',
    position: { x: rx - W / 2, y: condY },
    data: { title: 'Condition', desc: 'Please set', priority: existingBranches + 2, showAddBtn: true } as unknown as Record<string, unknown>,
  });

  const oldIdx = edges.indexOf(outEdge);
  edges.splice(oldIdx, 1);

  edges.push({ id: eidSrcL, source: sourceId, target: idL, type: 'dtEdge', data: { leg: 'near-target' as EdgeLeg } });
  edges.push({ id: eidSrcR, source: sourceId, target: idR, type: 'dtEdge', data: { leg: 'near-target' as EdgeLeg } });

  edges.push({ id: eidLDown, source: idL, target: downstreamId, type: 'dtEdge', data: { leg: 'near-source' as EdgeLeg } });
  edges.push({ id: eidRDown, source: idR, target: downstreamId, type: 'dtEdge', data: { leg: 'near-source' as EdgeLeg } });

  return { nodes, edges };
}

function DingTalkFlowCanvas({ onBack }: { onBack: () => void }) {
  const { fitView } = useReactFlow();
  const idCounter = useRef({ value: 20 });
  const [nodes, setNodes] = useState<Node[]>(() => initialFlowData.nodes);
  const [edges, setEdges] = useState<Edge[]>(() => initialFlowData.edges);
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const overlays = useMemo(() => {
    const result: BranchOverlay[] = [];
    const sourceGroups = new Map<string, Edge[]>();
    for (const e of edges) {
      const arr = sourceGroups.get(e.source) ?? [];
      arr.push(e);
      sourceGroups.set(e.source, arr);
    }
    const targetGroups = new Map<string, Edge[]>();
    for (const e of edges) {
      const arr = targetGroups.get(e.target) ?? [];
      arr.push(e);
      targetGroups.set(e.target, arr);
    }

    for (const [sourceId, outs] of sourceGroups) {
      if (outs.length < 2) continue;
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (!sourceNode) continue;
      const firstTarget = nodes.find(n => n.id === outs[0].target);
      if (!firstTarget) continue;
      const branchLineY = firstTarget.position.y - BRANCH_SHORT_LEG;
      const cx = sourceNode.position.x + W / 2;
      result.push({ x: cx, y: branchLineY, type: 'addCondition', sourceId });
    }

    for (const [targetId, ins] of targetGroups) {
      if (ins.length < 2) continue;
      const targetNode = nodes.find(n => n.id === targetId);
      if (!targetNode) continue;
      const firstSource = nodes.find(n => n.id === ins[0].source);
      if (!firstSource) continue;
      const mergeLineY = firstSource.position.y + CARD_H + MERGE_SHORT_LEG;
      const cx = targetNode.position.x + W / 2;
      result.push({ x: cx, y: mergeLineY + BTN_DIST, type: 'mergeAdd', sourceId: `merge:${targetId}` });
    }

    return result;
  }, [nodes, edges]);

  const handlePlusClick = useCallback((sourceId: string, clientX: number, clientY: number) => {
    setPopover({ sourceId, screenX: clientX, screenY: clientY });
  }, []);

  useEffect(() => {
    _onPlusClick = handlePlusClick;
    return () => {
      if (_onPlusClick === handlePlusClick) {
        _onPlusClick = null;
      }
    };
  }, [handlePlusClick]);

  const handleSelect = useCallback((type: AddType) => {
    if (!popover) return;
    const { sourceId } = popover;
    const isMerge = sourceId.startsWith('merge:');
    const effectiveId = isMerge ? sourceId.slice('merge:'.length) : sourceId;
    setPopover(null);

    if (type === 'condition') {
      const result = insertBranch(effectiveId, nodes, edges, idCounter.current);
      setNodes(result.nodes);
      setEdges(result.edges);
    } else {
      const result = insertNode(effectiveId, type, nodes, edges, idCounter.current, isMerge);
      setNodes(result.nodes);
      setEdges(result.edges);
    }
  }, [popover, nodes, edges]);

  const onInit = useCallback(() => {
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [fitView]);

  return (
    <div className="relative h-screen w-full bg-[#f5f5f5]">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 bg-white rounded-md shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium"
      >
        <ChevronLeft size={16} />
        Back
      </Button>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onInit={onInit}
        fitView
        panOnDrag
        zoomOnScroll
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e0e0e0" gap={20} size={1} />
        <ViewportPortal>
          {overlays.map((o, i) => (
            <div
              key={`overlay-${i}`}
              className="absolute z-[5] pointer-events-auto nopan nodrag"
              style={{
                transform: `translate(${o.x}px, ${o.y}px) translate(-50%, -50%)`,
              }}
            >
              {o.type === 'addCondition' ? (
                <div
                  className={cn(
                    'px-[14px] py-[4px] rounded-[20px]',
                    'bg-white border border-[#b3e19d]',
                    'text-[#67c23a] text-xs cursor-pointer whitespace-nowrap',
                  )}
                  onClick={(e) => { e.stopPropagation(); _onPlusClick?.(o.sourceId, e.clientX, e.clientY); }}
                >
                  Add Condition
                </div>
              ) : (
                <div
                  className="flex items-center justify-center cursor-pointer rounded-full bg-[#3296fa] text-white shadow-[0_2px_4px_rgba(50,150,250,0.4)]"
                  style={{ width: BTN_DIAMETER, height: BTN_DIAMETER }}
                  onClick={(e) => { e.stopPropagation(); _onPlusClick?.(o.sourceId, e.clientX, e.clientY); }}
                >
                  <Plus size={16} />
                </div>
              )}
            </div>
          ))}
        </ViewportPortal>
      </ReactFlow>

      {popover && (
        <AddNodeMenu
          popover={popover}
          onSelect={handleSelect}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}

interface DingTalkFlowDemoProps {
  onBack: () => void;
}

export function DingTalkFlowDemo({ onBack }: DingTalkFlowDemoProps) {
  return (
    <ReactFlowProvider>
      <DingTalkFlowCanvas onBack={onBack} />
    </ReactFlowProvider>
  );
}
