import type { BubbleContentRendererMatch } from '../types.js';
import { BubbleRendererMatchPriority } from '../types.js';
import { LoadingContentRenderer } from './loading.js';
import { MarkdownContentRenderer } from './markdown.js';
import { TextContentRenderer } from './text.js';

/**
 * Default bubble content renderers, ordered by priority (lower wins). The
 * registration system walks matches and picks the first `find` that returns
 * true, preferring lower priority values.
 *
 * P0 ships: loading / markdown / text. image / reasoning / tools land in P2.
 */
export const defaultBubbleContentRenderers: BubbleContentRendererMatch[] = [
  {
    priority: BubbleRendererMatchPriority.LOADING,
    find: (message) => message.loading === true,
    renderer: LoadingContentRenderer,
  },
  {
    priority: BubbleRendererMatchPriority.NORMAL,
    find: (_message, content) => typeof content === 'string',
    renderer: MarkdownContentRenderer,
  },
  {
    priority: BubbleRendererMatchPriority.CONTENT,
    // Fallback for non-string content (image/file/data parts) — render as text.
    find: () => true,
    renderer: TextContentRenderer,
  },
];
