import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cn } from '@nop-chaos/ui';
import { sanitizeHtml } from './sanitize.js';
import type { MarkdownSchema } from './schemas.js';

export function MarkdownRenderer(props: RendererComponentProps<MarkdownSchema>) {
  const slotProps = props.props;
  const raw =
    typeof slotProps.content === 'string' && slotProps.content.length > 0
      ? slotProps.content
      : '';
  const allowHtml = slotProps.allowHtml === true;

  if (raw.length === 0) {
    const emptyContent = resolveRendererSlotContent(props, 'empty');
    const hasEmpty = hasRendererSlotContent(emptyContent);
    return (
      <div
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="markdown"
        data-state="empty"
        className={cn('nop-markdown', props.meta.className)}
      >
        {hasEmpty ? emptyContent : null}
      </div>
    );
  }

  // Security gate (markdown §11/§12): allowHtml defaults to OFF — raw HTML is
  // escaped by react-markdown (literal tags visible). When ON, the markdown
  // source is first run through the DOMPurify gate (strips <script>/event
  // handlers/javascript: URIs; preserves markdown punctuation as text), then
  // rehype-raw renders the surviving safe tags.
  const source = allowHtml ? sanitizeHtml(raw) : raw;
  const rehypePlugins = allowHtml ? [rehypeRaw] : [];

  return (
    <div
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="markdown"
      data-allow-html={allowHtml ? 'true' : undefined}
      className={cn('nop-markdown', props.meta.className)}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
