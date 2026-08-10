import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { ActionContext, ActionScope, RendererEnv } from '@nop-chaos/flux-core';
import { createComponentHandleRegistry } from '@nop-chaos/flux-runtime';
import {
  aiFormulaCompiler,
  aiMockEnv,
  createAiSchemaRenderer,
} from '../../ai-test-support.js';
import { createStreamBasedAiConnector } from '../../adapters/ai-connector-factory.js';

const SchemaRenderer = createAiSchemaRenderer();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Build a connector whose `env.stream` is spied so a ghost send during the
 * engineNullSwitch window is observable (the hidden self-engine would call
 * the connector; the fixed null-safe handle/provider must NOT).
 */
function spyConnector() {
  const env: RendererEnv = aiMockEnv();
  const streamSpy = vi.spyOn(env, 'stream');
  const connector = createStreamBasedAiConnector({
    env,
    buildRequest: (req) => ({
      url: 'mock://ai/chat',
      method: 'POST',
      data: { messages: req.messages, stream: true } as never,
    }),
  });
  return { connector, streamSpy };
}

// ============================================================================
// multi-audit P2-8 (plan 2026-08-10-1606-2): during the engineNullSwitch
// window (`engine` prop resolved to null) `useMessage` falls back to the
// self-built engine while the UI renders emptyState. The Layer C component
// handle and the Layer B `ai` namespace provider were bound to that hidden
// self-engine — commands dispatched in the window wrote ghost messages that
// vanished when the external engine arrived. Both binding surfaces must be
// null-safe: dispatch during the window returns an explicit rejection and
// never touches the hidden self-engine.
// ============================================================================

describe('ai-chat — engineNullSwitch window: no ghost writes via component handle', () => {
  it('component:sendMessage during the null window returns ok:false and never reaches the connector', async () => {
    const { connector, streamSpy } = spyConnector();
    const registry = createComponentHandleRegistry({ id: 'null-switch-test' });

    render(
      <SchemaRenderer
        schemaUrl="test://ai/null-switch-handle"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-null-switch',
              engine: null as never,
              connector: connector as never,
              componentId: 'null-chat',
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
        componentRegistry={registry}
      />,
    );

    // The null window renders the emptyState.
    await waitFor(() => {
      const root = document.querySelector('.nop-ai-chat');
      expect(root?.getAttribute('data-state')).toBe('empty');
    });

    // The handle is still registered (hosts can resolve it)…
    await waitFor(() => {
      expect(registry.resolve({ componentId: 'null-chat' })).toBeDefined();
    });
    const handle = registry.resolve({ componentId: 'null-chat' })!;

    // …but dispatch must be an explicit rejection, never a ghost write.
    const result = await handle.capabilities.invoke(
      'sendMessage',
      { text: 'ghost-during-switch' },
      {} as never,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(streamSpy).not.toHaveBeenCalled();
  });
});

describe('ai-chat — engineNullSwitch window: no ghost writes via ai namespace', () => {
  it('ai:send during the null window returns ok:false and never reaches the connector', async () => {
    const { connector, streamSpy } = spyConnector();
    let observed: ActionScope | null = null;

    render(
      <SchemaRenderer
        schemaUrl="test://ai/null-switch-namespace"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-null-switch-ns',
              engine: null as never,
              connector: connector as never,
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
        onActionScopeChange={(scope) => {
          observed = scope;
        }}
      />,
    );

    await waitFor(() => {
      expect(observed?.listNamespaces()).toContain('ai');
    });

    const resolved = observed!.resolve('ai:send');
    expect(resolved).toBeDefined();
    const result = await resolved!.provider.invoke('send', { text: 'ghost-ns' }, {} as ActionContext);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(streamSpy).not.toHaveBeenCalled();
  });
});
