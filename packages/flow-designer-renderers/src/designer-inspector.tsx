import React from 'react';
import { t } from '@nop-chaos/flux-i18n';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { useNodeTypeConfig } from './designer-context';
import { Badge, Button, Input, Label, Textarea, cn } from '@nop-chaos/ui';
import { useDesignerContext, useDesignerFullSnapshot } from './designer-context';
import { DesignerIcon } from './designer-icon';
import { resolveNodeTypeAccent, resolveNodeTypeMeta } from './designer-node-appearance';

export interface DefaultInspectorProps {
  renderSchema?: (schema: SchemaInput) => React.ReactNode;
}

export function DefaultInspector(props: DefaultInspectorProps = {}) {
  const { dispatch } = useDesignerContext();
  const snapshot = useDesignerFullSnapshot();
  const { activeNode, activeEdge, doc } = snapshot;
  const nodeCount = doc.nodes.length;
  const edgeCount = doc.edges.length;

  const activeNodeTypeConfig = useNodeTypeConfig(activeNode?.type ?? '');
  const activeInspectorSchema = activeNodeTypeConfig?.inspector?.body;

  const renderNodeTypeHeader = () => {
    if (!activeNode) return null;
    const typeInfo = resolveNodeTypeMeta(activeNode.type, activeNodeTypeConfig);
    const accentColor = resolveNodeTypeAccent(activeNode.type, activeNodeTypeConfig);
    const displayLabel = typeInfo.label;

    return (
      <div className="flex items-center gap-3">
        {typeInfo.icon && accentColor && (
          <div 
            className="rounded-full p-2"
            style={{ backgroundColor: `${accentColor}20` }}
          >
            <span style={{ color: accentColor }}>
              <DesignerIcon icon={typeInfo.icon} size={20} />
            </span>
          </div>
        )}
        <div className="flex-1">
          <div className="font-medium text-foreground text-base">{String(activeNode.data.label ?? activeNode.id)}</div>
          <div className="flex items-center gap-2 mt-1">
            {accentColor && (
              <Badge 
                style={{ 
                  backgroundColor: `${accentColor}15`, 
                  color: accentColor,
                  border: `1px solid ${accentColor}30`
                }}
                className="text-xs font-medium"
              >
                {displayLabel}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGenericFields = () => {
    if (!activeNode) return null;
    const data = activeNode.data;
    return Object.entries(data).map(([key, value]) => {
      if (key === 'label' || key === 'description') return null;
      if (typeof value === 'object' && value !== null) return null;
      return (
        <div key={key} className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">{key}</Label>
          <Input
            type="text"
            value={String(value ?? '')}
            onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { [key]: e.target.value } })}
          />
        </div>
      );
    });
  };

  return (
    <div className={cn('nop-inspector flex flex-col h-full text-foreground')}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-foreground">属性面板</div>
          <div className="text-sm text-muted-foreground">编辑节点或连线属性</div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => dispatch({ type: 'toggleInspector' })} aria-label="Collapse inspector" data-testid="collapse-inspector">
          <DesignerIcon icon="chevron-right" />
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="fd-panel-card rounded-lg border border-border p-4 mb-4">
          <div className="fd-panel-caption text-xs font-semibold uppercase tracking-[0.18em]">流程信息</div>
          <div className="mt-2 font-medium text-foreground">{doc.name}</div>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-muted-foreground">
            <Badge variant="success">已启用</Badge>
            <span>{nodeCount} 个节点</span>
            <span>{edgeCount} 条连线</span>
          </div>
        </div>

        {activeNode ? (
          <>
            <div className="fd-panel-card rounded-lg border border-border p-4 mb-4">
              <div className="fd-panel-caption text-xs font-semibold uppercase tracking-[0.18em]">当前选中</div>
              <div className="mt-3">
                {renderNodeTypeHeader()}
                {activeNode.data.description ? (
                  <p className="text-sm text-muted-foreground mt-3">{String(activeNode.data.description)}</p>
                ) : null}
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="text-xs text-muted-foreground font-mono">{activeNode.id}</div>
                </div>
              </div>
            </div>
            <div className="fd-panel-card rounded-lg border border-border p-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-foreground">名称</Label>
                  <Input
                    type="text"
                    value={String(activeNode.data.label ?? '')}
                    onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { label: e.target.value } })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-foreground">描述</Label>
                  <Textarea
                    className="min-h-[80px] resize-y"
                    value={String(activeNode.data.description ?? '')}
                    onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { description: e.target.value } })}
                  />
                </div>
                {activeInspectorSchema && props.renderSchema
                  ? props.renderSchema(activeInspectorSchema)
                  : renderGenericFields()}
              </div>
            </div>
          </>
        ) : activeEdge ? (
          <>
            <div className="fd-panel-card rounded-lg border border-border p-4 mb-4">
              <div className="fd-panel-caption text-xs font-semibold uppercase tracking-[0.18em]">当前选中</div>
              <div className="mt-3">
                <div className="font-medium text-foreground">连线</div>
                <div className="text-sm text-muted-foreground mt-1">{activeEdge.source} → {activeEdge.target}</div>
              </div>
            </div>
            <div className="fd-panel-card rounded-lg border border-border p-4">
              <div className="flex flex-col gap-4">
                {Object.entries(activeEdge.data).map(([key, value]) => {
                  if (typeof value === 'object' && value !== null) return null;
                  return (
                    <div key={key} className="flex flex-col gap-2">
                      <Label className="text-sm font-medium text-foreground">{key}</Label>
                      <Input
                        type="text"
                        value={String(value ?? '')}
                        onChange={(e) => dispatch({ type: 'updateEdgeData', edgeId: activeEdge.id, data: { [key]: e.target.value } })}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="fd-panel-card rounded-lg border border-border p-4">
            <div className="fd-panel-caption text-xs font-semibold uppercase tracking-[0.18em]">快捷键</div>
            <div className="mt-3 text-sm text-muted-foreground space-y-2">
              <div><strong>{t('flux.flowDesigner.shortcutUndo')}</strong> {t('flux.flowDesigner.undo')}</div>
              <div><strong>{t('flux.flowDesigner.shortcutRedo')}</strong> {t('flux.flowDesigner.redo')}</div>
              <div><strong>{t('flux.flowDesigner.shortcutDelete')}</strong> {t('flux.flowDesigner.deleteSelected')}</div>
              <div><strong>{t('flux.flowDesigner.shortcutSave')}</strong> {t('flux.flowDesigner.save')}</div>
            </div>
          </div>
        )}

        {activeNode && (
          <div className="mt-4">
            <Button
              className="w-full min-h-8"
              variant="destructive"
              size="sm"
              onClick={() => dispatch({ type: 'deleteNode', nodeId: activeNode.id })}
            >
              删除节点
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
