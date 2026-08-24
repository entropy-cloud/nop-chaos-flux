# 21 flux-renderers-map 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-renderers-map/src/` 排除 `*.test.*` 与 `__tests__` 后共 11 个文件约 1589 行（index.ts / schemas.ts / map-renderer.tsx / map-renderer-definitions.ts / map-layer-manager.ts / map-ol-loader.ts / map-data.ts / map-color.ts / use-map-geojson.ts / styles.css / test-support.ts；另有 `map-data/*.json` 内建边界数据与 `test-support/ol-fake.ts` 测试替身）。**精读覆盖率 100%**（按文件）。技术栈核实：包装 **OpenLayers（ol ^10.10.0）**，经 `map-ol-loader.ts` 动态 import 懒加载，非 leaflet/百度/高德。除源码外核对了 `docs/references/quick-reference.md`、`flux-core` 的 `RendererEventHandler`/`ActionResult`/`RendererDefinitionShape` 类型、`flux-react` 的 `resolveRendererSlotContent`/`createLazyRendererComponent`、`flux-runtime/node-runtime.ts` 的 props 解析缓存、`flux-i18n` zh-CN/en-US locale、`apps/playground/src/styles.css`（CSS 变量与样式接入），以及 **`node_modules/ol` 实际实现**（Map.js 的 ResizeObserver、View.fit 的空 extent 断言、GeoJSON.js 的 null geometry 处理、extent.js 的 isEmpty）——F-01/F-06 的关键证据均来自 OL 源码核实。
- 结论概览：**P0 x0 / P1 x3 / P2 x5 / P3 x9**。总体评价：该包架构分层清晰（纯数据构建 map-data / 纯色阶 map-color / OL 装配 map-layer-manager / React 编排 map-renderer / action 加载 use-map-geojson），渲染器契约面（props.props/meta/regions/events/helpers、latestRef 事件镜像、i18n key 双语齐全、无 store 直连、无 BEM、Button/Spinner 用 ui 组件）**全部合规**；懒加载 OL + 错误占位、dev warn、in-flight 去重、LRU 缓存等防御都有意识地做了。**问题集中在三处**：(1) 自动 fit 视图对空 extent 无守卫，OL 断言直接在 effect 内抛错（P1 F-01）；(2) 底图瓦片源在每次数据/样式更新时被无条件重建，全量瓦片重载（P1 F-02）；(3) `mapVisible` 把外部 `loading` 翻转纳入门控，导致地图实例在每次刷新周期整体销毁重建，与代码自述的"无 remount 契约"相矛盾（P1 F-03）。另有一个部署面缺口：全仓未导入 `ol/ol.css`，默认 zoom 控件无定位（P2 F-06）。

## P0 缺陷

无。

## P1 隐患

### F-01 自动 fit 视图对空 extent 无守卫：自定义 geojson 全部 feature 的 geometry 为 null 时，`view.fit` 触发 OL 断言在 effect 内抛错，渲染子树崩溃

- 位置：`packages/flux-renderers-map/src/map-layer-manager.ts:157-162`；触发面 `map-renderer.tsx:332-348`、`map-data.ts:31-46`（sanitize 放行）
- 关键源码摘录（map-layer-manager.ts:157-162）：
  ```ts
  if (options?.fitView) {
    const extent = regionSource.getExtent();
    if (extent) {
      map.getView().fit(extent, { maxZoom: 10 });
    }
  }
  ```
