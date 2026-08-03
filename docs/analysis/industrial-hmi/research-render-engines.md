# 渲染引擎（LeaferJS / Konva.js / Fabric.js）源码调研报告 research-render-engines.md

> 日期：2026-08-03
> 版本：v1（I0.2 产出）
> 调研项目：LeaferJS 系列（leafer / leafer-ui / leafer-in / leafer-editor / LeaferJS 集成仓，均 v2.2.9）+ Konva.js v10.3.0 + Fabric.js v7.4.0
> 参考仓库：`~/sources/industrial-hmi-research/leafer/`、`leafer-ui/`、`leafer-in/`、`leafer-editor/`、`LeaferJS/`、`konva/`、`fabric.js/`
> 上游依据：讨论文件 `docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md` §三/§五；下载清单 `research-download.md`（I0.1）
> 下游：`research-scada-apps.md`（I0.3）、`research-summary.md`（I0.5）、I1.1 review gate

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent 反复审查直到共识。记录如下：

- **Round 1（2026-08-03）**：独立 agent（fresh session，task `ses_039358164ffec6T1QFWhREdOFz`）审查，判定 `REVISE`——2 Major + 12 Minor 修正项（§7 Platform 引用错文件/@leafer-in/html 插件遗漏/EditPoint 行号/Stage 行号/isVisible 行号/cache-clearCache 行号/loadFromJSON 行号/toSVG 归属/copyCanvasByWorld 调用链/shapes 文件数/copyWorld 行号/useCanvas 行号/\_\_layout 行号），除 3 处行号外全部落地。
- **Round 2（2026-08-03）**：独立 agent（fresh session，task `ses_03915bcfcffek27BuLKVl0ZHjV`）确认轮，判定 `REVISE`——复核发现 R1 中 3 处行号修正本身与实源不符（`isVisible` 应为 `Container.ts:359`、`clearCache` 应为 `Node.ts:369-379`、`cache()` 声明应为 `Node.ts:424`——R1 前原文即正确），已回退为实源值并与 §12#18 一致；其余 11 项确认落地。
- **Round 3（2026-08-03）**：独立 agent（fresh session，task `ses_03909018effeL3olIBrVYDrOgi`）确认轮，判定 `AGREE`——3 处回退全部核验（Container.ts:359 / Node.ts:369-379 / Node.ts:424-530 与 §12#18 一致），**零新增修正项，达成共识**（共识循环：R1-R2 修正 2 轮 + R3 确认轮，未超轮次上限）。
- **终轮复核说明**：I1.1 review gate 为本文件「文档共识审查」的终轮复核（不叠加额外审查轮，roadmap Cross-Cutting）。

---

## 1. 调研概要

| 引擎                  | 版本    | 定位                                                                                             | 场景图                                   | 局部重绘                                                | 命中检测                               | 渲染调度                             |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------- | -------------------------------------- | ------------------------------------ |
| LeaferJS（leafer-ui） | v2.2.9  | 面向"百万图形/海量图层"的重构型 Canvas 2D 场景图引擎（README 自述，`leafer-ui/README.md:11-14`） | Leaf/Branch 树 + UI 族 + Leafer/App 容器 | 有（Layouter partLayout + Renderer partRender，块合并） | 几何预检 + 逐图元 hitCanvas 路径/像素  | Watcher→Layouter→Renderer 三段式调度 |
| Konva.js              | v10.3.0 | 通用成熟 Canvas 场景图库（Node/Container/Layer/Stage）                                           | Node 树 + Layer 层                       | 无（Layer 级全量重绘，`Layer.ts:391-410`）              | 每 Layer 一张 hitCanvas 颜色键像素命中 | batchDraw 合并到下一帧               |
| Fabric.js             | v7.4.0  | 对象模型 + SVG 解析编辑器框架                                                                    | 扁平对象数组 + Group                     | 无（整场景重绘，`StaticCanvas.ts:607-611`）             | 对象遍历 + containsPoint（可选像素）   | requestRenderAll 合并到下一帧        |

---

## 2. LeaferJS 系列场景图架构

### 2.1 类层次与模块化

- **核心类**：`Leaf`（`leafer/packages/display/src/Leaf.ts:25`）是所有节点基类（含唯一 `innerId`、`__world`/`__local` 矩阵、`__layout`、事件映射）；`Branch`（`leafer/packages/display/src/Branch.ts:20`）是容器基类（`children`/`topChildren` 数组，`Leaf.ts:112-113`），`add/remove/clear` 与层级维护在此实现（`Branch.ts:71-146`）。
- **UI 族**：`leafer-ui` 以装饰器 + 模块注入扩展核心：`UI`（`leafer-ui/packages/display/src/UI.ts:16`，重写 Box 语义）→ `Group`（`leafer-ui/packages/display/src/Group.ts:12`，`isBranch=true`、可挂 `topChildren` 覆盖物）→ `Box`（`Box.ts:16-20`，`isBranchLeaf=true`，即"作为整体渲染的容器"）→ `Frame`（`Frame.ts:10`）。具体图形 Rect/Path/Line/Text/Image/Pen 等平铺于 `leafer-ui/packages/display/src/`。
- **容器**：`Leafer`（`leafer-ui/packages/display/src/Leafer.ts:13`）是每个 canvas 实例的根；`App`（`leafer-ui/packages/app/src/App.ts:10-22`）聚合多个 Leafer 子画布并预置 **ground/tree/sky 三层**（`App.ts:20-22`），`App.__render` 用 `canvas.copyWorld` 合成各子画布（`App.ts:120-122`）。
- **display-module 机制**：渲染/布局/事件/矩阵/边界逻辑以模块对象注入，如 `@useModule(LeafDataProxy)@useModule(LeafMatrix)@useModule(LeafBounds)@useModule(LeafEventer)@useModule(LeafRender)`（`Leaf.ts:20-24`），Branch 再注入 `BranchRender`（`Branch.ts:19`）。模块常量定义于 `leafer/packages/display-module/display-module/src/`（BranchRender/LeafBounds/LeafDataProxy/LeafEventer/LeafMatrix/LeafRender 六个文件）。`@leafer/partner`（`leafer/packages/partner/partner/src/index.ts:1-37`）把 watcher/layouter/renderer/selector 四个调度器通过 `Creator` 注入——这是"partner 可替换"架构（官方声明引擎可裁剪）。
- **数据层**：属性经 `LeafData` + `@dataProcessor` 处理（`Leaf.ts:35-36`），`forceUpdate` 按属性类别走 `doBoundsType/doSurfaceType/doStrokeType` 快速路径（`Leaf.ts:236-250`）。

