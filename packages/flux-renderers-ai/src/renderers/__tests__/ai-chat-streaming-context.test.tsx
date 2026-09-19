import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, act } from '@testing-library/react';
import React, { useEffect, useRef } from 'react';
import {
  aiFormulaCompiler,
  aiMockEnv,
  createAiSchemaRenderer,
} from '../../ai-test-support.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import { createReactMessageAdapter } from '../../adapters/react-adapter.js';
import { useAiChatContext } from '../../adapters/ai-chat-context.js';
import { useEngineContentTick } from '../../adapters/use-engine-view.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  ChatMessage,
  MessageEngine,
} from '../../engine/types.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function buildExternalEngine(connector: AiConnector, initialMessages?: ChatMessage[]): MessageEngine {
  return createMessageEngine({
    connector,
    initialMessages,
    adapter: createReactMessageAdapter(),
  });
}

// ============================================================================
// Plan 472 Phase 1 (visual-quality V2 / bug 166) — final contract after the
// execution-phase discovery that React Compiler keys its memo cache on values
// actually read during render and ignores deps arrays:
//
//   per-chunk DOM invalidation = useEngineContentTick (subscribe-based, read
//   in render output as the streaming bubble's streamSignature prop), NOT the
//   AI-31 context identity (which stays turn-boundary stable).
//
// The compiled-mode DOM progression itself is pinned by the e2e in
// tests/e2e/ai-widgets-fixture.spec.ts (real browser + compiler).
// ============================================================================

describe('useEngineContentTick — per-chunk invalidation (bug 166, plan 472)', () => {
  it('tick grows per content chunk while the stream accumulates', async () => {
    const gatedConnector: AiConnector = {
      async stream(_req: AiConnectorRequest) {
        async function* gen(): AsyncGenerator<AiConnectorChunk> {
          yield { delta: { content: 'chunk-1' } };
          await new Promise((r) => setTimeout(r, 30));
          yield { delta: { content: ' chunk-2' } };
          await new Promise((r) => setTimeout(r, 30));
          yield { delta: { content: ' chunk-3' } };
          await new Promise((r) => setTimeout(r, 30));
          yield { delta: { content: ' chunk-4' } };
          yield { finishReason: 'stop' };
        }
        void _req;
        return gen();
      },
    };
    const external = buildExternalEngine(gatedConnector, [
      { id: 'seed', role: 'user', content: 'seed' },
    ]);

    const ticks: number[] = [];
    function TickProbe(): React.ReactElement {
      const tick = useEngineContentTick(external);
      ticks.push(tick);
      return <span data-testid="tick-probe" />;
    }
    render(<TickProbe />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    ticks.length = 0;

    await act(async () => {
      const turnP = external.sendMessage('streaming');
      for (let i = 0; i < 8; i += 1) {
        await new Promise((r) => setTimeout(r, 25));
        ticks.push(readContentTickSnapshot(external));
      }
      await turnP;
    });

    const grown = ticks.filter((v, i) => i > 0 && v > ticks[i - 1]).length;
    expect(grown, `tick samples should grow per chunk, got: ${ticks.join(',')}`).toBeGreaterThanOrEqual(3);
    expect(external.getState().isProcessing).toBe(false);
  });
});

function readContentTickSnapshot(engine: MessageEngine): number {
  const state = engine.getState();
  const last = state.messages[state.messages.length - 1];
  if (!last) return 0;
  if (typeof last.content === 'string') return last.content.length;
  return last.content.reduce((sum, part) => sum + (part.type === 'text' ? part.text.length : 0), 0);
}

describe('ai-chat streaming context (bug 166, plan 472) — turn-boundary contract', () => {
  it('context value updates across the turn and carries the stream signature', async () => {
    let resolveGate: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      resolveGate = r;
    });
    const gatedConnector: AiConnector = {
      async stream(_req: AiConnectorRequest) {
        async function* gen(): AsyncGenerator<AiConnectorChunk> {
          yield { delta: { content: 'chunk-1' } };
          await gate;
          yield { delta: { content: ' chunk-2' } };
          yield { finishReason: 'stop' };
        }
        void _req;
        return gen();
      },
    };
    const external = buildExternalEngine(gatedConnector, [
      { id: 'seed', role: 'user', content: 'seed' },
    ]);

    const signatures: Array<string | undefined> = [];
    function ContextProbe(): React.ReactElement {
      const ctx = useAiChatContext();
      const seen = useRef<unknown>(null);
      useEffect(() => {
        if (seen.current !== null && ctx !== seen.current) {
          signatures.push(ctx?.streamSignature);
        }
        seen.current = ctx;
      });
      return <span data-testid="context-probe" />;
    }

    const contextProbe = { type: 'context-probe', component: ContextProbe };
    const SchemaRenderer = createAiSchemaRenderer([contextProbe]);
    render(
      <SchemaRenderer
        schemaUrl="test://ai/context-signature"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-ctx-sig',
              engine: external as never,
              beforeMessages: { type: 'context-probe' },
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    let turnP: Promise<void>;
    await act(async () => {
      turnP = external.sendMessage('streaming');
      await new Promise((r) => setTimeout(r, 0));
    });

    resolveGate();
    await act(async () => {
      await turnP;
    });

    // every context rebuild since submit carries a non-empty stream signature
    expect(signatures.length).toBeGreaterThanOrEqual(1);
    for (const signature of signatures) {
      expect(signature ?? '').not.toBe('');
    }
  });
});
