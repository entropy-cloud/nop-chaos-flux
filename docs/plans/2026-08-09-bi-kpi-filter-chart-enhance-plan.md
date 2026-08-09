# BI 骨架能力补齐计划（pivot-table 之外）

> Plan Status: draft
> Last Reviewed: 2026-08-09
> Source: `docs/analysis/2026-08-09-bi-control-support-analysis.md`（BI 控件支持分析）、`docs/analysis/2026-08-04-control-gap-survey.md`（Tier 2 候选）
> Related: `docs/components/chart/design.md`、`docs/components/crud/design.md`、`docs/components/card/design.md`（如存在）

## Purpose

为 BI 应用补齐 pivot-table **之外**的前端能力：KPI 卡片（`stat-tile`）、仪表盘筛选联动约定（`dashboard-filter`）、图表面板刷新约定（`panel-chrome` 组合支撑）、`date-range` 相对时间预设、以及 chart 增强（双轴/brush/热力图）。pivot-table（含 table 静态透视路径 A）不在本计划内。

## Current Baseline

已核实（2026-08-09 live repo）：

- `statistics`（`flux-renderers-data/src/statistics-renderer.tsx`）仅渲染"总条数"文本（`flux.pagination.total`），无 KPI 数字样式、无同比/环比、无 sparkline。
- `card`（`flux-renderers-content/src/card.tsx`）已有 title + `header`/`body`/`footer`/`actions` regions + `variant`，可承载面板外壳结构。
- `data-source`（`flux-renderers-data/src/data-source-renderer.tsx`）已注册 ComponentHandle，方法 `refresh`/`cancel`/`start`（line 54-77）；且通过 `useRenderScope()` 订阅 scope，scope 变化触发重载（line 13-37）——筛选联动的数据链路已通。
- `crud` 的 `queryForm` region 已实现"表单 → query summary → 请求参数"模式（`docs/components/crud/design.md`），可作为筛选表单的编排先例。
- `date-range`（`flux-renderers-form/src/renderers/date-range-renderer.tsx`）存在，无相对时间预设（近 7 天/近 1 小时等）。
- `chart`（`flux-renderers-data/src/chart-renderer.tsx`，recharts ^3.8.1）支持 bar/line/pie/scatter/area 五种类型 + legend/stacked/grid/colors/referenceLines/band/markers；无双轴、无 brush/zoom、无热力图（`chart-schemas.ts` 的 `ChartType` union 与 `ChartSeriesSchema` 需扩展）。
- 无 `dashboard-filter`、`stat-tile`、`panel-chrome` 任何类型或编排约定。

## Goals

- 新增 `stat-tile` 控件：KPI 大数字 + 标签 + 同比/环比 + sparkline，落 `flux-renderers-data`，产出 `docs/components/stat-tile/design.md` + `example.json`。
- 建立 `dashboard-filter` 编排约定：全局共享 scope 的筛选表单 + 消费端表达式联动，落为文档 + 可运行示例（复用 `data-source` 的 scope 订阅链路）。
- 建立图表面板刷新约定：card regions 组合 + 按钮接入 `data-source` 的 `refresh` handle，作为 `panel-chrome` 的组合实现（不新增类型）。
- 为 `date-range` 增加相对时间预设（近 7 天/近 1 小时/近 30 天等常用档位 + 绝对区间并存）。
- chart 增强：双轴（dual axis）、brush/zoom 数据缩放、热力图（heatmap）类型。

## Non-Goals

- **pivot-table 全部内容**（交互式透视 renderer、table 静态透视映射路径 A、透视数据变换管线）——按分析报告属独立立项，不在此计划。
- 地图组件实现（geojson 资源管理独立评估，仅记录 follow-up）。
- `data-grid` 高性能网格、`conditional-formatting-editor` 条件格式编辑器（control-gap-survey Tier 2，另行裁决）。
- BI 页面级产品（仪表盘路由、权限、看板持久化）——属应用层，非控件层。

## Scope

### In Scope

