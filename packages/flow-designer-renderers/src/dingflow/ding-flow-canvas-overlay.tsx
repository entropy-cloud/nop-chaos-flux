import React, { useCallback, useMemo, useState } from 'react';
import { ViewportPortal } from '@xyflow/react';
import { useDesignerContext, useDesignerSnapshotSelector } from '../designer-context.js';
import { DesignerIcon } from '../designer-icon.js';
import { computeDingFlowOverlays } from './dingflow-overlays.js';
import { DingFlowAddBranchOverlay } from './ding-flow-add-condition-overlay.js';
import { DingFlowMergeOverlay } from './ding-flow-merge-overlay.js';
import { DingFlowAddNodeMenu } from './ding-flow-add-node-menu.js';
import type { DingFlowMenuItem } from './ding-flow-add-node-menu.js';
import { createDingFlowMenuCommand } from './dingflow-command-dispatch.js';
import {
  compareTreeMenuNodeTypes,
  resolveNodeTypeAccent,
  resolveNodeTypeMeta,
  shouldIncludeInTreeAddMenu,
} from '../designer-node-appearance.js';

interface PopoverState {
  sourceId: string;
  screenX: number;
  screenY: number;
  sourceKind: 'node' | 'branch-group' | 'merge';
  returnFocusRef: React.RefObject<HTMLElement | null>;
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
        minHeight: nodeType.appearance?.minHeight,
      });
    }
    return map;
  }, [config.nodeTypes]);

  const overlays = useMemo(
    () => computeDingFlowOverlays(nodes, edges, nodeSizeMap),
    [nodes, edges, nodeSizeMap],
  );

  const menuItems = useMemo<DingFlowMenuItem[]>(
    () =>
      config.nodeTypes
        .filter(shouldIncludeInTreeAddMenu)
        .sort(compareTreeMenuNodeTypes)
        .map((nodeType) => {
          const meta = resolveNodeTypeMeta(nodeType.id, nodeType);
          return {
            type: nodeType.id,
            label: meta.label,
            icon: meta.icon ? (
              <DesignerIcon icon={meta.icon} size={20} />
            ) : (
              <span className="text-xs font-bold">+</span>
            ),
            color: resolveNodeTypeAccent(nodeType.id, nodeType) ?? 'var(--fd-primary, #3296fa)',
          };
        }),
    [config.nodeTypes],
  );
  const triggerRefs = React.useRef(new Map<string, HTMLButtonElement | null>());

  const setTriggerRef = useCallback(
    (key: string) => (node: HTMLButtonElement | null) => {
      triggerRefs.current.set(key, node);
    },
    [],
  );

  const handlePlusClick = useCallback(
    (
      sourceId: string,
      clientX: number,
      clientY: number,
      sourceKind: 'node' | 'branch-group' | 'merge',
      trigger: HTMLButtonElement | null,
    ) => {
      const returnFocusRef = { current: trigger } as React.RefObject<HTMLElement | null>;
      setPopover({ sourceId, screenX: clientX, screenY: clientY, sourceKind, returnFocusRef });
    },
    [],
  );

  const handleClose = useCallback(() => {
    setPopover(null);
  }, []);

  const handleSelect = useCallback(
    (type: string) => {
      if (!popover) return;
      const { sourceId, sourceKind } = popover;
      setPopover(null);

      dispatch(createDingFlowMenuCommand(sourceId, type, sourceKind));
    },
    [popover, dispatch],
  );

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
              <DingFlowAddBranchOverlay
                ref={setTriggerRef(overlay.id)}
                onClick={(e) =>
                  handlePlusClick(
                    overlay.sourceId,
                    e.clientX,
                    e.clientY,
                    'branch-group',
                    triggerRefs.current.get(overlay.id) ?? null,
                  )
                }
              />
            ) : (
              <DingFlowMergeOverlay
                ref={setTriggerRef(overlay.id)}
                onClick={(e) =>
                  handlePlusClick(
                    overlay.sourceId,
                    e.clientX,
                    e.clientY,
                    'merge',
                    triggerRefs.current.get(overlay.id) ?? null,
                  )
                }
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
          returnFocusRef={popover.returnFocusRef}
        />
      )}
    </>
  );
}
