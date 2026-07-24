import { useMemo } from 'react';
import { Button, Toaster } from '@nop-chaos/ui';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { StreamApiRequest } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import {
  registerAiRenderers,
  createStreamBasedAiConnector,
  type ChatMessage,
} from '@nop-chaos/flux-renderers-ai';
import { createTiptapSender } from '@nop-chaos/flux-renderers-ai/rich-text';
import { createMockAiEnv, createAiImportLoader } from '../ai/mock-ai-env.js';
import exampleSchema from '../ai/ai-rich-text-example.json';

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

// Host-side Tiptap sender with all three built-in extensions.
const tiptapSender = createTiptapSender({
  extensions: ['mention', 'template', 'slash'],
  mentions: [
    { id: 'u1', label: 'alice' },
    { id: 'u2', label: 'bob' },
    { id: 'u3', label: 'charlie' },
  ],
  templates: [
    { label: 'Greeting', content: 'Hello! How can I help?' },
    { label: 'Summary', content: 'Summarize the following:' },
    { label: 'Code', content: 'Explain this code:' },
  ],
  slashCommands: [
    { label: 'summarize', insertText: 'Summarize this:' },
    { label: 'translate', insertText: 'Translate to English:' },
    { label: 'clear', action: () => undefined },
  ],
  placeholder: 'Type a message. Try @mention, /slash, or template buttons…',
});

/**
 * Extended import loader that also exposes `tiptapSender` in the `ai`
 * namespace's expression helpers so the schema can bind it via
 * `senderExtensions: '${$ai.tiptapSender}'`.
 */
function createRichTextImportLoader(connector: ReturnType<typeof createStreamBasedAiConnector>) {
  const base = createAiImportLoader(connector);
  const originalLoad = base.importLoader.load;
  return {
    importLoader: {
      async load(spec: Parameters<typeof originalLoad>[0]) {
        const mod = await originalLoad(spec);
        // Augment the expression helpers with `tiptapSender` so the schema can
        // bind it via `senderExtensions: '${$ai.tiptapSender}'`.
        return {
          ...mod,
          createExpressionHelpers: (ctx: Parameters<NonNullable<typeof mod.createExpressionHelpers>>[0]) => ({
            ...(mod.createExpressionHelpers?.(ctx) ?? {}),
            tiptapSender,
          }),
        };
      },
    },
    resolveImportUrl: base.resolveImportUrl,
  };
}

const _unused: ChatMessage | undefined = undefined;
void _unused;

/**
 * P6 (A6) demo: the `ai-sender` inside `ai-chat` uses a host-injected Tiptap
 * rich-text editor (via `senderExtensions`). The host creates the editor via
 * `createTiptapSender` (opt-in `./rich-text` subpath), registers it under the
 * `ai` namespace, and the schema binds it with `senderExtensions: '${$ai.tiptapSender}'`.
 * Hosts that never import `./rich-text` keep the zero-Tiptap `<Textarea>` default.
 */
export function AiRichTextDemoPage({ onBack }: Props) {
  const env = useMemo(() => createMockAiEnv(), []);
  const connector = useMemo(
    () =>
      createStreamBasedAiConnector({
        env,
        buildRequest: (req) => ({
          url: 'mock://ai/rich-text/chat/completions',
          method: 'POST',
          data: { messages: req.messages, stream: true } as unknown as StreamApiRequest['data'],
        }),
      }),
    [env],
  );
  const { importLoader, resolveImportUrl } = useMemo(
    () => createRichTextImportLoader(connector),
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
        <h1 className="text-lg font-semibold">AI Rich Text Sender — P6 (A6)</h1>
      </header>
      <main className="flex-1 p-4">
        <SchemaRenderer
          schemaUrl="playground://pages/ai-rich-text-demo"
          schema={exampleSchema as never}
          registry={registry}
          env={decoratedEnv}
          formulaCompiler={formulaCompiler}
        />
      </main>
    </div>
  );
}
