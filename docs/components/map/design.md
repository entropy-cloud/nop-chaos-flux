# Map 组件设计（OpenLayers）

> 状态：implemented（renderer 已落地于 `@nop-chaos/flux-renderers-map`，2026-08-10；plan `docs/plans/2026-08-09-map-openlayers-wrapper-plan.md`）
> 来源调研：`docs/analysis/2026-08-09-bi-control-support-analysis.md` §6（地图封装调研，OpenLayers 主方案）
> 包先例：`@nop-chaos/flux-renderers-graph`（独立包 + 懒加载）、`@nop-chaos/flux-renderers-data`（chart lazy renderer）

## 1. 组件定位

- `map` 是 **BI 地图渲染器**：把区域/点位数据叠加在瓦片底图上，提供区域着色（choropleth）与点位聚合（cluster）两种模式。
- 典型场景：区域销售分布（中国/世界省市着色）、门店点位分布（聚合展示）、地域 KPI 钻取联动。
- 底层 **OpenLayers v10**（官方 TS、ES modules、MIT；Grafana geomap 面板同款生产先例）；双模式语义对齐 Metabase `MapRenderer` 的 `region` / `pin`。
- **懒加载**：renderer 组件经 `createLazyRendererComponent` 懒加载（chart 同款）；OL 模块在组件内部 `await import('ol/Map')` 等按需加载（不进初始 bundle，也不进 map chunk 之外的部分）。
- 数据接入全部经 flux 机制：`regionData`/`pinData` 为 scope/data-source 表达式求值；边界数据（geojson）经内建数据模块（包内静态 JSON）或 **`geojsonSource` action 加载**（`helpers.dispatch` → RendererEnv 执行，对齐 table `childrenSource` 先例）——**渲染器代码不直调 `fetch`/`XMLHttpRequest`**（INV-1）。

## 2. 与 AMIS 或既有产品的能力对照

AMIS 无地图组件。参考：Metabase（leaflet + region/pin 双模式 + 懒加载）、Grafana geomap（OpenLayers）、ECharts geo（无瓦片底图）。

### Flux 决策表

> Flux 决策主语。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                                  | 采纳     | 不采纳 | 理由                                                                                                                                                                           |
| ----------------------------------------------------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 区域着色（region / choropleth）                       | **实现** | —      | 核心模式一。`regionData` 按 `name` 匹配 geojson feature `properties.name`，`visualMap` 色阶着色。                                                                              |
| 点位聚合（pin / cluster）                             | **实现** | —      | 核心模式二。OL 内置 Cluster 源（distance 40）；多点聚合点击放大一级，单点（含单成员 cluster）派发 `onClick`。                                                                  |
| 瓦片底图（xyz/wms）                                   | **实现** | —      | 缺省 OSM xyz；`basemap.url` 可配天地图/高德/自建瓦片（key 含于 url 或经 RendererEnv 注入，**无硬编码**）。底图加载失败不影响矢量层（dev warn）。                               |
| geojson 资源自管                                      | **实现** | —      | 内建 `src/map-data/*.json`（中国省市 / 世界国家，随 lazy chunk 加载）+ **`geojsonSource` action**（自定义边界，校验失败 → 错误态 + 重试）。不另立 workspace 数据包。           |
| 主题映射（明暗切换）                                  | **实现** | —      | CSS 变量 → OL style 色值（`resolveThemeColor` 探针解析）；`MutationObserver` 监听 root class（`.dark`）→ `manager.setTheme` → 重绘。canvas 无 CSS 变量自动生效，需显式重解析。 |
| 点击事件（区域/点位）                                 | **实现** | —      | `onClick` payload `{ type: 'map:feature-click', mapType, name, value, feature }`；仅命中 feature 才派发（空白点击不派发）。                                                    |
| 区域高亮（hover）                                     | **实现** | —      | pointermove → `setHighlight` → 填充色/边框切换。                                                                                                                               |
| 空态 / loading / 错误态                               | **实现** | —      | 空数据 → `empty` slot（不创建 Map）；外部 `loading` + geojson action loading → loading slot；OL 导入失败 / geojson action 失败 → 错误占位（不白屏）。                          |
| 绘制/编辑（draw/edit 交互）、测距、轨迹动画、热力图层 | —        | 不采纳 | OL 能力存在但超出 BI 控件首版定位；热力图层（`ol/source/Heatmap`）记入 follow-up。                                                                                             |
| 字段级地图（坐标字段展示，nocobase 参考）             | —        | 不采纳 | 表单/详情域能力，与 BI 图表级 map 解耦，后续独立评估。                                                                                                                         |
| deck.gl / MapLibre / leaflet 插件生态                 | —        | 不采纳 | 复杂图层需求出现时独立评估（分析报告 §6.2）。                                                                                                                                  |
| 地图服务（瓦片托管/key 管理）                         | —        | 不采纳 | 应用层职责（key 经 schema + RendererEnv 注入）。                                                                                                                               |

