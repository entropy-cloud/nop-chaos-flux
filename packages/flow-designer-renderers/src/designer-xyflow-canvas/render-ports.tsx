import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { PortConfig } from '@nop-chaos/flow-designer-core';
import { POSITION_MAP } from './types.js';

const defaultHandleClass = '!w-3 !h-3 !rounded-full !bg-primary !border-2 !border-white';

export interface RenderPortsOptions {
  nodeId: string;
  nodeLabel: string;
  activeEdge?: {
    id: string;
    source: string;
    sourcePort?: string;
  } | null;
  pendingConnectionSourceId?: string | null;
  pendingConnectionSourcePortId?: string | null;
  reconnectingEdgeId?: string | null;
  onStartConnection?: (nodeId: string, sourcePort?: string) => void;
  onCancelConnection?: (nodeId: string) => void;
  onCompleteConnection?: (nodeId: string, sourcePort?: string, targetPort?: string) => void;
  onStartReconnect?: (edgeId: string) => void;
  onCancelReconnect?: (edgeId: string) => void;
  onCompleteReconnect?: (
    edgeId: string,
    sourceId: string,
    nodeId: string,
    sourcePort?: string,
    targetPort?: string,
  ) => void;
}

function getPortName(portId: string) {
  return portId === 'default' ? t('flux.flowDesigner.defaultPort') : portId;
}

function getPortLabel(nodeLabel: string, direction: 'input' | 'output', portId: string) {
  return t('flux.flowDesigner.portLabel', {
    node: nodeLabel,
    direction:
      direction === 'input'
        ? t('flux.flowDesigner.inputPortDirection')
        : t('flux.flowDesigner.outputPortDirection'),
    port: getPortName(portId),
  });
}

function buildPortAriaLabel(
  direction: 'input' | 'output',
  nodeLabel: string,
  portId: string,
  options: RenderPortsOptions,
) {
  const portLabel = getPortLabel(nodeLabel, direction, portId);
  const pendingPortId = options.pendingConnectionSourcePortId ?? 'default';
  const activeEdgeSourcePortId = options.activeEdge?.sourcePort ?? 'default';

  if (options.reconnectingEdgeId && options.activeEdge && direction === 'input') {
    return t('flux.flowDesigner.completeReconnectToPort', { portLabel });
  }

  if (
    options.reconnectingEdgeId &&
    options.activeEdge &&
    direction === 'output' &&
    options.activeEdge.source === options.nodeId &&
    activeEdgeSourcePortId === portId
  ) {
    return t('flux.flowDesigner.cancelReconnectFromPort', { portLabel });
  }

  if (options.pendingConnectionSourceId === options.nodeId && pendingPortId === portId) {
    return t('flux.flowDesigner.cancelConnectionFromPort', { portLabel });
  }

  if (options.pendingConnectionSourceId && direction === 'input') {
    return t('flux.flowDesigner.completeConnectionToPort', { portLabel });
  }

  if (
    options.activeEdge &&
    direction === 'output' &&
    options.activeEdge.source === options.nodeId &&
    activeEdgeSourcePortId === portId
  ) {
    return t('flux.flowDesigner.startReconnectFromPort', { portLabel });
  }

  if (direction === 'output') {
    return t('flux.flowDesigner.startConnectionFromPort', { portLabel });
  }

  return portLabel;
}

