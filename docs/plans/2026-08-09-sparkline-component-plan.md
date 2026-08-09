# sparkline 原子组件计划

> Plan Status: active
> Last Reviewed: 2026-08-09
> Source: `docs/analysis/2026-08-09-bi-control-support-analysis.md`（KPI 层缺口）、`docs/plans/2026-08-09-bi-kpi-filter-chart-enhance-plan.md`（Phase 1 sparkline 路径裁定承接）
> Related: `docs/plans/2026-08-09-pivot-table-vtable-wrapper-plan.md`（VTable cellType sparkline 对照）、`docs/plans/2026-08-09-map-openlayers-wrapper-plan.md`（独立包 vs 包内组件裁定先例）

## Purpose

新增 `sparkline` 原子组件（type: `sparkline`，落 `flux-renderers-data`）：自绘 SVG polyline 迷你趋势图（无新依赖），作为 stat-tile 内部 sparkline 字段的复用基座，并可独立用于表格单元格/卡片等场景。承接 stat-tile 计划 Phase 1 的「sparkline 实现路径」裁定项。

## Current Baseline

已核实（2026-08-09 live repo）：

- flux 无 sparkline 组件；`chart`（recharts）缩至 40px 高度可近似但配置繁琐（stat-tile 裁定表已记录）；`statistics` 仅总条数。
- `flux-renderers-data` 既有注册模式：`dataRendererDefinitions`（type/displayName/category/sourcePackage/component/schemaValidator），chart 经 `createLazyRendererComponent` 懒加载。
- stat-tile 计划（`2026-08-09-bi-kpi-filter-chart-enhance-plan.md` Phase 1）已预留 sparkline 字段（`number[]` 或 `dataRegionKey`）与路径裁定项——本计划裁定并落地，stat-tile 复用。
- VTable `cellType: 'sparkline'`（透视表指标迷你图）为能力对照（`~/sources/vtable`）。

## Goals

- `sparkline` 组件：SVG polyline 渲染（自绘、零新增依赖），schema：`data`、`width`/`height`、`color`（支持 `status` 语义与 CSS 变量）、`fill`（渐变填充开关）、`smooth`（平滑曲线）、`min`/`max`（Y 域）。
- 核心逻辑（SVG path 生成、Y 域归一化）抽纯函数，failing-first 单测（无 DOM 依赖可直测）。
- 注册进 `dataRendererDefinitions`（type `sparkline`，category `data`）；stat-tile 计划落地时复用本组件（接口约定写入 design.md）。
- `docs/components/sparkline/design.md` + example.json + playground 示例 + daily log。

## Non-Goals

- 交互（tooltip/点击/缩放）——纯展示原子；交互形态（如迷你图点击）后续按需评估。
- 动画、虚线、多序列对比等视觉复杂度（多序列可用两个 sparkline 叠加，不内置；渐变填充仅按 `fill` 开关支持，见 Goals）。
- 重绘性能优化（首版面向 ≤1k 数据点）。

## Scope

### In Scope

- `SparklineSchema` + SVG path 纯函数（`buildSparklinePath`/`normalizeYDomain`）+ 组件 + 注册。
- 空数据/单点/等值数据降级；`status` 颜色语义；CSS 变量主题接入。
- design.md + example.json + playground 示例 + stat-tile 复用约定。

### Out Of Scope

- 交互事件、动画、多序列、VTable 集成（对照参考，不实现）。

## Failure Paths

| 场景                    | 触发                        | 行为                                              | 可重试 | 用户可见表现   |
| ----------------------- | --------------------------- | ------------------------------------------------- | ------ | -------------- |
| sparkline-empty         | `data` 为空/非数组/全非法值 | 不渲染 polyline，渲染空占位（不抛错）             | 是     | 空白迷你图区域 |
| sparkline-single-point  | 仅 1 个数据点               | 渲染圆点标记（无线段）                            | 是     | 单点显示       |
| sparkline-flat          | 全部数据相等（Y 域零跨度）  | Y 域回退 [value-1, value+1]（避免除零），中线渲染 | 是     | 水平线         |
| sparkline-invalid-point | 数据含 null/NaN             | 非法点过滤 + dev warn，剩余点渲染                 | 是     | 有效点趋势线   |

## Test Strategy

本档选择：`必须自动化`

SVG path 生成与 Y 域归一化是组件核心契约（stat-tile 与未来表格单元格复用依赖其正确性），failing-first 纯函数单测；组件渲染层经 jsdom 断言 SVG 结构（path `d` 属性与纯函数输出一致）。

## Execution Plan

### Phase 1 - schema、纯函数与组件

Status: planned
Targets: `packages/flux-renderers-data/src/sparkline-schemas.ts`、`sparkline-path.ts`、`sparkline-path.test.ts`、`sparkline-renderer.tsx`、`sparkline-renderer.test.tsx`、`data-renderer-definitions.ts`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [ ] (Decision) 裁定 `SparklineSchema`：
  - `data?: SchemaValue`（`number[]`，支持表达式求值）
  - `width?`/`height?`（缺省 120×32，sparkline 语义尺寸）
  - `color?: string | { status: 'up' | 'down' | 'neutral' }`（静态色或按趋势语义取 CSS 变量：涨/跌/中性）
  - `fill?: boolean`（折线下方渐变填充，缺省 false）、`smooth?: boolean`（贝塞尔平滑，缺省 false）
  - `min?`/`max?`（显式 Y 域；缺省数据极值）
  - 裁定 `status` 计算语义：`up`/`down` 由首尾值比较（尾 > 首 = up），显式 `status` 优先
