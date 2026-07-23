import { useMemo } from 'react';
import { Button, Toaster } from '@nop-chaos/ui';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerAiRenderers, useConversation } from '@nop-chaos/flux-renderers-ai';
import { createMockAiConnector, createMockAiEnv, createAiImportLoader } from '../ai/mock-ai-env.js';
import { createOpenAICompatibleConnector, resolveOpenAIConfigFromEnv } from '../ai/openai-connector.js';
import exampleSchema from '../ai/ai-conversations-example.json';

interface Props {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerContentRenderers(registry);
registerLayoutRenderers(registry);
registerAiRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

/**
 * P1 demo: ai-conversations sidebar + ai-chat with the `ai` namespace wired
 * to a `useConversation` controller. When VITE_OPENAI_API_KEY /
 * VITE_DEEPSEEK_API_KEY is set, the real API is used; otherwise the mock
 * connector runs so the demo works offline.
 */
export function AiConversationsDemoPage({ onBack }: Props) {
  const baseEnv = useMemo(() => createMockAiEnv(), []);
  const realConfig = useMemo(() => resolveOpenAIConfigFromEnv(), []);
  const connector = useMemo(
    () => (realConfig ? createOpenAICompatibleConnector(baseEnv, realConfig) : createMockAiConnector(baseEnv)),
    [baseEnv, realConfig],
  );
  const { importLoader, resolveImportUrl } = useMemo(() => createAiImportLoader(connector), [connector]);

  const decoratedEnv = useMemo(
    () => ({ ...baseEnv, importLoader, resolveImportUrl }),
    [baseEnv, importLoader, resolveImportUrl],
  );

  // Host-side conversation manager (engine.md §8.6). The controller is bound
  // to ai-chat through the schema expression `${$ai.controller}`.
  const conversations = useConversation({ connector });

  const pageData = useMemo(
    () => ({
      conversations: conversations.conversations,
      activeConversationId: conversations.activeConversationId,
      // Expose the controller through the page scope so the schema can bind it
      // via `conversationController: "${controller}"` (relative scope read).
      controller: conversations.controller,
    }),
    [conversations.conversations, conversations.activeConversationId, conversations.controller],
  );

  return (
    <div className="nop-theme-root min-h-screen flex flex-col">
      <Toaster />
      <header className="flex items-center gap-3 p-3 border-b bg-background">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <h1 className="text-lg font-semibold">
          AI Conversations — P1 {realConfig ? '(real API)' : '(mock)'}
        </h1>
      </header>
      <main className="flex-1">
        <SchemaRenderer
          schemaUrl="playground://pages/ai-conversations-demo"
          schema={exampleSchema as never}
          registry={registry}
          env={decoratedEnv}
          formulaCompiler={formulaCompiler}
          data={pageData}
        />
      </main>
    </div>
  );
}