### 2.1 关键裁定（实现依据）

1. **边界数据双通道**：内建数据（`geojsonName: 'china-provinces' | 'world-countries'`，静态 JSON 随 lazy chunk）与 `geojsonSource` action（经 RendererEnv 执行，结果 `sanitizeGeojsonActionResult` 校验 FeatureCollection，非法 → error 态；成功结果按 action 序列化 + scope id 缓存复用）。两者并存时 `geojsonSource` 优先。
2. **无 remount 契约（DD2）**：地图实例只在「olApi 就绪 + 数据可见」时创建一次；`regionData`/`pinData`/`visualMap`/cluster 变化 → layer manager 原地更新 source/style；`center`/`zoom` 变化 → 视图同步 effect；主题变化 → `setTheme` + 重绘。任何数据更新不重建 Map。
3. **事件桥接**：`singleclick` → `forEachFeatureAtPixel` 命中检测 → `buildFeatureClickPayload`（纯函数：properties.name → NAME → feature.id 解析）→ `props.events.onClick(payload, { event, evaluationBindings, scope })`（CX-10 契约，action 模板可读 `${event.name}`）。多成员 cluster 点击 = 放大一级（不派发）。
4. **内部 state 全部 renderer-local（INV-4）**：map 实例、图层引用、highlight、geojson 缓存均在组件内部/模块内部，不进 scope；不注册 component handle（首版无命令式控制需求）。
5. **畸形数据硬契约**：regionData 无匹配 feature / pin 坐标非法 → 丢弃 + dev warn（不抛错）；全部无匹配 → empty 态；`mapType`/`cluster`/`geojsonName`/`height` 非法值 → schemaValidator warning（不阻断编译）。

## 3. Flux 中的 renderer/type 定义

- `type: 'map'`
- `category: 'data'`
- source package: **`@nop-chaos/flux-renderers-map`（已落地，2026-08-10）**
  - 理由：OL 依赖隔离（`ol` ^10.10.0，~55KB 单独 lazy chunk）+ 内建 geojson 数据（~1.4MB 随 map chunk 加载），放进通用包会污染初始 bundle（chart 的 recharts 先例）。
- 注册：`registerMapRenderers(registry)`（playground host 已接线，INV audit checklist G）。
- 主要 region: `empty`（value-or-region）
- 事件：`onClick`

## 4. schema 设计

### 4.1 schema 字段表

```ts
interface MapSchema extends BaseSchema {
  type: 'map';
  mapType?: 'pin' | 'region'; // 缺省 pin
  basemap?: { url?: string; attribution?: string; type?: 'xyz' | 'wms' }; // 缺省 OSM xyz
  regionData?: SchemaValue; // [{ name, value? }]，表达式求值
  geojsonName?: 'china-provinces' | 'world-countries'; // 缺省 china-provinces
  geojsonSource?: ActionSchema; // 自定义边界 action（优先于 geojsonName）
  pinData?: SchemaValue; // [{ name?, lat, lng, value? }]，表达式求值
  cluster?: boolean; // 缺省 true
  visualMap?: { min?: number; max?: number; colors?: string[]; defaultColor?: string };
  center?: number[]; // [lng, lat]
  zoom?: number;
  height?: number; // px，缺省 400
  loading?: boolean;
  empty?: SchemaValue; // value-or-region
  onClick?: ActionSchema;
}
```

### 4.2 数据契约

| 数据            | 契约                                                                                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `regionData`    | `[{ name: string, value?: number }]`。`name` 与 geojson feature `properties.name` 精确匹配；无 `value` 的条目保留（defaultColor 路径），不参与色阶范围；无匹配 → 丢弃 + dev warn。 |
| `pinData`       | `[{ name?: string, lat: number, lng: number, value?: number }]`。`lat ∈ [-90, 90]`、`lng ∈ [-180, 180]` 且有限；非法坐标丢弃 + dev warn。                                          |
| `visualMap`     | `min`/`max` 声明缺省回退数据实际范围；`colors` 多段线性插值（RGB），外插 clamp；缺省色阶蓝→青→黄→红；`defaultColor` 缺省 `#dddddd`。                                               |
| geojson 内建    | `src/map-data/china-provinces.json`（35 省，DataV 数据）、`world-countries.json`（177 国，Natural Earth 110m）。随 lazy chunk 加载。                                               |
| `geojsonSource` | action 结果必须是 FeatureCollection（`sanitizeGeojsonActionResult` 校验）；成功结果缓存复用；失败/非法 → error 态 + 重试按钮。                                                     |

### 4.3 事件契约

`onClick`（仅 feature 命中时派发，空白点击不派发；多成员 cluster 点击放大一级不派发）：

```ts
interface MapClickPayload {
  type: 'map:feature-click';
  mapType: 'pin' | 'region';
  name?: string; // properties.name → properties.NAME → feature.id
  value?: unknown; // properties.value
  feature?: Record<string, unknown>; // 完整 properties
}
```

