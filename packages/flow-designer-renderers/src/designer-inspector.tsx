import React from 'react';
import { Badge, Button, Input, Label, NativeSelect } from '@nop-chaos/ui';
import { useDesignerContext } from './designer-context';
import { DesignerIcon } from './designer-icon';

const NODE_TYPE_INFO: Record<string, { label: string; icon: string; color: string }> = {
  'dt-initiator': { label: '发起人', icon: 'user', color: '#576a95' },
  'dt-approval': { label: '审批节点', icon: 'user-check', color: '#ff943e' },
  'dt-cc': { label: '抄送人', icon: 'mail', color: '#3296fa' },
  'dt-condition': { label: '条件分支', icon: 'git-branch', color: '#15bc83' },
  'dt-parallel': { label: '并行分支', icon: 'git-merge', color: '#6366f1' },
  'dt-subprocess': { label: '子流程', icon: 'layers', color: '#8b5cf6' },
  'dt-end': { label: '结束', icon: 'square', color: '#94a3b8' },
  'action-entry': { label: '入口', icon: 'play', color: '#10b981' },
  'action-step': { label: '动作', icon: 'zap', color: '#3b82f6' },
  'action-end': { label: '结束', icon: 'square', color: '#94a3b8' },
  'start': { label: '开始节点', icon: 'play', color: '#10b981' },
  'end': { label: '结束节点', icon: 'square', color: '#ef4444' },
  'task': { label: '任务节点', icon: 'clipboard-list', color: '#3b82f6' },
  'condition': { label: '条件分支', icon: 'git-branch', color: '#f59e0b' },
  'parallel': { label: '并行网关', icon: 'git-merge', color: '#8b5cf6' },
  'loop': { label: '循环节点', icon: 'repeat', color: '#ec4899' },
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
  const { dispatch, snapshot } = useDesignerContext();
  const { activeNode, activeEdge, doc } = snapshot;
  const nodeCount = doc.nodes.length;
  const edgeCount = doc.edges.length;

  const getNodeTypeInfo = (nodeType: string) => {
    return NODE_TYPE_INFO[nodeType];
  };

  const renderNodeTypeHeader = () => {
    if (!activeNode) return null;
    const typeInfo = getNodeTypeInfo(activeNode.type);
    const displayLabel = typeInfo?.label || activeNode.type;

    return (
      <div className="flex items-center gap-3">
        {typeInfo && (
          <div 
            className="rounded-full p-2"
            style={{ backgroundColor: `${typeInfo.color}20` }}
          >
            <span style={{ color: typeInfo.color }}>
              <DesignerIcon icon={typeInfo.icon} size={20} />
            </span>
          </div>
        )}
        <div className="flex-1">
          <div className="font-medium text-foreground text-base">{String(activeNode.data.label ?? activeNode.id)}</div>
          <div className="flex items-center gap-2 mt-1">
            {typeInfo && (
              <Badge 
                style={{ 
                  backgroundColor: `${typeInfo.color}15`, 
                  color: typeInfo.color,
                  border: `1px solid ${typeInfo.color}30`
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
                {SET_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium text-foreground">审批模式</Label>
              <NativeSelect
                value={String(data.examineMode ?? '1')}
                onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { examineMode: e.target.value } })}
              >
                {EXAMINE_MODE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
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
              {MODE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
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
    <div className="nop-inspector flex flex-col h-full text-foreground">
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
        <div className="rounded-lg border border-border p-4 mb-4" style={{ background: 'rgba(255, 255, 255, 0.4)' }}>
          <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'hsl(221.2, 83.2%, 40%)' }}>流程信息</div>
          <div className="mt-2 font-medium text-foreground">{doc.name}</div>
          <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-muted-foreground">
            <Badge variant="success">已启用</Badge>
            <span>{nodeCount} 个节点</span>
            <span>{edgeCount} 条连线</span>
          </div>
        </div>

        {activeNode ? (
          <>
            <div className="rounded-lg border border-border p-4 mb-4" style={{ background: 'rgba(255, 255, 255, 0.4)' }}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'hsl(221.2, 83.2%, 40%)' }}>当前选中</div>
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
            <div className="rounded-lg border border-border p-4" style={{ background: 'rgba(255, 255, 255, 0.4)' }}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-foreground">名称</Label>
                  <Input
                    type="text"
                    value={String(activeNode.data.label ?? '')}
                    onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { label: e.target.value } })}
                  />
                </div>
                {renderSpecificFields()}
                {renderGenericFields()}
              </div>
            </div>
          </>
        ) : activeEdge ? (
          <>
            <div className="rounded-lg border border-border p-4 mb-4" style={{ background: 'rgba(255, 255, 255, 0.4)' }}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'hsl(221.2, 83.2%, 40%)' }}>当前选中</div>
              <div className="mt-3">
                <div className="font-medium text-foreground">连线</div>
                <div className="text-sm text-muted-foreground mt-1">{activeEdge.source} → {activeEdge.target}</div>
              </div>
            </div>
            <div className="rounded-lg border border-border p-4" style={{ background: 'rgba(255, 255, 255, 0.4)' }}>
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
          <div className="rounded-lg border border-border p-4" style={{ background: 'rgba(255, 255, 255, 0.4)' }}>
            <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'hsl(221.2, 83.2%, 40%)' }}>快捷键</div>
            <div className="mt-3 text-sm text-muted-foreground space-y-2">
              <div><strong>Ctrl+Z</strong> 撤销</div>
              <div><strong>Ctrl+Y</strong> 重做</div>
              <div><strong>Delete</strong> 删除选中</div>
              <div><strong>Ctrl+S</strong> 保存</div>
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
