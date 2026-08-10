# Sparkline 组件设计

> 来源：`docs/analysis/2026-08-09-bi-control-support-analysis.md`（BI 控件族：KPI 层 sparkline 独立组件缺口）、plan `2026-08-09-sparkline-component-plan.md`（承接 `2026-08-09-bi-kpi-filter-chart-enhance-plan.md` Phase 1 的「sparkline 实现路径」裁定项）
> 落地：2026-08-10（`sparkline` renderer + 纯函数 + 单测 + 本文档 + example.json + playground 示例）

## 1. 组件定位

- `sparkline` 是自绘 SVG polyline 迷你趋势图**原子组件**（type: `sparkline`，落 `flux-renderers-data`）：纯展示、零新增依赖（不引 recharts，自绘 path）。
- 作为 stat-tile 内部 sparkline 字段的复用基座（复用约定见 §11），并可独立用于表格单元格、卡片、列表项等场景。
- 只做表现层 + 数据绑定（`data` 经 `${expr}` 消费），不承担数据请求编排、无交互。

## 2. 与 AMIS 或既有产品的能力对照

| 能力                                    | 采纳 | 不采纳 | 理由                                                                                                                             |
| --------------------------------------- | ---- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 自绘 SVG polyline（无新依赖）           | ✅   |        | stat-tile 裁定先例延续：≤120×32 单系列迷你图，recharts 坐标系/tooltip 体系用不上，可直接断言 path `d`/`data-points`。            |
| 复用 recharts 迷你 LineChart            |      | ✅     | 复杂度与收益不匹配；n=1 无有意义渲染；断言面变脆（chart 单测即 mock recharts）。                                                 |
| VTable `cellType: 'sparkline'` 能力对照 |      | ✅     | 透视表内嵌迷你图由 VTable 自绘承担（`~/sources/vtable`），与 flux 原子组件能力对照而非实现绑定；pivot 计划落地后如需桥接再评估。 |
| 交互（tooltip/点击/缩放）               |      | ✅     | 纯展示原子；交互形态（如迷你图点击联动）依赖具体宿主场景，出现真实需求再评估。                                                   |
| 动画 / 虚线 / 多序列对比                |      | ✅     | 多序列可用多个 sparkline 叠加表达，不内置；渐变填充仅按 `fill` 开关支持。                                                        |
| 重绘性能优化（>1k 数据点）              |      | ✅     | 首版面向 ≤1k 数据点；大数据点优化记录为 Non-Blocking Follow-up。                                                                 |

## 3. Flux 中的 renderer/type 定义

- `type: 'sparkline'`
- `category: 'data'`
- `sourcePackage: '@nop-chaos/flux-renderers-data'`
- 注册于 `data-renderer-definitions.ts`（定义拆于 `sparkline-renderer-definition.ts`，保持 700 行 lint cap，stat-tile 先例）。
- schema 类型：`SparklineSchema`（`flux-renderers-data/src/sparkline-schemas.ts`）。

## 4. schema 设计（Decision）

| 字段     | 类型                                            | 说明                                                                                              |
| -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `data`   | `SchemaValue`（`number[]`/`${expr}`）           | 迷你趋势数据；空/非数组/全非法值渲染空占位（Failure Path sparkline-empty）                        |
| `width`  | `number`                                        | 画布宽度，缺省 120（sparkline 语义尺寸）；非法值回退缺省                                          |
| `height` | `number`                                        | 画布高度，缺省 32                                                                                 |
| `color`  | `string \| { status: 'up'\|'down'\|'neutral' }` | 静态色（原样用作 stroke）或 `{ status }` 趋势语义色（CSS 变量）；缺省按数据首尾值推导方向取语义色 |
| `fill`   | `boolean`                                       | 折线下方渐变填充（linearGradient defs），缺省 false                                               |
| `smooth` | `boolean`                                       | 贝塞尔平滑曲线（Catmull-Rom 转 C 段），缺省 false（折线 L 段）                                    |
| `min`    | `number`                                        | 显式 Y 域下界；缺省数据极值                                                                       |
| `max`    | `number`                                        | 显式 Y 域上界；缺省数据极值                                                                       |

- `data` 支持 `${expr}`：编译期按 prop 解析，运行期随 scope 变化重渲染；renderer 另经 `helpers.evaluate` 兜底求值（数据经 props/scope，无 IO——INV-1 合规）。
- `color: { status }` 为显式方向声明，覆盖数据首尾值推导；静态色字符串优先于任何语义推导。

## 5. status 颜色契约（Decision）

- 方向推导：**尾值 > 首值 = `up`**，尾值 < 首值 = `down`，相等/单点/空数据 = `neutral`。
- 显式优先：`color: { status: 'x' }` 覆盖推导；`color: '<静态色>'` 完全绕过语义色。
- CSS 变量映射（主题无关，随 theme token 切换，`hsl(var(--...))` 形态）：

| status    | CSS 变量                       | 语义                  |
| --------- | ------------------------------ | --------------------- |
| `up`      | `hsl(var(--success))`          | 正向色（success）     |
| `down`    | `hsl(var(--destructive))`      | 负向色（destructive） |
| `neutral` | `hsl(var(--muted-foreground))` | 中性前景              |

