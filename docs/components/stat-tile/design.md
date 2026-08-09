# Stat Tile 组件设计

> 来源：`docs/analysis/2026-08-09-bi-control-support-analysis.md`（BI 控件族：KPI 层缺失）、plan `2026-08-09-bi-kpi-filter-chart-enhance-plan.md` Phase 1
> 落地：2026-08-09（`stat-tile` renderer + schema + 单测 + 本文档 + example.json）

## 1. 组件定位

- `stat-tile` 是 BI KPI 卡片 renderer：大数字 + 标签 + 同比/环比（delta）+ sparkline 迷你趋势图。
- 它承接分析报告「KPI 层缺失」的差距：`statistics` 仅能显示"总条数"文本，无法表达经营指标的视觉语义（特大字号、涨跌色、同比环比布局、迷你图）。
- 只做表现层 + 数据绑定，不承担数据请求编排（数据由 `data-source` / scope 提供，`value`/`sparkline` 经 `${expr}` 消费）。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无 `stat-tile` 等价控件（`stat` 属 echarts 扩展，未纳入）。对标 Superset/Metabase/Grafana 的 stat/KPI 面板形态。
- 与 `statistics` 的关系裁定（Follow-up）：**保留 `statistics`，不标记 deprecated**——二者语义不重叠：
  - `statistics`（W2a）是 crud 工具栏的"总条数"块（`flux.pagination.total` 文本，被 `crud-renderer-toolbar.tsx` 编排消费），定位是分页总数摘要。
  - `stat-tile` 是独立 KPI 卡片（大数字 + 涨跌 + 迷你图），面向 BI 看板。
  - 若未来 `statistics` 需要 KPI 化，按 `docs/skills/deprecated-feature-cleanup.md` 流程另行裁决，不与 stat-tile 合并。

## 3. Flux 中的 renderer/type 定义

- `type: 'stat-tile'`
- `category: 'data'`
- `sourcePackage: '@nop-chaos/flux-renderers-data'`
- 注册于 `data-renderer-definitions.ts`（定义拆于 `stat-tile-renderer-definition.ts`，保持 700 行 lint cap）。
- schema 类型：`StatTileSchema`（`flux-renderers-data/src/schemas.ts`）。

## 4. schema 设计（Decision）

| 字段        | 类型                                         | 说明                                                                                     |
| ----------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `value`     | `SchemaValue`（number/string/`${expr}`）     | KPI 数字；null/undefined/非数字渲染 `--` 占位（Failure Path stat-tile-null-value）       |
| `label`     | `SchemaInput \| string`（value-or-region）   | 标签文本，可作 region 渲染任意片段                                                       |
| `prefix`    | `string`                                     | 数值前缀（如 `¥`），弱化样式                                                             |
| `suffix`    | `string`                                     | 数值后缀（如 `万`）                                                                      |
| `delta`     | `number \| { value; label?; direction? }`    | 同比/环比：number 为百分数（12.5 = +12.5%）；对象形式可自定义 label 与 direction         |
| `sparkline` | `SchemaValue`（`number[]`）                  | 迷你趋势数据；空/非法降级不渲染 sparkline 区域（Failure Path stat-tile-sparkline-empty） |
| `formatter` | `{ thousands?: boolean; decimals?: number }` | 千分位 + 小数位（缺省 decimals=0、无千分位）                                             |
| `status`    | `'up' \| 'down' \| 'neutral'`                | 涨跌色显式声明，覆盖 delta 符号推导                                                      |

- `value` 支持 `${expr}`：编译期按 prop 解析，运行期随 scope 变化重渲染（复用 statistics 的 reactive prop 先例）。
- `sparkline` 的 "dataRegionKey" 形态即 `${expr}` 表达式解析出 `number[]`（如 `'${kpi.trend}'`），无独立字符串键语义。

## 5. sparkline 实现路径裁定（Decision）

**采纳自绘 SVG polyline**（`<polyline>` + 可选面积填充 + 单点 `circle`），不采纳复用 recharts 迷你 LineChart。理由：

1. **复杂度与收益不匹配**：sparkline 是 ≤96×32px 的单系列迷你图，recharts 的坐标系/ResponsiveContainer/tooltip 体系全部用不上，引入纯属负担。
2. **可测性**：自绘路径可对 `data-points`/`circle`/`polyline` 直接断言；recharts 路径需要 mock（chart 单测即 mock recharts），断言面变脆。
3. **单点数据**：recharts LineChart 对 n=1 无有意义渲染；自绘可渲染单点圆点。
4. **零新依赖**：recharts 虽已在依赖里，但 sparkline 不增加其导入面。

## 6. 涨跌色语义（Decision）

- 方向推导优先级：`status`（schema 显式）> `delta.direction`（对象显式）> delta 数值符号（正→up、负→down、零→neutral）。
- 颜色：`up` → `text-emerald-600 dark:text-emerald-500`（正值色）、`down` → `text-red-600 dark:text-red-500`（负值色）、`neutral` → `text-muted-foreground`。
- delta 标签缺省为带符号百分数（`+12.5%` / `-3%`），对象形式可覆盖。

## 7. 字段分类

- `value`、`prefix`、`suffix`、`delta`、`sparkline`、`formatter`、`status`: `prop`
- `label`: `value-or-region`（regionKey `label`）

## 8. regions 与 slot 约定

- `label` 是唯一 supported slot（value-or-region）。
- DOM marker：根 `.nop-stat-tile` + `data-slot="stat-tile-root"`；子 slot：`stat-tile-label`、`stat-tile-value`（`data-value` 暴露原始数值）、`stat-tile-prefix`/`stat-tile-suffix`、`stat-tile-delta`（`data-direction` 暴露方向）、`stat-tile-sparkline`（`data-points` 暴露归一化坐标串，供测试/e2e 程序化断言）。

## 9. 运行期状态归属

- KPI 数值、delta、sparkline 数据均来自外部 scope/props（prop 流，in-place 更新，无 key-remount）。
- 无内部交互状态（只读展示控件）。

## 10. 事件、动作与组件句柄能力

- 无事件、无组件句柄（只读表现层）。

## 11. 数据源、表达式、导入能力接入点

- 数据由 loader / `data-source` 写入 scope，`value`/`sparkline` 经 `${expr}` 消费（与 chart 一致）。

## 12. 样式与 DOM marker 约定

- widget renderer（自样式 UI 控件）：内部 Tailwind 视觉类属于控件设计（大数字字号/涨跌色/sparkline），符合 styling-system「widget renderer 自带视觉默认」契约。
- 颜色经 Tailwind 语义色（emerald/red）+ chart 设计 token（`hsl(var(--chart-1))` sparkline 描边）表达，不引入新主题机制。

## 13. 实现拆分建议

- 数值归一化/格式化、delta 解析、sparkline 几何（归一化 + polyline/area/dot 构造）与 React 组件分层实现（`stat-tile-renderer.tsx` 内模块函数）。

## 14. 风险、取舍与后续阶段

- sparkline 交互增强（hover tooltip、brush）不纳入（迷你图定位，归后续评估）。
- delta 显示精度不做千分位格式化（百分数显示原值），如需可在 formatter 扩展。
- `stat-tile` 卡片布局（横向排列多卡）由宿主 grid/flex 编排，renderer 不内嵌布局协议。
