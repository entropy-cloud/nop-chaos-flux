import type { Server } from 'node:http';
import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';

export interface MockCdpOptions {
  /** Called for each session-scoped method; return the result payload. */
  handler?: (socket: WebSocket, msg: { id: number; method: string; params: Record<string, unknown> }) => Record<string, unknown> | void;
  /** When true, Page.navigate never emits Page.loadEventFired (timeout tests). */
  stuckNavigations?: boolean;
  /** Delay before the auto Page.loadEventFired after Page.navigate. Default 5ms. */
  loadEventDelayMs?: number;
}

/**
 * Minimal in-process fake of a Chromium CDP endpoint: one HTTP /json/version
 * plus a WebSocket speaking the id/result protocol. Used by unit tests only.
 */
export class MockCdpServer {
  private server: Server;
  private wss: WebSocketServer;
  private sockets: WebSocket[] = [];
  requests: Array<{ method: string; params: Record<string, unknown> }> = [];
  /** Methods that should be answered with a CDP error frame. */
  errorMethods = new Set<string>();
  /** Methods that should never be answered (timeout tests). */
  silentMethods = new Set<string>();

  constructor(options: MockCdpOptions = {}) {
    this.server = createServer();
    this.wss = new WebSocketServer({ server: this.server });
    this.wss.on('connection', (ws: WebSocket) => {
      this.sockets.push(ws);
      ws.on('message', (data: unknown) => {
        const msg = JSON.parse(String(data)) as { id: number; method: string; params: Record<string, unknown>; sessionId?: string };
        this.requests.push({ method: msg.method, params: msg.params });
        if (this.silentMethods.has(msg.method)) {
          return;
        }
        if (this.errorMethods.has(msg.method)) {
          ws.send(JSON.stringify({ id: msg.id, error: { message: `mock error for ${msg.method}` } }));
          return;
        }
        const handled = options.handler ? options.handler(ws, msg) : {};
        if (handled !== undefined) {
          ws.send(JSON.stringify({ id: msg.id, result: handled }));
        }
        if (msg.method === 'Page.navigate' && !options.stuckNavigations) {
          setTimeout(() => this.broadcast('Page.loadEventFired', {}, msg.sessionId), options.loadEventDelayMs ?? 5);
        }
      });
    });
  }

  listen(): Promise<{ port: number; wsEndpoint: string }> {
    return new Promise((resolve) => {
      this.server.listen(0, '127.0.0.1', () => {
        const port = (this.server.address() as { port: number }).port;
        resolve({ port, wsEndpoint: `ws://127.0.0.1:${port}` });
      });
    });
  }

  broadcast(event: string, params: Record<string, unknown> = {}, sessionId?: string): void {
    for (const ws of this.sockets) {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ method: event, params, ...(sessionId ? { sessionId } : {}) }));
      }
    }
  }

  close(): Promise<void> {
    for (const ws of this.sockets) ws.terminate();
    return new Promise((resolve) => {
      this.wss.close(() => this.server.close(() => resolve()));
    });
  }
}

/** Standard page-target canned responses shared by launcher tests. */
export function pageHandlers(broadcast: (event: string, params?: Record<string, unknown>) => void = () => {}): (socket: WebSocket, msg: { id: number; method: string; params: Record<string, unknown> }) => Record<string, unknown> {
  let nextSession = 1;
  return (_socket, msg) => {
    switch (msg.method) {
      case 'Target.createTarget':
        return { targetId: 'target-1' };
      case 'Target.attachToTarget':
        return { sessionId: `session-${nextSession++}` };
      case 'Page.enable':
        return {};
      case 'Page.navigate':
        setTimeout(() => broadcast('Page.loadEventFired'), 5);
        return {};
      case 'Runtime.evaluate':
        return { result: { value: 'eval-ok' } };
      case 'Page.captureScreenshot':
        return { data: Buffer.from('png-bytes').toString('base64') };
      case 'Emulation.setDeviceMetricsOverride':
        return {};
      case 'Target.closeTarget':
        return {};
      default:
        return {};
    }
  };
}
