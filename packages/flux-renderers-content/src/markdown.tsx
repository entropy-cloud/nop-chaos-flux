import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
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
  const src =
    typeof slotProps.src === 'string' && slotProps.src.length > 0
      ? slotProps.src
      : undefined;
  const allowHtml = slotProps.allowHtml === true;

  const [fetchedContent, setFetchedContent] = React.useState<string | undefined>(undefined);
  const [fetchError, setFetchError] = React.useState(false);
  const [fetchLoading, setFetchLoading] = React.useState(false);

  React.useEffect(() => {
    if (!src || raw.length > 0) {
      setFetchedContent(undefined);
      setFetchError(false);
      setFetchLoading(false);
      return;
    }
    let cancelled = false;
    setFetchLoading(true);
    setFetchError(false);
    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) {
          setFetchedContent(text);
          setFetchLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError(true);
          setFetchLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [src, raw]);

  const effectiveContent = raw.length > 0 ? raw : (fetchedContent ?? '');

  if (fetchLoading) {
    return (
      <div
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="markdown"
        data-state="loading"
        className={cn('nop-markdown', props.meta.className)}
      >
        {t('flux.common.loading')}
      </div>
    );
  }

  if (effectiveContent.length === 0) {
    const emptyContent = resolveRendererSlotContent(props, 'empty');
    const hasEmpty = hasRendererSlotContent(emptyContent);
    return (
      <div
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="markdown"
        data-state={fetchError ? 'error' : 'empty'}
        className={cn('nop-markdown', props.meta.className)}
      >
        {fetchError ? 'Failed to load markdown content' : (hasEmpty ? emptyContent : null)}
      </div>
    );
  }

  // Security gate (markdown §11/§12): allowHtml defaults to OFF — raw HTML is
  // escaped by react-markdown (literal tags visible). When ON, the markdown
  // source is first run through the DOMPurify gate (strips <script>/event
  // handlers/javascript: URIs; preserves markdown punctuation as text), then
  // rehype-raw renders the surviving safe tags.
  const source = allowHtml ? sanitizeHtml(effectiveContent) : effectiveContent;
  const rehypePlugins = allowHtml ? [rehypeRaw] : [];

  return (
    <div
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="markdown"
      data-allow-html={allowHtml ? 'true' : undefined}
      data-src-loaded={src && raw.length === 0 ? 'true' : undefined}
      className={cn('nop-markdown', props.meta.className)}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
