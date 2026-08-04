import { useEffect, useRef } from 'react';
import type { ComponentCapabilities, ComponentHandleRegistry } from '@nop-chaos/flux-core';
import { parseScadaConfig } from '../../serialization/parse.js';
import { validateScadaConfig } from '../../serialization/validate.js';
import type { ScadaConfig, ScadaPrimitive } from '../../serialization/config-types.js';
import { computeSymbolBounds } from './use-scada-config-sync.js';
import { toError } from '../scada-errors.js';
import type { ScadaCanvasRuntime } from './use-scada-engine.js';

const SCADA_HANDLE_METHODS = [
  'fit',
  'center',
  'getSymbols',
  'getSymbol',
  'setPointValue',
  'getPointTable',
  'exportConfig',
  'importConfig',
  'destroy',
] as const;

export interface UseScadaHandlesArgs {
  componentRegistry: ComponentHandleRegistry | undefined;
  id: string | undefined;
  cid: number | undefined;
  runtime: ScadaCanvasRuntime | null;
  destroy: () => void;
  onDestroyed?: () => void;
  reloadConfig: (config: ScadaConfig) => void;
}

/**
 * `component:*` 组件句柄注册（I10.2，design-renderer.md §8.5 表逐项）：
 * ComponentHandleRegistry 既有通道（list-renderer `register({ id, type, capabilities })` 模式），
 * 句柄方法转发到引擎命令句柄 + 点表 store；卸载时退订。失败路径对齐 §8.5 失败路径表。
 */
export function useScadaHandles(args: UseScadaHandlesArgs): void {
  const { componentRegistry, id, cid, runtime, destroy, onDestroyed, reloadConfig } = args;
  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });

  useEffect(() => {
    if (!componentRegistry || id === undefined) return;

    const capabilities: ComponentCapabilities = {
      hasMethod(method) {
        return (SCADA_HANDLE_METHODS as readonly string[]).includes(method);
      },
      listMethods() {
        return SCADA_HANDLE_METHODS;
      },
      invoke(method, payload) {
        if (method === 'destroy') {
          latest.current.destroy();
          // plan 2026-08-04-1558-2 Phase 1：destroy 后状态面置 destroyed（OP-4）。
          latest.current.onDestroyed?.();
          return { ok: true };
        }
        const current = latest.current.runtime;
        const notMounted = () => ({ ok: false, error: new Error('scada canvas is not mounted') });
        if (!current?.engine || current.engine.isDestroyed()) return notMounted();
        switch (method) {
          case 'fit': {
            const bounds = computeSymbolBounds(current.engine.exportConfig()?.symbols ?? []);
            if (!bounds) {
              // plan 2026-08-04-1558-2 Phase 4 WD-5：fit/center 无 bounds 失败路径对齐
              // design-renderer.md §8.5 表 `not-visible`（错误码注册表登记）。
              return { ok: false, error: new Error('not-visible') };
            }
            return { ok: true, data: current.engine.fit(bounds, 0) };
          }
          case 'center': {
            const bounds = computeSymbolBounds(current.engine.exportConfig()?.symbols ?? []);
            if (!bounds) {
              return { ok: false, error: new Error('not-visible') };
            }
            return { ok: true, data: current.engine.center(bounds) };
          }
          case 'getSymbols': {
            const symbols = current.engine.getSymbols().map((leaf) => ({
              id: leaf.id,
              type: leaf.definition?.type ?? String(leaf.node.tag),
            }));
            return { ok: true, data: symbols };
          }
          case 'getSymbol': {
            const symbolId = (payload as { id?: unknown } | undefined)?.id;
            if (typeof symbolId !== 'string') return { ok: false, error: new Error('symbol id is required') };
            const props = current.engine.getSymbolProps(symbolId);
            if (props === undefined) {
              return { ok: false, error: new Error(`symbol not found: ${symbolId}`) };
            }
            return { ok: true, data: props };
          }
          case 'setPointValue': {
            const pointId = (payload as { pointId?: unknown } | undefined)?.pointId;
            const value = (payload as { value?: unknown } | undefined)?.value;
            if (typeof pointId !== 'string') return { ok: false, error: new Error('pointId is required') };
            if (!current.pointStore.has(pointId)) {
              return { ok: false, error: new Error(`point not found: ${pointId}`) };
            }
            current.pointStore.setPointValue(pointId, value as ScadaPrimitive);
            current.pipeline.requestRender(current.applyAttrs);
            return { ok: true };
          }
          case 'getPointTable': {
            const table: Record<string, unknown> = {};
            for (const pointId of current.pointStore.pointIds()) {
              const value = current.pointStore.getPointValue(pointId);
              if (value !== undefined) table[pointId] = value;
            }
            return { ok: true, data: table };
          }
          case 'exportConfig': {
            const config = current.engine.exportConfig();
            if (config === undefined) return { ok: false, error: new Error('scada canvas has no config') };
            return { ok: true, data: config };
          }
          case 'importConfig': {
            const input = (payload as { config?: unknown } | undefined)?.config;
            try {
              const config = parseScadaConfig(input as string | object);
              const result = validateScadaConfig(config);
              if (!result.ok) {
                return { ok: false, error: new Error(`invalid scada config: ${result.errors.join('; ')}`) };
              }
              latest.current.reloadConfig(config);
              return { ok: true };
            } catch (error) {
              return { ok: false, error: toError(error) };
            }
          }
          default:
            return { ok: false, error: new Error(`Unknown method: ${method}`) };
        }
      },
    };

    return componentRegistry.register({
      id: String(id),
      _cid: cid,
      type: 'scada-canvas',
      capabilities,
    });
  }, [componentRegistry, id, cid, runtime, destroy, onDestroyed, reloadConfig]);
}
