import React from 'react';
import { Badge, Button, Input } from '@nop-chaos/ui';
import { useDesignerContext } from './designer-context';

export function DefaultInspector() {
  const { dispatch, snapshot } = useDesignerContext();
  const { activeNode, activeEdge, doc } = snapshot;
  const nodeCount = doc.nodes.length;
  const edgeCount = doc.edges.length;

  const nodeTypeLabels: Record<string, string> = {
    start: '开始节点', end: '结束节点', task: '任务节点',
    condition: '条件分支', parallel: '并行网关', loop: '循环节点'
  };

  return (
    <div className="nop-inspector flex flex-col h-full text-foreground">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-foreground">属性面板</div>
          <div className="text-sm text-muted-foreground">编辑节点或连线属性</div>
        </div>
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
                <div className="font-medium text-foreground">{String(activeNode.data.label ?? activeNode.id)}</div>
                <div className="text-sm text-muted-foreground mt-1">{nodeTypeLabels[activeNode.type] ?? activeNode.type}</div>
                {activeNode.data.description ? (
                  <p className="text-sm text-muted-foreground mt-1">{String(activeNode.data.description)}</p>
                ) : null}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4" style={{ background: 'rgba(255, 255, 255, 0.4)' }}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">名称</label>
                  <Input
                    type="text"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    value={String(activeNode.data.label ?? '')}
                    onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { label: e.target.value } })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">描述</label>
                  <textarea
                    className="w-full min-h-[80px] resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    value={String(activeNode.data.description ?? '')}
                    onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { description: e.target.value } })}
                  />
                </div>
                {Object.entries(activeNode.data).map(([key, value]) => {
                  if (key === 'label' || key === 'description') return null;
                  if (typeof value === 'object' && value !== null) return null;
                  return (
                    <div key={key} className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-foreground">{key}</label>
                      <Input
                        type="text"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                        value={String(value ?? '')}
                        onChange={(e) => dispatch({ type: 'updateNodeData', nodeId: activeNode.id, data: { [key]: e.target.value } })}
                      />
                    </div>
                  );
                })}
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
                      <label className="text-sm font-medium text-foreground">{key}</label>
                      <Input
                        type="text"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
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
