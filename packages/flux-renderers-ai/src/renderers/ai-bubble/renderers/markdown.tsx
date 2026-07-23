import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { sanitizeHtml } from '@nop-chaos/flux-renderers-content';
import { cn } from '@nop-chaos/ui';
import type { BubbleContentRendererProps } from '../types.js';

/**
 * Markdown content renderer. Reuses `sanitizeHtml` from
 * `@nop-chaos/flux-renderers-content` (DOMPurify gate) so XSS protection is
 * shared with the content package (design.md §5.2). P0 is non-streaming-safe;
 * CJK/code-fence buffering is a P1/A-2 follow-up.
 */
export function MarkdownContentRenderer({ content }: BubbleContentRendererProps) {
  const raw = typeof content === 'string' ? content : '';
  if (raw.length === 0) return null;

  // Security gate: sanitize first, then let rehype-raw render the safe subset.
  const source = sanitizeHtml(raw);
  return (
    <div
      data-slot="ai-bubble-markdown"
      className={cn('prose prose-sm max-w-none break-words dark:prose-invert')}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
