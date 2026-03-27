import React, { useMemo, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { NodeToolbar, Position } from '@xyflow/react';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { isSchema } from '@nop-chaos/flux-core';
import { RenderNodes, useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';
import { useNodeTypeConfig, useDesignerContext } from '../designer-context';
import { renderPorts } from './render-ports';
import type { DesignerFlowNodeData } from './types';

function classNames(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(' ');
}

function isSchemaInput(value: unknown): value is SchemaInput {
  return isSchema(value);
}

export function DesignerXyflowNode(props: NodeProps) {
  const data = props.data as DesignerFlowNodeData;
  const nodeType = useNodeTypeConfig(data.typeId);
  const { dispatch } = useDesignerContext();
  const runtime = useRendererRuntime();
  const parentScope = useRenderScope();
  const [showToolbar, setShowToolbar] = useState(false);

  const nodeScope = useMemo(() => {
    return runtime.createChildScope(parentScope, {
      node: {
        id: props.id,
        type: data.typeId,
        label: data.label,
        data: props.data
      },
      data: props.data
    }, {
      scopeKey: `node:${props.id}`,
      pathSuffix: 'node'
    });
  }, [runtime, parentScope, props.id, props.data, data.typeId, data.label]);

  const hasQuickActions = nodeType?.quickActions && isSchemaInput(nodeType.quickActions);

  const actionScope = useMemo(() => ({
    onEdit: () => dispatch({ type: 'openNodeEditor' as never, nodeId: props.id } as never),
    onDuplicate: () => dispatch({ type: 'duplicateNode', nodeId: props.id }),
    onDelete: () => dispatch({ type: 'deleteNode', nodeId: props.id })
  }), [dispatch, props.id]);

  const appearanceStyle = useMemo(() => {
    if (!nodeType?.appearance) return undefined;
    const { appearance } = nodeType;
    return {
      borderRadius: appearance.borderRadius,
      borderWidth: appearance.borderWidth,
      borderColor: props.selected ? appearance.borderColorSelected : appearance.borderColor,
      minWidth: appearance.minWidth,
      minHeight: appearance.minHeight
    };
  }, [nodeType, props.selected]);

  if (!nodeType?.body || !isSchemaInput(nodeType.body)) {
    return (
      <div
        className={classNames('fd-xyflow-node', 'fd-xyflow-node--fallback', props.selected && 'fd-xyflow-node--active')}
        onMouseEnter={() => setShowToolbar(true)}
        onMouseLeave={() => setShowToolbar(false)}
      >
        {renderPorts(nodeType?.ports)}
        <strong>{data.label}</strong>
        <small>{data.typeLabel}</small>
      </div>
    );
  }

  return (
    <>
      <div
        className={classNames(
          'fd-xyflow-node',
          nodeType.appearance?.className,
          props.selected && 'fd-xyflow-node--active'
        )}
        style={appearanceStyle}
        onMouseEnter={() => setShowToolbar(true)}
        onMouseLeave={() => setShowToolbar(false)}
      >
        {renderPorts(nodeType.ports)}
        <RenderNodes input={nodeType.body} options={{ scope: nodeScope }} />
      </div>

      {hasQuickActions && (
        <NodeToolbar isVisible={showToolbar} position={Position.Top}>
          <div className="fd-xyflow-node-toolbar">
            <RenderNodes input={nodeType.quickActions!} options={{ scope: runtime.createChildScope(nodeScope, actionScope) }} />
          </div>
        </NodeToolbar>
      )}
    </>
  );
}
