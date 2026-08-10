import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicSparkline = {
  type: 'page',
  body: [{ type: 'sparkline', data: '${trend}' }],
};

const variants = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'row',
      gap: 4,
      body: [
        { type: 'sparkline', label: 'fill + smooth', data: '${trend}', fill: true, smooth: true },
        { type: 'sparkline', label: 'status up', data: '${trend}' },
        { type: 'sparkline', label: 'status down 显式', data: '${trend}', color: { status: 'down' } },
        { type: 'sparkline', label: '静态色', data: '${trend}', color: 'hsl(var(--chart-2))' },
        { type: 'sparkline', label: '显式 Y 域', data: '${trend}', width: 160, height: 40, min: 0, max: 200 },
      ],
    },
  ],
};

const degraded = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'row',
      gap: 4,
      body: [
        { type: 'sparkline', label: '空数据', data: [] },
        { type: 'sparkline', label: '单点', data: [7] },
        { type: 'sparkline', label: '全等值', data: [5, 5, 5] },
      ],
    },
  ],
};

const statTileComposition = {
  type: 'page',
  body: [
    {
      type: 'stat-tile',
      value: '${revenue}',
      label: '本月营收（stat-tile 内置 sparkline 组合位）',
      prefix: '¥',
      suffix: '万',
      delta: { value: 12.5, label: '同比 +12.5%', direction: 'up' },
      sparkline: '${trend}',
    },
  ],
};

export function SparklineLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="sparkline 原子组件：自绘 SVG polyline 迷你趋势图（零新增依赖）。data 支持 ${expr}；color 支持静态色或 { status } 趋势语义色（CSS 变量）；fill 渐变填充 / smooth 贝塞尔平滑 / min·max 显式 Y 域。stat-tile 内部 sparkline 字段与独立 sparkline 组件共享同一套 path 纯函数语义。"
      scenarios={[
        {
          title: '基本趋势',
          description: 'data 经 ${expr} 解析，缺省 120×32，涨势自动取 success 语义色。',
          schema: basicSparkline,
          data: { trend: [100, 120, 110, 140, 130, 160, 155] },
        },
        {
          title: 'fill / smooth / status / 显式域 变体',
          description: 'fill 渐变填充、smooth 平滑曲线、color.status 覆盖推导方向、静态色、显式 Y 域。',
          schema: variants,
          data: { trend: [100, 120, 110, 140, 130, 160, 155] },
        },
        {
          title: '降级路径',
          description: '空数据渲染空占位；单点渲染圆点；全等值 Y 域回退渲染中线。',
          schema: degraded,
          data: {},
        },
        {
          title: 'stat-tile 组合位示意',
          description: 'stat-tile 的 sparkline 字段是独立 sparkline 组件的复用场景之一（本页示意组合位置）。',
          schema: statTileComposition,
          data: { revenue: 1234567.89, trend: [100, 120, 110, 140, 130, 160, 155] },
        },
      ]}
    />
  );
}
