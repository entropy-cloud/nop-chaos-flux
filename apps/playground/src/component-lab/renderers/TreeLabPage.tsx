import { MultiScenarioLabPage } from '../MultiScenarioLabPage';

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

const selectableTree = {
  type: 'page',
  body: [
    {
      type: 'tree',
      data: '${orgTree}',
      labelField: 'name',
      keyField: 'id',
      childrenKey: 'children',
      initiallyExpanded: true,
      selectable: true,
      selectedIds: '${selectedIds}',
      onSelect: { action: 'setValue', args: { path: 'selectedIds', value: '${selectedIds}' } }
    },
    { type: 'text', text: 'Selected IDs: ${(selectedIds ?? []).join(", ") || "(none)"}' }
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
      introDescription="Hierarchical tree view with expand/collapse and custom node templates. Supports selectable (checkbox) mode."
      scenarios={[
        {
          title: 'Expand/collapse org tree',
          description: 'An organizational tree with all nodes initially expanded. Click arrows to expand or collapse branches.',
          schema: expandCollapseTree,
          data: { orgTree: orgTreeData }
        },
        {
          title: 'Selectable tree with selected IDs display',
          description: 'With selectable: true, checkboxes appear on each node. Selected node IDs are shown live below the tree.',
          schema: selectableTree,
          data: { orgTree: orgTreeData, selectedIds: [] }
        }
      ]}
    />
  );
}
