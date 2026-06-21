# E3 chart 视觉配置增强（minor recharts enhancements）

> Plan Status: active
> Mission: components-improvement
> Work Item: E3 chart minor recharts 增强 子项
> Last Reviewed: 2026-06-22
> Source: `docs/components/existing-components-improvement-roadmap.md`（E3 P2 行「chart minor recharts 增强」）、`docs/components/existing-components-improvement-analysis.md` §3/§5（chart 用 recharts；echarts config 透传/扩展/geo 不采纳）、`docs/components/chart/design.md` §2/§4/§5
> Related: `docs/plans/2026-06-21-0255-x5-flux-decision-tables-plan.md`（X5 未覆盖 chart，本 plan 需扩展）、`docs/components/existing-components-improvement-detail.md` §chart（L318-341）

## Purpose

把 `chart`（`flux-renderers-data`，P3）从「4 类型 + 固定视觉参数」补齐为「覆盖常见 dashboard 视觉配置」：显式 `legend` 开关、`stacked` 堆叠、`grid` 网格开关、自定义 `colors` 调色板、新增 `'area'` 图表类型。全部在 **recharts 原生能力范围内**（分析报告 §0.2/§5 明确拒绝 echarts config 透传/echarts 扩展/geo 地图）。

**范围裁定**（基于 design.md §2/§4 + 分析报告 §5）：

- **只做 recharts 原生能力。** 分析报告 §5 明确拒绝：echarts config 透传、echarts 扩展（wordcloud/stat/bmap）、geo 地图、`echarts.registerTheme`/`registerMap`、主题（`chartTheme`）。本 plan 的 5 项增强均为 recharts 一等公民（`stackId`、`CartesianGrid`、`colors`、`AreaChart`、`Legend` 显式控制）。
- **不做组件级请求。** 分析报告 §5 拒绝 chart 的组件级 `api`/`interval`/轮询；数据由 `source`/`series` 外部供给（design.md §9）。
- **不做双轴/复杂 tooltip/数据缩放。** design.md §2 明确「高级图表联动、双轴、数据缩放和复杂 tooltip 应在有真实场景后分阶段引入」——归后续。

这是单组件（chart）多能力（5 项视觉配置），共享同一 design.md / 同一 result surface / 同一组 closure criteria，合并为单 owner plan（遵循 plan guide Rule 26）。

## Current Baseline

- `packages/flux-renderers-data/src/chart-renderer.tsx`（373 行）：
  - 4 类型分支：`renderChart()` L217-310（bar L289-308 / line L262-287 / pie L218-230 / scatter L232-260）；**无 area 分支**。
  - `COLORS` L35-41：固定 5 色（`hsl(var(--chart-1..5))`），无 override 入口。
  - `CartesianGrid`：bar/line/scatter 均**硬编码** `<CartesianGrid strokeDasharray="3 3" />`（L235/265/291）；pie 无。**无 `grid` 开关**。
  - `ChartLegend`：仅在 `hasMultipleSeries`（L111）时渲染（L222/239/269/295）；单 series 无法显式开/关 legend。**无 `legend` 字段**。
  - 堆叠：`<Bar>`/`<Line>` 无 `stackId`，**无 `stacked` 字段**。
  - `chartConfig` L113-124 / `pieData`/`cartesianData` 数据归一化已成型。
