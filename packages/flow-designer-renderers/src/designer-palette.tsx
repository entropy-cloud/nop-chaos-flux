import React, { useCallback, useState } from 'react';
import type { NodeTypeConfig } from '@nop-chaos/flow-designer-core';
import { useDesignerContext } from './designer-context';
import { DesignerIcon } from './designer-icon';
import { DESIGNER_PALETTE_NODE_MIME } from './canvas-bridge';
import { Button, Input } from '@nop-chaos/ui';

export function DesignerPaletteContent() {
  const { config, dispatch, snapshot } = useDesignerContext();
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['basic']));

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

  const filteredGroups = paletteGroups.map((group) => ({
    ...group,
    nodeTypes: group.nodeTypes.filter((ntId) => {
      const nt = nodeTypes.find((n) => n.id === ntId);
      if (!nt) return false;
      if (!search) return true;
      return nt.label.toLowerCase().includes(search.toLowerCase()) || nt.id.toLowerCase().includes(search.toLowerCase());
    })
  })).filter((g) => g.nodeTypes.length > 0);

  return (
    <div className="p-3.5 text-foreground">
      <div>
        <h3 className="m-0 mb-3.5 text-sm font-bold text-foreground">Node Palette</h3>
        {config.palette?.searchable !== false && (
          <Input
            type="text"
            className="w-full px-3 py-2 border border-border rounded-md text-[13px] text-foreground bg-card mb-3"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>
      <div>
        {filteredGroups.map((group) => (
          <div key={group.id} className="mb-2.5 border border-border rounded-2xl bg-muted p-2">
            <div
              className="flex items-center gap-1.5 px-2.5 py-2 cursor-pointer rounded-xl text-[13px] font-semibold text-foreground"
              onClick={() => toggleGroup(group.id)}
            >
              <span className="text-[11px] text-muted-foreground">{expandedGroups.has(group.id) ? '▼' : '▶'}</span>
              <span>{group.label}</span>
            </div>
            {expandedGroups.has(group.id) && (
              <div className="px-0 pt-1.5 pb-0.5">
                {group.nodeTypes.map((ntId) => {
                  const nt = nodeTypes.find((n) => n.id === ntId);
                  if (!nt) return null;
                  const isSelected = snapshot.activeNode?.type === nt.id;
                  return (
                    <Button
                      key={nt.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`w-full flex items-center gap-2 mb-1.5 px-3 py-2 border border-border rounded-[20px] bg-card shadow-[0_2px_8px_rgba(15,23,42,0.05)] text-foreground cursor-pointer text-sm transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] hover:border-primary ${isSelected ? '!border-primary bg-accent shadow-[0_8px_24px_rgba(15,23,42,0.14)]' : ''}`}
                      onClick={() => handleAddNode(nt)}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(DESIGNER_PALETTE_NODE_MIME, nt.id);
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      title={nt.description ?? nt.label}
                    >
                      <span className={`w-8 h-8 rounded-2xl inline-flex items-center justify-center ${isSelected ? 'nop-gradient-start' : ''}`} data-type={nt.id} aria-hidden="true">
                        {nt.icon ? <DesignerIcon icon={nt.icon} className={`nop-icon nop-icon--${nt.icon}`} /> : '◇'}
                      </span>
                      <span>{nt.label}</span>
                    </Button>
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
