import type { BubbleContentRendererMatch } from '../types.js';
import { BubbleRendererMatchPriority } from '../types.js';
import { DataPartContentRenderer } from './data-part.js';
import { ErrorContentRenderer, errorMatcher } from './error.js';
import { ImageContentRenderer, imageMatcher } from './image.js';
import { LoadingContentRenderer } from './loading.js';
import { MarkdownContentRenderer } from './markdown.js';
import { ReasoningContentRenderer, reasoningMatcher } from './reasoning.js';
import { TextContentRenderer } from './text.js';
import { ToolsContentRenderer, toolsMatcher } from './tools.js';

/**
 * Default bubble content renderers, ordered by priority (lower wins). The
 * registration system walks matches and picks the first `find` that returns
 * true, preferring lower priority values.
 *
 * P1-9 (plan 2026-08-10-1301-2): tools / reasoning / error inspect
 * message-level fields and are marked `messageLevel` — they run once per
 * message in parallel with the slice-level pass, so a non-empty text slice can
 * no longer shadow them (mixed messages render text AND tool cards / reasoning
 * panels / error affordance together).
 *
 * P0 ships: loading / markdown / text.
 * P1 (A-1) adds: data-part (`data-${string}` content blocks).
 * P2 adds: tools (tool_calls), reasoning (reasoning_content), image
 * (image_url grid), error (A-5 wiring — bound to engine error state upstream).
 */
export const defaultBubbleContentRenderers: BubbleContentRendererMatch[] = [
  {
    priority: BubbleRendererMatchPriority.LOADING,
    // Slice-level: LOADING(-1) wins over every other renderer while the
    // message is still waiting for its first chunk.
    find: (message) => message.loading === true,
    renderer: LoadingContentRenderer,
  },
  {
    priority: BubbleRendererMatchPriority.CONTENT,
    messageLevel: true,
    find: toolsMatcher,
    renderer: ToolsContentRenderer,
  },
  {
    priority: BubbleRendererMatchPriority.CONTENT,
    messageLevel: true,
    find: reasoningMatcher,
    renderer: ReasoningContentRenderer,
  },
  {
    priority: BubbleRendererMatchPriority.CONTENT,
    // messageLevel (P1-9 family): the renderer projects the WHOLE message's
    // image_url parts as one grid. At slice level a mixed [text, image, image]
    // message invoked it once per image slice and duplicated the entire grid.
    messageLevel: true,
    find: imageMatcher,
    renderer: ImageContentRenderer,
  },
  {
    priority: BubbleRendererMatchPriority.CONTENT,
    messageLevel: true,
    find: (message) => errorMatcher(message),
    renderer: ErrorContentRenderer,
  },
  {
    priority: BubbleRendererMatchPriority.NORMAL,
    // Markdown only claims non-empty text content; an empty string (e.g. a
    // tool_calls assistant message with no textual content) must fall through
    // to the tools/reasoning/image matchers instead of shadowing them.
    find: (_message, content) =>
      (typeof content === 'string' && content.length > 0) ||
      (typeof content === 'object' &&
        content !== null &&
        'type' in content &&
        (content as { type?: unknown }).type === 'text' &&
        typeof (content as { text?: unknown }).text === 'string' &&
        ((content as { text?: unknown }).text as string).length > 0),
    renderer: MarkdownContentRenderer,
  },
  {
    priority: BubbleRendererMatchPriority.CONTENT,
    find: (_message, content) =>
      typeof content === 'object' &&
      content !== null &&
      'type' in content &&
      typeof (content as { type?: unknown }).type === 'string' &&
      ((content as { type: string }).type as string).startsWith('data-'),
    renderer: DataPartContentRenderer,
  },
  {
    priority: BubbleRendererMatchPriority.ROLE,
    // Fallback for non-string content (image/file/data parts) — render as text.
    find: () => true,
    renderer: TextContentRenderer,
  },
];
