import { parsePath, type BaseSchema, type RendererComponentProps, type RendererDefinition, type RendererSchemaValidationContext } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import type { FormSchema } from '../schemas';

function escapeJsonPointerSegment(segment: string) {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function toJsonPointer(path: string, ...segments: Array<string | number>) {
  const parts = parsePath(path).filter((segment) => segment !== '$').concat(segments.map((segment) => String(segment)));

  if (parts.length === 0) {
    return '';
  }

  return `/${parts.map(escapeJsonPointerSegment).join('/')}`;
}

function validateFormSchema(context: RendererSchemaValidationContext<BaseSchema>) {
  if (context.schema.type !== 'form') {
    return;
  }

  const schema = context.schema as FormSchema;
  const { path, emit } = context;

  if (schema.body !== undefined && !Array.isArray(schema.body)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'body'),
      message: 'form.body must be an array of schema nodes.'
    });
  }

  if (schema.actions !== undefined && !Array.isArray(schema.actions)) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'actions'),
      message: 'form.actions must be an array of schema nodes.'
    });
  }

  if (schema.data !== undefined && (!schema.data || typeof schema.data !== 'object' || Array.isArray(schema.data))) {
    emit({
      code: 'invalid-property-shape',
      path: toJsonPointer(path, 'data'),
      message: 'form.data must be an object when provided.'
    });
  }
}

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
  displayName: 'Form',
  category: 'form',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  defaultSchema: { type: 'form', body: [], actions: [] },
  component: FormRenderer,
  regions: ['body', 'actions'],
  scopePolicy: 'form',
  componentRegistryPolicy: 'new',
  schemaValidator: validateFormSchema
};
