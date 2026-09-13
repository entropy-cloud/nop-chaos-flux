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
}

/**
 * 事件桥接（design-renderer.md §4，D3）：引擎 onPick/onHover → createNormalizedActionEvent
 * （单参数签名）→ helpers.dispatch(action, { event, scope })。未声明对应 action 时不派发。
 * 订阅随引擎实例/卸载清理。
 */
export function useThreeEvents(args: UseThreeEventsArgs): void {
  const { events, helpers, scope, engine } = args;
  const latest = useRef({ events, helpers, scope });
  useEffect(() => {
    latest.current = { events, helpers, scope };
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
        dispatch(
          'object:click',
          { modelId: e.modelId, point: { x: e.point.x, y: e.point.y, z: e.point.z } },
          latest.current.events?.onObjectClick,
        );
      }),
    );
    unsubs.push(
      engine.onHover((e) => {
        dispatch('object:hover', { modelId: e.modelId, hovered: e.hovered }, latest.current.events?.onObjectHover);
      }),
    );
    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [engine]);
}