function handlePortKeyDown(
  event: React.KeyboardEvent,
  direction: 'input' | 'output',
  portId: string,
  options: RenderPortsOptions,
) {
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    if (
      options.reconnectingEdgeId &&
      options.activeEdge &&
      direction === 'output' &&
      options.activeEdge.source === options.nodeId &&
      (options.activeEdge.sourcePort ?? 'default') === portId
    ) {
      options.onCancelReconnect?.(options.reconnectingEdgeId);
      return;
    }
    if (options.pendingConnectionSourceId === options.nodeId && (options.pendingConnectionSourcePortId ?? 'default') === portId) {
      options.onCancelConnection?.(options.nodeId);
    }
    return;
  }

  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const normalizedPortId = portId === 'default' ? undefined : portId;
  const pendingPortId = options.pendingConnectionSourcePortId ?? 'default';
  const activeEdgeSourcePortId = options.activeEdge?.sourcePort ?? 'default';

  if (options.reconnectingEdgeId && options.activeEdge && direction === 'input') {
    options.onCompleteReconnect?.(
      options.reconnectingEdgeId,
      options.activeEdge.source,
      options.nodeId,
      options.activeEdge.sourcePort,
      normalizedPortId,
    );
    return;
  }

  if (
    options.reconnectingEdgeId &&
    options.activeEdge &&
    direction === 'output' &&
    options.activeEdge.source === options.nodeId &&
    activeEdgeSourcePortId === portId
  ) {
    options.onCancelReconnect?.(options.reconnectingEdgeId);
    return;
  }

  if (options.pendingConnectionSourceId === options.nodeId && pendingPortId === portId) {
    options.onCancelConnection?.(options.nodeId);
    return;
  }

  if (options.pendingConnectionSourceId && direction === 'input') {
    options.onCompleteConnection?.(options.nodeId, options.pendingConnectionSourcePortId ?? undefined, normalizedPortId);
    return;
  }

  if (
    options.activeEdge &&
    direction === 'output' &&
    options.activeEdge.source === options.nodeId &&
    activeEdgeSourcePortId === portId
  ) {
    options.onStartReconnect?.(options.activeEdge.id);
    return;
  }

  if (direction === 'output') {
    options.onStartConnection?.(options.nodeId, normalizedPortId);
  }
}

function renderHandle(
  input: {
    portId: string;
    direction: 'input' | 'output';
    position: Position;
    className?: string;
    testId: string;
  },
  options?: RenderPortsOptions,
) {
  const type = input.direction === 'input' ? 'target' : 'source';
  return (
    <Handle
      key={`${type}-${input.portId}`}
      id={input.portId}
      type={type}
      position={input.position}
      className={cn(defaultHandleClass, input.className)}
      data-testid={input.testId}
      data-handle-id={input.portId}
      tabIndex={options ? 0 : undefined}
      role={options ? 'button' : undefined}
      aria-label={options ? buildPortAriaLabel(input.direction, options.nodeLabel, input.portId, options) : undefined}
      aria-keyshortcuts={options ? 'Enter Space Escape' : undefined}
      onKeyDown={options ? (event) => handlePortKeyDown(event, input.direction, input.portId, options) : undefined}
    />
  );
}

export function renderPorts(ports: PortConfig[] | undefined, treeMode = false, options?: RenderPortsOptions) {
  if (treeMode) {
    return (
      <>
        {renderHandle({
          portId: 'tree-in',
          direction: 'input',
          position: Position.Top,
          className: '!-top-1.5 !left-1/2 !-translate-x-1/2',
          testId: 'designer-handle-target-tree-in',
        })}
        {renderHandle({
          portId: 'tree-out',
          direction: 'output',
          position: Position.Bottom,
          className: '!-bottom-1.5 !left-1/2 !-translate-x-1/2',
          testId: 'designer-handle-source-tree-out',
        })}
      </>
    );
  }

  if (!ports || ports.length === 0) {
    return (
      <>
        {renderHandle({ portId: 'default', direction: 'input', position: Position.Top, testId: 'designer-handle-target-default' }, options)}
        {renderHandle({ portId: 'default', direction: 'output', position: Position.Bottom, testId: 'designer-handle-source-default' }, options)}
      </>
    );
  }

  return ports.map((port) => {
    const position = POSITION_MAP[port.position ?? 'top'];
    const direction = port.direction === 'input' ? 'input' : 'output';

    return renderHandle(
      {
        portId: port.id,
        direction,
        position,
        className: port.appearance?.className,
        testId: `designer-handle-${direction === 'input' ? 'target' : 'source'}-${port.id}`,
      },
      options,
    );
  });
}
