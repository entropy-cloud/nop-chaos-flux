import { useEffect, useRef } from 'react';
import { createNormalizedActionEvent } from '@nop-chaos/flux-react';
import type { ActionSchema, RendererHelpers, ScopeRef } from '@nop-chaos/flux-core';
import type { SceneManager } from '../../engine/scene-manager.js';
import type { ThreeCanvasEvents } from '../../schemas.js';

export interface UseThreeEventsArgs {
  events: ThreeCanvasEvents | undefined;
  helpers: RendererHelpers;
  scope?: ScopeRef;
  engine: SceneManager | null;
  /** 每个引擎事件（无论是否声明 action）都会回调；event 触发 clip 经此转发 */
  onEvent?: (type: string, payload: Record<string, unknown>) => void;
}

/**
 * 事件桥接（design-renderer.md §4，D3）：引擎 onPick/onHover → createNormalizedActionEvent
 * （单参数签名）→ helpers.dispatch(action, { event, scope })。未声明对应 action 时不派发。
 * 订阅随引擎实例/卸载清理。
 */
export function useThreeEvents(args: UseThreeEventsArgs): void {
  const { events, helpers, scope, engine } = args;
  const latest = useRef({ events, helpers, scope, onEvent: args.onEvent });
  useEffect(() => {
    latest.current = { events, helpers, scope, onEvent: args.onEvent };
  });

  useEffect(() => {
    if (!engine) return;
    const unsubs: Array<() => void> = [];
    const dispatch = (type: string, payload: Record<string, unknown>, action: unknown) => {
      if (!action || typeof action !== 'object') return;
      const normalized = createNormalizedActionEvent({ type, ...payload });
      void latest.current.helpers.dispatch(action as ActionSchema, {
        event: normalized,
        scope: latest.current.scope,
      });
    };
    unsubs.push(
      engine.onPick((e) => {
        const payload = { modelId: e.modelId, point: { x: e.point.x, y: e.point.y, z: e.point.z } };
        latest.current.onEvent?.('object:click', payload);
        dispatch('object:click', payload, latest.current.events?.onObjectClick);
      }),
    );
    unsubs.push(
      engine.onHover((e) => {
        const payload = { modelId: e.modelId, hovered: e.hovered };
        latest.current.onEvent?.('object:hover', payload);
        dispatch('object:hover', payload, latest.current.events?.onObjectHover);
      }),
    );
    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [engine]);
}
