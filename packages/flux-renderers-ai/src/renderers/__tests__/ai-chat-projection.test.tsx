import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import {
  aiFormulaCompiler,
  aiMockEnv,
} from '../../ai-test-support.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
} from '../../engine/types.js';
import {
  buildExternalEngine,
  mockConnector,
  readCapturedOnComplete,
  readCapturedProjectedMessages,
  replyChunks,
  resetCapturedOnComplete,
  resetCapturedProjectedMessages,
  SchemaRenderer,
  seedMessages,
} from './ai-chat-projection-test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  resetCapturedProjectedMessages();
  resetCapturedOnComplete();
});

describe('ai-chat — Decision-A projection (AI-02): hostScopeData.messages is a snapshot', () => {
  it('does NOT leak the engine internal messages array reference to descendants', async () => {
    const external = buildExternalEngine(mockConnector(replyChunks), seedMessages);

    render(
      <SchemaRenderer
        schemaUrl="test://ai/projection-ref"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-proj',
              engine: external as never,
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

    const engineMessages = external.getState().messages;
    // After the fix the projection must be a distinct array reference
    // (snapshot), not the engine's internal array.
    expect(readCapturedProjectedMessages()).not.toBe(engineMessages);
  });

  it('mutating the projected messages array does NOT pollute the engine internal state', async () => {
    const external = buildExternalEngine(mockConnector(replyChunks), seedMessages);

    render(
      <SchemaRenderer
        schemaUrl="test://ai/projection-mutation"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-proj-mut',
              engine: external as never,
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

    const engineBefore = external.getState().messages;
    const engineBeforeLen = engineBefore.length;
    const engineBeforeContent = engineBefore[0].content;

    // Descendant/host mutates the captured projection in-place: push a fake
    // message + mutate an existing message's content. This is exactly the
    // Decision-A hazard ("host 持有 engine 引用会污染域内部").
    readCapturedProjectedMessages()!.push({ id: 'tampered', role: 'user', content: 'INJECTED' });
    (readCapturedProjectedMessages()![0] as { content: string }).content = 'TAMPERED';

    const engineAfter = external.getState().messages;
    expect(engineAfter.length).toBe(engineBeforeLen);
    expect(engineAfter[0].content).toBe(engineBeforeContent);
    expect(engineAfter.some((m) => m.id === 'tampered')).toBe(false);
  });
});

describe('ai-chat — Decision-A event handoff (AI-09): onResponseComplete message is a snapshot', () => {
  it('delivers a message snapshot that is not the live engine reference', async () => {
    const external = buildExternalEngine(mockConnector(replyChunks));

    render(
      <SchemaRenderer
        schemaUrl="test://ai/oncomplete-snapshot"
        schema={{
          type: 'page',
          body: [
            {
              type: 'spy-ai-chat',
              testid: 'chat-complete',
              engine: external as never,
              submitType: 'enter',
              placeholder: 'Type…',
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    const textarea = document.querySelector(
      '[data-slot="ai-sender-input"] textarea',
    ) as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'turn-1' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(readCapturedOnComplete()).toHaveLength(1);
    });

    const delivered = readCapturedOnComplete()[0].message;
    const engineLast = external.getState().messages[external.getState().messages.length - 1];
    // Decision-A: the delivered message must be a distinct object (snapshot),
    // not the live engine reference, while carrying equal content.
    expect(delivered).not.toBe(engineLast);
    expect(delivered.content).toBe(engineLast.content);
  });

  it('a captured onComplete message is not mutated by a subsequent turn', async () => {
    const external = buildExternalEngine(mockConnector(replyChunks));

    render(
      <SchemaRenderer
        schemaUrl="test://ai/oncomplete-stable"
        schema={{
          type: 'page',
          body: [
            {
              type: 'spy-ai-chat',
              testid: 'chat-stable',
              engine: external as never,
              submitType: 'enter',
              placeholder: 'Type…',
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    const textarea = document.querySelector(
      '[data-slot="ai-sender-input"] textarea',
    ) as HTMLTextAreaElement;

    // Turn 1
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'turn-1' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });
    });
    await waitFor(() => {
      expect(readCapturedOnComplete()).toHaveLength(1);
    });

    // Host tampers with the captured snapshot.
    const capturedFirst = readCapturedOnComplete()[0].message;
    (capturedFirst as { content: string }).content = 'HOST-TAMPERED';

    // Turn 2 (new assistant reply)
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'turn-2' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });
    });
    await waitFor(() => {
      expect(readCapturedOnComplete()).toHaveLength(2);
    });

    // The engine internal messages must not contain the tampered content.
    const engineMessages = external.getState().messages;
    expect(engineMessages.some((m) => m.content === 'HOST-TAMPERED')).toBe(false);
  });
});

// Silence the unused-env warning when aiMockEnv is not used in a sub-suite.
void aiMockEnv as unknown as RendererEnv;

/**
 * Phase 4 — hostScopeData clone frequency gated to turn boundaries (P1#2).
 *
 * Observes the descendant-visible `messages` array ref identity (via the
 * existing MessagesProbe, which captures the latest ref it rendered with).
 * The clone must NOT rebuild per streaming chunk — only at the turn boundary
 * (requestState terminal / isProcessing flip). We do not spy the private
 * `cloneMessages`; instead we observe the downstream ref identity, which is
 * the user-visible signal.
 */
describe('ai-chat — P1#2 hostScopeData clone gated to turn boundaries', () => {
  it('projected messages ref stays stable across streaming chunks and updates only at the turn boundary', async () => {
    let resolveGate: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      resolveGate = r;
    });
    const gatedMultiChunkConnector: AiConnector = {
      async stream(_req: AiConnectorRequest) {
        async function* gen(): AsyncGenerator<AiConnectorChunk> {
          yield { delta: { content: 'chunk-1' } };
          yield { delta: { content: ' chunk-2' } };
          yield { delta: { content: ' chunk-3' } };
          await gate;
          yield { finishReason: 'stop' };
        }
        void _req;
        return gen();
      },
    };
    const external = buildExternalEngine(gatedMultiChunkConnector, seedMessages);

    render(
      <SchemaRenderer
        schemaUrl="test://ai/projection-gating"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-gating',
              engine: external as never,
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
    const refAtIdle = readCapturedProjectedMessages()!;
    // Decision-A: the idle projection is already a snapshot, not the live array.
    expect(refAtIdle).not.toBe(external.getState().messages);

    // Kick off a streaming turn; let several chunks flow while the stream is
    // still gated (mid-stream).
    let turnP: Promise<void>;
    await act(async () => {
      turnP = external.sendMessage('stream-me');
      // Drain microtasks so the chunks emit + AiChat re-renders per chunk.
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    });

    // INVARIANT: the projected messages ref did NOT change during streaming —
    // the clone is gated to the turn boundary, so the probe did not re-render
    // per chunk. Before the fix `cloneMessages(messages)` ran every render,
    // producing a fresh ref per chunk; the probe would then see a new ref here.
    expect(readCapturedProjectedMessages()).toBe(refAtIdle);

    // The engine is genuinely mid-stream (still processing, gated).
    expect(external.getState().isProcessing).toBe(true);

    // Complete the turn → turn boundary → the projection rebuilds with a new ref.
    resolveGate();
    await act(async () => {
      await turnP!;
    });
    await waitFor(() => {
      expect(readCapturedProjectedMessages()).not.toBe(refAtIdle);
    });

    // The rebuilt projection reflects the completed turn's message set.
    expect(readCapturedProjectedMessages()!.length).toBe(external.getState().messages.length);
    expect(readCapturedProjectedMessages()).not.toBe(external.getState().messages);
  });
});

describe('ai-chat — P1-6 (plan 2026-08-10-1301-2) projection rebuilds on engine replacement', () => {
  const engineA = buildExternalEngine(mockConnector(replyChunks), seedMessages);
  const engineB = buildExternalEngine(mockConnector(replyChunks), [
    { id: 'b-user', role: 'user', content: 'session-b-hello' },
    { id: 'b-assistant', role: 'assistant', content: 'session-b-reply' },
  ]);

  afterEach(() => {
    engineA.clear();
    engineB.clear();
  });

  it('engine swap (double idle) refreshes the projected messages', async () => {
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://ai/p1-6-swap"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-swap',
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
    // Session A projection visible.
    expect(readCapturedProjectedMessages()!.some((m) => m.content === 'seed-hello')).toBe(true);
    expect(readCapturedProjectedMessages()!.some((m) => m.content === 'session-b-hello')).toBe(false);

    // Host swaps the engine to session B while BOTH engines are idle.
    rerender(
      <SchemaRenderer
        schemaUrl="test://ai/p1-6-swap"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-swap',
              engine: engineB as never,
              beforeMessages: { type: 'messages-probe' },
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(readCapturedProjectedMessages()!.some((m) => m.content === 'session-b-hello')).toBe(true);
    });
    // Session A must no longer appear in the projection (fresh session data).
    expect(readCapturedProjectedMessages()!.some((m) => m.content === 'seed-hello')).toBe(false);
  });

  it('clear() on the same engine refreshes the projected messages', async () => {
    const external = buildExternalEngine(mockConnector(replyChunks), seedMessages);
    render(
      <SchemaRenderer
        schemaUrl="test://ai/p1-6-clear"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-clear',
              engine: external as never,
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
    expect(readCapturedProjectedMessages()!.length).toBe(2);

    await act(async () => {
      external.clear();
    });

    await waitFor(() => {
      expect(readCapturedProjectedMessages()!.length).toBe(0);
    });
  });

  it('setMessages hydration (rehydrate) refreshes the projected messages', async () => {
    const external = buildExternalEngine(mockConnector(replyChunks), seedMessages);
    render(
      <SchemaRenderer
        schemaUrl="test://ai/p1-6-hydrate"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-hydrate',
              engine: external as never,
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
    expect(readCapturedProjectedMessages()!.some((m) => m.content === 'seed-hello')).toBe(true);

    const hydrated: ChatMessage[] = [
      { id: 'h1', role: 'user', content: 'hydrated-q' },
      { id: 'h2', role: 'assistant', content: 'hydrated-a' },
    ];
    await act(async () => {
      external.setMessages(hydrated);
    });

    await waitFor(() => {
      expect(readCapturedProjectedMessages()!.some((m) => m.content === 'hydrated-q')).toBe(true);
    });
    expect(readCapturedProjectedMessages()!.some((m) => m.content === 'seed-hello')).toBe(false);
  });

  it('P2-14 same-surface window: vacuous abort residue does not enter the projection', async () => {
    // Zero-chunk connector: the assistant placeholder stays empty (vacuous
    // residue) until abort — the P2-14 ghost shape. Abort-aware: rejects with
    // AbortError when the engine signal fires (the K2 `.return()` fallback
    // cannot preempt a generator stuck inside its own await).
    const gated: AiConnector = {
      async stream(req: AiConnectorRequest) {
        const { signal } = req;
        const abortPromise = new Promise<never>((_, reject) => {
          const onAbort = () => reject(new DOMException('aborted', 'AbortError'));
          if (signal.aborted) {
            reject(new DOMException('aborted', 'AbortError'));
            return;
          }
          signal.addEventListener('abort', onAbort, { once: true });
        });
        async function* gen(): AsyncGenerator<AiConnectorChunk> {
          // The race never resolves in this test — abort rejects it.
          await Promise.race([new Promise<void>(() => {}), abortPromise]);
          // Unreachable in this test (the abort rejection wins the race).
          yield { finishReason: 'stop' };
        }
        return gen();
      },
    };
    const external = buildExternalEngine(gated);
    render(
      <SchemaRenderer
        schemaUrl="test://ai/p1-6-abort-ghost"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-abort-ghost',
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
      turnP = external.sendMessage('abort-me');
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(external.getState().isProcessing).toBe(true);

    await act(async () => {
      await external.abort();
      await turnP!;
    });

    // Turn ended: the projection rebuilds at the terminal boundary AND again
    // when the engine drops the vacuous residue — the ghost placeholder must
    // never remain in the projected snapshot.
    await waitFor(() => {
      const ghost = readCapturedProjectedMessages()!.filter((m) => m.role === 'assistant').length;
      expect(ghost).toBe(0);
    });
    // The committed user message is still projected.
    expect(readCapturedProjectedMessages()!.some((m) => m.content === 'abort-me')).toBe(true);
  });
});
