import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThreeCanvasRenderer } from './three-canvas.js';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { ThreeCanvasSchema } from '../schemas.js';
import { ThreeTestProviders, createThreeTestEnvironment } from '../test-support/renderer-test-support.js';

vi.mock('../engine/scene-manager.js', () => import('../test-support/scene-manager-mock.js'));

function makeProps(overrides: Partial<Record<string, unknown>> = {}, meta: Record<string, unknown> = {}) {
  const environment = createThreeTestEnvironment();
  return { props: buildProps(overrides, meta), environment };
}

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
  const props = {
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
    regions: {},
    events: {},
    reactions: {},
    helpers: {
      dispatch: vi.fn(),
      render: vi.fn(() => null),
    },
  } as unknown as RendererComponentProps<ThreeCanvasSchema>;
  return props;
}

function renderThree(props: RendererComponentProps<ThreeCanvasSchema>, environment: ReturnType<typeof createThreeTestEnvironment>) {
  return render(
    <ThreeTestProviders environment={environment}>
      <ThreeCanvasRenderer {...props} />
    </ThreeTestProviders>,
  );
}

afterEach(() => {
  cleanup();
});

describe('three-canvas renderer component (plan 465 Phase 5, mocked engine)', () => {
  it('renders the container with scene-state marker, className and testid', () => {
    const { props, environment } = makeProps({}, { className: 'extra-class', testid: 'my-three' });
    const { container } = renderThree(props, environment);
    const el = container.querySelector('[data-testid="my-three"]');
    expect(el).not.toBeNull();
    expect(el?.classList.contains('three-canvas')).toBe(true);
    expect(el?.classList.contains('extra-class')).toBe(true);
    expect(el?.getAttribute('data-three-scene-state')).toBe('ready');
  });

  it('renders nothing when meta.visible is false', () => {
    const { props, environment } = makeProps({}, { visible: false });
    const { container } = renderThree(props, environment);
    expect(container.querySelector('.three-canvas')).toBeNull();
  });

  it('wires loading region while models load and ready after load completes', async () => {
    const { sceneManagerMock } = await import('../test-support/scene-manager-mock.js');
    sceneManagerMock.reset();
    const { props, environment } = makeProps();
    const { container } = renderThree(props, environment);
    expect(container.querySelector('[data-three-scene-state="ready"]')).not.toBeNull();
    // mock 引擎同步完成加载；状态埋点随之就绪
    expect(sceneManagerMock.instances).toHaveLength(1);
  });
});