### 2.2 渲染树与渲染顺序

- 渲染树即节点树：`BranchRender.__renderBranch` 依 `children` 顺序递归渲染，视口外的子节点被 `excludeRenderBounds` 裁剪跳过（`leafer/packages/display-module/display-module/src/BranchRender.ts:54-71`；裁剪判定 `leafer/packages/display-module/helper/src/LeafBoundsHelper.ts:36-40`）。
- 每个叶子 `LeafRender.__render` 设置 world 变换后走 `__draw`（`leafer/packages/display-module/display-module/src/LeafRender.ts:8-42`）；`UI.__draw` 对含效果（阴影/滤镜/混合）元素用临时离屏 canvas 渲染再合成，无效果元素走 `drawFast` 快路径（`leafer-ui/packages/display-module/render/src/UIRender.ts:35-95`、`drawFast` 于 :119-130）。
- 图层分层：App 级 ground/tree/sky 三层（`App.ts:20-22`），sky 通常承载编辑器覆盖物；`topChildren` 用于滚动条等覆盖物（`Group.ts:30`）。

### 2.3 坐标与变换模型

- 每个 Leaf 维护 `__world`（含 bounds）、`__local`、`__cameraWorld`（相机矩阵渲染用）与 `__layout`（`Leaf.ts:56-74`）；`__level` 记录树深度（`Leaf.ts:86`，`__bindLeafer` 时 `parent.__level+1`，`Leaf.ts:178`）。
- 世界/局部/内框/外框多套 bounds：`LeafLayout` 提供 content/box/stroke/render 四套 bounds 的 local/world 版本与延迟计算 getter（`leafer/packages/display-module/layout/src/LeafLayout.ts:21-52`）。
- 坐标转换 API 成体系：`worldToLocal/localToWorld/worldToInner/innerToWorld`（`Leaf.ts:331-358`）、`getInnerPoint/getLocalPoint/getPagePoint/getWorldPoint`（`Leaf.ts:362-424`）、`move/scaleOf/rotateOf/skewOf` 与 world 版本（`Leaf.ts:437-477`）。
- **视口（viewport）由插件实现**：`@leafer-in/viewport` 重写 `Leafer.initType/getValidMove/getValidScale`（`leafer-in/packages/viewport/src/Leafer.ts:12-44`），拖拽/滚轮/手势经 `zoomLayer` 矩阵平移缩放（`leafer-in/packages/viewport/src/type/viewport.ts:31-48`，`zoomLayer.scaleOfWorld(e, changeScale)`）。`zoomLayer` 默认即 Leafer 自身（未装插件时世界=视口，`leafer-ui/packages/decorator/src/data.ts:30-42`）。
- 变换脏标记：`matrixChanged/scaleChanged/rotationChanged/boxChanged/strokeChanged/renderChanged/surfaceChanged/opacityChanged/hitCanvasChanged`（`LeafLayout.ts:59-91`），`partLayout` 只重算脏元素（见 §3.2）。

### 2.4 事件模型

- **节点事件**：`Eventer` 提供 DOM 风格 `on/off/once/emit`，监听器分 `__captureMap/__bubbleMap` 两张表（`leafer/packages/event/src/Eventer.ts:11-133`）。
- **交互分发**：`InteractionBase`（`leafer-ui/packages/interaction/interaction/src/Interaction.ts:14`）管理 pointer/move/zoom/rotate/key 状态机与拖拽（`Dragger`，:62-77）；`pointerDown/pointerMove/pointerUp`（:96-196）中经 `selector.getByPoint` 命中（`findPath`，:361-369）。
- **捕获/冒泡**：`emit` 按命中路径先自根向下 capture、再自目标向上 bubble（`leafer-ui/packages/interaction/interaction/src/emit.ts:21-33`），`event.isStop` 中断（:61）；App 级事件（move/zoom/rotate/key）会广播给未命中但 hittable 的其他 Leafer 子画布（:40-49）。
- **Web 绑定**：`interaction-web` 把原生事件挂到 canvas view 与 window（`leafer-ui/packages/interaction/interaction-web/src/Interaction.ts:42-93`），PointerEvent>TouchEvent>MouseEvent 优先级选择（:47-79）。

---

## 3. 百万图形机制（脏区/局部重绘/批量渲染）

### 3.1 三段式调度链路

属性变化 → `Watcher`（收集 updatedList，`leafer/packages/partner/watcher/src/Watcher.ts:63-83`）→ `Layouter`（partLayout 重算脏元素矩阵/bounds，`leafer/packages/partner/layouter/src/Layouter.ts:103-131`）→ `Renderer`（partRender 只重绘脏块，`leafer/packages/partner/renderer/src/Renderer.ts:160-184`）。`Leafer.init` 按序创建三者（`leafer-ui/packages/display/src/Leafer.ts:127-132`）。

### 3.2 局部布局（partLayout）

