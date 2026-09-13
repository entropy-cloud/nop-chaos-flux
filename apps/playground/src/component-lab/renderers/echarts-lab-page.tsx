import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const monthRows = [
  { month: 'Jan', revenue: 4200, expenses: 2800 },
  { month: 'Feb', revenue: 5100, expenses: 3100 },
  { month: 'Mar', revenue: 4800, expenses: 2600 },
];

const altMonthRows = [
  { month: 'Apr', revenue: 6200, expenses: 3400 },
  { month: 'May', revenue: 5700, expenses: 3000 },
  { month: 'Jun', revenue: 6800, expenses: 3700 },
];

const datasetBarChart = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Load Apr–Jun batch',
      variant: 'outline',
      onClick: {
        action: 'setValue',
        args: { path: 'monthRows', value: altMonthRows },
      },
    },
    {
      type: 'echarts',
      height: 360,
      dataset: { source: '${monthRows}', dimensions: ['month', 'revenue', 'expenses'] },
      option: {
        tooltip: { trigger: 'axis' },
        legend: { bottom: 0 },
        xAxis: { type: 'category' },
        yAxis: { type: 'value' },
        series: [
          { type: 'bar', name: 'Revenue', encode: { x: 'month', y: 'revenue' } },
          { type: 'bar', name: 'Expenses', encode: { x: 'month', y: 'expenses' } },
        ],
      },
    },
  ],
};

const datasetLineChart = {
  type: 'echarts',
  renderer: 'svg',
  height: 320,
  dataset: { source: '${monthRows}', dimensions: ['month', 'revenue'] },
  option: {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category' },
    yAxis: { type: 'value' },
    series: [{ type: 'line', smooth: true, areaStyle: {}, encode: { x: 'month', y: 'revenue' } }],
  },
};

const clickEventChart = {
  type: 'echarts',
  height: 320,
  dataset: { source: '${monthRows}', dimensions: ['month', 'revenue'] },
  option: {
    tooltip: {},
    xAxis: { type: 'category' },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', encode: { x: 'month', y: 'revenue' } }],
  },
  events: {
    onClick: {
      action: 'showToast',
      args: { level: 'info', message: 'bar clicked: ${event.name}' },
    },
  },
};

const darkThemePieChart = {
  type: 'echarts',
  theme: 'dark',
  height: 320,
  dataset: { source: '${monthRows}', dimensions: ['month', 'revenue'] },
  option: {
    tooltip: {},
    legend: { bottom: 0 },
    series: [{ type: 'pie', radius: '60%', encode: { itemName: 'month', value: 'revenue' } }],
  },
};

const emptyState = {
  type: 'page',
  body: [{ type: 'echarts', height: 320, option: {} }],
};

