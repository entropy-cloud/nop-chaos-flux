import { useMemo, useState } from 'react';
import { Button } from '@nop-chaos/ui';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { createActionScope } from '@nop-chaos/flux-runtime';
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
  // to ai-chat through page-data relative read `conversationController: "${controller}"`
  // (see pageData below and plan 549 errata note — the `${$ai.controller}`
  // channel no longer exists after xui:imports removal).
  const conversations = useConversation({ connector });

  const pageData = useMemo(
    () => ({
      conversations: conversations.conversations,
      activeConversationId: conversations.activeConversationId,
      // Expose the controller through the page scope so the schema can bind it
      // via `conversationController: "${controller}"` (relative scope read).
      controller: conversations.controller,
      // P1-MA5.6-001 (plan 745): expose activeEngine so the schema can bind
      // `engine: "${activeEngine}"` — ai-chat switches messages when the
      // conversation's engine changes instead of showing stale bubbles.
      activeEngine: conversations.activeEngine,
      // plan 549 (IS-ai-conversations-001, bug-163 mitigation): the page
      // schema no longer declares xui:imports (its overlay captured schema
      // event writes and blocked page-data notifications — the sidebar was
      // functionally dead), so the connector is handed through page data
      // like the ai-coverage fixture precedent.
      connector,
    }),
    [conversations.conversations, conversations.activeConversationId, conversations.activeEngine, conversations.controller, connector],
  );

  // plan 633 UR-4 (replace-clobber 收敛): activeId 所有权归 host store——item 点击
  // 经 host action 走 switchConversation，pageData.activeConversationId 随之更新；
  // 旧的 schema setValue 只写 scope，下一次 pageData replace 会把高亮回退
  // （2026-10-17 探针复现：afterClick aria-current=true → rename 后 null）。
  // switchConversation 非稳定引用，但按 ref-mirror 设计（同步镜像读取，不依赖
  // render 闭包新鲜度）——scope 经 useState 只建一次，捕获首 render 实例即可。
  const [actionScope] = useState(() => {
    const switchConversation = conversations.switchConversation;
    const scope = createActionScope({ id: 'ai-conversations-demo-action-scope' });
    scope.registerNamespace('conversationsDemo', {
      kind: 'host',
      listMethods() {
        return ['setActive'];
      },
      async invoke(method: string, payload: unknown) {
        if (method === 'setActive') {
          const id = (payload as { id?: unknown } | undefined)?.id;
          if (typeof id === 'string') {
            try {
              await switchConversation(id);
              return { ok: true };
            } catch (error) {
              return {
                ok: false,
                error: error instanceof Error ? error : new Error(String(error), { cause: error }),
                cause: error,
              };
            }
          }
          return { ok: false, error: new Error('setActive requires string id') };
        }
        return { ok: false, error: new Error(`Unknown conversationsDemo method: ${method}`) };
      },
    });
    return scope;
  });

  return (
    <div className="nop-theme-root min-h-screen flex flex-col">
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
          actionScope={actionScope}
          data={pageData}
        />
      </main>
    </div>
  );
}