- 开关：`Layouter.config.usePartLayout: true`（`Layouter.ts:27`）；首次 `fullLayout`，之后 `totalTimes>1` 走 `partLayout`（`Layouter.ts:89-93`）。
- `partLayout` 只对 `updatedList` 中元素：`getBlocks` → `updateMatrix`（按 `__levelList` 层级排序保证父先子后，`Layouter.ts:110-118`）→ `updateChange`。布局脏标记（§2.3）避免无关元素重算。
- Watcher 侧节流：`changed < 100` 才发 `RenderEvent.REQUEST`（`Watcher.ts:56-61`），防止一帧内海量属性变化触发冗余渲染；`usePartLayout` 时新增子元素整树入 updatedList（`Watcher.ts:72-97`）。

### 3.3 局部渲染（partRender）

- 开关：`Renderer.config.usePartRender: true`、`ceilPartPixel: true`（`Renderer.ts:24-28`）。
- 每次布局结束按 `LayoutEvent.END` 的 blocks 收集脏区（`Renderer.ts:279-293`），`mergeBlocks` 合并为单块（`Renderer.ts:225-233`），`clipRender` 对脏块 `clip + clear + 重绘 + 扩大 10px 防残影`（`Renderer.ts:168-184`，`clipSpread=10` :30）。
- 渲染遍历中 `excludeRenderBounds` 跳过视口外元素（`LeafBoundsHelper.ts:36-40` + `BranchRender.ts:65`），配合 `lazySpeard: 100` 的惰性边界（`leafer-ui/packages/display/src/Leafer.ts:71,225`）。
- 帧调度：rAF + maxFPS 限帧 + FPS 滑动平均（`Renderer.ts:235-260`）。

### 3.4 画布栈与离屏

- 主画布外，`__single`（需整体渲染，如透明度混合/遮罩）元素经 `canvas.getSameCanvas()` 取同尺寸临时画布渲染后由 `LeafHelper.copyCanvasByWorld` 合成（`LeafHelper.ts:92-96`，其中 `__worldFlipped || Platform.fullImageShadow` 时走 `copyWorldByReset`，否则 `copyWorldToInner`；`LeaferCanvasBase.ts:328-345` 提供 getSameCanvas/recycle）。
- 画布池：`CanvasManager.get` 复用同尺寸 recycled 画布（`leafer/packages/canvas/canvas/src/CanvasManager.ts:13-32`），渲染帧尾 `clearRecycled` 销毁（`LeaferCanvasBase.ts:339-345`；`Leafer.ts:240`）。
- world→像素变换统一在 `setWorld`（含 pixelSnap 半像素对齐，`LeaferCanvasBase.ts:135-147`）；`clipWorld/clearWorld/fillWorld` 为像素对齐封装（`LeaferCanvasBase.ts:267-303`），`copyWorld` 在 :210。

### 3.5 图像缓存

- `ImageManager.get` 以 URL 为键经 `Resource` 全局缓存图片实例并引用计数（`leafer/packages/image/image/src/ImageManager.ts:12-19`），`recycle/clearRecycled` 按 `use` 计数与 `maxRecycled: 10` 回收（:21-47）；超大图（>2K 基准 `maxCacheSize`）直接移除避免占内存（:26-27，`Platform.image` 阈值定义于 `leafer/packages/platform/platform/src/Platform.ts:16-19`）。

### 3.6 「官方 100 万图元」技术基础判定

| 官方声明                                                                             | 源码支撑                                                                                                                                                                                                                                                                                          | 判定                                                                                  |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 100 万可交互矩形首屏 1.28s / 320MB / 拖动 60fps（`leafer-ui/README.md:11-14,58-68`） | ① 首屏创建无逐元素重排：首次 `fullLayout` 一次遍历 + `fullRender` 一次全量绘制（`Layouter.ts:133-151`、`Renderer.ts:186-196`）；② 拖动只走脏区：单元素移动 → partLayout/partRender 只重绘其旧/新 bounds 合并块（`Renderer.ts:160-184`）；③ 命中无需每帧重绘 hitCanvas：几何预检失败直接排除（§4） | **机制上支撑**：创建为 O(n) 单遍 + 交互为 O(脏块)，无全场景重复开销                   |
| 内存 320MB                                                                           | 无显式上限计数，但 `leafer.leafs` 计数器只统计不限制（`Leaf.ts:172-178`）；节点为紧凑对象 + 惰性 layout（`LeafLayout.ts:59-91` 状态位复用）                                                                                                                                                       | 合理，但**官方自报、无独立复测**（I0.1 已校准，见 `research-download.md:83-91`）      |
| 拖动 60fps                                                                           | 帧调度 rAF + `maxFPS` + 节流（`Renderer.ts:235-260`、`Watcher.ts:56-61`）                                                                                                                                                                                                                         | 支撑                                                                                  |
| 百万图元上限                                                                         | **无**——引擎对节点数无硬编码上限；未发现针对百万的专门优化路径（如空间索引），**性能依赖：视口裁剪 + 局部重绘 + 单次全量创建**                                                                                                                                                                    | 结论：官方数字**机制上可信**，但依赖场景特征（静态矩形、单点交互），I1.2 spike 需复测 |

---

## 4. 命中检测实现（@leafer-ui/hit）

