import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicRecurse = {
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

const richRecurse = {
  type: 'page',
  body: [
    {
      type: 'recurse',
      items: '${orgTree}',
      itemName: 'node',
      body: [
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          gap: 2,
          body: [
            { type: 'icon', icon: 'FolderOpen', size: 14 },
            { type: 'text', text: '${node.label}' },
            { type: 'badge', label: 'L${node.depth ?? 0}', variant: 'secondary' }
          ]
        }
      ]
    }
  ]
};

const orgTreeData = [
  {
    label: 'Acme Corp',
    depth: 0,
    children: [
      {
        label: 'Engineering',
        depth: 1,
        children: [
          { label: 'Frontend', depth: 2, children: [] },
          { label: 'Backend', depth: 2, children: [] }
        ]
      },
      {
        label: 'Design',
        depth: 1,
        children: [
          { label: 'UX Research', depth: 2, children: [] }
        ]
      }
    ]
  }
];

export function RecurseLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Recursive tree renderer that walks nested item arrays to a configurable max depth. The body region receives each node as itemName."
      scenarios={[
        {
          title: 'Simple recursive label tree',
          description: 'Each node\'s label is rendered as text. Children are discovered automatically via the children array.',
          schema: basicRecurse,
          data: {
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
          }
        },
        {
          title: 'Rich tree with icon, label, and depth badge',
          description: 'Each node renders as a flex row with a folder icon, the node label, and a badge showing its depth level.',
          schema: richRecurse,
          data: { orgTree: orgTreeData }
        }
      ]}
    />
  );
}
