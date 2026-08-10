import { cleanDanglingToolCalls, generateMessageId } from './utils.js';
import type {
  ChatMessage,
  ChatToolCall,
  ChatToolCallUIState,
  MessageStateAdapter,
  ToolExecutionResult,
  ToolExecutor,
} from './types.js';

/**
 * Tool-execution loop, extracted from `create-engine.ts` (AI-24 module-size
 * remediation). Executes each `tool_call` via the host executor, appends
 * `role:'tool'` result messages, and updates `state.toolCall[id].status`.
 *
 * Returns `false` if the abort signal fired mid-execution (caller stops the
 * loop). (engine.md §8.3, Failure Path `tool-exec-failed`.)
 *
 * Framework-agnostic: no `react`/DOM references.
 */
export interface ToolExecutionDeps {
  adapter: MessageStateAdapter;
  toolExecutor: ToolExecutor;
}

export async function executeToolCalls(
  calls: ChatToolCall[],
  abortController: AbortController,
  deps: ToolExecutionDeps,
): Promise<boolean> {
  const { adapter, toolExecutor } = deps;
  adapter.mutate('requestState', (draft) => {
    draft.processingState = 'calling-tools';
  });
  // AI-23: cache the owning assistant message's index once. Tool result
  // messages are appended AFTER the owner, so its position is stable across
  // the loop (no per-call `lastIndexOf` scan). The owner element itself is
  // read fresh inside each mutate recipe so the cached snapshot is never
  // mutated in place (snapshot identity contract).
  const ownerIndex = adapter.getState().messages.length - 1;
  for (const call of calls) {
    if (abortController.signal.aborted) return false;
    const key = call.id ?? `idx-${call.index}`;
    let resultText = '';
    let status: 'success' | 'failed' = 'success';
    // P2 error fidelity: preserves the original Error (cause/stack/custom
    // fields) when the executor throws. Written to the tool message's
    // `metadata.toolError` so hosts can structurally log tool failures
    // (FP `tool-error-flattened`). `undefined` on the success path.
    let toolError: Error | undefined;
    try {
      const raw = await toolExecutor({ toolCall: call, signal: abortController.signal });
      const normalized = normalizeToolResult(raw);
      if (normalized.ok) {
        resultText = normalized.result ?? '';
        status = 'success';
      } else {
        resultText = normalized.error ?? '';
        status = 'failed';
      }
    } catch (err) {
      // P2 error fidelity (FP `tool-error-flattened`): keep `resultText` as
      // the human-readable message (it ships as the `role:'tool'` message
      // content the model reads), but preserve the original Error on the
      // tool message's metadata (`toolError`) so hosts can structurally log
      // stack / cause / custom fields instead of only getting a flat string.
      // Non-Error throws are wrapped so `toolError` is always an Error.
      resultText = err instanceof Error ? err.message : String(err);
      status = 'failed';
      toolError = err instanceof Error ? err : new Error(String(err));
    }
    // P1-1 (2026-08-10 multi-audit): second abort check AFTER the executor
    // settled. The loop-top check only guarded the window before `await
    // toolExecutor(...)`; an abort that fires while the executor is suspended
    // (signal-aware reject → AbortError, or signal-ignoring resolve →
    // success) previously committed the late `role:'tool'` result message and
    // per-call UI state AFTER the turn already reached its terminal
    // 'aborted' state — the residue was then persisted by autoSave and fed to
    // the model on the next request. Aborted calls skip BOTH commits
    // (per-call UI state + tool message push) and short-circuit `false`, same
    // semantics as the loop-top check. Calls that completed BEFORE the abort
    // keep their commits (no rollback of settled calls).
    if (abortController.signal.aborted) return false;
    // Update per-call UI state on the owning assistant message — entirely
    // inside the mutate recipe (read-old → build-new → replace) so the cached
    // owner element is never mutated in place. The current owner is read from
    // `draft.messages[ownerIndex]` each iteration so accumulated per-call
    // state carries across calls without aliasing a stale cached object.
    if (ownerIndex >= 0) {
      adapter.mutate('messages', (draft) => {
        if (ownerIndex >= draft.messages.length) return;
        const current = draft.messages[ownerIndex];
        const prevToolCall = (current.state?.toolCall ?? {}) as Record<string, ChatToolCallUIState>;
        const toolCallState: Record<string, ChatToolCallUIState> = {
          ...prevToolCall,
          [key]: {
            ...(prevToolCall[key] ?? { status: 'running' }),
            status,
            result: resultText,
          },
        };
        draft.messages[ownerIndex] = {
          ...current,
          state: { ...current.state, toolCall: toolCallState },
        };
      });
    }
    // Append the role:'tool' result message so the next request carries it.
    const toolMessage: ChatMessage = adapter.createMessage({
      id: generateMessageId('tool'),
      role: 'tool',
      content: resultText,
      tool_call_id: call.id,
      name: call.function.name,
      metadata: { createdAt: Date.now(), toolStatus: status, ...(toolError ? { toolError } : {}) },
    });
    adapter.mutate('messages', (draft) => {
      draft.messages.push(toolMessage);
    });
  }
  return true;
}

