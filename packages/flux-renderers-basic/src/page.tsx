import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import type { PageSchema } from './schemas';
import { classNames } from './utils';

export function PageRenderer(props: RendererComponentProps<PageSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');

  return (
    <section className={classNames('nop-page', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
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
