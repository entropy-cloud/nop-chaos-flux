import React from 'react';
import { useMemo } from 'react';
import type { PageStatusSummary, RendererComponentProps } from '@nop-chaos/flux-core';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import type { PageSchema } from './schemas';
import { useStatusPathPublication } from './status-hooks';

export function PageRenderer(props: RendererComponentProps<PageSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const refreshTick = useScopeSelector((scopeData) =>
    Number((scopeData as Record<string, unknown>)?.refreshTick ?? 0),
  );
  const summary = useMemo<PageStatusSummary>(
    () => ({
      refreshTick,
    }),
    [refreshTick],
  );
  const slotProps = props.props as PageSchema;

  useStatusPathPublication(
    props.node.scope,
    typeof slotProps.statusPath === 'string' ? slotProps.statusPath : undefined,
    summary,
  );

  return (
    <section
      className={cn('nop-page', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      {hasRendererSlotContent(titleContent) ? (
        <header data-slot="page-header" className={cn(slotProps.headerClassName)}>
          <h2>{titleContent}</h2>
        </header>
      ) : null}
      {hasRendererSlotContent(headerContent) ? (
        <div data-slot="page-toolbar" className={cn(slotProps.toolbarClassName)}>
          {headerContent}
        </div>
      ) : null}
      <div data-slot="page-body" className={cn(slotProps.bodyClassName)}>
        {props.regions.body?.render()}
      </div>
      {hasRendererSlotContent(footerContent) ? (
        <footer data-slot="page-footer" className={cn(slotProps.footerClassName)}>
          {footerContent}
        </footer>
      ) : null}
    </section>
  );
}