- `packages/flux-renderers-data/src/chart-schemas.ts`（24 行）：`ChartType = 'bar'|'line'|'pie'|'scatter'`（L3）；`ChartSchema` L12-23 字段 `componentId/chartType/title/series/source/xAxis/yAxis/height/loading/empty`。**无 `legend`/`stacked`/`grid`/`colors`，`chartType` 不含 `'area'`**。
- `packages/flux-renderers-data/src/data-renderer-definitions.ts:423-448`：chart definition，`componentCapabilityContracts` 仅 `resize`（L428-434）；`fields` 不含新字段。
- `packages/flux-renderers-data/src/__tests__/chart-renderer.unit.test.tsx`（401 行）：用 `simplifyProps` 断言 recharts 组件 props；覆盖 4 类型 / title slot / empty / handle resize / onClick。**无视觉配置断言**。
- `packages/flux-renderers-data/src/__tests__/data-chart-handles.test.tsx`：覆盖 `component:resize` 句柄。
- `docs/components/chart/design.md`（64 行，12 节）：§2 是叙述节（无 Flux 决策表，X5 未覆盖 chart）；§4 列当前字段；§12 风险「`series` 与 `source` 双入口需持续规范」。
- **`component:resize` 现状**：`handleResize = () => { void chartRef.current; }`（L183-185）——**空实现**（no-op），返回 `{ok:true}` 但无 observable 效果。recharts `ChartContainer` 内部用 `ResponsiveContainer` 自动响应尺寸，故 `resize` 实际冗余。这是**既存** hollow 句柄，非本 plan 引入；本 plan 裁定见 Deferred。
- playground：`apps/playground/src/component-lab/renderers/chart-lab-page.tsx`（68 行）仅 bar + line 两场景；**无 area/stacked/grid/colors/legend demo**。
- `docs/components/examples.manifest.json` L46 已登记 `chart`（runtime 列表）。
- recharts 版本：`^3.8.1`（`flux-renderers-data` + `ui` 均依赖），支持 `AreaChart`/`Area`/`stackId`/`CartesianGrid`/`Legend`。

## Goals

- `ChartType` 新增 `'area'`（折线区域图，recharts `AreaChart`+`Area`），与既有 4 类型并列；缺省回退仍为 `'bar'`。
- `ChartSchema` 新增 `legend?: boolean`（显式 legend 开关，覆盖 `hasMultipleSeries` 启发式：未设时维持现状）。
- `ChartSchema` 新增 `stacked?: boolean`（bar/line/area 系列 `stackId="a"` 堆叠；pie/scatter 不适用，忽略）。
- `ChartSchema` 新增 `grid?: boolean`（cartesian 网格开关，缺省 `true` 维持现状；pie 不受影响）。
- `ChartSchema` 新增 `colors?: string[]`（覆盖 `COLORS` 调色板；按 index 取色，越界回退默认 `COLORS`）。
- `chart/design.md` 新建 §2 Flux 决策表（X5 扩展）+ §4/§5 字段分类同步。
- focused 单测覆盖 5 项增强 + 缺省无回归。
- playground demo 新增 area/stacked/grid-off/custom-colors/legend-toggle 场景。
- e2e 覆盖关键视觉路径。

## Non-Goals

- 不引入 echarts（config 透传/扩展/geo/主题/`registerTheme`/`registerMap`）——分析报告 §5 已拒绝。
- 不实现双轴（dual axis）——design.md §2 后续。
- 不实现数据缩放（brush/zoom）——design.md §2 后续。
- 不实现复杂自定义 tooltip/legend schema slot——design.md §6「不建议首版直接开放 arbitrary schema slot」。
- 不实现组件级 `api`/`interval`/轮询——分析报告 §5 已拒绝（数据由 `source`/`series` 供给）。
- 不改 `series` 与 `source` 双入口语义——design.md §12 风险项，独立治理。
- 不修 `component:resize` 空实现（既存 hollow，本 plan 裁定为 watch-only，见 Deferred）。
- 不实现 xAxis/yAxis domain（min/max）——归后续视觉增强（见 Non-Blocking Follow-ups）。

## Scope

### In Scope

- `chart-schemas.ts`：`ChartType` 加 `'area'`；`ChartSchema` 加 `legend`/`stacked`/`grid`/`colors`。
- `chart-renderer.tsx`：area 分支；`legend`/`stacked`/`grid`/`colors` 消费逻辑；缺省无回归。
- `data-renderer-definitions.ts`：chart definition `fields` 加新字段。
- `chart/design.md`：§2 Flux 决策表 + §4/§5 同步。
- focused 单测（`chart-renderer.unit.test.tsx` 扩展）。
- playground demo + e2e。

