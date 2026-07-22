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
  wsUrlRef: MutableRefObject<string | undefined>,
  boardIdRef: MutableRefObject<string | undefined>,
  updateStatus: (status: CollabConnectionStatus) => void,
  onMessageRef: MutableRefObject<((msg: CollabMessage) => void) | undefined>,
  wsRef: MutableRefObject<WebSocket | null>,
  reconnectTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
  signal: AbortSignal,
  connectFn: () => void,
  retryCountRef: MutableRefObject<number>,
): void {
  const wsUrl = wsUrlRef.current;
  const boardId = boardIdRef.current;
  if (!wsUrl || !boardId) return;
  if (wsRef.current?.readyState === WebSocket.OPEN) return;

  try {
    const ws = new WebSocket(`${wsUrl}?boardId=${boardId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (signal.aborted) return;
      retryCountRef.current = 0;
      updateStatus('connected');
    };

    ws.onmessage = (event) => {
      if (signal.aborted) return;
      try {
        const msg = JSON.parse(event.data) as CollabMessage;
        onMessageRef.current?.(msg);
      } catch (err) {
        console.warn('[kanban-collab] Failed to parse message:', err);
      }
    };

    ws.onclose = (ev: CloseEvent) => {
      if (signal.aborted) return;
      console.error('[kanban-collab] WebSocket closed:', { code: ev.code, reason: ev.reason, wasClean: ev.wasClean });
      updateStatus('reconnecting');
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
      retryCountRef.current++;
      reconnectTimerRef.current = setTimeout(() => {
        if (!signal.aborted) connectFn();
      }, delay);
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

/** @deprecated Collaboration feature not yet integrated. Will be re-enabled in a future release. */
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

  const wsUrlRef = useRef(wsUrl);
  const boardIdRef = useRef(boardId);
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);
  const retryCountRef = useRef(0);

  useEffect(() => { wsUrlRef.current = wsUrl; }, [wsUrl]);
  useEffect(() => { boardIdRef.current = boardId; }, [boardId]);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);

  const connectFnRef = useRef<() => void>(() => {});
  const disconnectFnRef = useRef<() => void>(() => {});

  useEffect(() => {
    const updateStatus = (
      newStatus: CollabConnectionStatus,
    ) => {
      setStatus(newStatus);
      onStatusChangeRef.current?.(newStatus);
    };

    const connect = () => {
      const controller = new AbortController();
      abortRef.current = controller;
      connectImpl(wsUrlRef, boardIdRef, updateStatus, onMessageRef, wsRef, reconnectTimerRef, controller.signal, connect, retryCountRef);
    };
    connectFnRef.current = connect;
  }, []);

  useEffect(() => {
    const updateStatus = (
      newStatus: CollabConnectionStatus,
    ) => {
      setStatus(newStatus);
      onStatusChangeRef.current?.(newStatus);
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
  }, []);

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
