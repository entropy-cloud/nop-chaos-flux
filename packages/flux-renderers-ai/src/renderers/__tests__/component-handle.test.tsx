import { afterEach, describe, it, expect } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import React from 'react';
import { ComponentRegistryContext } from '@nop-chaos/flux-react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import {
  aiFormulaCompiler,
  aiMockEnv,
  createAiSchemaRenderer,
  mockStreamConnector,
} from '../../ai-test-support.js';
import { AiChatRenderer } from '../ai-chat.js';
import type { AiChatSchema } from '../../schemas.js';
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

// ============================================================================
// Failure Path `component-handle-no-registry` (ai-chat.tsx effect guard):
// when `useCurrentComponentRegistry()` returns null the registration effect
// must SKIP silently — no throw, no `register` call. The SchemaRenderer always
// provides a registry, so this is exercised by overriding the registry
// context to `undefined` for the chat subtree only.
// ============================================================================

function NoRegistryAiChat(props: RendererComponentProps<AiChatSchema>): React.ReactElement {
  const Chat = AiChatRenderer as unknown as React.ComponentType<RendererComponentProps<AiChatSchema>>;
  return (
    <ComponentRegistryContext.Provider value={undefined}>
      <Chat {...props} />
    </ComponentRegistryContext.Provider>
  );
}

describe('ai-chat Layer C — component-handle-no-registry skip', () => {
  it('renders without throwing and does NOT register a handle when no registry is in context', async () => {
    const noRegistryChat = { type: 'no-reg-ai-chat', component: NoRegistryAiChat };
    const Renderer = createAiSchemaRenderer([noRegistryChat]);
    const connector = mockStreamConnector(okChunks);
    let rootRegistry: import('@nop-chaos/flux-core').ComponentHandleRegistry | null = null;

    render(
      <Renderer
        schemaUrl="test://ai/no-registry"
        schema={{
          type: 'page',
          body: [{ type: 'no-reg-ai-chat', connector: connector as never, componentId: 'orphan-chat' }],
        }}
        env={aiMockEnv()}
        formulaCompiler={aiFormulaCompiler}
        onComponentRegistryChange={(reg) => {
          rootRegistry = reg;
        }}
      />,
    );

    // The chat still mounts (the skip is silent, never a throw).
    await waitFor(() => {
      expect(document.querySelector('.nop-ai-chat')).not.toBeNull();
    });
    // The root registry exists (SchemaRenderer always creates one)…
    await waitFor(() => {
      expect(rootRegistry).not.toBeNull();
    });
    // …but the chat never registered its handle against it (skip path took
    // effect: resolve returns undefined).
    expect(rootRegistry!.resolve({ componentId: 'orphan-chat' })).toBeUndefined();
  });
});
