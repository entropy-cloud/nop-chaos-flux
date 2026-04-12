import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  title: 'Page Renderer',
  body: [
    { type: 'text', text: 'This is the page body region.' },
    { type: 'text', text: 'The page renderer wraps content in a root page scope and renders header, body, and footer regions.' }
  ]
};

export function PageLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Root page container that provides the top-level scope, title region, body region, header, and footer."
      notes="The page renderer is always the top-level node in a schema tree."
    />
  );
}
