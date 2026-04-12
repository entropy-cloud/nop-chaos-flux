import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'recurse',
      items: '${tree}',
      itemName: 'node',
      body: [
        { type: 'text', text: '${node.label}' }
      ]
    }
  ]
};

export function RecurseLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      data={{
        tree: [
          {
            label: 'Root A',
            children: [
              { label: 'Child A1', children: [] },
              { label: 'Child A2', children: [] }
            ]
          },
          {
            label: 'Root B',
            children: [
              { label: 'Child B1', children: [] }
            ]
          }
        ]
      }}
      description="Recursive tree renderer that walks nested item arrays to a configurable max depth."
      notes="Each node's children array is discovered automatically. The body region receives each node as itemName."
    />
  );
}
