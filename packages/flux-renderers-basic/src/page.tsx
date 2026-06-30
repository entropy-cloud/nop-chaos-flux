import React from 'react';
import { useMemo, useState } from 'react';
import type { PageStatusSummary, RendererComponentProps } from '@nop-chaos/flux-core';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import {
  Button,
  cn,
  resolveLucideIconStrict,
  Sheet,
  SheetContent,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useIsMobile,
} from '@nop-chaos/ui';
import type { PageSchema } from './schemas.js';
import { useStatusPathPublication } from './status-hooks.js';
import { asReactNode } from './utils.js';
import { useFixedFooterVisualViewport } from './use-fixed-footer-visual-viewport.js';

const InfoIcon = resolveLucideIconStrict('info');
const MenuIcon = resolveLucideIconStrict('menu');

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
  // C-11: detect the aside via the compiled region handle rather than the raw schema
  // fragment. An empty `aside: []` compiles to an empty template-node array, so check
  // for actual content to keep the collapse-on-empty behavior.
  const asideTemplate = props.regions.aside?.templateNode;
  const hasAside = Array.isArray(asideTemplate)
    ? asideTemplate.length > 0
    : Boolean(asideTemplate);
  const asideContent = hasAside ? asReactNode(props.regions.aside?.render()) : null;

  useStatusPathPublication(
    props.node.scope,
    typeof slotProps.statusPath === 'string' ? slotProps.statusPath : undefined,
    summary,
  );

  const isMobile = useIsMobile();
  const showInlineAside = hasAside && !isMobile;
  const showMobileAsideToggle = hasAside && isMobile;

  const footerClassName = typeof slotProps.footerClassName === 'string' ? slotProps.footerClassName : '';
  const footerIsFixed = footerClassName.includes('fixed');
  const footerOffset = useFixedFooterVisualViewport(
    isMobile && footerIsFixed && hasRendererSlotContent(footerContent),
  );
  const footerStyle =
    footerOffset > 0 ? { bottom: `${footerOffset}px` } : undefined;

  const asideNode = showInlineAside ? (
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
          {showMobileAsideToggle ? (
            <PageAsideToggle
              asideContent={asideContent}
              asidePosition={asidePosition}
              asideClassName={slotProps.asideClassName}
            />
          ) : null}
        </header>
      ) : showMobileAsideToggle ? (
        <header data-slot="page-header">
          <PageAsideToggle
            asideContent={asideContent}
            asidePosition={asidePosition}
            asideClassName={slotProps.asideClassName}
          />
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
        <footer
          data-slot="page-footer"
          className={cn(slotProps.footerClassName)}
          style={footerStyle}
          data-keyboard-offset={footerOffset > 0 ? String(footerOffset) : undefined}
        >
          {footerContent}
        </footer>
      ) : null}
    </section>
  );
}

function PageAsideToggle({
  asideContent,
  asidePosition,
  asideClassName,
}: {
  asideContent: React.ReactNode;
  asidePosition: 'left' | 'right';
  asideClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const side: 'left' | 'right' = asidePosition === 'right' ? 'right' : 'left';
  return (
    <>
      <Button
        variant="outline"
        size="icon"
        data-slot="page-aside-toggle"
        aria-label="Toggle aside"
        className="nop-haptic"
        onClick={() => setOpen(true)}
      >
        {MenuIcon ? <MenuIcon /> : null}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={side} data-page-aside-sheet="true">
          <aside data-slot="page-aside" className={cn(asideClassName)}>
            {asideContent}
          </aside>
        </SheetContent>
      </Sheet>
    </>
  );
}
