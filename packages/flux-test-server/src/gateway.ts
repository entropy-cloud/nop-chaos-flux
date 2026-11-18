import { EventEmitter } from 'node:events';
import WebSocket, { WebSocketServer } from 'ws';
import { FluxTestError } from './errors.js';

/** M0 protocol local subset event names (page → Node). */
export type GatewayPageEvent = 'session.attach' | 'session.detach' | 'log.emit' | 'assert.result' | 'capture.upload';

export interface GatewayPeer {
  targetId: string;
  sendRequest(method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<Record<string, unknown>>;
  notify(method: string, params?: Record<string, unknown>): void;
}

export interface GatewayOptions {
  port?: number;
  /** Idle timeout: peer considered lost if no ws traffic in this window. Default off. */
  idleTimeoutMs?: number;
}

interface PendingRequest {
  resolve: (value: Record<string, unknown>) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

interface PeerRecord {
  targetId: string;
  ws: WebSocket;
  pending: Map<number, PendingRequest>;
  nextId: number;
}

interface IncomingMessage {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message: string };
  event?: string;
  payload?: unknown;
}

export class TestGateway {
  private wss: WebSocketServer | null = null;
  private events = new EventEmitter();
  private peers = new Map<string, PeerRecord>();

  /** Listen and return the actual bound port. */
  async listen(options: GatewayOptions = {}): Promise<number> {
    const port = options.port ?? 0;
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ port, host: '127.0.0.1' }, () => {
        const address = this.wss!.address() as { port: number };
        resolve(address.port);
      });
      this.wss.on('error', reject);
      this.wss.on('connection', (ws: WebSocket, req: { url?: string }) => {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1');
        const targetId = url.searchParams.get('targetId') ?? '';
        if (!targetId) {
          ws.close(4000, 'missing targetId');
          return;
        }
        const peer: PeerRecord = { targetId, ws, pending: new Map(), nextId: 1 };
        this.peers.set(targetId, peer);
        this.events.emit('attach', { targetId, payload: undefined });
        ws.on('message', (data: WebSocket.RawData) => this.handlePeerMessage(peer, String(data)));
        ws.on('close', () => {
          this.peers.delete(targetId);
          for (const [, entry] of peer.pending) {
            clearTimeout(entry.timer);
            entry.reject(new FluxTestError('gateway-peer-lost', `peer ${targetId} disconnected with pending request`));
          }
          this.events.emit('detach', { targetId, payload: undefined });
        });
      });
    });
  }

  private handlePeerMessage(peer: PeerRecord, raw: string): void {
    let msg: IncomingMessage;
    try {
      msg = JSON.parse(raw) as IncomingMessage;
    } catch {
      return;
    }
    if (typeof msg.id === 'number') {
      const entry = peer.pending.get(msg.id);
      if (!entry) return;
      peer.pending.delete(msg.id);
      clearTimeout(entry.timer);
      if (msg.error) {
        entry.reject(new FluxTestError('gateway-peer-lost', msg.error.message));
      } else {
        entry.resolve(msg.result ?? {});
      }
      return;
    }
    if (typeof msg.event === 'string') {
      this.events.emit(msg.event, { targetId: peer.targetId, payload: msg.payload });
    }
  }

  on(event: GatewayPageEvent | 'attach' | 'detach', handler: (arg: { targetId: string; payload: unknown }) => void): () => void {
    this.events.on(event, handler);
    return () => this.events.off(event, handler);
  }

  private requirePeer(targetId: string): PeerRecord {
    const peer = this.peers.get(targetId);
    if (!peer) {
      throw new FluxTestError('gateway-no-peer', `no attached peer for target ${targetId}`);
    }
    return peer;
  }

  getPeer(targetId: string): GatewayPeer {
    const peer = this.requirePeer(targetId);
    return {
      targetId,
      sendRequest: (method, params = {}, timeoutMs = 10_000) => {
        const id = peer.nextId++;
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            peer.pending.delete(id);
            reject(new FluxTestError('gateway-peer-lost', `request ${method} timed out after ${timeoutMs}ms`, { method }));
          }, timeoutMs);
          peer.pending.set(id, { resolve, reject, timer });
          if (peer.ws.readyState !== WebSocket.OPEN) {
            clearTimeout(timer);
            peer.pending.delete(id);
            reject(new FluxTestError('gateway-peer-lost', 'peer socket not open'));
            return;
          }
          peer.ws.send(JSON.stringify({ id, method, params }));
        });
      },
      notify: (method, params = {}) => {
        if (peer.ws.readyState === WebSocket.OPEN) {
          peer.ws.send(JSON.stringify({ method, params }));
        }
      },
    };
  }

  async close(): Promise<void> {
    const wss = this.wss;
    if (!wss) return;
    for (const [, peer] of this.peers) {
      peer.ws.close(4001, 'gateway shutting down');
    }
    this.peers.clear();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    this.wss = null;
  }
}
