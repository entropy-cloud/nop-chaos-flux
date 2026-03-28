import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { NodeToolbar, Position } from '@xyflow/react';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { isSchema } from '@nop-chaos/flux-core';
import { RenderNodes, ClassAliasesContext } from '@nop-chaos/flux-react';
import { useNodeTypeConfig, useDesignerContext } from '../designer-context';
import { renderPorts } from './render-ports';
import type { DesignerFlowNodeData } from './types';
import { DesignerIcon } from '../designer-icon';
import { Button } from '@nop-chaos/ui';

function classNames(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(' ');
}

function isSchemaInput(value: unknown): value is SchemaInput {
  return isSchema(value);
}

export function DesignerXyflowNode(props: NodeProps) {
  const data = props.data as DesignerFlowNodeData;
  const nodeType = useNodeTypeConfig(data.typeId);
  const { dispatch, config } = useDesignerContext();
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
    const s: React.CSSProperties = {};
    if (appearance.minWidth !== undefined) s.minWidth = appearance.minWidth;
    if (appearance.minHeight !== undefined) s.minHeight = appearance.minHeight;
    if (appearance.borderRadius !== undefined) s.borderRadius = appearance.borderRadius;
    if (appearance.borderWidth !== undefined) s.borderWidth = appearance.borderWidth;
    if (props.selected && appearance.borderColorSelected) {
      s.borderColor = appearance.borderColorSelected;
    } else if (appearance.borderColor) {
      s.borderColor = appearance.borderColor;
    }
    return Object.keys(s).length > 0 ? s : undefined;
  }, [nodeType, props.selected]);

  if (!nodeType?.body || !isSchemaInput(nodeType.body)) {
    return (
      <div
        className={classNames(nodeType?.appearance?.className)}
        style={appearanceStyle}
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
        className={classNames(nodeType.appearance?.className)}
        style={appearanceStyle}
        onMouseEnter={showToolbarNow}
        onMouseLeave={scheduleHideToolbar}
      >
        {renderPorts(nodeType.ports)}
        <ClassAliasesContext.Provider value={config.classAliases}>
          <RenderNodes
            input={nodeType.body}
            options={{ data: nodeRenderData, scopeKey: `node:${props.id}`, pathSuffix: 'node' }}
          />
        </ClassAliasesContext.Provider>
      </div>

      {(hasQuickActions || showToolbar) && (
        <NodeToolbar isVisible={showToolbar} position={Position.Top}>
          <div
            className="flex items-center gap-1.5 p-1 rounded-xl bg-white/96 border border-border shadow-lg"
            onMouseEnter={showToolbarNow}
            onMouseLeave={scheduleHideToolbar}
          >
            {hasQuickActions ? (
              <ClassAliasesContext.Provider value={config.classAliases}>
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
              </ClassAliasesContext.Provider>
            ) : (
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  aria-label="Edit node"
                  onClick={actionScope.onEdit}
                >
                  <DesignerIcon icon="pencil" className="nop-icon nop-icon--pencil" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  aria-label="Duplicate node"
                  onClick={actionScope.onDuplicate}
                >
                  <DesignerIcon icon="copy" className="nop-icon nop-icon--copy" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  aria-label="Delete node"
                  onClick={actionScope.onDelete}
                >
                  <DesignerIcon icon="trash-2" className="nop-icon nop-icon--trash-2" />
                </Button>
              </div>
            )}
          </div>
        </NodeToolbar>
      )}
    </>
  );
}
