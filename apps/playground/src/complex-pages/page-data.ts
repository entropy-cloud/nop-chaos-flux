/**
 * Injectable scope data for JSON-based complex pages.
 * Only pages that need static data injected into the render scope
 * have entries here. Most pages (pure data-source driven) need none.
 */

import { MES_SHOPFLOOR_BOARD_PAGE_DATA } from './page-data-mes';

export const PAGE_DATA: Record<string, Record<string, unknown>> = {};

// Curated chart palette shared by the dashboard replica pages (C3/S2 trend +
// bar panels — default single-hue charts read as unfinished next to the
// antdpro/itam dashboard reference pages).
const DASHBOARD_CHART_PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899'];

// ── Linear 问题列表：筛选根声明默认值（ux-r11 n2 作者契约加固，非缺陷修复——
// data-source dependsOn 引用的 scope 根应有声明默认值，避免依赖用户输入才物化）。
PAGE_DATA['linear-issues'] = {
  filterKeyword: '',
  filterStatus: '',
  filterPriority: '',
};

// ── Dynamic Tabs: remote tab items loaded via DynamicRenderer ──
PAGE_DATA['dynamic-tabs'] = {
  remoteTabItems: [
    { id: 1, name: '数据项 A', value: 100 },
    { id: 2, name: '数据项 B', value: 200 },
    { id: 3, name: '数据项 C', value: 300 },
  ],
};

// ── Complex Form: province / city cascading data ──
const PROVINCE_OPTIONS = [
  { label: '北京', value: 'beijing' },
  { label: '上海', value: 'shanghai' },
  { label: '广东', value: 'guangdong' },
  { label: '浙江', value: 'zhejiang' },
  { label: '江苏', value: 'jiangsu' },
];

const CITY_MAP: Record<string, Array<{ label: string; value: string }>> = {
  beijing: [
    { label: '朝阳区', value: 'chaoyang' },
    { label: '海淀区', value: 'haidian' },
    { label: '东城区', value: 'dongcheng' },
  ],
  shanghai: [
    { label: '浦东新区', value: 'pudong' },
    { label: '徐汇区', value: 'xuhui' },
    { label: '黄浦区', value: 'huangpu' },
  ],
  guangdong: [
    { label: '广州市', value: 'guangzhou' },
    { label: '深圳市', value: 'shenzhen' },
    { label: '东莞市', value: 'dongguan' },
  ],
  zhejiang: [
    { label: '杭州市', value: 'hangzhou' },
    { label: '宁波市', value: 'ningbo' },
    { label: '温州市', value: 'wenzhou' },
  ],
  jiangsu: [
    { label: '南京市', value: 'nanjing' },
    { label: '苏州市', value: 'suzhou' },
    { label: '无锡市', value: 'wuxi' },
  ],
};

PAGE_DATA['complex-form'] = {
  provinceOptions: PROVINCE_OPTIONS,
  cityMap: CITY_MAP,
};

// ── Sundial replicas: checkbox initial states ──
PAGE_DATA['sundial-workbench'] = {
  t1: false,
  t2: true,
  t3: false,
  t4: false,
  t5: false,
  t6: false,
  t7: false,
  // Interaction state (plan 457): sidebar nav + view selection
  activeSection: 'workbench',
  activeView: 'all',
  // Interaction state: in-place task detail dialog (editable title/note + picker writeback)
  taskDetailOpen: false,
  taskDetailTitle: '撰写季度复盘报告',
  taskDetailNote: '包含数据复盘和 OKR 回顾两部分',
  taskDetailDate: '8/18',
  taskDetailRecur: '每周',
  taskDetailFlag: false,
  taskDetailListLabel: '工作',
};

PAGE_DATA['sundial-detail'] = {
  'd-done': false,
  'd-s1': false,
  'd-s2': false,
  'd-s3': true,
  // Interaction state (plan 457): recurrence/list/flag selection
  recur: 'weekly',
  list: 'work',
  flagged: true,
  // Interaction state (plan 460): subtask dialog / delete / trash
  subtaskOpen: false,
  activeSubtask: 1,
  subtaskDeleted1: false,
  subtaskDeleted2: false,
  subtaskDeleted3: false,
  taskTrashed: false,
  // plan 460 B6: date picker writeback (input-datetime single field)
  pickedDateTime: '',
  pickedDateLabel: '',
};

PAGE_DATA['sundial-analytics'] = {
  // Interaction state (plan 460): chart drill-down focus
  chartFocus: '',
};

