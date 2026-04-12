import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'loop',
      items: '${items}',
      itemName: 'item',
      indexName: 'idx',
      body: [
        { type: 'text', text: '${idx + 1}. ${item.name} — ${item.role}' }
      ]
    }
  ]
};

export function LoopLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      data={{
        items: [
          { name: 'Alice', role: 'Admin' },
          { name: 'Bob', role: 'Editor' },
          { name: 'Carol', role: 'Viewer' }
        ]
      }}
      description="Iterates over an array and renders each item via a body region. Exposes itemName, indexName, and keyName bindings."
    />
  );
}
