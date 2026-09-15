import type { RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import { ReconnectionManager } from './reconnection-manager.js';

export type TagValueType = 'bool' | 'int16' | 'float32';

export interface IndustrialTag {
  name: string;
  address: string;
  type: TagValueType;
}

export interface IndustrialTagConfig {
  id: string;
  url: string;
  tags: IndustrialTag[];
  polling?: number;
}

export interface IndustrialAdapterOptions {
  env: RendererEnv;
  scope: ScopeRef;
  onError?: (code: string, message: string, error?: unknown) => void;
}

interface ConnectionState {
  socket: NonNullable<ReturnType<Extract<keyof RendererEnv, 'openSocket'> extends never ? never : NonNullable<RendererEnv['openSocket']>>>;
  reconnection: ReconnectionManager;
  /** 主动断开标志：close 后不触发重连 */
  closing: boolean;
  tags: IndustrialTag[];
  polling?: number;
  cfg: IndustrialTagConfig;
}

/**
 * 工业协议适配器（design-protocol.md §4，I3.1）：
 * 只消费 `RendererEnv.openSocket` 标准契约（capability check、同步返回、on* 属性赋值）。
 * onopen → reconnection.reset() → 发送 subscribe 帧；数据帧 address→tag 映射 + 类型转换
 * （bool/int16/float32，NaN 丢弃）→ `scope.update('dataSources.<name>', value)`；
 * onclose/onerror → 退避重连（pending 幂等，双触发只一次）；主动 disconnect 不重连。
 */
export class IndustrialAdapter {
  private connections = new Map<string, ConnectionState>();
  private unavailableReported = false;

  constructor(private options: IndustrialAdapterOptions) {}

  connect(cfg: IndustrialTagConfig): void {
    const { env } = this.options;
    // 同 id 重入：先断旧连接（主动语义，不重连）
    if (this.connections.has(cfg.id)) {
      this.disconnect(cfg.id);
    }
    if (typeof env.openSocket !== 'function') {
      if (!this.unavailableReported) {
        this.unavailableReported = true;
        this.options.onError?.(
          'socket-unavailable',
          'RendererEnv.openSocket is not available in this host',
          new Error('openSocket missing'),
        );
      }
      return;
    }
    const socket = env.openSocket(cfg.url);
    const reconnection = new ReconnectionManager({
      maxRetries: 10,
      baseDelay: 500,
      maxDelay: 30000,
      onReconnect: () => {
        if (this.connections.get(cfg.id)?.closing) return;
        this.connect(cfg);
      },
      onGiveUp: (code, message) => {
        this.options.onError?.(code, message);
      },
    });
    const state: ConnectionState = {
      socket,
      reconnection,
      closing: false,
      tags: cfg.tags,
      polling: cfg.polling,
      cfg,
    };
    this.connections.set(cfg.id, state);

    socket.onopen = () => {
      reconnection.reset();
      socket.send(
        JSON.stringify({
          type: 'subscribe',
          tags: cfg.tags.map((t) => t.address),
          polling: cfg.polling,
        }),
      );
    };

    socket.onmessage = (event) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(typeof event.data === 'string' ? event.data : String(event.data));
      } catch (error) {
        this.reportOnce('socket-message-parse', 'Data frame JSON parse failed', error);
        return;
      }
      const frame = parsed as { type?: string; payload?: Record<string, unknown> };
      if (frame?.type !== 'data' || typeof frame.payload !== 'object' || frame.payload === null) return;
      for (const [address, rawValue] of Object.entries(frame.payload)) {
        const tag = cfg.tags.find((t) => t.address === address);
        if (!tag) continue;
        const value = convertTagValue(tag.type, rawValue);
        if (value === undefined) continue; // NaN 丢弃（静默容错）
        this.options.scope.update(`dataSources.${tag.name}`, value);
      }
    };

    socket.onclose = () => {
      if (state.closing) return;
      this.options.onError?.(
        'socket-connect-failed',
        `Connection '${cfg.id}' closed; reconnect scheduled`,
      );
      reconnection.scheduleReconnect();
    };

    socket.onerror = (event) => {
      if (state.closing) return;
      this.reportOnce('socket-error', 'Socket error', event);
      reconnection.scheduleReconnect(); // pending 幂等：onerror+onclose 双触发只调度一次
    };
  }

  private parseReported = new Set<string>();

  private reportOnce(code: string, message: string, error?: unknown): void {
    if (this.parseReported.has(code)) return;
    this.parseReported.add(code);
    this.options.onError?.(code, message, error);
  }

  disconnect(id: string): void {
    const state = this.connections.get(id);
    if (!state) return;
    this.connections.delete(id);
    // 先置主动断开标志并摘除事件句柄，再 close——close 事件不触发重连
    state.closing = true;
    state.socket.onclose = null;
    state.socket.onerror = null;
    state.socket.onmessage = null;
    state.socket.onopen = null;
    state.reconnection.cancel();
    state.socket.close();
  }

  disconnectAll(): void {
    for (const id of [...this.connections.keys()]) {
      this.disconnect(id);
    }
  }
}

function convertTagValue(type: TagValueType, raw: unknown): unknown {
  switch (type) {
    case 'bool': {
      if (typeof raw === 'boolean') return raw;
      if (typeof raw === 'number') return raw !== 0;
      if (typeof raw === 'string') return raw !== '' && raw !== 'false' && raw !== '0';
      return undefined;
    }
    case 'int16': {
      const parsed = typeof raw === 'number' ? Math.trunc(raw) : parseInt(String(raw), 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    case 'float32': {
      const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw));
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    default:
      return undefined;
  }
}
