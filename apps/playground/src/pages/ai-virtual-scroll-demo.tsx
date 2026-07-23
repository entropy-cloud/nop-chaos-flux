import { useMemo } from 'react';
import { Button, Toaster } from '@nop-chaos/ui';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerAiRenderers, type ChatMessage } from '@nop-chaos/flux-renderers-ai';
import { createMockAiConnector, createMockAiEnv, createAiImportLoader } from '../ai/mock-ai-env.js';
import exampleSchema from '../ai/ai-virtual-scroll-example.json';

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

const MESSAGE_COUNT = 1000;

/** Seed MESSAGE_COUNT messages so the list crosses the A-8 virtual threshold. */
function buildSeedMessages(): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (let i = 0; i < MESSAGE_COUNT; i++) {
    out.push({
      id: `seed-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Seeded message #${i + 1}.`,
    });
  }
  return out;
}

/**
 * A-8 demo: a long conversation (1000 seeded messages) that triggers windowed
 * virtual rendering in `ai-message-list`. The e2e asserts the rendered bubble
 * node count stays far below 1000.
 */
export function AiVirtualScrollDemoPage({ onBack }: Props) {
  const env = useMemo(() => createMockAiEnv(), []);
  const connector = useMemo(() => createMockAiConnector(env), [env]);
  const { importLoader, resolveImportUrl } = useMemo(() => createAiImportLoader(connector), [connector]);
  const messages = useMemo(() => buildSeedMessages(), []);

  const decoratedEnv = useMemo(
    () => ({ ...env, importLoader, resolveImportUrl }),
    [env, importLoader, resolveImportUrl],
  );

  return (
    <div className="nop-theme-root min-h-screen flex flex-col">
      <Toaster />
      <header className="flex items-center gap-3 p-3 border-b bg-background">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <h1 className="text-lg font-semibold">AI Virtual Scroll — A-8 (1000 messages)</h1>
      </header>
      <main className="flex-1 p-4">
        <SchemaRenderer
          schemaUrl="playground://pages/ai-virtual-scroll-demo"
          schema={exampleSchema as never}
          registry={registry}
          env={decoratedEnv}
          formulaCompiler={formulaCompiler}
          data={{ messages }}
        />
      </main>
    </div>
  );
}
