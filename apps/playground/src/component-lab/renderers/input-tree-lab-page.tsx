import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { createLazyTreeHostEnv, orgTreeOptions } from './tree-lab-host';

const radioMode = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'input-tree',
          name: 'department',
          label: 'Department (single select)',
          treeMode: 'radio',
          options: orgTreeOptions,
        },
        { type: 'text', text: 'Selected: ${department ?? "(none)"}' },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const checkboxMode = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'input-tree',
          name: 'teams',
          label: 'Teams (multi-select)',
          treeMode: 'checkbox',
          options: orgTreeOptions,
        },
        { type: 'text', text: 'Selected IDs: ${(teams ?? []).join(", ") || "(none)"}' },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

// Lazy children host: /api/lazy-ok returns children for the expanded node;
// /api/lazy-fail rejects the FIRST call per node, then succeeds (retry proof).
// Host implementation is shared with tree-select via tree-lab-host (WA-clab-003);
// the factory hands out a fresh per-node fail counter per page.
const lazyEnv = createLazyTreeHostEnv();

const hostLazyEcho = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.hostTree',
      data: { node: undefined },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'input-tree',
          name: 'node',
          label: 'Remote lazy tree',
          treeMode: 'radio',
          childrenSource: { action: 'ajax', args: { url: '/api/lazy-ok', method: 'get' } },
          options: [
            { label: 'Dept A', value: 'a', deferChildren: true },
            { label: 'Leaf B', value: 'b' },
          ],
        },
        {
          type: 'input-tree',
          name: 'nodeFail',
          label: 'Lazy tree with failure',
          treeMode: 'radio',
          childrenSource: { action: 'ajax', args: { url: '/api/lazy-fail', method: 'get' } },
          options: [
            { label: 'Dept C', value: 'c', deferChildren: true },
          ],
        },
        {
          type: 'text',
          testid: 'mr-tree-echo',
          text: '${submitted ? "MR-TREE:" + $JSON.stringify(ui.hostTree) : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function InputTreeLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Inline tree selector with radio (single) and checkbox (multi) modes. The tree nodes expand and collapse; selected values are stored in the form field."
      scenarios={[
        {
          title: 'Radio mode — single department selection',
          description:
            'Only one node can be selected at a time. The selected department ID is reflected in the rendered text summary.',
          schema: radioMode,
        },
        {
          title: 'Checkbox mode — multi-team selection',
          description:
            'Multiple nodes can be checked simultaneously. Selected IDs are displayed as a comma-separated list.',
          schema: checkboxMode,
        },
        {
          title: 'Host form remote lazy children + retry (bug 73 pattern)',
          description:
            'Expand a deferChildren node — children load from the remote childrenSource; the failing endpoint shows inline error + retry, and retry succeeds; submit echoes the committed value.',
          schema: hostLazyEcho,
          env: lazyEnv,
        },
      ]}
    />
  );
}
