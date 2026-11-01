/**
 * M1 MES 车间大屏页 PAGE_DATA 载体（plan 809）——自 page-data.ts 按页拆分
 * （584 行触发 oversized warn，按「超 500 行评估拆分」纪律抽专用模块；
 * page-data.ts 保留合并点）。
 *
 * panels 走 C3 先例的表达式绑定通道（schema 侧 `panels: '${mesShopfloorBoardPanels}'`）：
 * 内联 panels 数组的条目带注册类型（stat-tile/echarts/table/scada-canvas），编译期
 * schema-definition 分类按子渲染器定义走，与容器 fieldRules 冲突 → 每面板一条
 * conflicting-field-definition warning（strict 零诊断过不了）；表达式绑定的 panels
 * 是纯运行时值，编译发生在 buildDashboardPanelFragment 的 fragment 渲染期。
 *
 * 数据源 name=`kpi`，表达式根严格同名（评审 MAJ-3：`${kpi.*}` 与数据源 name 必须
 * 同根，kpiSource 名下 ${kpi._} 全链 undefined）。
 *
 * 趋势 option 内联于 trend 面板 props（评审 MAJ-3 载体勘误的 live 修正）：表达式求值
 * 不做嵌套模板深度解析——若 option 走 `${trendOption}` 独立载体，其内层 `${kpi.*}`
 * 表达式将以原始字符串进 echarts；内联形态由 fragment 渲染期深度编译兜住（C3 同款）。
 * scadaConfig 无内层表达式（MAJ-3：组态走静态注入，无组态端点），可安全走独立载体。
 */

