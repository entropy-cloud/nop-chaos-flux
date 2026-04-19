import React from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { useNodeTypeConfig } from './designer-context';
import { Badge, Button, Input, Label, NativeSelect, NativeSelectOption, Textarea, cn } from '@nop-chaos/ui';
import { useDesignerContext, useDesignerFullSnapshot } from './designer-context';
import { DesignerIcon } from './designer-icon';
import { resolveNodeTypeAccent } from './designer-node-appearance';

const NODE_TYPE_INFO: Record<string, { label: string; icon: string }> = {
  'dt-initiator': { label: '发起人', icon: 'user' },
  'dt-approval': { label: '审批节点', icon: 'user-check' },
  'dt-cc': { label: '抄送人', icon: 'mail' },
  'dt-condition': { label: '条件分支', icon: 'git-branch' },
  'dt-parallel': { label: '并行分支', icon: 'git-merge' },
  'dt-subprocess': { label: '子流程', icon: 'layers' },
  'dt-end': { label: '结束', icon: 'square' },
  'action-entry': { label: '入口', icon: 'play' },
  'action-step': { label: '动作', icon: 'zap' },
  'action-end': { label: '结束', icon: 'square' },
  'start': { label: '开始节点', icon: 'play' },
  'end': { label: '结束节点', icon: 'square' },
  'task': { label: '任务节点', icon: 'clipboard-list' },
  'condition': { label: '条件分支', icon: 'git-branch' },
  'parallel': { label: '并行网关', icon: 'git-merge' },
  'loop': { label: '循环节点', icon: 'repeat' },
};

const SET_TYPE_OPTIONS = [
  { value: '1', label: '指定成员' },
  { value: '2', label: '主管' },
  { value: '3', label: '角色' },
];

const EXAMINE_MODE_OPTIONS = [
  { value: '1', label: '依次审批' },
  { value: '2', label: '会签' },
  { value: '3', label: '或签' },
];

const MODE_OPTIONS = [
  { value: 'exclusive', label: '排他' },
  { value: 'parallel', label: '并行' },
];

export function DefaultInspector() {
  const { dispatch } = useDesignerContext();
  const snapshot = useDesignerFullSnapshot();
  const { activeNode, activeEdge, doc } = snapshot;
  const nodeCount = doc.nodes.length;
  const edgeCount = doc.edges.length;

  const getNodeTypeInfo = (nodeType: string) => {
    return NODE_TYPE_INFO[nodeType];
  };

  const activeNodeTypeConfig = useNodeTypeConfig(activeNode?.type ?? '');

  const renderNodeTypeHeader = () => {
    if (!activeNode) return null;
    const typeInfo = getNodeTypeInfo(activeNode.type);
    const accentColor = resolveNodeTypeAccent(activeNode.type, activeNodeTypeConfig);
    const displayLabel = typeInfo?.label || activeNode.type;

    return (
      <div className="flex items-center gap-3">
        {typeInfo && accentColor && (
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
            {typeInfo && accentColor && (
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

  const renderSpecificFields = () => {
    if (!activeNode) return null;
    const nodeType = activeNode.type;
    const data = activeNode.data;

    switch (nodeType) {
      case 'dt-approval':
        return (
          <>
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">审批人类型</Label>
              <NativeSelect
                value={String(data.setType ?? '1')}
                onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { setType: e.target.value } })}
              >
                {SET_TYPE_OPTIONS.map((opt) => (
                  <NativeSelectOption key={opt.value} value={opt.value}>{opt.label}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">审批模式</Label>
              <NativeSelect
                value={String(data.examineMode ?? '1')}
                onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { examineMode: e.target.value } })}
              >
                {EXAMINE_MODE_OPTIONS.map((opt) => (
                  <NativeSelectOption key={opt.value} value={opt.value}>{opt.label}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </>
        );

      case 'dt-condition':
        return (
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">分支模式</Label>
            <NativeSelect
              value={String(data.mode ?? 'exclusive')}
              onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { mode: e.target.value } })}
            >
              {MODE_OPTIONS.map((opt) => (
                <NativeSelectOption key={opt.value} value={opt.value}>{opt.label}</NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        );

      case 'dt-subprocess':
        return (
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-foreground">子流程标识</Label>
            <Input
              type="text"
              value={String(data.callProcess ?? '')}
              onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { callProcess: e.target.value } })}
            />
          </div>
        );

      case 'action-step':
        return (
          <>
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">动作类型</Label>
              <Input
                type="text"
                value={String(data.action ?? '')}
                onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { action: e.target.value } })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">执行条件</Label>
              <Input
                type="text"
                placeholder="表达式, 如: ${data.status === 'active'}"
                value={String(data.when ?? '')}
                onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { when: e.target.value } })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">超时(秒)</Label>
              <Input
                type="number"
                value={String(data.timeout ?? '')}
                onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { timeout: Number(e.target.value) || 0 } })}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const renderGenericFields = () => {
    if (!activeNode) return null;
    const data = activeNode.data;
    return Object.entries(data).map(([key, value]) => {
      if (key === 'label' || key === 'description') return null;
      if (typeof value === 'object' && value !== null) return null;
      if (activeNode.type === 'dt-approval' && (key === 'setType' || key === 'examineMode')) return null;
      if (activeNode.type === 'dt-condition' && key === 'mode') return null;
      if (activeNode.type === 'dt-subprocess' && key === 'callProcess') return null;
      if (activeNode.type === 'action-step' && (key === 'action' || key === 'when' || key === 'timeout')) return null;
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
                {renderSpecificFields()}
                {renderGenericFields()}
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
