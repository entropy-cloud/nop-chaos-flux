import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

interface OrgApiRequest {
  url?: string;
}

function deptFetchEnv() {
  const tree: Record<string, Array<Record<string, unknown>>> = {
    root: [
      { id: 'hq', name: 'Headquarters', type: 'department' },
      { id: 'rd', name: 'R&D Center', type: 'department' },
    ],
    hq: [
      { id: 'hq-finance', name: 'Finance Dept', type: 'department' },
      { id: 'hq-hr', name: 'HR Dept', type: 'department' },
    ],
    'hq-finance': [],
    'rd': [
      { id: 'rd-frontend', name: 'Frontend Team', type: 'department' },
      { id: 'rd-backend', name: 'Backend Team', type: 'department' },
    ],
    search: [
      { id: 'rd-frontend', name: 'Frontend Team', type: 'department' },
      { id: 'hq-hr', name: 'HR Dept', type: 'department' },
    ],
    resolve: [{ id: 'rd-frontend', name: 'Frontend Team', type: 'department' }],
  };
  return {
    fetcher: async <T,>(api: OrgApiRequest) => {
      const url = new URL(String(api.url ?? ''), 'http://mock.local');
      if (url.pathname.endsWith('/children')) {
        const nodeId = url.searchParams.get('orgNodeId') ?? '';
        const nodes = nodeId === '' ? tree.root : (tree[nodeId] ?? []);
        return { status: 0, data: { nodes } } as T;
      }
      if (url.pathname.endsWith('/search')) {
        return { status: 0, data: { nodes: tree.search } } as T;
      }
      if (url.pathname.endsWith('/resolve')) {
        return { status: 0, data: { nodes: tree.resolve } } as T;
      }
      return { status: 404, data: null } as T;
    },
  };
}

const deptSourceChildren = {
  action: 'ajax',
  args: {
    url: '/api/dept/children',
    params: {
      orgNodeId: '${orgNodeId}',
      orgDepth: '${orgDepth}',
      orgPage: '${orgPage}',
      orgPageSize: '${orgPageSize}',
    },
  },
};
const deptSourceSearch = {
  action: 'ajax',
  args: {
    url: '/api/dept/search',
    params: { searchQuery: '${searchQuery}', orgPage: '${orgPage}', orgPageSize: '${orgPageSize}' },
  },
};
const deptSourceResolve = {
  action: 'ajax',
  args: { url: '/api/dept/resolve', params: { orgValues: '${orgValues}' } },
};

const lazyMultiPage = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'department-select',
          name: 'costCenters',
          label: 'Cost centers (lazy tree)',
          multiple: true,
          sourceChildren: deptSourceChildren,
          description:
            'Expand departments level by level; empty responses terminate the branch (open Finance Dept for the empty state).',
        },
        { type: 'text', text: 'Selected: ${costCenters}' },
      ],
    },
  ],
};

const searchEchoPage = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'department-select',
          name: 'owningDept',
          label: 'Owning department (search + echo)',
          clearable: true,
          value: 'rd-frontend',
          sourceChildren: deptSourceChildren,
          sourceSearch: deptSourceSearch,
          sourceResolve: deptSourceResolve,
          description: 'Preselected id resolves through sourceResolve; typing searches departments flat.',
        },
      ],
    },
  ],
};

export function DepartmentSelectLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Department picker over the org data-source protocol (missing-components L2.1). Lazy tree browse with empty-page termination, flat search, and echo resolution of preselected values."
      scenarios={[
        {
          title: 'Lazy tree multi select',
          description: 'Drill into departments, check leaves, watch empty branches terminate.',
          schema: lazyMultiPage,
          env: deptFetchEnv(),
        },
        {
          title: 'Search + echo single select',
          description: 'Preselected value resolves its label; search switches to a flat result list.',
          schema: searchEchoPage,
          env: deptFetchEnv(),
        },
      ]}
    />
  );
}
