import React, { useEffect } from 'react';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, useCurrentActionScope, useScopeSelector } from '@nop-chaos/flux-react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { AiConnector, AiConnectorChunk, AiConnectorRequest } from './engine/types.js';
import { createStreamBasedAiConnector } from './adapters/ai-connector-factory.js';
import { aiRendererDefinitions } from './ai-renderer-definitions.js';

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

const buttonRenderer: RendererDefinition = {
  type: 'test-button',
  component: (props) => (
    <button type="button" data-testid={props.meta.testid ?? 'test-button'} onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? 'Button')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

/**
 * Probe that captures the current ActionScope on mount and reads back the
 * reactive `ai` host scope projection (`isProcessing` / `activeConversationId`).
 */
function AiScopeProbe() {
  const actionScope = useCurrentActionScope();
  const aiState = useScopeSelector<{ isProcessing?: boolean; activeConversationId?: string | null }>(
    (data) => ({
      isProcessing: (data as { isProcessing?: boolean }).isProcessing,
      activeConversationId: (data as { activeConversationId?: string | null }).activeConversationId,
    }),
  );
  useEffect(() => {
    capturedScopeHolder.current = actionScope;
  }, [actionScope]);
  return (
    <div data-testid="ai-scope-probe">
      <span data-testid="ai-probe-processing">{String(aiState.isProcessing ?? false)}</span>
      <span data-testid="ai-probe-active-id">{String(aiState.activeConversationId ?? '')}</span>
    </div>
  );
}

/** Holder for the last ActionScope observed by a mounted `ai-scope-probe` (test-only). */
const capturedScopeHolder: { current: import('@nop-chaos/flux-core').ActionScope | undefined } = {
  current: undefined,
};

export function getCapturedActionScope() {
  return capturedScopeHolder.current;
}

export function resetCapturedActionScope(): void {
  capturedScopeHolder.current = undefined;
}

export const aiScopeProbeRenderer: RendererDefinition = {
  type: 'ai-scope-probe',
  component: AiScopeProbe,
};

export function createAiSchemaRenderer(extra: RendererDefinition[] = []) {
  return createSchemaRenderer([
    pageRenderer,
    textRenderer,
    buttonRenderer,
    aiScopeProbeRenderer,
    ...extra,
    ...aiRendererDefinitions,
  ]);
}

export function mockStreamConnector(chunks: AiConnectorChunk[], delayMs = 0): AiConnector {
  const env: RendererEnv = {
    fetcher: (async () => ({ ok: true, status: 200, data: null })) as RendererEnv['fetcher'],
    notify: () => undefined,
    stream: async () => ({
      response: { ok: true, status: 200, headers: {} },
      chunks: (async function* gen() {
        for (const c of chunks) {
          if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
          yield c;
        }
      })(),
    }) as never,
  };
  return createStreamBasedAiConnector({
    env,
    buildRequest: (req: AiConnectorRequest) => ({
      url: 'mock://ai/chat',
      method: 'POST',
      data: { messages: req.messages, stream: true } as never,
    }),
  });
}

export function aiMockEnv(): RendererEnv {
  return {
    fetcher: (async () => ({ ok: true, status: 200, data: null })) as RendererEnv['fetcher'],
    notify: () => undefined,
    stream: async () => ({
      response: { ok: true, status: 200, headers: {} },
      chunks: (async function* empty() {})(),
    }) as never,
  };
}

export const aiFormulaCompiler = createFormulaCompiler();