action 模板经 `${event.name}` / `${event.value}` 读取（CX-10 `evaluationBindings` 契约）。

## 5. 主题映射

- OL canvas 无法消费 CSS 变量 → 渲染期探针解析（`getComputedStyle` 读 `--border`/`--background`/`--foreground`/`--primary`，回退固定色值）。
- 主题变化：`MutationObserver` 监听 `document.documentElement` class（`.dark` 切换）→ 重解析 → `manager.setTheme` → `layer.changed()` 重绘。
- 矢量层色值：区域填充 = `visualMap` 色阶 / 高亮 = accent 半透明；边框 = `--border`；点位描边 = `--background`；cluster 文本 = `--foreground`。

## 6. 失败路径

| 场景                 | 触发                                                   | 行为                                                                    |
| -------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| map-empty-data       | regionData/pinData 为空或非法                          | 渲染 `empty` slot，不创建地图实例                                       |
| map-basemap-fail     | 瓦片源不可达（网络/key 无效）                          | 瓦片加载失败不影响矢量层；dev warn（一次）                              |
| map-geojson-invalid  | `geojsonSource` action 失败 / 返回非 FeatureCollection | 该层不渲染 + 错误提示（对齐 childrenSource error 态）+ 重试；不创建地图 |
| map-ol-import-fail   | OL 模块动态导入失败                                    | 错误占位 + console.error（不白屏）                                      |
| map-click-no-feature | 点击空白区域                                           | 不派发事件（仅 feature 命中时派发）                                     |
| map-cluster-empty    | 单点无聚合需要                                         | 单成员 cluster 退化为普通点位渲染（颜色按值）                           |
| map-region-unmatched | regionData 名称无匹配 geojson feature                  | 丢弃 + dev warn；全部无匹配 → empty 态                                  |

## 7. 原则审计（INV-1~5）

> 审计日期：2026-08-10，审计人：mission-driver（plan `2026-08-09-map-openlayers-wrapper-plan.md` Phase 4）

### INV-1 IO 边界

- 外部 IO 清单：HTTP 请求（geojson action 加载）、瓦片网络加载（OL 库内部）、通知（无）。
- 归位：geojson 经 `geojsonSource` action → `helpers.dispatch` → RendererEnv `fetcher`；瓦片由 `ol/source/XYZ`/`TileWMS` 库内部渲染管线承载（渲染器代码不直调 `fetch`/`XMLHttpRequest`）；key/瓦片 url 经 schema + RendererEnv 注入，无硬编码。
- 渲染器代码无 `fetch`/`WebSocket`/`localStorage`/`IndexedDB`/`history.pushState`/`window.open` 直调（`check:audit-renderer-browser-io` 全仓零命中）。

### INV-2 新 IO 类型

- 未触发：无新 IO 类型需求（geojson 走现有 action 机制，瓦片属 OL 库内部渲染管线）。

### INV-3 复用边界

- 数据请求走 `ajax` action（`geojsonSource`）；表达式走 FormulaCompiler（`regionData`/`pinData` 表达式求值）；UI 元素走 `@nop-chaos/ui`（Spinner/Button）；空态/错误态复用 value-or-region + i18n 键。无重造。

### INV-4 内部 state 边界

- state 清单 + ownership：map 实例 / 图层引用 / highlight / geojson 缓存 = `local`（组件 useRef + 模块内闭包）；无 scope-owned 状态。
- 内部 state 不进 schema-visible scope；无 component handle（首版无跨组件命令式控制需求，出现时按 ComponentHandleRegistry 注册）。

### INV-5 契约边界

- 签名 `(props: RendererComponentProps<MapSchema>) => ReactElement`；数据读 `props.props`/`meta`/`regions`/`events`/`helpers`；响应式读无 `scope.get`；无平行组件协议；无直接 store 访问。

### Checklist A-G 勾选状态

- A: 全勾 ✓；B: 全勾 ✓；C: 全勾 ✓；D: 全勾 ✓；E: 全勾 ✓（region：`empty`；行为扩展：`onClick` ActionSchema）；F: 全勾 ✓（根 marker `nop-map`、`data-slot="map-viewport"` 等、状态 `data-state`/`data-map-type`、无 BEM、无新 token 命名空间、`cn()` 合并）；G: 全勾 ✓（package.json 模板 / tsconfig / tsconfig.build / vitest.config `createSharedVitestConfig` / vite.workspace-alias / 根 tsconfig references / playground styles.css `@import` / playground host `registerMapRenderers` / 单一 `src/index.ts` 入口）。

### 例外与未决项

- 无。

## 8. Non-Goals 与 Follow-up

- 热力图层（`ol/source/Heatmap`）、绘制/编辑、轨迹动画、测距：OL 能力存在，超出首版定位（plan Deferred 节）。
- 字段级地图（坐标字段展示）：后续独立评估。
- `map-data` 数据包与 nop-app 行政区划数据源对齐（应用层接入时）。
- OL 版本升级策略（锁定 `^10.10.0`，minor 更新复核）。
