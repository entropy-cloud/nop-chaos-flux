import { useState, useRef, useEffect, type MutableRefObject } from 'react';

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
  signal: AbortSignal,
  connectFn: () => void,
): void {
  if (!wsUrl || !boardId) return;
  if (wsRef.current?.readyState === WebSocket.OPEN) return;

  try {
    const ws = new WebSocket(`${wsUrl}?boardId=${boardId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (signal.aborted) return;
      updateStatus('connected');
    };

    ws.onmessage = (event) => {
      if (signal.aborted) return;
      try {
        const msg = JSON.parse(event.data) as CollabMessage;
        onMessage?.(msg);
      } catch (err) {
        console.warn('[kanban-collab] Failed to parse message:', err);
      }
    };

    ws.onclose = (ev: CloseEvent) => {
      if (signal.aborted) return;
      console.error('[kanban-collab] WebSocket closed:', { code: ev.code, reason: ev.reason, wasClean: ev.wasClean });
      updateStatus('reconnecting');
      reconnectTimerRef.current = setTimeout(() => {
        if (!signal.aborted) connectFn();
      }, 3000);
    };

    ws.onerror = (ev: Event) => {
      if (signal.aborted) return;
      console.error('[kanban-collab] WebSocket connection error:', ev);
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
  const abortRef = useRef<AbortController | null>(null);

  const connectFnRef = useRef<() => void>(() => {});
  const disconnectFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    const updateStatus = (
      newStatus: CollabConnectionStatus,
    ) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    };

    const connect = () => {
      const controller = new AbortController();
      abortRef.current = controller;
      connectImpl(wsUrl, boardId, updateStatus, onMessage, wsRef, reconnectTimerRef, controller.signal, connect);
    };
    connectFnRef.current = connect;
  }, [wsUrl, boardId, onMessage, onStatusChange]);

  useEffect(() => {
    const updateStatus = (
      newStatus: CollabConnectionStatus,
    ) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    };

    const disconnect = () => {
      abortRef.current?.abort();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      wsRef.current?.close();
      wsRef.current = null;
      updateStatus('disconnected');
    };
    disconnectFnRef.current = disconnect;

    return () => {
      disconnect();
    };
  }, [onStatusChange]);

  const sendMessage = (
    msg: Omit<CollabMessage, 'timestamp' | 'version'>,
  ) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const fullMsg: CollabMessage = {
      ...msg,
      timestamp: Date.now(),
      version: 1,
    };
    wsRef.current.send(JSON.stringify(fullMsg));
  };

  const connect = () => connectFnRef.current();
  const disconnect = () => disconnectFnRef.current();

  return {
    status,
    connect,
    disconnect,
    sendMessage,
  };
}
