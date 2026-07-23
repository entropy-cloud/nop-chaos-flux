import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Button, Toaster } from '@nop-chaos/ui';
import {
  AiChatProvider,
  AiMessageListView,
  AiSenderView,
  createReactMessageAdapter,
  type AiBranch,
  type AiConnector,
  type AiConnectorChunk,
  type AiConnectorRequest,
  type ChatMessage,
  type MessageEngine,
  type MessageEngineState,
  createMessageEngine,
} from '@nop-chaos/flux-renderers-ai';
import { createMockAiEnv } from '../ai/mock-ai-env.js';

interface Props {
  onBack: () => void;
}

/** Deterministic mock connector: echoes the user text + a round index suffix. */
function makeConnector(): AiConnector {
  let round = 0;
  return {
    async stream(req: AiConnectorRequest) {
      round += 1;
      const lastUser = [...req.messages].reverse().find((m) => m.role === 'user');
      const text =
        (typeof lastUser?.content === 'string' ? lastUser.content : '') || 'reply';
      const reply = `Reply #${round} to: ${text}`;
      async function* gen(): AsyncGenerator<AiConnectorChunk> {
        for (const word of reply.split(' ')) {
          yield { delta: { content: `${word} ` } };
        }
        yield { finishReason: 'stop', metadata: { usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 } } };
      }
      return gen();
    },
  };
}

/**
 * P4 demo (A5): advanced integration.
 *
 * 1. **Message branches (A-16)** — a "Regenerate" button calls
 *    `engine.regenerate()`, which stamps a new `metadata.branchId`. The host
 *    stores each branch's full message set; the `ai-bubble` branch picker
 *    (prev/next) fires `onBranchChange`, and the host loads that branch via
 *    `engine.setMessages`.
 * 2. **Platform linkage (Decision-A/B)** — on `requestState === 'completed'`
 *    the host serializes the engine messages (`component:getMessages`-equivalent
 *    → deep copy) into a "form field" view AND triggers a "data-source reload"
 *    counter, demonstrating both host paradigms off the existing event surface.
 */
