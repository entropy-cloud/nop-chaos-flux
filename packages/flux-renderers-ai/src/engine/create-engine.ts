import {
  applyChunk,
  createAbortController,
  generateMessageId,
  isEmptyContent,
  isVacuousAssistantResidue,
} from './utils.js';
import { createNativeMessageAdapter } from './native-adapter.js';
import {
  createBranchSequencer,
  findLastUserIndex,
  findPriorAssistantBranchId,
} from './branching.js';
import { buildEngineContext } from './build-context.js';
import { executeToolCalls, cleanDanglingAssistantAt } from './tool-execution.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiToolSchema,
  ChatMessage,
  ChatMessageContentPart,
  ChatMessageEditingState,
  ChatMessageMetadata,
  MessageEngine,
  MessageEngineContext,
  MessageEnginePlugin,
  MessageEngineState,
  MessageStateAdapter,
  MessageStateSubscribe,
  ToolExecutor,
} from './types.js';

export interface CreateMessageEngineOptions {
  connector?: AiConnector | null;
  initialMessages?: ChatMessage[];
  plugins?: MessageEnginePlugin[];
  adapter?: MessageStateAdapter;
  /** Extra OpenAI-compatible params forwarded on every request. */
  extraRequestParams?: Record<string, unknown>;
  /** Optional system prompt prepended to every request (not added to history). */
  systemPrompt?: string;
  /** Host-provided tool schemas (forwarded as `request.tools`). */
  tools?: AiToolSchema[];
  /**
   * Host-provided tool executor. Invoked once per `tool_call` after a
   * `finish_reason:'tool_calls'` turn, then a follow-up request is sent so the
   * model can react to the result (engine.md §8.3). Omit → `tool-no-executor`.
   */
  toolExecutor?: ToolExecutor | null;
  /** Max consecutive tool-calling rounds before the loop terminates (default 8). */
  maxToolRounds?: number;
}

/**
 * Create a framework-agnostic message engine. Ported from tiny-robot
 * `kit/src/message/core/engine.ts`, rewritten without Vue/React coupling.
 * State lives in the injected `MessageStateAdapter` (native by default). The
 * engine owns the turn lifecycle: idle → processing → completed/aborted/error,
 * streaming accumulation via `combineDeltaData`, and plugin fan-out.
 * MUST NOT import 'react' or DOM globals (INV-1, `design.md` §18.1).
 */