### Out Of Scope

- echarts 全族（§5 拒绝）。
- 双轴 / 数据缩放 / 自定义 tooltip slot / 组件级 api / 双入口语义治理 / `component:resize` hollow 修复 / axis domain。

## Failure Paths

| 场景编号              | 触发                             | 行为                                                                           | 可重试 | 用户可见表现   |
| --------------------- | -------------------------------- | ------------------------------------------------------------------------------ | ------ | -------------- |
| `chart-type-area`     | `chartType:'area'`               | 渲染 `AreaChart`+`Area`（type monotone，区域填充，stroke + fill 取自 palette） | 否     | 区域折线图     |
| `chart-type-unknown`  | `chartType` 非法（如 `'radar'`） | 回退 `'bar'`（既有 L91/L162-164 行为）                                         | 否     | 柱状图（不崩） |
| `legend-explicit-off` | `legend:false` + 多 series       | 不渲染 `ChartLegend`（覆盖 hasMultipleSeries）                                 | 否     | 无图例         |
| `legend-explicit-on`  | `legend:true` + 单 series        | 渲染 `ChartLegend`                                                             | 否     | 显示图例       |
| `stacked-bar`         | `stacked:true` + 多 bar series   | 每个 `<Bar stackId="a">`                                                       | 否     | 堆叠柱状图     |
| `stacked-pie-ignored` | `stacked:true` + pie             | 忽略 stacked（pie 无堆叠语义）                                                 | 否     | 普通饼图       |
| `grid-off`            | `grid:false` + cartesian         | 不渲染 `CartesianGrid`                                                         | 否     | 无网格线       |
| `colors-override`     | `colors:['#f00','#0f0']`         | 系列按 index 取自定义色，越界回退默认                                          | 否     | 自定义配色     |
| `colors-empty`        | `colors:[]`                      | 视为未设，用默认 `COLORS`                                                      | 否     | 默认配色       |

## Test Strategy

档位选择：建议有测

本档选择：建议有测。理由：5 项视觉配置是可观测行为（渲染哪个 recharts 组件、是否含 `stackId`、是否含 `CartesianGrid`），focused 单测可用既有 `simplifyProps` 模式精确断言；但非鉴权/对外 API/核心回归路径。e2e 覆盖 area + stacked 一条关键路径即可。

## Execution Plan

### Phase 1 - design.md Flux 决策表 + 字段裁定

Status: planned
Targets: `docs/components/chart/design.md`

- Item Types: `Decision`、`Follow-up`

- [ ] 在 `design.md` §2 新建 Flux 决策表（列：能力 / 采纳 / 不采纳 / 理由），将现有 §2 叙述性 bullet 收编进决策表（叙述内容转化为决策行，不保留双套并存），覆盖：`'area'` 类型（采纳，recharts AreaChart）、`legend`（采纳，显式开关）、`stacked`（采纳，recharts stackId）、`grid`（采纳，开关）、`colors`（采纳，override）、echarts config 透传/扩展/geo/主题（不采纳，recharts 够用 + echarts 过大）、双轴/数据缩放/复杂 tooltip slot（不采纳，design.md §2 后续）、组件级 api/interval（不采纳，请求下沉）、`component:resize`（既有，watch-only——recharts ResponsiveContainer 已自动响应）。
- [ ] 同步 §4（新字段加入正式字段清单）、§5（`legend`/`stacked`/`grid`/`colors`: `value`；`chartType` 扩展 `'area'`）、§12（colors override 不改双入口语义）。

Exit Criteria:

- [ ] `design.md` §2 Flux 决策表存在且每行含采纳/不采纳 + 理由（live repo 可读）。
- [ ] §4/§5 字段分类含 5 项新字段 + `'area'` 类型（与 schema 一致）。

### Phase 2 - schema + definition 字段声明

