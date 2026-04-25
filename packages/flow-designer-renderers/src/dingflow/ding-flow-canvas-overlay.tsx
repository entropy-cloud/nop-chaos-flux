import React, { useCallback, useMemo, useState } from 'react';
import { ViewportPortal } from '@xyflow/react';
import { useDesignerContext, useDesignerSnapshotSelector } from '../designer-context';
import { DesignerIcon } from '../designer-icon';
import { computeDingFlowOverlays } from './dingflow-overlays';
import { DingFlowAddConditionOverlay } from './ding-flow-add-condition-overlay';
import { DingFlowMergeOverlay } from './ding-flow-merge-overlay';
import { DingFlowAddNodeMenu } from './ding-flow-add-node-menu';
import type { DingFlowMenuItem } from './ding-flow-add-node-menu';
import { compareTreeMenuNodeTypes, resolveNodeTypeAccent, resolveNodeTypeMeta, shouldIncludeInTreeAddMenu } from '../designer-node-appearance';

interface PopoverState {
  sourceId: string;
  screenX: number;
  screenY: number;
}

export function DingFlowCanvasOverlay({ children }: { children: React.ReactNode }) {
  const { dispatch, config } = useDesignerContext();
  const nodes = useDesignerSnapshotSelector((s) => s.doc.nodes);
  const edges = useDesignerSnapshotSelector((s) => s.doc.edges);
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const nodeSizeMap = useMemo(() => {
    const map = new Map<string, { minWidth?: number; minHeight?: number }>();
    for (const nodeType of config.nodeTypes) {
      map.set(nodeType.id, {
        minWidth: nodeType.appearance?.minWidth,
        minHeight: nodeType.appearance?.minHeight
      });
    }
    return map;
  }, [config.nodeTypes]);

  const overlays = useMemo(
    () => computeDingFlowOverlays(nodes, edges, nodeSizeMap),
    [nodes, edges, nodeSizeMap],
  );

  const menuItems = useMemo<DingFlowMenuItem[]>(() => config.nodeTypes
    .filter(shouldIncludeInTreeAddMenu)
    .sort(compareTreeMenuNodeTypes)
    .map((nodeType) => {
      const meta = resolveNodeTypeMeta(nodeType.id, nodeType);
      return {
        type: nodeType.id,
        label: meta.label,
        icon: meta.icon ? <DesignerIcon icon={meta.icon} size={20} /> : <span className="text-xs font-bold">+</span>,
        color: resolveNodeTypeAccent(nodeType.id, nodeType) ?? 'var(--fd-primary, #3296fa)',
      };
    }), [config.nodeTypes]);

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
