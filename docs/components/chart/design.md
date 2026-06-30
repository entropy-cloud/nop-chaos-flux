# Chart 组件设计

## 1. 组件定位

- `chart` 是图表展示 renderer，用来把结构化数据映射为折线、柱状、饼图和散点等视觉表达。
- 它只负责图表表现层和交互事件，不承担数据请求编排。

## 2. 与 AMIS 或既有产品的能力对照

本节是 chart 视觉能力的 Flux 决策表：哪些能力纳入 schema、哪些不纳入、理由。所有决策基于 recharts 原生能力（`flux-renderers-data` 依赖 `recharts ^3.8.1`）。

| 能力                                                       | 采纳               | 不采纳 | 理由                                                                                                                                                                                                                             |
| ---------------------------------------------------------- | ------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'area'` 图表类型                                          | ✅                 |        | recharts `AreaChart`+`Area` 一等公民，与 bar/line/pie/scatter 并列；缺省回退仍为 `'bar'`。                                                                                                                                       |
| `legend` 显式开关                                          | ✅                 |        | 显式 boolean 覆盖既有 `hasMultipleSeries` 启发式（单 series 无法显式开关 legend）；未设时维持现状，无回归。                                                                                                                      |
| `stacked` 堆叠                                             | ✅                 |        | recharts `stackId` 原生支持；bar/area 系列在 `stacked:true` 时 `stackId="a"`。recharts v3 的 `Line` 类型不再暴露 `stackId`（仅 Bar/Area 支持），故 line 类型忽略 `stacked`；pie/scatter 无堆叠语义，亦忽略。                     |
| `grid` 网格开关                                            | ✅                 |        | `CartesianGrid` 由硬编码改为条件渲染；缺省 `true` 维持现状；pie 不受影响。                                                                                                                                                       |
| `colors` 调色板 override                                   | ✅                 |        | 自定义 `string[]` 按系列 index 取色，越界回退默认 `COLORS`；`colors:[]` 视为未设。不改 `series`/`source` 双入口语义（见 §12）。                                                                                                  |
| echarts config 透传                                        |                    | ✅     | recharts 够用；echarts config 透传破坏 schema 边界，引入与 recharts 渲染路径冲突的双轨。                                                                                                                                         |
| echarts 扩展（wordcloud/stat/bmap）                        |                    | ✅     | 扩展引入大依赖，超出 chart 表现层定位。                                                                                                                                                                                          |
| geo 地图                                                   |                    | ✅     | 地图需独立数据协议与地图资源（geojson）管理，超出 chart 表现层定位；归独立 renderer 评估。                                                                                                                                       |
| echarts 主题（`chartTheme`/`registerTheme`/`registerMap`） |                    | ✅     | 主题由 CSS 变量 + Tailwind design token 管理（见 `docs/architecture/theme-compatibility.md`、`styling-system.md`），不引入 echarts 主题体系。                                                                                    |
| 双轴（dual axis）                                          |                    | ✅     | 需独立多 yAxis schema 设计（双 measure 映射），归后续视觉增强；真实场景出现前不引入。                                                                                                                                            |
| 数据缩放（brush/zoom）                                     |                    | ✅     | 需独立 schema + 状态归属设计，归后续。                                                                                                                                                                                           |
| 复杂自定义 tooltip/legend schema slot                      |                    | ✅     | §6「不建议首版直接开放 arbitrary schema slot」；当前 tooltip/legend 由 recharts 内置组件承担。                                                                                                                                   |
| 组件级 `api`/`interval`/轮询                               |                    | ✅     | 请求编排由 loader/`data-source` 承担（见 §9），chart 只消费 `source`/`series` 最终结构，不承担查询协议。                                                                                                                         |
| `component:resize` 句柄                                    | 既有（watch-only） |        | 既有句柄 `handleResize` 当前为 no-op（返回 `{ok:true}` 无额外效果）。recharts `ChartContainer` 内部 `ResponsiveContainer` 已自动响应容器尺寸，句柄冗余；裁定 watch-only：若未来移除 ResponsiveContainer 或需强制重排，独立评估。 |

已支持（非本批新增）的既有字段：`chartType`、`title`、`series`、`source`、`xAxis`、`yAxis`、`empty` 和交互事件（`onClick`、`onHover`）。

## 3. Flux 中的 renderer/type 定义

- `type: 'chart'`
- `category: 'data'`
- `sourcePackage: '@nop-chaos/flux-renderers-data'`
- 当前 fields: `title`、`empty` 为 `value-or-region`，`onClick`、`onHover` 为 `event`

## 4. schema 设计

- 当前导出字段为 `chartType`、`title`、`series`、`source`、`xAxis`、`yAxis`、`height`、`loading`、`empty`、`legend`、`stacked`、`grid`、`colors`。
- `chartType` 取值：`'bar'` | `'line'` | `'pie'` | `'scatter'` | `'area'`；非法值回退 `'bar'`。
- `legend?: boolean` 显式控制图例开关，覆盖 `hasMultipleSeries` 启发式；未设时维持现状（多 series 显示、单 series 隐藏）。
- `stacked?: boolean` 堆叠开关；bar/area 系列生效（recharts v3 `Line` 不支持 `stackId`，line 类型忽略），pie/scatter 忽略。
- `grid?: boolean` 网格开关，缺省 `true`；仅 cartesian 类型（bar/line/area/scatter）受影响，pie 不受影响。
- `colors?: string[]` 自定义调色板；按系列 index 取色，越界回退默认 `COLORS`；`colors:[]` 视为未设。
- `title` 遵循 value-or-region authoring contract：既可以是普通字符串，也可以是 schema fragment；renderer 会把 slot 内容渲染为 `chart-title` chrome，并通过 `aria-labelledby` 继续作为图表的可访问名称来源。
- `series` 和 `source` 的职责需要文档明确：前者更接近最终绘图配置，后者更接近原始数据集。

## 5. 字段分类

- `chartType`、`series`、`source`、`xAxis`、`yAxis`、`height`、`loading`、`legend`、`stacked`、`grid`、`colors`: `value`
- `title`、`empty`: `value-or-region`
- `onClick`、`onHover`: `event`

## 6. regions 与 slot 约定

- `title` 和 `empty` 是正式 supported slots。
- 数据点 tooltip、legend 自定义等复杂渲染不建议首版直接开放 arbitrary schema slot。
- **空态硬契约（DD1）**：`source`/`series` 为空（`[]`、`undefined`、`null`，或全部 series 无 data）时，渲染 `empty` slot（缺省 `t('flux.common.noData')`）——**显式空态，永不抛错**。`sanitizeSeries`/`isChartDatum` 守护渲染路径，畸形 series/data 被过滤而非报错（回归锚见 `chart-renderer.unit.test.tsx` 的 DD1 anchors）。
- **In-place 更新契约（DD2）**：数据经 prop 流（`props.props.source`/`series`），**无 key-remount**；数据更新时 chart-canvas 宿主节点 identity 稳定、无 loading flash。recharts `ResponsiveContainer` 默认走 in-place 路径。**注意：本保证按构造成立**（数据经 prop 流、无 key-remount），**非测试验证**——chart 单测 mock 掉 recharts（无法断言内部 `ResponsiveContainer` identity）；可测部分（宿主节点稳定 + 无 flash）已锁为回归锚（`chart-renderer.unit.test.tsx` 的 DD2 anchor）。后续若 unmock recharts 可补内部 identity 真实断言（watch-only，见 Non-Blocking Follow-ups）。

## 7. 运行期状态归属

- 图表数据和配置来自外部 scope/props。
- hover、tooltip 打开态、缩放窗口等为局部 UI 状态，不应默认持久化到页面 scope。

## 8. 事件、动作与组件句柄能力

- 当前最小事件是 `onClick`、`onHover`。
- 当前组件句柄基线是 `component:resize`。
- 后续可补更窄的导出或实例控制句柄，但应在 runtime、definition metadata 和 owner docs 中同时收口。

## 9. 数据源、表达式、导入能力接入点

- 图表数据应由 loader 或 `data-source` 提供给 `source`/`series`。
- 图表 renderer 只消费最终结构，不承担查询协议。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-chart` marker。
- 高度、背景和留白由 schema 和宿主样式控制，不在 renderer 内写死主题色。

