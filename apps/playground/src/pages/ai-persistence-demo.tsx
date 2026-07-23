import { useCallback, useEffect, useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import { Button, Toaster } from '@nop-chaos/ui';
import {
  AiChatProvider,
  AiMessageListView,
  AiSenderView,
  useConversation,
  type MessageEngine,
  type MessageEngineState,
} from '@nop-chaos/flux-renderers-ai';
import { createMockAiConnector, createMockAiEnv } from '../ai/mock-ai-env.js';
import { createLocalStorageStorage } from '../ai/local-storage-storage.js';

interface Props {
  onBack: () => void;
}

const PERSISTENCE_STORAGE_KEY = 'nop-chaos-flux:ai-persistence-demo';

const EMPTY_STATE: MessageEngineState = {
  messages: [],
  requestState: 'idle',
  isProcessing: false,
};

/**
 * P3 demo: end-to-end persistence. `useConversation` is wired with a
 * localStorage-backed `ConversationStorageStrategy` + `autoSaveMessages`.
 *
 * The chat surface (`ai-message-list` + `ai-sender`) is bound to the
 * conversation manager's `activeEngine` — a SINGLE engine whose messages are
 * saved on turn completion and re-hydrated on switch. Reloading the page
 * bootstraps the conversation list from storage; clicking a conversation
 * re-hydrates its messages via `engine.setMessages`.
 *
 * NOTE: the `ai-chat` renderer currently owns its own engine (independent of
 * `useConversation`), so unifying `ai-chat` with the conversation manager's
 * engines is tracked as a host-level follow-up. This demo composes
 * `ai-message-list` + `ai-sender` directly to demonstrate real persistence.
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

  const ctx = useEngineView(conversations.activeEngine);

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
        <aside className="w-64 shrink-0 border rounded-md p-2 flex flex-col gap-1" data-testid="ai-persistence-panel">
          <Button
            size="sm"
            data-testid="ai-persistence-create"
            onClick={() => conversations.createConversation({ title: `Chat ${conversations.conversations.length + 1}` })}
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
          {ctx ? (
            <AiChatProvider value={ctx}>
              <AiMessageListView />
              <AiSenderView placeholder="Send a message, then refresh the page…" submitType="enter" />
            </AiChatProvider>
          ) : (
            <p className="text-sm text-muted-foreground p-4">Create or select a conversation to start.</p>
          )}
        </section>
      </main>
    </div>
  );
}

/**
 * Bind an existing `MessageEngine` to React via `useSyncExternalStore`,
 * producing the `AiChatContextValue` the message-list / sender consume.
 * Returns `null` while no engine is active.
 */
function useEngineView(engine: MessageEngine | null) {
  const subscribe = useCallback(
    (cb: () => void) => (engine ? engine.subscribe(cb) : () => {}),
    [engine],
  );
  const getSnapshot = useCallback(
    () => (engine ? engine.getState() : EMPTY_STATE) as MessageEngineState,
    [engine],
  );
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (!engine) return null;
  return {
    engine,
    messages: state.messages,
    requestState: state.requestState,
    processingState: state.processingState,
    isProcessing: state.isProcessing,
    sendMessage: engine.sendMessage,
    abortRequest: engine.abort,
  };
}