- [ ] (Proof) 先写 failing 单测（纯函数）：
  - `buildSparklinePath(points, w, h, smooth)`：折线/平滑路径坐标正确性（端点贴边、坐标映射）
  - `normalizeYDomain(values, min?, max?)`：极值、显式域、零跨度回退、非法值过滤
  - 空数据/单点/全等值降级路径（Failure Paths 逐条断言）
- [ ] (Fix) 实现 `sparkline-path.ts`（纯函数）+ `sparkline-renderer.tsx`（`RendererComponentProps`，SVG 渲染，data 经 `helpers.evaluate`，`color.status` → CSS 变量，fill 渐变 `defs`）——**数据经 props/scope，无 IO**（INV-1 合规）。
- [ ] (Fix) 注册进 `dataRendererDefinitions`：type `sparkline`、category `data`、sourcePackage、schemaValidator（data 非数组时 dev warn 不抛错）。
- [ ] (Proof) 渲染层测试（jsdom）：SVG `path.d` 与纯函数输出一致；`status` 颜色类正确；空数据渲染占位。
- [ ] (Follow-up) 裁定 stat-tile 复用契约边界：`sparkline` 字段可复用 `<SparklineRenderer>` 子组件或内联复用 path 纯函数（最终组合由 stat-tile 计划执行时裁定）——以代码注释 + daily log 记录；design.md 正式声明归 Phase 2。

Exit Criteria:

- [ ] 纯函数 + 渲染层单测全绿（含 4 条 Failure Paths 断言）。
- [ ] `sparkline` 注册进 dataRendererDefinitions，包级 typecheck 通过。

### Phase 2 - 文档、示例与 stat-tile 集成约定

Status: planned
Targets: `docs/components/sparkline/design.md`、`docs/components/sparkline/example.json`、`apps/playground/src/`（示例）、`docs/logs/2026/08-09.md`

- Item Types: `Fix | Follow-up`

- [ ] (Fix) `docs/components/sparkline/design.md`：schema 字段表、Y 域/平滑/填充语义、`status` 颜色契约（CSS 变量映射表）、Failure Paths、stat-tile 复用约定（组件或纯函数接口）、Non-Goals。
- [ ] (Fix) `docs/components/sparkline/example.json`：销售趋势 sparkline（含 fill/smooth/status 变体）+ 空数据示例。
- [ ] (Fix) playground 新增 sparkline 示例（独立展示 + 示意 stat-tile 组合位）。
- [ ] (Fix) daily log 记录。
- [ ] (Follow-up) 标注 stat-tile 计划（`2026-08-09-bi-kpi-filter-chart-enhance-plan.md` Phase 1）的「sparkline 路径裁定」由本计划承接（自绘 SVG 原子组件），stat-tile 执行时引用 `sparkline` 组件。

Exit Criteria:

- [ ] design.md + example.json 与 live 行为一致（字段逐一对应对照）。
- [ ] playground 示例可运行；daily log 已记录。

## Draft Review Record

- Reviewer / Agent: 独立 review sub-agent（mission-driver 2026-08-09-182611 审查轮）
- Verdict: `pass`
- Rounds: 1
- Findings addressed:
  - (Major) Phase 1 `(Follow-up)` stat-tile 复用约定条目原引用 Phase 2 才产出的 design.md，存在前向依赖、Phase 1 无法自足完成——已改写为 Phase 1 内可完成（契约边界裁定 + 代码注释/daily log 记录），design.md 正式声明归 Phase 2（该 Phase design.md 条目已含此项）。
  - (Minor) Non-Goals 原表述「动画、面积渐变之外的视觉复杂度」歧义（可误读为动画在 scope 内）——已改写为明确枚举（动画/虚线/多序列对比出 scope，渐变仅按 `fill` 开关支持）。

## Closure Gates

- [ ] SVG path 纯函数 + 渲染层 focused 单测全绿（含降级路径）。
- [ ] playground sparkline 示例手测通过（独立 + stat-tile 组合位示意）。
- [ ] `docs/components/sparkline/design.md` + example.json 与 live baseline 一致。
- [ ] stat-tile 计划承接标注已同步（无重复路径裁定）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope 行为缺口。
- [ ] 受影响的 owner docs 已同步（分析报告 KPI 层、daily log）。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`

## Deferred But Adjudicated

### sparkline 交互（tooltip/点击/缩放）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 原子组件定位纯展示；交互形态（迷你图点击联动）依赖具体宿主场景，出现真实需求再评估。
- Successor Required: `no`

### 多序列对比 / 虚线 / 动画

- Classification: `optimization candidate`
- Why Not Blocking Closure: 首版面向单序列 KPI/表格场景；多序列可用多个 sparkline 组合表达，非原子组件职责。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 大数据点（>1k）性能优化（首版未做，记录阈值）。
- VTable `cellType: 'sparkline'` 能力对照记录（透视表内嵌迷你图场景，若 pivot 计划落地后需要再评估桥接）。

## Closure

Status Note: 待执行完成后填写

Closure Audit Evidence:

- Auditor / Agent: 待定
- Evidence: 待定

Follow-up:

- 待定
