import React, { useCallback, useState } from 'react';
import type { NodeTypeConfig } from '@nop-chaos/flow-designer-core';
import { useDesignerContext } from './designer-context';

export function DesignerPaletteContent() {
  const { config, dispatch } = useDesignerContext();
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
    <div className="fd-palette">
      <div className="fd-palette__header">
        <h3>Node Palette</h3>
        {config.palette?.searchable !== false && (
          <input
            type="text"
            className="fd-palette__search"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>
      <div className="fd-palette__groups">
        {filteredGroups.map((group) => (
          <div key={group.id} className="fd-palette__group">
            <div
              className="fd-palette__group-header"
              onClick={() => toggleGroup(group.id)}
            >
              <span className="fd-palette__group-toggle">{expandedGroups.has(group.id) ? '▼' : '▶'}</span>
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
                      onClick={() => handleAddNode(nt)}
                      title={nt.description ?? nt.label}
                    >
                      <span className="fd-palette__item-icon">{nt.icon ?? '◇'}</span>
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
  );
}
