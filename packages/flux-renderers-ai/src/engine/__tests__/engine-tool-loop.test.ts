import { describe, it, expect, vi } from 'vitest';
import { createMessageEngine } from '../create-engine.js';
import { createToolPlugin } from '../plugins/tool-plugin.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  AiToolSchema,
  ChatMessage,
  ToolExecutor,
} from '../types.js';

/**
 * Scripted connector: each call to `stream` consumes the next scripted round.
 * Lets a test simulate multi-round tool_calls loops.
 */
function scriptedConnector(rounds: AiConnectorChunk[][]): AiConnector & {
  calls: AiConnectorRequest[];
} {
  const calls: AiConnectorRequest[] = [];
  let round = 0;
  return {
    calls,
    async stream(request: AiConnectorRequest) {
      calls.push(request);
      const chunks = rounds[Math.min(round, rounds.length - 1)];
      round += 1;
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        for (const c of chunks) yield c;
      }
      return gen();
    },
  };
}

const toolCallChunks = (id: string, name: string, args: string): AiConnectorChunk[] => [
  {
    delta: {
      tool_calls: [
        { index: 0, id, type: 'function', function: { name, arguments: args } },
      ],
    },
  },
  { finishReason: 'tool_calls' },
];

const stopChunks = (text: string): AiConnectorChunk[] => [
  { delta: { content: text } },
  { finishReason: 'stop' },
];