Status: planned
Targets: `packages/flux-renderers-data/src/chart-schemas.ts`、`packages/flux-renderers-data/src/data-renderer-definitions.ts`

- Item Types: `Fix`

- [ ] `ChartType` 加 `'area'`：`'bar' | 'line' | 'pie' | 'scatter' | 'area'`。
- [ ] `ChartSchema` 加 `legend?: boolean`、`stacked?: boolean`、`grid?: boolean`、`colors?: string[]`。
- [ ] `data-renderer-definitions.ts` chart definition `fields` 加 `{key:'legend',kind:'prop'}`、`{key:'stacked',kind:'prop'}`、`{key:'grid',kind:'prop'}`、`{key:'colors',kind:'prop'}`。

Exit Criteria:

- [ ] `chart-schemas.ts` 中 `ChartType` 含 `'area'`、`ChartSchema` 含 4 新字段（live repo 可读）。
- [ ] definition `fields` 含 4 新字段。
- [ ] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-data typecheck`）。

### Phase 3 - 视觉配置实现（area + legend + stacked + grid + colors）

Status: planned
Targets: `packages/flux-renderers-data/src/chart-renderer.tsx`

- Item Types: `Fix`、`Proof`

- [ ] `isChartType` L43-45 加 `'area'`；`renderChart()` 新增 area 分支（`AreaChart` + `CartesianGrid`(受 gate) + `ChartTooltip` + `ChartLegend`(受 gate) + `Area type="monotone" dataKey=... stackId?(stacked) stroke/fill`）。
- [ ] `legend` 消费：`showLegend = props.props.legend ?? hasMultipleSeries`（显式值覆盖启发式）；所有 `hasMultipleSeries && <ChartLegend>` 改为 `showLegend && <ChartLegend>`。
- [ ] `stacked` 消费：bar/line/area 系列在 `stacked:true` 时加 `stackId="a"`；pie/scatter 忽略。
- [ ] `grid` 消费：`showGrid = props.props.grid ?? true`；cartesian 分支的 `<CartesianGrid>` 改为条件渲染；pie 不受影响。
- [ ] `colors` 消费：`const palette = (Array.isArray(colors) && colors.length>0) ? colors : COLORS;` 替换**所有** `COLORS` 引用（含 `COLORS[i % COLORS.length]` 6 处 L117/131/138/225/277/302，与 `COLORS[0]` 单 series fallback 3 处 L121/283/306）；取色统一用 `palette[i % palette.length]`，单 series fallback 用 `palette[0]`。
- [ ] 缺省（4 新字段均未设）行为与现状完全一致（无回归）。

Exit Criteria:

- [ ] `chartType:'area'` 渲染 `AreaChart`（`simplifyProps` 可观测）。
- [ ] `legend:false` + 多 series 不渲染 `ChartLegend`；`legend:true` + 单 series 渲染。
- [ ] `stacked:true` + bar 系列 `Bar` 含 `stackId`；pie 忽略。
- [ ] `grid:false` 不渲染 `CartesianGrid`；`grid:true`/缺省渲染。
- [ ] `colors:['#f00']` 系列 0 用 `#f00`，系列 1+ 越界回退默认或循环。
- [ ] 既有 chart 单测全过（无回归）。

### Phase 4 - focused 单测 + playground demo + e2e

Status: planned
Targets: `packages/flux-renderers-data/src/__tests__/chart-renderer.unit.test.tsx`、`apps/playground/src/component-lab/renderers/chart-lab-page.tsx`、`tests/e2e/`

- Item Types: `Proof`、`Follow-up`

- [ ] 扩展 `chart-renderer.unit.test.tsx`：先在 recharts mock（L95-108）补 `AreaChart`/`Area`，再用 `simplifyProps` 断言 5 项增强（area 类型 / legend 开关 / stacked stackId / grid 开关 / colors override）+ 缺省无回归 + Failure Paths（chart-type-unknown 回退、stacked-pie-ignored、colors-empty）。
- [ ] playground demo 新增场景：area chart、stacked bar、grid-off、custom colors、legend-toggle（至少 area + stacked 两场景）。
- [ ] e2e 新增/扩展：覆盖 area + stacked 关键视觉路径。

