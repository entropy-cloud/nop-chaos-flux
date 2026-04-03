import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import type { FormSchema } from '../schemas';

export function FormRenderer(props: RendererComponentProps<FormSchema>) {
  const bodyContent = resolveRendererSlotContent(props, 'body');
  const actionsContent = resolveRendererSlotContent(props, 'actions');

  return (
    <section className="nop-form flex flex-col gap-4" data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
      {hasRendererSlotContent(bodyContent) ? <div className="nop-form__body grid gap-4">{bodyContent}</div> : null}
      {hasRendererSlotContent(actionsContent) ? <div className="nop-form__actions flex flex-wrap gap-3">{actionsContent}</div> : null}
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

