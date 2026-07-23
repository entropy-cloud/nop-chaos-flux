import { useState } from 'react';
import type { RendererComponentProps, RendererRenderOutput } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import type { ChatMessage } from '../../engine/types.js';
import type { AiBubbleSchema } from '../../schemas.js';
import {
  BubbleRendererMatchPriority,
  resolveContentSlices,
  type BubbleContentRendererMatch,
} from './types.js';
import { defaultBubbleContentRenderers } from './renderers/default-renderers.js';
import { TimestampContentRenderer } from './renderers/timestamp.js';
import { UserMessageActions } from './user-edit.js';

export interface AiBubbleViewProps {
  message: ChatMessage;
  placement?: 'start' | 'end' | 'auto';
  shape?: 'corner' | 'rounded' | 'none';
  showAvatar?: boolean;
  showTimestamp?: boolean;
  contentRenderers?: BubbleContentRendererMatch[];
  /**
   * A-5 error wiring: when true, the bubble marks this message as the error
   * carrier (sets `data-error` + `message.metadata.isError` projection so the
   * `ErrorContentRenderer` matcher fires). Defaults to deriving from
   * `message.metadata.isError`.
   */
  isError?: boolean;
  className?: string;
}

function resolvePlacement(message: ChatMessage, placement: 'start' | 'end' | 'auto'): 'start' | 'end' {
  if (placement === 'start' || placement === 'end') return placement;
  return message.role === 'user' ? 'end' : 'start';
}

/**
 * Internal bubble view — renders a single `ChatMessage` using the registration
 * system. Used both by the registered `AiBubbleRenderer` (schema-driven) and
 * directly by `ai-message-list` (programmatic).
 *
 * P1: also renders an A-4 timestamp footer and the A-5 error-state renderer
 * (driven by `message.metadata.createdAt` and the message role + error state).
 */
export function AiBubbleView(props: AiBubbleViewProps): React.ReactElement | null {
  const {
    message,
    placement = 'auto',
    shape = 'rounded',
    showAvatar = false,
    showTimestamp = false,
    contentRenderers,
  } = props;
  const renderers = contentRenderers ?? defaultBubbleContentRenderers;
  const effectivePlacement = resolvePlacement(message, placement);
  const isStreaming = message.loading === true;
  // A-5 error state: bind to engine error state via the explicit `isError`
  // prop (passed by `ai-message-list` when `requestState==='error'` for the
  // in-flight assistant placeholder), or fall back to a metadata flag already
  // on the message. Presence-only: `data-error` omits when not in error.
  const isError = props.isError ?? message.metadata?.isError === true;
  // Project isError onto a derived message copy (do NOT mutate props) so the
  // `ErrorContentRenderer` matcher — which reads `message.metadata.isError` —
  // fires within the content stream.
  const renderMessage: ChatMessage =
    isError && message.metadata?.isError !== true
      ? { ...message, metadata: { ...message.metadata, isError: true } }
      : message;
  const slices = resolveContentSlices(renderMessage);

  // §4.7 message editing: user messages get an inline edit affordance; while
  // editing the normal content slices are hidden and the editor takes over.
  const isUser = renderMessage.role === 'user';
  const [isEditing, setIsEditing] = useState(false);

  return (
    <article
      className={cn('nop-ai-bubble', props.className)}
      data-slot="ai-bubble"
      data-role={renderMessage.role}
      data-placement={effectivePlacement}
      data-shape={shape}
      data-streaming={isStreaming ? '' : undefined}
      data-error={isError ? '' : undefined}
      data-editing={isUser && isEditing ? '' : undefined}
    >
      {showAvatar ? <div data-slot="ai-bubble-avatar" aria-hidden="true" /> : null}
      <div data-slot="ai-bubble-content" className="flex flex-col gap-2">
        {!(isUser && isEditing)
          ? slices.map((slice) => {
              const match = pickRenderer(renderers, renderMessage, slice.content, slice.index);
              if (!match) return null;
              const Renderer = match.renderer;
              return (
                <Renderer
                  key={slice.index}
                  message={renderMessage}
                  content={slice.content}
                  contentIndex={slice.index}
                />
              );
            })
          : null}
        {!(isUser && isEditing) && showTimestamp ? (
          <TimestampContentRenderer message={renderMessage} content="" contentIndex={-1} />
        ) : null}
        {isUser ? <UserMessageActions message={renderMessage} onEditingChange={setIsEditing} /> : null}
      </div>
    </article>
  );
}

function pickRenderer(
  renderers: BubbleContentRendererMatch[],
  message: ChatMessage,
  content: unknown,
  contentIndex: number,
): BubbleContentRendererMatch | undefined {
  // Sort by priority ascending (lower wins), then return first match.
  const ordered = [...renderers].sort(
    (a, b) => (a.priority ?? BubbleRendererMatchPriority.NORMAL) - (b.priority ?? BubbleRendererMatchPriority.NORMAL),
  );
  for (const candidate of ordered) {
    try {
      if (candidate.find(message, content, contentIndex)) return candidate;
    } catch {
      // A faulty matcher must not break rendering; skip it.
    }
  }
  return undefined;
}

/** Registered renderer: reads `message` from resolved props. */
export function AiBubbleRenderer(props: RendererComponentProps<AiBubbleSchema>): RendererRenderOutput {
  const resolved = props.props;
  const message = resolved.message as ChatMessage | undefined;
  if (!message) {
    return (
      <article className={cn('nop-ai-bubble', props.meta.className)} data-slot="ai-bubble" data-testid={props.meta.testid || undefined}>
        <div data-slot="ai-bubble-content" />
      </article>
    );
  }
  return (
    <AiBubbleView
      message={message}
      placement={resolved.placement ?? 'auto'}
      shape={resolved.shape ?? 'rounded'}
      showAvatar={resolved.showAvatar === true}
      showTimestamp={resolved.showTimestamp === true}
      className={props.meta.className}
    />
  );
}
