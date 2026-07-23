import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { useAiChatContext } from '../adapters/ai-chat-context.js';
import { useAutoScroll } from '../adapters/use-auto-scroll.js';
import type { ChatMessage } from '../engine/types.js';
import { AiBubbleView } from './ai-bubble/index.js';
import type { AiMessageListSchema } from '../schemas.js';

export interface AiMessageListViewProps {
  groupStrategy?: 'consecutive' | 'divider' | 'none';
  autoScroll?: boolean;
  className?: string;
  emptyNode?: React.ReactNode;
}

function messageContentSignature(message: ChatMessage): string {
  const content = message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((p) => (p && typeof p === 'object' && 'text' in p ? String((p as { text: unknown }).text) : '')).join('');
  return '';
}

/** Internal message-list view — reads engine + messages from ai-chat context. */
export function AiMessageListView(props: AiMessageListViewProps): React.ReactElement | null {
  const ctx = useAiChatContext();
  const messages = ctx?.messages ?? [];
  const autoScrollEnabled = props.autoScroll !== false;

  // Trigger value changes whenever the message count or the streaming tail
  // grows, so the auto-scroll hook can pin to bottom during streaming.
  const lastMessage = messages[messages.length - 1];
  const trigger = `${messages.length}:${lastMessage ? messageContentSignature(lastMessage).length : 0}`;
  const { containerRef, onScroll } = useAutoScroll(autoScrollEnabled ? trigger : null);

  if (messages.length === 0) {
    return (
      <div
        className={cn('nop-ai-message-list')}
        data-slot="ai-message-list"
        data-empty=""
        role="log"
        aria-live="polite"
        aria-busy={ctx?.isProcessing ? 'true' : undefined}
      >
        {props.emptyNode ?? null}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('nop-ai-message-list', props.className)}
      data-slot="ai-message-list"
      role="log"
      aria-live="polite"
      aria-busy={ctx?.isProcessing ? 'true' : undefined}
      onScroll={onScroll}
    >
      {messages.map((message) => (
        <AiBubbleView key={message.id} message={message} />
      ))}
    </div>
  );
}

/** Registered renderer: reads config from props, delegates to the list view. */
export function AiMessageListRenderer(props: RendererComponentProps<AiMessageListSchema>): RendererRenderOutput {
  const resolved = props.props;
  const emptyNode = props.regions.emptyRegion ? (props.regions.emptyRegion.render() as React.ReactNode) : undefined;

  return (
    <AiMessageListView
      groupStrategy={resolved.groupStrategy}
      autoScroll={resolved.autoScroll}
      className={props.meta.className}
      emptyNode={emptyNode}
    />
  );
}
