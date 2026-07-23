import { cn } from '@nop-chaos/ui';
import type { BubbleContentRendererProps } from '../types.js';

/**
 * A-1 host-defined content block renderer. Matches any `data-${string}`
 * content part (engine.md §7.1) and renders the `data` payload as a JSON
 * preview (the host is expected to register a custom renderer that overrides
 * this default via the `ai-bubble` registration system — design.md §5.2).
 *
 * The `data-` prefix avoids clashes with protocol fields (`text`, `image_url`,
 * `file`). The default renderer is intentionally minimal: it shows the
 * payload kind so unrecognized data parts are still visible.
 */
export function DataPartContentRenderer({ content }: BubbleContentRendererProps) {
  if (typeof content !== 'object' || content === null) return null;
  const part = content as { type?: string; id?: string; data?: unknown };
  if (typeof part.type !== 'string' || !part.type.startsWith('data-')) return null;

  const kind = part.type.slice('data-'.length);
  return (
    <div
      data-slot="ai-bubble-data-part"
      data-part-kind={kind}
      className={cn('rounded-md border bg-muted/30 p-2 text-xs')}
    >
      {part.id ? (
        <div data-slot="ai-bubble-data-part-id" className="font-mono opacity-70">
          {part.id}
        </div>
      ) : null}
      <pre data-slot="ai-bubble-data-part-payload" className="overflow-x-auto whitespace-pre-wrap">
        {safeStringify(part.data)}
      </pre>
    </div>
  );
}

function safeStringify(value: unknown): string {
  if (value === undefined) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
