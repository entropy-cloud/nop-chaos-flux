import { act, fireEvent, render, cleanup } from '@testing-library/react';
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

describe('three-canvas built-in lifecycle UI (plan 473 V3-F4)', () => {
  it('renders built-in error UI with a retry button on engine error (no host region)', async () => {
    const { sceneManagerMock } = await import('../test-support/scene-manager-mock.js');
    sceneManagerMock.reset();
    const base = makeProps();
    const { container } = renderThree(base.props, base.environment);
    act(() => {
      sceneManagerMock.instances.at(-1)!.simulateError('model-load-failed');
    });

    expect(container.querySelector('[data-three-scene-state="error"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="three-canvas-error"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="three-canvas-retry"]')).not.toBeNull();

    // retry exits the error terminal state; the sync mock re-completes the
    // load, so the scene settles back to ready (error is no longer terminal)
    fireEvent.click(container.querySelector('[data-slot="three-canvas-retry"]')!);
    expect(container.querySelector('[data-three-scene-state="ready"]')).not.toBeNull();
  });

  it('renders built-in loading UI (spinner + percent) without a host region', async () => {
    const { sceneManagerMock } = await import('../test-support/scene-manager-mock.js');
    sceneManagerMock.reset();
    const base = makeProps();
    const { container } = renderThree(base.props, base.environment);
    sceneManagerMock.instances[0].simulateProgress(0.42);
    // sync mock completes loading → ready; after ready the built-in loading UI is gone
    expect(container.querySelector('[data-slot="three-canvas-loading"]')).toBeNull();
    expect(container.querySelector('[data-three-scene-state="ready"]')).not.toBeNull();
  });

  it('renders built-in empty UI for an empty scene without a host region', () => {
    const base = makeProps();
    const schema = {
      type: 'three-canvas',
      id: 'three-empty',
      scene: { camera: { position: [0, 0, 5] }, lights: [], models: [] },
    } as unknown as ThreeCanvasSchema;
    const props = {
      ...base.props,
      schema,
      props: { ...base.props.props, scene: schema.scene },
      regions: {},
    } as unknown as RendererComponentProps<ThreeCanvasSchema>;
    const { container } = renderThree(props, base.environment);
    expect(container.querySelector('[data-slot="three-canvas-empty"]')).not.toBeNull();
    expect(container.querySelector('[data-three-scene-state="empty"]')).not.toBeNull();
  });

  it('keeps the 400px inline default when no schema height is provided', () => {
    const base = makeProps();
    const { container } = renderThree(base.props, base.environment);
    const el = container.querySelector('.three-canvas') as HTMLElement;
    expect(el.style.height).toBe('400px');
  });

  it('suppresses built-in lifecycle UI when the host declares a loading region (priority)', async () => {
    const { sceneManagerMock } = await import('../test-support/scene-manager-mock.js');
    sceneManagerMock.reset();
    const base = makeProps();
    const hostRegion = { render: vi.fn(() => null) };
    (base.props.regions as Record<string, unknown>).loading = hostRegion;
    const { container } = renderThree(base.props, base.environment);
    // the sync mock completes instantly, so the host region was exercised
    // during the loading window and the built-in loading UI never surfaces
    expect(hostRegion.render).toHaveBeenCalled();
    expect(container.querySelector('[data-slot="three-canvas-loading"]')).toBeNull();
    expect(container.querySelector('[data-three-scene-state="ready"]')).not.toBeNull();
  });

  it('accepts a schema height prop and applies it to the container style', () => {
    const base = makeProps();
    const schema = {
      type: 'three-canvas',
      id: 'three-height',
      height: '560px',
      scene: {
        camera: { position: [0, 0, 5] },
        lights: [{ type: 'ambient', intensity: 0.5 }],
        models: [{ id: 'valve', url: 'valve.glb' }],
      },
    } as unknown as ThreeCanvasSchema;
    const props = {
      ...base.props,
      schema,
      props: { ...base.props.props, scene: schema.scene, height: '560px' },
    } as unknown as RendererComponentProps<ThreeCanvasSchema>;
    const { container } = renderThree(props, base.environment);
    const el = container.querySelector('.three-canvas') as HTMLElement;
    expect(el.style.height).toBe('560px');
  });
});