- 推理链（输入 → 路径 → 错误结果）：
  1. 输入：`geojsonSource` action 返回 `{ type: 'FeatureCollection', features: [{ properties: { name: 'X' }, geometry: null }] }`，`regionData: [{ name: 'X', value: 1 }]`，schema 不配置 `center`/`zoom`。`sanitizeGeojsonActionResult`（map-data.ts:42）只校验 feature 是 object，**不校验 geometry**；`buildRegionFeatures` 同样不校验。
  2. 路径：`regionEmpty` 判定用 `features.length`（map-renderer.tsx:238）非 0 → `mapVisible` 为 true → 装配 effect 以 `fitView: true` 调 `setRegionLayer`。OL `GeoJSON.readFeatureFromObject` 对 `geometry: null` 生成**无几何 feature**（node_modules/ol/format/GeoJSON.js:130 `readGeometryInternal(null)` → undefined），不进空间索引；`VectorSource.getExtent()`（ol/source/Vector.js:843）返回空 extent `[Infinity, Infinity, -Infinity, -Infinity]`。
  3. 错误结果：数组恒为 truthy，`if (extent)` 守卫失效 → `View.fit` 内 `assert(!isEmpty(extent), 'Cannot fit empty extent provided as 'geometry'')`（ol/View.js:1352-1356；`isEmpty` 判定 `extent[2] < extent[0]`，ol/extent.js:769-771）**抛 AssertionError**。异常发生在 `useEffect` 内，React 19 无错误边界时整棵组件树卸载——一个"字段名能对上但几何缺失"的常见脏数据让整页白屏。
- 影响：sanitize 自身接受的输入域触发崩溃；错误信息是 OL 内部断言文案，用户与 schema 作者都无法定位。
- 修复方向：fit 前校验 extent 有效性（如 `extent && Number.isFinite(extent[0]) && extent[2] > extent[0]`），或在 `buildRegionFeatures`/`sanitizeGeojsonActionResult` 阶段过滤无有效 geometry 的 feature 并计入 skipped；effect 内对装配异常兜底（降级为默认视图而非抛穿）。

### F-02 底图瓦片源在每次数据/样式更新时被无条件重建：全量瓦片重新加载、地图闪烁、瓦片服务器压力

- 位置：`packages/flux-renderers-map/src/map-renderer.tsx:332-348`（effect 每次运行都调 `setBasemap`）；`packages/flux-renderers-map/src/map-layer-manager.ts:83-115`（setBasemap 无等值守卫）
- 关键源码摘录（map-renderer.tsx:332-337）：
  ```ts
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || !mapVisible) {
      return;
    }
    manager.setBasemap(resolved.basemap);
  ```
  （map-layer-manager.ts:94-98）：
  ```ts
  const url = config?.url ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  source = new api.XYZ({ url, crossOrigin: 'anonymous' });
  ```
- 问题：图层装配 effect 的依赖含 `regionBuild` / `pinBuild` / `colorScale` / `mapType` / `cluster`——这些在**每次数据刷新**（regionData/pinData 引用变化）和**每次重着色**时都会变化；而 `setBasemap` 每次运行都 `new XYZ()/new TileWMS()` 并 `basemapLayer.setSource(source)`，无任何 config 等值判断。数据层本有"同层原地更新"设计（regionSource.clear + addFeatures），却被底图重建抵消。
- 影响（特定条件 + 后果）：任何一次 `regionData`/`pinData`/`visualMap` 更新 → 底图所有可视瓦片作废重拉 → 可感知闪烁、流量放大（每格刷新重拉整屏瓦片）、OSM 瓦片使用政策风险；批量刷新场景（轮询数据源）成倍放大。
- 修复方向：`setBasemap` 记录上次 config 的序列化值（url/type/attribution），等值直接返回；或将 basemap 装配拆成独立 effect，仅依赖 `[olApi, mapVisible, resolved.basemap]`。

### F-03 `mapVisible` 把外部 `loading`/瞬态 `empty` 纳入门控：每次刷新周期地图实例整体销毁重建，视图复位、高亮丢失，与代码自述"无 remount 契约"矛盾

- 位置：`packages/flux-renderers-map/src/map-renderer.tsx:242-244`（mapVisible 定义）、`248-310`（创建/销毁 effect 依赖 `mapVisible`）、`365-367`（容器条件渲染）
- 关键源码摘录（map-renderer.tsx:242-244、310）：
  ```ts
  const showLoading = externalLoading || geojsonLoading;
  const showError = Boolean(olError) || Boolean(geojsonError);
  const mapVisible = !showLoading && !empty && !showError;
  ...
  }, [olApi, mapVisible]);
  ```
