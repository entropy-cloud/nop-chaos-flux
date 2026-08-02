import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

function buildDeepTree(levels: number): Array<Record<string, unknown>> {
  const node = (label: string, children: unknown[]): Record<string, unknown> => ({
    label,
    children,
  });
  let children: Array<Record<string, unknown>> = [];
  for (let i = levels - 1; i >= 0; i -= 1) {
    children = [node(`Level ${i}`, children)];
  }
  return children;
}

/**
 * C1.2 Phase 3 host scenarios: deep recursive structure (6 levels, no stack
 * overflow in a real browser) and maxDepth truncation (termination guard).
 */
const deepTree = buildDeepTree(6);

const deepRecurse = {
  type: 'page',
  body: [
    {
      type: 'loop',
      items: '${deepTree}',
      itemName: 'node',
      keyBy: 'item.label',
      body: [
        { type: 'text', text: '${$slot.node.label}' },
        {
          type: 'fragment',
          when: '${$slot.node.children && $slot.node.children.length > 0}',
          body: [{ type: 'recurse', items: '${$slot.node.children}' }],
        },
      ],
    },
  ],
};

const maxDepthRecurse = {
  type: 'page',
  body: [
    {
      type: 'loop',
      items: '${deepTree}',
      itemName: 'node',
      keyBy: 'item.label',
      body: [
        { type: 'text', text: '${$slot.node.label}' },
        {
          type: 'fragment',
          when: '${$slot.node.children && $slot.node.children.length > 0}',
          body: [{ type: 'recurse', items: '${$slot.node.children}', maxDepth: 2 }],
        },
      ],
    },
  ],
};

const basicRecurse = {
  type: 'page',
  body: [
    {
      type: 'loop',
      items: '${tree}',
      itemName: 'node',
      keyBy: 'item.label',
      body: [
        { type: 'text', text: '${$slot.node.label}' },
        {
          type: 'fragment',
          when: '${$slot.node.children && $slot.node.children.length > 0}',
          body: [
            {
              type: 'recurse',
              items: '${$slot.node.children}',
            },
          ],
        },
      ],
    },
  ],
};

const richRecurse = {
  type: 'page',
  body: [
    {
      type: 'loop',
      items: '${orgTree}',
      itemName: 'node',
      keyBy: 'item.label',
      body: [
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          gap: 2,
          body: [
            { type: 'icon', icon: 'folder-open', size: 14 },
            { type: 'text', text: '${$slot.node.label}' },
            { type: 'badge', text: 'L${$slot.node.depth ?? 0}', level: 'info' },
          ],
        },
        {
          type: 'fragment',
          when: '${$slot.node.children && $slot.node.children.length > 0}',
          body: [
            {
              type: 'recurse',
              items: '${$slot.node.children}',
            },
          ],
        },
      ],
    },
  ],
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
          { label: 'Backend', depth: 2, children: [] },
        ],
      },
      {
        label: 'Design',
        depth: 1,
        children: [{ label: 'UX Research', depth: 2, children: [] }],
      },
    ],
  },
];

export function RecurseLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Recursive tree renderer that walks nested item arrays to a configurable max depth. The body region receives each node as itemName."
      scenarios={[
        {
          title: 'Simple recursive label tree',
          description:
            "Each node's label is rendered as text. Children are discovered automatically via the children array.",
          schema: basicRecurse,
          data: {
            tree: [
              {
                label: 'Root A',
                children: [
                  { label: 'Child A1', children: [] },
                  { label: 'Child A2', children: [] },
                ],
              },
              {
                label: 'Root B',
                children: [{ label: 'Child B1', children: [] }],
              },
            ],
          },
        },
        {
          title: 'Rich tree with icon, label, and depth badge',
          description:
            'Each node renders as a flex row with a folder icon, the node label, and a badge showing its depth level.',
          schema: richRecurse,
          data: { orgTree: orgTreeData },
        },
        {
          title: 'Deep tree renders all 6 levels without stack overflow',
          description:
            'A 6-level chain renders end-to-end in a real browser (host-recurse-deep).',
          schema: deepRecurse,
          data: { deepTree },
        },
        {
          title: 'maxDepth 2 truncates recursion beyond depth 2',
          description:
            'The same deep tree with maxDepth: 2 renders Levels 0-1 and stops (host-recurse-deep termination guard).',
          schema: maxDepthRecurse,
          data: { deepTree },
        },
      ]}
    />
  );
}