- **两阶段**：先几何预检（`eachFind` 逆序深度优先遍历子节点，`hitRadiusPoint(child.__world, ...)` 包围盒碰撞，`leafer/packages/partner/selector/src/Picker.ts:144-167`），命中后才对候选调 `__hitWorld`（:169-185）。
- **逐图元 hitCanvas**：`LeafHit.__hitWorld`（`leafer-ui/packages/hit/src/LeafHit.ts:22-47`）——先 `hitRadius/hitBox/isSmall` 包围盒快路径（:36-39），再按需（`hitCanvasChanged`）重建 hitCanvas：`UIHit.__updateHitCanvas` 用离屏 canvas 绘制填充/描边路径（path 型）或像素级（pixel 型，`willReadFrequently`，`UIHit.ts:9-46`）；`__hitFill/__hitStroke/__hitPixel` 分别做路径点命中与像素 alpha 命中（`LeafHit.ts:49-53`）。
- **命中画布池**：`HitCanvasManager` 复用最多 **1000 张** hit canvas（`leafer-ui/packages/hit/src/HitCanvasManager.ts:7-46`），避免百万图元每元素一张 canvas 的内存爆炸——这是可交互百万图元的关键机制（每图元只缓存自己的小尺寸命中路径）。
- **无空间索引**：`Picker.eachFind` 为 O(children) 全遍历（`Picker.ts:148-167`），依赖包围盒快速排除 + 命中画布缓存，**未发现 R-tree/四叉树等空间索引**（搜索 `leafer-ui/packages/hit` 与 `selector` 源码确认）。命中优化点为：逆序（上层优先）、`topChildren` 覆盖物优先（`Picker.ts:159`）、`hitThrough/hitSelf/hitRadius` 属性细控（:169-185）。
- 编辑器虚拟框通过 `bottomList` 参与命中（`Picker.ts:75-80`）。

---

## 5. Editor 插件能力边界（@leafer-in/editor）

- **对外能力**（`leafer-in/packages/editor/src/Editor.ts:24`，`@useModule(TransformTool)` :23）：
  - 选中/多选：`select/addItem/removeItem/shiftItem`（:102-130）、`multiple/single` 状态（:54-55）；框选由 `EditSelect`（`display/EditSelect.ts:16`，`selectArea` :28，拖拽框选 :156-177）。
  - 拖拽/缩放/旋转/斜切：`TransformTool.onMove/onScale/onRotate/onSkew`（`tool/TransformTool.ts:25-125`），支持 shift 锁定比例/轴、alt 锚点、动画回弹（`LeafHelper.animateMove` :49）。
  - 控制点：`EditBox` 提供 `rect` 选中框、`circle` 旋转点、`resizePoints/rotatePoints` 8 向控制点、`dragPoint` 拖拽状态（`display/EditBox.ts:29-41`；`EditPoint` 于 `display/EditPoint.ts:6`）。
  - 成组/解组/进出组/层级/锁定：`group/ungroup/openGroup/closeGroup`（`Editor.ts:254-295`）、`toTop/toBottom`（:386-398）、`lock/unlock`（:374-382）。
  - 配置（`config.ts:5-45`）：`moveable/resizeable/flipable/rotateable/skewable`、`multipleSelect/boxSelect/hover`、`select: 'press'`、`editSize` 等。
  - 编辑事件族：`EditorEvent/EditorGroupEvent/EditorMoveEvent/EditorScaleEvent/EditorRotateEvent/EditorSkewEvent`（`leafer-in/packages/editor/src/event/`）。
- **聚合**：`leafer-editor` 仅一行 `export * from '@leafer-editor/web'`（`leafer-editor/src/index.ts:1`），`packages/partner` 聚合 `@leafer-in/editor/viewport/view/scroll/arrow/find/export/resize/color/scale-fixed` 等官方插件（`leafer-editor/packages/partner/package.json`）。Editor 本体是**独立 Group 节点**（`Editor.ts:96-98` 将 editMask/selector/editBox 挂为自身子节点），作为 sky 层叠加。

---

## 6. Flex 布局

- **存在性确认**：布局引擎为官方插件 **`@leafer-in/flow`**，核心是 `Flow` 组件（`leafer-in/packages/flow/src/Flow.ts:7-21`，`@autoLayoutType('x')` 声明 `flow` 属性，构造时 `__hasAutoLayout = true`）。
- **实现层次**：核心引擎预留自动布局钩子——`__updateLocalBoxBounds → __updateAutoLayout`（`leafer/packages/display-module/display-module/src/LeafBounds.ts:127-131,156-182`），`flow` 属性存在时调 `__updateFlowLayout`（:162-165）并在布局中重排子元素；`Flow` 插件实现 `flowX/flowY` 两种主轴算法（`leafer-in/packages/flow/src/layout/flowX.ts:19-98`、`flowY.ts`），支持 wrap 换行、`grow` 弹性增长（`x/grow.ts`）、`gap/autoGap`（`common/gap.ts`）、`align` 对齐（`x/align.ts`、`common/align.ts`）、`reverse` 反向（`flowX.ts:19`）。
- **定性**：这是**简化版 flex**（仅一维主轴 x/y + 换行 + gap + grow + align），**非 CSS flexbox 全实现**（无 flex-direction 混排、无 order、无 flex-basis 百分比弹性语义）；且为官方插件、非 leafer-ui 核心。对组态场景够用（仪表盘排列），复杂弹性布局需自研或接受简化模型。

---

## 7. Web/Node 双端（跨平台声明）

- **平台抽象**：`Platform` 单例承载 `toURL`/`image`/`setPatternTransform`（`leafer/packages/platform/platform/src/Platform.ts:8-71`）；`origin`（createCanvas/loadImage 等环境原语）、`event`、`requestRender`、`devicePixelRatio` 等能力**接口定义**于 `leafer/packages/interface/src/platform/IPlatform.ts:21-67`，运行时由 web-core/node-core 注入（`web-core/src/index.ts:19-79`、`node-core/src/index.ts:28-78`）。
- **双端实现**：`@leafer/web-core` 注入 web 原语——`Platform.name='web'`、`requestAnimationFrame`、`useCanvas` 可换 canvas 实现（`leafer/packages/core/web-core/src/index.ts:76-79`、`useCanvas` 于 :19-74）；`@leafer/node-core`——`Platform.name='node'`、`setTimeout(16)` 模拟帧、`useCanvas('skia'|'napi')` 接入 skia-canvas（`leafer/packages/core/node-core/src/index.ts:75-78`、:28-74）。canvas 实现类分开：`canvas-web/src/LeaferCanvas.ts`（HTMLCanvasElement，:36-59,67-69）vs `canvas-node/src/LeaferCanvas.ts`。
- **结论**：官方「Web/Node/小程序/worker 跨平台」声明**成立**（同类还有 miniapp-core/worker-core/canvaskit-core 目录，`leafer/packages/core/` 与 `leafer/packages/canvas/` 下），切换面在 Creator.canvas/Platform.origin，与渲染内核解耦。对 flux 而言：浏览器为一线场景，Node 端可用于测试句柄/服务端出图。