- 问题：propContracts 明确 `loading` 是"data-source driven"（map-renderer-definitions.ts:161-165），即文档化用法是绑定数据源 loading 态。该标志每轮刷新 true→false 翻转一次，`mapVisible` 随之翻转 → 创建 effect cleanup 执行 `manager.dispose(); map.dispose()` → 数据回来后**从零重建 Map 实例**：瓦片重载、用户平移/缩放复位到 schema 初始 center/zoom（latestRef 初值）、hover 高亮丢失。代码注释（map-renderer.tsx:246-247）自述"无 remount 契约——数据更新走 layer manager……不重建实例"，实际只对数据内容成立，对 loading 翻转不成立。瞬态 `empty`（刷新时先清空再填充的数据源）同理触发。
- 影响（特定条件 + 后果）：绑定 `loading: "${ds.loading}"` 的轮询/刷新场景，每轮刷新整地图闪烁 + 交互状态归零；`fitDoneRef` 随之复位还会触发意外的重新 fit。
- 修复方向：loading 态改为 overlay 遮罩（styles.css 里 `[data-state='loading'] .ol-viewport { visibility: hidden }` 规则已经是这个意图的残留），地图实例仅在 error/卸载时销毁；`empty` 同样用遮罩或仅移除数据层（`setRegionLayer(null)` 路径已存在）。

## P2 风险

### F-04 `useMapGeojson` 初始 `loading:false`：带 `geojsonSource` 的挂载首帧 `mapVisible` 为 true，闪现一张只有底图的地图并白白创建/销毁一次实例

- 位置：`packages/flux-renderers-map/src/use-map-geojson.ts:30-34`；配合 `map-renderer.tsx:233`、`242-244`
- 关键源码摘录（use-map-geojson.ts:30-34）：
  ```ts
  const [state, setState] = useState<{
    loading: boolean;
    ...
  }>({ loading: false, error: undefined, geojson: undefined });
  ```
- 问题：首次提交时 `geojsonAction.loading === false`（state 初值），`geojsonLoading` 为 false、`regionData` 非空 → `mapVisible` true → 地图创建 effect 先建 Map + 底图；随后 dispatchGeojson effect 才把 loading 置 true → 地图销毁 → 数据到达后再重建。每次挂载多一次完整的 Map 创建/销毁 + 一帧仅底图地图的闪现。
- 影响：视觉抖动 + 无谓开销；与 F-03 叠加放大。
- 修复方向：`geojsonSource` 存在时初始 state 直接 `{ loading: true }`（或 `geojsonLoading = Boolean(resolved.geojsonSource) && (geojsonAction.loading || !geojsonAction.geojson && !geojsonAction.error)`）。

### F-05 `geojsonSource` 切换时旧请求无时序保护：乱序响应可用陈旧 geojson 覆盖新配置的结果

- 位置：`packages/flux-renderers-map/src/use-map-geojson.ts:62-126`
- 关键源码摘录（use-map-geojson.ts:66-80）：
  ```ts
  if (inFlightRef.current.has(cacheKey)) {
    return;
  }
  ...
  inFlightRef.current.add(cacheKey);
  ...
  void helpers
    .dispatch(geojsonSource, { scope })
    .then((result) => {
      if (!mountedRef.current) {
        return;
      }
  ```
- 问题：in-flight 去重按 cacheKey，geojsonSource（或 scope）变化产生新 key 后**旧 key 的在途请求不被取消也不做废弃标记**，其 `.then` 只查 `mountedRef` 就 `setState`。旧响应晚于新响应到达时，展示的是已不存在的旧边界数据（无任何提示）。注：参照实现 `flux-renderers-data/src/table-renderer/use-table-lazy-children.ts` 是同一模式，属对齐的既有缺口，但在 map 场景"整张边界图"错版更可感。
- 影响（特定条件 + 后果）：schema 动态切换 geojsonSource（如联动下拉切换区域集）+ 网络乱序 → 地图渲染陈旧区域且不自愈（缓存还会把错值缓存到旧 key 下，后续切回旧配置直接命中错值）。
- 修复方向：引入请求代数（ref 计数器），`.then` 内校验代数仍为当前才 setState；或旧 key 在途时记录"待废弃"。

### F-06 全仓未导入 `ol/ol.css`：默认 zoom 控件/attribution 无定位样式，canvas 有基线缝隙

