import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { createLazyTreeHostEnv, orgTreeOptions } from './tree-lab-host';

const singleSelect = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'tree-select',
          name: 'team',
          label: 'Select Team',
          searchable: true,
          options: orgTreeOptions,
        },
        { type: 'text', text: 'Selected: ${team ?? "(none)"}' },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const checkboxTreeSelect = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'tree-select',
          name: 'departments',
          label: 'Departments (checkbox mode)',
          treeMode: 'checkbox',
          searchable: true,
          options: orgTreeOptions,
        },
        { type: 'text', text: 'Selected: ${(departments ?? []).join(", ") || "(none)"}' },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

// Lazy-children host env shared with input-tree via tree-lab-host (WA-clab-003);
// the factory hands out a fresh per-node fail counter so the two labs stay
// independent.
const lazyEnv = createLazyTreeHostEnv();

const hostLazyEcho = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.hostTreeSelect',
      data: { node: undefined, nodeFail: undefined },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'tree-select',
          name: 'node',
          label: 'Remote lazy tree select',
          childrenSource: { action: 'ajax', args: { url: '/api/lazy-ok', method: 'get' } },
          options: [
            { label: 'Dept A', value: 'a', deferChildren: true },
            { label: 'Leaf B', value: 'b' },
          ],
        },
        {
          type: 'tree-select',
          name: 'nodeFail',
          label: 'Lazy tree select with failure',
          childrenSource: { action: 'ajax', args: { url: '/api/lazy-fail', method: 'get' } },
          options: [
            { label: 'Dept D', value: 'd', deferChildren: true },
          ],
        },
        {
          type: 'text',
          testid: 'mr-tree-select-echo',
          text: '${submitted ? "MR-TREESELECT:" + $JSON.stringify(ui.hostTreeSelect) : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function TreeSelectLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Popover-based tree selector. Click the trigger to open an expandable tree. Supports single-value and checkbox tree modes with search."
      scenarios={[
        {
          title: 'Single-value tree select with search',
          description:
            'Click the trigger to open the popover tree. Use the search box to filter nodes. The selected value is reflected in the trigger and scope-debug state.',
          schema: singleSelect,
        },
        {
          title: 'Checkbox tree-select with search',
          description:
            'With treeMode: checkbox, several nodes can be selected. All selected IDs are shown as a comma-separated list.',
          schema: checkboxTreeSelect,
        },
        {
          title: 'Host form remote lazy children + retry (bug 73 pattern)',
          description:
            'Open the popover, expand a deferChildren node — children load from the remote childrenSource; the failing endpoint shows inline error + retry, and retry succeeds; submit echoes the committed value.',
          schema: hostLazyEcho,
          env: lazyEnv,
        },
      ]}
    />
  );
}
