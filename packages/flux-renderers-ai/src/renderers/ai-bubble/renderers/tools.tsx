import type { ChatMessage, ChatToolCall, ChatToolCallUIState } from '../../../engine/types.js';
import type { BubbleContentRendererProps } from '../types.js';
import { resolveToolRenderer, type BubbleToolRendererMatch } from '../types.js';
import { FallbackToolCallCard } from '../../ai-tool-call.js';

/**
 * `tools` bubble content renderer (design.md §3.3). Matches assistant
 * messages carrying `tool_calls` and renders each as a tool card via the A-6
 * `BubbleToolRendererMatch` registry. Hosts register dedicated cards (e.g. a
 * weather widget) via `xui:imports`; unmatched tools fall back to the generic
 * `AiToolCallRenderer`.
 *
 * Registered at `CONTENT` priority so it does not get shadowed by markdown.
 */
export interface ToolsContentRendererProps extends BubbleContentRendererProps {
  /** Host-injected per-tool card registrations (A-6). */
  toolRenderers?: BubbleToolRendererMatch[];
}

export function ToolsContentRenderer(props: ToolsContentRendererProps): React.ReactElement | null {
  const { message } = props;
  const calls = message.tool_calls;
  if (!calls || calls.length === 0) return null;
  const registrations = props.toolRenderers;
  return (
    <div data-slot="ai-bubble-tools" className="flex flex-col gap-1">
      {calls.map((call) => {
        const key = call.id ?? `idx-${call.index}`;
        const state = resolveToolState(message, key);
        const match = resolveToolRenderer(registrations, call);
        if (match) {
          const Renderer = match.renderer;
          return (
            <Renderer
              key={key}
              message={message}
              toolCall={call}
              state={state}
              toolCallKey={key}
            />
          );
        }
        return (
          <FallbackToolCallCard
            key={key}
            message={message}
            toolCall={call}
            state={state}
            toolCallKey={key}
          />
        );
      })}
    </div>
  );
}

function resolveToolState(message: ChatMessage, key: string): ChatToolCallUIState {
  const map = message.state?.toolCall;
  if (map && map[key]) return map[key];
  return { status: 'running', open: false };
}

/** Match predicate: assistant message with at least one tool_call. */
export function toolsMatcher(message: ChatMessage): boolean {
  return message.role === 'assistant' && Array.isArray(message.tool_calls) && message.tool_calls.length > 0;
}

export type { ChatToolCall };
