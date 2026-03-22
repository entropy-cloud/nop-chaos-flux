import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/amis-schema';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/amis-react';
import type { FormSchema } from '../schemas';

export function FormRenderer(props: RendererComponentProps<FormSchema>) {
  const bodyContent = resolveRendererSlotContent(props, 'body');
  const actionsContent = resolveRendererSlotContent(props, 'actions');

  return (
    <section className="na-form">
      {hasRendererSlotContent(bodyContent) ? <div className="na-form__body">{bodyContent}</div> : null}
      {hasRendererSlotContent(actionsContent) ? <div className="na-form__actions">{actionsContent}</div> : null}
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
