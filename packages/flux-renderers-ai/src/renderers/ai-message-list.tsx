import { useVirtualizer } from '@tanstack/react-virtual';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { useAiChatContext } from '../adapters/ai-chat-context.js';
import { useAutoScroll } from '../adapters/use-auto-scroll.js';
import type { ChatMessage } from '../engine/types.js';
import { AiBubbleView } from './ai-bubble/index.js';
import { ListErrorBanner } from './ai-bubble/renderers/error.js';
import type { AiMessageListSchema } from '../schemas.js';

export interface AiMessageListViewProps {
  autoScroll?: boolean;
  className?: string;
  emptyNode?: React.ReactNode;
  testid?: string;
  cid?: number;
  /** A-4: forward to every bubble so `metadata.createdAt` renders as a time footer. */
  showTimestamp?: boolean;
  /**
   * P2-4 (2026-08-10 multi-audit): HITL approval for the bubble path —
   * forwarded from the ai-chat context to every bubble so a pending tool-call
   * card can approve/reject.
   */
  onApproval?: (action: 'approve' | 'reject') => void;
}

/** A-8: message count above which windowed virtual rendering kicks in. */
const VIRTUAL_SCROLL_THRESHOLD = 200;

/**
 * R1-F1 (2026-08-11): tool-loop-max termination note. Rendered when the LAST
 * assistant message carries `metadata.toolLoopMaxReached` — the engine wrote
 * the marker onto the assistant that triggered the loop-limit break (NOT the
 * `role:'tool'` tail). Non-error state, no action bar: the paired tool cards
 * above keep their committed terminal status and stay user-visible.
 */
function LoopLimitNote(): React.ReactElement {
  return (
    <div
      data-slot="ai-message-list-loop-limit"
      className="flex items-center gap-2 px-1 pb-1 text-xs text-muted-foreground"
      role="status"
    >
      {t('flux.ai.toolLoopMaxReached')}
    </div>
  );
}

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
  const cid = props.cid;

  const lastMessage = messages[messages.length - 1];
  // R1-F1: the loop-max marker is consumed at message-list level — the marker
  // carrier is the LAST ASSISTANT (the engine skips the trailing role:'tool'
  // messages executeToolCalls appended, and so does the consumer), and it
  // drives the termination note.
  let carrierIdx = messages.length - 1;
  while (carrierIdx >= 0 && messages[carrierIdx].role === 'tool') {
    carrierIdx -= 1;
  }
  const markerCarrier = carrierIdx >= 0 ? messages[carrierIdx] : undefined;
  const loopLimitReached =
    markerCarrier?.role === 'assistant' && markerCarrier.metadata?.toolLoopMaxReached === true;
  // FIND-03 (A-5): a failed turn whose assistant residue was dropped (invariant
  // ⑩ — zero-chunk / auth / pre-first-byte / onBeforeRequest failures) leaves
  // the user message as the tail; the bubble-level error renderer (bound to a
  // trailing assistant) can never fire, so the list-level error banner takes
  // over as the A-5 error carrier.
  const showListErrorBanner =
    inError && messages.length > 0 && lastMessage?.role !== 'assistant';
  const trigger = `${messages.length}:${lastMessage ? messageContentSignature(lastMessage).length : 0}:${loopLimitReached ? 1 : 0}`;
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
        className={cn('nop-ai-message-list', props.className)}
        data-slot="ai-message-list"
        data-empty=""
        data-cid={cid || undefined}
        data-testid={props.testid || undefined}
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
      data-virtual={enableVirtual ? '' : undefined}
      data-cid={cid || undefined}
      data-testid={props.testid || undefined}
      role="log"
      aria-live="polite"
      aria-busy={ctx?.isProcessing ? 'true' : undefined}
      onScroll={onScroll}
    >
      {enableVirtual ? (
        <>
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
                    showTimestamp={props.showTimestamp}
                    branches={ctx?.branches}
                    activeBranchId={ctx?.activeBranchId}
                    onBranchChange={ctx?.onBranchChange}
                    onApproval={ctx?.onApproval}
                  />
                </div>
              );
            })}
          </div>
          {loopLimitReached ? <LoopLimitNote /> : null}
          {showListErrorBanner ? <ListErrorBanner messages={messages} sendMessage={ctx?.sendMessage} /> : null}
        </>
      ) : (
        <>
          {messages.map((message, idx) => (
            <AiBubbleView
              key={message.id}
              message={message}
              isError={inError && idx === messages.length - 1 && message.role === 'assistant'}
              showTimestamp={props.showTimestamp}
              branches={ctx?.branches}
              activeBranchId={ctx?.activeBranchId}
              onBranchChange={ctx?.onBranchChange}
              onApproval={ctx?.onApproval}
            />
          ))}
          {loopLimitReached ? <LoopLimitNote /> : null}
          {showListErrorBanner ? <ListErrorBanner messages={messages} sendMessage={ctx?.sendMessage} /> : null}
        </>
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
      testid={props.meta.testid}
      cid={props.meta.cid}
      showTimestamp={resolved.showTimestamp === true}
    />
  );
}
