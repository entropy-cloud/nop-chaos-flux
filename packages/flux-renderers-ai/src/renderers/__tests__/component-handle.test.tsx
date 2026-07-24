import { afterEach, describe, it, expect } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import {
  aiFormulaCompiler,
  aiMockEnv,
  createAiSchemaRenderer,
  mockStreamConnector,
} from '../../ai-test-support.js';
import type { AiConnectorChunk } from '../../engine/types.js';

const SchemaRenderer = createAiSchemaRenderer();

afterEach(() => {
  cleanup();
});

const okChunks: AiConnectorChunk[] = [
  { delta: { content: 'Hi' } },
  { finishReason: 'stop' },
];

describe('ai-chat Layer C ComponentHandle (registration lifecycle + dispatch)', () => {
  it('registers a component handle on mount and the handle is resolvable by componentId', async () => {
    const connector = mockStreamConnector(okChunks);
    let registry: import('@nop-chaos/flux-core').ComponentHandleRegistry | null = null;

    render(
      <SchemaRenderer
        schemaUrl="test://ai/handle-register"
        schema={{
          type: 'page',
          body: [{ type: 'ai-chat', connector: connector as never, componentId: 'my-chat' }],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
        onComponentRegistryChange={(reg) => {
          registry = reg;
        }}
      />,
    );

    await waitFor(() => {
      expect(registry).not.toBeNull();
    });

    await waitFor(() => {
      const handle = registry!.resolve({ componentId: 'my-chat' });
      expect(handle).toBeDefined();
      expect(handle!.id).toBe('my-chat');
      expect(handle!.capabilities.hasMethod?.('sendMessage')).toBe(true);
      expect(handle!.capabilities.hasMethod?.('getMessages')).toBe(true);
      expect(handle!.capabilities.listMethods?.()).toContain('setMessages');
    });
  });

  it('unregisters the component handle on unmount (resolve returns undefined after unmount)', async () => {
    const { createComponentHandleRegistry } = await import('@nop-chaos/flux-runtime');
    const connector = mockStreamConnector(okChunks);
    const registry = createComponentHandleRegistry({ id: 'ai-lifecycle-test' });

    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://ai/handle-unregister"
        schema={{
          type: 'page',
          body: [{ type: 'ai-chat', connector: connector as never, componentId: 'chat-a' }],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
        componentRegistry={registry}
      />,
    );

    // Wait for the handle to be registered and resolvable.
    await waitFor(() => {
      const handle = registry.resolve({ componentId: 'chat-a' });
      expect(handle).toBeDefined();
      expect(handle!.id).toBe('chat-a');
    });

    unmount();

    // After unmount, the real registry should no longer resolve the handle.
    expect(registry.resolve({ componentId: 'chat-a' })).toBeUndefined();
  });

  it('component:sendMessage action routes through the registry and reaches the engine', async () => {
    const connector = mockStreamConnector(okChunks);

    render(
      <SchemaRenderer
        schemaUrl="test://ai/component-dispatch"
        schema={{
          type: 'page',
          body: [
            {
              type: 'ai-chat',
              testid: 'chat-cmpt',
              connector: connector as never,
              componentId: 'target-chat',
              beforeMessages: {
                type: 'test-button',
                testid: 'component-send',
                label: 'Send via component',
                onClick: {
                  action: 'component:sendMessage',
                  componentId: 'target-chat',
                  args: { text: 'via-component-handle' },
                },
              },
            },
          ],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
      />,
    );

    const button = document.querySelector('[data-testid="component-send"]') as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    await act(async () => {
      button!.click();
    });

    await waitFor(() => {
      const userBubble = document.querySelector('[data-slot="ai-bubble"][data-role="user"]');
      expect(userBubble?.textContent).toContain('via-component-handle');
    });
  });
});
