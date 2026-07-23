import { useMemo } from 'react';
import { Button, Toaster } from '@nop-chaos/ui';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerAiRenderers } from '@nop-chaos/flux-renderers-ai';
import { createMockAiConnector, createMockAiEnv, createAiImportLoader } from '../ai/mock-ai-env.js';
import exampleSchema from '../ai/ai-attachments-example.json';

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
 * P2 demo: multimodal attachments. The `ai-attachments` widget (image/card
 * preview, drag-drop, validation) renders above the message list inside an
 * `ai-chat` so attachments can flow as `image_url` content parts.
 */
export function AiAttachmentsDemoPage({ onBack }: Props) {
  const env = useMemo(() => createMockAiEnv(), []);
  const connector = useMemo(() => createMockAiConnector(env), [env]);
  const { importLoader, resolveImportUrl } = useMemo(() => createAiImportLoader(connector), [connector]);

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
        <h1 className="text-lg font-semibold">AI Attachments — P2 Multimodal</h1>
      </header>
      <main className="flex-1 p-4">
        <SchemaRenderer
          schemaUrl="playground://pages/ai-attachments-demo"
          schema={exampleSchema as never}
          registry={registry}
          env={decoratedEnv}
          formulaCompiler={formulaCompiler}
        />
      </main>
    </div>
  );
}
