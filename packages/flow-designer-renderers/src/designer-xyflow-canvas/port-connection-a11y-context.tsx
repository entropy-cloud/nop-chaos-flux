import React from 'react';
import type { GraphEdge } from '@nop-chaos/flow-designer-core';

export interface PortConnectionA11yContextValue {
  pendingConnectionSourceId: string | null;
  pendingConnectionSourcePortId: string | null;
  reconnectingEdgeId: string | null;
  activeEdge: GraphEdge | null;
  onStartConnection(nodeId: string, sourcePort?: string): void;
  onCancelConnection(nodeId: string): void;
  onCompleteConnection(nodeId: string, sourcePort?: string, targetPort?: string): void;
  onStartReconnect(edgeId: string): void;
  onCancelReconnect(edgeId: string): void;
  onCompleteReconnect(
    edgeId: string,
    sourceId: string,
    nodeId: string,
    sourcePort?: string,
    targetPort?: string,
  ): void;
}

const noop = () => {};

export const PortConnectionA11yContext = React.createContext<PortConnectionA11yContextValue>({
  pendingConnectionSourceId: null,
  pendingConnectionSourcePortId: null,
  reconnectingEdgeId: null,
  activeEdge: null,
  onStartConnection: noop,
  onCancelConnection: noop,
  onCompleteConnection: noop,
  onStartReconnect: noop,
  onCancelReconnect: noop,
  onCompleteReconnect: noop,
});
