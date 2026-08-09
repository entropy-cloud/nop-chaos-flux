# map 组件封装计划（OpenLayers）

> Plan Status: completed
> Last Reviewed: 2026-08-10
> Source: `docs/analysis/2026-08-09-bi-control-support-analysis.md` §6（地图封装调研，OpenLayers 主方案）
> Related: `docs/plans/2026-08-09-bi-kpi-filter-chart-enhance-plan.md`（BI 骨架，地图评估占位）、`docs/plans/2026-08-09-pivot-table-vtable-wrapper-plan.md`（独立包封装先例）、`docs/references/new-renderer-introduction-audit.md`

## Purpose

将 OpenLayers v10（官方 TS、ES modules、MIT 协议）封装为 nop-chaos-flux 的 `map` renderer：独立包 `@nop-chaos/flux-renderers-map`，双模式（`region` 区域着色 + `pin` 点位聚合），懒加载按需导入，schema 驱动，geojson 资源自管，主题映射 CSS 变量，产出 design.md + example.json 并通过 INV-1~5 审计。

## Current Baseline

已核实（2026-08-09 live repo + 调研）：

- flux 无地图控件；`chart`（recharts）无地图能力；BI 骨架计划 Phase 5 预留「地图独立评估」占位。
- 分析报告 §6 已裁定：**OpenLayers v10 主方案**（月更活跃 v10.10.0、官方 TS、ES modules、cluster/矢量瓦片内置、Grafana geomap 生产先例）；leaflet（维护模式）备选；ECharts geo 仅"纯统计无底图"备选；deck.gl 不推荐。
- 独立包先例 `@nop-chaos/flux-renderers-graph`：package.json（sideEffects css、build/typecheck/test/lint scripts）、`src/index.ts` 导出 `registerGraphRenderers`、vite.workspace-alias.ts（含 `*/styles.css`）、根 tsconfig.json project references。
- 懒加载先例：`data-renderer-definitions.ts` 的 `createLazyRendererComponent`（chart 用）；Metabase `MapRenderer.tsx` 懒加载做法。
- `RendererDefinition` 注册模式（type/displayName/category/sourcePackage/component/propContracts/componentCapabilityContracts/schemaValidator）。
- 主题体系：CSS 变量 + Tailwind design token（theme-compatibility.md），无 React ThemeProvider。
- OpenLayers v10 ES modules：`ol/Map`、`ol/layer/Tile`、`ol/source/XYZ`、`ol/layer/Vector`、`ol/source/GeoJSON`、`ol/source/Cluster`、`ol/Feature`、`ol/style/*`（渲染期模块化按需导入）。

## Goals

- 新建 `@nop-chaos/flux-renderers-map`，`type: 'map'`，双模式：`region`（GeoJSON 层区域着色，choropleth）+ `pin`（点位 + OL 内置 cluster 聚合）。
- schema：`basemap`（瓦片源 url/type/attribution）、`regionData`/`pinData`、`cluster`、`zoom`/`center`、`visualMap` 色阶、`empty`/`height`、`onClick` 事件。
- geojson 资源自管：内建 `map-data` 数据模块（`flux-renderers-map` 包内 `src/map-data/*.json` 静态 JSON：中国/世界省市 geojson，随 lazy chunk 加载，**不另立 workspace 包**）+ **`geojsonSource?: ActionSchema` 经 flux action 加载**（对齐 table `childrenSource` 先例：`helpers.dispatch` → 校验 → 缓存复用；不自建 fetch）。
- 懒加载：OL 模块动态导入（renderer 组件 lazy + OL 内部按需 import），不进初始 bundle。
- 主题映射：CSS 变量 → OL 样式（区域填充/边框/高亮/点位色）。
- 内部 state（map 实例、图层、selection）renderer-local（INV-4）；key 经 RendererEnv 注入（INV-2 边界内）。
- `docs/components/map/design.md` + example.json + playground 示例 + INV-1~5 审计 + daily log。

## Non-Goals

- 轨迹动画/实时定位、绘制编辑（draw/edit 交互）、测距——OL 能力存在但超出 BI 控件定位，后续评估。
- 字段级地图（坐标字段展示，nocobase 参考）——follow-up。
- deck.gl/MapLibre 复杂图层（点聚合除外，OL 内置 cluster 覆盖）、leaflet 插件生态接入。
- 地图服务（瓦片托管/key 管理）——应用层。

## Scope

### In Scope