export function AiLinkageDemoPage({ onBack }: Props) {
  const baseEnv = useMemo(() => createMockAiEnv(), []);
  const engine = useMemo<MessageEngine>(() => {
    void baseEnv;
    // createReactMessageAdapter caches snapshots so React's useSyncExternalStore
    // sees a stable reference between mutations (the native adapter does not).
    return createMessageEngine({ connector: makeConnector(), adapter: createReactMessageAdapter() });
  }, [baseEnv]);

  // ---- Branch host state (host owns full branch sets) ----
  const [branchStore, setBranchStore] = useState<Record<string, ChatMessage[]>>({});
  const [activeBranchId, setActiveBranchId] = useState<string | undefined>(undefined);
  const [lastBranchId, setLastBranchId] = useState<string | undefined>(undefined);

  // Derive the picker entries from the stored branch sets (sorted by id).
  const branches = useMemo<AiBranch[]>(() => {
    return Object.keys(branchStore)
      .sort()
      .map((id) => {
        const msgs = branchStore[id];
        const assistant =
          msgs.find((m) => m.metadata?.branchId === id) ?? msgs.find((m) => m.role === 'assistant');
        return { id, messageId: assistant?.id ?? msgs[msgs.length - 1]?.id ?? id };
      });
  }, [branchStore]);

  // ---- Linkage host state (Decision-A messages→form + Decision-B data-source) ----
  const [formFieldValue, setFormFieldValue] = useState<string>('');
  const [reloadCount, setReloadCount] = useState(0);

  const ctx = useEngineView(engine);

  // Subscribe to engine transitions: serialize on completion + record branch ids.
  useEffect(() => {
    let prev = engine.getState().requestState;
    const unsub = engine.subscribe('requestState', (state) => {
      const current = state.requestState;
      if (prev === 'processing' && current === 'completed') {
        const msgs = engine.getMessages();
        const last = msgs[msgs.length - 1];

        // Decision-A: serialize messages into a form-field view (deep copy).
        setFormFieldValue(JSON.stringify(msgs.map((m) => ({ role: m.role, content: m.content }))));

        // Decision-B: data-source reload/insert paradigm (counter stands in for reload).
        setReloadCount((c) => c + 1);

        // A-16: if this assistant message carries a branchId, record its branch set.
        const bid = last?.metadata?.branchId;
        if (typeof bid === 'string' && last) {
          setLastBranchId(bid);
          setBranchStore((store) => ({ ...store, [bid]: msgs.map((m) => ({ ...m })) }));
          setActiveBranchId(bid);
        }
      }
      prev = current;
    });
    return unsub;
  }, [engine]);

  const handleRegenerate = useCallback(() => {
    // Capture the current (pre-regenerate) messages as the original branch so
    // the picker can offer "1/N" and "2/N". The engine only stamps the NEW id;
    // the host owns every branch's full message set.
    const currentMsgs = engine.getMessages();
    const last = currentMsgs[currentMsgs.length - 1];
    if (last && last.role === 'assistant') {
      const originalId = 'branch-0';
      setBranchStore((store) =>
        store[originalId] ? store : { ...store, [originalId]: currentMsgs.map((m) => ({ ...m })) },
      );
    }
    void engine.regenerate();
  }, [engine]);

  const handleBranchChange = useCallback(
    (branchId: string) => {
      const stored = branchStore[branchId];
      if (!stored) return;
      setActiveBranchId(branchId);
      // Load the selected branch's messages (host-managed full set).
      engine.setMessages(stored.map((m) => ({ ...m })));
    },
    [branchStore, engine],
  );

  return (
    <div className="nop-theme-root min-h-screen flex flex-col">
      <Toaster />
      <header className="flex items-center gap-3 p-3 border-b bg-background">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <h1 className="text-lg font-semibold">AI P4 Advanced — branches + platform linkage</h1>
      </header>
      <main className="flex-1 flex max-w-5xl mx-auto w-full gap-3 p-4">
        <section className="flex-1 min-w-0 flex flex-col gap-2 border rounded-md p-2" data-testid="p4-branches">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Conversation</span>
            <Button size="sm" variant="outline" data-testid="p4-regenerate" onClick={handleRegenerate}>
              Regenerate
            </Button>
          </div>
          {lastBranchId ? (
            <p className="text-xs text-muted-foreground" data-testid="p4-last-branch-id">
              Last regenerated branchId: <code>{lastBranchId}</code>
            </p>
          ) : null}
          {ctx ? (
            <AiChatProvider
              value={{
                ...ctx,
                branches,
                activeBranchId,
                onBranchChange: handleBranchChange,
              }}
            >
              <AiMessageListView />
              <AiSenderView placeholder="Send a message, then try Regenerate…" submitType="enter" />
            </AiChatProvider>
          ) : null}
        </section>
        <aside className="w-80 shrink-0 flex flex-col gap-3" data-testid="p4-linkage">
          <div className="border rounded-md p-3">
            <p className="text-sm font-medium">Decision-A: messages → form field</p>
            <p className="text-xs text-muted-foreground mb-1">
              On each completed turn the host serializes the engine messages into a form field.
            </p>
            <pre
              data-testid="p4-form-field"
              className="text-[11px] bg-muted/40 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap break-words"
            >
              {formFieldValue || '(empty — send a message)'}
            </pre>
          </div>
          <div className="border rounded-md p-3">
            <p className="text-sm font-medium">Decision-B: data-source reload</p>
            <p className="text-xs text-muted-foreground mb-1">
              The same completion event drives a data-source reload/insert.
            </p>
            <p className="text-2xl font-semibold" data-testid="p4-reload-count">
              {reloadCount}
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}

/** Bind a `MessageEngine` to React via `useSyncExternalStore`. */
function useEngineView(engine: MessageEngine) {
  const subscribe = useCallback((cb: () => void) => engine.subscribe(cb), [engine]);
  const getSnapshot = useCallback(() => engine.getState() as MessageEngineState, [engine]);
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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
