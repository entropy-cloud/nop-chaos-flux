import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

interface RegionApiRequest {
  url?: string;
}

function regionFetchEnv() {
  const tree: Record<string, Array<Record<string, unknown>>> = {
    '': [
      { id: 'gd', name: 'Guangdong', type: 'province' },
      { id: 'zj', name: 'Zhejiang', type: 'province' },
    ],
    'gd': [
      { id: 'gd-gz', name: 'Guangzhou', type: 'city' },
      { id: 'gd-sz', name: 'Shenzhen', type: 'city' },
    ],
    'gd-gz': [
      { id: 'gd-gz-tianhe', name: 'Tianhe', type: 'district' },
      { id: 'gd-gz-haizhu', name: 'Haizhu', type: 'district' },
    ],
    'gd-sz': [{ id: 'gd-sz-nanshan', name: 'Nanshan', type: 'district' }],
    'zj': [{ id: 'zj-hz', name: 'Hangzhou', type: 'city' }],
    resolve: [
      {
        id: 'gd-gz-tianhe',
        name: 'Tianhe',
        type: 'district',
        extra: {
          path: [
            { id: 'gd', name: 'Guangdong' },
            { id: 'gd-gz', name: 'Guangzhou' },
            { id: 'gd-gz-tianhe', name: 'Tianhe' },
          ],
        },
      },
    ],
  };
  return {
    fetcher: async <T,>(api: RegionApiRequest) => {
      const url = new URL(String(api.url ?? ''), 'http://mock.local');
      if (url.pathname.endsWith('/children')) {
        const nodeId = url.searchParams.get('orgNodeId') ?? '';
        return { status: 0, data: { nodes: tree[nodeId] ?? [] } } as T;
      }
      if (url.pathname.endsWith('/resolve')) {
        return { status: 0, data: { nodes: tree.resolve } } as T;
      }
      return { status: 404, data: null } as T;
    },
  };
}

const regionSourceChildren = {
  action: 'ajax',
  args: {
    url: '/api/region/children',
    params: {
      orgNodeId: '${orgNodeId}',
      orgDepth: '${orgDepth}',
      orgPage: '${orgPage}',
      orgPageSize: '${orgPageSize}',
    },
  },
};
const regionSourceResolve = {
  action: 'ajax',
  args: { url: '/api/region/resolve', params: { orgValues: '${orgValues}' } },
};

const cascadePage = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'input-city',
          name: 'region',
          label: 'Region (lazy cascade)',
          clearable: true,
          sourceChildren: regionSourceChildren,
          description: 'Drill province → city → district; clicking a name at any level commits that level.',
        },
        { type: 'text', text: 'Region: ${region}' },
      ],
    },
  ],
};

const echoPage = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'input-city',
          name: 'billingRegion',
          label: 'Billing region (echo via extra.path)',
          clearable: true,
          value: 'gd-gz-tianhe',
          sourceChildren: regionSourceChildren,
          sourceResolve: regionSourceResolve,
          description: 'Preselected district id resolves; the provider path chain (extra.path) renders as 省市区 path text.',
        },
      ],
    },
  ],
};

export function RegionLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Region cascade picker over the org data-source protocol (missing-components L2.2). Desktop cascader columns and a mobile wheel branch share one renderer core; every level is selectable."
      scenarios={[
        {
          title: 'Lazy cascade three levels',
          description: 'Drill and commit at any level; empty branches show the empty state.',
          schema: cascadePage,
          env: regionFetchEnv(),
        },
        {
          title: 'Preselected echo via extra.path',
          description: 'Initial id resolves into a 省市区 path label through the provider path chain.',
          schema: echoPage,
          env: regionFetchEnv(),
        },
      ]}
    />
  );
}