- `stat-tile` 新控件（schema + renderer + 样式 + 单测 + 文档）。
- `date-range` 相对时间预设增强。
- `dashboard-filter` 编排约定文档 + 示例 schema + 验证（含跨控件 scope 联动走查）。
- card 刷新约定（`refreshAction`/约定字段决策 + 示例）。
- chart 增强：双轴、brush/zoom、heatmap。

### Out Of Scope

- pivot-table（全部路径）。
- 地图、data-grid、条件格式编辑器。
- 仪表盘应用层编排（路由/持久化/权限）。

## Failure Paths

| 场景                      | 触发                              | 行为                                          | 可重试 | 用户可见表现                                  |
| ------------------------- | --------------------------------- | --------------------------------------------- | ------ | --------------------------------------------- |
| stat-tile-sparkline-empty | sparkline 数据为空/非法           | 不渲染 sparkline 区域，KPI 数字正常显示       | 是     | KPI 卡无迷你图，无报错                        |
| stat-tile-null-value      | `value` 为 null/undefined/非数字  | 渲染 `--` 占位                                | 是     | 显示 `--`，不抛错                             |
| date-range-preset-invalid | 相对预设非法值                    | 回退无预设（仅绝对区间）                      | 是     | 日期范围选择器正常，无报错                    |
| chart-dual-axis-invalid   | 双轴配置缺 yAxis 映射             | 回退单轴渲染                                  | 是     | 图表正常显示，无报错                          |
| chart-brush-data-change   | 数据更新时 brush 选区             | 选区按索引保留（in-place 更新，DD2 契约延续） | 是     | 数据刷新不闪屏                                |
| dashboard-filter-no-link  | 筛选控件与消费端 scope key 不匹配 | 消费端按空筛选渲染（等价未筛）                | 是     | 图表/表格显示全量数据，dev warn 提示 key 失配 |

## Test Strategy

本档选择：`建议有测`

stat-tile / date-range 预设 / chart 双轴与 brush 为独立控件能力，新增 focused 单测；dashboard-filter 与 card 刷新为编排约定，以文档 + 示例 schema + 关键链路单测（scope 联动走查）覆盖；非鉴权、非对外 API 契约，无需 e2e 强制。

## Execution Plan

### Phase 1 - `stat-tile` 新控件

Status: planned
Targets: `packages/flux-renderers-data/src/stat-tile-*`、`packages/flux-renderers-data/src/schemas.ts`、`packages/flux-renderers-data/src/data-renderer-definitions.ts`、`docs/components/stat-tile/design.md`、`docs/components/stat-tile/example.json`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] (Decision) 裁定 `stat-tile` schema：`value`（`SchemaInput`，支持 `${expr}`）、`label`（value-or-region）、`delta`（同比/环比数值或 `{value, label, direction}`）、`sparkline`（`number[]` 或 `dataRegionKey`）、`prefix`/`suffix`、`formatter`（千分位/小数位）、`status`（`up`/`down`/`neutral` 驱动涨跌色）。
- [ ] (Decision) 裁定 sparkline 实现路径：自绘 SVG polyline（无新依赖、轻量）vs 复用 recharts 迷你 LineChart（依赖既有 recharts，样式对齐 chart）；给出选型理由并落地。
- [ ] (Proof) 先写 failing 单测：KPI 数字格式化、`delta` 方向与颜色语义、sparkline 空数据降级、`value` 表达式求值、null 值 `--` 占位。
- [ ] (Fix) 实现 `stat-tile` renderer + schema + 注册进 `data-renderer-definitions.ts`（type `stat-tile`，category `data`）。
- [ ] (Follow-up) 评估 `statistics` 与 `stat-tile` 关系：保留 `statistics`（分页总数语义）或标记 deprecated——按 `docs/skills/deprecated-feature-cleanup.md` 流程，结论写入 design.md。
- [ ] (Fix) 产出 `docs/components/stat-tile/design.md` + `example.json`（含同比/环比 + sparkline 示例）。
- [ ] (Fix) 更新 `docs/analysis/2026-08-09-bi-control-support-analysis.md` 状态标注（stat-tile landed）。