---

## 8. 与讨论文件 §三「通用引擎层设计要点」8 条对照

| #   | 设计要点（讨论文件 §三）                                         | leafer 现状（源码证据）                                                                                                                                                                                                                                                                                                                                                                             | 结论                                                    |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | 场景图 + 脏区/局部重绘 + 图层分层（背景/图元/交互/HTML 覆盖层）  | 场景图 ✅（§2.1）；脏区/局部重绘 ✅（partLayout/partRender，§3）；图层分层 ✅ App ground/tree/sky + `topChildren`（`App.ts:20-22`、`Group.ts:30`）——**DOM 覆盖层（canvas 之上的 HTML overlay layer）无内置需自研**；但 in-canvas HTML 渲染有官方插件 `@leafer-in/html`（`HTMLText` 经 SVG `<foreignObject>` 渲染 HTML，`leafer-in/packages/html/src/HTMLText.ts:10-11`，插件注册 `index.ts`）可评估 | 自带（DOM 覆盖层自研；in-canvas HTML 有官方插件可评估） |
| 2   | 坐标变换：世界坐标 ↔ 视口坐标，缩放/平移/旋转                    | ✅ 全套坐标 API（`Leaf.ts:331-477`）+ viewport 插件（`leafer-in/packages/viewport/src/type/viewport.ts:31-48`）                                                                                                                                                                                                                                                                                     | 自带                                                    |
| 3   | 数据绑定层：点表/变量表 → 图元属性 → 动画 → 事件，订阅与节流刷新 | 属性→动画→事件链路 ✅（`animate` 插件 + 事件系统）；订阅与节流部分 ✅（watcher 节流 `Watcher.ts:56-61`）——**点表/变量表模型不存在**（leafer 无数据绑定概念），需自研组态语义层；属性刷新可走 `leaf.set()` 批量 + `forceRender` 局部重绘                                                                                                                                                             | 自研（组态语义层）                                      |
| 4   | 状态驱动动画（多状态呈现：运行/停止/故障/闪烁/流动/旋转）        | 动画原语 ✅（`@leafer-in/animate` 的 `Animate/Transition`，`leafer-in/packages/animate/src/`；`@leafer-in/state` 提供 `hoverStyle/pressStyle` 状态样式，`leafer-in/packages/state/src/index.ts:17-31`）——**业务状态机（运行/停止/故障映射）需自研**，但图元属性动画直接可用                                                                                                                         | 半自带（状态机自研）                                    |
| 5   | 命中检测与交互（拖拽、缩放、旋转、多选、事件冒泡）               | ✅ 命中（§4）+ 拖拽/缩放/旋转/多选（Editor 插件，§5）+ 冒泡（`emit.ts:21-33`）——拖拽缩放旋转多选属**编辑器交互**，讨论文件已决定本期不做（Q8），运行时图元点击事件直接可用                                                                                                                                                                                                                          | 自带                                                    |
| 6   | 图元注册机制（registerScadaSymbol）                              | 部分 ✅：`@registerUI()` + `UICreator.get(tag)` 按 tag 创建节点（`Branch.ts:77`；`UI.ts:2` 引入 `registerUI`）——即**已有按 tag 的节点注册表**，可映射为 `registerScadaSymbol`；但无"符号实例化 + 参数化"语义                                                                                                                                                                                        | 自带注册表，符号语义自研                                |
| 7   | 组态 JSON 序列化/反序列化（schema ↔ 场景图）                     | 序列化 ✅：`toJSON/toString`（`Leaf.ts:214-221`，`skipJSON` 排除 :51）；**反序列化** ✅：`add(JSON)` 经 `UICreator.get(tag, data)` 重建（`Branch.ts:75-78`）——但导出格式为 leafer 属性直出（含内部字段），**无 schema 版本/自定义字段约定**，组态 JSON 格式需自研                                                                                                                                   | 半自带（格式层自研）                                    |
| 8   | React 桥接（命令式引擎 + 声明式 props）                          | ❌ leafer 无 React 适配（核心为零依赖、平台无关）；官方仅提供 JS 命令式 API                                                                                                                                                                                                                                                                                                                         | 自研（ref/effect 桥接）                                 |

**总评**：leafer 提供的是**渲染内核级能力**（场景图/脏区/坐标/命中/动画/编辑/序列化原语），讨论文件 §三 8 条中 **#1、#2、#5 可直接复用**，#4、#6、#7 有原语需包一层组态语义，#3、#8（点表绑定、React 桥接）为纯自研。与讨论文件「LeaferJS 底座 + 自研组态语义层」的决策方向一致（`discussion:125`）。

---

## 9. Konva.js 深度（v10.3.0）

### 9.1 场景图模型