export function EChartsLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Apache ECharts renderer with native option passthrough. Advanced types verified here: sankey, treemap, tree, boxplot, gauge, funnel, radar; full-feature types: map (GeoJSON registerMap bridge), candlestick, graph, sunburst, themeRiver, custom (expression-bound option with host renderItem). E2 scope: dataset/encode expression binding to scope data, flux events.* action bridge, and the automatic flux theme mapped from CSS variables. ECharts loads as an optional lazy chunk only when an echarts renderer instance mounts; the recharts `chart` renderer stays the default for basic chart scenarios."
      scenarios={[
        {
          title: 'Dataset binding with a data swap button',
          description:
            'dataset.source binds the scope path monthRows via an expression; the button dispatches setValue on that path and the chart re-sets the composed option (tooltip + legend come from the native option).',
          schema: datasetBarChart,
          data: { monthRows },
        },
        {
          title: 'Dataset-driven smooth line (svg renderer)',
          description:
            'renderer:"svg" switches the echarts init mode; the series has no inline data — it encodes month → x and revenue → y from the dataset.',
          schema: datasetLineChart,
          data: { monthRows },
        },
        {
          title: 'Click event → flux action',
          description:
            'events.onClick maps to the native click event and dispatches a showToast action with the normalized echarts event params (event.name is the clicked bar).',
          schema: clickEventChart,
          data: { monthRows },
        },
        {
          title: 'Explicit theme passthrough (dark) on a dataset pie',
          description:
            'theme:"dark" is passed to echarts.init; without a theme prop the renderer applies the automatic flux theme mapped from CSS variables (--chart-1..5, axis/legend/tooltip tokens).',
          schema: darkThemePieChart,
          data: { monthRows },
        },
        {
          title: 'Sankey — flow graph (nodes + links)',
          description:
            'Graph-structured series declare data/links inline in the option (dataset+encode does not apply to sankey by native semantics).',
          schema: {
            type: 'echarts',
            height: 320,
            option: {
              series: [
                {
                  type: 'sankey',
                  data: [{ name: 'Visit' }, { name: 'Signup' }, { name: 'Trial' }, { name: 'Paid' }],
                  links: [
                    { source: 'Visit', target: 'Signup', value: 60 },
                    { source: 'Signup', target: 'Trial', value: 35 },
                    { source: 'Trial', target: 'Paid', value: 18 },
                  ],
                },
              ],
            },
          },
          data: {},
        },
        {
          title: 'Treemap — hierarchical tiles',
          description:
            'Treemap consumes a value hierarchy via series.data children; a click drilldown can be wired through events.onDblClick if needed.',
          schema: {
            type: 'echarts',
            height: 320,
            option: {
              series: [
                {
                  type: 'treemap',
                  data: [
                    { name: 'Frontend', value: 42, children: [{ name: 'react', value: 30 }, { name: 'vue', value: 12 }] },
                    { name: 'Backend', value: 28 },
                    { name: 'Infra', value: 18 },
                  ],
                },
              ],
            },
          },
          data: {},
        },
        {
          title: 'Tree — collapsible hierarchy',
          description:
            'Tree series render parent/children hierarchies with orient and initial expansion from native option.',
          schema: {
            type: 'echarts',
            height: 320,
            option: {
              series: [
                {
                  type: 'tree',
                  orient: 'LR',
                  data: [
                    {
                      name: 'root',
                      children: [
                        { name: 'team-a', children: [{ name: 'alice' }, { name: 'bob' }] },
                        { name: 'team-b', children: [{ name: 'carol' }] },
                      ],
                    },
                  ],
                },
              ],
            },
          },
          data: {},
        },
        {
          title: 'Boxplot — precomputed five-number summaries via 2D dataset',
          description:
            'Boxplot rows are precomputed [min, Q1, median, Q3, max] statistics bound through a 2D array dataset (the dataset.transform path stays available for raw observations).',
          schema: {
            type: 'echarts',
            height: 320,
            dataset: {
              source: '${boxStats}',
              dimensions: ['min', 'q1', 'median', 'q3', 'max'],
            },
            option: {
              tooltip: {},
              xAxis: { type: 'category' },
              yAxis: { type: 'value' },
              series: [{ type: 'boxplot' }],
            },
          },
          data: { boxStats: [[620, 680, 694, 712, 760], [650, 700, 718, 736, 790], [600, 660, 690, 705, 740]] },
        },
        {
          title: 'Gauge — scalar dial with click event',
          description:
            'Gauge renders a scalar value per data entry; events.onClick dispatches a flux action with the normalized echarts params.',
          schema: {
            type: 'echarts',
            height: 300,
            option: {
              series: [{ type: 'gauge', data: [{ value: 68, name: 'cpu' }] }],
            },
            events: {
              onClick: {
                action: 'showToast',
                args: { level: 'info', message: 'gauge clicked' },
              },
            },
          },
          data: {},
        },
        {
          title: 'Funnel — staged values',
          description:
            'Funnel stages are labeled scalar data entries sorted by value.',
          schema: {
            type: 'echarts',
            height: 320,
            option: {
              tooltip: {},
              series: [
                {
                  type: 'funnel',
                  data: [
                    { name: 'visit', value: 100 },
                    { name: 'signup', value: 60 },
                    { name: 'paid', value: 25 },
                  ],
                },
              ],
            },
          },
          data: {},
        },
        {
          title: 'Radar — option-level radar coordinate + indicators',
          description:
            'Radar needs the option-level radar coordinate (indicator list); series data entries hold one value array per entity.',
          schema: {
            type: 'echarts',
            height: 320,
            option: {
              tooltip: {},
              legend: { bottom: 0 },
              radar: {
                indicator: [
                  { name: 'sales', max: 100 },
                  { name: 'cost', max: 100 },
                  { name: 'quality', max: 100 },
                ],
              },
              series: [
                {
                  type: 'radar',
                  data: [
                    { value: [85, 40, 90], name: 'product A' },
                    { value: [60, 70, 65], name: 'product B' },
                  ],
                },
              ],
            },
          },
          data: {},
        },
        {
          title: 'Map — GeoJSON bound from scope (registerMap bridge)',
          description:
            'map.geoJson binds the region GeoJSON from scope (host loads it via data-source); the renderer registers it with echarts.registerMap before init. option.series[].map references the same name — the map field only registers data.',
          schema: {
            type: 'echarts',
            height: 320,
            map: { name: 'lab-geo', geoJson: '${regionGeo}' },
            option: {
              tooltip: {},
              series: [{ type: 'map', map: 'lab-geo' }],
            },
          },
          data: { regionGeo: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'Alpha' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]] } }, { type: 'Feature', properties: { name: 'Beta' }, geometry: { type: 'Polygon', coordinates: [[[3, 0], [5, 0], [5, 2], [3, 2], [3, 0]]] } }] } },
        },
        {
          title: 'Candlestick — OHLC rows via 2D dataset',
          description:
            'Candlestick consumes [open, close, low, high] rows bound through a 2D array dataset.',
          schema: {
            type: 'echarts',
            height: 320,
            dataset: { source: '${ohlc}' },
            option: {
              tooltip: {},
              xAxis: { type: 'category' },
              yAxis: { type: 'value' },
              series: [{ type: 'candlestick' }],
            },
          },
          data: { ohlc: [['2026-01-02', 20, 34, 10, 38], ['2026-01-03', 40, 15, 5, 42], ['2026-01-06', 36, 45, 30, 48]] },
        },
        {
          title: 'Graph — force layout with categories',
          description:
            'Graph declares nodes/links/categories inline in the series (graph structures are not dataset+encode territory).',
          schema: {
            type: 'echarts',
            height: 320,
            option: {
              tooltip: {},
              series: [
                {
                  type: 'graph',
                  layout: 'force',
                  roam: true,
                  categories: [{ name: 'core' }, { name: 'service' }],
                  data: [
                    { name: 'gateway', category: 0 },
                    { name: 'auth', category: 1 },
                    { name: 'billing', category: 1 },
                  ],
                  links: [
                    { source: 'gateway', target: 'auth' },
                    { source: 'gateway', target: 'billing' },
                  ],
                },
              ],
            },
          },
          data: {},
        },
        {
          title: 'Sunburst — radial hierarchy',
          description:
            'Sunburst renders radial hierarchy from series.data children with per-level values.',
          schema: {
            type: 'echarts',
            height: 320,
            option: {
              series: [
                {
                  type: 'sunburst',
                  data: [
                    {
                      name: 'platform',
                      children: [
                        { name: 'web', value: 40 },
                        { name: 'mobile', value: 25 },
                      ],
                    },
                    { name: 'ops', value: 15 },
                  ],
                },
              ],
            },
          },
          data: {},
        },
        {
          title: 'ThemeRiver — time stream over singleAxis',
          description:
            'ThemeRiver consumes [date, value, name] point triples and needs the option-level singleAxis coordinate.',
          schema: {
            type: 'echarts',
            height: 320,
            option: {
              tooltip: {},
              legend: { bottom: 0 },
              singleAxis: { type: 'time' },
              series: [
                {
                  type: 'themeRiver',
                  data: [
                    ['2026-01-01', 10, 'alpha'],
                    ['2026-01-02', 20, 'alpha'],
                    ['2026-01-01', 5, 'beta'],
                    ['2026-01-02', 12, 'beta'],
                  ],
                },
              ],
            },
          },
          data: {},
        },
        {
          title: 'Custom — host-provided renderItem via expression-bound option',
          description:
            'renderItem is a function and cannot be written in JSON: bind the whole option from a host-provided builder (xui:imports) — the expression result keeps function references.',
          schema: {
            type: 'echarts',
            height: 320,
            option: '${customOption}',
          },
          data: {
            customOption: {
              xAxis: { type: 'category', data: ['a', 'b'] },
              yAxis: {},
              series: [
                {
                  type: 'custom',
                  renderItem: (params: unknown, api: { value: (index: number) => number }) => {
                    const style = { text: String(api.value(0)) };
                    return { type: 'text', style };
                  },
                  data: [1, 2],
                },
              ],
            },
          },
        },
        {
          title: 'Explicit empty state',
          description:
            'An option without series is a valid empty state: the canvas renders with data-empty="true" and never throws (DD1-style explicit-empty contract). A bound dataset resolving to an empty array hits the same empty state.',
          schema: emptyState,
          data: {},
        },
      ]}
    />
  );
}
