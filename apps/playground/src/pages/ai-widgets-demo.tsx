import { useMemo } from 'react';
import { Button, Toaster } from '@nop-chaos/ui';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerAiRenderers } from '@nop-chaos/flux-renderers-ai';
import { createMockAiConnector, createMockAiEnv, createAiImportLoader } from '../ai/mock-ai-env.js';

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

const SCHEMA = {
  type: 'page',
  'xui:imports': [{ from: 'ai', as: 'ai' }],
  body: [
    {
      type: 'ai-chat',
      connector: '${$ai.connectors.mock}',
      placeholder: 'Ask me anything about weather, docs, or data…',
      submitType: 'enter',
      className: 'flex flex-col h-[calc(100vh-57px)] max-w-3xl mx-auto',
      header: {
        type: 'flex',
        direction: 'row',
        className: 'items-center justify-between px-4 py-3 border-b bg-background shrink-0',
        body: [
          { type: 'text', text: 'AI Assistant', className: 'text-base font-semibold' },
          {
            type: 'ai-token-usage',
            message: '${tokenMsg}',
            contextLimit: 8192,
            showCost: true,
          },
        ],
      },
      beforeMessages: {
        type: 'flex',
        direction: 'col',
        className: 'px-4 py-3 gap-3',
        body: [
          {
            type: 'ai-welcome',
            title: 'Welcome to AI Widgets',
            description: 'This demo showcases all flux-renderers-ai widgets in a real chat context. Try sending a message or click a suggestion below.',
            icon: 'bot',
            align: 'center',
          },
          {
            type: 'ai-prompts',
            items: '${promptItems}',
            layout: 'wrap',
            size: 'sm',
          },
        ],
      },
      afterMessages: {
        type: 'flex',
        direction: 'col',
        className: 'px-4 py-2 gap-2',
        body: [
          {
            type: 'ai-suggestions',
            items: '${suggestionItems}',
            overflowMode: 'expand',
          },
          {
            type: 'flex',
            direction: 'row',
            className: 'items-center gap-2',
            body: [
              { type: 'ai-voice-input', lang: 'en-US' },
              { type: 'text', text: 'Try voice input', className: 'text-xs text-muted-foreground' },
            ],
          },
        ],
      },
    },
  ],
};

const PROMPT_ITEMS = [
  { label: 'What is the weather?', description: 'Check current weather for any city' },
  { label: 'Help me debug', description: 'Get help troubleshooting an issue' },
  { label: 'Summarize the docs', description: 'Summarize a document or article' },
  { label: 'Show me a chart', description: 'Display a data chart' },
];

const SUGGESTION_ITEMS = [
  { text: 'Summarize', icon: '✏️' },
  { text: 'Translate', icon: '🌐' },
  { text: 'Explain', icon: '💡' },
  { text: 'Refine', icon: '✨' },
  { text: 'Expand', icon: '➕' },
];

export function AiWidgetsDemoPage({ onBack }: Props) {
  const env = useMemo(() => createMockAiEnv(), []);
  const connector = useMemo(() => createMockAiConnector(env), [env]);
  const { importLoader, resolveImportUrl } = useMemo(() => createAiImportLoader(connector), [connector]);
  const decoratedEnv = useMemo(
    () => ({ ...env, importLoader, resolveImportUrl }),
    [env, importLoader, resolveImportUrl],
  );
  const pageData = useMemo(
    () => ({
      tokenMsg: {
        id: 't1',
        role: 'assistant',
        content: 'Dashboard summary.',
        metadata: {
          usage: { prompt_tokens: 320, completion_tokens: 180, total_tokens: 500, cost: 0.0012 },
        },
      },
      promptItems: PROMPT_ITEMS,
      suggestionItems: SUGGESTION_ITEMS,
    }),
    [],
  );

  return (
    <div className="nop-theme-root min-h-screen flex flex-col">
      <Toaster />
      <header className="flex items-center gap-3 p-3 border-b bg-background shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <h1 className="text-lg font-semibold">AI Widgets Showcase</h1>
      </header>
      <main className="flex-1 min-h-0">
        <SchemaRenderer
          schemaUrl="playground://pages/ai-widgets-demo"
          schema={SCHEMA}
          registry={registry}
          env={decoratedEnv}
          formulaCompiler={formulaCompiler}
          data={pageData}
        />
      </main>
    </div>
  );
}
