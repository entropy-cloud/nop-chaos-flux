import React from 'react';
import type { DesignerConfig, NodeTypeConfig } from '@nop-chaos/flow-designer-core';
import { Button, Input } from '@nop-chaos/ui';

export interface FlowDesignerPaletteProps {
  config: DesignerConfig;
  search: string;
  expandedGroups: Set<string>;
  onSearchChange: (search: string) => void;
  onToggleGroup: (groupId: string) => void;
  onAddNode: (nodeType: NodeTypeConfig) => void;
}

export function FlowDesignerPalette({
  config,
  search,
  expandedGroups,
  onSearchChange,
  onToggleGroup,
  onAddNode,
}: FlowDesignerPaletteProps) {
  const nodeTypes = config.nodeTypes;
  const paletteGroups = config.palette?.groups ?? [];

  const filteredGroups = paletteGroups
    .map((group) => ({
      ...group,
      nodeTypes: group.nodeTypes.filter((ntId) => {
        const nt = nodeTypes.find((n) => n.id === ntId);
        if (!nt) return false;
        if (!search) return true;
        return (
          nt.label.toLowerCase().includes(search.toLowerCase()) ||
          nt.id.toLowerCase().includes(search.toLowerCase())
        );
      }),
    }))
    .filter((g) => g.nodeTypes.length > 0);

  return (
    <div data-slot="flow-designer-palette-shell">
      <div data-slot="flow-designer-palette">
        <div data-slot="flow-designer-palette-header">
          <h3>Node Palette</h3>
          {config.palette?.searchable !== false && (
            <Input
              type="text"
              placeholder="Search nodes..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          )}
        </div>
        <div data-slot="flow-designer-palette-groups">
          {filteredGroups.map((group) => (
            <div key={group.id} data-slot="flow-designer-palette-group">
              <div
                data-slot="flow-designer-palette-group-header"
                role="button"
                tabIndex={0}
                onClick={() => onToggleGroup(group.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleGroup(group.id);
                  }
                }}
              >
                <span data-slot="flow-designer-palette-group-toggle">
                  {expandedGroups.has(group.id) ? '▼' : '▶'}
                </span>
                <span data-slot="flow-designer-palette-group-label">{group.label}</span>
              </div>
              {expandedGroups.has(group.id) && (
                <div data-slot="flow-designer-palette-group-items">
                  {group.nodeTypes.map((ntId) => {
                    const nt = nodeTypes.find((n) => n.id === ntId);
                    if (!nt) return null;
                    return (
                      <Button
                        key={nt.id}
                        variant="ghost"
                        size="sm"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData(
                            'application/x-flow-designer-node-type',
                            nt.id,
                          );
                          event.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => onAddNode(nt)}
                        title={nt.description ?? nt.label}
                      >
                        <span data-slot="flow-designer-palette-item-icon">{nt.icon ?? '○'}</span>
                        <span data-slot="flow-designer-palette-item-label">{nt.label}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