- 位置：包级缺口。`packages/flux-renderers-map/src/styles.css`（自带的 `.ol-zoom`/`.ol-attribution`/`.ol-viewport` 规则只覆盖尺寸与配色）；`apps/playground/src/styles.css:12` 仅 `@import '@nop-chaos/flux-renderers-map/styles.css'`；全仓 grep `ol.css` 仅命中 `node_modules/ol/ol.css` 本体
- 关键源码摘录（styles.css:12-15、29-33，依赖 ol.css 才生效的定位规则）：
  ```css
  .nop-map .ol-viewport {
    width: 100%;
    height: 100%;
  }
  .nop-map .ol-zoom {
    top: auto;
    bottom: 0.5rem;
    left: 0.5rem;
  }
  ```
- 问题：`new olApi.Map({ target, view })` 未传 `controls: []`，OL 默认添加 Zoom/Attribution 控件（node_modules/ol/Map.js:456-457，`control/defaults`），其 DOM 布局完全依赖 `ol/ol.css`（`.ol-zoom { position: absolute; ... }`、`.ol-viewport { position: relative; overflow: hidden }`、`canvas { display: block }`）。该 CSS 从未被导入：zoom 按钮变成无定位的裸按钮（`top/bottom/left` 声明因无 `position` 而失效），viewport 缺 `position:relative`/`overflow:hidden`，canvas 以 inline 展示产生约 4px 基线缝隙。
- 影响：默认配置下控件错位/不可用、地图底部缝隙；包作为独立 npm 分发时 host 也不可能替它导入。
- 修复方向：`styles.css` 顶部 `@import 'ol/ol.css';`（Vite/CSS 管道可解析包内路径，需在 package.json `dependencies` 已满足），或把所需定位规则自绘进 `styles.css` 并显式声明 `controls`。

### F-07 默认 OSM 底图经裸 `XYZ` 加载，不带任何 attribution：OSM/ODbL 署名义务缺失

- 位置：`packages/flux-renderers-map/src/map-layer-manager.ts:94-97、112-114`
- 关键源码摘录（map-layer-manager.ts:94-114）：
  ```ts
  const url =
    config?.url ??
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  source = new api.XYZ({ url, crossOrigin: 'anonymous' });
  ...
  if (config?.attribution && typeof (source as InstanceType<OlApi['XYZ']>).setAttributions === 'function') {
    (source as InstanceType<OlApi['XYZ']>).setAttributions([config.attribution]);
  }
  ```
- 问题：OL 的 `ol/source/OSM` 才内置默认 attribution；用裸 `XYZ` 指向 OSM 瓦片地址不携带任何署名。attribution 仅在 host 显式配置时才设置，而缺省 url 恰好就是 OSM 生产瓦片服务。
- 影响：默认配置下地图使用 OSM 数据却不显示 "© OpenStreetMap contributors"，违反 OSM 瓦片使用政策/ODbL 署名要求（合规风险）；叠加 F-02 每次刷新全量重拉，加剧政策性限流风险。
- 修复方向：url 缺省为 OSM 时自动附 `© OpenStreetMap contributors` attribution（或直接换用 `ol/source/OSM`），配置 url 时也建议在 schema 层提示补 attribution。

### F-08 视图同步 effect 依赖同时含 `center` 引用与 `centerKey` 值键：值键守卫失效，表达式绑定的 center 在 scope 变化时可能复位用户平移/缩放（suspect）

- 位置：`packages/flux-renderers-map/src/map-renderer.tsx:317-328`；配合 `152-161`（center memo）
- 关键源码摘录（map-renderer.tsx:317-328）：
  ```ts
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !olApi) {
      return;
    }
    if (center && centerKey.length > 0) {
      map.getView().setCenter(olApi.fromLonLat(center));
    }
    if (zoom !== undefined) {
      map.getView().setZoom(zoom);
    }
  }, [olApi, centerKey, zoom, center]);
  ```
