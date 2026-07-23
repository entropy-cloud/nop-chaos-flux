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

export interface AiBubbleViewProps {
  message: ChatMessage;
  placement?: 'start' | 'end' | 'auto';
  shape?: 'corner' | 'rounded' | 'none';
  showAvatar?: boolean;
  contentRenderers?: BubbleContentRendererMatch[];
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
 */
export function AiBubbleView(props: AiBubbleViewProps): React.ReactElement | null {
  const { message, placement = 'auto', shape = 'rounded', showAvatar = false, contentRenderers } = props;
  const renderers = contentRenderers ?? defaultBubbleContentRenderers;
  const effectivePlacement = resolvePlacement(message, placement);
  const slices = resolveContentSlices(message);
  const isStreaming = message.loading === true;

  return (
    <article
      className={cn('nop-ai-bubble', props.className)}
      data-slot="ai-bubble"
      data-role={message.role}
      data-placement={effectivePlacement}
      data-shape={shape}
      data-streaming={isStreaming ? '' : undefined}
    >
      {showAvatar ? <div data-slot="ai-bubble-avatar" aria-hidden="true" /> : null}
      <div data-slot="ai-bubble-content" className="flex flex-col gap-2">
        {slices.map((slice) => {
          const match = pickRenderer(renderers, message, slice.content, slice.index);
          if (!match) return null;
          const Renderer = match.renderer;
          return <Renderer key={slice.index} message={message} content={slice.content} contentIndex={slice.index} />;
        })}
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
      className={props.meta.className}
    />
  );
}