export const MES_SHOPFLOOR_BOARD_PAGE_DATA: Record<string, unknown> = {
  mesShopfloorBoardPanels: [
    {
      id: 'kpi-planned',
      type: 'stat-tile',
      x: 0,
      y: 0,
      w: 3,
      h: 2,
      title: '计划产量',
      props: {
        testid: 'mes-shopfloor-board-kpi-planned',
        label: '计划产量（件）',
        value: '${kpi?.planned ?? 0}',
        delta: '${kpi?.plannedDelta}',
        sparkline: '${kpi?.plannedSpark ?? []}',
        formatter: { thousands: true, decimals: 0 },
      },
    },
    {
      id: 'kpi-completed',
      type: 'stat-tile',
      x: 3,
      y: 0,
      w: 3,
      h: 2,
      title: '完成产量',
      props: {
        testid: 'mes-shopfloor-board-kpi-completed',
        label: '完成产量（件）',
        value: '${kpi?.completed ?? 0}',
        delta: '${kpi?.completedDelta}',
        formatter: { thousands: true, decimals: 0 },
      },
    },
    {
      id: 'kpi-scrapped',
      type: 'stat-tile',
      x: 6,
      y: 0,
      w: 3,
      h: 2,
      title: '报废数',
      props: {
        testid: 'mes-shopfloor-board-kpi-scrapped',
        label: '报废数（件）',
        value: '${kpi?.scrapped ?? 0}',
        delta: '${kpi?.scrappedDelta}',
        formatter: { thousands: true, decimals: 0 },
      },
    },
    {
      id: 'kpi-rate',
      type: 'stat-tile',
      x: 9,
      y: 0,
      w: 3,
      h: 2,
      title: '完成率',
      props: {
        testid: 'mes-shopfloor-board-kpi-rate',
        label: '完成率',
        value: '${kpi?.completionRate ?? 0}',
        suffix: '%',
        formatter: { thousands: false, decimals: 1 },
      },
    },
    {
      id: 'trend',
      type: 'echarts',
      x: 0,
      y: 2,
      w: 8,
      h: 6,
      title: '当日报工趋势（echarts onClick 下钻预警明细）',
      props: {
        testid: 'mes-shopfloor-board-trend',
        componentId: 'mes-shopfloor-board-trend',
        height: 200,
        option: {
          xAxis: {
            type: 'category',
            data: '${kpi?.trendLabels ?? []}',
            axisLabel: { interval: 3 },
          },
          yAxis: { type: 'value' },
          tooltip: { trigger: 'axis' },
          series: [{ type: 'line', data: '${kpi?.trendOutputs ?? []}', smooth: false }],
        },
        events: {
          onClick: {
            action: 'setValue',
            args: { path: 'drillHour', value: '${event.name}' },
            then: {
              action: 'openDialog',
              args: {
                title: '${drillHour} 时段预警明细',
                testid: 'mes-shopfloor-board-drill-dialog',
                body: [
                  {
                    type: 'table',
                    testid: 'mes-shopfloor-board-drill-table',
                    source:
                      '${ARRAYFILTER(kpi?.abnormalities ?? [], a => a?.hour === drillHour)}',
                    itemKey: 'id',
                    pagination: { enabled: false },
                    columns: [
                      { name: 'raisedLabel', label: '时间', width: 90 },
                      { name: 'type', label: '类型', width: 100 },
                      { name: 'station', label: '工位/设备', width: 170 },
                      { name: 'level', label: '级别', width: 90 },
                      { name: 'message', label: '说明', width: 220 }
                    ],
                    empty: { type: 'text', text: '该时段无未关闭异常' }
                  }
                ]
              }
            }
          }
        },
      },
    },
    {
      id: 'scada',
      type: 'scada-canvas',
      x: 8,
      y: 2,
      w: 4,
      h: 6,
      title: '车间工位组态',
      props: {
        testid: 'mes-shopfloor-board-scada',
        width: 340,
        height: 200,
        viewport: { fit: 'contain' },
        config: '${mesShopfloorScadaConfig}',
        loading: { type: 'text', text: 'scada 场景加载中…' },
        empty: { type: 'text', text: 'scada 场景构建失败（config 非法）' },
      },
    },
    {
      id: 'downtime-tile',
      type: 'stat-tile',
      x: 0,
      y: 8,
      w: 3,
      h: 2,
      title: '当前停机',
      props: {
        testid: 'mes-shopfloor-board-downtime-tile',
        label: '当前停机时长（min）',
        value: '${kpi?.downtimeMinutes ?? 0}',
        formatter: { thousands: false, decimals: 0 },
      },
    },
    {
      id: 'downtime-table',
      type: 'table',
      x: 3,
      y: 8,
      w: 9,
      h: 4,
      title: '当前停机明细',
      props: {
        testid: 'mes-shopfloor-board-downtime-table',
        source: '${kpi?.downtimes ?? []}',
        itemKey: 'id',
        pagination: { enabled: false },
        columns: [
          { name: 'device', label: '设备', width: 140 },
          { name: 'reason', label: '原因', width: 130 },
          { name: 'startedLabel', label: '开始', width: 90 },
          { name: 'durationMins', label: '时长（min）', width: 100 },
          { name: 'statusLabel', label: '状态', width: 90 }
        ],
        empty: { type: 'text', text: '当前无停机' }
      },
    },
    {
      // R2 M1 要素③ 工单四阶段进度（plan 819 P1 F1-1 补面：D3 §2.4 片段 2
      // progressBand + status labelMap/levelMap 配色分级）。
      id: 'workorder-table',
      type: 'table',
      x: 0,
      y: 12,
      w: 12,
      h: 4,
      title: '工单四阶段进度',
      props: {
        testid: 'mes-shopfloor-board-workorder-table',
        source: '${kpi?.workOrders ?? []}',
        itemKey: 'woNo',
        pagination: { enabled: false },
        columns: [
          { name: 'woNo', label: '工单', width: 130 },
          { name: 'product', label: '产品', width: 130 },
          { name: 'plannedQty', label: '计划数', width: 90 },
          { name: 'completedQty', label: '完成数', width: 90 },
          { name: 'progress', label: '进度（%）', width: 90 },
          {
            name: 'progressBand',
            label: '阶段',
            width: 100,
            cell: {
              type: 'status',
              value: '${progressBand}',
              labelMap: { full: '已完成', half: '过半', low: '偏低', zero: '未开工' },
              levelMap: { full: 'success', half: 'info', low: 'warning', zero: 'default' },
            },
          }
        ],
        empty: { type: 'text', text: '暂无工单' }
      },
    },
  ],
  // scada 组态静态载体（评审 MAJ-3：无组态端点——静态注入）。纯静态数据、无内层
  // 表达式，独立载体表达式求值安全；符号取内置 scada-group/scada-rect/scada-text/
  // scada-device-motor/scada-sensor-control-indicator（D3 §2.4 符号清单）。
  mesShopfloorScadaConfig: {
    version: 1,
    background: { color: '#0e1729', grid: { size: 24, color: '#1b2b45' } },
    variables: [
      { id: 'motorAState', source: 'static', value: 1 },
      { id: 'motorBState', source: 'static', value: 0 },
      { id: 'stationAlarm', source: 'static', value: 0 },
    ],
    symbols: [
      {
        id: 'shopfloor-line-a',
        type: 'scada-group',
        x: 0,
        y: 0,
        width: 520,
        height: 300,
        children: [
          { id: 'zone-a-bg', type: 'scada-rect', x: 16, y: 24, width: 240, height: 250, fill: '#152238', stroke: '#2a3b58', strokeWidth: 1 },
          { id: 'zone-b-bg', type: 'scada-rect', x: 272, y: 24, width: 232, height: 250, fill: '#152238', stroke: '#2a3b58', strokeWidth: 1 },
          { id: 'zone-a-label', type: 'scada-text', x: 136, y: 34, text: '加工区 A', textSize: 13, textColor: '#8098b8', align: 'center' },
          { id: 'zone-b-label', type: 'scada-text', x: 388, y: 34, text: '加工区 B', textSize: 13, textColor: '#8098b8', align: 'center' },
          { id: 'station-a-motor', type: 'scada-device-motor', x: 96, y: 110, width: 80, height: 60, bindings: { fill: { point: 'motorAState' } }, states: { states: {}, valueMap: { '1': 'run', '0': 'stop' } } },
          { id: 'station-b-motor', type: 'scada-device-motor', x: 352, y: 110, width: 80, height: 60, bindings: { fill: { point: 'motorBState' } }, states: { states: {}, valueMap: { '1': 'run', '0': 'stop' } } },
          { id: 'station-a-text', type: 'scada-text', x: 136, y: 186, text: 'M-201 主轴电机', textSize: 11, textColor: '#c5d3e8', align: 'center' },
          { id: 'station-b-text', type: 'scada-text', x: 392, y: 186, text: 'M-202 主轴电机', textSize: 11, textColor: '#c5d3e8', align: 'center' },
          { id: 'station-a-indicator', type: 'scada-sensor-control-indicator', x: 108, y: 218, width: 56, height: 32, bindings: { fill: { point: 'stationAlarm' } }, states: { states: {}, valueMap: { '1': 'fault', '0': 'stop' } } },
        ],
      },
      { id: 'board-title', type: 'scada-text', x: 260, y: 4, text: '一号车间工位组态', textSize: 14, textColor: '#f1f6fd', align: 'center' },
    ],
  },
};
