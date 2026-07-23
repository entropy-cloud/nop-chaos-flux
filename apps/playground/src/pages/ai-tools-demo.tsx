import { useMemo } from 'react';
import { Button, Toaster } from '@nop-chaos/ui';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { StreamApiRequest } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerAiRenderers, createStreamBasedAiConnector } from '@nop-chaos/flux-renderers-ai';
import { createMockAiEnv, createAiImportLoader } from '../ai/mock-ai-env.js';
import { createMockToolStream, mockToolSchemas, mockToolExecutor } from '../ai/tool-mock.js';
import exampleSchema from '../ai/ai-tools-example.json';

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
 * P2 demo: agentic tool loop. A mock stream emits `finish_reason:'tool_calls'`
 * on the first round; the host-provided `toolExecutor` resolves `get_weather`,
 * and the result feeds the follow-up round which streams a content reply.
 */
export function AiToolsDemoPage({ onBack }: Props) {
  const env = useMemo(
    () => ({ ...createMockAiEnv(), stream: createMockToolStream() }),
    [],
  );
  const connector = useMemo(
    () =>
      createStreamBasedAiConnector({
        env,
        buildRequest: (req) => ({
          url: 'mock://ai/tools/chat/completions',
          method: 'POST',
          data: { messages: req.messages, tools: req.tools, stream: true } as unknown as StreamApiRequest['data'],
        }),
      }),
    [env],
  );
  const { importLoader, resolveImportUrl } = useMemo(
    () => createAiImportLoader(connector, { tools: mockToolSchemas, toolExecutor: mockToolExecutor }),
    [connector],
  );

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
        <h1 className="text-lg font-semibold">AI Tools — P2 Agentic Tool Loop</h1>
      </header>
      <main className="flex-1 p-4">
        <SchemaRenderer
          schemaUrl="playground://pages/ai-tools-demo"
          schema={exampleSchema as never}
          registry={registry}
          env={decoratedEnv}
          formulaCompiler={formulaCompiler}
        />
      </main>
    </div>
  );
}
