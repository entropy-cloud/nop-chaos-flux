import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const itemList = {
  type: 'page',
  body: [
    {
      type: 'list',
      testid: 'demo-list-items',
      items: '${tasks}',
      item: [
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          justify: 'between',
          gap: 8,
          body: [
            { type: 'text', text: '${$slot.item.title}' },
            { type: 'badge', text: '#${$slot.index}' },
          ],
        },
      ],
    },
  ],
};

const emptyList = {
  type: 'page',
  body: [
    {
      type: 'list',
      testid: 'demo-list-empty',
      items: '${tasks}',
      empty: { type: 'text', text: 'No tasks yet — add one to get started.' },
      item: { type: 'text', text: '${$slot.item.title}' },
    },
  ],
};

const singleSelectionList = {
  type: 'page',
  body: [
    {
      type: 'list',
      testid: 'demo-list-single',
      selectionMode: 'single',
      items: '${tasks}',
      onItemClick: {
        action: 'openDialog',
        args: {
          title: 'Item click',
          body: [{ type: 'text', text: 'Hello from item click' }],
        },
      },
      item: [
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          justify: 'between',
          gap: 8,
          body: [
            { type: 'text', text: '${$slot.item.title}' },
            { type: 'badge', text: '${$slot.item.priority}' },
          ],
        },
      ],
    },
  ],
};

const multipleSelectionList = {
  type: 'page',
  body: [
    {
      type: 'list',
      testid: 'demo-list-multiple',
      selectionMode: 'multiple',
      items: '${tasks}',
      item: [
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          justify: 'between',
          gap: 8,
          body: [
            { type: 'text', text: '${$slot.item.title}' },
            { type: 'badge', text: '${$slot.item.priority}' },
          ],
        },
      ],
    },
  ],
};

const tasksData = {
  tasks: [
    { id: 't1', title: 'Design schema contract', priority: 'high' },
    { id: 't2', title: 'Implement list renderer', priority: 'medium' },
    { id: 't3', title: 'Wire playground demo', priority: 'low' },
  ],
};

export function ListLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Ordered collection renderer: iterates a single items array through an item region, with an empty state and local controlled selection (single / multiple / none)."
      scenarios={[
        {
          title: 'Collection with item template',
          description:
            'The item region instantiates once per entry with per-item scope ($slot.item / $slot.index).',
          schema: itemList,
          data: tasksData,
        },
        {
          title: 'Empty state',
          description: 'When items resolves to an empty array, the empty region/value renders.',
          schema: emptyList,
          data: { tasks: [] },
        },
        {
          title: 'Single selection + onItemClick',
          description:
            'selectionMode "single" is mutually exclusive (local controlled state). onItemClick reports the clicked item against its per-item scope.',
          schema: singleSelectionList,
          data: tasksData,
        },
        {
          title: 'Multiple selection',
          description: 'selectionMode "multiple" accumulates selections across items.',
          schema: multipleSelectionList,
          data: tasksData,
        },
      ]}
    />
  );
}
