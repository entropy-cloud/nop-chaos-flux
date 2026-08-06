import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RendererHelpers } from '@nop-chaos/flux-core';
import { useScadaEvents } from './hooks/use-scada-events.js';
import type { ScadaSymbolEventPayload } from '../engine/event-bridge.js';
import type { ScadaCanvasEngine } from '../engine/scada-engine.js';
import type { ScadaConfig } from '../serialization/config-types.js';
import type { RefObject } from 'react';

const hoverPayload = (symbolId: string): ScadaSymbolEventPayload => ({
  symbolId,
  symbolType: 'scada-rect',
});

describe('useScadaEvents overlay guard paths (I11.2)', () => {
  it('does not touch the overlay when interactionLayer is off', () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() =>
      useScadaEvents({
        events: undefined,
        helpers: { dispatch } as unknown as RendererHelpers,
        interactionLayer: false,
      }),
    );
    result.current.onSymbolEvent('symbol:hover', hoverPayload('rect-a'));
    result.current.onSymbolEvent('symbol:hover-miss', hoverPayload('rect-a'));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not touch the overlay when no engine is available yet', () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() =>
      useScadaEvents({
        events: undefined,
        helpers: { dispatch } as unknown as RendererHelpers,
        engine: { current: undefined },
        interactionLayer: true,
      }),
    );
    result.current.onSymbolEvent('symbol:hover', hoverPayload('rect-a'));
    result.current.onSymbolEvent('symbol:hover-miss', hoverPayload('rect-a'));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches the declared action and leaves hover signals undispatchable', () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() =>
      useScadaEvents({
        events: undefined,
        helpers: { dispatch } as unknown as RendererHelpers,
        config: {
          version: 1,
          symbols: [
            {
              id: 'rect-a',
              type: 'scada-rect',
              x: 0,
              y: 0,
              width: 10,
              height: 10,
              events: [{ on: 'click', action: { action: 'openDialog' } }],
            },
          ],
        },
      }),
    );
    result.current.onSymbolEvent('symbol:click', hoverPayload('rect-a'));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][0]).toMatchObject({ action: 'openDialog' });
    result.current.onSymbolEvent('symbol:hover-miss', hoverPayload('rect-a'));
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});

// plan 2026-08-06-0900-3 Phase 2（multi-audit P2-10）：use-scada-events config-change 重置 hover 基线。
// 失败用例（修复前）：config 变更（reset/reload）后图元集合可能整体替换，lastHoverSymbolRef 仍指向旧
// symbolId → 重入同符号 hover 被误去重（dispatch 不再派发），hover 状态机基线与新 config 错位。
// 修复后：config-change effect 重置 lastHoverSymbolRef=undefined，重入同符号再次派发（基线对齐新 config）。
describe('useScadaEvents config-change resets hover dedup baseline (plan 2026-08-06-0900-3 Phase 2 / multi P2-10)', () => {
  const makeConfig = (id: string): ScadaConfig => ({
    version: 1,
    symbols: [
      {
        id,
        type: 'scada-rect',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        events: [{ on: 'hover', action: { action: 'openDialog' } }],
      },
    ],
  });

  it('Proof: config 变更后重入同符号 hover 再次派发（lastHoverSymbolRef 重置，不误去重）', () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const overlay = { highlight: vi.fn(), clear: vi.fn(), hasActive: () => false, refresh: vi.fn() };
    const engineRef = { current: { interactionOverlay: overlay } } as unknown as RefObject<
      ScadaCanvasEngine | undefined
    >;

    const { result, rerender } = renderHook(
      (props: { config: ScadaConfig }) =>
        useScadaEvents({
          events: undefined,
          helpers: { dispatch } as unknown as RendererHelpers,
          config: props.config,
          engine: engineRef,
          interactionLayer: true,
        }),
      { initialProps: { config: makeConfig('rect-a') } },
    );

    // 1st hover 'rect-a'：lastHoverSymbolRef=undefined → 派发（dispatch 1）
    result.current.onSymbolEvent('symbol:hover', hoverPayload('rect-a'));
    expect(dispatch).toHaveBeenCalledTimes(1);

    // 2nd hover 'rect-a'：lastHoverSymbolRef='rect-a' → 去重（dispatch 仍 1）
    result.current.onSymbolEvent('symbol:hover', hoverPayload('rect-a'));
    expect(dispatch).toHaveBeenCalledTimes(1);

    // config 变更（reset/reload）：lastHoverSymbolRef 重置为 undefined
    rerender({ config: makeConfig('rect-a') });

    // 3rd hover 'rect-a'：lastHoverSymbolRef=undefined（已重置）→ 再次派发（dispatch 2）
    result.current.onSymbolEvent('symbol:hover', hoverPayload('rect-a'));
    expect(dispatch).toHaveBeenCalledTimes(2);
  });
});
