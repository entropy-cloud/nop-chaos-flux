import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@nop-chaos/ui';
import type { PortConfig } from '@nop-chaos/flow-designer-core';
import { POSITION_MAP } from './types.js';

const defaultHandleClass = '!w-3 !h-3 !rounded-full !bg-primary !border-2 !border-white';

export function renderPorts(ports: PortConfig[] | undefined, treeMode = false) {
  if (treeMode) {
    return (
      <>
        <Handle
          id="tree-in"
          type="target"
          position={Position.Top}
          className={cn(defaultHandleClass, '!-top-1.5 !left-1/2 !-translate-x-1/2')}
          data-testid="designer-handle-target-tree-in"
          data-handle-id="tree-in"
        />
        <Handle
          id="tree-out"
          type="source"
          position={Position.Bottom}
          className={cn(defaultHandleClass, '!-bottom-1.5 !left-1/2 !-translate-x-1/2')}
          data-testid="designer-handle-source-tree-out"
          data-handle-id="tree-out"
        />
      </>
    );
  }

  if (!ports || ports.length === 0) {
    return (
      <>
        <Handle
          type="target"
          position={Position.Top}
          className={defaultHandleClass}
          data-testid="designer-handle-target-default"
          data-handle-id="default"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className={defaultHandleClass}
          data-testid="designer-handle-source-default"
          data-handle-id="default"
        />
      </>
    );
  }

  return ports.map((port) => {
    const position = POSITION_MAP[port.position ?? 'top'];
    const type = port.direction === 'input' ? 'target' : 'source';

    return (
      <Handle
        key={port.id}
        type={type}
        position={position}
        id={port.id}
        className={cn(defaultHandleClass, port.appearance?.className)}
        data-testid={`designer-handle-${type}-${port.id}`}
        data-handle-id={port.id}
      />
    );
  });
}