export function createMessageEngine(options: CreateMessageEngineOptions = {}): MessageEngine {
  const adapter = options.adapter ?? createNativeMessageAdapter();
  const plugins: MessageEnginePlugin[] = [...(options.plugins ?? [])];
  const extraRequestParams = options.extraRequestParams ?? {};
  const systemPrompt = options.systemPrompt;
  const hostTools: AiToolSchema[] | undefined = options.tools;
  const toolExecutor: ToolExecutor | null = options.toolExecutor ?? null;
  const maxToolRounds = options.maxToolRounds ?? 8;

  adapter.initialize({
    messages: options.initialMessages ? options.initialMessages.map((m) => ({ ...m })) : [],
    requestState: 'idle',
    isProcessing: false,
    abortController: null,
    connector: options.connector ?? null,
  });

  const engine: MessageEngine = {
    getState,
    // Bind so `engine.subscribe` is safe to pass to `useSyncExternalStore`.
    subscribe: ((...args: Parameters<MessageStateSubscribe>) =>
      adapter.subscribe(...args)) as MessageStateSubscribe,
    sendMessage,
    send,
    abort,
    clear,
    setConnector,
    registerPlugin,
    getMessages,
    setMessages,
    setMessageEditing,
    regenerate,
  };

  // A-16: branch-id sequencer. The engine assigns `branch-<n>` when the host
  // omits an explicit id; the host owns the full branch set.
  const branchSeq = createBranchSequencer();
  // Pending branch-id stamp for the next assistant message (consumed once by
  // `runOnce`). Undefined for normal turns (no branch).
  let pendingBranchId: string | undefined;
  // K2 (ai-invariant-loop): handle on the in-flight stream generator so
  // `abort()` can force-terminate it best-effort (generators suspended at a
  // `yield` are preemptible via `return()`; see engine.md §Invariants Failure
  // Path for the never-settle connector contract ruling). Nulled at every
  // runOnce exit (a consumed generator's `return()` is a no-op).
  let activeGenerator: AsyncGenerator<AiConnectorChunk> | undefined;

  function getState(): MessageEngineState {
    return adapter.getState();
  }

  function setConnector(connector: AiConnector): void {
    // Idempotent: skip when the same connector reference is re-assigned (avoids
    // a spurious notify when the host effect re-runs on mount).
    if (adapter.getConnector() === connector) {
      return;
    }
    adapter.mutate('full', (draft) => {
      draft.connector = connector;
    });
  }

  function registerPlugin(plugin: MessageEnginePlugin): () => void {
    plugins.push(plugin);
    return () => {
      const idx = plugins.indexOf(plugin);
      if (idx >= 0) plugins.splice(idx, 1);
    };
  }

  function getMessages(): ChatMessage[] {
    // Return a per-message shallow-isolated copy (O-2): top-level fields are
    // isolated from the engine's internal state, but nested objects
    // (metadata / tool_calls / state) still share refs — and DURING
    // streaming the engine DOES mutate them in place: `applyChunk` →
    // `combineDeltaData` merges the in-flight assistant in place, and after
    // the first per-chunk `commitAssistant` the draft is rebound to the live
    // state element (open P2-6). Benign at per-chunk commit granularity, but
    // snapshot readers must not hold a nested reference across turns. Only
    // invoked at turn boundaries (onResponseComplete / saveMessages), so
    // O(n) per turn is acceptable.
    return adapter.getState().messages.map((m) => ({ ...m }));
  }

  function setMessages(messages: ChatMessage[]): void {
    // Reject replacement while a turn is in-flight: callers should `abort()`
    // first (mirrors `clear`'s guard). Avoids racing the streaming accumulator.
    if (adapter.getState().isProcessing) {
      return;
    }
    adapter.mutate('full', (draft) => {
      draft.messages = messages.map((m) => ({ ...m }));
      draft.requestState = 'idle';
      draft.isProcessing = false;
      draft.processingState = undefined;
    });
  }

  function setMessageEditing(
    messageId: string,
    editing: ChatMessageEditingState | null,
  ): void {
    // Renderer-driven editing state (design.md §11.5). Shallow-copy the
    // message + its state so the snapshot returned by `getMessages()` (which
    // shares nested state refs) cannot be written through. No-op when the
    // messageId is unknown (Failure Path `edit-unknown-message`).
    adapter.mutate('messages', (draft) => {
      const idx = draft.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      const current = draft.messages[idx];
      draft.messages[idx] = {
        ...current,
        state: { ...current.state, editing: editing ?? undefined },
      };
    });
  }

  async function sendMessage(content: string | ChatMessageContentPart[]): Promise<void> {
    if (isEmptyContent(content)) {
      return;
    }
    const userMessage = adapter.createMessage({
      id: generateMessageId('user'),
      role: 'user',
      content,
      metadata: { createdAt: Date.now() },
    });
    await runTurn([userMessage]);
  }

  async function send(...messages: ChatMessage[]): Promise<void> {
    const stamped = messages.map((m) =>
      adapter.createMessage({ ...m, id: m.id ?? generateMessageId(m.role), metadata: { createdAt: Date.now(), ...m.metadata } }),
    );
    if (stamped.length === 0) return;
    await runTurn(stamped);
  }

  async function runTurn(incomingMessages: ChatMessage[]): Promise<void> {
    // AI-01 (Bug 07 recurrence): serialise turns. A second send while a turn
    // is in-flight would otherwise overwrite `draft.abortController` and start
    // a competing stream, interleaving writes into `draft.messages`. Return
    // silently — the host treats the second call as an ignored cancellation
    // (mirrors the `submit()` guard in `docs/bugs/07-...`).
    if (adapter.getState().isProcessing) {
      return;
    }
    const connector = adapterStateConnector();
    if (!connector) {
      // P1-5 / AI-19 parity: surface a structured "connector-missing" error on
      // state.lastError (and forward to plugin.onError) — mirrors the
      // tool-no-executor branch so error-state consumers can read the reason
      // instead of just the requestState flip (Failure Path FP-6). Was
      // previously a silent error transition with no lastError written.
      // ⑧ (ai-invariant-loop): consume the pending branch stamp before this
      // early return — regenerate stamps it and this path never reaches
      // runOnce's consumption (probe-3 leak into the next unrelated turn).
      pendingBranchId = undefined;
      const connectorMissingError = new Error('connector-missing');
      const errorCtxAbort = createAbortController();
      adapter.mutate('requestState', (draft) => {
        draft.messages.push(...incomingMessages);
        draft.requestState = 'error';
        draft.isProcessing = false;
        draft.processingState = undefined;
        draft.lastError = connectorMissingError;
      });
      callPluginError(errorCtxAbort, connectorMissingError);
      return;
    }

    const abortController = createAbortController();

    // 1. Push incoming messages; enter processing.
    adapter.mutate('requestState', (draft) => {
      draft.messages.push(...incomingMessages);
      draft.requestState = 'processing';
      draft.isProcessing = true;
      draft.processingState = 'requesting';
      draft.abortController = abortController;
      // AI-19: clear any stale error from a prior turn.
      draft.lastError = undefined;
    });

    try {
      // Fire onTurnStart once for the whole turn (NOT per round) so the plugin
      // hook order stays: turnStart → (beforeRequest → chunks → afterRequest)* → turnEnd.
      // ⑨ (ai-invariant-loop): onTurnStart is INSIDE the try/finally cleanup
      // surface — a rejection must settle the turn (state write via the catch
      // path), not stick `processing` nor reject the host-facing promise.
      const turnCtx = buildContext(abortController);
      for (const plugin of plugins) {
        await plugin.onTurnStart?.(turnCtx);
      }

      let rounds = 0;
      // Prime the loop: the first request uses the full conversation history.
      let needsFollowUp = true;
      while (needsFollowUp) {
        if (abortController.signal.aborted) {
          // ⑧ multi P2-1: clear the pending stamp before the abort break —
          // it is consumed only by runOnce (see bug note 137).
          pendingBranchId = undefined;
          break;
        }
        if (rounds >= maxToolRounds) {
          // Failure Path `tool-loop-max`: terminate the loop, record cause.
          // The marker is written entirely inside the mutate recipe
          // (read-old → build-new → replace) so the cached snapshot's tail
          // element is never mutated in place (snapshot identity contract).
          adapter.mutate('messages', (draft) => {
            const len = draft.messages.length;
            const tail = draft.messages[len - 1];
            if (tail) {
              draft.messages[len - 1] = {
                ...tail,
                metadata: { ...tail.metadata, toolLoopMaxReached: true },
              };
            }
          });
          break;
        }
        rounds += 1;
        // runOnce performs one streaming request and appends/commits the
        // assistant message for that round. Returns the finish reason of the
        // produced assistant message so the loop can decide on tool follow-up.
        const outcome = await runOnce(connector, abortController);
        if (outcome.kind === 'error' || outcome.kind === 'aborted') {
          // runOnce already set requestState accordingly.
          return;
        }
        if (
          outcome.finishReason === 'tool_calls' &&
          outcome.assistantMessage.tool_calls &&
          outcome.assistantMessage.tool_calls.length > 0
        ) {
          // If no executor is provided, transition to error and stop
          // (Failure Path `tool-no-executor`).
          if (!toolExecutor) {
            // AI-19 parity with connector-throw: surface the real cause on
            // `state.lastError` so error-state consumers (e.g. error bubble)
            // can read the reason, not just the requestState flip.
            const noExecutorError = new Error('tool-no-executor');
            adapter.mutate('requestState', (draft) => {
              draft.requestState = 'error';
              draft.isProcessing = false;
              draft.processingState = undefined;
              draft.lastError = noExecutorError;
            });
            // P1-2 (⑩): no executor → no tool response will ever pair this
            // assistant — drop it (empty content) or strip tool_calls (text
            // kept), so the dangling shape never reaches the next payload or
            // autoSave (strict backends 400 unpaired tool_calls).
            cleanDanglingAssistantAt(adapter, outcome.assistantIndex);
            callPluginError(abortController, noExecutorError);
            return;
          }
          // Execute each tool_call, append role:'tool' result messages, then
          // loop again to issue the follow-up request.
          const shouldContinue = await executeToolCalls(
            outcome.assistantMessage.tool_calls,
            abortController,
            { adapter, toolExecutor },
          );
          if (!shouldContinue) {
            // Abort signaled mid-execution (P1-1): calls completed BEFORE the
            // abort keep their commits; the in-flight call skips both its
            // UI-state and tool-message commits.
            // P1-2 (⑩): the committed assistant's un-executed tool_calls are
            // now dangling (finishReason='tool_calls', no paired tool
            // response) — this is the abort-mid-executor fallback surface:
            // drop (empty content) or strip only the unpaired entries.
            cleanDanglingAssistantAt(adapter, outcome.assistantIndex);
            return;
          }
          // Continue the loop → next runOnce will include the tool messages.
          needsFollowUp = true;
        } else {
          needsFollowUp = false;
        }
      }

      // Unless aborted, mark the turn completed.
      adapter.mutate('requestState', (draft) => {
        if (draft.requestState === 'aborted') return;
        // K1 (ai-invariant-loop): controller-identity guard parity with the
        // catch/finally paths — a stale turn whose abort raced a new
        // `sendMessage` (abort during `plugin.onTurnStart`, try-outer) must
        // not write 'completed' over the new turn's in-flight state.
        if (draft.abortController !== abortController) return;
        draft.requestState = 'completed';
        draft.isProcessing = false;
        draft.processingState = undefined;
      });
    } catch (error) {
      const aborted = abortController.signal.aborted;
      // ⑧ multi P2-1: a pre-runOnce throw (onTurnStart rejection) must clear
      // the pending stamp — consumed only by runOnce (see bug note 137).
      pendingBranchId = undefined;
      // ⑨ (ai-invariant-loop): a throwing onError must not skip the state
      // write below (it used to propagate out of the catch and reject the
      // host-facing promise with the turn stuck mid-state).
      callPluginError(abortController, error);
      adapter.mutate('requestState', (draft) => {
        // P1#1 controller-identity guard: a stale turn whose abort raced a new
        // `sendMessage` must not overwrite the new turn's requestState /
        // isProcessing / lastError. Only act when this turn still owns the
        // current controller.
        if (draft.abortController !== abortController) return;
        draft.requestState = aborted ? 'aborted' : 'error';
        draft.isProcessing = false;
        draft.processingState = undefined;
        // AI-19 (engine-half): expose the real caught error on state so the
        // renderer can feed `onError({ error: state.lastError ?? ... })`.
        if (!aborted) draft.lastError = error;
      });
    } finally {
      adapter.mutate('full', (draft) => {
        // P1#1: only clear the controller this turn created — never clobber a
        // new turn's controller that replaced it during an abort→send race.
        if (draft.abortController === abortController) {
          draft.abortController = null;
        }
      });
      for (const plugin of plugins) {
        // K-⑨-1 (ai-invariant-loop): isolate onTurnEnd rejections — an aborted
        // turn's plugin teardown failure must NOT reject the host-facing
        // promise (`void engine.sendMessage()` → unhandled rejection). The
        // error is recorded via lastError only when the turn has no prior
        // error to keep (a failed round keeps its original error; an aborted
        // round records the teardown failure without changing its terminal
        // state).
        try {
          await plugin.onTurnEnd?.(buildContext(abortController));
        } catch (error) {
          adapter.mutate('requestState', (draft) => {
            if (draft.abortController !== abortController) return;
            if (draft.lastError) return;
            draft.lastError = error;
          });
        }
      }
    }
  }

  /**
   * ⑨ (ai-invariant-loop): forward a turn error to every plugin's onError,
   * isolating per-plugin rejections so a throwing onError can neither skip
   * the engine's own state write nor propagate to the host-facing promise.
   */
  function callPluginError(abortController: AbortController, error: unknown): void {
    for (const plugin of plugins) {
      try {
        plugin.onError?.(buildContext(abortController), error);
      } catch {
        // Isolated: plugin errors never change the turn's outcome.
      }
    }
  }

  /** Outcome of a single streaming round. */
  type RunOnceOutcome =
    | {
        kind: 'ok';
        finishReason?: string;
        assistantMessage: ChatMessage;
        /** P1-2 (⑩): index of the committed assistant — cleanup surface target. */
        assistantIndex: number;
      }
    | { kind: 'error' }
    | { kind: 'aborted' };

  /**
   * Run one streaming request round: create an assistant placeholder, stream
   * chunks into it, fire plugin hooks, and commit. The caller decides whether
   * to follow up (tool_calls) from the returned finish reason.
   */
  async function runOnce(
    connector: AiConnector,
    abortController: AbortController,
  ): Promise<RunOnceOutcome> {
    let assistant: ChatMessage = adapter.createMessage({
      id: generateMessageId('ai'),
      role: 'assistant',
      content: '',
      loading: true,
      metadata: {
        createdAt: Date.now(),
        // A-16: stamp the turn's branch id onto the primary assistant message
        // (consumed once per turn so tool-loop follow-ups stay untagged).
        ...(pendingBranchId ? { branchId: pendingBranchId } : {}),
      },
    });
    // Consume the pending stamp regardless of the branch outcome (only the
    // primary assistant message of a turn carries the branch id).
    pendingBranchId = undefined;
    // AI-23: cache the assistant placeholder's index once (O(1) commit per
    // chunk instead of an O(n) `lastIndexOf` + `slice` scan per chunk).
    let assistantIndex = -1;
    adapter.mutate('messages', (draft) => {
      draft.messages.push(assistant);
      assistantIndex = draft.messages.length - 1;
      draft.processingState = 'completing';
    });

    const ctx = buildContext(abortController);
    // K-⑩-2 (ai-invariant-loop): `onBeforeRequest` must be inside the cleanup
    // surface. The placeholder is pushed above; a rejection here would
    // otherwise leave a permanent `loading:true` ghost (runOnce's try/catch
    // never runs). Drop the never-committed placeholder, then rethrow so
    // runTurn's catch settles the turn state.
    try {
      for (const plugin of plugins) {
        await plugin.onBeforeRequest?.(ctx);
      }
    } catch (error) {
      commitOrDropResidue();
      throw error;
    }

    /** Commit the working `assistant` draft into state with a fresh reference. */
    function commitAssistant(): void {
      if (assistantIndex < 0) return;
      adapter.mutate('messages', (draft) => {
        if (assistantIndex < draft.messages.length) {
          draft.messages[assistantIndex] = { ...assistant };
          assistant = draft.messages[assistantIndex];
        }
      });
    }

    /**
     * K-⑩ (ai-invariant-loop): terminal commit. A vacuous empty product
     * (`content:''` + no finishReason — failed / aborted / zero-chunk round)
     * is REMOVED instead of committed, so it can never enter the next request
     * history or an autoSave snapshot. Partial content is committed as before.
     */
    function commitOrDropResidue(): void {
      if (assistantIndex < 0) return;
      if (isVacuousAssistantResidue(assistant)) {
        adapter.mutate('messages', (draft) => {
          if (assistantIndex < draft.messages.length) {
            draft.messages.splice(assistantIndex, 1);
            assistantIndex = -1;
          }
        });
        return;
      }
      commitAssistant();
    }

    try {
      const generator = await connector.stream(ctx.request);
      // K2: register the in-flight generator so abort() can force-terminate
      // it; cleared on every exit from the consume loop below.
      activeGenerator = generator;
      let firstChunkReceived = false;
      let lastFinishReason: string | undefined;
      let lastMetadata: ChatMessageMetadata | undefined;
      try {
        for await (const chunk of generator) {
          // K2: per-iteration abort check — a signal-ignoring connector that
          // keeps yielding after abort must not have its late chunks applied
          // (break also triggers AsyncIteratorClose → cooperative generators
          // settle via their `.return()`).
          if (abortController.signal.aborted) break;
          if (!firstChunkReceived) {
            firstChunkReceived = true;
            assistant.loading = false;
          }
          applyChunk(assistant, chunk);
          if (chunk.finishReason) lastFinishReason = chunk.finishReason;
          if (chunk.metadata) lastMetadata = chunk.metadata;
          for (const plugin of plugins) {
            plugin.onCompletionChunk?.(ctx, chunk, assistant);
          }
          commitAssistant();
        }
      } finally {
        // The generator is consumed (or being closed); drop the handle so a
        // subsequent abort() has nothing stale to terminate.
        if (activeGenerator === generator) activeGenerator = undefined;
      }

      if (!firstChunkReceived) {
        assistant.loading = false;
      }
      if (lastFinishReason) {
        assistant.metadata = { ...assistant.metadata, finishReason: lastFinishReason };
      }
      if (lastMetadata) {
        assistant.metadata = { ...assistant.metadata, ...lastMetadata };
      }

      for (const plugin of plugins) {
        await plugin.onAfterRequest?.(ctx, assistant);
      }
      commitOrDropResidue();

      if (abortController.signal.aborted) {
        // P1-2 (⑩, surface 1 of 3): the round ended with
        // finishReason='tool_calls' but no tool response exists — drop the
        // empty assistant / strip tool_calls (text kept).
        cleanDanglingAssistantAt(adapter, assistantIndex);
        adapter.mutate('requestState', (draft) => {
          // P1#1 controller-identity guard: the post-stream abort check must
          // not overwrite a new turn's state when this turn was aborted and a
          // new `sendMessage` started while the stream was completing.
          if (draft.abortController !== abortController) return;
          draft.requestState = 'aborted';
          draft.isProcessing = false;
          draft.processingState = undefined;
        });
        return { kind: 'aborted' };
      }
      return {
        kind: 'ok',
        finishReason: lastFinishReason,
        assistantMessage: assistant,
        assistantIndex,
      };
    } catch (error) {
      assistant.loading = false;
      commitOrDropResidue();
      const aborted = abortController.signal.aborted;
      // ⑨ (ai-invariant-loop): isolate a throwing onError so the state write
      // below is never skipped.
      callPluginError(abortController, error);
      adapter.mutate('requestState', (draft) => {
        // P1#1 controller-identity guard: this is the PRIMARY abort→send race
        // path — the stream rejected mid-stream after abort, while a new turn
        // may already own the controller. Do not clobber the new turn's state.
        if (draft.abortController !== abortController) return;
        draft.requestState = aborted ? 'aborted' : 'error';
        draft.isProcessing = false;
        draft.processingState = undefined;
        // AI-19 (engine-half): connector throws land here — write the real
        // error to state (not just forward to plugin.onError).
        if (!aborted) draft.lastError = error;
      });
      return aborted ? { kind: 'aborted' } : { kind: 'error' };
    }
  }

  function buildContext(abortController: AbortController): MessageEngineContext {
    // ⑪ (2026-08-10 multi-audit, open P1-1 + P1-5): the request payload is
    // array + element isolated from the live message list and wire-projected
    // (renderer-private state / internal metadata stripped) — see
    // `build-context.ts`. A plugin mutating `ctx.request.messages` cannot
    // write through into engine history.
    return buildEngineContext({
      engine,
      messages: adapter.getState().messages,
      state: adapter.getState(),
      systemPrompt,
      tools: hostTools,
      extraRequestParams,
      signal: abortController.signal,
    });
  }

  function adapterStateConnector(): AiConnector | null {
    return adapter.getConnector();
  }

  async function abort(): Promise<void> {
    const controller = adapter.getAbortController();
    if (!controller) return;
    controller.abort();
    // K2: best-effort forced termination of the in-flight generator. A
    // generator suspended at a `yield` settles immediately on `.return()`;
    // a generator stuck inside its own internal await cannot be preempted
    // (connector contract violation — see engine.md §Invariants). Swallow the
    // return-completion rejection: the stream's own catch path reports it.
    const generator = activeGenerator;
    if (generator) {
      // The value is ignored by the for-await consumer (done=true); an empty
      // chunk satisfies the TS return() signature.
      Promise.resolve(generator.return({})).catch(() => {});
    }
    // F1.6: set requestState synchronously so callers observe `aborted`
    // immediately (the stream's catch block also sets it after it unblocks).
    adapter.mutate('requestState', (draft) => {
      draft.requestState = 'aborted';
      draft.isProcessing = false;
    });
  }

  function clear(): void {
    // Reject clear while a turn is in-flight: callers should `abort()` first.
    // This matches the design (`ai:clear` is a hard reset; clearing mid-stream
    // would race the streaming accumulator).
    if (adapter.getState().isProcessing) {
      return;
    }
    adapter.mutate('full', (draft) => {
      draft.messages = [];
      draft.requestState = 'idle';
      draft.isProcessing = false;
      draft.processingState = undefined;
    });
  }

  /**
   * A-16 message branches: drop the trailing assistant turn and re-run the
   * request, stamping the new assistant message's `metadata.branchId`. The
   * engine stores NO branch set; the host owns full branch history. The branch
   * id advances from the prior assistant's branchId when the host omits one.
   */
  async function regenerate(branchId?: string): Promise<void> {
    if (adapter.getState().isProcessing) {
      return;
    }
    const current = adapter.getState().messages;
    // Find the last user message — everything after it is the assistant turn to
    // regenerate. If there is no preceding user message, there is nothing to
    // re-request.
    const lastUserIdx = findLastUserIndex(current);
    if (lastUserIdx < 0) return;

    // Determine the branch id: explicit > advance prior > new sequence.
    const priorBranchId = findPriorAssistantBranchId(current, lastUserIdx + 1);
    const nextBranchId = branchId ?? branchSeq.next(priorBranchId);

    // Truncate to [0..lastUserIdx] (keep the user prompt; drop the old turn).
    adapter.mutate('messages', (draft) => {
      draft.messages = draft.messages.slice(0, lastUserIdx + 1);
    });

    pendingBranchId = nextBranchId;
    // Re-run the turn with no new incoming messages — runOnce streams a fresh
    // assistant message using the existing (now user-terminated) history.
    await runTurn([]);
  }

  return engine;
}
