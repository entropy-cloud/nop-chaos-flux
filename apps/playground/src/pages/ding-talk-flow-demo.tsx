import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  useReactFlow,
  ReactFlowProvider,
  ViewportPortal,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ChevronLeft, Plus } from 'lucide-react';
import { Button, cn } from '@nop-chaos/ui';
import {
  type AddType,
  type BranchOverlay,
  type PopoverState,
  BTN_DIAMETER,
  BRANCH_SHORT_LEG,
  CARD_H,
  MERGE_SHORT_LEG,
  W,
} from './dingtalk-flow/types.js';
import {
  ApprovalNode,
  CondNode,
  EndNode,
  onPlusClick,
  setOnPlusClick,
} from './dingtalk-flow/nodes.js';
import { DingTalkEdge, defaultEdgeOptions } from './dingtalk-flow/edges.js';
import { AddNodeMenu } from './dingtalk-flow/menu.js';
import { buildFlowData, insertBranch, insertNode } from './dingtalk-flow/flow-operations.js';

const nodeTypes: NodeTypes = {
  dtApproval: ApprovalNode,
  dtCond: CondNode,
  dtEnd: EndNode,
};

const edgeTypes: EdgeTypes = {
  dtEdge: DingTalkEdge,
};

const initialFlowData = buildFlowData();

function DingTalkFlowCanvas({ onBack }: { onBack: () => void }) {
  const { fitView } = useReactFlow();
  const idCounter = useRef({ value: 20 });
  const [nodes, setNodes] = useState<Node[]>(() => initialFlowData.nodes);
  const [edges, setEdges] = useState<Edge[]>(() => initialFlowData.edges);
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const overlays = useMemo(() => {
    const result: BranchOverlay[] = [];
    const nodeMap = new Map(nodes.map((node) => [node.id, node] as const));
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
      const sourceNode = nodeMap.get(sourceId);
      if (!sourceNode) continue;
      const firstTarget = nodeMap.get(outs[0].target);
      if (!firstTarget) continue;
      const branchLineY = firstTarget.position.y - BRANCH_SHORT_LEG;
      const cx = sourceNode.position.x + W / 2;
      result.push({ x: cx, y: branchLineY, type: 'addCondition', sourceId });
    }

    for (const [targetId, ins] of targetGroups) {
      if (ins.length < 2) continue;
      const targetNode = nodeMap.get(targetId);
      if (!targetNode) continue;
      const firstSource = nodeMap.get(ins[0].source);
      if (!firstSource) continue;
      const mergeLineY = firstSource.position.y + CARD_H + MERGE_SHORT_LEG;
      const cx = targetNode.position.x + W / 2;
      result.push({
        x: cx,
        y: mergeLineY + BTN_DIAMETER + 8,
        type: 'mergeAdd',
        sourceId: `merge:${targetId}`,
      });
    }

    return result;
  }, [nodes, edges]);

  const handlePlusClick = useCallback((sourceId: string, clientX: number, clientY: number) => {
    setPopover({ sourceId, screenX: clientX, screenY: clientY });
  }, []);

  useEffect(() => {
    setOnPlusClick(handlePlusClick);
    return () => {
      if (onPlusClick === handlePlusClick) {
        setOnPlusClick(null);
      }
    };
  }, [handlePlusClick]);

  const handleSelect = useCallback(
    (type: AddType) => {
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
    },
    [popover, nodes, edges],
  );

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
          {overlays.map((o, index) => {
            const overlayKey = `${o.type}-${o.sourceId ?? 'source'}-${o.x}-${o.y}-${index}`;

            return (
              <div
                key={overlayKey}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlusClick?.(o.sourceId, e.clientX, e.clientY);
                    }}
                  >
                    Add Condition
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center cursor-pointer rounded-full bg-[#3296fa] text-white shadow-[0_2px_4px_rgba(50,150,250,0.4)]"
                    style={{ width: BTN_DIAMETER, height: BTN_DIAMETER }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlusClick?.(o.sourceId, e.clientX, e.clientY);
                    }}
                  >
                    <Plus size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </ViewportPortal>
      </ReactFlow>

      {popover && (
        <AddNodeMenu popover={popover} onSelect={handleSelect} onClose={() => setPopover(null)} />
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
