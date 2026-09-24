# [card] control:map

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/map-demo` ｜ **载体**: 域 demo 页（OpenLayers Canvas 渲染：Region 区域着色 + Pin 点位聚合 + 自定义边界 geojsonSource + 空态，四卡）
- **矩阵裁剪**: simplified（matrixReason：非六属性交互复合控件——地板 = light+dark（真 data-mode）、1280×800 + ~800 窄视口、默认/hover/选中、中间态（缩放控件交互）；选中态：map 控件未定义 DOM 选中态（要素点击→showToast 属事件通道，且区域要素不可见使点击目标不存在——归 C6-01 影响面），选中态按 n/a 记录理由；hover：canvas cursor 探针取证，要素级 hover 样式因区域要素不可见无对象可测；弹层/拖放/异步 error n/a）
- 本页实际裁掉的状态：要素选中态（无载体）、瓦片加载中间态（无瓦片源）、glass 皮肤

## 1. 截图清单

| 状态                          | light                                                                     | dark（真 data-mode）                                                           |
| ----------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 默认 1280×800                 | `_tmp/visual-inspection-2026-09-25/r2-2c/map/map-default-light-1280.png`  | `_tmp/visual-inspection-2026-09-25/r2-2c/map/map-default-dark-1280.png`        |
| 默认 ~800 宽（dark）          | `_tmp/visual-inspection-2026-09-25/r2-2c/map/map-default-dark-1280.png`\* | `_tmp/visual-inspection-2026-09-25/r2-2c/map/map-default-light-800.png`        |
| Pin 卡缩放点击后（dark 1280） | —                                                                         | `_tmp/visual-inspection-2026-09-25/r2-2c/map/map-pin-after-zoom-dark-1280.png` |
| DPR2 画布（C6 判据）          | `_tmp/visual-inspection-2026-09-25/r2-2c/map/map-dpr2-light-1280.png`     | —                                                                              |

\* 过程标注：`map-default-dark-1280.png` 首拍误在 800 视口（截图为 800×900 单列布局），已以同文件名重拍为 1280 dark 正确态；800 布局证据由该首拍承担，命名见上表。

## 2. A–H 维度勾选表

- A 交互：A1 n/a（DOM 无 hover 面）A2 pass（页头按钮 shadcn 族）A3 **维持 R2-1c-A3-01**（缩放钮 10.4×22 / 9×22 <24，ol.css 仍缺）A4 n/a A5 **维持 R2-1c-C6-01 影响面**（区域数据"消失"无 loading/error/空态指示；空态卡本身"暂无区域数据"正常）A6 n/a（地图 pan 非编辑拖放）A7 n/a A8 n/a A9 pass（Pin 卡缩放点击后画布重绘实测：dataLen 8582→10150）
- B 颜色：B1 pass B2 pass B3 **维持 R2-1c-B3-01**（cluster 纯黑/纯白圆点、无计数文本、不走 visualMap 色阶；dark 缩放后白点同险）B4 pass（ol 按钮 bg rgb(2,8,23) dark 联动 = 令牌链在）B5 **维持 R2-1c-B5-01**（dark 页头 1.19:1）B6 n/a
- C 布局：C1 pass（docOverX 0 @1280/800）C2 warn（ol 控件叠地图左上 = R2-1c-A3-01 并入面，引用）C3 pass C4 pass（800 单列 736 无溢出）C5 pass C6 **维持 R2-1c-C6-01**（region/边界卡整版空白：像素采样 nonBg=0 且截图空板；DPR2 尺寸本身合规 attr 1164=css 582×2，**非尺寸缺陷而是要素投影错位**）
- D 间隔：D1–D8 pass/n-a
- E 排布：E1 fail（维持 R2-1c-C6-01 影响面：两张主图空白不可答"这页展示什么"）E2–E6 pass
- F 一致性：F1–F3 pass（空态模式与 pivot/graph 一致）F4 warn（页头中英混排为 demo 作者文案；控件侧无新增）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2c-G2-129] 地图画布 cursor auto——pan 拖拽可供性缺失（拖拽光标族地图域实例）

- **页面/路由**: `#/map-demo`（三张带地图卡画布）
- **主题/视口/状态**: light / 1280 / hover
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/map/map-default-light-1280.png`
- **目视描述**: 悬停地图光标为默认箭头；地图 pan 靠拖拽，无 grab/grabbing 光标表达。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w4-map-pivot-three.mjs` canvasCursor 段
  - 输出: `canvasCursor: "auto"`（OpenLayers 默认未配置 pointer/grab 光标）。
