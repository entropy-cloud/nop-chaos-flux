import { describe, expect, it, vi } from 'vitest';
import {
  createActionCtx,
  createMockAdapter,
  createTestDispatcher,
  makeCompiledProgram,
  staticCompiled,
} from './action-dispatcher-test-support.js';

describe('action-dispatcher monitoring', () => {
  it('fires monitor onActionStart and onActionEnd', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, env, runtime } = createTestDispatcher({ adapter });

    await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'x', value: 1 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'x', value: 1 } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(env.monitor?.onActionStart).toHaveBeenCalledOnce();
    expect(env.monitor?.onActionEnd).toHaveBeenCalledOnce();
  });

  it('does not let onActionEnd failures replace the action result', async () => {
    const adapter = createMockAdapter();
    const { dispatcher, env, runtime } = createTestDispatcher({ adapter });
    env.monitor = {
      onActionStart: vi.fn(),
      onActionEnd: vi.fn(() => {
        throw new Error('monitor end broke');
      }),
    };

    const result = await dispatcher.dispatch(
      makeCompiledProgram([
        {
          action: 'setValue',
          payload: { args: staticCompiled({ path: 'x', value: 1 }) },
          targeting: {},
          control: {},
          source: { action: 'setValue', args: { path: 'x', value: 1 } },
        },
      ]),
      createActionCtx({ runtime }),
    );

    expect(result).toMatchObject({ ok: true });
  });
});
