import { generateMessageId } from './utils.js';
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
  // Pull the assistant message that owns these tool_calls (last message).
  const owner = adapter.getState().messages.at(-1);
  // AI-23: cache the owner index once; tool messages are appended AFTER the
  // owner so its position is stable across the loop (avoids per-call
  // `lastIndexOf` scan).
  const ownerIndex = owner ? adapter.getState().messages.length - 1 : -1;
  for (const call of calls) {
    if (abortController.signal.aborted) return false;
    const key = call.id ?? `idx-${call.index}`;
    let resultText = '';
    let status: 'success' | 'failed' = 'success';
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
      resultText = err instanceof Error ? err.message : String(err);
      status = 'failed';
    }
    // Update per-call UI state on the owning assistant message.
    if (owner && ownerIndex >= 0) {
      if (!owner.state) owner.state = {};
      const toolCallState = (owner.state.toolCall ?? {}) as Record<string, ChatToolCallUIState>;
      toolCallState[key] = {
        ...(toolCallState[key] ?? { status: 'running' }),
        status,
        result: resultText,
      };
      owner.state.toolCall = toolCallState;
      // Commit a fresh reference so subscribers re-render (assign by cached
      // index — no per-call `lastIndexOf` scan).
      adapter.mutate('messages', (draft) => {
        if (ownerIndex < draft.messages.length) {
          draft.messages[ownerIndex] = { ...owner };
        }
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
