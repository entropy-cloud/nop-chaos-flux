import React from 'react';
import type { DesignerConfig, NodeTypeConfig } from '@nop-chaos/flow-designer-core';

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
  onAddNode
}: FlowDesignerPaletteProps) {
  const nodeTypes = config.nodeTypes;
  const paletteGroups = config.palette?.groups ?? [];

  const filteredGroups = paletteGroups.map((group) => ({
    ...group,
    nodeTypes: group.nodeTypes.filter((ntId) => {
      const nt = nodeTypes.find((n) => n.id === ntId);
      if (!nt) return false;
      if (!search) return true;
      return (
        nt.label.toLowerCase().includes(search.toLowerCase()) ||
        nt.id.toLowerCase().includes(search.toLowerCase())
      );
    })
  })).filter((g) => g.nodeTypes.length > 0);

  return (
    <div className="fd-page__palette">
      <div className="fd-palette">
        <div className="fd-palette__header">
          <h3>Node Palette</h3>
          {config.palette?.searchable !== false && (
            <input
              type="text"
              className="fd-palette__search"
              placeholder="Search nodes..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          )}
        </div>
        <div className="fd-palette__groups">
          {filteredGroups.map((group) => (
            <div key={group.id} className="fd-palette__group">
              <div
                className="fd-palette__group-header"
                onClick={() => onToggleGroup(group.id)}
              >
                <span className="fd-palette__group-toggle">
                  {expandedGroups.has(group.id) ? '▼' : '▶'}
                </span>
                <span className="fd-palette__group-label">{group.label}</span>
              </div>
              {expandedGroups.has(group.id) && (
                <div className="fd-palette__group-items">
                  {group.nodeTypes.map((ntId) => {
                    const nt = nodeTypes.find((n) => n.id === ntId);
                    if (!nt) return null;
                    return (
                      <button
                        key={nt.id}
                        className="fd-palette__item"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('application/x-flow-designer-node-type', nt.id);
                          event.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => onAddNode(nt)}
                        title={nt.description ?? nt.label}
                        type="button"
                      >
                        <span className="fd-palette__item-icon">{nt.icon ?? '○'}</span>
                        <span className="fd-palette__item-label">{nt.label}</span>
                      </button>
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
