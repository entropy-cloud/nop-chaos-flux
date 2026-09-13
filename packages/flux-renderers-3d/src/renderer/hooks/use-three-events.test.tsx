import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useThreeEvents } from './use-three-events.js';
import type { SceneManager } from '../../engine/scene-manager.js';
import type { ThreeCanvasEvents } from '../../schemas.js';
import type { RendererHelpers } from '@nop-chaos/flux-core';

afterEach(() => {
  cleanup();
});

describe('useThreeEvents (plan 465 Phase 5)', () => {
  it('dispatches normalized object:click events through helpers.dispatch', () => {
    const dispatch = vi.fn();
    const helpers = { dispatch } as unknown as RendererHelpers;
    const pickListeners: Array<(e: { modelId: string; point: { x: number; y: number; z: number } }) => void> = [];
    const engine = {
      onPick: (cb: (e: { modelId: string; point: { x: number; y: number; z: number } }) => void) => {
        pickListeners.push(cb);
        return () => undefined;
      },
      onHover: () => () => undefined,
    } as unknown as SceneManager;
    const events: ThreeCanvasEvents = {
      onObjectClick: { action: 'setValue', args: { path: 'selected', value: 'x' } } as never,
    };
    const Probe = () => {
      useThreeEvents({ events, helpers, engine });
      return null;
    };
    render(<Probe />);
    expect(pickListeners).toHaveLength(1);
    pickListeners[0]({ modelId: 'valve-1', point: { x: 1, y: 2, z: 3 } });
    expect(dispatch).toHaveBeenCalledTimes(1);
    const [action, ctx] = dispatch.mock.calls[0];
    expect(action).toEqual(events.onObjectClick);
    expect(ctx?.event).toMatchObject({ type: 'object:click', modelId: 'valve-1' });
  });

  it('subscribes to hover transitions and dispatches hovered state', () => {
    const dispatch = vi.fn();
    const helpers = { dispatch } as unknown as RendererHelpers;
    const hoverListeners: Array<(e: { modelId: string; hovered: boolean }) => void> = [];
    const engine = {
      onPick: () => () => undefined,
      onHover: (cb: (e: { modelId: string; hovered: boolean }) => void) => {
        hoverListeners.push(cb);
        return () => undefined;
      },
    } as unknown as SceneManager;
    const events: ThreeCanvasEvents = {
      onObjectHover: { action: 'setValue', args: { path: 'hovered', value: true } } as never,
    };
    const Probe = () => {
      useThreeEvents({ events, helpers, engine });
      return null;
    };
    render(<Probe />);
    hoverListeners[0]({ modelId: 'valve-1', hovered: true });
    hoverListeners[0]({ modelId: 'valve-1', hovered: false });
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch.mock.calls[0][1]?.event).toMatchObject({ modelId: 'valve-1', hovered: true });
    expect(dispatch.mock.calls[1][1]?.event).toMatchObject({ modelId: 'valve-1', hovered: false });
  });

  it('unsubscribes from engine listeners on unmount', () => {
    const unsubPick = vi.fn();
    const unsubHover = vi.fn();
    const engine = {
      onPick: () => unsubPick,
      onHover: () => unsubHover,
    } as unknown as SceneManager;
    const Probe = () => {
      useThreeEvents({ events: {}, helpers: { dispatch: vi.fn() } as unknown as RendererHelpers, engine });
      return null;
    };
    const { unmount } = render(<Probe />);
    unmount();
    expect(unsubPick).toHaveBeenCalledTimes(1);
    expect(unsubHover).toHaveBeenCalledTimes(1);
  });
});