Exit Criteria:

- [ ] 新增 focused 单测全 GREEN，覆盖 5 项增强 + Failure Path 回退/忽略语义。
- [ ] playground demo 可交互（area/stacked 视觉可辨）。
- [ ] e2e 关键路径通过。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅子 agent 填写。

- Reviewer / Agent: 独立 plan-review 子 agent（fresh session，不复用起草者上下文；ses_113e7b6e8ffek9UF3Unx3HqDsz）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - 33+ 引用全部经 live repo 核对，零误差。
  - [Minor 1] Phase 3 `colors` 替换应含 `COLORS[0]` 单 series fallback（L121/L283/L306）→ Phase 3 已改为枚举全部 9 处 COLORS 引用。
  - [Minor 2] Failure Path `chart-type-area`「渐变填充」措辞不精确 → 已改为「区域填充，stroke + fill 取自 palette」。
  - [Minor 3] Phase 4 未提 recharts mock 需补 `AreaChart`/`Area` → Phase 4 已加「先在 recharts mock 补 AreaChart/Area」。
  - [Minor 4] §2 决策表与既有叙述 bullet 关系不清 → Phase 1 已改为「将现有 §2 叙述性 bullet 收编进决策表，不保留双套并存」。
  - `component:resize` hollow handle 的 watch-only 裁定经独立核实（ResponsiveContainer 补偿于 `packages/ui/src/components/ui/chart.tsx:95`），诚实、可辩护。

## Closure Gates

- [ ] 5 项视觉配置（area/legend/stacked/grid/colors）在 live repo 真实落地（非空壳：recharts 组件 props 可观测）。
- [ ] 缺省行为无回归（既有 chart 单测全过）。
- [ ] 必要 focused verification（Phase 4 单测）已完成。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [ ] `chart/design.md` 已同步到 live baseline（§2 决策表 + §4/§5）。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### `component:resize` 空实现（hollow handle）

- Classification: `watch-only residual`
- Why Not Blocking Closure: `handleResize = () => { void chartRef.current; }`（chart-renderer.tsx L183-185）是**既存** no-op，非本 plan 引入。recharts `ChartContainer` 内部用 `ResponsiveContainer` 已自动响应容器尺寸，`resize` 句柄实际冗余——调用返回 `{ok:true}` 但无额外 observable 效果，不构成功能缺失（图表已自适应）。本 plan 的 result surface 是「视觉配置」，resize 行为是独立 result surface；修复需 ResizeObserver 显式 plumbing，与本 plan 的 5 项增强无 closure 依赖。裁定为 watch-only：若未来移除 ResponsiveContainer 或需强制重排，独立评估。
- Successor Required: no

### 双轴（dual axis）/ 数据缩放（brush/zoom）/ 自定义 tooltip slot

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design.md §2 明确「高级图表联动、双轴、数据缩放和复杂 tooltip 应在有真实场景后分阶段引入」；本 plan 聚焦 recharts 一等视觉配置，双轴等需独立 schema 设计（多 yAxis、双 measure）。
- Successor Required: no

### echarts config 透传 / 扩展 / geo 地图 / 主题

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 分析报告 §0.2/§5 已明确拒绝（recharts 够用，echarts 过大）；本 plan 全部增强在 recharts 原生范围内。
- Successor Required: no

## Non-Blocking Follow-ups

- xAxis/yAxis `min`/`max` domain + `tickFormat` 归后续视觉增强（需扩展 axis schema 形状，与当前 `{dataKey,label}` 不同）。
- `series` 与 `source` 双入口语义治理（design.md §12 风险项）独立评估。
- `'radar'`/`'radial-bar'` 等更多 recharts 类型归后续按需添加。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