- 类层次：`Node`（`konva/src/Node.ts:248`，3543 行，含 attr 系统/事件/变换/缓存）→ `Container`（`Container.ts`，children 管理）→ `Group` / `Layer`（`Layer.ts:59`）→ `Stage`（`Stage.ts:157`，DOM 容器 + 事件绑定 + 指针位置管理）。Shape 抽象 + 具体形状在 `shapes/`（Rect/Circle/Path/Text/Image/Line/Transformer 等 17 个文件）。
- 事件：DOM 事件统一挂 `Stage.content`（`Stage.ts:462-471`，EVENTS 表 :45-64），事件冒泡经 `_fireAndBubble`（`Node.ts:2492+`）。
- **层模型差异**：Stage 内多个 Layer 各自拥有独立 `<canvas>`（`Stage.ts:425`），官方建议 **3-5 层上限**（`MAX_LAYERS_NUMBER=5`，超限 warn，`Stage.ts:412-418`）。

### 9.2 渲染批处理与脏机制

- `batchDraw`：把一次绘制合并到下一 rAF（`Layer.ts:299-308`），属性变更经 `_requestDraw → getLayer().batchDraw()`（`Node.ts:2454-2458`）。
- `draw()` = `drawScene + drawHit`（`Node.ts:2609-2613`）；**无脏区/局部重绘**——Layer 每次绘制先 `clear()` 整层再全量重绘子树（`Layer.ts:391-410`；`Container._drawChildren` 递归 `Container.ts:396-446`）。每 Layer 另有一张同步维护的 hitCanvas（`Layer.ts:61`），**scene 与 hit 双倍绘制成本**。
- 视口内裁剪：仅通过 Group/Layer `clip`（`Container.ts:407-424`），**无自动视口剔除**（`isVisible` 只查自身可见性，`Container.ts:359`）。

### 9.3 命中检测

- 颜色键像素命中：每个 Shape 分配唯一 `colorKey`（`Shape.ts:195-223`），`drawHit` 用 `hitFunc || sceneFunc` 绘制到 hitCanvas（`Shape.ts:722-765`），`Layer._getIntersection` 读 `getImageData` 单像素反查 `shapes[colorKey]`（`Layer.ts:359-390`），`getIntersection` 带抗锯齿螺旋搜索（`Layer.ts:324-358`）；`Shape.intersects` 用共享 `stage.bufferHitCanvas`（`Shape.ts:462-478`）。
- 点命中整体为 **O(命中画布读取)** + 每层一次像素读，交互移动时 hit 画布无需重绘（除非子节点变化）——这是 Konva 相对全重绘的主要优化点。

### 9.4 缓存

- `Node.cache(config)`（`Node.ts:424-530`）生成 scene+hit+filter 三张离屏 canvas，`clearCache` 释放（`Node.ts:369-379`）；缓存命中时 `drawScene` 直接 drawImage（`Container.ts:363-369`）。

### 9.5 性能档位判断（源码依据）

| 优化点                | 证据                                                                  | 结论                                       |
| --------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| FastLayer（无事件层） | `FastLayer.ts:18-29`，**官方已废弃**，推荐 `Layer({listening:false})` | 手动分层仍是唯一手段                       |
| 缓存                  | `Node.cache`（§9.4）                                                  | 静态复杂元素可用                           |
| 裁剪                  | `clipWidth/clipHeight/clipFunc`（`Container.ts:398-424`）             | 手动视口裁剪可配                           |
| 事件监听关闭          | `listening(false)` 跳过 hit 绘制（`Layer.ts:411-421`）                | 纯展示层省 hit 成本                        |
| 无自动剔除/无脏区     | `Layer.ts:391-410` 全量重绘                                           | 万级图元 + 局部刷新需**自建**脏区/分层策略 |

**档位**：中等（官方无百万 benchmark；万级静态可用，实时局部刷新需架构补偿）。

### 9.6 React 集成（react-konva 模式）

- konva 本身零 React 依赖（`konva/package.json` 无 react）；**react-konva 为独立生态包**（conva 声明式组件化：`<Stage>/<Layer>/<Rect>` 组件 ↔ 命令式 Node，props 变更经 `shouldComponentUpdate` 映射到 `setAttr` + `batchDraw`）。本仓源码可佐证其映射面：attr 变更系统 `_setAttr`（`Node.ts:2460-2477`）与 `batchDraw` 调度（`Node.ts:2454-2458`）即 react-konva 的桥接点。

---

## 10. Fabric.js 深度（v7.4.0）

### 10.1 对象模型

- `FabricObject`（`fabric.js/packages/core/src/shapes/Object/Object.ts:178`）为一切对象基类（属性/变换/缓存/序列化/事件），`Canvas/StaticCanvas`（`canvas/Canvas.ts:73`、`canvas/StaticCanvas.ts`）为容器；`Collection` 管理对象数组；Group/ActiveSelection 组成对象图。**场景图为"对象数组 + 可选 Group 嵌套"，非节点树模型**。
- 环境抽象：`getEnv`（`packages/browser/src/env.ts:11-23`）与 node 端（`index.node.ts`）切换 document/Canvas 实现。

### 10.2 渲染循环

- `requestRenderAll`：合并到下一帧 `requestAnimFrame`（`StaticCanvas.ts:490-494`），`renderAll → renderCanvas`（:464-470、:534-560）。
- **无脏区**：`_renderObjects` 每帧遍历**全部对象**调 `render`（`StaticCanvas.ts:607-611`）；唯一剔除是 `skipOffscreen && !isOnScreen()` 的视口外跳过（`Object.ts:654-661`），viewPort 变换整体 `ctx.transform` 一次（`StaticCanvas.ts:549-553`）。

### 10.3 对象缓存

- `shouldCache/needsItsOwnCache`（`Object.ts:750-775`）+ `renderCache`（离屏 canvas 缓存，`isCacheDirty` 判定，:683-702），渲染时 `drawCacheOnCanvas`（:668-675）。缓存为对象级位图（不是场景级块），适合静态复杂对象。

### 10.4 SVG 导入导出

