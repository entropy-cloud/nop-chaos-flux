import { useMemo } from 'react';
import { Button, Toaster } from '@nop-chaos/ui';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerAiRenderers, type ChatMessage } from '@nop-chaos/flux-renderers-ai';
import { createMockAiEnv } from '../ai/mock-ai-env.js';
import exampleSchema from '../ai/ai-p4-example.json';

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

const TOKEN_MESSAGE: ChatMessage = {
  id: 'token-sample',
  role: 'assistant',
  content: 'Here is a streamed answer.',
  metadata: {
    usage: { prompt_tokens: 320, completion_tokens: 180, total_tokens: 500, cost: 0.0012 },
  },
};

const SUGGESTIONS = [
  { text: 'Summarize', icon: '✏️' },
  { text: 'Translate', icon: '🌐' },
  { text: 'Explain', icon: '💡' },
  { text: 'Refine', icon: '✨' },
  { text: 'Expand', icon: '➕' },
];

/**
 * P4 demo (A5): the three P4 widget renderers — `ai-voice-input` (Web Speech
 * API, direct call per INV-1 adjudication), `ai-token-usage` (reads
 * `metadata.usage`), and `ai-suggestions` (expand + popover overflow modes).
 */
export function AiP4WidgetsDemoPage({ onBack }: Props) {
  const env = useMemo(() => createMockAiEnv(), []);
  const pageData = useMemo(
    () => ({ tokenMessage: TOKEN_MESSAGE, suggestions: SUGGESTIONS }),
    [],
  );

  return (
    <div className="nop-theme-root min-h-screen flex flex-col">
      <Toaster />
      <header className="flex items-center gap-3 p-3 border-b bg-background">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <h1 className="text-lg font-semibold">AI P4 Widgets — voice / token / suggestions</h1>
      </header>
      <main className="flex-1">
        <SchemaRenderer
          schemaUrl="playground://pages/ai-p4-widgets-demo"
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
