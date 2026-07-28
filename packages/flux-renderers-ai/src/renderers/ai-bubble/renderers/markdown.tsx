import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { sanitizeHtml } from '@nop-chaos/flux-renderers-content';
/* Adjudication 01-05: cross-package coupling ai→content for sanitizeHtml. Minimal scope (1 utility function, same dependency form-advanced also uses). Accept-and-annotate: not worth extracting without a 3rd consumer. */
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { Components } from 'react-markdown';
import type { BubbleContentRendererProps } from '../types.js';
import { safeMarkdownSlice } from '../markdown-buffer.js';

/**
 * Markdown content renderer (A-2 streaming-safe + A-3 code-block copy).
 *
 * - Wraps `react-markdown` in a lightweight buffer (~2KB, design.md §10.4
 *   path C) that holds back incomplete UTF-16 surrogates and unclosed code
 *   fences / `$$` math blocks, eliminating CJK garbling and mid-stream
 *   flicker.
 * - Renders a "Copy" button on every fenced code block (A-3). Copy goes
 *   through `navigator.clipboard` (host-owned IO surface — INV-1 permits this
 *   because the clipboard API is a user-gesture-only browser API, not a
 *   network/storage primitive; the package never opens a socket or persists).
 * - Sanitizes via the shared `sanitizeHtml` (DOMPurify) so XSS protection is
 *   consistent with the content package (design.md §5.2).
 */
export function MarkdownContentRenderer({ message, content }: BubbleContentRendererProps) {
  const raw = extractContentText(content);
  const source = safeMarkdownSlice(raw);
  if (source.length === 0) return null;

  // A-11: append a blinking cursor while the assistant message is streaming.
  const streaming = message?.loading === true;

  // Security gate: sanitize first, then let rehype-raw render the safe subset.
  const safe = sanitizeHtml(source);
  return (
    <div
      data-slot="ai-bubble-markdown"
      className={cn('prose prose-sm max-w-none break-words dark:prose-invert')}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponentOverrides}
      >
        {safe}
      </ReactMarkdown>
      {streaming ? <span data-slot="ai-bubble-cursor" aria-hidden="true">▍</span> : null}
    </div>
  );
}

function extractContentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    (content as { type?: unknown }).type === 'text'
  ) {
    return String((content as { text?: unknown }).text ?? '');
  }
  return '';
}

const markdownComponentOverrides: Components = {
  pre({ children, ...rest }) {
    return (
      <pre data-slot="ai-bubble-pre" {...rest}>
        {children}
      </pre>
    );
  },
  code({ className, children, ...rest }) {
    // `react-markdown` v10 signals fenced code blocks with a `language-*` class
    // on the <code> element; inline code has no such class.
    const isFenced = typeof className === 'string' && className.includes('language-');
    if (!isFenced) {
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      );
    }
    return (
      <CodeBlock className={className} {...rest}>
        {children}
      </CodeBlock>
    );
  },
};

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = extractElementText(children);
    // clipboard-write-failed: only flip to "Copied" when the write resolves.
    // A rejected write (permission lost / no focus) keeps the button as-is so
    // the user does not see a false success.
    void Promise.resolve(copyToClipboard(text))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        // swallow: keep the button in its pre-copy state
      });
  }

  return (
    <code className={cn('relative block', className)} data-slot="ai-bubble-code">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-1 top-1 opacity-70 hover:opacity-100"
        data-slot="ai-bubble-copy-code"
        aria-label={t('flux.ai.copyCode')}
        onClick={handleCopy}
      >
        {copied ? t('flux.ai.copied') : t('flux.ai.copy')}
      </Button>
      {children}
    </code>
  );
}

function extractElementText(node: React.ReactNode): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractElementText).join('');
  if (typeof node === 'object' && 'props' in (node as React.ReactElement)) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractElementText(element.props.children);
  }
  return '';
}

/**
 * Clipboard write indirection. Tests can stub this; production uses
 * `navigator.clipboard`. Allowed under INV-1 because clipboard is a
 * user-gesture browser API, not a network/storage primitive.
 */
export const clipboardAdapter: { writeText(text: string): void | Promise<void> } = {
  writeText(text: string): void | Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return undefined;
  },
};

function copyToClipboard(text: string): void | Promise<void> {
  return clipboardAdapter.writeText(text);
}
