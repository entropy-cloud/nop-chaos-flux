import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    { type: 'text', text: 'The dynamic-renderer reads its schema from the scope.' },
    {
      type: 'dynamic-renderer',
      schema: '${dynamicSchema}'
    }
  ]
};

export function DynamicRendererLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      data={{
        dynamicSchema: { type: 'badge', label: 'Rendered from scope', variant: 'secondary' }
      }}
      description="Renders a schema node whose type and props are resolved at runtime from the current scope."
      notes="The schema prop is an expression that returns a schema object from the scope. Here, dynamicSchema is injected as data."
    />
  );
}
