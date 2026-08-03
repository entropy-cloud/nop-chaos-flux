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