- 包骨架 + `MapSchema` + 注册（`registerMapRenderers`）+ 别名/tsconfig。
- 数据管线纯函数（failing-first）：regionData → GeoJSON Feature、pinData → Feature + cluster 配置、色阶计算（visualMap）、坐标/缩放归一化。
- renderer：懒加载 OL 模块、地图实例生命周期（创建/更新/销毁）、图层管理（basemap/vector/cluster）、事件桥接（单点/区域点击 → flux action）、主题映射、loading/empty 态。
- geojson 资源：`map-data` 数据模块（包内 `src/map-data/*.json` 静态 JSON：中国省市 + world，不另立 workspace 包）或 **`geojsonSource` action 加载**（`helpers.dispatch` → FeatureCollection 校验 → 缓存复用，对齐 `useTableLazyChildren` loading/error/成功三态模式；scope 含参数）。
- playground 示例 + design.md + example.json + INV audit + daily log。

### Out Of Scope

- 绘制/编辑/测距/轨迹/热力图层（首版）。
- 字段级地图、地图服务与瓦片托管。
- deck.gl/leaflet 集成。

## Failure Paths

| 场景                 | 触发                                                   | 行为                                                                             | 可重试                | 用户可见表现         |
| -------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- | --------------------- | -------------------- |
| map-empty-data       | regionData/pinData 为空或非法                          | 渲染 `empty` slot，不创建地图实例                                                | 是                    | 空态提示，无报错     |
| map-basemap-fail     | 瓦片源不可达（网络/key 无效）                          | 瓦片加载失败不影响矢量层；dev warn                                               | 是                    | 矢量层正常，底图空白 |
| map-geojson-invalid  | `geojsonSource` action 失败 / 返回非 FeatureCollection | 降级：该层不渲染 + 错误提示（对齐 childrenSource error 态）；全部失败 → empty 态 | 是（重试触发 action） | 无该图层 + 错误提示  |
| map-ol-import-fail   | OL 模块动态导入失败                                    | 错误占位 + console.error（不白屏）                                               | 是                    | 错误占位             |
| map-click-no-feature | 点击空白区域                                           | 不派发事件（仅 feature 命中时派发）                                              | 是                    | 无响应（正常）       |
| map-cluster-empty    | 单点无聚合需要                                         | cluster 自动退化为普通点位渲染                                                   | 是                    | 点位正常显示         |

## Test Strategy

本档选择：`必须自动化`

数据管线纯函数（region→GeoJSON Feature/点位→cluster 配置/色阶）与事件桥接是 renderer 核心契约，failing-first 单测；OL 为 DOM/Canvas 渲染，renderer 行为以 mock `ol/*` 模块验证（chart mock recharts、pivot mock VTable 同款先例）；坐标解析（点击 → feature）抽纯函数直测。

## Execution Plan

### Phase 1 - 包骨架与 schema 定义

Status: completed
Targets: `packages/flux-renderers-map/`（新）、`vite.workspace-alias.ts`、根 `tsconfig.json`

- Item Types: `Fix | Decision | Proof`

- [x] (Decision) 裁定 `MapSchema`（依据分析报告 §6.3 + **数据加载走 flux 内置 action 机制**——对齐 table 树表懒加载 `childrenSource` 先例，`helpers.dispatch(actionInput, { scope })` 经 RendererEnv 执行，INV-1/INV-3 合规，不自建 fetch）：
  - `mapType: 'pin' | 'region'`（双模式，对齐 Metabase 语义）
  - `basemap?: { url: string; attribution?: string; type?: 'xyz' | 'wms' }`（瓦片源：缺省 OSM xyz；中国场景可配天地图/高德 url，key 含于 url 或经 RendererEnv 注入）
  - `regionData?: SchemaValue`（`[{ name: '北京', value: 123 }]`，scope/data-source 表达式求值）
  - `geojsonSource?: ActionSchema`（**action 加载边界数据**，对齐 `childrenSource`：`helpers.dispatch` → 结果校验（FeatureCollection）→ 缓存复用；与内建数据包二选一）
  - `pinData?: SchemaValue`（`[{ name, lat, lng, value? }]`，表达式求值）+ `cluster?: boolean`（OL 内置 Cluster 源）
  - `visualMap?: { min?; max?; colors?: string[]; defaultColor?: string }`（色阶）
  - `center?`/`zoom?`、`height`、`empty`（value-or-region）、`loading?`
  - 事件：`onClick`（payload `{ name, value, feature }`）
  - `map-data` 内建资源落位裁定：**包内 `src/map-data/*.json` 静态 JSON 模块**（随 lazy chunk 加载；不另立 workspace 包——Phase 1 仅注册 `flux-renderers-map` 一个包）