describe('createMessageEngine — agentic tool execution loop', () => {
  it('multi-round: tool_calls → execute → role:tool message → requestNext → stop', async () => {
    const connector = scriptedConnector([
      toolCallChunks('call_1', 'get_weather', '{"city":"sf"}'),
      stopChunks('It is sunny.'),
    ]);
    const executor: ToolExecutor = vi.fn(async ({ toolCall }) => {
      expect(toolCall.function.name).toBe('get_weather');
      return 'sunny, 18C';
    });

    const engine = createMessageEngine({
      connector,
      tools: [{ type: 'function', function: { name: 'get_weather' } }],
      toolExecutor: executor,
      plugins: [createToolPlugin({ tools: [{ type: 'function', function: { name: 'get_weather' } }] })],
    });

    await engine.sendMessage('weather?');

    const final = engine.getState();
    expect(final.requestState).toBe('completed');
    // user + assistant(tool_calls) + tool + assistant(stop)
    const roles = final.messages.map((m) => m.role);
    expect(roles).toEqual(['user', 'assistant', 'tool', 'assistant']);
    // The tool message carries the result + tool_call_id linkage.
    const toolMsg = final.messages.find((m) => m.role === 'tool') as ChatMessage;
    expect(toolMsg.tool_call_id).toBe('call_1');
    expect(toolMsg.content).toBe('sunny, 18C');
    expect(toolMsg.name).toBe('get_weather');
    // Final assistant is the stop round.
    const lastAssistant = final.messages[final.messages.length - 1];
    expect((lastAssistant.content as string)).toBe('It is sunny.');
    // requestNext actually happened: connector was called twice.
    expect(connector.calls).toHaveLength(2);
    // Second request carried the tool message in its history.
    const secondReqMessages = connector.calls[1].messages;
    expect(secondReqMessages.some((m) => m.role === 'tool' && m.tool_call_id === 'call_1')).toBe(true);
    // Executor invoked exactly once.
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it('tool-exec-failed: executor reject → status=failed + error tool message + continue requestNext', async () => {
    const connector = scriptedConnector([
      toolCallChunks('c_fail', 'search', '{"q":"x"}'),
      stopChunks('Recovered after failure.'),
    ]);
    const executor: ToolExecutor = vi.fn(async () => {
      throw new Error('boom');
    });

    const engine = createMessageEngine({ connector, toolExecutor: executor });
    await engine.sendMessage('go');

    const final = engine.getState();
    expect(final.requestState).toBe('completed');
    const toolMsg = final.messages.find((m) => m.role === 'tool') as ChatMessage;
    expect(toolMsg.content).toBe('boom');
    expect(toolMsg.metadata?.toolStatus).toBe('failed');
    // Engine continued to a follow-up request despite the failure.
    expect(connector.calls).toHaveLength(2);
    // The owning assistant message state reflects failed status.
    const owner = final.messages.find((m) => m.role === 'assistant' && m.tool_calls?.length) as ChatMessage;
    expect(owner.state?.toolCall?.['c_fail']?.status).toBe('failed');
  });

  it('tool-exec-failed: executor returns ToolExecutionResult ok:false → failed status', async () => {
    const connector = scriptedConnector([
      toolCallChunks('c2', 'search', '{}'),
      stopChunks('done'),
    ]);
    const executor: ToolExecutor = async () => ({ ok: false, error: 'not found' });

    const engine = createMessageEngine({ connector, toolExecutor: executor });
    await engine.sendMessage('go');
    const final = engine.getState();
    const toolMsg = final.messages.find((m) => m.role === 'tool') as ChatMessage;
    expect(toolMsg.content).toBe('not found');
    expect(toolMsg.metadata?.toolStatus).toBe('failed');
  });

  // P2 FP `tool-error-flattened`: the executor throws an Error with a `cause`
  // chain / custom fields. The engine must preserve the original Error on the
  // tool message's metadata so hosts can structurally log it, instead of
  // collapsing to a bare message string. This guards the regression where a
  // catch block did `resultText = err.message` and dropped everything else.
  it('tool-error-flattened: thrown Error is preserved on metadata.toolError (cause + custom fields intact)', async () => {
    const connector = scriptedConnector([
      toolCallChunks('c_err', 'flaky', '{}'),
      stopChunks('Recovered.'),
    ]);
    class ToolError extends Error {
      readonly code = 'TOOL_503';
      readonly extra = { retryable: true };
      constructor(message: string, opts: { cause: unknown }) {
        super(message, opts);
        this.name = 'ToolError';
      }
    }
    const rootCause = new Error('upstream timeout');
    const executor: ToolExecutor = async () => {
      throw new ToolError('flaky tool failed', { cause: rootCause });
    };

    const engine = createMessageEngine({ connector, toolExecutor: executor });
    await engine.sendMessage('go');
    const final = engine.getState();
    const toolMsg = final.messages.find((m) => m.role === 'tool') as ChatMessage;

    // Human-readable message still ships as the tool message content the model reads.
    expect(toolMsg.content).toBe('flaky tool failed');
    expect(toolMsg.metadata?.toolStatus).toBe('failed');
    // Original Error preserved with full fidelity.
    const preserved = toolMsg.metadata?.toolError;
    expect(preserved).toBeInstanceOf(Error);
    expect((preserved as Error).message).toBe('flaky tool failed');
    expect((preserved as Error).name).toBe('ToolError');
    // Custom fields survive (not flattened to a string).
    expect((preserved as ToolError).code).toBe('TOOL_503');
    expect((preserved as ToolError).extra).toEqual({ retryable: true });
    // cause chain survives (not dropped).
    expect((preserved as Error).cause).toBe(rootCause);
  });

  it('tool-error-flattened: non-Error throw is wrapped as Error on metadata.toolError', async () => {
    const connector = scriptedConnector([
      toolCallChunks('c_str', 'f', '{}'),
      stopChunks('Recovered.'),
    ]);
    const executor: ToolExecutor = async () => {
      // A plain string throw (not an Error instance).
      throw 'plain string failure';
    };
    const engine = createMessageEngine({ connector, toolExecutor: executor });
    await engine.sendMessage('go');
    const toolMsg = engine.getState().messages.find((m) => m.role === 'tool') as ChatMessage;
    expect(toolMsg.metadata?.toolStatus).toBe('failed');
    const preserved = toolMsg.metadata?.toolError;
    expect(preserved).toBeInstanceOf(Error);
    expect((preserved as Error).message).toBe('plain string failure');
  });

  it('tool-loop-max: terminates after maxToolRounds consecutive tool_calls', async () => {
    // Always return tool_calls — never stop. Cap at 2 rounds.
    const connector = scriptedConnector([
      toolCallChunks('r0', 'loop', '{}'),
      toolCallChunks('r1', 'loop', '{}'),
      toolCallChunks('r2', 'loop', '{}'),
    ]);
    const executor: ToolExecutor = async () => 'ok';

    const engine = createMessageEngine({ connector, toolExecutor: executor, maxToolRounds: 2 });
    await engine.sendMessage('loop');
    const final = engine.getState();
    expect(final.requestState).toBe('completed');
    // Only maxToolRounds (2) tool-execution rounds ran → 2 tool messages.
    const toolMsgs = final.messages.filter((m) => m.role === 'tool');
    expect(toolMsgs).toHaveLength(2);
    // Last assistant message carries the loop-max marker.
    const lastAssistant = final.messages[final.messages.length - 1];
    expect(lastAssistant.metadata?.toolLoopMaxReached).toBe(true);
  });

  it('tool-no-executor: finish_reason tool_calls without executor → error, no loop', async () => {
    const connector = scriptedConnector([toolCallChunks('c3', 'f', '{}')]);
    const engine = createMessageEngine({ connector });
    await engine.sendMessage('go');
    const final = engine.getState();
    expect(final.requestState).toBe('error');
    expect(final.isProcessing).toBe(false);
    // No follow-up request, no tool result message.
    expect(connector.calls).toHaveLength(1);
    expect(final.messages.some((m) => m.role === 'tool')).toBe(false);
  });

  it('tool-no-executor: writes the cause onto state.lastError (parity with connector-throw)', async () => {
    // Pre-fix the tool-no-executor path flipped requestState to 'error' but
    // never wrote lastError, so error-state consumers had no cause to render.
    const connector = scriptedConnector([toolCallChunks('c_ne', 'f', '{}')]);
    const engine = createMessageEngine({ connector });
    await engine.sendMessage('go');
    const final = engine.getState();
    expect(final.requestState).toBe('error');
    expect(final.lastError).toBeInstanceOf(Error);
    expect((final.lastError as Error).message).toBe('tool-no-executor');
  });

  it('abort mid-loop stops further rounds', async () => {
    // First round tool_calls; the executor will await abort then the loop bails.
    const connector = scriptedConnector([toolCallChunks('c4', 'f', '{}'), stopChunks('late')]);
    let resolveExecutor: () => void;
    const executorGate = new Promise<void>((r) => {
      resolveExecutor = r;
    });
    const executor: ToolExecutor = async () => {
      await executorGate;
      return 'late-result';
    };
    const engine = createMessageEngine({ connector, toolExecutor: executor });
    const turn = engine.sendMessage('go');
    // Allow the first round to stream + reach tool execution.
    await Promise.resolve();
    await Promise.resolve();
    await engine.abort();
    resolveExecutor!();
    await turn;
    const final = engine.getState();
    expect(final.requestState).toBe('aborted');
    // No successful follow-up 'stop' round.
    expect(connector.calls).toHaveLength(1);
  });
});

describe('createToolPlugin — resolveTools + status flow', () => {
  it('resolveTools aggregates host tools onto request.tools', async () => {
    const connector = scriptedConnector([stopChunks('ok')]);
    const tools: AiToolSchema[] = [{ type: 'function', function: { name: 'get_weather' } }];
    const engine = createMessageEngine({
      connector,
      plugins: [createToolPlugin({ tools })],
    });
    await engine.sendMessage('hi');
    expect(connector.calls[0].tools).toEqual(tools);
  });

  it('resolveTools does not clobber tools already on the request', async () => {
    const connector = scriptedConnector([stopChunks('ok')]);
    const engine = createMessageEngine({
      connector,
      extraRequestParams: { tools: [{ type: 'function', function: { name: 'preset' } }] },
      plugins: [
        createToolPlugin({ tools: [{ type: 'function', function: { name: 'added' } }] }),
      ],
    });
    await engine.sendMessage('hi');
    const names = (connector.calls[0].tools ?? []).map((t) => t.function.name);
    expect(names).toContain('preset');
    expect(names).toContain('added');
  });

  it('status flows running → success when executor succeeds', async () => {
    const connector = scriptedConnector([
      toolCallChunks('s1', 'f', '{}'),
      stopChunks('done'),
    ]);
    const engine = createMessageEngine({
      connector,
      toolExecutor: async () => 'ok',
      plugins: [createToolPlugin()],
    });
    await engine.sendMessage('go');
    const owner = engine.getState().messages.find(
      (m) => m.role === 'assistant' && m.tool_calls?.length,
    ) as ChatMessage;
    expect(owner.state?.toolCall?.['s1']?.status).toBe('success');
    expect(owner.state?.toolCall?.['s1']?.result).toBe('ok');
  });
});

describe('MessageEngine getMessages / setMessages', () => {
  it('getMessages returns a per-message shallow-isolated snapshot (not the live engine reference)', async () => {
    const connector = scriptedConnector([stopChunks('hi')]);
    const engine = createMessageEngine({ connector });
    await engine.sendMessage('hello');
    const snapshot = engine.getMessages();
    expect(snapshot.length).toBe(2);
    expect(snapshot.map((m) => m.role)).toEqual(['user', 'assistant']);
    // Array reference isolation: the returned array is NOT the live internal one.
    expect(snapshot).not.toBe(engine.getState().messages);
    // Per-message object reference isolation: top-level fields are copied, so
    // mutating a returned element does not write through to engine state.
    expect(snapshot[0]).not.toBe(engine.getState().messages[0]);

    // Write-through immunity — push onto the array AND mutate an element field.
    snapshot.push({ id: 'tampered', role: 'user', content: 'INJECTED' });
    (snapshot[0] as { content: string }).content = 'TAMPERED';
    const fresh = engine.getState().messages;
    expect(fresh.length).toBe(2);
    expect(fresh[0].content).toBe('hello');
    expect(fresh.some((m) => m.id === 'tampered')).toBe(false);

    // The snapshot is a point-in-time copy: a subsequent turn grows the engine
    // state but must NOT grow the previously captured snapshot (no live alias).
    const snapshotLenBeforeNextTurn = snapshot.length;
    await engine.sendMessage('again');
    expect(snapshot.length).toBe(snapshotLenBeforeNextTurn);
    expect(engine.getState().messages.length).toBeGreaterThan(snapshotLenBeforeNextTurn);
  });

  it('setMessages replaces the whole list and notifies subscribers', async () => {
    const connector = scriptedConnector([stopChunks('hi')]);
    const engine = createMessageEngine({ connector });
    await engine.sendMessage('hello');
    let notified = false;
    // setMessages is a full reset (messages + requestState); full-channel
    // subscribers are notified (this is the channel `useMessage` consumes).
    const unsub = engine.subscribe(() => {
      notified = true;
    });
    const replacement: ChatMessage[] = [{ id: 'only', role: 'user', content: 'replaced' }];
    engine.setMessages(replacement);
    expect(engine.getMessages()).toEqual(replacement);
    expect(notified).toBe(true);
    unsub();
  });

  it('setMessages is rejected while a turn is in-flight', async () => {
    let resolveStream: () => void;
    const gate = new Promise<void>((r) => {
      resolveStream = r;
    });
    const connector: AiConnector = {
      async stream() {
        async function* gen() {
          yield { delta: { content: 'x' } };
          await gate;
          yield { finishReason: 'stop' };
        }
        return gen();
      },
    };
    const engine = createMessageEngine({ connector });
    const turn = engine.sendMessage('go');
    await Promise.resolve();
    const before = engine.getMessages().length;
    engine.setMessages([{ id: 'z', role: 'user', content: 'blocked' }]);
    // No-op: list unchanged.
    expect(engine.getMessages().length).toBe(before);
    resolveStream!();
    await turn;
  });
});