## 11. 实现拆分建议

- 数据归一化、图表库适配、事件桥接和空态处理分模块实现。

## 12. 风险、取舍与后续阶段

- `series` 与 `source` 的双入口如果不收敛，后续会产生重复语义，需要持续规范。
- `colors` override 只改取色来源（默认 `COLORS` → 自定义 palette），不改 `series`/`source` 双入口语义或数据归一化路径。

## 13. 响应式行为

> 来源：`docs/architecture/mobile-responsive-baseline.md`（M0 基线）、mobile-roadmap M4c。
> 裁定（Decision）：小屏自适应**优先容器宽度**（`ResizeObserver`），不用 `useIsMobile()`（视口宽度）——chart 常被嵌入非满宽容器，容器宽度才是真实绘图宽度。`ChartContainer` 内部 `ResponsiveContainer` 已自动响应容器**宽度**；本节补的是**高度**与**图例**的小屏适配。响应式是内部运行时分支，不新增任何 schema 字段。

### 高度自适应

| 容器宽度                                 | 行为                                                            | 实现                                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| < 768px (narrow)                         | 数值型 `height` clamp 到移动端上限 `300px`（已小于 300 则不改） | `chart-renderer.tsx` 用 `ResizeObserver` 测 `chart-canvas` 宽度 → `isNarrow` → `Math.min(height, 300)` |
| ≥ 768px (wide)                           | 维持 schema `height`（缺省 `400px`）                            | 维持现状，无回归                                                                                       |
| 字符串型 `height`（如 `'50vh'`/`'50%'`） | 原样透传，不 clamp                                              | 字符串无法数值比较，保持作者意图                                                                       |

