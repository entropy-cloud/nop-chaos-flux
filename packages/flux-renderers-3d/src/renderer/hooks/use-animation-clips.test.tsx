import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAnimationClips } from './use-animation-clips.js';
import type { SceneManager } from '../../engine/scene-manager.js';
import type { AnimationConfig } from '../../schemas.js';
import { createThreeTestEnvironment, flushMicrotasks, renderWithThreeEnvironment } from '../../test-support/renderer-test-support.js';

function makeFakeEngine() {
  const registerClips = vi.fn();
  const startClip = vi.fn();
  const engine = { registerClips, startClip } as unknown as SceneManager;
  return { engine, registerClips, startClip };
}

function ClipsProbe(props: {
  animations: AnimationConfig[];
  engine: SceneManager | null;
  onError?: (code: string, message: string) => void;
}) {
  useAnimationClips({ animations: props.animations, engine: props.engine, onError: props.onError });
  return null;
}

function stateClip(overrides: Partial<AnimationConfig> = {}): AnimationConfig {
  return {
    id: 'c1',
    trigger: { type: 'state', source: 'sceneState.valve' },
    target: { modelId: 'valve', property: 'rotation.y' },
    keyframes: [
      { time: 0, value: 0 },
      { time: 1000, value: 1 },
    ],
    ...overrides,
  };
}

describe('useAnimationClips (plan 466 Phase 4)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers clips on the engine', async () => {
    const fake = makeFakeEngine();
    const animations = [stateClip()];
    const environment = createThreeTestEnvironment([], { sceneState: { valve: 0 } });
    renderWithThreeEnvironment(
      <ClipsProbe animations={animations} engine={fake.engine} />,
      environment,
    );
    await flushMicrotasks();
    expect(fake.registerClips).toHaveBeenCalledWith(animations, expect.any(Function));
  });

  it('starts a state clip when the trigger path reaches the trigger value', async () => {
    const fake = makeFakeEngine();
    const environment = createThreeTestEnvironment([], { sceneState: { valve: 0 } });
    renderWithThreeEnvironment(
      <ClipsProbe
        animations={[stateClip({ trigger: { type: 'state', source: 'sceneState.valve', value: 1 } })]}
        engine={fake.engine}
      />,
      environment,
    );
    await flushMicrotasks();
    expect(fake.startClip).not.toHaveBeenCalled();
    await act(async () => {
      environment.scope.update('sceneState.valve', 1);
      await flushMicrotasks();
    });
    expect(fake.startClip).toHaveBeenCalledWith('c1');
  });

  it('starts a state clip without trigger.value when the path has a value', async () => {
    const fake = makeFakeEngine();
    const environment = createThreeTestEnvironment([], {});
    renderWithThreeEnvironment(<ClipsProbe animations={[stateClip()]} engine={fake.engine} />, environment);
    await flushMicrotasks();
    expect(fake.startClip).not.toHaveBeenCalled();
    await act(async () => {
      environment.scope.update('sceneState.valve', 'any');
      await flushMicrotasks();
    });
    expect(fake.startClip).toHaveBeenCalledWith('c1');
  });

  it('merges multiple state-clip paths and starts each matching clip', async () => {
    const fake = makeFakeEngine();
    const environment = createThreeTestEnvironment([], {});
    renderWithThreeEnvironment(
      <ClipsProbe
        animations={[
          stateClip({ id: 'a', trigger: { type: 'state', source: 'sceneState.a' } }),
          stateClip({ id: 'b', trigger: { type: 'state', source: 'sceneState.b' } }),
        ]}
        engine={fake.engine}
      />,
      environment,
    );
    await flushMicrotasks();
    await act(async () => {
      environment.scope.update('sceneState.b', 'go');
      await flushMicrotasks();
    });
    expect(fake.startClip).toHaveBeenCalledWith('b');
    expect(fake.startClip).not.toHaveBeenCalledWith('a');
  });

  it('reports registration diagnostics through onError', async () => {
    const fake = makeFakeEngine();
    const onError = vi.fn();
    const environment = createThreeTestEnvironment([], {});
    renderWithThreeEnvironment(
      <ClipsProbe animations={[stateClip()]} engine={fake.engine} onError={onError} />,
      environment,
    );
    await flushMicrotasks();
    const [registered, reporter] = fake.registerClips.mock.calls[0];
    reporter({ code: 'keyframes-degenerate', message: 'no keyframes' });
    expect(onError).toHaveBeenCalledWith('keyframes-degenerate', 'no keyframes');
    void registered;
  });
});
