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

const longTasksData = {
  tasks: Array.from({ length: 12 }, (_, i) => ({
    id: `lt${i + 1}`,
    title: `Task #${i + 1}`,
    priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
  })),
};

const paginationList = {
  type: 'page',
  body: [
    {
      type: 'list',
      id: 'demo-list-pagination',
      testid: 'demo-list-pagination',
      items: '${tasks}',
      pagination: { enabled: true, pageSize: 4, total: 12 },
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
    {
      type: 'flex',
      direction: 'row',
      gap: 8,
      body: [
        {
          type: 'button',
          label: 'Page 1',
          onClick: {
            action: 'component:gotoPage',
            componentId: 'demo-list-pagination',
            args: { page: 1 },
          },
        },
        {
          type: 'button',
          label: 'Page 2',
          onClick: {
            action: 'component:gotoPage',
            componentId: 'demo-list-pagination',
            args: { page: 2 },
          },
        },
        {
          type: 'button',
          label: 'Page 3',
          onClick: {
            action: 'component:gotoPage',
            componentId: 'demo-list-pagination',
            args: { page: 3 },
          },
        },
      ],
    },
  ],
};

const infiniteList = {
  type: 'page',
  body: [
    {
      type: 'list',
      id: 'demo-list-infinite',
      testid: 'demo-list-infinite',
      items: '${tasks}',
      pagination: { enabled: true, mode: 'infinite', pageSize: 4, total: 12 },
      item: [
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          justify: 'between',
          gap: 8,
          body: [
            { type: 'text', text: '${$slot.item.title}' },
            { type: 'badge', text: '#${$slot.index + 1}' },
          ],
        },
      ],
    },
  ],
};

export function ListLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Ordered collection renderer: iterates a single items array through an item region, with an empty state, local controlled selection (single / multiple / none), opt-in pagination (local/scope/controlled ownership + clamp), and infinite-scroll (bottom load-more via sentinel)."
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
        {
          title: 'Pagination via gotoPage',
          description:
            'pagination.enabled slices items by page (local ownership, currentPage clamped to [1, totalPages]). Buttons invoke the list gotoPage capability (component:gotoPage by componentId). List never owns a request — data flows via events → action graph → data-source.',
          schema: paginationList,
          data: longTasksData,
        },
        {
          title: 'Infinite scroll load more',
          description:
            'pagination.mode "infinite" renders a bottom sentinel (IntersectionObserver). Reaching the bottom advances the page and reveals the next batch cumulatively; hasMore becomes false at the last page and the sentinel is hidden. List dispatches onLoadMore but never self-requests.',
          schema: infiniteList,
          data: longTasksData,
        },
      ]}
    />
  );
}
