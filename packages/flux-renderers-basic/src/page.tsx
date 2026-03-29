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
    <section className={classNames('nop-page', props.meta.className)}>
      {hasRendererSlotContent(titleContent) ? (
        <header className="nop-page__header">
          <h2>{titleContent}</h2>
        </header>
      ) : null}
      {hasRendererSlotContent(headerContent) ? (
        <div className="nop-page__toolbar">{headerContent}</div>
      ) : null}
      <div className="nop-page__body">{props.regions.body?.render()}</div>
      {hasRendererSlotContent(footerContent) ? (
        <footer className="nop-page__footer">{footerContent}</footer>
      ) : null}
    </section>
  );
}
