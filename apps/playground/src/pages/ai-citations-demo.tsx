import { useMemo } from 'react';
import { Button, Toaster } from '@nop-chaos/ui';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerAiRenderers, type AiCitationSource, type ChatMessage } from '@nop-chaos/flux-renderers-ai';
import { createMockAiEnv } from '../ai/mock-ai-env.js';
import exampleSchema from '../ai/ai-citations-example.json';

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

const SAMPLE_MESSAGE: ChatMessage = {
  id: 'citation-sample',
  role: 'assistant',
  content:
    'Flux is a modern rewrite of the AMIS low-code renderer [1]. The message engine is framework-agnostic [2], and citations reuse the shared sanitize pipeline [1,2].',
};

const SAMPLE_SOURCES: AiCitationSource[] = [
  {
    index: 1,
    title: 'flux-renderers-ai design.md',
    url: 'https://example.com/design',
    snippet: 'Architecture and renderer contract for the AI conversation package.',
  },
  {
    index: 2,
    title: 'engine.md — MessageEngine',
    url: 'https://example.com/engine',
    snippet: 'Framework-agnostic engine ported from tiny-robot.',
  },
];

/**
 * P3 demo (A-13): the `ai-citations` widget re-renders an assistant message's
 * content, turning `[N]` / `[N,M]` markers into hoverable `<sup>` source cards.
 * Sources resolve from the explicit `sources` prop (here) — in a real chat they
 * would come from `message.metadata.sources` or a `data-sources` content part.
 */
export function AiCitationsDemoPage({ onBack }: Props) {
  const env = useMemo(() => createMockAiEnv(), []);
  const pageData = useMemo(
    () => ({ citationMessage: SAMPLE_MESSAGE, citationSources: SAMPLE_SOURCES }),
    [],
  );

  return (
    <div className="nop-theme-root min-h-screen flex flex-col">
      <Toaster />
      <header className="flex items-center gap-3 p-3 border-b bg-background">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <h1 className="text-lg font-semibold">AI Citations — P3 (A-13)</h1>
      </header>
      <main className="flex-1">
        <SchemaRenderer
          schemaUrl="playground://pages/ai-citations-demo"
          schema={exampleSchema as never}
          registry={registry}
          env={env}
          formulaCompiler={formulaCompiler}
          data={pageData}
        />
      </main>
    </div>
  );
}
