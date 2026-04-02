import React, { useCallback, useState } from 'react';
import type { NodeTypeConfig } from '@nop-chaos/flow-designer-core';
import { useDesignerContext } from './designer-context';
import { DesignerIcon } from './designer-icon';
import { DESIGNER_PALETTE_NODE_MIME } from './canvas-bridge';

export function DesignerPaletteContent() {
  const { config, dispatch, snapshot } = useDesignerContext();
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
      dispatch({ type: 'addNode', nodeType: nodeType.id, position });
    },
    [dispatch]
  );

  const filteredGroups = paletteGroups.filter((g) => g.nodeTypes.length > 0);

  return (
    <div className="nop-palette flex flex-col h-full text-foreground">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-foreground">节点库</div>
          <div className="text-sm text-muted-foreground">拖拽或点击添加</div>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-border bg-transparent">{nodeTypes.length}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {filteredGroups.map((group) => (
          <div key={group.id} className="rounded-lg border border-border p-2.5 mb-3 last:mb-0" style={{ background: 'rgba(255, 255, 255, 0.45)' }}>
            <div
              className="nop-palette__group-header flex items-center gap-1.5 cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] mb-2 px-1"
              style={{ color: 'hsl(221.2, 83.2%, 40%)' }}
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
                  const isSelected = snapshot.activeNode?.type === nt.id;
                  return (
                    <div
                      key={nt.id}
                      className={`nop-palette__item flex items-center gap-2 rounded-xl border border-border p-2 mb-2 last:mb-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ${isSelected ? 'border-primary' : ''}`}
                      style={{ background: 'rgba(255, 255, 255, 0.7)' }}
                    >
                      <button
                        type="button"
                        className="flex flex-1 min-w-0 items-center gap-3 text-left bg-transparent border-none cursor-pointer p-0"
                        onClick={() => handleAddNode(nt)}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData(DESIGNER_PALETTE_NODE_MIME, nt.id);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        title={nt.description ?? nt.label}
                      >
                        <span className={`w-8 h-8 rounded-lg inline-flex items-center justify-center text-white shrink-0 nop-gradient-${nt.id}`} data-type={nt.id} aria-hidden="true">
                          {nt.icon ? <DesignerIcon icon={nt.icon} className="text-white" /> : '◇'}
                        </span>
                        <span className="text-sm font-medium text-foreground whitespace-nowrap overflow-hidden text-ellipsis">{nt.label}</span>
                      </button>
                      <button
                        type="button"
                        className="w-8 h-8 rounded-lg border-none bg-transparent cursor-pointer inline-flex items-center justify-center text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                        onClick={() => handleAddNode(nt)}
                        aria-label={`Add ${nt.label}`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14" /><path d="M12 5v14" />
                        </svg>
                      </button>
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
