import React from 'react';
import { useMemo } from 'react';
import type { PageStatusSummary, RendererComponentProps } from '@nop-chaos/flux-core';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import {
  cn,
  resolveLucideIconStrict,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nop-chaos/ui';
import type { PageSchema } from './schemas.js';
import { useStatusPathPublication } from './status-hooks.js';
import { asReactNode } from './utils.js';

const InfoIcon = resolveLucideIconStrict('info');

export function PageRenderer(props: RendererComponentProps<PageSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');
  const refreshTick = useScopeSelector((scopeData) =>
    Number((scopeData as Record<string, unknown>)?.refreshTick ?? 0),
    Object.is,
    { paths: ['refreshTick'] },
  );
  const summary = useMemo<PageStatusSummary>(
    () => ({
      refreshTick,
    }),
    [refreshTick],
  );
  const slotProps = props.props as PageSchema;
  const subTitle =
    typeof slotProps.subTitle === 'string' && slotProps.subTitle.length > 0
      ? slotProps.subTitle
      : undefined;
  const remark =
    typeof slotProps.remark === 'string' && slotProps.remark.length > 0
      ? slotProps.remark
      : undefined;
  const asidePosition = slotProps.asidePosition === 'right' ? 'right' : 'left';
  const rawAsideSchema = props.schema.aside;
  const hasAside = Array.isArray(rawAsideSchema) ? rawAsideSchema.length > 0 : false;
  const asideContent = hasAside ? asReactNode(props.regions.aside?.render()) : null;

  useStatusPathPublication(
    props.node.scope,
    typeof slotProps.statusPath === 'string' ? slotProps.statusPath : undefined,
    summary,
  );

  const asideNode = hasAside ? (
    <aside data-slot="page-aside" className={cn(slotProps.asideClassName)}>
      {asideContent}
    </aside>
  ) : null;

  return (
    <section
      className={cn('nop-page', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      {hasRendererSlotContent(titleContent) || subTitle || remark ? (
        <header data-slot="page-header" className={cn(slotProps.headerClassName)}>
          <h2>{titleContent}</h2>
          {subTitle ? <span data-slot="page-subtitle">{subTitle}</span> : null}
          {remark ? (
            <Tooltip>
              <TooltipTrigger
                data-slot="page-remark"
                aria-label="Remark"
                className="inline-flex size-4 items-center justify-center align-middle text-muted-foreground hover:text-foreground"
              >
                {InfoIcon ? (
                  <InfoIcon size={14} strokeWidth={1.8} aria-hidden="true" focusable="false" />
                ) : null}
              </TooltipTrigger>
              <TooltipContent>{remark}</TooltipContent>
            </Tooltip>
          ) : null}
        </header>
      ) : null}
      {hasRendererSlotContent(headerContent) ? (
        <div data-slot="page-toolbar" className={cn(slotProps.toolbarClassName)}>
          {headerContent}
        </div>
      ) : null}
      {asidePosition === 'left' && asideNode ? asideNode : null}
      <div data-slot="page-body" className={cn(slotProps.bodyClassName)}>
        {asReactNode(props.regions.body?.render())}
      </div>
      {asidePosition === 'right' && asideNode ? asideNode : null}
      {hasRendererSlotContent(footerContent) ? (
        <footer data-slot="page-footer" className={cn(slotProps.footerClassName)}>
          {footerContent}
        </footer>
      ) : null}
    </section>
  );
}
