import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'tabs',
      items: [
        {
          title: 'First Tab',
          body: [
            { type: 'text', text: 'Content in the first tab.' }
          ]
        },
        {
          title: 'Second Tab',
          body: [
            { type: 'text', text: 'Content in the second tab.' }
          ]
        },
        {
          title: 'Third Tab',
          body: [
            { type: 'text', text: 'Content in the third tab.' }
          ]
        }
      ]
    }
  ]
};

export function TabsLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Tabbed navigation with per-item title and body regions."
    />
  );
}