Exit Criteria:

- [ ] `stat-tile` 单测全绿（KPI 格式化/涨跌色/null 占位/sparkline 空数据/表达式求值）。
- [ ] `docs/components/stat-tile/design.md` + `example.json` 已存在且与 live renderer 行为一致。

### Phase 2 - `date-range` 相对时间预设

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/date-range-renderer.tsx`、`packages/flux-renderers-form/src/renderers/date-renderer-definitions.ts`、`docs/components/date-range/design.md`（如存在则更新）

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] (Decision) 裁定预设模型：`presets?: Array<{ label: string; value: { start: string; end: string } | { relative: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' } }>`，相对档位运行时解析为绝对区间写入值。
- [ ] (Proof) 先写 failing 单测：相对档位解析（last7days 边界、跨月/跨年）、预设选中后 value 输出为绝对 ISO 区间、非法预设回退无预设。
- [ ] (Fix) 实现预设 UI（预设 chip 行）+ 解析逻辑，保持与现有 `date-range` 值协议兼容。
- [ ] (Fix) 更新 `docs/components/date-range/design.md`（预设 schema + 示例）。

Exit Criteria:

- [ ] 相对预设解析单测全绿（含跨月/跨年边界）。
- [ ] 预设选择产物与现有 `date-range` value 协议兼容（focused 单测断言）。

### Phase 3 - `dashboard-filter` 编排约定

Status: planned
Targets: `docs/components/dashboard-filter/design.md`（新建约定文档）、`docs/components/dashboard-filter/example.json`、关键链路走查单测（放 `flux-renderers-data` 测试）

- Item Types: `Decision | Proof | Follow-up`

- [ ] (Decision) 裁定筛选模型：复用 `crud` queryForm 的"表单 → summary"模式，但筛选值写入**共享 scope**（约定 key 前缀如 `filter.*`），消费端（chart/table 的 `source` 表达式、data-source）经 `${filter.xxx}` 读取；提交动作显式触发消费端 data-source `refresh`。
- [ ] (Proof) 走查单测：共享 scope 写入 → `data-source` 因 `useRenderScope` 订阅自动重载（不依赖手动 refresh 也可联动）；key 失配时 dev warn（Failure Path dashboard-filter-no-link）。
- [ ] (Fix) 产出 `docs/components/dashboard-filter/design.md`：约定（scope key 命名、提交/重置语义、与 crud 的复用边界）+ 最小可运行 `example.json`（2 个筛选 + 1 chart + 1 table 联动）。
- [ ] (Fix) 在 playground 增加 `dashboard-filter` 示例页（若 playground 有 BI 示例目录则放入），验证人工可操作。
- [ ] (Follow-up) 记录 `panel-chrome` 组合基线（card regions + 刷新按钮 + filter 联动）到 design.md，作为后续独立控件的裁决依据。

Exit Criteria:

- [ ] scope 联动走查单测全绿（写入 scope → 消费端重载；key 失配 dev warn）。
- [ ] `docs/components/dashboard-filter/design.md` + `example.json` 存在；playground 示例页可运行。

### Phase 4 - 图表面板刷新约定（panel-chrome 组合支撑）

Status: planned
Targets: `packages/flux-renderers-content/src/card.tsx`、`docs/components/card/design.md`（如存在则更新）、`docs/components/dashboard-filter/design.md`

- Item Types: `Decision | Fix | Proof`

- [ ] (Decision) 裁定 card 是否增加约定字段（如 `refreshAction?: ActionSchema` 渲染 header 刷新按钮，dispatch 到 data-source `refresh` handle）vs 纯组合（header region 放 Button + onClick）——以示例 schema 体积与复用性为判据。
- [ ] (Proof) 若采纳字段：failing 单测（refresh 按钮存在且点击 dispatch 正确 action；无 data-source 时按钮禁用或隐藏）。
- [ ] (Fix) 按裁定落地（字段或示例）；产出"图表卡片 + 刷新 + 筛选联动"完整示例并入 dashboard-filter example。
- [ ] (Fix) 更新 card / dashboard-filter 文档。

Exit Criteria:

- [ ] 裁定记录 + 示例落地（组合示例可运行，含刷新触发 data-source 重载）。
- [ ] 若新增 card 字段：对应单测全绿。

### Phase 5 - chart 增强（双轴 / brush / heatmap）

Status: planned
Targets: `packages/flux-renderers-data/src/chart-schemas.ts`、`packages/flux-renderers-data/src/chart-renderer.tsx`、`docs/components/chart/design.md`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] (Decision) 裁定 schema 扩展：
  - 双轴：`yAxis` 扩展为 `{ label?: string } | Array<{ dataKey?: string; label?: string; position?: 'left' | 'right' }>`，series 增加 `yAxisId` 映射；单轴形态保持向后兼容。
  - brush/zoom：`brush?: boolean`（recharts `Brush`，按索引选区）或 `zoom?: { type: 'brush' | 'wheel' }`（wheel 需自管理 domain，评估成本后裁定）。
  - heatmap：`chartType: 'heatmap'`，series data 为 `{ x: string | number; y: string | number; value: number }[]`，recharts 无原生 heatmap 系列 → 裁定实现路径（`Treemap` 近似 vs 自绘 rect + colorScale vs `Cell` 填充方案），给出选型理由。
- [ ] (Proof) 先写 failing 单测：双轴 series 按 `yAxisId` 归轴、无 `yAxisId` 回退默认轴；brush 选区在数据更新后按索引保留（in-place，延续 DD2 契约）；heatmap 空/畸形数据降级（延续 DD1 空态硬契约）。
- [ ] (Fix) 实现 chart-schemas.ts 扩展 + chart-renderer.tsx 渲染路径。
- [ ] (Fix) 更新 `docs/components/chart/design.md`（新字段 + 决策表增行 + 示例）。
- [ ] (Follow-up) 记录后续候选：`map`（独立评估 geojson 资源管理）、tooltip/legend 自定义 slot。

Exit Criteria:

- [ ] 双轴/brush/heatmap 单测全绿（含回退与降级路径）。
- [ ] `docs/components/chart/design.md` 与 live schema 一致（字段表 + 示例更新）。

## Draft Review Record

> 待独立子 agent（fresh session）review 后填写；pass 前维持 `draft`。

- Reviewer / Agent: 待定
- Verdict: 待定
- Rounds: 待定
- Findings addressed: 待定

## Closure Gates

- [ ] `stat-tile`、`date-range` 预设、chart 增强三项 focused 单测全绿（无被静默降级的 in-scope 行为）。
- [ ] `dashboard-filter` 编排约定落地（文档 + 示例 + scope 联动走查通过）。
- [ ] card 刷新约定裁定记录与示例落地。
- [ ] `docs/components/stat-tile/design.md`、`docs/components/dashboard-filter/design.md`、`docs/components/chart/design.md`、`docs/components/date-range/design.md` 与 live baseline 一致。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope 行为缺口。
- [ ] 受影响的 owner docs 已同步到 live baseline。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 地图（`map`）实现

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 地图依赖 geojson 资源管理与独立数据协议，chart design 已裁定不纳入；BI 骨架不依赖地图成立。
- Successor Required: `no`（已记录于 Phase 5 Follow-up 与 control-gap-survey）

### `data-grid` / `conditional-formatting-editor`

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: control-gap-survey Tier 2 候选，与 BI 骨架无耦合，需独立立项裁决。
- Successor Required: `no`

## Non-Blocking Follow-ups

- `statistics` 与 `stat-tile` 的关系裁定（保留 vs deprecated）落地到 design.md。
- 若 dashboard-filter 约定在多个页面重复出现，评估提取为正式控件（记录于 design.md 的后续节）。
- `panel-chrome` 独立控件化评估（当前组合基线足够时维持组合）。

## Closure

Status Note: 待执行完成后填写

Closure Audit Evidence:

- Auditor / Agent: 待定
- Evidence: 待定

Follow-up:

- 待定
