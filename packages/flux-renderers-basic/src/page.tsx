import React from 'react';
import { useMemo } from 'react';
import type { PageStatusSummary, RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { PageSchema } from './schemas';
import { useStatusPathPublication } from './status-hooks';

export function PageRenderer(props: RendererComponentProps<PageSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const summary = useMemo<PageStatusSummary>(() => ({
    refreshTick: Number(props.node.scope.get('refreshTick') ?? 0)
  }), [props.node.scope]);

  useStatusPathPublication(props.node.scope, typeof props.schema.statusPath === 'string' ? props.schema.statusPath : undefined, summary);

  return (
    <section className={cn('nop-page', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
      {hasRendererSlotContent(titleContent) ? (
        <header data-slot="page-header">
          <h2>{titleContent}</h2>
        </header>
      ) : null}
      {hasRendererSlotContent(headerContent) ? (
        <div data-slot="page-toolbar">{headerContent}</div>
      ) : null}
      <div data-slot="page-body">{props.regions.body?.render()}</div>
      {hasRendererSlotContent(footerContent) ? (
        <footer data-slot="page-footer">{footerContent}</footer>
      ) : null}
    </section>
  );
}
