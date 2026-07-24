import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, act } from '@testing-library/react';
import React, { useEffect } from 'react';
import { useScopeSelector } from '@nop-chaos/flux-react';
import {
  aiFormulaCompiler,
  aiMockEnv,
  createAiSchemaRenderer,
} from '../../ai-test-support.js';
import { createMessageEngine } from '../../engine/create-engine.js';
import { createReactMessageAdapter } from '../../adapters/react-adapter.js';
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
// P2 React-19 lifecycle stabilization (FP family from 2151 audit batch):
// Before the fix `ai-chat` rebuilt `componentHandle`, `actionProvider`, and
// `hostScopeData` on every render. Each streaming chunk therefore:
//   - re-fired the componentHandle register/unregister effect
//   - re-subscribed the `ai` ActionScope namespace
//   - fired a host-scope `scope.replace` (useHostScope useLayoutEffect)
//
// This file observes the user-visible signal: the descendant-visible host
// scope projection. `useHostScope` only re-fires `scope.replace` when its
// `scopeData` argument identity changes (its useLayoutEffect dep). After the
// memoization, streaming chunks must NOT change the projected messages ref
// identity — the projection is gated to turn boundaries (P1#2 baseline).
//
// The actionProvider / componentHandle identity guarantee is structurally
// enforced by useMemo + exhaustive-deps lint, and the existing ai-chat-subscribe
// / ai-chat-projection tests already cover "no per-chunk re-subscribe" via
// the requestState subscription effect. This file adds the hostScopeData
// stability assertion.
// ============================================================================

let projectedMessagesRef: ChatMessage[] | null = null;
let projectedMessagesRefChangeCount = 0;

function MessagesRefProbe(): React.ReactElement {
  const msgs = useScopeSelector<ChatMessage[]>((data) => (data as { messages?: ChatMessage[] }).messages ?? []);
  useEffect(() => {
    if (projectedMessagesRef !== msgs) {
      projectedMessagesRef = msgs;
      projectedMessagesRefChangeCount += 1;
    }
  });
  return <span data-testid="messages-ref-probe" />;
}

const messagesRefProbe = {
  type: 'messages-ref-probe',
  component: MessagesRefProbe,
};

const SchemaRenderer = createAiSchemaRenderer([messagesRefProbe]);

describe('ai-chat — P2 hostScopeData memoization (no per-chunk scope.replace)', () => {
  it('hostScopeData identity stays stable across streaming chunks', async () => {
    let resolveGate: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      resolveGate = r;
    });
    const gatedConnector: AiConnector = {
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
    const external = buildExternalEngine(gatedConnector, [
      { id: 'seed', role: 'user', content: 'seed' },
    ]);

    projectedMessagesRef = null;
    projectedMessagesRefChangeCount = 0;
    render(
      <SchemaRenderer
        schemaUrl="test://ai/lifecycle-stable"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-life',
              engine: external as never,
              beforeMessages: { type: 'messages-ref-probe' },
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    // Wait for the probe to capture the initial projection.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(projectedMessagesRef).not.toBeNull();
    const initialChangeCount = projectedMessagesRefChangeCount;

    // Kick off a streaming turn and let several chunks flow.
    let turnP: Promise<void>;
    await act(async () => {
      turnP = external.sendMessage('streaming');
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
    });

    // Mid-stream: still processing, chunks have flowed.
    expect(external.getState().isProcessing).toBe(true);

    // The hostScopeData identity was stable across chunks → MessagesRefProbe
    // did not get a new ref. (Before the fix it would have changed per chunk
    // because the inline `hostScopeData = { ... }` literal was a fresh object
    // every render, firing scope.replace on every chunk.)
    expect(projectedMessagesRefChangeCount).toBe(initialChangeCount);

    resolveGate();
    await act(async () => {
      await turnP!;
    });

    // After turn boundary, the projection rebuilds once (turn-boundary clone
    // fires, ref changes once).
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(projectedMessagesRefChangeCount).toBe(initialChangeCount + 1);
  });
});
