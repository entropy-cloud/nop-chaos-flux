import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { PortConfig } from '@nop-chaos/flow-designer-core';
import { POSITION_MAP } from './types';

export function renderPorts(ports: PortConfig[] | undefined) {
  if (!ports || ports.length === 0) {
    return (
      <>
        <Handle type="target" position={Position.Top} />
        <Handle type="source" position={Position.Bottom} />
      </>
    );
  }

  return ports.map((port) => {
    const position = POSITION_MAP[port.position ?? 'top'];
    const type = port.direction === 'input' ? 'target' : 'source';
    const sizeClass = port.appearance?.size ? `!w-[${port.appearance.size}px] !h-[${port.appearance.size}px]` : '';

    return (
      <Handle
        key={port.id}
        type={type}
        position={position}
        id={port.id}
        className={`${port.appearance?.className ?? ''} ${sizeClass}`}
      />
    );
  });
}
