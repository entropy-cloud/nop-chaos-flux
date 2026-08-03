import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RendererHelpers } from '@nop-chaos/flux-core';
import { useScadaEvents } from './hooks/use-scada-events.js';
import type { ScadaSymbolEventPayload } from '../engine/event-bridge.js';

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