- 导入：完整 SVG parser 模块（`packages/core/src/parser/`：parseSVGDocument/loadSVGFromString/parseTransformAttribute/elements_parser 等 30+ 文件）；导出：`toSVG`（`FabricObjectSVGExportMixin.ts:145`）/`toObject`/`toJSON`（`Object.ts:1756+`、`StaticCanvas.ts:785-804`），`loadFromJSON`（`StaticCanvas.ts:1241`）。**SVG 能力是 fabric 最成熟部分**。

### 10.5 事件体系与命中

- 事件：`Observable`（`packages/core/src/Observable.ts:11+`）on/off/fire + 冒泡（object→group→canvas）；鼠标交互在 `SelectableCanvas`。
- 命中：`findTarget`（`SelectableCanvas.ts:760-852`）→ `searchPossibleTargets/_searchPossibleTargets` 从顶层**逆序遍历对象数组**（:934-962）→ `_checkTarget` 包围盒 + 可选 `perPixelTargetFind` 像素级（:903-919）。**无空间索引，O(对象数)**。

### 10.6 性能档位

全场景每帧重绘（`StaticCanvas.ts:607-611`）+ 对象级缓存（`Object.ts:683-702`）+ 可选像素命中（`SelectableCanvas.ts:911-918`）；SVG 解析与序列化成熟。**档位：中低**——适合编辑器/静态图，实时高频局部刷新场景架构上不支持（无脏区、无场景级缓存、命中 O(n)）。

### 10.7 React 集成模式

- 官方 README 演示**命令式模式**：`useRef + useEffect` 创建 `fabric.Canvas`、显式 dispose（`fabric.js/README.md:179-193`）——与 flux 计划中的 `scada-canvas` ref/effect 桥接形态一致，可作为 React 桥接范本。

---

## 11. 万级图元 + 每秒多次局部刷新场景对比

| 维度               | LeaferJS                                                                                         | Konva.js                                                          | Fabric.js                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------- |
| 局部重绘           | ✅ 脏块 clip+clear+重绘（`Renderer.ts:160-184`）                                                 | ❌ 层级全量重绘（`Layer.ts:391-410`）                             | ❌ 全场景重绘（`StaticCanvas.ts:607-611`）                |
| 布局增量           | ✅ 脏标记 + level 排序增量更新（`Layouter.ts:103-131`、`LeafLayout.ts:59-91`）                   | ❌ 无布局层（变换即时计算）                                       | ❌ 无布局层                                               |
| 命中成本（交互时） | ✅ 包围盒预检排除绝大多数 + hitCanvas 缓存（`Picker.ts:148-167`、`UIHit.ts:9-46`）               | ✅ hitCanvas 颜色键 O(1) 读像素，但每层一张（`Layer.ts:359-390`） | ❌ O(n) 逆序遍历（`SelectableCanvas.ts:934-962`）         |
| 视口剔除           | ✅ 渲染时自动（`LeafBoundsHelper.ts:36-40`）                                                     | ❌ 手动 clip                                                      | ⚠️ `isOnScreen` 跳过（`Object.ts:654-661`）               |
| 万级刷新成本       | O(脏块面积) 重绘 + O(更新元素) 布局                                                              | O(整层) 重绘 + O(整层) hit 重绘                                   | O(全部对象) 重绘                                          |
| 实时数据点更新路径 | `leaf.set()` → watcher 节流 → partLayout → partRender（`Watcher.ts:56-61`、`Layouter.ts:89-93`） | `attr()` 变更 → batchDraw 整层重绘（`Node.ts:2454-2458`）         | `set()` + `requestRenderAll`（`StaticCanvas.ts:490-494`） |
| 适合度             | **最契合**：三引擎中唯一原生支持「万级图元 + 每秒多次局部刷新」                                  | 中等：万级静态 + 低频刷新可用；实时需自建脏区/多 Layer 分层       | 低：编辑器/静态场景                                       |

**结论**：架构支撑点逐条对比（上表），LeaferJS 在「局部重绘 + 增量布局 + 自动视口剔除 + 命中预检」四项核心支撑上均为源码级原生能力，与「10 万图元 ≥45fps / 1 万点 <200ms」验收目标（`discussion:153`）机制匹配；Konva 需以「多 Layer 手动分层 + cache + listening:false」补偿（维护成本高、hit 双倍绘制）；Fabric 架构不支撑实时刷新档位。**推荐维持讨论文件结论：leafer-ui 为底座**。

---

## 12. 可借鉴设计点清单

