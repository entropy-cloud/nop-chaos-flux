import { describe, expect, it } from 'vitest';
import { createDebuggerAiTools } from '../create-debugger-ai-tools.js';
import { createFakeAutomation, makeToolCall } from './fake-automation.js';

async function run(name: string, argsJson: string, automation = createFakeAutomation()) {
  const { toolExecutor } = createDebuggerAiTools({ automation });
  const result = (await toolExecutor({
    toolCall: makeToolCall(name, argsJson),
    signal: new AbortController().signal,
  })) as { ok: boolean; result?: string; error?: string };
  return { automation, result };
}

describe('debugger AI tool error normalization', () => {
  it('rejects malformed JSON arguments with a structured error', async () => {
    const { result, automation } = await run('get_overview', '{not json');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('invalid arguments');
    expect(automation.__invoked).toEqual([]);
  });

  it('rejects non-object JSON arguments', async () => {
    const { result } = await run('get_overview', '[1,2,3]');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('invalid arguments');
  });

  it('rejects missing required arguments naming the expected shape', async () => {
    const { result } = await run('explain_node_value', '{}');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('cid');
    expect(result.error).toContain('number');
  });

  it('rejects wrong-typed arguments', async () => {
    const { result } = await run('inspect_node', '{"cid":"42"}');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('cid');
  });

  it('rejects enum-violating arguments', async () => {
    const { result } = await run('explain_node_meta', '{"cid":1,"field":"password"}');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('field');
  });

  it('normalizes automation throws without leaking stacks', async () => {
    const automation = createFakeAutomation();
    automation.__set('getOverview', () => {
      throw new Error('boom at WidgetBox (stack-frame-secret)');
    });
    const { result } = await run('get_overview', '{}', automation);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('get_overview');
    expect(result.error).toContain('failed');
    expect(result.error).not.toContain('stack-frame-secret');
  });

  it('reports aborted signals without invoking automation', async () => {
    const controller = new AbortController();
    controller.abort();
    const automation = createFakeAutomation();
    const { toolExecutor } = createDebuggerAiTools({ automation });
    const result = (await toolExecutor({
      toolCall: makeToolCall('get_overview', '{}'),
      signal: controller.signal,
    })) as { ok: boolean; error?: string };
    expect(result.ok).toBe(false);
    expect(result.error).toContain('aborted');
    expect(automation.__invoked).toEqual([]);
  });

  it('bounded query limit cannot exceed the hard cap', async () => {
    const automation = createFakeAutomation();
    automation.__set('queryEvents', (query: unknown) => {
      return { appliedLimit: (query as { limit?: number }).limit };
    });
    const { result } = await run('query_events', '{"limit":100000}', automation);
    const payload = JSON.parse(result.result!) as { appliedLimit: number };
    expect(payload.appliedLimit).toBeLessThanOrEqual(200);
  });
});
