import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const orgTreeOptions = [
  {
    label: 'Engineering',
    value: 'engineering',
    children: [
      { label: 'Frontend', value: 'frontend', children: [] },
      { label: 'Backend', value: 'backend', children: [] },
      { label: 'Platform', value: 'platform', children: [] },
    ],
  },
  {
    label: 'Design',
    value: 'design',
    children: [
      { label: 'UX Research', value: 'ux', children: [] },
      { label: 'Brand', value: 'brand', children: [] },
    ],
  },
  {
    label: 'Operations',
    value: 'ops',
    children: [
      { label: 'DevOps', value: 'devops', children: [] },
      { label: 'Support', value: 'support', children: [] },
    ],
  },
];

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

// Shared lazy-children host env (mirrors input-tree-lab-page); per-node fail
// counter keeps the two labs independent.
const lazyFailCalls = new Map<string, number>();
const lazyEnv = {
  fetcher: async function <T>(api: any, ctx: any) {
    const body = ctx?.scope?.readOwn?.() ?? {};
    const url = api?.url;
    const parent = body.expandedNodeValue;
    if (url === '/api/lazy-ok') {
      return {
        ok: true,
        status: 200,
        data: [
          { label: `Sub A of ${parent}`, value: `${parent}-a` },
          { label: `Sub B of ${parent}`, value: `${parent}-b` },
        ] as T,
      };
    }
    if (url === '/api/lazy-fail') {
      const key = String(parent ?? '');
      const calls = (lazyFailCalls.get(key) ?? 0) + 1;
      lazyFailCalls.set(key, calls);
      if (calls <= 1) {
        return { ok: false, status: 500, data: { message: 'Lazy load failed (first attempt)' } as T };
      }
      return {
        ok: true,
        status: 200,
        data: [{ label: `Retried child of ${parent}`, value: `${parent}-r` }] as T,
      };
    }
    return { ok: true, status: 200, data: null as T };
  },
};

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
