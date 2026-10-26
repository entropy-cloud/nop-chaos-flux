import { describe, expect, it } from 'vitest';
import { createMessageEngine } from '@nop-chaos/flux-renderers-ai';
import { createDebuggerAiTools } from '../create-debugger-ai-tools.js';
import { createFakeAutomation, makeToolCall } from './fake-automation.js';

describe('debugger AI tools engine compatibility', () => {
  it('tools and executor plug into createMessageEngine', () => {
    const { tools, toolExecutor } = createDebuggerAiTools({ automation: createFakeAutomation() });
    const engine = createMessageEngine({ tools, toolExecutor });
    expect(engine.getState().requestState).toBe('idle');
    expect(engine.getMessages()).toEqual([]);
  });

  it('executor returns a ToolExecutionResult consumable by the tool loop', async () => {
    const automation = createFakeAutomation();
    automation.__set('getOverview', () => ({ errorCount: 2, totalEvents: 10 }));
    const { toolExecutor } = createDebuggerAiTools({ automation });
    const raw = await toolExecutor({
      toolCall: makeToolCall('get_overview', '{}'),
      signal: new AbortController().signal,
    });
    // The engine writes `.result` as role:'tool' content on ok:true and
    // `.error` on ok:false, so the executor must return the structured shape.
    expect(raw).toMatchObject({ ok: true });
    expect(JSON.parse((raw as { result?: string }).result ?? '{}')).toEqual({
      errorCount: 2,
      totalEvents: 10,
    });
  });
});