- 问题：`centerKey`（值序列化）显然是为"值变化才同步"设计的守卫，但依赖数组又放了 `center` 对象引用，使守卫形同虚设。静态 schema 数组经 `node-runtime.ts` 的 `_staticPropsResult`/shallowEqual 缓存保持引用稳定（无影响）；但**表达式绑定的 center**（如 `"center": "${[lng, lat]}"`）在 scope 每次变化重新求值产生等值新数组 → shallowEqual 失败 → 引用变化 → effect 重跑 → 即便值与 schema 完全一致也把 view 拉回 schema center/zoom，用户手动平移缩放被复位。是否触发取决于 runtime 对等值数组的求值缓存粒度，故标 suspect。
- 影响：表达式绑定 center + 任意 scope 波动 → 用户交互状态被周期性清零（若 F-03 已触发重建则被掩盖）。
- 修复方向：依赖去掉 `center`，effect 内经 ref 读最新值（或仅依赖 `[olApi, centerKey, zoom]`）。

## P3 提示

### F-09 cluster 点击分支不区分 mapType：region 自定义 geojson feature 恰带 `features` 数组属性（长度 >1）时，点击被误判为聚合而只放不大、不派发 onClick（suspect）

- 位置：`packages/flux-renderers-map/src/map-renderer.tsx:272-280`
- 关键源码摘录：
  ```ts
  const hitProps = hit.getProperties();
  const members = Array.isArray(hitProps.features)
    ? (hitProps.features as HitFeatureLike[])
    : undefined;
  if (members && members.length > 1) {
    // cluster 聚合点击：放大一级，不派发单点事件
    const currentZoom = map.getView().getZoom() ?? DEFAULT_ZOOM.pin;
    map.getView().setZoom(currentZoom + 1);
    return;
  }
  ```
- 问题：判据是"properties 里有 `features` 数组"，这只对 OL Cluster 包裹 feature 成立；region 模式读入的自定义 geojson feature 原样保留业务属性，若业务数据恰有 `features` 字段（GIS 数据里嵌套集合并不罕见）即误触发。修复方向：用 `mapType === 'pin' && cluster` 门控该分支。

### F-10 `withAlpha` 对计算后的 `rgb()` 主题色 no-op：高亮/聚合点的透明度意图从未生效

- 位置：`packages/flux-renderers-map/src/map-layer-manager.ts:40-46、123-125、183`；`map-renderer.tsx:40-56`
- 关键源码摘录（map-layer-manager.ts:41-45）：
  ```ts
  const normalized = hex.replace(/^#/, '');
  if (normalized.length === 6 && /^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `#${normalized}${Math.round(alpha * 255)
      .toString(16)
      .padStart(2, '0')}`;
  }
  return hex;
  ```
- 问题：`resolveThemeColor` 取 `getComputedStyle(probe).borderColor`，返回的是 `rgb(r, g, b)` 字符串而非 hex；`withAlpha` 只识别 6 位 hex，其余原样返回 → 高亮填充 `withAlpha(accent, 0.55)` 实际是不透明 accent，聚合圆 `0.65` 同理。纯视觉偏差（OL 接受 rgb() 颜色不报错）。修复方向：`withAlpha` 支持 `rgb()/rgba()` 解析，或 `resolveThemeColor` 归一化为 hex。

### F-11 `resolveThemeColor` 在 CSS 变量缺失时可能拿到计算值 `rgb(0,0,0)` 绕过 fallback（suspect）

- 位置：`packages/flux-renderers-map/src/map-renderer.tsx:40-56`
- 关键源码摘录：
  ```ts
  probe.style.border = `1px solid var(${cssVariable})`;
  ...
  const resolved = getComputedStyle(probe).borderColor;
  probe.remove();
  return resolved && resolved !== 'rgba(0, 0, 0, 0)' ? resolved : fallback;
  ```
- 问题：变量未定义时 `border` 声明无效，border-color 回退到 initial（currentcolor），深色文本环境下计算值接近黑色 `rgb(0, 0, 0)`——只防了透明 `rgba(0,0,0,0)`，没防黑色。host 未接 shadcn 变量时主题色全黑。修复方向：同时排除纯黑/与 probe 文本色相同的情形，或用 `getPropertyValue` 直接读变量再解析。

