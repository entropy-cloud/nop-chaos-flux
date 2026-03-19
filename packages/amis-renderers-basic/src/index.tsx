import React from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  RendererRegistry
} from '@nop-chaos/amis-schema';
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
  return (
    <section className={classNames('na-page', props.meta.className)}>
      {props.meta.title ? <header className="na-page__header"><h2>{props.meta.title}</h2></header> : null}
      <div className="na-page__body">{props.regions.body?.render()}</div>
    </section>
  );
}

function ContainerRenderer(props: RendererComponentProps<ContainerSchema>) {
  return <div className={classNames('na-container', props.meta.className)}>{props.regions.body?.render()}</div>;
}

function TplRenderer(props: RendererComponentProps<TplSchema>) {
  return <span className={classNames('na-tpl', props.meta.className)}>{String(props.props.tpl ?? '')}</span>;
}

function TextRenderer(props: RendererComponentProps<TextSchema>) {
  return <p className={classNames('na-text', props.meta.className)}>{String(props.props.text ?? '')}</p>;
}

function ButtonRenderer(props: RendererComponentProps<ButtonSchema>) {
  const handleClick = async () => {
    const onClick = props.props.onClick;
    if (onClick && typeof onClick === 'object' && 'action' in (onClick as Record<string, unknown>)) {
      await props.helpers.dispatch(onClick as any);
    }
  };

  return (
    <button className="na-button" type="button" onClick={handleClick} disabled={props.meta.disabled}>
      {String(props.props.label ?? props.meta.label ?? 'Button')}
    </button>
  );
}

export const basicRendererDefinitions: RendererDefinition[] = [
  {
    type: 'page',
    component: PageRenderer,
    regions: ['body']
  },
  {
    type: 'container',
    component: ContainerRenderer,
    regions: ['body']
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
    component: ButtonRenderer
  }
];

export function registerBasicRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, basicRendererDefinitions);
}
