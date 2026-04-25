import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const expandCollapseTree = {
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

const customNodeTree = {
  type: 'page',
  body: [
    {
      type: 'tree',
      data: '${orgTree}',
      labelField: 'name',
      keyField: 'id',
      childrenKey: 'children',
      initiallyExpanded: true,
      node: [
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          gap: 2,
          body: [
            { type: 'text', text: '${$slot.node.name}' },
            { type: 'badge', text: 'depth:${$slot.depth}' }
          ]
        }
      ]
    },
    { type: 'text', text: 'Custom node template uses the node region bindings.' }
  ]
};

const orgTreeData = [
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
];

export function TreeLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Hierarchical tree view with expand/collapse and optional custom node templates."
      scenarios={[
        {
          title: 'Expand/collapse org tree',
          description: 'An organizational tree with all nodes initially expanded. Click arrows to expand or collapse branches.',
          schema: expandCollapseTree,
          data: { orgTree: orgTreeData }
        },
        {
          title: 'Custom node template with depth badge',
          description: 'The node region can render custom content using node, index, depth, key, and parentNode bindings.',
          schema: customNodeTree,
          data: { orgTree: orgTreeData }
        }
      ]}
    />
  );
}
