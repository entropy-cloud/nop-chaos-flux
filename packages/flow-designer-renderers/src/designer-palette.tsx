import React, { useCallback, useState } from 'react';
import type { NodeTypeConfig } from '@nop-chaos/flow-designer-core';
import { useDesignerContext, useDesignerSnapshotSelector } from './designer-context';
import { DesignerIcon } from './designer-icon';
import { DESIGNER_PALETTE_NODE_MIME } from './canvas-bridge';
import { Button, cn } from '@nop-chaos/ui';

export function DesignerPaletteContent() {
  const { config, dispatch, openCreateDialog } = useDesignerContext();
  const activeNodeType = useDesignerSnapshotSelector((s) => s.activeNode?.type);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['basic', 'logic', 'execution']));

  const nodeTypes = config.nodeTypes;
  const paletteGroups = config.palette?.groups ?? [];

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const handleAddNode = useCallback(
    (nodeType: NodeTypeConfig) => {
      const position = { x: 180 + Math.random() * 200, y: 120 + Math.random() * 200 };
      if (nodeType.createDialog && openCreateDialog) {
        openCreateDialog(nodeType, position);
        return;
      }
      dispatch({ type: 'addNode', nodeType: nodeType.id, position });
    },
    [dispatch, openCreateDialog]
  );

  const filteredGroups = paletteGroups.filter((g) => g.nodeTypes.length > 0);

  return (
    <div className={cn('nop-palette h-full text-foreground')}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-foreground">节点库</div>
          <div className="text-sm text-muted-foreground">拖拽或点击添加</div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-border bg-transparent">{nodeTypes.length}</span>
          <Button variant="ghost" size="icon-sm" onClick={() => dispatch({ type: 'togglePalette' })} aria-label="Collapse palette" data-testid="collapse-palette">
            <DesignerIcon icon="chevron-left" />
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {filteredGroups.map((group) => (
          <div key={group.id} className="fd-panel-card rounded-lg border border-border p-2.5 mb-3 last:mb-0">
            <div
              data-slot="designer-palette-group-header"
              className="fd-panel-caption flex items-center gap-1.5 cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] mb-2 px-1"
              onClick={() => toggleGroup(group.id)}
            >
              <span className="text-[10px] text-muted-foreground">{expandedGroups.has(group.id) ? '▼' : '▶'}</span>
              <span>{group.label}</span>
            </div>
            {expandedGroups.has(group.id) && (
              <div>
                {group.nodeTypes.map((ntId) => {
                  const nt = nodeTypes.find((n) => n.id === ntId);
                  if (!nt) return null;
                  const isSelected = activeNodeType === nt.id;
                  return (
                    <div
                      key={nt.id}
                      data-slot="designer-palette-item"
                      className={cn(
                         'fd-palette-item flex items-center gap-2 rounded-xl border border-border p-2 mb-2 last:mb-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
                         isSelected && 'border-primary'
                       )}
                     >
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex flex-1 min-w-0 items-center gap-3 text-left border-none p-0 hover:bg-transparent"
                        onClick={() => handleAddNode(nt)}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData(DESIGNER_PALETTE_NODE_MIME, nt.id);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        title={nt.description ?? nt.label}
                      >
                        <span className={cn('w-8 h-8 rounded-lg inline-flex items-center justify-center text-white shrink-0', `nop-gradient-${nt.id}`)} data-type={nt.id} aria-hidden="true">
                          {nt.icon ? <DesignerIcon icon={nt.icon} className="text-white" /> : '◇'}
                        </span>
                        <span className="text-sm font-medium text-foreground whitespace-nowrap overflow-hidden text-ellipsis">{nt.label}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground"
                        onClick={() => handleAddNode(nt)}
                        aria-label={`Add ${nt.label}`}
                      >
                        <DesignerIcon icon="plus" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
