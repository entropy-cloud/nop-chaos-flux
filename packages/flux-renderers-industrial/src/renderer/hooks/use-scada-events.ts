import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ActionSchema, RendererHelpers, ScopeRef } from '@nop-chaos/flux-core';
import { createNormalizedActionEvent } from '@nop-chaos/flux-react';
import type { ScadaSymbolEventName, ScadaSymbolEventPayload } from '../../engine/event-bridge.js';
import type { ScadaCanvasEvents } from '../../schemas.js';

const SYMBOL_EVENT_ACTION_KEYS: Record<ScadaSymbolEventName, keyof ScadaCanvasEvents> = {
  'symbol:click': 'onSymbolClick',
  'symbol:dblclick': 'onSymbolDblClick',
  'symbol:hover': 'onSymbolHover',
};

export interface UseScadaEventsArgs {
  /** schema 级事件声明（props.props.events，ActionSchema 字面量，design-renderer.md §4.1/§8.1）。 */
  events: ScadaCanvasEvents | undefined;
  helpers: RendererHelpers;
  scope?: ScopeRef;
}

export interface ScadaEventsApi {
  onSymbolEvent: (name: ScadaSymbolEventName, payload: ScadaSymbolEventPayload) => unknown;
  notifyReady: () => unknown;
  notifyError: (error: { code: string; message: string }) => unknown;
}

/**
 * 事件桥接基座（I10.3，design-renderer.md §8.1/§8.2）：
 * 引擎事件 → createNormalizedActionEvent（单参数签名 renderer-helpers.ts:98）→
 * `helpers.dispatch(action, { event: normalized, scope })` 派发（平台 action dispatcher 通道，
 * 对齐 roadmap I10.3「事件经 action dispatcher 派发（对齐 props.events）」；raw ActionSchema 由
 * dispatcher 按需编译，normalizeCompiledActionProgram 契约）。
 * 组态内图元事件声明读取与派发留 I11.1 扩展。
 */
export function useScadaEvents(args: UseScadaEventsArgs): ScadaEventsApi {
  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });

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

  const onSymbolEvent = useCallback(
    (name: ScadaSymbolEventName, payload: ScadaSymbolEventPayload) => {
      const action = latest.current.events?.[SYMBOL_EVENT_ACTION_KEYS[name]];
      return dispatchEvent(name, payload as unknown as Record<string, unknown>, action);
    },
    [dispatchEvent],
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
