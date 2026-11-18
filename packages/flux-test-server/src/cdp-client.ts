import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { FluxTestError } from './errors.js';

export interface CdpMessage {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message: string; code?: number };
  sessionId?: string;
}

export interface CdpEvent {
  method: string;
  params: Record<string, unknown>;
  sessionId?: string;
}

export class CdpClient {
  private ws: WebSocket;
  private events = new EventEmitter();
  private pending = new Map<number, { resolve: (value: Record<string, unknown>) => void; reject: (err: Error) => void; timer: NodeJS.Timeout }>();
  private nextId = 1;
  private closed = false;
  private readonly defaultTimeoutMs: number;

  constructor(ws: WebSocket, defaultTimeoutMs = 10_000) {
    this.ws = ws;
    this.defaultTimeoutMs = defaultTimeoutMs;
    ws.on('message', (data: WebSocket.RawData) => {
      let msg: CdpMessage;
      try {
        msg = JSON.parse(String(data)) as CdpMessage;
      } catch {
        return;
      }
      if (typeof msg.id === 'number') {
        const entry = this.pending.get(msg.id);
        if (!entry) return;
        this.pending.delete(msg.id);
        clearTimeout(entry.timer);
        if (msg.error) {
          entry.reject(new FluxTestError('cdp-request-failed', msg.error.message, { cdpError: msg.error }));
        } else {
          entry.resolve(msg.result ?? {});
        }
        return;
      }
      if (typeof msg.method === 'string') {
        this.events.emit(msg.method, { method: msg.method, params: msg.params ?? {}, sessionId: msg.sessionId } satisfies CdpEvent);
      }
    });
    ws.on('close', () => {
      this.closed = true;
      for (const [id, entry] of this.pending) {
        clearTimeout(entry.timer);
        entry.reject(new FluxTestError('cdp-closed', `connection closed with pending request ${id}`));
      }
      this.pending.clear();
      this.events.emit('disconnected');
    });
    ws.on('error', (_err: Error) => {
      // close event follows; rejection handled there
    });
  }

  static async connect(url: string, timeoutMs = 5_000): Promise<CdpClient> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        ws.terminate();
        reject(new FluxTestError('cdp-connect-timeout', `connect timed out after ${timeoutMs}ms`, { url }));
      }, timeoutMs);
      ws.on('open', () => {
        clearTimeout(timer);
        resolve(new CdpClient(ws));
      });
      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(new FluxTestError('cdp-connect-timeout', String(err), { url }));
      });
    });
  }

  send(method: string, params: Record<string, unknown> = {}, sessionId?: string, timeoutMs?: number): Promise<Record<string, unknown>> {
    if (this.closed || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new FluxTestError('cdp-closed', `cannot send ${method}`, { method }));
    }
    const id = this.nextId++;
    const effectiveTimeout = timeoutMs ?? this.defaultTimeoutMs;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new FluxTestError('cdp-timeout', `${method} timed out after ${effectiveTimeout}ms`, { method }));
      }, effectiveTimeout);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  on(method: string, handler: (event: CdpEvent) => void): () => void {
    this.events.on(method, handler);
    return () => this.events.off(method, handler);
  }

  onClose(handler: () => void): () => void {
    this.events.on('disconnected', handler);
    return () => this.events.off('disconnected', handler);
  }

  close(): void {
    if (!this.closed) {
      this.ws.close();
    }
  }
}
