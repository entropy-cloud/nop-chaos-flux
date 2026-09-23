# [card] page:map-demo

- **批次**: R2-1c ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/map-demo` ｜ **载体**: 域页面（OpenLayers Canvas 渲染、无 WebGL：Region 区域着色 + Pin 点位聚合 + 自定义边界 geojsonSource + 空态，四卡）
- **矩阵裁剪**: simplified（matrixReason：页面无弹层 → H n/a；非设计器 → G n/a；瓦片中间态裁剪理由：本页四张 schema 均未配置 basemap/XYZ 瓦片源，页内不存在瓦片请求（网络监听 0 失败、0 瓦片请求），"瓦片加载中间态"无对象可测——相关风险已并入发现 1 的"无底图白板"影响面；拖拽仅地图 pan，非编辑拖放 → A6 n/a）
- 本页实际裁掉的状态：瓦片加载中间态（无瓦片源）、弹层、glass 皮肤、区域点击 toast（showToast 已注册但区域空白不可点，见发现 1 影响面）

## 1. 截图清单

| 状态                               | light                                                                                                                                     | dark                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 默认 1280×800                      | `_tmp/visual-inspection-2026-09-23/r2-1c/map-demo/map-demo-default-light.png`                                                             | `map-demo-default-dark.png`                           |
| 默认 ~800 宽                       | n/a（本页 xl 断点双列 → 单列与 graph/pivot 同模式已由同域卡覆盖，800px 复拍裁剪；理由：页面布局为纯 grid 单列折叠，无双列特有的挤压风险） | 同左                                                  |
| 分卡截图（Region/Pin/自定义/空态） | `map-demo-card0-light.png` … `map-demo-card3-light.png`                                                                                   | `map-demo-card0-dark.png` … `map-demo-card3-dark.png` |
| hover/focus                        | pass（页头按钮 shadcn 族静态核）                                                                                                          | —                                                     |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 pass A3 **fail(R2-1c-A3-01)**（OL 缩放按钮 10.4×22 / 9×22 < 24×24）A4 n/a A5 **fail(见 R2-1c-C6-01 影响面：区域数据"消失"无任何错误/空态指示)** A6 n/a A7 n/a A8 n/a A9 n/a
- B 颜色：B1 pass B2 pass B3 **fail(R2-1c-B3-01)**（cluster 无计数可见、填充不走 visualMap 色阶）B4 pass（OL 按钮 bg = `hsl(var(--background))` 令牌、dark 联动正确；visualMap 色阶为 schema 显式配置）B5 **fail(R2-1c-B5-01)**（dark 页头不可见；画布空白与 light 同根因）B6 n/a
- C 布局：C1 **fail(R2-1c-C6-01)**（区域画布整版空白属内容错位/缺失）C2 warn（控件叠地图左上，并入 A3-01）C3 pass C4 pass（xl 断点折叠正常）C5 pass C6 **fail(R2-1c-C6-01)**（DPR 尺寸 pass 但内容零绘制，按提示词"画布内容整体错位"口径记 fail）
- D 间隔：D1–D5 pass D6 n/a D7 pass D8 pass
- E 排布：E1 fail（首屏两张主图整版空白，"这页展示什么"不可答）E2 pass E3 pass E4 pass E5 pass E6 pass（空态卡 "暂无区域数据" 正常）
- F 一致性：F1 pass F2 pass F3 pass F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-1c-C6-01] Region 两卡画布整版空白——geojson 要素投影错位不可见

- **页面/路由**: `#/map-demo`（"Region 区域着色"卡 + "自定义边界（geojsonSource）"卡）
- **主题/视口/状态**: light+dark / 1280×800 / 默认进入即可复现
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/map-demo/map-demo-card0-light.png`、`map-demo-card2-light.png`、dark 对应 `map-demo-card0-dark.png`
- **目视描述**: 两张区域着色地图均为纯白（dark 下纯深蓝）空板：无中国省市轮廓、无 regionData 着色、无 visualMap 图例；页面无 loading/error/空态任何指示。P0 邻域——区域点击事件（showToast）因要素不可见而整体失效。
- **程序化证据**:
  - 探针: canvas 像素网格采样（64×40 downsample `drawImage`+`getImageData`）+ 网络/控制台监听
  - 输出: 两张区域 canvas 采样 `nonWhite: 0 / 2560`（对照 Pin 卡 22 非白像素正常绘制）；网络 0 失败、控制台 0 错误——`china-provinces.json` 为包内建数据（`packages/flux-renderers-map/src/map-data/`）且加载成功，纯渲染缺陷。源码定位：`map-layer-manager.ts` `setRegionLayer` 中 `new api.GeoJSON().readFeatures(build.featureCollection)` **未传 `featureProjection: 'EPSG:3857'`**，EPSG:4326 经纬度坐标被当米制投影使用，要素落在 (0,0) 附近几米范围内、完全在以中国为中心的视图之外。Pin 卡因走 `fromLonLat([lng,lat])`（230 行）正常出点，构成同页对照组。
- **对照基准**: OpenLayers GeoJSON 图层标准用法（readFeatures 必须声明 featureProjection）；检查提示词 C6/画布内容整体错位（P0 示例条目）；A5（数据缺失应有指示）。
- **严重程度**: P1（按 P0 定义"画布内容整体错位/功能默认不可用"贴近 P0，考虑到 pin 卡仍可用、页面其余交互正常，记 P1 并建议升格评估）
- **用户影响**: 区域着色与自定义边界两大演示场景 100% 不可用，dark/light 同样空白；用户看到的是无解释的白板。
- **修复方向**: `packages/flux-renderers-map/src/map-layer-manager.ts` `setRegionLayer`：`readFeatures(build.featureCollection, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' })`；同时核查 `fitView` 分支的 extent 计算（同一投影错位使其失效）；补"区域要素可见（像素采样非空）"回归测试。
- **归族**: local → R2-4 批（单组件根因）
- **复核状态**: 未复核

### [R2-1c-A3-01] ol/ol.css 未引入——地图控件无样式、按钮 10×22px、隐藏控件仍可见

- **页面/路由**: `#/map-demo`（三张带地图的卡左上角控件）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/map-demo/map-demo-card1-light.png`（左上角 "+–" "⇧" "i" 四个裸文本按钮挤在一起）
- **目视描述**: 缩放 +/− 渲染为并排裸文本，比页脚还小；rotate 罗盘与另一图标也裸露在外；控件叠在地图左上角内容上。
- **程序化证据**:
  - 探针: `.ol-control button` rect 遍历 + `.ol-zoom` 容器 computed/rect + 全仓 `ol/ol.css` import 扫描
  - 输出: 缩放按钮 `+` 10.4×22px、`−` 9×22px（远低于 WCAG 2.5.8 的 24×24）；`.ol-zoom` 容器 582×22px（=整个视口宽、position 静态置顶），rotate 控件带 `ol-hidden` class 却仍渲染（`ol-hidden{display:none}` 规则缺失）；attribution 折叠为 0×0。仓库源内 `ol/ol.css` import 计数为 0；`flux-renderers-map/src/styles.css` 的 `.ol-zoom{bottom/left}` 定位规则因缺 `position:absolute` 前提而全部失效。
- **对照基准**: WCAG 2.5.8 最小点击目标；OL 官方控件形态（ol.css 提供定位/堆叠/隐藏语义）；检查提示词 A3/C2。
- **严重程度**: P2（控件难点中 + 隐藏控件复活 + attribution 不可达）
- **用户影响**: 缩放/旋转按钮几乎点不中；本应隐藏的 rotate 控件常驻占位；数据源署名（attribution）无法展开，可能有合规影响。
- **修复方向**: `packages/flux-renderers-map/src/map-ol-loader.ts`（或包入口）增加 `import 'ol/ol.css'`；保留 `styles.css` 的令牌化覆盖（其 `.ol-zoom` bottom/left 定位在 ol.css 到位后即生效，B4 令牌链路无需改）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1c-B3-01] cluster 聚合点无计数文本可见，填充色不走 visualMap 色阶

- **页面/路由**: `#/map-demo`（"Pin 点位聚合"卡）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/map-demo/map-demo-card1-light.png`、`map-demo-card1-dark.png`
- **目视描述**: 8 个门店聚成 3 个纯黑（dark 下纯白）实心圆点：无聚合计数数字、无值域颜色；加上无任何底图/轮廓参照，点位语义（哪簇是北京哪家是上海、value 多少）完全不可读。
- **程序化证据**:
  - 探针: canvas 像素采样（22 非白像素=3 圆点，无中间灰度字形）+ 源码比对
  - 输出: `map-layer-manager.ts` `buildClusterStyle` 多点分支：fill=`withAlpha(theme.accent,0.65)`（不走 `scale.color(value)`，单点分支才走）、count 文本 fill=`theme.text`；light 下 theme.text=#1f2328 叠深色 accent≈不可分，dark 下 theme.text 反白叠浅色 accent 同样≈1:1 → 两主题计数均不可见（截图逐张核对无字形）。light/dark 圆点颜色随主题反转本身符合 B4 令牌追溯，但"计数不可读"双主题皆坐实。
- **对照基准**: 聚合点行业标准（高德/Leaflet.cluster 均显示计数 + 值域着色）；检查提示词 B3（色彩承载信息）、C2（标注可读性）。
- **严重程度**: P2
- **用户影响**: 聚合数、密度分布两类关键信息全部丢失，pin 卡仅剩"有几簇点"的观感。
- **修复方向**: `buildClusterStyle` 多点分支：text fill 改 `theme.background`（或白字+半透明深底双保险）；fill 改 `scale.color(成员均值)` 与单点/visualMap 色阶对齐；可选：无 basemap 时叠加中国轮廓 Vector 层作地理参照。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1c-B5-01] dark 模式页头硬编码 bg-white，标题对比度 1.07:1 不可见

