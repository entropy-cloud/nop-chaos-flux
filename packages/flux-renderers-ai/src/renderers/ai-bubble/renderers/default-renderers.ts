import type { BubbleContentRendererMatch } from '../types.js';
import { BubbleRendererMatchPriority } from '../types.js';
import { DataPartContentRenderer } from './data-part.js';
import { LoadingContentRenderer } from './loading.js';
import { MarkdownContentRenderer } from './markdown.js';
import { TextContentRenderer } from './text.js';

/**
 * Default bubble content renderers, ordered by priority (lower wins). The
 * registration system walks matches and picks the first `find` that returns
 * true, preferring lower priority values.
 *
 * P0 ships: loading / markdown / text.
 * P1 (A-1) adds: data-part (`data-${string}` content blocks).
 */
export const defaultBubbleContentRenderers: BubbleContentRendererMatch[] = [
  {
    priority: BubbleRendererMatchPriority.LOADING,
    find: (message) => message.loading === true,
    renderer: LoadingContentRenderer,
  },
  {
    priority: BubbleRendererMatchPriority.NORMAL,
    find: (_message, content) =>
      typeof content === 'string' ||
      (typeof content === 'object' &&
        content !== null &&
        'type' in content &&
        (content as { type?: unknown }).type === 'text'),
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