- [x] (Fix) 包骨架（graph 模板）：package.json（依赖 `ol` `^10.10.0` + flux-core/i18n/react/ui workspace + peer react）、tsconfig/tsconfig.build.json、vitest.config.ts（`createSharedVitestConfig`，INV 审计 checklist G 硬项）、src/index.ts（`registerMapRenderers`）、styles.css。
- [x] (Fix) 注册：vite.workspace-alias.ts（包 + styles.css alias）、根 tsconfig.json references。
- [x] (Proof) 包级空转：`pnpm --filter @nop-chaos/flux-renderers-map typecheck` 通过。

Exit Criteria:

- [x] 新包 workspace 可见，包级 typecheck 通过；`MapSchema` 与裁定一致。

### Phase 2 - 数据管线纯函数

Status: completed
Targets: `packages/flux-renderers-map/src/map-data.ts`、`map-data.test.ts`、`map-color.ts`

- Item Types: `Proof | Fix`

- [x] (Proof) 先写 failing 单测：
  - `sanitizeGeojsonActionResult(data)`：`geojsonSource` action 结果校验（FeatureCollection 结构 / `features` 数组），非法 → error 态（对齐 `sanitizeChildren` 三态模式）
  - `buildRegionFeatures(regionData, geojson)`：region 值映射到 geojson feature（name 匹配、缺失值默认色、无匹配 feature 丢弃 + dev warn）
  - `buildPinFeatures(pinData)`：lat/lng 合法校验、非法坐标丢弃 + dev warn；cluster 配置生成
  - `buildColorScale(visualMap)`：色阶插值（min/max/colors，数据外插 clamp）、缺省 defaultColor
  - `resolveClickFeature(map, coordinate)` 的纯函数部分：坐标 → feature 属性解析契约
- [x] (Fix) 实现 `map-data.ts`/`map-color.ts` 纯函数（无 ol DOM 依赖，任意环境可测）。
- [x] (Fix) 实现 `use-map-geojson.ts`：`geojsonSource` action 加载 hook（`helpers.dispatch(actionInput, { scope })` → sanitize → 缓存复用 + loading/error 态），对齐 `use-table-lazy-children.ts` 模式（含 in-flight 去重与卸载守卫）。

Exit Criteria:

- [x] 数据管线单测全绿（含非法数据降级路径）。

### Phase 3 - renderer 封装（懒加载 + 生命周期 + 事件桥接）

Status: completed
Targets: `packages/flux-renderers-map/src/map-renderer.tsx`、`map-renderer.test.tsx`、`map-layer-manager.ts`、`map-renderer-definitions.ts`

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] (Decision) 裁定懒加载粒度：renderer 组件 `createLazyRendererComponent`（与 chart 一致）+ 组件内 `await import('ol/Map')`/`ol/layer/Tile` 等按需模块（OL ES modules tree-shaking，不进初始 bundle）。
- [x] (Proof) 先写 failing 测试（mock `ol/*`）：
  - 挂载：Map 实例以正确 view/图层创建；basemap Tile 层 + region Vector(GeoJSON) 层或 pin Cluster 层装配
  - 更新：`regionData`/`pinData`/`visualMap`/`center`/`zoom` 变化 → 对应层/视图更新（无 remount，DD2 契约）
  - 卸载：`map.dispose()`（或 setTarget(null) + 资源释放）被调用
  - 事件：单点/区域点击 → `onClick` 派发（命中 feature 才派发，Failure Path map-click-no-feature）
  - 空数据：不创建 Map，渲染 empty slot
- [x] (Fix) 实现 `MapRenderer`（`RendererComponentProps<MapSchema>`）：
  - 实例生命周期 + `map-layer-manager.ts`（图层装配/更新/销毁）
  - **数据接入全部经 flux 机制**：regionData/pinData 经 `helpers.evaluate`（scope 表达式）；geojson 经 `use-map-geojson`（action dispatch，RendererEnv 执行）——无自定义 IO
  - 主题映射：CSS 变量（背景/边框/文字/主题色）→ OL style 函数（区域填充/边框/高亮/点位色）；缺失回退默认（Failure Path 无）
  - loading/empty 态（含 geojson action loading/error 态）；`map-ol-import-fail` 错误占位
  - 内部 state（map 实例/图层引用/geojson 缓存）renderer-local（INV-4），不进 scope
