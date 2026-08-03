import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import type { ActionSchema, RendererHelpers, ScopeRef } from '@nop-chaos/flux-core';
import { createNormalizedActionEvent } from '@nop-chaos/flux-react';
import type { ScadaSymbolEventName, ScadaSymbolEventPayload } from '../../engine/event-bridge.js';
import type { ScadaCanvasEngine } from '../../engine/scada-engine.js';
import type { ScadaCanvasEvents } from '../../schemas.js';
import type { ScadaConfig, ScadaSymbolEvent, ScadaSymbolNode } from '../../serialization/config-types.js';

const SYMBOL_EVENT_ACTION_KEYS: Record<Exclude<ScadaSymbolEventName, 'symbol:hover-miss'>, keyof ScadaCanvasEvents> = {
  'symbol:click': 'onSymbolClick',
  'symbol:dblclick': 'onSymbolDblClick',
  'symbol:hover': 'onSymbolHover',
};

const SYMBOL_EVENT_ONS: Record<Exclude<ScadaSymbolEventName, 'symbol:hover-miss'>, ScadaSymbolEvent['on']> = {
  'symbol:click': 'click',
  'symbol:dblclick': 'dblclick',
  'symbol:hover': 'hover',
};

function collectFromNode(node: ScadaSymbolNode, index: Map<string, ScadaSymbolEvent[]>): void {
  if (Array.isArray(node.events) && node.events.length > 0) {
    index.set(node.id, node.events);
  }
  for (const child of node.children ?? []) {
    collectFromNode(child, index);
  }
}

/**
 * 组态内图元事件声明索引（I11.1，design-renderer.md §8.2）：`symbolId → ScadaSymbolEvent[]`，
 * 场景构建/配置变更时重建（递归含 group 子树）。纯逻辑，单测覆盖。
 */
export function collectSymbolEvents(config: ScadaConfig | undefined): Map<string, ScadaSymbolEvent[]> {
  const index = new Map<string, ScadaSymbolEvent[]>();
  if (!config) return index;
  for (const node of config.symbols) {
    collectFromNode(node, index);
  }
  return index;
}

export interface UseScadaEventsArgs {
  /** schema 级事件声明（props.props.events，ActionSchema 字面量，design-renderer.md §4.1/§8.1）。 */
  events: ScadaCanvasEvents | undefined;
  helpers: RendererHelpers;
  scope?: ScopeRef;
  /** 组态内图元事件声明来源（I11.1：声明优先，props.events 兜底）。 */
  config?: ScadaConfig;
  /** 引擎实例引用（I11.2 hover 覆盖物驱动；引擎创建于兄弟 hook，经 ref 事件期读取）。 */
  engine?: RefObject<ScadaCanvasEngine | undefined>;
  /** 交互覆盖层开关（renderer 传 true，design-engine.md §4.1 缺省 true）。 */
  interactionLayer?: boolean;
}

export interface ScadaEventsApi {
  onSymbolEvent: (name: ScadaSymbolEventName, payload: ScadaSymbolEventPayload) => unknown;
  notifyReady: () => unknown;
  notifyError: (error: { code: string; message: string }) => unknown;
}

/**
 * 事件桥接（I10.3 基座 + I11.1 图元声明全链路 + I11.2 hover 覆盖物驱动，
 * design-renderer.md §8.1/§8.2、design-engine.md §6）：
 * 引擎事件 → 图元声明优先 / props.events 兜底 → createNormalizedActionEvent（单参数签名
 * renderer-helpers.ts:98）→ `helpers.dispatch(action, { event: normalized, scope })` 派发；
 * `symbol:hover` 同时驱动 InteractionOverlay 高亮（interactionLayer 开关），`symbol:hover-miss`
 * 清覆盖物且不派发 action（hover 退出信号仅视觉消费，design-engine.md §8.1 事件表外）。
 */
export function useScadaEvents(args: UseScadaEventsArgs): ScadaEventsApi {
  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });

  const eventIndex = useMemo(() => collectSymbolEvents(args.config), [args.config]);
  const lastHoverSymbolRef = useRef<string | undefined>(undefined);

  const dispatchEvent = useCallback(
    (type: string, payload: Record<string, unknown>, action: unknown) => {
      const normalized = createNormalizedActionEvent({ type, ...payload });
      if (!action || typeof action !== 'object') return undefined;
      return latest.current.helpers.dispatch(action as ActionSchema, {
        event: normalized,
        scope: latest.current.scope,
      });
    },
    [],
  );

  const driveHover = useCallback((symbolId: string) => {
    const { engine: engineRef, interactionLayer } = latest.current;
    if (!interactionLayer || !engineRef) return;
    const overlay = engineRef.current?.interactionOverlay;
    if (!overlay) return;
    const prev = lastHoverSymbolRef.current;
    if (prev !== undefined && prev !== symbolId) overlay.clear(prev);
    lastHoverSymbolRef.current = symbolId;
    overlay.highlight(symbolId);
  }, []);

  const clearHover = useCallback(() => {
    const { engine: engineRef, interactionLayer } = latest.current;
    if (!interactionLayer || !engineRef) return;
    const overlay = engineRef.current?.interactionOverlay;
    if (!overlay) return;
    if (lastHoverSymbolRef.current !== undefined) overlay.clear(lastHoverSymbolRef.current);
    lastHoverSymbolRef.current = undefined;
  }, []);

  const onSymbolEvent = useCallback(
    (name: ScadaSymbolEventName, payload: ScadaSymbolEventPayload) => {
      if (name === 'symbol:hover') {
        driveHover(payload.symbolId);
      } else if (name === 'symbol:hover-miss') {
        clearHover();
        return undefined;
      }
      const declared = eventIndex.get(payload.symbolId)?.find(
        (entry) => entry.on === SYMBOL_EVENT_ONS[name as keyof typeof SYMBOL_EVENT_ONS],
      );
      const action = declared?.action ?? latest.current.events?.[SYMBOL_EVENT_ACTION_KEYS[name]];
      return dispatchEvent(name, payload as unknown as Record<string, unknown>, action);
    },
    [eventIndex, driveHover, clearHover, dispatchEvent],
  );

  const notifyReady = useCallback(() => {
    return dispatchEvent('scada:ready', { type: 'scada:ready' }, latest.current.events?.onReady);
  }, [dispatchEvent]);

  const notifyError = useCallback(
    (error: { code: string; message: string }) => {
      return dispatchEvent('scada:error', error, latest.current.events?.onError);
    },
    [dispatchEvent],
  );

  return useMemo(
    () => ({ onSymbolEvent, notifyReady, notifyError }),
    [onSymbolEvent, notifyReady, notifyError],
  );
}
