import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'tree',
      data: '${orgTree}',
      labelField: 'name',
      keyField: 'id',
      childrenKey: 'children',
      initiallyExpanded: true
    }
  ]
};

export function TreeLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      data={{
        orgTree: [
          {
            id: '1', name: 'Engineering',
            children: [
              { id: '1-1', name: 'Frontend', children: [] },
              { id: '1-2', name: 'Backend', children: [] },
              { id: '1-3', name: 'Platform', children: [] }
            ]
          },
          {
            id: '2', name: 'Product',
            children: [
              { id: '2-1', name: 'Design', children: [] },
              { id: '2-2', name: 'Research', children: [] }
            ]
          }
        ]
      }}
      description="Hierarchical tree view with expand/collapse and custom node templates."
    />
  );
}
