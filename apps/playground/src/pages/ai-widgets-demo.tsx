import { useMemo } from 'react';
import { Button, Toaster } from '@nop-chaos/ui';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerAiRenderers, type AiCitationSource, type ChatMessage } from '@nop-chaos/flux-renderers-ai';
import { createMockAiConnector, createMockAiEnv, createAiImportLoader } from '../ai/mock-ai-env.js';
import { mockToolSchemas, mockToolExecutor } from '../ai/tool-mock.js';

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
      componentId: 'ai-widgets-chat',
      connector: '${$ai.connectors.mock}',
      tools: '${$ai.tools}',
      toolExecutor: '${$ai.toolExecutor}',
      maxToolRounds: 2,
      placeholder: 'Ask me anything about weather, docs, or data…',
      submitType: 'enter',
      showAvatar: true,
      className: 'flex flex-col h-[calc(100vh-57px)] max-w-3xl mx-auto',
      header: {
        type: 'flex',
        direction: 'row',
        className: 'items-center justify-between px-4 py-3 border-b bg-background shrink-0 flex-wrap gap-2',
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
        direction: 'column',
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
            type: 'flex',
            direction: 'row',
            className: 'gap-2 flex-wrap justify-center',
            body: [
              {
                type: 'link',
                href: '#/ai-tools',
                label: 'Tool Call — agentic tool-loop demo →',
                className:
                  'nop-link rounded-lg border bg-card px-3 py-2 text-sm font-medium no-underline hover:bg-accent transition-colors',
              },
              {
                type: 'link',
                href: '#/ai-citations',
                label: 'Citations — [N] source cards demo →',
                className:
                  'nop-link rounded-lg border bg-card px-3 py-2 text-sm font-medium no-underline hover:bg-accent transition-colors',
              },
            ],
          },
          {
            type: 'ai-prompts',
            items: '${promptItems}',
            layout: 'wrap',
            size: 'sm',
            onSelect: {
              action: 'component:setSenderDraft',
              componentId: 'ai-widgets-chat',
              args: { text: '${item.label}' },
            },
          },
        ],
      },
      afterMessages: {
        type: 'flex',
        direction: 'column',
        className: 'px-4 py-2 gap-2',
        body: [
          {
            type: 'ai-feedback',
            actions: ['copy', 'refresh', 'like', 'dislike', 'sources'],
            message: '${feedbackMsg}',
            onAction: {
              action: 'showToast',
              args: { level: 'info', message: 'feedback: ${action} on ${message.id}' },
            },
          },
          {
            type: 'ai-suggestions',
            items: '${suggestionItems}',
            overflowMode: 'expand',
            onSelect: {
              action: 'component:setSenderDraft',
              componentId: 'ai-widgets-chat',
              args: { text: '${item.text}' },
            },
          },
          {
            type: 'flex',
            direction: 'row',
            className: 'items-center gap-2',
            body: [
              {
                type: 'ai-voice-input',
                lang: 'en-US',
                onResult: {
                  action: 'component:setSenderDraft',
                  componentId: 'ai-widgets-chat',
                  args: { text: '${transcript}', mode: 'append' },
                },
                onError: {
                  action: 'showToast',
                  args: { level: 'warning', message: 'Voice error: ${reason}' },
                },
              },
              { type: 'text', text: 'Try voice input', className: 'text-xs text-muted-foreground' },
            ],
          },
          {
            type: 'text',
            text: 'Citations — hover a [N] marker for its source card',
            className: 'text-xs text-muted-foreground',
          },
          {
            type: 'ai-citations',
            message: '${citationMsg}',
            sources: '${citationSources}',
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
  { text: 'Summarize', icon: 'pencil' },
  { text: 'Translate', icon: 'languages' },
  { text: 'Explain', icon: 'lightbulb' },
  { text: 'Refine', icon: 'sparkles' },
  { text: 'Expand', icon: 'plus' },
];

const CITATION_MESSAGE: ChatMessage = {
  id: 'm_citation_widgets',
  role: 'assistant',
  content: 'Every showcase claim is traceable [1], and citations reuse the shared sanitize pipeline [2].',
};

const CITATION_SOURCES: AiCitationSource[] = [
  {
    index: 1,
    title: 'flux-renderers-ai design.md',
    url: 'https://github.com/nop-chaos/nop-chaos/blob/main/docs/architecture/ai/README.md',
    snippet: 'Architecture and renderer contract for the AI conversation package.',
  },
  {
    index: 2,
    title: 'product-spec §6 — showcase completeness',
    url: 'https://github.com/nop-chaos/nop-chaos/blob/main/docs/components/flux-renderers-ai/product-spec.md',
    snippet: 'First-screen widget counting contract and D5 trigger surface.',
  },
];

export function AiWidgetsDemoPage({ onBack }: Props) {
  // P2-5 adjudication (plan 2026-08-25-0440-1): the env factory and the
  // import-loader pair are plain derivations — React Compiler covers every
  // environment this page executes in (playground vite dev/build, see
  // apps/playground/vite.config.ts reactCompilerPreset), so hand-written
  // useMemos here were redundant and were removed.
  const env = createMockAiEnv({ delayMs: 200, fixtures: true });
  const connector = useMemo(() => createMockAiConnector(env), [env]);
  const { importLoader, resolveImportUrl } = createAiImportLoader(connector, {
    tools: mockToolSchemas,
    toolExecutor: mockToolExecutor,
  });
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
      citationMsg: CITATION_MESSAGE,
      citationSources: CITATION_SOURCES,
      feedbackMsg: {
        id: 'm_fb_widgets',
        role: 'assistant',
        content: 'AI Widgets Showcase — feedback actions now have real side effects (vote metadata, regenerate, sources popover).',
        metadata: {
          sources: [
            { label: 'design.md', url: 'https://github.com/nop-chaos/nop-chaos/blob/main/docs/components/flux-renderers-ai/design.md' },
            { label: 'product-spec.md', url: 'https://github.com/nop-chaos/nop-chaos/blob/main/docs/components/flux-renderers-ai/product-spec.md' },
          ],
        },
      },
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
