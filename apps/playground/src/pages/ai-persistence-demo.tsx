import { useEffect, useMemo } from 'react';
import { Button, Toaster } from '@nop-chaos/ui';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerAiRenderers, useConversation } from '@nop-chaos/flux-renderers-ai';
import { createMockAiConnector, createMockAiEnv } from '../ai/mock-ai-env.js';
import { createLocalStorageStorage } from '../ai/local-storage-storage.js';
import exampleSchema from '../ai/ai-persistence-example.json';

interface Props {
  onBack: () => void;
}

const PERSISTENCE_STORAGE_KEY = 'nop-chaos-flux:ai-persistence-demo';

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerLayoutRenderers(registry);
registerAiRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

/**
 * P3 demo: end-to-end persistence. `useConversation` is wired with a
 * localStorage-backed `ConversationStorageStrategy` + `autoSaveMessages`.
 *
 * The chat surface is the `ai-chat` renderer, bound to the conversation
 * manager's `activeEngine` via the schema `engine` prop (design.md §11.2/§11.5)
 * — a SINGLE engine whose messages are saved on turn completion and re-hydrated
 * on switch. This unifies `ai-chat` with the conversation manager's engines,
 * so the persistence scenario reuses all `ai-chat` capabilities (regions,
 * ActionScope namespace `ai`, ComponentHandle) instead of the former manual
 * `AiMessageListView` + `AiSenderView` assembly.
 *
 * The sidebar stays in React and drives the manager directly
 * (`conversations.create/switch/delete`) — the conversation mutations are
 * host-owned, and the `engine` prop flows the active engine into `ai-chat`.
 * Reloading the page bootstraps the conversation list from storage; the mount
 * effect re-hydrates the active conversation's messages via `switchConversation`.
 *
 * `engine-null-switch`: before the first conversation is created/selected,
 * `activeEngine` is null and `ai-chat` renders its emptyState region.
 */
export function AiPersistenceDemoPage({ onBack }: Props) {
  const baseEnv = useMemo(() => createMockAiEnv(), []);
  const connector = useMemo(() => createMockAiConnector(baseEnv), [baseEnv]);
  const storage = useMemo(() => createLocalStorageStorage({ key: PERSISTENCE_STORAGE_KEY }), []);

  const conversations = useConversation({
    connector,
    storage,
    autoSaveMessages: true,
  });

  const activeId = conversations.activeConversationId;

  // After the mount bootstrap loads the conversation list, build + hydrate the
  // active conversation's engine (the bootstrap only restores the list + id).
  useEffect(() => {
    if (activeId && !conversations.activeEngine) {
      void conversations.switchConversation(activeId);
    }
  }, [activeId, conversations]);

  const chatData = useMemo(
    () => ({
      // The active engine flows into `ai-chat` via the `engine` prop; the
      // controller is bound so the `ai` namespace's conversation actions work.
      engine: conversations.activeEngine,
      controller: conversations.controller,
      activeConversationId: conversations.activeConversationId,
    }),
    [conversations.activeEngine, conversations.controller, conversations.activeConversationId],
  );

  return (
    <div className="nop-theme-root min-h-screen flex flex-col">
      <Toaster />
      <header className="flex items-center gap-3 p-3 border-b bg-background">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <h1 className="text-lg font-semibold">AI Persistence — P3 (localStorage)</h1>
      </header>
      <main className="flex-1 flex max-w-6xl mx-auto w-full gap-2 p-4">
        <aside
          className="w-64 shrink-0 border rounded-md p-2 flex flex-col gap-1"
          data-testid="ai-persistence-panel"
        >
          <Button
            size="sm"
            data-testid="ai-persistence-create"
            onClick={() =>
              conversations.createConversation({ title: `Chat ${conversations.conversations.length + 1}` })
            }
          >
            + New conversation
          </Button>
          {conversations.conversations.map((c) => (
            <div
              key={c.id}
              className={
                'flex items-center justify-between rounded px-2 py-1 text-sm cursor-pointer ' +
                (c.id === activeId ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50')
              }
              data-testid="ai-persistence-item"
              data-conversation-id={c.id}
            >
              <button
                type="button"
                className="flex-1 text-left truncate"
                onClick={() => void conversations.switchConversation(c.id)}
              >
                {c.title ?? 'Untitled'}
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1 text-xs"
                aria-label="Delete conversation"
                onClick={() => void conversations.deleteConversation(c.id)}
              >
                ✕
              </Button>
            </div>
          ))}
          {conversations.conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">No conversations yet.</p>
          ) : null}
        </aside>
        <section className="flex-1 min-w-0 flex flex-col gap-2 border rounded-md p-2">
          <SchemaRenderer
            schemaUrl="playground://pages/ai-persistence-demo"
            schema={exampleSchema as never}
            registry={registry}
            env={baseEnv}
            formulaCompiler={formulaCompiler}
            data={chatData}
          />
        </section>
      </main>
    </div>
  );
}