- [x] (Fix) `map-renderer-definitions.ts`：type `map`、category `data`、sourcePackage、propContracts（mapType/basemap/regionData/pinData/cluster/visualMap/center/zoom/height/empty 等）、schemaValidator（mapType/cluster 类型校验，非法 dev warn 不抛错）。
- [x] (Follow-up) 记录后续候选：热力图层（ol/source/Heatmap）、draw/编辑、字段级地图。

Exit Criteria:

- [x] `map-renderer.test.tsx` 全绿（mock OL：挂载/更新/卸载/事件/空态/降级）。
- [x] 无直接 store 访问；实例与交互 state 均在 renderer 内部。

### Phase 4 - 集成、示例与文档

Status: completed
Targets: `apps/playground/src/`、`docs/components/map/design.md`、`docs/components/map/example.json`、`docs/analysis/2026-08-09-bi-control-support-analysis.md`、`docs/logs/2026/08-10.md`

- Item Types: `Fix | Proof`

- [x] (Fix) playground host 接线：`apps/playground/package.json` 加 `@nop-chaos/flux-renderers-map` workspace 依赖、`src/App.tsx` 调 `registerMapRenderers(registry)`、`src/styles.css` 加 `@import '@nop-chaos/flux-renderers-map/styles.css'`（INV 审计 checklist G 硬项）。
- [x] (Fix) playground 新增 map 示例页：region 模式（中国省市销售着色，内建 geojson）+ pin 模式（门店点位 cluster）+ 自定义 geojson（`geojsonSource` action 加载）+ 空态。
- [x] (Proof) 示例走查：双模式渲染、缩放/平移、点位聚合、区域点击事件、主题切换（明暗）、数据更新不闪屏、空态。
- [x] (Fix) `docs/components/map/design.md`（schema 字段表/双模式说明/geojson 资源管理——内建数据模块 + `geojsonSource` action/主题映射/事件契约/Non-Goals）+ `example.json`。
- [x] (Fix) 更新分析报告 §6.4（地图已落地标注）+ daily log。
- [x] (Fix) INV-1~5 审计：无新 IO 类型（边界 geojson 经 `geojsonSource` action → env.fetcher；basemap 瓦片网络加载属 OL 库内部渲染管线，渲染器代码不直调 `fetch`/`XMLHttpRequest`；key/瓦片 url 经 schema + RendererEnv 注入，无硬编码）；内部 state 本地化（INV-4）；`RendererComponentProps` 契约（INV-5）。
- [x] (Proof) `pnpm check` 新增包无违规（workspace-manifest-deps / oversized 等静态检查为硬门禁，不可降级为 follow-up）。

Exit Criteria:

- [x] playground 示例可运行（手测清单全过）；design.md + example.json 与 live 行为一致。
- [x] INV 审计无遗留；分析报告与 daily log 同步。

## Draft Review Record

> 独立子 agent（fresh session，mission-driver 2026-08-09-182611）review 完成；零 Blocker/Major 遗留，升为 `active`。

- Reviewer / Agent: mission-driver review（fresh session）
- Verdict: `pass`
- Rounds: 1
- Findings addressed:
  - Major: `map-data` 内建资源落位未指定 → 裁定包内 `src/map-data/*.json` 静态 JSON，不另立 workspace 包（Goals / Scope / Phase 1 Decision 同步）。
  - Major: 新包骨架缺 `vitest.config.ts`（INV 审计 checklist G 硬项）→ 补入 Phase 1 (Fix)。
  - Major: playground host 接线（package.json dep / App.tsx `registerMapRenderers` / styles.css `@import`）未显式列为执行项 → Phase 4 新增 (Fix) 项。
  - Major: `pnpm check` 属仓库硬门禁被标为 Follow-up（违反 Minimum Rule 13）→ 改为 (Proof)。
  - Minor: Phase 4 INV-2 表述收紧（basemap 瓦片 IO 归 OL 库内部渲染管线，渲染器不直调 fetch；key 经 RendererEnv）。

## Closure Gates

- [x] 数据管线 + renderer 生命周期 + 事件桥接 focused 单测全绿（含降级路径）。
- [x] playground map 示例（region/pin/cluster/自定义 geojson/主题/数据更新）手测通过。
- [x] `docs/components/map/design.md` + example.json 与 live baseline 一致。
- [x] INV-1~5 审计通过。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 行为缺口。
- [x] 受影响的 owner docs 已同步（分析报告 §6.4、daily log）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### 热力图层 / 绘制编辑 / 轨迹动画

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: OL 具备能力但超出 BI 控件首版定位；BI 主场景（区域着色 + 点位聚合）不依赖。
- Successor Required: `no`

