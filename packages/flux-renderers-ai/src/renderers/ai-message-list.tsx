import { useVirtualizer } from '@tanstack/react-virtual';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { useAiChatContext } from '../adapters/ai-chat-context.js';
import { useAutoScroll } from '../adapters/use-auto-scroll.js';
import type { ChatMessage } from '../engine/types.js';
import { AiBubbleView } from './ai-bubble/index.js';
import type { AiMessageListSchema } from '../schemas.js';

export interface AiMessageListViewProps {
  autoScroll?: boolean;
  className?: string;
  emptyNode?: React.ReactNode;
}

/** A-8: message count above which windowed virtual rendering kicks in. */
const VIRTUAL_SCROLL_THRESHOLD = 200;

function messageContentSignature(message: ChatMessage): string {
  const content = message.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content))
    return content
      .map((p) => (p && typeof p === 'object' && 'text' in p ? String((p as { text: unknown }).text) : ''))
      .join('');
  return '';
}

/** Internal message-list view — reads engine + messages from ai-chat context. */
export function AiMessageListView(props: AiMessageListViewProps): React.ReactElement | null {
  const ctx = useAiChatContext();
  const messages = ctx?.messages ?? [];
  const autoScrollEnabled = props.autoScroll !== false;
  const inError = ctx?.requestState === 'error';

  const lastMessage = messages[messages.length - 1];
  const trigger = `${messages.length}:${lastMessage ? messageContentSignature(lastMessage).length : 0}`;
  const { containerRef, onScroll } = useAutoScroll(autoScrollEnabled ? trigger : null);

  const enableVirtual = messages.length > VIRTUAL_SCROLL_THRESHOLD;
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual returns non-memoizable functions; React Compiler auto-skips this component
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 120,
    overscan: 6,
    enabled: enableVirtual,
  });

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
      className={cn('nop-ai-message-list min-h-0 flex-1 overflow-auto', props.className)}
      data-slot="ai-message-list"
      data-virtual={enableVirtual ? '' : undefined}
      role="log"
      aria-live="polite"
      aria-busy={ctx?.isProcessing ? 'true' : undefined}
      onScroll={onScroll}
    >
      {enableVirtual ? (
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const message = messages[vi.index];
            return (
              <div
                key={message.id}
                data-index={vi.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                <AiBubbleView
                  message={message}
                  isError={inError && vi.index === messages.length - 1 && message.role === 'assistant'}
                  branches={ctx?.branches}
                  activeBranchId={ctx?.activeBranchId}
                  onBranchChange={ctx?.onBranchChange}
                />
              </div>
            );
          })}
        </div>
      ) : (
        messages.map((message, idx) => (
          <AiBubbleView
            key={message.id}
            message={message}
            isError={inError && idx === messages.length - 1 && message.role === 'assistant'}
            branches={ctx?.branches}
            activeBranchId={ctx?.activeBranchId}
            onBranchChange={ctx?.onBranchChange}
          />
        ))
      )}
    </div>
  );
}

/** Registered renderer: reads config from props, delegates to the list view. */
export function AiMessageListRenderer(props: RendererComponentProps<AiMessageListSchema>): RendererRenderOutput {
  const resolved = props.props;
  const emptyNode = props.regions.emptyRegion ? (props.regions.emptyRegion.render() as React.ReactNode) : undefined;

  return (
    <AiMessageListView
      autoScroll={resolved.autoScroll}
      className={props.meta.className}
      emptyNode={emptyNode}
    />
  );
}