PAGE_DATA['sundial-settings'] = {
  // Interaction state (plan 457): mode card + rail selection
  mode: 'local',
  activeSection: 'sync',
};

// ── Cal.com replica: timezone selector + 12h/24h switch initial states ──
PAGE_DATA['cal-booking'] = {
  calTimezone: 'Asia/Shanghai',
  cal24h: true,
};

// ── Landing / docs / portal replica: loop data for feature cards,
// portal tiles and the dark stats band ──
PAGE_DATA['content-landing'] = {
  features: [
    {
      icon: 'component',
      title: '100+ 注册渲染器',
      desc: '结构、表单、数据、内容、布局、调度、AI 八大渲染器族，按域拆分按需注册，schema 即页面。',
    },
    {
      icon: 'palette',
      title: 'Token 化设计系统',
      desc: '底座为 shadcn 令牌，深浅色主题零 JS 切换；外部设计系统经复刻 CSS 贴附即可高保真还原。',
    },
    {
      icon: 'zap',
      title: '编译期表达式',
      desc: '公式编译进闭包，无字符串求值热点；环安全 deepEqual 与作用域反应式构成确定性渲染管线。',
    },
    {
      icon: 'keyboard',
      title: '键盘优先交互',
      desc: 'keyboard 逻辑渲染器 + command palette + 行选修饰键，键盘优先工作台与鼠标用户同时覆盖。',
    },
    {
      icon: 'workflow',
      title: '设计器家族',
      desc: 'flow / page / report / spreadsheet / word / SCADA 六大设计器共享 editor-core，撤销重做与协同适配同源。',
    },
    {
      icon: 'message-square-text',
      title: 'AI 原生组件',
      desc: 'ai-chat 流式对话、工具调用卡、会话管理与 token 用量统计，mock connector 即可驱动完整工作台。',
    },
  ],
  portalTiles: [
    { icon: 'table-2', title: '运营总览', desc: 'KPI 卡片 + 趋势图 + 明细表', tag: 'dashboard' },
    { icon: 'list', title: '订单管理', desc: '标准增删改查 + 批量操作', tag: 'crud' },
    { icon: 'boxes', title: '库存网格', desc: '高密度网格 + 分组聚合', tag: 'grid' },
    { icon: 'messages-square', title: '客服工作台', desc: 'AI 对话 + 工具调用', tag: 'ai' },
    { icon: 'git-branch', title: '流程编排', desc: '工作流设计器 + 审批', tag: 'flow' },
    { icon: 'file-spreadsheet', title: '报表设计', desc: '单元格报表 + 打印', tag: 'report' },
    { icon: 'calendar-days', title: '排程中心', desc: '甘特 + 看板 + 日历', tag: 'gantt' },
    { icon: 'settings', title: '系统设置', desc: '主题、字典与权限', tag: 'system' },
  ],
  stats: [
    { value: '100+', label: '注册渲染器类型' },
    { value: '26', label: '外部应用复刻页' },
    { value: '13,000+', label: '单元测试用例' },
    { value: '1,400+', label: 'E2E 断言' },
  ],
};

// ── bisheng build replica: debug panel collapsed by default (resizable
// panel defaultCollapsed) so the designer canvas gets the vertical budget ──
// Node-param fixture seed (audit): the selected llm-1 inspector fields bind to
// these scope values — static `value` in the schema alone leaves the select /
// textarea blank.
PAGE_DATA['bisheng-build'] = {
  bsNodeModel: 'azure_gpt_4',
  bsNodePrompt: '你是电商平台客服助手，依据检索到的知识库内容回答用户问题，无法确认时引导转人工。',
  bsNodeTemp: 0.2,
  bsNodeOutput: 'answer',
};

