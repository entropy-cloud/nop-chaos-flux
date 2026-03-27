import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { NodeToolbar, Position } from '@xyflow/react';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { isSchema } from '@nop-chaos/flux-core';
import { RenderNodes } from '@nop-chaos/flux-react';
import { useNodeTypeConfig, useDesignerContext } from '../designer-context';
import { renderPorts } from './render-ports';
import type { DesignerFlowNodeData } from './types';
import { DesignerIcon } from '../designer-icon';

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
  const [showToolbar, setShowToolbar] = useState(false);
  const hideToolbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodeRenderData = useMemo(() => ({
    node: {
      id: props.id,
      type: data.typeId,
      label: data.label,
      data: props.data
    },
    data: props.data
  }), [props.id, props.data, data.typeId, data.label]);

  const hasQuickActions = nodeType?.quickActions && isSchemaInput(nodeType.quickActions);

  const actionScope = useMemo(() => ({
    onEdit: () => dispatch({ type: 'selectNode', nodeId: props.id }),
    onDuplicate: () => dispatch({ type: 'duplicateNode', nodeId: props.id }),
    onDelete: () => dispatch({ type: 'deleteNode', nodeId: props.id })
  }), [dispatch, props.id]);

  function showToolbarNow() {
    if (hideToolbarTimeoutRef.current) {
      clearTimeout(hideToolbarTimeoutRef.current);
      hideToolbarTimeoutRef.current = null;
    }
    setShowToolbar(true);
  }

  function scheduleHideToolbar() {
    if (hideToolbarTimeoutRef.current) {
      clearTimeout(hideToolbarTimeoutRef.current);
    }
    hideToolbarTimeoutRef.current = setTimeout(() => {
      setShowToolbar(false);
      hideToolbarTimeoutRef.current = null;
    }, 180);
  }

  useEffect(() => {
    return () => {
      if (hideToolbarTimeoutRef.current) {
        clearTimeout(hideToolbarTimeoutRef.current);
      }
    };
  }, []);

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
        onMouseEnter={showToolbarNow}
        onMouseLeave={scheduleHideToolbar}
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
        onMouseEnter={showToolbarNow}
        onMouseLeave={scheduleHideToolbar}
      >
        {renderPorts(nodeType.ports)}
        <RenderNodes
          input={nodeType.body}
          options={{ data: nodeRenderData, scopeKey: `node:${props.id}`, pathSuffix: 'node' }}
        />
      </div>

      {(hasQuickActions || showToolbar) && (
        <NodeToolbar isVisible={showToolbar} position={Position.Top}>
          <div className="fd-xyflow-node-toolbar" onMouseEnter={showToolbarNow} onMouseLeave={scheduleHideToolbar}>
            {hasQuickActions ? (
              <RenderNodes
                input={nodeType.quickActions!}
                options={{
                  data: {
                    ...nodeRenderData,
                    ...actionScope
                  },
                  scopeKey: `node:${props.id}:quick-actions`,
                  pathSuffix: 'node.quickActions'
                }}
              />
            ) : (
              <div className="nop-flex flex gap-1">
                <button
                  type="button"
                  className="nop-button nop-button--sm fd-xyflow-node-toolbar__icon-button"
                  aria-label="Edit node"
                  onClick={actionScope.onEdit}
                >
                  <DesignerIcon icon="pencil" className="nop-icon nop-icon--pencil" />
                </button>
                <button
                  type="button"
                  className="nop-button nop-button--sm fd-xyflow-node-toolbar__icon-button"
                  aria-label="Duplicate node"
                  onClick={actionScope.onDuplicate}
                >
                  <DesignerIcon icon="copy" className="nop-icon nop-icon--copy" />
                </button>
                <button
                  type="button"
                  className="nop-button nop-button--danger nop-button--sm fd-xyflow-node-toolbar__icon-button"
                  aria-label="Delete node"
                  onClick={actionScope.onDelete}
                >
                  <DesignerIcon icon="trash-2" className="nop-icon nop-icon--trash-2" />
                </button>
              </div>
            )}
          </div>
        </NodeToolbar>
      )}
    </>
  );
}
