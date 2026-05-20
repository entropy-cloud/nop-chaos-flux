import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { NodeToolbar, Position } from '@xyflow/react';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { isSchema } from '@nop-chaos/flux-core';
import { RenderNodes, ClassAliasesContext } from '@nop-chaos/flux-react/unstable';
import { useNodeTypeConfig, useDesignerContext } from '../designer-context.js';
import { renderPorts } from './render-ports.js';
import type { DesignerFlowNodeData } from './types.js';
import { DesignerIcon } from '../designer-icon.js';
import { Button, cn } from '@nop-chaos/ui';
import { DingFlowPlusButton } from '../dingflow/index.js';
import type { TreeNodeTypeConfig } from '@nop-chaos/flow-designer-core';
import { resolveNodeTypeAccent, resolveNodeTypeMeta } from '../designer-node-appearance.js';

function isSchemaInput(value: unknown): value is SchemaInput {
  return isSchema(value);
}

export function DesignerXyflowNode(props: NodeProps) {
  const data = props.data as DesignerFlowNodeData;
  const nodeType = useNodeTypeConfig(data.typeId);
  const { dispatch, config, onPlusButtonClick } = useDesignerContext();
  const [showToolbar, setShowToolbar] = useState(false);
  const hideToolbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodeRenderData = useMemo(
    () => {
      const dataRecord =
        typeof props.data === 'object' && props.data !== null
          ? (props.data as Record<string, unknown>)
          : {};
      const configRecord =
        typeof dataRecord.config === 'object' && dataRecord.config !== null
          ? (dataRecord.config as Record<string, unknown>)
          : undefined;
      const description = dataRecord.description;
      return {
        config: configRecord ?? dataRecord,
        node: {
          id: props.id,
          type: data.typeId,
          label: data.label,
          data: props.data,
        },
        data: props.data,
        ...dataRecord,
        ...(configRecord ?? {}),
        trigger:
          configRecord?.trigger ??
          (typeof description === 'string' && description.length > 0 ? description : undefined),
        result:
          configRecord?.result ??
          (typeof description === 'string' && description.length > 0 ? description : undefined),
        expression:
          configRecord?.expression ??
          (typeof description === 'string' && description.length > 0 ? description : undefined),
        branches: configRecord?.branches,
        limit: configRecord?.limit,
        interval: configRecord?.interval,
      };
    },
    [props.id, props.data, data.typeId, data.label],
  );

  const hasQuickActions = nodeType?.quickActions && isSchemaInput(nodeType.quickActions);

  const treeNodeType = nodeType as TreeNodeTypeConfig | undefined;
  const showPlusButton = onPlusButtonClick && !treeNodeType?.tree?.isTerminal;
  const isTreeMode = data.__fdTreeMode === true;
  const typeMeta = resolveNodeTypeMeta(data.typeId, nodeType);
  const accent = resolveNodeTypeAccent(data.typeId, nodeType) ?? 'hsl(var(--primary))';

  const isDeletable = useMemo(() => {
    if (!isTreeMode) return true;
    if (treeNodeType?.tree?.isTerminal) return false;
    return true;
  }, [isTreeMode, treeNodeType]);

  const actionScope = useMemo(
    () => ({
      onEdit: () => dispatch({ type: 'selectNode', nodeId: props.id }),
      onDuplicate: () => dispatch({ type: 'duplicateNode', nodeId: props.id }),
      onDelete: () => {
        if (!isDeletable) return;
        dispatch({ type: 'deleteNode', nodeId: props.id });
      },
    }),
    [dispatch, props.id, isDeletable],
  );

  const handleNodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dispatch({ type: 'selectNode', nodeId: props.id });
    }
  };

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
    if (data.__fdBranchFocused) {
      s.boxShadow = '0 0 0 3px color-mix(in oklab, var(--primary) 22%, transparent)';
    }
    return Object.keys(s).length > 0 ? s : undefined;
  }, [nodeType, props.selected, data.__fdBranchFocused]);
  const nodeLabel =
    typeof data.label === 'string' && data.label.trim().length > 0
      ? data.label
      : typeof typeMeta.label === 'string' && typeMeta.label.trim().length > 0
        ? typeMeta.label
        : typeof data.typeLabel === 'string' && data.typeLabel.trim().length > 0
          ? data.typeLabel
          : props.id;
  const nodeAriaLabel = `${props.selected ? 'Selected ' : ''}Node ${nodeLabel}`;

  if (!nodeType?.body || !isSchemaInput(nodeType.body)) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={nodeAriaLabel}
        aria-pressed={props.selected}
        className={cn('nop-designer-node', nodeType?.appearance?.className)}
        style={appearanceStyle}
        data-selected={props.selected ? '' : undefined}
        onMouseEnter={showToolbarNow}
        onMouseLeave={scheduleHideToolbar}
        onKeyDown={handleNodeKeyDown}
      >
        {renderPorts(nodeType?.ports, isTreeMode)}
        <strong>{data.label}</strong>
        <small>{data.typeLabel}</small>
      </div>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={nodeAriaLabel}
        aria-pressed={props.selected}
        className={cn('nop-designer-node', 'relative', nodeType.appearance?.className)}
        style={appearanceStyle}
        data-selected={props.selected ? '' : undefined}
        data-branch-focused={data.__fdBranchFocused ? '' : undefined}
        onMouseEnter={showToolbarNow}
        onMouseLeave={scheduleHideToolbar}
        onKeyDown={handleNodeKeyDown}
      >
        {renderPorts(nodeType.ports, isTreeMode)}
        {isTreeMode && treeNodeType?.tree?.isTerminal ? (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <div
              className="w-3 h-3 rounded-full bg-muted-foreground/40"
              style={{ borderColor: accent }}
            />
            <div className="text-[11px] text-muted-foreground/60 mt-1 truncate max-w-full text-center">
              {data.label}
            </div>
          </div>
        ) : (
          <ClassAliasesContext.Provider value={config.classAliases}>
            <RenderNodes
              input={nodeType.body}
              options={{ bindings: nodeRenderData, scopeKey: `node:${props.id}`, pathSuffix: 'node' }}
            />
          </ClassAliasesContext.Provider>
        )}
        {showPlusButton && (
          <DingFlowPlusButton
            onClick={(e) => onPlusButtonClick!(props.id, e.clientX, e.clientY, 'node')}
          />
        )}
      </div>

      {(hasQuickActions || showToolbar) && (
        <NodeToolbar isVisible={showToolbar} position={Position.Top}>
          <div
            role="toolbar"
            tabIndex={0}
            className="flex items-center gap-1.5 p-1 rounded-xl bg-popover/96 border border-border shadow-lg"
            data-slot="designer-node-toolbar"
            onMouseEnter={showToolbarNow}
            onMouseLeave={scheduleHideToolbar}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                dispatch({ type: 'selectNode', nodeId: props.id });
              }
            }}
          >
            {hasQuickActions ? (
              <ClassAliasesContext.Provider value={config.classAliases}>
                <RenderNodes
                  input={nodeType.quickActions!}
                  options={{
                    bindings: {
                      ...nodeRenderData,
                      ...actionScope,
                    },
                    scopeKey: `node:${props.id}:quick-actions`,
                    pathSuffix: 'node.quickActions',
                  }}
                />
              </ClassAliasesContext.Provider>
            ) : (
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit node"
                  className="border-0 hover:bg-accent"
                  onClick={actionScope.onEdit}
                >
                  <DesignerIcon icon="pencil" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Duplicate node"
                  className="border-0 hover:bg-accent"
                  onClick={actionScope.onDuplicate}
                >
                  <DesignerIcon icon="copy" />
                </Button>
                {isDeletable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete node"
                  className="border-0 hover:bg-destructive/15 hover:text-destructive"
                  onClick={actionScope.onDelete}
                >
                  <DesignerIcon icon="trash-2" />
                </Button>
                )}
              </div>
            )}
          </div>
        </NodeToolbar>
      )}
    </>
  );
}
