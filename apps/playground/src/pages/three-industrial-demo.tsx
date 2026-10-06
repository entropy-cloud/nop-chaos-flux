import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@nop-chaos/ui';
import { createDefaultEnv } from '@nop-chaos/flux-react';
import type { RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import { IndustrialAdapter, type IndustrialTagConfig } from '@nop-chaos/flux-renderers-3d';

/**
 * three-industrial-demo 演示页（plan 534 D2）：IndustrialAdapter + ReconnectionManager
 * 可达演示。合成 `openSocket` 标签源（tick 推 `{type:'data', payload:{address:value}}` 帧，
 * 可触发 close 演示退避重连）；重连尝试计数 = 合成 openSocket 调用次数自增（首次建连不计，
 * ReconnectionManager retryCount 为 private——plan 534 Non-Goals 显式裁定，观测走 demo 侧合成源）。
 */

interface DemoSocket {
  onopen: (() => void) | null;
  onclose: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  close(code?: number, reason?: string): void;
  send(data: string): void;
}

const TAG_CONFIG: IndustrialTagConfig = {
  id: 'demo-tags',
  url: 'ws://demo.industrial/tags',
  tags: [
    { name: 'temp', address: '40001', type: 'float32' },
    { name: 'running', address: '40002', type: 'bool' },
    { name: 'count', address: '40003', type: 'int16' },
  ],
};

export function ThreeIndustrialDemoPage({ onBack }: { onBack: () => void }) {
  const [connectAttempts, setConnectAttempts] = useState(0);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'reconnecting'>('connecting');
  // plan 534：scope 为可变外部状态——渲染期直读会被 React Compiler 记忆化跳过
  // （setTick 重渲不生效，DOM 卡 '—'）。正确形态：镜像为组件 state（setState 可追踪）。
  const [tagValues, setTagValues] = useState<Record<string, unknown>>({});
  const socketsRef = useRef<DemoSocket[]>([]);
  const adapterRef = useRef<IndustrialAdapter | null>(null);

  const env = useMemo(() => {
    const base = createDefaultEnv() as RendererEnv;
    return {
      ...base,
      openSocket: (): DemoSocket => {
        const socket: DemoSocket = {
          onopen: null,
          onclose: null,
          onerror: null,
          onmessage: null,
          close: () => undefined,
          send: (data) => {
            // 订阅帧确认后开始推数据帧。
            if (JSON.parse(data).type !== 'subscribe') return;
            const timer = window.setInterval(() => {
              socket.onmessage?.({
                data: JSON.stringify({
                  type: 'data',
                  payload: {
                    '40001': Math.round((20 + Math.random() * 80) * 10) / 10,
                    '40002': Math.random() > 0.2,
                    '40003': Math.floor(Math.random() * 100),
                  },
                }),
              });
            }, 1000);
            const originalClose = socket.close;
            socket.close = (code?: number, reason?: string) => {
              window.clearInterval(timer);
              originalClose(code, reason);
            };
          },
        };
        socketsRef.current.push(socket);
        setConnectAttempts((n) => n + 1);
        window.setTimeout(() => {
          socket.onopen?.();
          setStatus('connected');
        }, 50);
        return socket;
      },
    } as unknown as RendererEnv;
  }, []);

  // plan 534 执行期发现：createPrivateEvalScope 为只读求值面（update: () => undefined，
  // flux-react/src/bindings/flux-eval.ts:38）——adapter 的 scope.update 写入会被静默丢弃。
  // demo 改用最小可写 ScopeRef（仅实现 adapter.update + UI.get 契约）。
  const scope = useMemo<ScopeRef>(() => {
    const data: Record<string, unknown> = { dataSources: {} };
    const getIn = (path: string): unknown => {
      let current: unknown = data;
      for (const segment of path.split('.')) {
        if (current === null || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[segment];
      }
      return current;
    };
    return {
      id: 'three-industrial-demo-scope',
      path: '$',
      value: data,
      get: getIn,
      has: (path) => getIn(path) !== undefined,
      readOwn: () => data,
      readVisible: () => data,
      materializeVisible: () => data,
      update: (path, value) => {
        const segments = path.split('.');
        let current = data;
        for (let i = 0; i < segments.length - 1; i++) {
          const key = segments[i];
          if (typeof current[key] !== 'object' || current[key] === null) current[key] = {};
          current = current[key] as Record<string, unknown>;
        }
        current[segments[segments.length - 1]] = value;
      },
      merge: () => undefined,
      isolate: true,
    } as ScopeRef;
  }, []);

  useEffect(() => {
    const adapter = new IndustrialAdapter({ env, scope, onError: (code, message) => {
      if (code === 'socket-connect-failed') setStatus('reconnecting');
      console.warn(`[three-industrial-demo] ${code}: ${message}`);
    } });
    adapter.connect(TAG_CONFIG);
    adapterRef.current = adapter;
    const mirror = window.setInterval(() => {
      setTagValues({
        temp: scope.get('dataSources.temp'),
        running: scope.get('dataSources.running'),
        count: scope.get('dataSources.count'),
      });
    }, 500);
    return () => {
      window.clearInterval(mirror);
      adapter.disconnect(TAG_CONFIG.id);
      adapterRef.current = null;
    };
    // env/scope 为 useMemo 稳定引用：仅挂载期装配一次。
  }, [env, scope]);

  const reconnects = Math.max(connectAttempts - 1, 0);

  return (
    <main className="h-screen grid place-items-center p-6" data-testid="three-industrial-demo">
      <section className="max-w-[900px] w-full p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)] flex flex-col">
        <Button
          variant="outline"
          className="mb-[18px] self-start"
          onClick={onBack}
        >
          Back to Home
        </Button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">3D Rendering · industrial data source</p>
        <h1 className="m-0 mb-2">three-industrial 数据源演示页（plan 534 D2）</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)]">
          IndustrialAdapter（合成 openSocket 标签源：float32/bool/int16 三地址帧）+
          ReconnectionManager 退避重连可观测。重连尝试计数 = 合成 openSocket 重连调用次数
          （ReconnectionManager retryCount 为 private——plan 534 Non-Goals 裁定，观测走 demo 侧合成源）。
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3" data-testid="three-industrial-demo-tags">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-[var(--nop-body-copy)]">dataSources.temp（float32）</div>
            <div className="text-xl font-semibold" data-testid="three-industrial-demo-tag-temp">
              {String(tagValues.temp ?? '—')}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-[var(--nop-body-copy)]">dataSources.running（bool）</div>
            <div className="text-xl font-semibold" data-testid="three-industrial-demo-tag-running">
              {String(tagValues.running ?? '—')}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-[var(--nop-body-copy)]">dataSources.count（int16）</div>
            <div className="text-xl font-semibold" data-testid="three-industrial-demo-tag-count">
              {String(tagValues.count ?? '—')}
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-6 text-sm" data-testid="three-industrial-demo-status">
          <span>
            连接态：<span className="font-semibold">{status}</span>
          </span>
          <span data-testid="three-industrial-demo-reconnects">
            重连尝试计数：<span className="font-semibold">{reconnects}</span>
          </span>
          <Button
            variant="outline"
            data-testid="three-industrial-demo-trigger-drop"
            onClick={() => {
              // 模拟异常断线：异常 close（非 adapter.disconnect 主动语义）→ 退避重连。
              const live = socketsRef.current[socketsRef.current.length - 1];
              live?.onclose?.({ code: 1006, reason: 'simulated drop' });
            }}
          >
            模拟断线
          </Button>
        </div>
      </section>
    </main>
  );
}
