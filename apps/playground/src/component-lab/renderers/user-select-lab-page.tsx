import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

interface OrgApiRequest {
  url?: string;
}

function orgFetchEnv(options?: { failChildren?: boolean }) {
  const org: Record<string, Array<Record<string, unknown>>> = {
    root: [
      { id: 'dept-eng', name: 'Engineering', type: 'department' },
      { id: 'dept-sales', name: 'Sales', type: 'department' },
    ],
    'dept-eng': [
      { id: 'u-alice', name: 'Alice Zhang', type: 'user', extra: { title: 'Frontend' } },
      { id: 'u-bob', name: 'Bob Li', type: 'user', disabled: true, disabledTip: 'Resigned' },
      { id: 'dept-platform', name: 'Platform', type: 'department' },
    ],
    'dept-platform': [
      { id: 'u-carol', name: 'Carol Wang', type: 'user' },
      { id: 'u-dave', name: 'Dave Chen', type: 'user' },
    ],
    'dept-sales': [{ id: 'u-erin', name: 'Erin Liu', type: 'user' }],
    search: [
      { id: 'u-alice', name: 'Alice Zhang', type: 'user' },
      { id: 'u-carol', name: 'Carol Wang', type: 'user' },
    ],
    resolve: [{ id: 'u-alice', name: 'Alice Zhang', type: 'user' }],
  };
  return {
    fetcher: async <T,>(api: OrgApiRequest) => {
      const url = new URL(String(api.url ?? ''), 'http://mock.local');
      if (url.pathname.endsWith('/children')) {
        if (options?.failChildren) {
          return { status: 500, message: 'org backend down' } as T;
        }
        const nodeId = url.searchParams.get('orgNodeId') ?? '';
        const nodes = nodeId === '' ? org.root : (org[nodeId] ?? []);
        return { status: 0, data: { nodes } } as T;
      }
      if (url.pathname.endsWith('/search')) {
        return { status: 0, data: { nodes: org.search } } as T;
      }
      if (url.pathname.endsWith('/resolve')) {
        return { status: 0, data: { nodes: org.resolve } } as T;
      }
      return { status: 404, data: null } as T;
    },
  };
}

const orgSourceChildren = {
  action: 'ajax',
  args: {
    url: '/api/org/children',
    params: {
      orgNodeId: '${orgNodeId}',
      orgDepth: '${orgDepth}',
      orgPage: '${orgPage}',
      orgPageSize: '${orgPageSize}',
    },
  },
};
const orgSourceSearch = {
  action: 'ajax',
  args: {
    url: '/api/org/search',
    params: { searchQuery: '${searchQuery}', orgPage: '${orgPage}', orgPageSize: '${orgPageSize}' },
  },
};
const orgSourceResolve = {
  action: 'ajax',
  args: { url: '/api/org/resolve', params: { orgValues: '${orgValues}' } },
};

const staticPickerPage = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'user-select',
          name: 'reviewer',
          label: 'Reviewer (static roster)',
          clearable: true,
          options: [
            { id: 'u-frank', name: 'Frank Zhao', type: 'user' },
            { id: 'u-gina', name: 'Gina Wu', type: 'user' },
          ],
          description: 'Static options only: departments absent, both users selectable, local filtering while typing.',
        },
        { type: 'text', text: 'Reviewer: ${reviewer}' },
      ],
    },
  ],
};

const remoteMultiPage = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'user-select',
          name: 'approver',
          label: 'Approvers (org tree + search)',
          multiple: true,
          clearable: true,
          sourceChildren: orgSourceChildren,
          sourceSearch: orgSourceSearch,
          sourceResolve: orgSourceResolve,
          value: ['u-alice'],
          description:
            'Departments navigate, users select. Echo of the preselected id resolves through sourceResolve. Disabled users show a locked checkbox.',
        },
      ],
    },
  ],
};

const childrenFailurePage = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'user-select',
          name: 'observer',
          label: 'Observer (children source failing)',
          sourceChildren: orgSourceChildren,
          description: 'Open the picker: the root load fails with an inline error and a Retry action.',
        },
      ],
    },
  ],
};

const replaceSearchPage = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'user-select',
          name: 'escalation',
          label: 'Escalation (replace search)',
          searchMergeMode: 'replace',
          sourceChildren: orgSourceChildren,
          sourceSearch: orgSourceSearch,
          description: 'searchMergeMode replace: typing shows remote results only; clearing restores the tree.',
        },
      ],
    },
  ],
};

export function UserSelectLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="User picker over the org data-source protocol (missing-components L2.1). Departments navigate, users select; lazy children, debounced remote search, echo resolution, and failure retries."
      scenarios={[
        {
          title: 'Static roster single select',
          description: 'Inline options, local filtering, single-value commit.',
          schema: staticPickerPage,
        },
        {
          title: 'Org tree + search multi select',
          description: 'Lazy-loaded departments, remote search with echo resolution, multi-value chips.',
          schema: remoteMultiPage,
          env: orgFetchEnv(),
        },
        {
          title: 'Children source failure with retry',
          description: 'Root load fails; the panel surfaces an inline error row with Retry.',
          schema: childrenFailurePage,
          env: orgFetchEnv({ failChildren: true }),
        },
        {
          title: 'Replace-mode search',
          description: 'searchMergeMode replace swaps the tree for flat remote results while searching.',
          schema: replaceSearchPage,
          env: orgFetchEnv(),
        },
      ]}
    />
  );
}