### 字段级地图（坐标字段展示）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 属表单/详情域能力（nocobase 参考），与 BI 图表级 map 解耦，后续独立评估。
- Successor Required: `no`

## Non-Blocking Follow-ups

- leaflet 备选路径的对比记录（分析报告 §6.2 已载，若插件生态场景出现再评估）。
- `map-data` 数据包与 nop-app 行政区划数据源对齐（应用层接入时）。
- OL 版本升级策略（锁定 `^10.10.0`，minor 更新复核）。

## Closure

Status Note: 独立子 agent closure-audit pass（approved，fresh session，2026-08-10）——live repo 复核：`@nop-chaos/flux-renderers-map` 全 4 Phase 落地（包骨架/数据管线/renderer/集成），52 单测全绿（map-data 15 + map-color 10 + map-renderer 27），e2e `map-demo` smoke pass（canvas 真实渲染 + 空态卡），playground host 接线齐备，design.md + example.json 与 live 代码一致（payload 含 `type: 'map:feature-click'`/`mapType`/`name`/`value`/`feature`），INV-1~5 审计无遗留（渲染器无直调 fetch/XMLHttpRequest，`check:audit-renderer-browser-io` 零命中），deferred 分类诚实（全部 out-of-scope improvement 附理由），`pnpm typecheck/build/lint/test` 36/36 全绿，`pnpm check` 仅既有登记 red（audit-event-dispatch-ctx 6 条 industrial，HEAD 预存与本计划无关）。

Closure Audit Evidence:

- Auditor / Agent: mission-driver CLOSURE_VERIFY（独立 fresh session，2026-08-10）
- Evidence: closure-audit 复核（2026-08-10）：① live repo 逐文件核对 `packages/flux-renderers-map/src/`（index.ts `registerMapRenderers` → `registerRendererDefinitions`、schemas.ts、map-data.ts `buildFeatureClickPayload`/`sanitizeGeojsonActionResult`、map-color.ts `buildColorScale`、use-map-geojson.ts、map-layer-manager.ts、map-renderer.tsx、map-ol-loader.ts 18 处动态 import、map-renderer-definitions.ts `createLazyRendererComponent` + `validateMapSchema` + propContracts）与 plan 各 Phase 声明一致；② 数据管线 25 例 + renderer mock OL 52 例 fresh 复跑全绿（`pnpm --filter @nop-chaos/flux-renderers-map test`）；③ e2e `playground-entry-pages.spec.ts` `map-demo` fresh 复跑 pass（`[data-slot="map"]` + `.ol-viewport` + canvas + 空态卡，programmatic 断言）；④ 全量门禁 fresh：`pnpm typecheck`/`build`/`lint`/`test` 36/36（65 tasks）全绿；`pnpm check` 失败仅 = 既有登记 red（`check:audit-event-dispatch-ctx` 6 条 industrial，`git diff HEAD -- packages/flux-renderers-industrial` 零改动证 pre-existing；oversized 2 exempt locale）——零新增未登记 red；⑤ INV 审计：渲染器 src 无 `fetch`/`XMLHttpRequest`/`WebSocket` 直调（grep + `check:audit-renderer-browser-io` 零命中），state 全 renderer-local，geojson 经 action → RendererEnv；⑥ 五处一致性核对：Plan Status completed / 4 Phase Status completed / 各 Phase Exit Criteria 全 `[x]` / Closure Gates 12/12 `[x]` / `docs/logs/2026/08-10.md` 收口记录一致；⑦ deferred 分类诚实（热力/绘制/轨迹 + 字段级地图 = out-of-scope improvement 附 Why Not Blocking Closure；follow-up 全 non-blocking 治理项）。

Follow-up:

- leaflet 备选路径对比（分析报告 §6.2 已载，插件生态场景出现时再评估）。
- `map-data` 数据包与 nop-app 行政区划数据源对齐（应用层接入时）。
- OL 版本升级策略（锁定 `^10.10.0`，minor 更新复核）。
- 热力图层（`ol/source/Heatmap`）/绘制编辑/字段级地图：OL 能力存在，超出首版定位，后续独立评估。
- 除上述外无剩余 plan-owned work。
