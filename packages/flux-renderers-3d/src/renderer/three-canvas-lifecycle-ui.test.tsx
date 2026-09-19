import { act, render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { ThreeCanvasRenderer } from './three-canvas.js';
import { ThreeTestProviders, createThreeTestEnvironment } from '../test-support/renderer-test-support.js';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { ThreeCanvasSchema } from '../schemas.js';

/**
 * Plan 473 (V3-F4): built-in loading UI + progress percentage. The
 * useSceneManager hook is mocked so the test can drive the onProgress channel
 * directly (the real engine's GLTF progress only exists for url models).
 */

vi.mock('./hooks/use-scene-manager.js', () => ({
  useSceneManager: vi.fn((args: { onProgress?: (ratio: number | null) => void; onError?: (e: { code: string; message: string }) => void }) => {
    lifecycleCaptured.onProgress = args.onProgress ?? null;
    lifecycleCaptured.onError = args.onError ?? null;
    return {
      onReady: vi.fn(() => () => undefined),
      updateProperty: vi.fn(),
      registerClips: vi.fn(),
      startClip: vi.fn(),
      notifyEvent: vi.fn(),
      dispose: vi.fn(),
      getScene: vi.fn(),
    };
  }),
}));

vi.mock('./hooks/use-binding-bridge.js', () => ({ useBindingBridge: vi.fn() }));
vi.mock('./hooks/use-three-events.js', () => ({ useThreeEvents: vi.fn() }));
vi.mock('./hooks/use-animation-clips.js', () => ({ useAnimationClips: vi.fn() }));

const lifecycleCaptured: {
  onProgress: ((ratio: number | null) => void) | null;
  onError: ((e: { code: string; message: string }) => void) | null;
} = { onProgress: null, onError: null };

function makeProps() {
  const schema = {
    type: 'three-canvas',
    id: 'three-lifecycle',
    scene: {
      camera: { position: [0, 0, 5] },
      lights: [{ type: 'ambient', intensity: 0.5 }],
      models: [{ id: 'valve', url: 'valve.glb' }],
    },
  } as unknown as ThreeCanvasSchema;
  return {
    id: 'three-lifecycle',
    path: 'three-lifecycle',
    schema,
    templateNode: {} as never,
    node: {} as never,
    props: { scene: schema.scene },
    meta: { visible: true },
    regions: {},
    events: {},
    reactions: {},
    helpers: { dispatch: vi.fn(), render: vi.fn(() => null) },
  } as unknown as RendererComponentProps<ThreeCanvasSchema>;
}

afterEach(() => {
  cleanup();
  lifecycleCaptured.onProgress = null;
  lifecycleCaptured.onError = null;
});

describe('three-canvas built-in loading UI (plan 473 V3-F4)', () => {
  it('shows indeterminate loading text with no host region', () => {
    const environment = createThreeTestEnvironment();
    const { container } = render(
      <ThreeTestProviders environment={environment}>
        <ThreeCanvasRenderer {...makeProps()} />
      </ThreeTestProviders>,
    );
    const loading = container.querySelector('[data-slot="three-canvas-loading"]');
    expect(loading).not.toBeNull();
    expect(loading?.textContent).not.toContain('%');
  });

  it('shows the percent text after a progress callback', async () => {
    const environment = createThreeTestEnvironment();
    const { container } = render(
      <ThreeTestProviders environment={environment}>
        <ThreeCanvasRenderer {...makeProps()} />
      </ThreeTestProviders>,
    );
    await act(async () => {
      lifecycleCaptured.onProgress?.(0.42);
      await new Promise((r) => setTimeout(r, 30));
    });
    const loading = container.querySelector('[data-slot="three-canvas-loading"]');
    expect(loading).not.toBeNull();
    expect(loading?.textContent).toContain('42%');
  });

  it('routes engine errors into the built-in error UI with retry', async () => {
    const environment = createThreeTestEnvironment();
    const { container } = render(
      <ThreeTestProviders environment={environment}>
        <ThreeCanvasRenderer {...makeProps()} />
      </ThreeTestProviders>,
    );
    await act(async () => {
      lifecycleCaptured.onError?.({ code: 'model-load-failed', message: 'boom' });
    });
    expect(container.querySelector('[data-three-scene-state="error"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="three-canvas-error"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="three-canvas-retry"]')).not.toBeNull();
  });
});