### F-12 region 模式 `dataRange` 把未匹配（skipped）条目的值计入：色阶被从未渲染的数据拉偏

- 位置：`packages/flux-renderers-map/src/map-data.ts:108-112`
- 关键源码摘录：
  ```ts
  return {
    featureCollection: { type: 'FeatureCollection', features },
    skipped,
    dataRange: collectDataRange([...valueByName.values()]),
  };
  ```
- 问题：`valueByName` 含所有 regionData 条目（含名字拼错/geojson 中不存在的），其极值参与 min/max；一个不存在区域的异常值会把整张图的有效色域压窄。修复方向：仅统计命中 feature 的值。另注：skipped 检测对每个 name 做 `features.some(...)` 线性扫描，O(n×m)，几千区域时可感知（map-data.ts:102-106）。

### F-13 `hexToRgb` 不支持 4/8 位 hex，非法颜色静默解析为黑色；`visualMap.min > max` 无校验

- 位置：`packages/flux-renderers-map/src/map-color.ts:24-37、77-94`
- 关键源码摘录（map-color.ts:32-34）：
  ```ts
  const value = Number.parseInt(normalized, 16);
  if (!Number.isFinite(value) || normalized.length !== 6) {
    return [0, 0, 0];
  }
  ```
- 问题：`#RRGGBBAA`（合法 CSS）与 `#RGBA` 长度不为 6 → `[0,0,0]`，用户配置 8 位 hex 的颜色全部变黑且无提示；`min > max` 时归一化恒为 1，只显示末位色。修复方向：长度 8 时截前 6 位；构造期校验 min<=max（emit warning）。

### F-14 内建边界数据双份静态 import：`china-provinces.json`（约 1.0MB）与 `world-countries.json`（约 1.3MB）无条件进入同一 lazy chunk

- 位置：`packages/flux-renderers-map/src/map-renderer.tsx:21-27`
- 关键源码摘录：

  ```ts
  import chinaProvinces from './map-data/china-provinces.json';
  import worldCountries from './map-data/world-countries.json';

  const BUILTIN_GEOJSON: Record<string, GeoJsonFeatureCollection> = {
    'china-provinces': chinaProvinces as GeoJsonFeatureCollection,
    'world-countries': worldCountries as GeoJsonFeatureCollection,
  };
  ```

- 问题：只用中国地图的页面也要下载并解析世界边界（反之亦然），chunk 体积翻倍。修复方向：`BUILTIN_GEOJSON` 改为按名动态 `import()`（首次装配时加载 + 缓存 Promise），配合现有 loading 态。

### F-15 OL 模块加载失败路径直接展示原始英文 `error.message` 且无重试；wms 缺省 URL 硬编码三方演示服务

- 位置：`packages/flux-renderers-map/src/map-renderer.tsx:174-181、353、379-388`；`map-layer-manager.ts:87`
- 关键源码摘录：
  ```ts
  setOlError(
    error instanceof Error ? error.message : t('flux.map.mapLoadFailed'),
  );
  ...
  {retryAvailable ? (<Button ...>{t('flux.common.retry')}</Button>) : null}
  ```
- 问题：chunk 加载失败时用户看到的是 Vite 原始错误文本（如 "Failed to fetch dynamically imported module..."），非 i18n 文案；`retryAvailable` 仅看 `geojsonSource`，OL 失败没有任何重试手段（只能重新挂载）。另 `type:'wms'` 未配 url 时静默落到 `https://ows.terrestris.de/osm/service` 第三方演示服务（map-layer-manager.ts:87），生产环境会静默打出未知流量。修复方向：OL 失败也提供重试（重置 olError + 重新 loadOlApi）；wms 缺 url 改为 emit warning 或不发源。

### F-16 `schemas.ts` 的 `loading` 注释语义颠倒

- 位置：`packages/flux-renderers-map/src/schemas.ts:78`
- 关键源码摘录：
  ```ts
  /** 外部 loading 状态（false 时渲染 loading 态）。 */
  loading?: boolean;
  ```
- 问题：实现是 `resolved.loading === true` 时渲染 loading 态（map-renderer.tsx:100、242），注释写反。按文档写 schema 的作者会得到相反行为。修复方向：改为"true 时渲染 loading 态"。

