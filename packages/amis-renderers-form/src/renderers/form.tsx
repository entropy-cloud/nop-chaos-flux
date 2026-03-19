import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/amis-schema';
import type { FormSchema } from '../schemas';

export function FormRenderer(props: RendererComponentProps<FormSchema>) {
  return (
    <section className="na-form">
      <div className="na-form__body">{props.regions.body?.render()}</div>
      <div className="na-form__actions">{props.regions.actions?.render()}</div>
    </section>
  );
}

export const formRendererDefinition: RendererDefinition = {
  type: 'form',
  component: FormRenderer,
  regions: ['body', 'actions'],
  scopePolicy: 'form'
};