### 图例位置

| 容器宽度         | 行为                                                                                                                         | 实现                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| < 768px (narrow) | 图例维持底部横排（`verticalAlign="bottom"`，复用 E3 legend 配置），但增 `flex-wrap gap-x-3 gap-y-1` 让多项换行而非挤压绘图区 | `ChartLegendContent` className 在 narrow 切换 |
| ≥ 768px (wide)   | 图例底部横排，单行（`justify-center`）                                                                                       | 维持现状，无回归                              |

> baseline §4.3 / mobile-roadmap Failure Path：图例本就底部横排，小屏只解决「多项挤压」——换行后不遮挡数据。

### ResizeObserver 缺席回退（Failure Path）

| 场景                       | 触发                                    | 行为                                                        | 用户可见表现                             |
| -------------------------- | --------------------------------------- | ----------------------------------------------------------- | ---------------------------------------- |
| ResizeObserver 不支持/缺席 | `typeof ResizeObserver === 'undefined'` | 不测量容器宽度，回退固定 `height` 缺省（400px），**不抛错** | 小屏图表高度不随容器收缩（降级，无报错） |

实现：`ResizeObserver` effect 在 `typeof ResizeObserver === 'undefined'` 或 `chartRef` 为空（空态不渲染 canvas）时早返回，`containerWidth` 保持 `null` → `isNarrow=false` → 固定高度。

### DOM marker（供样式 / e2e 程序化断言）

- `.nop-chart` 根在 narrow 增 `data-responsive="narrow"`（宽屏缺省不输出）。
- `.nop-chart` 根在 ResizeObserver 可用且已测量到宽度时增 `data-responsive-supported="true"`；缺席时不输出（用于 e2e/单测区分降级路径）。

### 触摸适配

- chart 是只读展示 renderer，无内建可点击控件（`onClick`/`onHover` 事件除外）；触摸目标规范不适用。
- 小屏 X 轴标签旋转/抽稀属增强，归后续评估（见 mobile-roadmap Non-Blocking Follow-ups）。
