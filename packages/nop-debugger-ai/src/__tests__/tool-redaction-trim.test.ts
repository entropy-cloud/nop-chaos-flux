import { describe, expect, it } from 'vitest';
import { createDebuggerAiTools } from '../create-debugger-ai-tools.js';
import { createFakeAutomation, makeToolCall } from './fake-automation.js';

async function run(name: string, argsJson: string, automation = createFakeAutomation()) {
  const { toolExecutor } = createDebuggerAiTools({ automation });
  const result = await toolExecutor({ toolCall: makeToolCall(name, argsJson), signal: new AbortController().signal });
  return { automation, result: result as { ok: boolean; result?: string; error?: string } };
}

describe('debugger AI per-tool trimming and redaction', () => {
  it('inspect_node returns the identity/meta allowlist projection only', async () => {
    const automation = createFakeAutomation();
    automation.__set('inspectByCid', () => ({
      cid: 42,
      nodeId: 'node_42',
      path: '/page/form/input',
      rendererType: 'input-text',
      mounted: true,
      tagName: 'INPUT',
      className: 'flux-input',
      handleName: 'input-handle',
      availableMethods: ['focus'],
      metaSummary: { label: 'Name' },
      propsSummary: { placeholder: 'type here' },
      // Sensitive faces that must be dropped wholesale:
      formState: { values: { username: 'alice', password: 'hunter2' }, errors: {}, submitting: false },
      scopeData: { token: 'scope-secret' },
      scopeChain: [{ foo: 'bar' }],
      authoringContract: { something: true },
      registryEntry: { something: true },
      debugData: { something: true },
    }));
    const { result } = await run('inspect_node', '{"cid":42}', automation);
    expect(result.ok).toBe(true);
    const payload = JSON.parse(result.result!) as Record<string, unknown>;
    // Allowlist present:
    expect(payload).toMatchObject({ cid: 42, rendererType: 'input-text', mounted: true });
    expect(payload.metaSummary).toEqual({ label: 'Name' });
    // Allowlist discipline: everything outside the projection is absent —
    // key-level redaction alone would mask `password` but keep `username`
    // and the whole scopeChain, so this assertion fails under that old shape.
    for (const absent of ['formState', 'scopeData', 'scopeChain', 'authoringContract', 'registryEntry', 'debugData']) {
      expect(payload).not.toHaveProperty(absent);
    }
  });

  it('inspect_node redacts matching keys inside allowed summary fields', async () => {
    const automation = createFakeAutomation();
    automation.__set('inspectByCid', () => ({
      cid: 7,
      mounted: true,
      propsSummary: { password: 'plain', placeholder: 'ok' },
    }));
    const { result } = await run('inspect_node', '{"cid":7}', automation);
    const payload = JSON.parse(result.result!) as { propsSummary: Record<string, unknown> };
    expect(payload.propsSummary.password).toBe('[REDACTED]');
    expect(payload.propsSummary.placeholder).toBe('ok');
  });

  it('query_events redacts sensitive keys nested in event payloads', async () => {
    const automation = createFakeAutomation();
    automation.__set('queryEvents', () => [
      {
        id: 1,
        kind: 'api:end',
        group: 'api',
        level: 'error',
        summary: 'request failed',
        exportedData: { headers: { authorization: 'Bearer secret' }, note: 'keep' },
      },
    ]);
    const { result } = await run('query_events', '{}', automation);
    const events = JSON.parse(result.result!) as Array<{ exportedData: Record<string, unknown> }>;
    expect((events[0].exportedData.headers as Record<string, unknown>).authorization).toBe('[REDACTED]');
    expect(events[0].exportedData.note).toBe('keep');
  });

  it('truncates oversized tool results with a marker', async () => {
    const automation = createFakeAutomation();
    automation.__set('getOverview', () => ({ blob: 'x'.repeat(50_000) }));
    const { toolExecutor } = createDebuggerAiTools({ automation, maxResultChars: 500 });
    const result = (await toolExecutor({
      toolCall: makeToolCall('get_overview', '{}'),
      signal: new AbortController().signal,
    })) as { ok: boolean; result?: string };
    expect(result.ok).toBe(true);
    expect(result.result!.length).toBeLessThanOrEqual(520);
    expect(result.result!.endsWith('…[TRUNCATED]')).toBe(true);
  });

  it('applies default result cap even when the caller omits options', async () => {
    const automation = createFakeAutomation();
    automation.__set('getOverview', () => ({ blob: 'y'.repeat(100_000) }));
    const { result } = await run('get_overview', '{}', automation);
    expect(result.result!.length).toBeLessThan(40_000);
    expect(result.result!.endsWith('…[TRUNCATED]')).toBe(true);
  });
});