- **对照基准**: 检查提示词 G2/A1（可供性）；watch-pool R2-1b-G2-01 拖拽光标族。
- **严重程度**: P3
- **用户影响**: 与图节点/dashboard 面板同族——可拖性靠尝试发现；地图场景用户对"能不能拖"更不敏感，放大镜按钮成为唯一显式操作入口（而该按钮仅 10×22，见维持项）。
- **修复方向**: `flux-renderers-map/src/map-renderer.tsx` 容器加 `cursor-grab`（pan 进行中 `cursor-grabbing`），或引入 OL 默认样式后按要素类型切 pointer。
- **归族**: watch-only → 台账（并入 R2-1b-G2-01 拖拽光标族；与 R2-2c-G2-127/128 同批）
- **复核状态**: 未复核

## 4. R2-1c 页单元裁定复检对照（本波现状，均"维持"，不重复立项）

| R2-1c 条目                                                                 | 现状探针值（2026-09-25）                                                                                                                                                   | 结论                             |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| R2-1c-C6-01 Region/边界卡整版空白（P1）                                    | `pixels nonBg 0/0/0`（三画布稀疏采样零内容像素）+ 截图空板；源码 `map-layer-manager.ts` `readFeatures(build.featureCollection)` 仍**未传 `featureProjection`**（L148-150） | **维持**                         |
| R2-1c-A3-01 ol.css 缺失、按钮 10×22、ol-hidden 常驻、attribution 0×0（P2） | `olButtons [10.4×22 "+", 9×22 "–", 14×20 ⇧(ol-hidden disp:block), 0×0 i]` 全数复现                                                                                         | **维持**                         |
| R2-1c-B3-01 cluster 无计数、填充不走色阶（P2）                             | light 纯黑点、dark 纯白点（`map-pin-after-zoom-dark-1280.png` 放大后仍无计数文本）；`buildClusterStyle` 多点分支源码未变（fill=accent 0.65、text=theme.text）              | **维持**                         |
| R2-1c-B5-01 dark 页头 bg-white 不可见（P2）                                | headerBg rgb(255,255,255)、h1 1.19:1（真 data-mode）                                                                                                                       | **维持**                         |
| 积极面：缩放控件功能                                                       | Pin 卡点击"+"后画布 dataLen 8582→10150（视图重绘）、放大点尺寸增大                                                                                                         | 功能在（可用性受 A3 维持项制约） |

## 5. 已知族命中（引用，不另立项）

- 拖拽光标族（R2-1b-G2-01）：R2-2c-G2-129。
- C2 控件叠内容（R2-1c-A3-01 并入面）：ol 控件叠地图左上，ol.css 到位后由 styles.css 令牌化定位收敛。
- i18n：无新增（页头混排为 demo 作者文案）。

## 6. 交互键（上报主 session 合并）

`map-demo` 无既有键，上报新键（缩放中间态可程序化复现）：

```json
{
  "map-demo": [
    { "action": "waitFor", "selector": ".nop-map canvas", "ms": 2000 },
    { "action": "click", "selector": ".ol-zoom button" },
    { "action": "waitFor", "ms": 600 }
  ]
}
```

## 7. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `map`（control）→ carded；
  R2-2c-G2-129 → watch（拖拽光标族）；四处 R2-1c 维持项不改判原裁定；归族后 → digested。
