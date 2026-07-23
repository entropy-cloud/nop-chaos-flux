import { cn } from '@nop-chaos/ui';
import type { BubbleContentRendererProps } from '../types.js';

/** Plain-text fallback: renders string content as-is (whitespace preserved). */
export function TextContentRenderer({ content }: BubbleContentRendererProps) {
  const text = typeof content === 'string' ? content : '';
  return (
    <div data-slot="ai-bubble-text" className={cn('whitespace-pre-wrap break-words text-sm')}>
      {text}
    </div>
  );
}