// ── C3 CRM 销售驾驶舱：dashboard 网格布局（plan 803）──
// panels 走 PAGE_DATA 表达式绑定通道（schema 侧 `panels: '${crmSalesDashboardPanels}'`）：
// 内联 panels 数组的条目带注册类型（stat-tile/echarts/chart/table），编译期
// schema-definition 分类按子渲染器定义走（explicit type wins），与容器声明的
// fieldRules 冲突 → 每个面板固定产出一条 conflicting-field-definition warning，
// strict 零诊断门槛过不了（编译器 pinned 语义，schema-compiler-schema-definition-
// unified-parity.test.ts L309）。表达式绑定的 panels 是纯运行时值，编译发生在
// buildDashboardPanelFragment 的 fragment 渲染期——语义与内联完全一致。
PAGE_DATA['crm-sales-dashboard'] = {
  crmSalesDashboardPanels: [
    {
      id: 'kpi-funnel',
      type: 'stat-tile',
      x: 0,
      y: 0,
      w: 3,
      h: 2,
      props: {
        testid: 'crm-sales-dashboard-kpi-funnel',
        label: '漏斗总额（万元）',
        value: '${dashboardKpi?.kpis?.funnelAmount ?? 0}',
        prefix: '￥',
        sparkline: [420, 465, 440, 505, 488, 530, 512, 590],
        formatter: { thousands: true, decimals: 0 },
      },
    },
    {
      id: 'kpi-conversion',
      type: 'stat-tile',
      x: 3,
      y: 0,
      w: 3,
      h: 2,
      props: {
        testid: 'crm-sales-dashboard-kpi-conversion',
        label: '商机转化率',
        value: '${dashboardKpi?.kpis?.conversion ?? 0}',
        suffix: '%',
        sparkline: [26, 29, 27, 31, 30, 33, 32, 32],
        formatter: { thousands: false, decimals: 0 },
      },
    },
    {
      id: 'kpi-forecast',
      type: 'stat-tile',
      x: 6,
      y: 0,
      w: 3,
      h: 2,
      props: {
        testid: 'crm-sales-dashboard-kpi-forecast',
        label: '预测达成率',
        value: '${dashboardKpi?.kpis?.forecastRate ?? 0}',
        suffix: '%',
        sparkline: [81, 84, 82, 86, 85, 88, 87, 86],
        formatter: { thousands: false, decimals: 0 },
      },
    },
    {
      id: 'kpi-quota',
      type: 'stat-tile',
      x: 9,
      y: 0,
      w: 3,
      h: 2,
      props: {
        testid: 'crm-sales-dashboard-kpi-quota',
        label: '配额完成率',
        value: '${dashboardKpi?.kpis?.quotaRate ?? 0}',
        suffix: '%',
        sparkline: [88, 90, 89, 93, 92, 95, 94, 92],
        formatter: { thousands: false, decimals: 0 },
      },
    },
    {
      id: 'trend',
      type: 'echarts',
      x: 0,
      y: 2,
      w: 8,
      h: 6,
      title: '月度趋势',
      props: {
        testid: 'crm-sales-dashboard-trend',
        componentId: 'crm-sales-dashboard-trend',
        height: 270,
        option: {
          color: DASHBOARD_CHART_PALETTE,
          xAxis: { type: 'category', data: '${dashboardTrend?.months ?? []}' },
          yAxis: { type: 'value' },
          series: [{ type: 'line', data: '${dashboardTrend?.amounts ?? []}', symbol: 'none' }],
        },
        events: {
          onClick: {
            action: 'setValue',
            args: { path: 'drillMonth', value: '${event.name}' },
            then: {
              action: 'refreshSource',
              targetId: 'drillRows',
              then: {
                action: 'openDialog',
                args: {
                  title: '${drillMonth} 成交明细',
                  testid: 'crm-sales-dashboard-drill-dialog',
                  body: [
                    {
                      type: 'table',
                      testid: 'crm-sales-dashboard-drill-table',
                      source: '${drillRows?.items ?? []}',
                      itemKey: 'dealNo',
                      pagination: { enabled: false },
                      columns: [
                        { name: 'dealNo', label: '成交单号', width: 150 },
                        { name: 'customerName', label: '客户', width: 200 },
                        { name: 'stageName', label: '阶段', width: 100 },
                        { name: 'amount', label: '金额（万元）', width: 110 },
                        { name: 'ownerName', label: '负责人', width: 90 },
                        { name: 'closeDate', label: '预计成交日', width: 110 },
                      ],
                      empty: { type: 'text', text: '该月无成交明细' },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    {
      id: 'funnel-bar',
      type: 'chart',
      x: 8,
      y: 2,
      w: 4,
      h: 6,
      title: '漏斗分布（bar 近似）',
      props: {
        testid: 'crm-sales-dashboard-funnel-chart',
        chartType: 'bar',
        source: '${dashboardTrend?.funnelStages ?? []}',
        xAxis: { dataKey: 'name', label: '阶段' },
        series: [{ name: '阶段金额（万元）', dataRegionKey: 'value' }],
        colors: DASHBOARD_CHART_PALETTE,
        height: 270,
        legend: false,
      },
    },
    {
      id: 'report-table',
      type: 'table',
      x: 0,
      y: 8,
      w: 12,
      h: 6,
      title: '阶段报表（stageFunnel，下载见工具带）',
      props: {
        testid: 'crm-sales-dashboard-report-table',
        source: '${funnelSummary?.stages ?? []}',
        itemKey: 'stageId',
        pagination: { enabled: false },
        columns: [
          { name: 'label', label: '阶段', width: 140 },
          { name: 'leadCount', label: '商机数', width: 100 },
          { name: 'amount', label: '金额（万元）', width: 130 },
          { name: 'conversion', label: '转化率（%）', width: 110 },
        ],
        empty: { type: 'text', text: '暂无阶段报表数据' },
      },
    },
  ],
};

// ── M1 MES 车间大屏：dashboard 网格布局 + scada 组态载体（plan 809）──
// 按页拆分于 page-data-mes.ts（584 行触发 oversized warn 后的抽分；
// page-data.ts 只保留合并点，per-page 载体块归各自模块）。
PAGE_DATA['mes-shopfloor-board'] = MES_SHOPFLOOR_BOARD_PAGE_DATA;

// ── S2 商城分销后台：dashboard panels 载体 + 权限层注入（plan 813）──
// panels 走 C3 先例的 PAGE_DATA 表达式绑定通道；stat-tile 数值全部表达式绑定
// 页面 data-source（commissionAll/distPivotRows），趋势月序列为确定性静态值。
// tenantRole 驱动权限层区块 visible 裁剪（G17 近似面）。
PAGE_DATA['mall-distribution'] = {
  tenantRole: 'merchant',
  // 10-month window so the trend line spans the panel width instead of reading
  // as 3 lonely points.
  mallTrendMonths: [
    '2026-01',
    '2026-02',
    '2026-03',
    '2026-04',
    '2026-05',
    '2026-06',
    '2026-07',
    '2026-08',
    '2026-09',
    '2026-10',
  ],
  mallTrendAmounts: [2180, 2450, 2610, 2540, 2890, 2760, 3120, 2860, 3425, 3118],
  mallDistributionPanels: [
    {
      id: 'kpi-gmv',
      type: 'stat-tile',
      x: 0,
      y: 0,
      w: 3,
      h: 2,
      props: {
        testid: 'mall-distribution-kpi-gmv',
        label: '分销 GMV（元）',
        value:
          '${SUM(ARRAYMAP(commissionAll?.items ?? [], r => ROUND((r?.commissionAmount ?? 0) / (r?.rate ?? 1))))}',
        prefix: '￥',
        formatter: { thousands: true, decimals: 0 },
      },
    },
    {
      id: 'kpi-commission',
      type: 'stat-tile',
      x: 3,
      y: 0,
      w: 3,
      h: 2,
      props: {
        testid: 'mall-distribution-kpi-commission',
        label: '佣金总额（元）',
        value: '${SUM(ARRAYMAP(commissionAll?.items ?? [], r => r?.commissionAmount ?? 0))}',
        prefix: '￥',
        formatter: { thousands: true, decimals: 0 },
      },
    },
    {
      id: 'kpi-distributors',
      type: 'stat-tile',
      x: 6,
      y: 0,
      w: 3,
      h: 2,
      props: {
        testid: 'mall-distribution-kpi-distributors',
        label: '分销员数',
        value: '${COUNT(ARRAYMAP(distPivotRows?.items ?? [], r => r?.distributorName))}',
        formatter: { thousands: false, decimals: 0 },
      },
    },
    {
      id: 'kpi-pending',
      type: 'stat-tile',
      x: 9,
      y: 0,
      w: 3,
      h: 2,
      props: {
        testid: 'mall-distribution-kpi-pending',
        label: '待结算笔数',
        value: "${COUNT(ARRAYFILTER(commissionAll?.items ?? [], r => r?.status == 'pending'))}",
        formatter: { thousands: false, decimals: 0 },
      },
    },
    {
      id: 'trend',
      type: 'echarts',
      x: 0,
      y: 2,
      w: 12,
      h: 5,
      title: '月度佣金趋势',
      props: {
        testid: 'mall-distribution-trend',
        componentId: 'mall-distribution-trend',
        height: 240,
        option: {
          color: DASHBOARD_CHART_PALETTE,
          xAxis: { type: 'category', data: '${mallTrendMonths ?? []}' },
          yAxis: { type: 'value' },
          series: [{ type: 'line', data: '${mallTrendAmounts ?? []}', symbol: 'none' }],
        },
      },
    },
  ],
};
