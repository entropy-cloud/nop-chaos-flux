import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import type { FormSchema } from '../schemas';

export function FormRenderer(props: RendererComponentProps<FormSchema>) {
  const bodyContent = resolveRendererSlotContent(props, 'body');
  const actionsContent = resolveRendererSlotContent(props, 'actions');

  return (
    <section className="nop-form">
      {hasRendererSlotContent(bodyContent) ? <div className="grid gap-4">{bodyContent}</div> : null}
      {hasRendererSlotContent(actionsContent) ? <div className="flex flex-wrap gap-3">{actionsContent}</div> : null}
    </section>
  );
}

export const formRendererDefinition: RendererDefinition = {
  type: 'form',
  component: FormRenderer,
  regions: ['body', 'actions'],
  scopePolicy: 'form',
  componentRegistryPolicy: 'new'
};

