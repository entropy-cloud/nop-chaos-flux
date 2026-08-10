import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import {
  aiFormulaCompiler,
  aiMockEnv,
} from '../../ai-test-support.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import { createReactMessageAdapter } from '../../adapters/react-adapter.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ToolExecutor,
} from '../../engine/types.js';
import {
  buildExternalEngine,
  mockConnector,
  readCapturedProjectedMessages,
  replyChunks,
  SchemaRenderer,
  seedMessages,
} from './ai-chat-projection-test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ============================================================================
// FIND-06 (plan 2026-08-11-0008-1): P1-6's four rebuild triggers are all
// coarse-grained — two documented no-signal replacements still leave the
// `${messages}` projection stale:
//
//  - blind spot A: abort-mid-executor + strip-keeps-text. `abort()` flips
//    requestState synchronously → the terminal-crossed clone reads the
//    PRE-strip messages; the async executor settle then performs an in-place
//    EQUAL-LENGTH element replacement (`cleanDanglingAssistantAt` — same array
//    ref, same length) → no signal → the projection keeps the pre-strip ghost
//    tool_calls until the next turn boundary (possibly never).
//  - blind spot B: idle→processing session swap (switch-while-stream). The
//    `!isProcessing` gate short-circuits `idleMessageReplacement` while the
//    new session is mid-stream; `crossedBoundary` needs processing→idle and
//    `terminalCrossed` is false while processing → the projection shows the
//    previous session for the whole streaming duration.
//
// Split out of `ai-chat-projection.test.tsx` (check:oversized-code-files
// limit, 2026-08-11) following the `engine-invariants-p2.test.ts` precedent;
// both files share `ai-chat-projection-test-support.tsx`.
// ============================================================================

describe('ai-chat — FIND-06 blind spot A: abort-mid-executor strip refreshes the projection', () => {
  it('equal-length in-place strip (strip-keeps-text) removes ghost tool_calls from the projection', async () => {
    const toolCallChunks: AiConnectorChunk[] = [
      { delta: { content: 'analyzing' } },
      {
        delta: {
          tool_calls: [
            { index: 0, id: 'call_find06_a', type: 'function', function: { name: 'get_weather', arguments: '{}' } },
          ],
        },
      },
      { finishReason: 'tool_calls' },
    ];
    // Executor that stays suspended until the abort signal fires — the exact
    // abort-mid-executor window (the turn is already in 'calling-tools').
    const gatedExecutor: ToolExecutor = ({ signal }) =>
      new Promise<never>((_, reject) => {
        const onAbort = () => reject(new DOMException('aborted', 'AbortError'));
        if (signal.aborted) {
          reject(new DOMException('aborted', 'AbortError'));
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
      });
    const external = createMessageEngine({
      connector: mockConnector(toolCallChunks),
      adapter: createReactMessageAdapter(),
      toolExecutor: gatedExecutor,
    });

    render(
      <SchemaRenderer
        schemaUrl="test://ai/find06-strip"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-strip',
              engine: external as never,
              beforeMessages: { type: 'messages-probe' },
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    let turnP: Promise<void>;
    await act(async () => {
      turnP = external.sendMessage('abort-mid-exec');
      await new Promise((r) => setTimeout(r, 0));
    });
    // The tool round started — the executor is suspended, the assistant
    // carries its tool_calls (committed).
    await waitFor(() => {
      expect(external.getState().processingState).toBe('calling-tools');
    });

    // Abort: requestState flips synchronously (terminal-crossed clone reads
    // the PRE-strip ghost), then the executor settle lands the in-place strip.
    await act(async () => {
      await external.abort();
      await turnP!;
    });

    // Post-fix: the equal-length in-place replacement is caught by the
    // element-identity fingerprint (last-message tool_calls length) → the
    // projection rebuilds → no ghost tool_calls. Pre-fix: the terminal-boundary
    // clone keeps the pre-strip ghost forever (waitFor times out).
    await waitFor(() => {
      const assistants = readCapturedProjectedMessages()!.filter((m) => m.role === 'assistant');
      expect(assistants.length).toBe(1);
      expect(assistants[0].tool_calls ?? []).toHaveLength(0);
    });
    // The committed user message is still projected.
    expect(readCapturedProjectedMessages()!.some((m) => m.content === 'abort-mid-exec')).toBe(true);
  });
});

describe('ai-chat — FIND-06 blind spot B: switch-while-stream projects session B immediately', () => {
  it('swap to a background-streaming session B shows B data without waiting for completion', async () => {
    let resolveGate: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      resolveGate = r;
    });
    const streamingConnector: AiConnector = {
      async stream(_req: AiConnectorRequest) {
        async function* gen(): AsyncGenerator<AiConnectorChunk> {
          yield { delta: { content: 'b-partial' } };
          await gate;
          yield { finishReason: 'stop' };
        }
        void _req;
        return gen();
      },
    };
    const engineA = buildExternalEngine(mockConnector(replyChunks), seedMessages);
    const engineB = buildExternalEngine(streamingConnector);

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://ai/find06-swap-stream"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-swap-stream',
              engine: engineA as never,
              beforeMessages: { type: 'messages-probe' },
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(readCapturedProjectedMessages()).not.toBeNull();
    });
    // Session A is projected.
    expect(readCapturedProjectedMessages()!.some((m) => m.content === 'seed-hello')).toBe(true);

    // Kick off session B's stream so it is genuinely processing at the swap
    // instant (the documented switch-while-stream window).
    let turnP: Promise<void>;
    await act(async () => {
      turnP = engineB.sendMessage('b-stream');
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(engineB.getState().isProcessing).toBe(true);

    // Host swaps the engine to the streaming session B.
    rerender(
      <SchemaRenderer
        schemaUrl="test://ai/find06-swap-stream"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-swap-stream',
              engine: engineB as never,
              beforeMessages: { type: 'messages-probe' },
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    // Post-fix: the engine-identity swap clones unconditionally → the
    // projection shows B's session immediately (mid-stream). Pre-fix: the
    // `!isProcessing` gate keeps session A until B completes (waitFor times out).
    await waitFor(() => {
      expect(readCapturedProjectedMessages()!.some((m) => m.content === 'b-stream')).toBe(true);
    });
    expect(readCapturedProjectedMessages()!.some((m) => m.content === 'seed-hello')).toBe(false);

    resolveGate();
    await act(async () => {
      await turnP!;
    });
    engineA.clear();
    engineB.clear();
  });
});
