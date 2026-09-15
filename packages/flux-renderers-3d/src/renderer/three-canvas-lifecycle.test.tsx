import { act } from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThreeCanvasRenderer } from './three-canvas.js';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { ThreeCanvasSchema } from '../schemas.js';
import {
  ThreeTestProviders,
  createThreeTestEnvironment,
  flushMicrotasks,
} from '../test-support/renderer-test-support.js';

vi.mock('../engine/scene-manager.js', () => import('../test-support/scene-manager-mock.js'));

import { sceneManagerMock } from '../test-support/scene-manager-mock.js';

function buildProps(overrides: Partial<Record<string, unknown>> = {}, meta: Record<string, unknown> = {}) {
  const schema = {
    type: 'three-canvas',
    id: 'three-1',
    scene: {
      camera: { position: [0, 0, 5] },
      lights: [{ type: 'ambient', intensity: 0.5 }],
      models: [{ id: 'valve', url: 'valve.glb' }],
    },
    ...overrides,
  } as unknown as ThreeCanvasSchema;
  return {
    id: 'three-1',
    path: 'three-1',
    schema,
    templateNode: {} as never,
    node: {} as never,
    props: {
      scene: schema.scene,
      bindings: overrides.bindings,
      events: overrides.events,
    },
    meta: { visible: true, ...meta },
    regions: overrides.regions ?? {},
    events: {},
    reactions: {},
    helpers: {
      dispatch: vi.fn(),
      render: vi.fn(() => null),
    },
  } as unknown as RendererComponentProps<ThreeCanvasSchema>;
}

afterEach(() => {
  cleanup();
  sceneManagerMock.reset();
});

describe('three-canvas component lifecycle (plan 465 Phase 5, mocked engine callbacks)', () => {
  it('transitions to error on webgl-unavailable and dispatches events.onError with code/message', async () => {
    const onErrorAction = { action: 'setValue', args: { path: 'err', value: 1 } };
    const { props, environment } = {
      props: buildProps({
        events: { onError: onErrorAction },
        regions: { loading: { render: () => 'loading-slot' } },
      }),
      environment: createThreeTestEnvironment(),
    } as never as { props: RendererComponentProps<ThreeCanvasSchema>; environment: ReturnType<typeof createThreeTestEnvironment> };
    const { container } = render(
      <ThreeTestProviders environment={environment}>
        <ThreeCanvasRenderer {...props} />
      </ThreeTestProviders>,
    );
    await flushMicrotasks();
    const instance = sceneManagerMock.instances[0];
    expect(instance).toBeDefined();
    // 引擎 init 诊断回调 → error 态 + onError action 派发
    const initCb = instance.init.mock.calls[0]?.[0] as ((e: { code: string; message: string }) => void) | undefined;
    expect(initCb).toBeTypeOf('function');
    act(() => {
      initCb!({ code: 'webgl-unavailable', message: 'no gl' });
    });
    expect(container.querySelector('[data-three-scene-state="error"]')).not.toBeNull();
    const dispatch = props.helpers.dispatch as ReturnType<typeof vi.fn>;
    expect(dispatch).toHaveBeenCalledTimes(1);
    const [action, ctx] = dispatch.mock.calls[0];
    expect(action).toEqual(onErrorAction);
    expect(ctx?.event).toMatchObject({ type: 'scene:error', code: 'webgl-unavailable' });
  });

  it('transitions to ready when engine fires onReady and renders loading region while loading', async () => {
    const { props, environment } = {
      props: buildProps({
        regions: { loading: { render: () => 'loading-slot' } },
      }),
      environment: createThreeTestEnvironment(),
    } as never as { props: RendererComponentProps<ThreeCanvasSchema>; environment: ReturnType<typeof createThreeTestEnvironment> };
    const { container } = render(
      <ThreeTestProviders environment={environment}>
        <ThreeCanvasRenderer {...props} />
      </ThreeTestProviders>,
    );
    const instance = sceneManagerMock.instances[0];
    // mock 引擎 loadModels 即刻 resolve，但组件的 onReady 订阅在渲染期注册——手动触发 ready 回调
    act(() => {
      for (const cb of instance.readyCallbacks) cb();
    });
    expect(container.querySelector('[data-three-scene-state="ready"]')).not.toBeNull();
  });

  it('renders empty region when the scene declares no models', () => {
    const { props, environment } = {
      props: buildProps({
        scene: { camera: { position: [0, 0, 5] }, lights: [], models: [] },
        regions: { empty: { render: () => 'empty-slot' } },
      }),
      environment: createThreeTestEnvironment(),
    } as never as { props: RendererComponentProps<ThreeCanvasSchema>; environment: ReturnType<typeof createThreeTestEnvironment> };
    const { container } = render(
      <ThreeTestProviders environment={environment}>
        <ThreeCanvasRenderer {...props} />
      </ThreeTestProviders>,
    );
    expect(container.querySelector('[data-three-scene-state="empty"]')).not.toBeNull();
  });

  it('error state is retained over subsequent ready signals', async () => {
    const { props, environment } = {
      props: buildProps(),
      environment: createThreeTestEnvironment(),
    } as never as { props: RendererComponentProps<ThreeCanvasSchema>; environment: ReturnType<typeof createThreeTestEnvironment> };
    const { container } = render(
      <ThreeTestProviders environment={environment}>
        <ThreeCanvasRenderer {...props} />
      </ThreeTestProviders>,
    );
    const instance = sceneManagerMock.instances[0];
    const initCb = instance.init.mock.calls[0]?.[0] as (e: { code: string; message: string }) => void;
    act(() => {
      initCb({ code: 'model-load-failed', message: 'boom' });
      for (const cb of instance.readyCallbacks) cb();
    });
    expect(container.querySelector('[data-three-scene-state="error"]')).not.toBeNull();
  });
});
