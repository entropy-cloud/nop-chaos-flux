import React from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  RendererRegistry
} from '@nop-chaos/amis-schema';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/amis-react';
import { registerRendererDefinitions } from '@nop-chaos/amis-runtime';

interface PageSchema extends BaseSchema {
  type: 'page';
  body?: BaseSchema[];
}

interface ContainerSchema extends BaseSchema {
  type: 'container';
  body?: BaseSchema[];
}

interface TplSchema extends BaseSchema {
  type: 'tpl';
  tpl?: string;
}

interface TextSchema extends BaseSchema {
  type: 'text';
  text?: string;
}

interface ButtonSchema extends BaseSchema {
  type: 'button';
  label?: string;
}

function classNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

function PageRenderer(props: RendererComponentProps<PageSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');

  return (
    <section className={classNames('na-page', props.meta.className)}>
      {hasRendererSlotContent(titleContent) ? <header className="na-page__header"><h2>{titleContent}</h2></header> : null}
      {hasRendererSlotContent(headerContent) ? <div className="na-page__toolbar">{headerContent}</div> : null}
      <div className="na-page__body">{props.regions.body?.render()}</div>
      {hasRendererSlotContent(footerContent) ? <footer className="na-page__footer">{footerContent}</footer> : null}
    </section>
  );
}

function ContainerRenderer(props: RendererComponentProps<ContainerSchema>) {
  const headerContent = resolveRendererSlotContent(props, 'header');
  const footerContent = resolveRendererSlotContent(props, 'footer');

  return (
    <div className={classNames('na-container', props.meta.className)}>
      {hasRendererSlotContent(headerContent) ? <div className="na-container__header">{headerContent}</div> : null}
      <div className="na-container__body">{props.regions.body?.render()}</div>
      {hasRendererSlotContent(footerContent) ? <div className="na-container__footer">{footerContent}</div> : null}
    </div>
  );
}

function TplRenderer(props: RendererComponentProps<TplSchema>) {
  return <span className={classNames('na-tpl', props.meta.className)}>{String(props.props.tpl ?? '')}</span>;
}

function TextRenderer(props: RendererComponentProps<TextSchema>) {
  return <p className={classNames('na-text', props.meta.className)}>{String(props.props.text ?? '')}</p>;
}

function ButtonRenderer(props: RendererComponentProps<ButtonSchema>) {
  return (
    <button className="na-button" type="button" onClick={() => void props.events.onClick?.()} disabled={props.meta.disabled}>
      {String(props.props.label ?? props.meta.label ?? 'Button')}
    </button>
  );
}

export const basicRendererDefinitions: RendererDefinition[] = [
  {
    type: 'page',
    component: PageRenderer,
    regions: ['body', 'header', 'footer'],
    fields: [{ key: 'title', kind: 'value-or-region', regionKey: 'title' }]
  },
  {
    type: 'container',
    component: ContainerRenderer,
    regions: ['body', 'header', 'footer']
  },
  {
    type: 'tpl',
    component: TplRenderer
  },
  {
    type: 'text',
    component: TextRenderer
  },
  {
    type: 'button',
    component: ButtonRenderer,
    fields: [{ key: 'onClick', kind: 'event' }]
  }
];

export function registerBasicRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, basicRendererDefinitions);
}