- **页面/路由**: `#/map-demo` 页头（graph-demo 页头同根因，见 graph 卡 R2-1c-B1-01）
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1c/map-demo/map-demo-default-dark.png`
- **目视描述**: dark 下页头仍为白底，标题文字随 `--foreground` 翻转为浅色，"Map Demo (OpenLayers)" 几乎不可见。
- **程序化证据**:
  - 探针: `getComputedStyle` 页头容器与 h1
  - 输出: barBg `rgb(255,255,255)`（class 含 `bg-white` 字面类）、h1Color `rgb(230,236,243)` → WCAG 对比度 ≈1.07:1。
- **对照基准**: WCAG 1.4.3 正文 ≥4.5:1；检查提示词 B5 dark 平价；B4（硬编码字面色不走令牌）。
- **严重程度**: P2
- **用户影响**: dark 用户无法读到页面标题；白条在 dark 页面顶端形成断裂光带。
- **修复方向**: `apps/playground/src/pages/map-demo.tsx` 页头 `bg-white` → `bg-background`（pivot-table-demo 页头已是正确写法，可直接对齐）。
- **归族**: systemic → R2-3 批（map/graph 两页同字面类同根因）
- **复核状态**: 未复核

## 4. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本卡路径）；
  findings 归族：B5-01 → systemic（R2-3，与 graph 页头同族）；C6-01/A3-01/B3-01 → local（R2-4）；
  批内复检通过后 → `verified`。
