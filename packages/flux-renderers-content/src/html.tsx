import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import { sanitizeHtml } from './sanitize.js';
import type { HtmlSchema } from './schemas.js';

export function HtmlRenderer(props: RendererComponentProps<HtmlSchema>) {
  const slotProps = props.props;
  const raw =
    typeof slotProps.content === 'string' && slotProps.content.length > 0
      ? slotProps.content
      : '';

  // Security gate (html §11/§12): sanitize defaults to ON. sanitize:false is
  // an explicit trusted escape hatch — the caller owns the risk. Either way
  // the output only ever flows into dangerouslySetInnerHTML (stable DOM
  // boundary isolating external global styles).
  const sanitizeEnabled = slotProps.sanitize !== false;

  if (raw.length === 0) {
    const emptyContent = resolveRendererSlotContent(props, 'empty');
    const hasEmpty = hasRendererSlotContent(emptyContent);
    return (
      <div
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="html"
        data-state="empty"
        className={cn('nop-html', props.meta.className)}
      >
        {hasEmpty ? emptyContent : null}
      </div>
    );
  }

  const html = sanitizeEnabled ? sanitizeHtml(raw) : raw;

  return (
    <div
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="html"
      data-trusted={sanitizeEnabled ? undefined : 'true'}
      className={cn('nop-html', props.meta.className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
