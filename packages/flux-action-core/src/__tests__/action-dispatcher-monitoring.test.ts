import { describe, expect, it } from 'vitest';
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
});
