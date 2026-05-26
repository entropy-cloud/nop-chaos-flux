import React, { useCallback, useState } from 'react';
import type { NodeTypeConfig } from '@nop-chaos/flow-designer-core';
import { t } from '@nop-chaos/flux-i18n';
import { useDesignerContext, useDesignerSnapshotSelector } from './designer-context.js';
import { DesignerIcon } from './designer-icon.js';
import { DESIGNER_PALETTE_NODE_MIME } from './canvas-bridge.js';
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, cn } from '@nop-chaos/ui';
import { resolveNodeTypeAccent } from './designer-node-appearance.js';

const DEFAULT_INSERT_POSITION = { x: 180, y: 120 };
const ACTIVE_NODE_INSERT_OFFSET = { x: 220, y: 0 };

function resolvePaletteAccent(nodeType: NodeTypeConfig) {
  return resolveNodeTypeAccent(nodeType.id, nodeType) ?? 'hsl(var(--primary))';
}

export function DesignerPaletteContent(props: {
  classAliases?: Record<string, string>;
  rootProps?: {
    className?: string;
    'data-testid'?: string;
    'data-cid'?: string;
  };
} = {}) {
  const { config, dispatch, openCreateDialog } = useDesignerContext();
  const activeNode = useDesignerSnapshotSelector((s) => s.activeNode);
  const activeNodeType = useDesignerSnapshotSelector((s) => s.activeNode?.type);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['basic', 'logic', 'execution']),
  );

  const nodeTypes = config.nodeTypes;
  const nodeTypesById = new Map(nodeTypes.map((nodeType) => [nodeType.id, nodeType] as const));
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
      const position = activeNode?.position
        ? {
            x: activeNode.position.x + ACTIVE_NODE_INSERT_OFFSET.x,
            y: activeNode.position.y + ACTIVE_NODE_INSERT_OFFSET.y,
          }
        : DEFAULT_INSERT_POSITION;
      if (nodeType.createDialog && openCreateDialog) {
        openCreateDialog(nodeType, position);
        return;
      }
      dispatch({ type: 'addNode', nodeType: nodeType.id, position });
    },
    [activeNode, dispatch, openCreateDialog],
  );

  const filteredGroups = paletteGroups.filter((g) => g.nodeTypes.length > 0);

  return (
    <div
      className={cn('nop-palette h-full text-foreground', props.rootProps?.className)}
      data-testid={props.rootProps?.['data-testid']}
        data-cid={props.rootProps?.['data-cid']}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{t('flux.flowDesigner.paletteTitle')}</div>
          <div className="text-sm text-muted-foreground">{t('flux.flowDesigner.addNodeHint')}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-border bg-transparent">
            {nodeTypes.length}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => dispatch({ type: 'togglePalette' })}
            aria-label={t('flux.flowDesigner.collapsePalette')}
            data-testid="collapse-palette"
          >
            <DesignerIcon icon="chevron-left" />
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {filteredGroups.map((group) => (
          <Collapsible
            key={group.id}
            open={expandedGroups.has(group.id)}
            onOpenChange={() => toggleGroup(group.id)}
          >
            <div className="fd-panel-card rounded-lg border border-border p-2.5 mb-3 last:mb-0">
              <CollapsibleTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    data-slot="designer-palette-group-header"
                    className="fd-panel-caption mb-2 flex w-full items-center justify-start gap-1.5 px-1 text-xs font-semibold uppercase tracking-[0.18em]"
                  />
                }
              >
                <span className="text-[10px] text-muted-foreground">
                  {expandedGroups.has(group.id) ? '▼' : '▶'}
                </span>
                <span>{group.label}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div id={`designer-palette-group-${group.id}`}>
                {group.nodeTypes.map((ntId) => {
                  const nt = nodeTypesById.get(ntId);
                  if (!nt) return null;
                  const isSelected = activeNodeType === nt.id;
                  return (
                    <div
                      key={nt.id}
                      data-slot="designer-palette-item"
                      className={cn(
                        'fd-palette-item flex items-center gap-2 rounded-xl border border-border p-2 mb-2 last:mb-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
                        isSelected && 'border-primary',
                      )}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        className="flex flex-1 min-w-0 items-center justify-start gap-3 text-left border-none p-0 hover:bg-transparent"
                        onClick={() => handleAddNode(nt)}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData(DESIGNER_PALETTE_NODE_MIME, nt.id);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        title={nt.description ?? nt.label}
                      >
                         <span
                           className={cn(
                             'fd-palette-swatch w-8 h-8 rounded-lg inline-flex items-center justify-center text-white shrink-0',
                           )}
                           style={{
                             '--fd-palette-accent': resolvePaletteAccent(nt),
                           } as React.CSSProperties}
                           data-type={nt.id}
                           aria-hidden="true"
                         >
                          {nt.icon ? <DesignerIcon icon={nt.icon} className="text-white" /> : '◇'}
                        </span>
                        <span className="text-sm font-medium text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                          {nt.label}
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground"
                        onClick={() => handleAddNode(nt)}
                        aria-label={t('flux.flowDesigner.addNodeWithLabel', { label: nt.label })}
                      >
                        <DesignerIcon icon="plus" />
                      </Button>
                    </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
