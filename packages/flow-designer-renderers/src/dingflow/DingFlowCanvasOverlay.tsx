import React, { useCallback, useMemo, useState } from 'react';
import { ViewportPortal } from '@xyflow/react';
import { UserCheck, Send } from 'lucide-react';
import { useDesignerContext, useDesignerSnapshotSelector } from '../designer-context';
import { computeDingFlowOverlays } from './dingflow-overlays';
import { DingFlowAddConditionOverlay } from './DingFlowAddConditionOverlay';
import { DingFlowMergeOverlay } from './DingFlowMergeOverlay';
import { DingFlowAddNodeMenu } from './DingFlowAddNodeMenu';
import type { DingFlowMenuItem } from './DingFlowAddNodeMenu';
import { resolveNodeTypeAccent } from '../designer-node-appearance';

interface PopoverState {
  sourceId: string;
  screenX: number;
  screenY: number;
}

const DEFAULT_MENU_ITEMS: DingFlowMenuItem[] = [
  { type: 'dt-approval', color: '#ff943e', icon: <UserCheck size={20} />, label: 'Approver' },
  { type: 'dt-cc', color: '#3296fa', icon: <Send size={20} />, label: 'CC' },
  { type: 'dt-condition', color: '#15bc83', icon: <span className="text-xs font-bold">Cond</span>, label: 'Condition' },
];

export function DingFlowCanvasOverlay({ children }: { children: React.ReactNode }) {
  const { dispatch, config } = useDesignerContext();
  const nodes = useDesignerSnapshotSelector((s) => s.doc.nodes);
  const edges = useDesignerSnapshotSelector((s) => s.doc.edges);
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const overlays = useMemo(
    () => computeDingFlowOverlays(nodes, edges),
    [nodes, edges],
  );

  const menuItems = useMemo<DingFlowMenuItem[]>(() => DEFAULT_MENU_ITEMS.map((item) => ({
    ...item,
    color: resolveNodeTypeAccent(item.type, config.nodeTypes.find((nodeType) => nodeType.id === item.type)) ?? item.color,
  })), [config.nodeTypes]);

  const handlePlusClick = useCallback((sourceId: string, clientX: number, clientY: number) => {
    setPopover({ sourceId, screenX: clientX, screenY: clientY });
  }, []);

  const handleClose = useCallback(() => {
    setPopover(null);
  }, []);

  const handleSelect = useCallback((type: string) => {
    if (!popover) return;
    const { sourceId } = popover;
    const isMerge = sourceId.startsWith('merge:');
    const effectiveId = isMerge ? sourceId.slice('merge:'.length) : sourceId;
    setPopover(null);

    if (type === 'dt-condition') {
      dispatch({
        type: 'insertBranchPair',
        sourceId: effectiveId,
        condNodeType: type,
        condData: { title: 'Condition', desc: 'Please set' },
      });
    } else if (isMerge) {
      dispatch({
        type: 'insertChainNodeAtMerge',
        targetId: effectiveId,
        nodeType: type,
        data: { label: type === 'dt-approval' ? 'Approver' : 'CC', desc: 'Please set' },
      });
    } else {
      dispatch({
        type: 'insertChainNode',
        sourceId: effectiveId,
        nodeType: type,
        data: { label: type === 'dt-approval' ? 'Approver' : 'CC', desc: 'Please set' },
      });
    }
  }, [popover, dispatch]);

  return (
    <>
      {children}
      <ViewportPortal>
        {overlays.map((overlay) => (
          <div
            key={overlay.id}
            className="absolute z-[5] pointer-events-auto nopan nodrag"
            style={{
              transform: `translate(${overlay.x}px, ${overlay.y}px) translate(-50%, -50%)`,
            }}
          >
            {overlay.kind === 'addCondition' ? (
              <DingFlowAddConditionOverlay
                onClick={(e) => handlePlusClick(overlay.sourceId, e.clientX, e.clientY)}
              />
            ) : (
              <DingFlowMergeOverlay
                onClick={(e) => handlePlusClick(overlay.sourceId, e.clientX, e.clientY)}
              />
            )}
          </div>
        ))}
      </ViewportPortal>
      {popover && (
        <DingFlowAddNodeMenu
          screenX={popover.screenX}
          screenY={popover.screenY}
          items={menuItems}
          onSelect={handleSelect}
          onClose={handleClose}
        />
      )}
    </>
  );
}