### F-17 杂项

- `as never` 双逃逸：`map-layer-manager.ts:149`（`build.featureCollection as never`）、`258`（`pixel as never`）——OL 构造器类型 seam，能工作但绕过了类型检查，建议在 `OlApi` 上给出精确签名。
- `useMapGeojson` 缓存是组件实例级的（`useRef`）：同页两个 map 组件配相同 `geojsonSource` 会各派发一次 action，注释所述"缓存复用"不跨实例。
- `map-renderer.tsx:1` `import React` 在自动 JSX runtime 下无引用（风格）。
- styles.css 的 `.nop-map[data-state='loading'] .ol-viewport { visibility: hidden }`（styles.css:43-45）在当前"loading 即卸载容器"的实现下是死规则——若按 F-03 建议改为遮罩方案则正好复用。

## 检查过程记录

1. **结构清点**：`ls packages/flux-renderers-map/src/` + `wc -l` 确认 11 个实现文件 1589 行；`package.json` 确认底图为 `ol ^10.10.0`（非 leaflet/百度/高德），lazy chunk + styles.css 子路径导出。
2. **精读**：全部 11 文件逐行读完（含 styles.css 与 test-support.ts；test-support.ts 为测试脚手架，仅核对契约不影响结论）。
3. **契约核对**（对照 `docs/references/quick-reference.md` 与 flux-core/flux-react 源码）：
   - `RendererEventHandler = (event?: unknown, ctx?: Partial<ActionContext>) => Promise<ActionResult>`（renderer-core.ts:174-177）——map-renderer.tsx:287-291 调用形态匹配；
   - `ActionResult.ok/data/error`（actions.ts:276+）——use-map-geojson.ts 消费正确；
   - `resolveRendererSlotContent(props, 'empty', { fallback })`（render-nodes.tsx:206）签名匹配；
   - `RendererDefinitionShape` 含 `schemaValidator/eventContracts/propContracts/fields/sourcePackage`（renderer-definition-types.ts:69-93）——definitions 全部字段合法；fields 与 schema 类型声明一一对应（无 Layer-1/Layer-2 缺口）；
   - props 解析缓存：`node-runtime.ts:254-338` 静态 props 引用稳定、动态值 shallowEqual——F-08 的 suspect 判定依据。
4. **i18n**：`flux.map.mapLoadFailed/geojsonInvalid/loadRegionDataFailed` 与 `flux.common.noData/loading/retry` 在 zh-CN/en-US 双语齐全；源码 CJK 仅存在于注释。
5. **grep 扫描**：`addEventListener/removeEventListener`（无）、`as any`（无）、`as never` ×2、空 catch ×2（均为有 fallback 的合理用法）、硬编码中文（仅注释）。
6. **OL 行为核实**（node_modules/ol 源码）：Map.js 内置 ResizeObserver（自动 updateSize，"容器尺寸为零/隐藏后显示"经典缺陷**不成立**，故未立项）；View.js:1352 空 extent 断言 + extent.js:769 isEmpty + Vector.js:843 getExtent（F-01 成立）；GeoJSON.js null geometry → 无几何 feature（F-01 路径）；Map.js:456 默认 controls + ol.css 全仓未导入（F-06 成立）；`ol/source/OSM` 才有默认 attribution（F-07 成立）。
7. **主题接入**：playground styles.css 的 `--background: 40 30% 98%` 等 HSL 分量变量与包内 `hsl(var(--background))` 用法一致（无 oklch 冲突）；`@source` 覆盖 packages，Tailwind 类可生成。
8. **测试交叉**：map-renderer.test.tsx 共 27 用例覆盖挂载/无 remount 更新/卸载/事件桥接/空态/loading 降级/geojsonSource 加载——均基于 mock OL（test-support/ol-fake.ts），F-01（OL 断言）、F-02（瓦片源重建）、F-04（首帧时序）不在 mock 语义内，与测试全绿不矛盾。
9. **未修改任何 `packages/` 文件；未运行 pnpm 命令；本报告为唯一产出文件。**
