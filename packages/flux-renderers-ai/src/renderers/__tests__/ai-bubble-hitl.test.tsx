import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import type { ActionScope, FluxActionEvent } from '@nop-chaos/flux-core';
import { createActionScope } from '@nop-chaos/flux-runtime';
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
  ChatToolCall,
  MessageEngine,
} from '../../engine/types.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  resetCapturedApprovals();
});

/**
 * FIND-01 (2026-08-11, plan 2026-08-11-0008-1): capture harness that observes
 * `onApproval` dispatch through the REAL compiled pipeline — a registered
 * ActionScope provider (schema → `RendererDefinition.fields` → `eventPlans` →
 * `props.events.onApproval` → runtime dispatch → provider.invoke). No
 * `{ ...props.events, onApproval: spy }` injection: the tests below only
 * declare `onApproval` in the schema and observe the dispatch side.
 */
let capturedApprovals: FluxActionEvent[] = [];
function resetCapturedApprovals(): void {
  capturedApprovals = [];
}

function createCaptureScope(): ActionScope {
  const scope = createActionScope({ id: 'hitl-capture-scope' });
  scope.registerNamespace('capture', {
    kind: 'host',
    invoke: (_method, _payload, ctx) => {
      capturedApprovals.push(ctx.event as FluxActionEvent);
      return { ok: true };
    },
  });
  return scope;
}

function mockConnector(chunks: AiConnectorChunk[]): AiConnector {
  return {
    async stream(_req: AiConnectorRequest) {
      async function* gen() {
        for (const c of chunks) yield c;
      }
      void _req;
      return gen();
    },
  };
}

const replyChunks: AiConnectorChunk[] = [
  { delta: { content: 'Reply' } },
  { finishReason: 'stop' },
];

function buildExternalEngine(connector: AiConnector, initialMessages?: ChatMessage[]): MessageEngine {
  return createMessageEngine({
    connector,
    initialMessages,
    adapter: createReactMessageAdapter(),
  });
}

const toolCall: ChatToolCall = {
  index: 0,
  id: 'call_hitl',
  type: 'function',
  function: { name: 'get_weather', arguments: '{"city":"SF"}' },
};

const pendingHitlMessage: ChatMessage = {
  id: 'assistant-hitl',
  role: 'assistant',
  content: '',
  tool_calls: [toolCall],
  state: { toolCall: { call_hitl: { status: 'running', approval: 'pending' } } },
};

const SchemaRenderer = createAiSchemaRenderer();

// ============================================================================
// multi-audit FIND-01 (plan 2026-08-11-0008-1): `onApproval` was declared in
// the schemas + consumed by the renderers but NEVER registered in
// `RendererDefinition.fields` — `classifyField` put it into `kind:'prop'`, so
// `props.events.onApproval` was permanently `undefined`. The P2-4 regression
// test masked this by injecting the handler into `props.events` via a spy
// wrapper (fake-green: the test schema did not even contain `onApproval`).
// These tests assert dispatch through the REAL compiled pipeline: schema
// declares `onApproval`, the fields registration decides whether
// `props.events.onApproval` exists, and the ActionScope provider observes the
// dispatched payload.
// ============================================================================

describe('ai-chat bubble path — HITL approval via real compiled pipeline (FIND-01)', () => {
  it('schema-declared onApproval is compiled into props.events and dispatches approve/reject', async () => {
    const captureScope = createCaptureScope();
    const external = buildExternalEngine(mockConnector(replyChunks), [pendingHitlMessage]);

    render(
      <SchemaRenderer
        schemaUrl="test://ai/bubble-hitl"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-hitl',
              engine: external as never,
              onApproval: { action: 'capture:approval' },
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
        actionScope={captureScope}
      />,
    );

    // The pending tool card renders inside the bubble with visible actions.
    const approve = document.querySelector(
      '[data-slot="ai-tool-call-approve"]',
    ) as HTMLButtonElement | null;
    const reject = document.querySelector(
      '[data-slot="ai-tool-call-reject"]',
    ) as HTMLButtonElement | null;
    await waitFor(() => {
      expect(approve).not.toBeNull();
      expect(reject).not.toBeNull();
    });

    // The bubble path is context-wired (buttons enabled even pre-fix); the
    // FIND-01 signal is the DISPATCH: pre-fix `props.events.onApproval` is
    // undefined → `eventsRef.current.onApproval?.()` is a silent no-op →
    // `capturedApprovals` stays empty forever (the fake-green spy masked this).
    await act(async () => {
      fireEvent.click(approve!);
    });
    expect(capturedApprovals).toHaveLength(1);
    expect(capturedApprovals[0]).toMatchObject({ type: 'ai:tool-call-approval', action: 'approve' });

    await act(async () => {
      fireEvent.click(reject!);
    });
    expect(capturedApprovals).toHaveLength(2);
    expect(capturedApprovals[1]).toMatchObject({ type: 'ai:tool-call-approval', action: 'reject' });
  });
});

describe('standalone ai-bubble — HITL approval via real compiled pipeline (FIND-01)', () => {
  it('schema-declared onApproval reaches props.events: buttons enabled and dispatch fires', async () => {
    const captureScope = createCaptureScope();

    render(
      <SchemaRenderer
        schemaUrl="test://ai/bubble-hitl-standalone"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-bubble',
              testid: 'bubble-hitl-standalone',
              message: pendingHitlMessage as never,
              onApproval: { action: 'capture:approval' },
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
        actionScope={captureScope}
      />,
    );

    const approve = document.querySelector(
      '[data-slot="ai-tool-call-approve"]',
    ) as HTMLButtonElement | null;
    const reject = document.querySelector(
      '[data-slot="ai-tool-call-reject"]',
    ) as HTMLButtonElement | null;
    await waitFor(() => {
      expect(approve).not.toBeNull();
      expect(reject).not.toBeNull();
    });

    // Pre-fix: `props.events.onApproval === undefined` → the `hitl-no-handler`
    // guard disables both buttons (dead path). Post-fix: the compiled event
    // exists → buttons are actionable.
    expect(approve!.disabled).toBe(false);
    expect(reject!.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(approve!);
    });
    expect(capturedApprovals).toHaveLength(1);
    expect(capturedApprovals[0]).toMatchObject({ type: 'ai:tool-call-approval', action: 'approve' });

    await act(async () => {
      fireEvent.click(reject!);
    });
    expect(capturedApprovals).toHaveLength(2);
    expect(capturedApprovals[1]).toMatchObject({ type: 'ai:tool-call-approval', action: 'reject' });
  });
});
