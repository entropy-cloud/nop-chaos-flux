import { memo, useCallback, useMemo } from 'react';
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
import { User, UserCheck, Send, Plus } from 'lucide-react';
import { cn } from '@nop-chaos/ui';

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

function ApprovalNode({ data }: NodeProps) {
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
        >
          <AddBtn />
        </div>
      )}
    </div>
  );
}

function CondNode({ data }: NodeProps) {
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
      { x: cx, y: branchLineY, type: 'addCondition' as const },
      { x: cx, y: mergeLineY + BTN_DIST, type: 'mergeAdd' as const },
    ] as BranchOverlay[],
  };
}

function DingTalkFlowCanvas({ onBack }: { onBack: () => void }) {
  const { fitView } = useReactFlow();
  const { nodes, edges, overlays } = useMemo(() => buildFlowData(), []);

  const onInit = useCallback(() => {
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [fitView]);

  return (
    <div className="relative h-screen w-full bg-[#f5f5f5]">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 bg-white rounded-md shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium"
      >
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back
      </button>

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
                >
                  Add Condition
                </div>
              ) : (
                <div
                  className="flex items-center justify-center cursor-pointer rounded-full bg-[#3296fa] text-white shadow-[0_2px_4px_rgba(50,150,250,0.4)]"
                  style={{ width: BTN_DIAMETER, height: BTN_DIAMETER }}
                >
                  <Plus size={16} />
                </div>
              )}
            </div>
          ))}
        </ViewportPortal>
      </ReactFlow>
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