/**
 * Normalize a `ToolExecutor` return value into a `ToolExecutionResult`. The
 * executor may return a plain string (success) or a structured result.
 */
export function normalizeToolResult(raw: string | ToolExecutionResult): ToolExecutionResult {
  if (typeof raw === 'string') {
    return { ok: true, result: raw };
  }
  return raw;
}

/**
 * P1-2 (⑩, 2026-08-10 multi-audit): apply the dangling-tool_calls policy to
 * the committed assistant at `index` (one of the three cleanup surfaces:
 * runOnce abort branch / tool-no-executor / abort-mid-executor return). The
 * element is read FRESH inside the mutate recipe (the caller's assistant
 * reference can be stale — `executeToolCalls` replaces the element with a new
 * object when it commits per-call UI state), and pairing is computed against
 * the current message list so already-committed tool responses keep their
 * owner. `index < 0` (already dropped by `commitOrDropResidue`) is a no-op.
 */
export function cleanDanglingAssistantAt(
  adapter: MessageStateAdapter,
  index: number,
): void {
  if (index < 0) return;
  adapter.mutate('messages', (draft) => {
    if (index >= draft.messages.length) return;
    const cleaned = cleanDanglingToolCalls(draft.messages[index], draft.messages);
    if (cleaned === null) {
      draft.messages.splice(index, 1);
    } else {
      draft.messages[index] = cleaned;
    }
  });
}

/**
 * R1-F1 (2026-08-11): stamp the tool-loop-max termination marker
 * (`metadata.toolLoopMaxReached`) onto the LAST ASSISTANT — the round that
 * triggered termination (`finishReason:'tool_calls'` + paired tool_calls),
 * located by skipping the `role:'tool'` result messages `executeToolCalls`
 * appended after it. The marker is written entirely inside the mutate recipe
 * (read-old → build-new → replace) so the cached snapshot's element is never
 * mutated in place (snapshot identity contract). The paired tool_calls are
 * intentionally NOT stripped — tool results stay user-visible (the normal
 * loop-max path has no dangling shape; see the `tool-loop-max: no dangling
 * shape` guard test and engine.md §Invariants ⑩ enumeration note).
 */
export function markToolLoopMaxReached(adapter: MessageStateAdapter): void {
  adapter.mutate('messages', (draft) => {
    let idx = draft.messages.length - 1;
    while (idx >= 0 && draft.messages[idx].role === 'tool') {
      idx -= 1;
    }
    const target = idx >= 0 ? draft.messages[idx] : undefined;
    if (target) {
      draft.messages[idx] = {
        ...target,
        metadata: { ...target.metadata, toolLoopMaxReached: true },
      };
    }
  });
}
