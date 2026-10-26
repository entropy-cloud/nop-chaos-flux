import { describe, expect, it } from 'vitest';
import { createDebuggerAiTools } from '../create-debugger-ai-tools.js';
import { createFakeAutomation, makeToolCall } from './fake-automation.js';

const READ_ONLY_TOOL_NAMES = [
  'query_events',
  'get_overview',
  'get_node_diagnostics',
  'explain_node_value',
  'explain_node_meta',
  'explain_node_failure',
  'explain_node_async',
  'get_interaction_trace',
  'get_recent_failures',
  'inspect_node',
].sort();

describe('debugger AI tool whitelist', () => {
  it('exposes exactly the v1 read-only tool set', () => {
    const { tools } = createDebuggerAiTools({ automation: createFakeAutomation() });
    expect(tools.map((tool) => tool.function.name).sort()).toEqual(READ_ONLY_TOOL_NAMES);
  });

  it('never exposes evaluateNodeExpression or panel/session control methods', () => {
    const { tools } = createDebuggerAiTools({ automation: createFakeAutomation() });
    const names = tools.map((tool) => tool.function.name);
    // Discriminator: any registry that forwards the full automation surface
    // (passthrough) fails here.
    for (const banned of [
      'evaluate_node_expression',
      'evaluateNodeExpression',
      'clear',
      'pause',
      'resume',
      'show',
      'hide',
      'toggle',
      'minimize',
      'unminimize',
      'set_active_tab',
      'set_panel_position',
      'start_form_store_diagnostics_session',
      'export_session',
      'create_diagnostic_report',
      'wait_for_event',
      'inspect_by_element',
    ]) {
      expect(names).not.toContain(banned);
    }
  });

  it('rejects unknown tool names without touching the automation API', async () => {
    const automation = createFakeAutomation();
    const { toolExecutor } = createDebuggerAiTools({ automation });
    const result = await toolExecutor({ toolCall: makeToolCall('drop_table', '{}'), signal: new AbortController().signal });
    expect(result).toMatchObject({ ok: false });
    expect(String((result as { error?: string }).error)).toContain('unknown tool');
    expect(automation.__invoked).toEqual([]);
  });

  it('every declared tool routes only to its registered automation method', async () => {
    const automation = createFakeAutomation();
    const { tools, toolExecutor } = createDebuggerAiTools({ automation });
    for (const tool of tools) {
      automation.__invoked.length = 0;
      await toolExecutor({
        toolCall: makeToolCall(tool.function.name, '{}'),
        signal: new AbortController().signal,
      });
      for (const invoked of automation.__invoked) {
        // Whitelist discipline: whatever runs must be a read-only diagnostics
        // getter, never a mutating/control method.
        expect([
          'clear',
          'pause',
          'resume',
          'show',
          'hide',
          'toggle',
          'minimize',
          'unminimize',
          'setActiveTab',
          'setPanelPosition',
          'startFormStoreDiagnosticsSession',
          'stopFormStoreDiagnosticsSession',
          'clearFormStoreDiagnosticsSession',
          'evaluateNodeExpression',
        ]).not.toContain(invoked);
      }
    }
  });
});
