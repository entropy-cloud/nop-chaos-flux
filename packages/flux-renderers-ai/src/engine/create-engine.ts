import {
  combineDeltaData,
  generateMessageId,
} from './utils.js';
import { createNativeMessageAdapter } from './native-adapter.js';
import type {
  AiConnector,
  AiConnectorChunk,
  AiConnectorRequest,
  AiToolSchema,
  ChatMessage,
  ChatMessageContentPart,
  ChatMessageMetadata,
  ChatToolCall,
  ChatToolCallUIState,
  InternalMessageState,
  MessageEngine,
  MessageEngineContext,
  MessageEnginePlugin,
  MessageEngineState,
  MessageStateAdapter,
  MessageStateSubscribe,
  ToolExecutionResult,
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
   * model can react to the result (engine.md §8.3). Omitting this makes
   * `finish_reason:'tool_calls'` transition the engine to `error`
   * (`tool-no-executor`).
   */
  toolExecutor?: ToolExecutor | null;
  /** Max consecutive tool-calling rounds before the loop terminates (default 8). */
  maxToolRounds?: number;
}

/**
 * Create a framework-agnostic message engine. Ported from tiny-robot
 * `kit/src/message/core/engine.ts`, rewritten without Vue/React coupling.
 *
 * State lives in the injected `MessageStateAdapter` (native by default). The
 * engine owns the turn lifecycle: idle → processing → completed/aborted/error,
 * streaming accumulation via `combineDeltaData`, and plugin fan-out.
 *
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
    // Bind so `engine.subscribe` is safe to pass directly to React's
    // `useSyncExternalStore` (stable identity, correct `this`).
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
    regenerate,
  };

  // A-16: branch-id sequence. The engine assigns `branch-<n>` when the host
  // does not pass an explicit id; the host owns the full branch set.
  let branchSeq = 0;
  // Branch id pending-stamp for the next assistant message created in a turn
  // (consumed once by `runOnce`). Undefined for normal turns (no branch).
  let pendingBranchId: string | undefined;

  function getState(): MessageEngineState {
    return adapter.getState();
  }

  function setConnector(connector: AiConnector): void {
    // Idempotent: skip when the same connector reference is re-assigned (avoids
    // a spurious notify when the host effect re-runs on mount).
    if ((adapter as unknown as { state: InternalMessageState }).state.connector === connector) {
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
    return adapter.getState().messages;
  }

  function setMessages(messages: ChatMessage[]): void {
    // Reject replacement while a turn is in-flight: callers should `abort()`
    // first (mirrors `clear`'s guard). Avoids racing the streaming accumulator.
    if ((adapter as unknown as { state: InternalMessageState }).state.isProcessing) {
      return;
    }
    adapter.mutate('full', (draft) => {
      draft.messages = messages.map((m) => ({ ...m }));
      draft.requestState = 'idle';
      draft.isProcessing = false;
      draft.processingState = undefined;
    });
  }

  function isEmptyContent(content: string | ChatMessageContentPart[]): boolean {
    if (typeof content === 'string') return content.trim().length === 0;
    if (Array.isArray(content)) return content.length === 0;
    return true;
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
    const connector = adapterStateConnector();
    if (!connector) {
      adapter.mutate('requestState', (draft) => {
        draft.messages.push(...incomingMessages);
        draft.requestState = 'error';
        draft.isProcessing = false;
      });
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
    });

    // Fire onTurnStart once for the whole turn (NOT per round) so the plugin
    // hook order stays: turnStart → (beforeRequest → chunks → afterRequest)* → turnEnd.
    const turnCtx = buildContext(abortController);
    for (const plugin of plugins) {
      await plugin.onTurnStart?.(turnCtx);
    }

    try {
      let rounds = 0;
      // Prime the loop: the first request uses the full conversation history.
      let needsFollowUp = true;
      while (needsFollowUp) {
        if (abortController.signal.aborted) break;
        if (rounds >= maxToolRounds) {
          // Failure Path `tool-loop-max`: terminate the loop, record cause.
          const last = adapter.getState().messages.at(-1);
          if (last) {
            last.metadata = { ...last.metadata, toolLoopMaxReached: true };
          }
          adapter.mutate('messages', (draft) => {
            const tail = draft.messages[draft.messages.length - 1];
            if (tail) draft.messages[draft.messages.length - 1] = { ...tail };
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
            adapter.mutate('requestState', (draft) => {
              draft.requestState = 'error';
              draft.isProcessing = false;
              draft.processingState = undefined;
            });
            for (const plugin of plugins) {
              plugin.onError?.(buildContext(abortController), new Error('tool-no-executor'));
            }
            return;
          }
          // Execute each tool_call, append role:'tool' result messages, then
          // loop again to issue the follow-up request.
          const shouldContinue = await executeToolCalls(
            outcome.assistantMessage.tool_calls,
            abortController,
          );
          if (!shouldContinue) {
            // Abort signaled mid-execution.
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
        draft.requestState = 'completed';
        draft.isProcessing = false;
        draft.processingState = undefined;
      });
    } catch (error) {
      const aborted = abortController.signal.aborted;
      for (const plugin of plugins) {
        plugin.onError?.(buildContext(abortController), error);
      }
      adapter.mutate('requestState', (draft) => {
        draft.requestState = aborted ? 'aborted' : 'error';
        draft.isProcessing = false;
        draft.processingState = undefined;
      });
    } finally {
      adapter.mutate('full', (draft) => {
        draft.abortController = null;
      });
      for (const plugin of plugins) {
        await plugin.onTurnEnd?.(buildContext(abortController));
      }
    }
  }

  /** Outcome of a single streaming round. */
  type RunOnceOutcome =
    | { kind: 'ok'; finishReason?: string; assistantMessage: ChatMessage }
    | { kind: 'error' }
    | { kind: 'aborted' };

  /**
   * Run one streaming request round: create an assistant placeholder, stream
   * chunks into it, fire plugin hooks, and commit. The caller decides whether
   * to follow up (tool_calls) based on the returned finish reason.
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
    adapter.mutate('messages', (draft) => {
      draft.messages.push(assistant);
      draft.processingState = 'completing';
    });

    const ctx = buildContext(abortController);
    for (const plugin of plugins) {
      await plugin.onBeforeRequest?.(ctx);
    }

    /** Commit the working `assistant` draft into state with a fresh reference. */
    function commitAssistant(): void {
      adapter.mutate('messages', (draft) => {
        const idx = draft.messages.lastIndexOf(assistant);
        draft.messages = draft.messages.slice();
        if (idx >= 0) {
          draft.messages[idx] = { ...assistant };
          assistant = draft.messages[idx];
        }
      });
    }

    try {
      const generator = await connector.stream(ctx.request);
      let firstChunkReceived = false;
      let lastFinishReason: string | undefined;
      let lastMetadata: ChatMessageMetadata | undefined;

      for await (const chunk of generator) {
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
      commitAssistant();

      if (abortController.signal.aborted) {
        adapter.mutate('requestState', (draft) => {
          draft.requestState = 'aborted';
          draft.isProcessing = false;
          draft.processingState = undefined;
        });
        return { kind: 'aborted' };
      }
      return { kind: 'ok', finishReason: lastFinishReason, assistantMessage: assistant };
    } catch (error) {
      assistant.loading = false;
      commitAssistant();
      const aborted = abortController.signal.aborted;
      for (const plugin of plugins) {
        plugin.onError?.(ctx, error);
      }
      adapter.mutate('requestState', (draft) => {
        draft.requestState = aborted ? 'aborted' : 'error';
        draft.isProcessing = false;
        draft.processingState = undefined;
      });
      return aborted ? { kind: 'aborted' } : { kind: 'error' };
    }
  }

  /**
   * Execute each `tool_call` via the host executor, append `role:'tool'`
   * messages, and update `state.toolCall[id].status`. Returns `false` if the
   * abort signal fired mid-execution (caller should stop the loop).
   * (engine.md §8.3, Failure Path `tool-exec-failed`.)
   */
  async function executeToolCalls(
    calls: ChatToolCall[],
    abortController: AbortController,
  ): Promise<boolean> {
    adapter.mutate('requestState', (draft) => {
      draft.processingState = 'calling-tools';
    });
    // Pull the assistant message that owns these tool_calls (last message).
    const owner = adapter.getState().messages.at(-1);
    for (const call of calls) {
      if (abortController.signal.aborted) return false;
      const key = call.id ?? `idx-${call.index}`;
      let resultText = '';
      let status: 'success' | 'failed' = 'success';
      try {
        const raw = await toolExecutor!({ toolCall: call, signal: abortController.signal });
        const normalized = normalizeToolResult(raw);
        if (normalized.ok) {
          resultText = normalized.result ?? '';
          status = 'success';
        } else {
          resultText = normalized.error ?? '';
          status = 'failed';
        }
      } catch (err) {
        resultText = err instanceof Error ? err.message : String(err);
        status = 'failed';
      }
      // Update per-call UI state on the owning assistant message.
      if (owner) {
        if (!owner.state) owner.state = {};
        const toolCallState = (owner.state.toolCall ?? {}) as Record<string, ChatToolCallUIState>;
        toolCallState[key] = {
          ...(toolCallState[key] ?? { status: 'running' }),
          status,
          result: resultText,
        };
        owner.state.toolCall = toolCallState;
        // Commit a fresh reference so subscribers re-render.
        adapter.mutate('messages', (draft) => {
          const idx = draft.messages.lastIndexOf(owner);
          if (idx >= 0) draft.messages[idx] = { ...owner };
        });
      }
      // Append the role:'tool' result message so the next request carries it.
      const toolMessage: ChatMessage = adapter.createMessage({
        id: generateMessageId('tool'),
        role: 'tool',
        content: resultText,
        tool_call_id: call.id,
        name: call.function.name,
        metadata: { createdAt: Date.now(), toolStatus: status },
      });
      adapter.mutate('messages', (draft) => {
        draft.messages.push(toolMessage);
      });
    }
    return true;
  }

  function buildContext(abortController: AbortController): MessageEngineContext {
    const allMessages = adapter.getState().messages;
    // Exclude the trailing in-progress assistant placeholder from the request
    // payload (it carries empty content while being streamed). The original
    // single-turn engine did `messages.slice(0, -1)`; this preserves that while
    // also working for follow-up rounds where the last message is the freshly
    // pushed placeholder of the current round.
    const isPlaceholder = allMessages.length > 0 && isStreamingAssistantPlaceholder(allMessages[allMessages.length - 1]);
    const history = isPlaceholder ? allMessages.slice(0, -1) : allMessages;
    const requestMessages: ChatMessage[] = systemPrompt
      ? [{ id: 'system-prompt', role: 'system', content: systemPrompt }, ...history]
      : history;
    const request: AiConnectorRequest = {
      messages: requestMessages,
      signal: abortController.signal,
      ...(hostTools && hostTools.length > 0 ? { tools: hostTools } : {}),
      ...extraRequestParams,
    };
    return {
      engine,
      state: adapter.getState(),
      request,
      signal: abortController.signal,
    };
  }

  function isStreamingAssistantPlaceholder(message: ChatMessage): boolean {
    return message.role === 'assistant' && message.content === '' && message.loading === true;
  }

  function applyChunk(message: ChatMessage, chunk: AiConnectorChunk): void {
    if (chunk.delta) {
      combineDeltaData(message, chunk.delta);
    }
    if (chunk.snapshot) {
      combineDeltaData(message, chunk.snapshot);
    }
  }

  function adapterStateConnector(): AiConnector | null {
    return (adapter as unknown as { state: InternalMessageState }).state.connector;
  }

  async function abort(): Promise<void> {
    const controller = (adapter as unknown as { state: InternalMessageState }).state.abortController;
    if (!controller) return;
    controller.abort();
    adapter.mutate('requestState', () => {
      // requestState is updated by the stream's catch block (aborted branch);
      // set it here too so synchronous abort is observable immediately.
    });
    adapter.mutate('requestState', (draft) => {
      draft.requestState = 'aborted';
      draft.isProcessing = false;
    });
  }

  function clear(): void {
    // Reject clear while a turn is in-flight: callers should `abort()` first.
    // This matches the design (`ai:clear` is a hard reset; clearing mid-stream
    // would race the streaming accumulator).
    if ((adapter as unknown as { state: InternalMessageState }).state.isProcessing) {
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
    if ((adapter as unknown as { state: InternalMessageState }).state.isProcessing) {
      return;
    }
    const current = adapter.getState().messages;
    // Find the last user message — everything after it is the assistant turn to
    // regenerate. If there is no preceding user message, there is nothing to
    // re-request.
    let lastUserIdx = -1;
    for (let i = current.length - 1; i >= 0; i--) {
      if (current[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx < 0) return;

    // Determine the branch id: explicit > advance prior > new sequence.
    const priorAssistant = current
      .slice(lastUserIdx + 1)
      .find((m) => m.role === 'assistant' && typeof m.metadata?.branchId === 'string');
    const nextBranchId =
      branchId ?? advanceBranchId(priorAssistant?.metadata?.branchId as string | undefined);

    // Truncate to [0..lastUserIdx] (keep the user prompt; drop the old turn).
    adapter.mutate('messages', (draft) => {
      draft.messages = draft.messages.slice(0, lastUserIdx + 1);
    });

    pendingBranchId = nextBranchId;
    // Re-run the turn with no new incoming messages — runOnce streams a fresh
    // assistant message using the existing (now user-terminated) history.
    await runTurn([]);
  }

  function advanceBranchId(prev?: string): string {
    if (!prev) {
      branchSeq += 1;
      return `branch-${branchSeq}`;
    }
    const m = /^(.*?)(\d+)$/.exec(prev);
    if (m) return `${m[1]}${parseInt(m[2], 10) + 1}`;
    branchSeq += 1;
    return `branch-${branchSeq}`;
  }

  return engine;
}

/** Indirection so tests can inject a fake controller. */
function createAbortController(): AbortController {
  return new AbortController();
}

/**
 * Normalize a `ToolExecutor` return value into a `ToolExecutionResult`. The
 * executor may return a plain string (success) or a structured result.
 */
function normalizeToolResult(raw: string | ToolExecutionResult): ToolExecutionResult {
  if (typeof raw === 'string') {
    return { ok: true, result: raw };
  }
  return raw;
}
