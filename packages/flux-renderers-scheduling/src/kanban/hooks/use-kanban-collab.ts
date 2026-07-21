import { useState, useCallback, useRef, useEffect, type MutableRefObject } from 'react';

export type CollabConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface CollabMessage {
  type: 'cardMoved' | 'cardUpdated' | 'cardCreated' | 'cardDeleted' | 'columnReordered';
  actorId: string;
  timestamp: number;
  payload: Record<string, unknown>;
  version: number;
}

export interface UseKanbanCollabOptions {
  boardId?: string;
  wsUrl?: string;
  onMessage?: (msg: CollabMessage) => void;
  onStatusChange?: (status: CollabConnectionStatus) => void;
}

function connectImpl(
  wsUrl: string | undefined,
  boardId: string | undefined,
  updateStatus: (status: CollabConnectionStatus) => void,
  onMessage: ((msg: CollabMessage) => void) | undefined,
  wsRef: MutableRefObject<WebSocket | null>,
  reconnectTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  mountedRef: MutableRefObject<boolean>,
  connectFn: () => void,
): void {
  if (!wsUrl || !boardId) return;
  if (wsRef.current?.readyState === WebSocket.OPEN) return;

  try {
    const ws = new WebSocket(`${wsUrl}?boardId=${boardId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      updateStatus('connected');
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(event.data) as CollabMessage;
        onMessage?.(msg);
      } catch (err) {
        console.warn('[kanban-collab] Failed to parse message:', err);
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      updateStatus('reconnecting');
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connectFn();
      }, 3000);
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      console.error('[kanban-collab] WebSocket connection error');
      updateStatus('disconnected');
    };
  } catch (err) {
    console.error('[kanban-collab] WebSocket connection failed:', err);
    updateStatus('disconnected');
  }
}

export function useKanbanCollab({
  boardId,
  wsUrl,
  onMessage,
  onStatusChange,
}: UseKanbanCollabOptions) {
  const [status, setStatus] = useState<CollabConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const updateStatus = useCallback(
    (newStatus: CollabConnectionStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange],
  );

  const connectFnRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    connectImpl(wsUrl, boardId, updateStatus, onMessage, wsRef, reconnectTimerRef, mountedRef, connectFnRef.current);
  }, [wsUrl, boardId, updateStatus, onMessage]);

  useEffect(() => {
    connectFnRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    updateStatus('disconnected');
  }, [updateStatus]);

  const sendMessage = useCallback(
    (msg: Omit<CollabMessage, 'timestamp' | 'version'>) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const fullMsg: CollabMessage = {
        ...msg,
        timestamp: Date.now(),
        version: 1,
      };
      wsRef.current.send(JSON.stringify(fullMsg));
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    connect,
    disconnect,
    sendMessage,
  };
}
