import { cn } from '@nop-chaos/ui';
import type { BubbleContentRendererProps } from '../types.js';

/**
 * A-4 timestamp renderer. Renders `message.metadata.createdAt` as a localized
 * time string. The host decides whether to mount it (typically via a
 * host-registered content renderer that wins for assistant messages).
 */
export function TimestampContentRenderer({ message }: BubbleContentRendererProps) {
  const createdAt = message.metadata?.createdAt;
  if (typeof createdAt !== 'number') return null;

  const date = new Date(createdAt);
  const label = formatTimestamp(date);

  return (
    <time
      data-slot="ai-bubble-timestamp"
      dateTime={date.toISOString()}
      className={cn('text-xs text-muted-foreground')}
      suppressHydrationWarning
    >
      {label}
    </time>
  );
}

function formatTimestamp(date: Date): string {
  try {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