| #   | 设计点                                                                         | 价值                           | 来源（仓库/文件）                                                                                                |
| --- | ------------------------------------------------------------------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------- | ------------------- |
| 1   | 三段式调度（Watcher→Layouter→Renderer）解耦脏收集/布局/绘制                    | ★★★ 各阶段独立可测             | `leafer/packages/partner/watcher                                                                                 | layouter | renderer/src/\*.ts` |
| 2   | 属性脏标记位（matrix/bounds/stroke/render/surface 分位）                       | ★★★ 增量布局基础               | `leafer/packages/display-module/layout/src/LeafLayout.ts:59-91`                                                  |
| 3   | 脏块合并 + 扩边 10px 防残影的 clipRender                                       | ★★★ 局部重绘正确性细节         | `leafer/packages/partner/renderer/src/Renderer.ts:160-184`                                                       |
| 4   | Watcher `changed<100` 帧内节流                                                 | ★★★ 防抖动，批量刷新友好       | `leafer/packages/partner/watcher/src/Watcher.ts:56-61`                                                           |
| 5   | 层级排序（`__levelList`）保证父先子后的增量布局                                | ★★★ 树结构增量更新通用方案     | `leafer/packages/partner/layouter/src/Layouter.ts:110-118`                                                       |
| 6   | 渲染遍历中按包围盒剔除视口外子节点                                             | ★★★ 万级场景第一道闸           | `leafer/packages/display-module/helper/src/LeafBoundsHelper.ts:36-40`                                            |
| 7   | 命中两阶段：bounds 预检 + 逐元素命中画布缓存（上限 1000 张池）                 | ★★★ 交互成本与内存平衡         | `leafer-ui/packages/hit/src/LeafHit.ts:22-47`、`HitCanvasManager.ts:7-46`                                        |
| 8   | 同尺寸离屏画布池（CanvasManager get/recycle）                                  | ★★★ 避免每帧建 canvas          | `leafer/packages/canvas/canvas/src/CanvasManager.ts:13-32`                                                       |
| 9   | 图像按 URL 引用计数缓存（Resource + use 计数）                                 | ★★★ 图元库纹理复用             | `leafer/packages/image/image/src/ImageManager.ts:12-47`                                                          |
| 10  | 按 tag 的节点工厂（`UICreator.get(tag, json)` 反序列化）                       | ★★★ 图元注册/JSON 重建直接映射 | `leafer/packages/display/src/Branch.ts:75-78`                                                                    |
| 11  | `toJSON/skipJSON` 可裁剪序列化                                                 | ★★☆ 组态文件体积控制           | `leafer/packages/display/src/Leaf.ts:51,214-221`                                                                 |
| 12  | 插件化 partner 注入（Creator 可替换调度器）                                    | ★★☆ 引擎可裁剪/可替换架构      | `leafer/packages/partner/partner/src/index.ts:1-37`                                                              |
| 13  | 无效果元素快路径（drawFast 跳过离屏合成）                                      | ★★☆ 常态刷新性能               | `leafer-ui/packages/display-module/render/src/UIRender.ts:119-130`                                               |
| 14  | 半像素对齐（pixelSnap）防模糊                                                  | ★★☆ 组态细节质量               | `leafer/packages/canvas/canvas/src/LeaferCanvasBase.ts:141-144`                                                  |
| 15  | 自动布局钩子（`__updateAutoLayout` 接口化）                                    | ★★★ 布局引擎可插拔             | `leafer/packages/display-module/display-module/src/LeafBounds.ts:156-182`                                        |
| 16  | Editor 作为独立 Group 叠加层（editMask/selector/editBox 子节点化）             | ★★★ 编辑器与渲染解耦           | `leafer-in/packages/editor/src/Editor.ts:96-98`                                                                  |
| 17  | 命中路径 capture/bubble 双阶段 + stop 传播                                     | ★★★ 事件体系与 flux 对齐       | `leafer-ui/packages/interaction/interaction/src/emit.ts:21-33`                                                   |
| 18  | 对象级位图缓存（Konva cache / Fabric renderCache，isCacheDirty 判定）          | ★★☆ 静态复杂图元性能           | `konva/src/Node.ts:424-530`、`fabric.js/packages/core/src/shapes/Object/Object.ts:683-702`                       |
| 19  | 颜色键像素命中（Konva colorKey → getImageData 反查）                           | ★★☆ 命中实现备选方案           | `konva/src/Layer.ts:359-390`                                                                                     |
| 20  | 帧调度 rAF 合并 + 限帧 + FPS 统计（Konva batchDraw / Fabric requestRenderAll） | ★★★ 高频刷新批处理             | `konva/src/Layer.ts:299-308`、`fabric.js/packages/core/src/canvas/StaticCanvas.ts:490-494`                       |
| 21  | 命令式引擎 React 桥接范本（useRef+useEffect+dispose）                          | ★★★ `scada-canvas` 桥接参考    | `fabric.js/README.md:179-193`                                                                                    |
| 22  | 完整 SVG parser 模块化设计（fabric `packages/core/src/parser/` 30+ 文件）      | ★★☆ 图元库导入扩展             | `fabric.js/packages/core/src/parser/`                                                                            |
| 23  | 环境抽象（`IPlatform` 接口定义 + web/node-core 注入环境原语）                  | ★★★ Node 测试句柄基础          | `leafer/packages/interface/src/platform/IPlatform.ts:21-67`、`leafer/packages/core/{web,node}-core/src/index.ts` |

---

## 13. 关键结论汇总（供 I0.5 summary 与 I1 引用）

1. **LeaferJS 架构成立性**：场景图/脏区局部重绘/坐标变换/命中/动画/编辑插件/序列化全部有源码实锤（§2-§7）；「100 万图元」官方数字机制上可信（O(n) 首屏 + O(脏块) 交互），但依赖静态场景特征、无空间索引、无独立复测，须 I1.2 spike 复测（§3.6）。
2. **三引擎对比**：万级图元 + 每秒多次局部刷新场景 LeaferJS 唯一原生支撑（§11）；Konva 稳定但需手动分层补偿；Fabric 定位编辑器/静态场景。
3. **组态语义层全部自研**：点表绑定、状态机动画、图元符号语义、组态 JSON 格式、React 桥接为自研项；leafer 提供全部渲染原语与可插拔钩子（§8 表）。
4. **设计提取重点**：调度链路、脏标记、命中两阶段、画布池、按 tag 注册表、可插拔自动布局、Editor 叠加层模型（§12 #1-17）。

---

_参考仓库路径前缀：`leafer` = `/Users/abc/sources/industrial-hmi-research/leafer/`；`leafer-ui` = `/Users/abc/sources/industrial-hmi-research/leafer-ui/`；`leafer-in` = `/Users/abc/sources/industrial-hmi-research/leafer-in/`；`leafer-editor` = `/Users/abc/sources/industrial-hmi-research/leafer-editor/`；`konva` = `/Users/abc/sources/industrial-hmi-research/konva/`；`fabric.js` = `/Users/abc/sources/industrial-hmi-research/fabric.js/`_
