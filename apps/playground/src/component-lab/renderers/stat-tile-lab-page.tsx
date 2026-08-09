import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicTile = {
  type: 'page',
  body: [
    {
      type: 'stat-tile',
      value: '${revenue}',
      label: '本月营收',
      prefix: '¥',
      suffix: '万',
      formatter: { thousands: true, decimals: 2 },
      delta: { value: 12.5, label: '同比 +12.5%', direction: 'up' },
      sparkline: '${trend}',
    },
  ],
};

const downTile = {
  type: 'page',
  body: [
    {
      type: 'stat-tile',
      value: '${orders}',
      label: '订单数',
      delta: { value: -3.2, label: '同比 -3.2%', direction: 'down' },
      sparkline: '${orderTrend}',
    },
  ],
};

const nullTile = {
  type: 'page',
  body: [{ type: 'stat-tile', label: '未发布指标' }],
};

export function StatTileLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="BI KPI 卡片：大数字 + 标签 + 同比/环比（delta）+ sparkline 迷你趋势。value/sparkline 支持 ${expr} 表达式；null/非数字渲染 -- 占位；sparkline 空数据降级不渲染迷你图。"
      scenarios={[
        {
          title: '营收 KPI（涨跌色 + sparkline）',
          description: 'formatter 千分位/小数位，delta 对象携带显式 label 与 direction。',
          schema: basicTile,
          data: {
            revenue: 1234567.89,
            trend: [100, 120, 110, 140, 130, 160, 155],
          },
        },
        {
          title: '下行指标（负值涨跌色）',
          description: 'delta 为负 → down 方向红色语义。',
          schema: downTile,
          data: {
            orders: 8421,
            orderTrend: [50, 48, 52, 45, 40, 42, 39],
          },
        },
        {
          title: 'null 占位',
          description: 'value 缺失渲染 -- 占位，不抛错。',
          schema: nullTile,
          data: {},
        },
      ]}
    />
  );
}