- 根节点 `data-status` 暴露生效方向（含显式覆盖），供样式/e2e 程序化断言。

## 6. Failure Paths

| 场景                    | 触发                        | 行为                                                                 | 可重试 | 用户可见表现   |
| ----------------------- | --------------------------- | -------------------------------------------------------------------- | ------ | -------------- |
| sparkline-empty         | `data` 为空/非数组/全非法值 | 不渲染 polyline，渲染空占位（`data-slot="sparkline-empty"`，不抛错） | 是     | 空白迷你图区域 |
| sparkline-single-point  | 仅 1 个数据点               | 渲染圆点标记（无线段）                                               | 是     | 单点显示       |
| sparkline-flat          | 全部数据相等（Y 域零跨度）  | Y 域回退 [value-1, value+1]（避免除零），中线渲染                    | 是     | 水平线         |
| sparkline-invalid-point | 数据含 null/NaN             | 非法点过滤 + dev warn，剩余点渲染                                    | 是     | 有效点趋势线   |

（全部 4 条已由 `sparkline-path.test.ts`（23 例）+ `sparkline-renderer.test.tsx`（12 例）逐条断言。）

## 7. Y 域 / 平滑 / 填充语义（Decision）

- **Y 域（`normalizeYDomain`）**：显式 `min`/`max` 优先（可单侧指定，缺省侧取数据极值）；零跨度（全数据相等）回退 `[value-1, value+1]`（避免除零，Failure Path sparkline-flat）；`min > max` 归一化交换。
- **坐标映射（`buildSparklinePoints`）**：首点贴 x=0 边、末点贴 x=width 边（端点贴边契约）；y 翻转（数据大 → 视觉上）；坐标四舍五入到 0.1。
- **平滑（`buildSparklinePath`）**：`smooth=false` → `M/L` 折线；`smooth=true` → Catmull-Rom 转贝塞尔 `M/C` 段（n-1 段 C，端点切线退化处理）。
- **填充（`buildSparklineArea`）**：`fill=true` 且 ≥2 点 → 折线路径 + 底边闭合的 area path，linearGradient 从 stroke 色 25% 透明度渐变到 0。
- 全部为 `sparkline-path.ts` 纯函数（无 DOM 依赖，可直接单测）。

## 8. 字段分类

- `data`、`width`、`height`、`color`、`fill`、`smooth`、`min`、`max`: `prop`

## 9. regions 与 slot 约定

- 无 regions（纯展示原子）。
- DOM marker：根 `.nop-sparkline` + `data-slot="sparkline-root"`；子 slot：`sparkline-canvas`（正常渲染）、`sparkline-empty`（空占位，无 path/circle）；`data-points` 暴露归一化坐标串、`data-status` 暴露生效方向、`data-smooth`/`data-fill` 暴露开关，供测试/e2e 程序化断言。

## 10. 运行期状态归属

- 数据与配置均来自外部 scope/props（prop 流，in-place 更新，无 key-remount）。
- 无内部交互状态（只读展示控件）。

## 11. 事件、动作与组件句柄能力

- 无事件、无组件句柄（只读表现层）。

## 12. stat-tile 复用约定（Follow-up 裁定）

- **契约边界裁定（plan Phase 1）**：stat-tile 内部 `sparkline` 字段**保持内联实现**（`stat-tile-renderer.tsx` 内 `buildSparklineGeometry`，96×32 布局微调），**不替换为 `<SparklineRenderer>`**——stat-tile 是卡片级组合语义，sparkline 是可独立使用的展示原子，二者维持各自实现。
- 共享的是同一套计算语义：`sparkline-path.ts` 的 `normalizeYDomain`/`buildSparklinePoints`/`buildSparklinePath` 为 stat-tile 与 sparkline 的共同参考实现；stat-tile 后续如需渐变/平滑/显式 Y 域，可直接复用这些纯函数或 `<SparklineRenderer>` 子组件（组合时机由 stat-tile 演进裁定）。

## 13. 数据源、表达式、导入能力接入点

- 数据由 loader / `data-source` 写入 scope，`data` 经 `${expr}` 消费（与 chart/stat-tile 一致）。

## 14. 样式与 DOM marker 约定

- widget renderer（自样式 UI 控件）：SVG 视觉类（strokeWidth/cap/join）属于控件设计，符合 styling-system「widget renderer 自带视觉默认」契约。
- 颜色经主题 CSS 变量表达（§5 映射表），不引入新主题机制、不写死主题色。

## 15. 实现拆分建议

- 数据归一化（`sanitizeSparklineValues`/`resolveSparklineStatus`）、Y 域（`normalizeYDomain`）、坐标映射（`buildSparklinePoints`）、路径构造（`buildSparklinePath`/`buildSparklineArea`）、三态组合（`buildSparklineGeometry`）为纯函数模块 `sparkline-path.ts`；React 组件 `sparkline-renderer.tsx` 只做 props 读取与 DOM 装配。

## 16. 风险、取舍与后续阶段

- 交互增强（hover tooltip、点击联动）不纳入（原子定位，归后续宿主场景评估）。
- 大数据点（>1k）性能优化未做（首版阈值记录，见 Non-Blocking Follow-ups）。
- VTable `cellType: 'sparkline'` 为能力对照不实现绑定（§2 决策表）。
