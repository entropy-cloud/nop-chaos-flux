import { useEffect, useRef } from 'react';
import type { RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import { IndustrialAdapter } from '../../data-source/industrial-adapter.js';
import type { IndustrialTagConfig } from '../../data-source/industrial-adapter.js';

export interface UseDataSourcesArgs {
  dataSources?: IndustrialTagConfig[];
  env: RendererEnv;
  scope: ScopeRef;
  /** 诊断通道（adapter onError 透传：socket-unavailable / socket-connect-failed / reconnect-give-up 等） */
  onError?: (code: string, message: string, error?: unknown) => void;
}

/**
 * 数据源接线（design-protocol.md §4 schema surface，I3.2）：声明式 dataSources 条目与
 * IndustrialAdapter.connect(cfg) 一一对应。adapter 实例在接线 effect 内随 env/scope 身份
 * 惰性创建（ref 持有，env/scope 变更先 disconnectAll 再重建），onError 经 latest ref 取最新
 * （use-scene-manager 同款 react-compiler 友好写法：ref 只在 effect 内读写）。
 * effect 以 dataSources identity 为依赖——变更时旧连接全断（disconnectAll）后逐条重连，
 * 卸载 disconnectAll。数据通道独立于场景渲染：诊断只上报 onError，不翻转 three-canvas 状态机。
 */
export function useDataSources(args: UseDataSourcesArgs): void {
  const { dataSources, env, scope } = args;

  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });

  const adapterEntryRef = useRef<{ adapter: IndustrialAdapter; env: RendererEnv; scope: ScopeRef } | null>(null);

  useEffect(() => {
    if (!Array.isArray(dataSources) || dataSources.length === 0) return;
    let entry = adapterEntryRef.current;
    if (entry === null || entry.env !== env || entry.scope !== scope) {
      entry?.adapter.disconnectAll();
      entry = {
        adapter: new IndustrialAdapter({
          env,
          scope,
          onError: (code, message, error) => latest.current.onError?.(code, message, error),
        }),
        env,
        scope,
      };
      adapterEntryRef.current = entry;
    }
    for (const cfg of dataSources) {
      entry.adapter.connect(cfg);
    }
    return () => {
      entry?.adapter.disconnectAll();
    };
  }, [dataSources, env, scope]);
}
