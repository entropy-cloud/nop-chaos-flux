# 通用引擎层设计：引擎架构 design-engine.md

> 日期：2026-08-03
> 版本：v1（I2.1 产出）
> 上游：调研汇总 `docs/analysis/industrial-hmi/research-summary.md`（§2/§4.1/§5）、渲染引擎调研 `docs/analysis/industrial-hmi/research-render-engines.md`（§2-§8/§12）、gate 结论 `docs/analysis/industrial-hmi/gate-1-review.md`（§3 实测/§4 API 风险/§6 约束映射）、讨论文件 `docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md`（§三/§八）
> 下游：`design-data-binding.md`（I2.2）、`design-symbols.md`（I2.3）、`design-renderer.md`（I2.4）；实现 I5（Wave 1）与 I6/I10 引用本文件
> 依据：roadmap `docs/components/roadmap-industrial-hmi.md` I2.1 + Cross-Cutting（性能红线/测试纪律/平台能力复用表）

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent（fresh session）反复审查直到共识（判据：连续一轮 0 新增修正项）。记录如下：

- **Round 1（2026-08-03）**：独立 agent（fresh session）审查，判定 `REVISE`——1 Major（E* 引注错配文件，14 处 `render-engines E*`应为`research-summary.md §4.1 E\*`，其中 changedThreshold 帧内节流应为 E3）+ 2 Minor（头部占位预写判定反模式；`lazySpread`与 leafer 实际键名`lazySpeard`不一致，已对照源码`leafer-ui/packages/display/src/Leafer.ts:71,225` 确认）——修正项全部落地，未裁决项 0。
- **Round 2（2026-08-03）**：独立 agent（fresh session）确认轮，判定 `AGREE`——R1 三项验证落地（E\* 引注 0 残留且编号逐条正确、头部记录事实化、lazySpeard 键名与源码一致），全文轻扫无新增修正项，**达成共识**（共识循环：R1 修正 1 轮 + R2 确认轮，未超轮次上限）。
- **终轮复核说明（I3.1 review gate，2026-08-03）**：I3.1 gate 为本文件「文档共识审查」的终轮复核（roadmap Cross-Cutting「不叠加额外审查轮」），本文件可作为 I4 包基建与 I5/I6 实现的契约依据。
- **I3.1 gate 修正（2026-08-03）**：gate 结论 `docs/analysis/industrial-hmi/gate-2-review.md` m-2（Minor）——§4.6 组态 JSON 加载行实测分解遗漏「渲染」分量（23.4+88.5=111.9≠178.9），已补全为「parse 23.4 + 实例化 88.5 + 渲染 ~67」（口径 gate-1-review §3.2 #8）。I2 文档共识终轮复核经确认轮（0 新增）达成。

---

## 1. 组件定位

- 本文档定义 `scada-canvas` 的**引擎层**（`ScadaCanvasEngine` 类）设计：基于 leafer-ui v2.2.9 的 Canvas 场景图适配层，负责组态画面的**实例生命周期、场景树组织、图层分层、世界↔视口坐标变换、渲染循环与性能策略**。
- 引擎层是**纯逻辑域核心**（对齐 `flow-designer-core` 的域核心模式，`docs/references/renderer-implementation-guidelines.md` Case 4）：**不依赖 React、不访问 flux stores**，只经构造参数与事件回调与桥接层交互；React 桥接属 `design-renderer.md`（I2.4）契约。
- 性能目标（mission 验收包络，roadmap 总览）：10 万图元可交互 **≥45fps** / 首屏创建 **<2s** / 内存 **≤320MB**；1 万实时数据点端到端刷新 **<200ms**（I14 固化测量口径）。I1.2 spike 实测已确认包络达标且有余量（见 §4.6 性能基线）。
- 非目标：本档不设计点表绑定/动画（I2.2）、图元模型（I2.3）、序列化与 renderer 契约（I2.4）、编辑器交互（I16 后继 mission）。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无 Canvas 场景图组件先例；本项目既有 renderer 均为 DOM 渲染（roadmap Purpose），本引擎为**首个 Canvas 渲染域**。
- 对照调研结论（`research-render-engines.md` §8 讨论文件 §三 8 条对照表）：leafer 提供**渲染内核级能力**（场景图/脏区局部重绘/坐标变换/两阶段命中/动画原语/按 tag 注册表/序列化原语）；Konva/Fabric 在「万级图元 + 每秒多次局部刷新」场景架构上不敌 leafer（§11 三引擎对比）。组态语义层（点表/状态机动画/符号语义/组态 JSON/React 桥接）无候选可复用，全部自研（`research-summary.md` §1）。

### Flux 决策表（引擎层）

| 能力                                      | 采纳        | 不采纳                   | 理由（依据）                                                                                                           |
| ----------------------------------------- | ----------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| leafer-ui v2.2.9 场景图底座               | **P0 采用** | —                        | MIT/零外部依赖/万级+局部刷新唯一原生支撑（render-engines §11）；I1.2 spike 实测选型确认（gate-1-review §5）            |
| 三段式调度（Watcher→Layouter→Renderer）   | **P0 采用** | —                        | 引擎内部沿用 leafer 调度（research-summary §4.1 E1；细节 render-engines §3.1），组态层只做属性批量写入，不重复实现调度 |
| 两阶段命中（bounds 预检 + hitCanvas 池）  | **P0 采用** | 空间索引                 | 10 万级屏内 ≤2.4ms/屏外 0ms（gate-1-review §4 A3）；百万级加压（I14）时再评估                                          |
| 图层分层（ground/tree/sky + topChildren） | **P0 采用** | —                        | App 三层模型（research-summary §4.1 E8；render-engines §8 #1）；映射为背景/图元/交互覆盖层                             |
| in-canvas HTML 渲染（`@leafer-in/html`）  | P1 评估     | —                        | 组态内富文本需求未确认；HTML 覆盖层走 React DOM（§6 图层表第 4 行），插件作可选评估项（render-engines §8 #1）          |
| Editor 插件（拖拽/多选/缩放旋转）         | —           | **本期不启用**           | 编辑器交互后置 I16（讨论 Q8）；Editor=sky 独立 Group，不启用无性能退化（summary V7）                                   |
| React 集成                                | —           | **本期不启用引擎内适配** | leafer 无官方 React 适配（render-engines §8 #8）；桥接由 renderer 层自研（I2.4）                                       |

## 3. Flux 中的 renderer/type 定义

- 引擎层**不是 renderer type**：flux 侧只注册 `scada-canvas` 一个 type（`design-renderer.md` §3），引擎类为其域核心依赖。
- 包归属：`@nop-chaos/flux-renderers-industrial`（I4 创建），引擎模块位于包内 `engine/` 子目录，**独立于 React 视图结构**（renderer 组件只做桥接，`renderer-implementation-guidelines.md` Case 4 域核心模式）。

### 与既有 flux 架构的边界（I2.1 Decision）

| 边界         | 约定                                                                                                                                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 依赖   | 引擎纯逻辑 **0 依赖 React**；`useRef`/`useEffect` 生命周期管理全部在 renderer 桥接层（I2.4）                                                                                                                                                  |
| 数据流       | 引擎不读 flux scope/store；数据层（I2.2）经 `engine.applyAttrs` 批量写入图元属性                                                                                                                                                              |
| 事件流       | 引擎发原始 leafer 事件（图元点击/悬停、渲染帧），规范化与 action 派发由桥接层完成（I2.4）                                                                                                                                                     |
| 注册机制     | `registerScadaSymbol` 对齐 flux renderer registry 的「注册表 + 工厂」模式（`docs/references/quick-reference.md` RendererDefinition），不重复实现；底层映射 leafer `@registerUI` 按 tag 工厂（research-summary §4.1 E7；render-engines §8 #6） |
| 测试句柄     | dev/test 下经 `window.__flux_scada_<cid>` 暴露引擎实例（**含 `tree` 引用**，见 §8.3 与 gate-1-review §4 A2），roadmap「测试纪律」                                                                                                             |
| 平台能力复用 | 引擎不重复实现表达式编译/formula（消费 flux-formula/flux-compiler，I2.2）、i18n、UI 基元（HTML 覆盖层用 `@nop-chaos/ui`）——roadmap 平台能力复用表                                                                                             |

## 4. schema 设计（引擎创建参数）

### 4.1 ScadaEngineOptions

```typescript
interface ScadaEngineOptions {
  /** 挂载容器（canvas 渲染目标） */
  container: HTMLElement;
  /** 画布像素尺寸；缺省取容器 contentRect */
  width?: number;
  height?: number;
  /** 设备像素比，缺省自动检测（leafer devicePixelRatio） */
  pixelRatio?: number;
  /** 性能开关（透传 leafer config） */
  performance?: {
    usePartRender?: boolean; // 缺省 true（局部重绘，render-engines §3.3）
    ceilPartPixel?: boolean; // 缺省 true（脏区像素对齐）
    usePartLayout?: boolean; // 缺省 true（增量布局，render-engines §3.2）
    lazySpeard?: number; // 缺省 100（惰性边界；键名沿用 leafer 实际拼写 lazySpeard，对照 leafer-ui/packages/display/src/Leafer.ts:71,225，research-summary §4.1 E4）
    changedThreshold?: number; // 自研占位键（缺省 100；语义对齐 leafer Watcher 硬编码 changed<100 帧内节流，research-summary §4.1 E3；非 leafer 配置键，透传无害，I14 调参不依赖此键——gate-3-review m-2）
  };
  /** 背景层配置（地面色/网格） */
  background?: { color?: string; grid?: { size: number; color: string } };
  /** 交互覆盖层开关（hover 高亮等运行时反馈；缺省 true；I11.2 接线兑现：renderer 传 true 时经引擎惰性 getter 获取 InteractionOverlay 并驱动 highlight/clear） */
  interactionLayer?: boolean;
  /** 测试句柄开关（dev/test 下 true 时暴露 window.__flux_scada_<cid>） */
  exposeTestHandle?: boolean;
  /** 测试句柄键名 cid（默认自增；renderer 桥接层传 RendererResolvedProps.cid，I2.4 §8.4） */
  cid?: number;
  /** 帧事件回调（tree 层 render 事件，gate-1-review §4 A2）；`dirtyBlocks` 为预留字段（当前恒 0，leafer render 事件未暴露脏块计数，I14 固化口径时再接线） */
  onRender?: (info: { frame: number; dirtyBlocks: number }) => void;
}
```

### 4.2 实例生命周期（A1 固化）

- **创建**：`ScadaCanvasEngine.create(options)` → 构建 `Leafer` 画布 + `App` 三图层 + `tree` 视图层。**A1 约束**：App/tree 创建参数**写死**为 `tree: { type: 'viewport' }`（`@leafer-in/viewport` 默认类型为 `'design'`，无平移/缩放交互；源码证据 `leafer-in/packages/viewport/src/LeaferTypeCreator.ts`，gate-1-review §4 A1）——`scada-canvas` 引擎创建参数中不再暴露该配置项，防误改。
- **销毁**：`engine.destroy()` 逆序销毁（清除 tree/sky/ground 子节点 → 销毁 App 画布 → 释放图片缓存引用计数 → 移除测试句柄）；幂等（重复调用 no-op）。
- **销毁门控对称**（plan 2026-08-04-2243-1 Phase 1）：`DirtyCollector`（collect/flush/flushFrame/requestRender）与 `RefreshPipeline`（requestRender/flushFrame）所有公共入口在 `destroyed` 后均 no-op，阻断 config reload 期陈旧 runtime 闭包（eval effect / handle）重激活已销毁 pipeline/collector；collector 销毁单一 owner = `RefreshPipeline.destroy()`（内部销毁 collector，`releaseRuntime` 不再显式 `collector.destroy()`）。
- **重建**：`engine.reset(config)` 销毁后重建（组态 JSON 全量替换场景，I2.4 序列化契约调用）。

### 4.3 场景树组织

- 组态图元树（I2.3 `design-symbols.md` 的 symbol 树）经**符号工厂**（`symbol-factory`，映射 leafer `UICreator.get(tag, json)` 按 tag 工厂，research-summary §4.1 E7）实例化为 leafer `UI`/`Group`/`Box` 节点，挂入 `tree` 层 Group 子树。
- 层级规则：symbol 节点按组态 JSON `children` 递归建树；每节点以 `id` 为键注册进引擎内部 `Map<string, Leaf>` 索引（供绑定层/事件层 O(1) 查节点，对齐 meta2d `store.pens` 扁平索引思想，scada-apps §2.1）。
- z 序 = 树序遍历顺序（leafer `children` 顺序即渲染顺序，render-engines §2.2）；组态 JSON 中同层节点数组序即 z 序，无额外 zIndex 字段（见 `design-renderer.md` 组态 schema）。

### 4.4 世界↔视口坐标变换

- 世界坐标（组态图元坐标系）↔ 视口坐标（canvas 像素）：由 viewport 插件 `zoomLayer` 矩阵承担（`leafer-in/packages/viewport/src/type/viewport.ts:31-48`，平移/缩放经 `scaleOfWorld`，render-engines §2.3）。
- 引擎封装**纯逻辑坐标工具**（Vitest 可单测，roadmap 测试纪律「纯逻辑层单测先行」）：
  - `worldToViewport(world: {x,y})` / `viewportToWorld(vp: {x,y})`（对齐 leafer `getWorldPoint/getPagePoint`，render-engines §2.3）；
  - `fit(bounds, viewport, padding)`：计算保持比例的最大缩放（group 视角：世界矩形 → 视口矩形）；
  - `center(bounds, viewport)`：计算将 bounds 中心对齐视口中心的平移量；
  - 缩放边界钳制：`minScale`/`maxScale`（缺省 0.1/20），避免视觉不可用。
- 程序式视口 API：`setViewport({x, y, scale})`（对齐 `zoomLayer` 矩阵）、`zoomAt(worldPoint, factor)`（锚点缩放）、`fit()`/`center()`。用户 wheel/pinch 平移缩放由 viewport 插件原生承担（I11.2 画布浏览交互）。

> **视口交互核对结论（I11.2，leafer-in viewport 源码核对）**：插件默认 wheel/pinch 交互配置——
> `addViewportConfig` 仅设 `wheel.preventDefault`/`touch.preventDefault`（type/viewport.ts），
> wheel 缩放经 Interaction → `Transformer.zoom` → `ZoomEvent.BEFORE_ZOOM` 处理器
> `zoomLayer.scaleOfWorld(e, changeScale)`（`changeScale = leafer.getValidScale(e.scale)`，
> **`getValidScale` 原样返回、无 min/max 钳制**，display Leafer.ts:405）；平移经
> `MoveEvent.BEFORE_MOVE` → `zoomLayer.move(move)`。**插件缩放路径绕过引擎 `clampViewport`
> （0.1/20 仅钳 scale、平移 x/y 不钳制）**→ 引擎兜底（Failure Paths `viewport-interaction-drift` 兑现）：
> 引擎订阅 tree `zoom`（ZoomEvent.ZOOM）/`move`（MoveEvent.MOVE）事件，越界缩放经
> `zoomLayer.scaleOfWorld` 重钳制回 [MIN_SCALE, MAX_SCALE]，并把 zoomLayer 矩阵状态
> （`zoomLayer.x/y/scaleX`，读 `zoomLayer.__` 数据面，view/src/index.ts:27）同步回引擎视口状态
> （`zoomLayer.x = -viewport.x * scale`，gate-3-review §5 M-3 推导），保证 wheel/pinch 后
> `getViewport`/命中 world 坐标/后续命令不漂移。
>
> **P1-9 增补（scaleOfWorld 锚点空间，mock↔真实漂移收口）**：leafer `scaleOfWorld` 的锚点是
> **zoomLayer 外层（screen）空间点**（`zoomOfWorld` → `getTempLocal` 按 parent 世界矩阵逆变换，
> 源码核对 core 2.2.9 `zoomOfLocal`/`scaleOfOuter`）——引擎命令路径 `applyViewportState` 的缩放以
> **屏幕原点 `{x:0,y:0}`** 为锚（固定屏幕原点缩放 = 视口 x/y 不变、仅 scale 变化），再经
> `move({-(Δx)*scale})` 平移合成精确视口态；**不得传内容坐标锚点**（`viewportToWorld(vp,{0,0})`，
> 会被当 screen 点固定 → 内容漂移 `(vx·(1-k), vy·(1-k))`）。
> `leafer-ui-mock.ts` `MockZoomLayer.scaleOfWorld` 已按真实锚定语义建模 x/y 副作用
> （`x = (x-ox)·k + ox`），矩阵级断言可验证。
>
> **D3 增补（wheel-zoom 钳制光标锚，plan 2026-08-04-2243-2）**：插件钳制兜底 `handlePluginZoom`
> 与命令路径锚点需求不同——命令路径是显式目标态合成（screen 原点锚），wheel 钳制是修正已发生的
> 指针锚缩放。插件 wheel 经 `Transformer.zoom` → `ZoomEvent.ZOOM`，`getZoomEventData` 透传指针
> `event.x/y`（screen 坐标，已核实 leafer-in viewport 源码）；钳制改用**光标 screen 锚**
> （`scaleOfWorld(cursor, clamped/raw)`）→ 光标下内容点保持固定，超界无视觉偏移。事件缺 `x/y`
> （程序触发/旧消费方）回落 screen 原点 `{0,0}`（P1-9 命令路径不变式：视口 x/y 不变）。
>
> **I14.1 增补（指针拖动平移）**：viewport 插件默认**不开启鼠标拖动平移**（`move` 配置缺省仅
> `autoDistance: 2`，`canMove = moveMode || (drag==='auto' && !pathCanDrag(path))` 恒 false）——
> 验收包络含「10 万图元可交互 ≥45fps/拖动」，且 spike 拖动 fps 口径（`move: { drag: 'auto', dragEmpty: true }`）
> 需指针拖动可用 → 引擎 tree 配置补 `move: { drag: 'auto', dragEmpty: true }`
> （drag:'auto' 在图元非 draggable 时让位画布平移，dragEmpty 覆盖空白区拖动；图元级 draggable
> 语义留 I16 编辑器）。测量发现记录：插件驱动 zoomLayer 平移（指针/wheel）在 3 层 App 下
> **不发射 tree 层 render 事件**（renderer `totalTimes` 递增、`times`/render 事件不递增；画布像素
> 实测随平移更新，视觉平移正常）——指针路径 fps 以 rAF 显示帧率计量，渲染吞吐以命令路径
> `setViewport` render 事件计数作 A4 吞吐代理口径（benchmark-report.md 测量口径声明）。

### 4.5 渲染循环与脏区/局部重绘

- 渲染循环**由 leafer 内部调度**（rAF + maxFPS 限帧 + FPS 滑动平均，render-engines §3.3）：属性变化 → Watcher 收集 → Layouter partLayout 增量布局 → Renderer partRender 脏块合并重绘（脏块扩边 10px 防残影，research-summary §4.1 E3）。
- 引擎层约定（**上层合帧义务**，呼应 gate-1-review §4 A5）：属性批量写入必须合并到一次 `set()` 调用批次，由 leafer watcher 帧内节流（changed<100）合并渲染请求；**禁止逐点 set 触发多次渲染请求**——批量写入的语义在 `design-data-binding.md` 刷新流水线固化。
- 帧事件：经 `tree`（Leafer 层）`render` 事件监听（A2：App 层不转发 render 计数，gate-1-review §4 A2），供性能测量（I14）与测试断言。

### 4.6 性能策略与基线（引用 I1.2 实测）

| 策略           | 机制                                                                                                                   | 实测基线（gate-1-review §3.2，headless Chromium 单次实测留档）                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 实例化         | 首次 fullLayout/fullRender 单遍（render-engines §3.6）；静态元素走 `drawFast` 快路径（research-summary §4.1 E9）       | 10 万矩形创建至首帧 **165.3 ms**（实例化 125.5 + 入树 8.7），验收 <2s，余量 ~12x                                 |
| 裁剪           | 渲染遍历自动视口外剔除 + 惰性边界（research-summary §4.1 E4）                                                          | —                                                                                                                |
| 命中           | 两阶段命中：bounds 预检 O(候选) + hitCanvas 缓存池 ≤1000 张（research-summary §4.1 E5）；**10 万级无需空间索引**（A3） | 屏内 1.9–2.4 ms/次，屏外 0 ms 立即排除                                                                           |
| 合帧           | Watcher changed<100 帧内节流 + partRender 局部重绘（research-summary §4.1 E3）；上层批量 set                           | 1 万点批量更新端到端 **16.9–19.7 ms**（更新 1.7–2.6 ms + 渲染 ~15–17 ms），验收 <200ms，余量 ~10x                |
| 内存           | 紧凑节点对象 + 惰性 layout + 同尺寸画布池/图像 URL 引用计数缓存（research-summary §4.1 E6）                            | 10 万图元 **47.5 MB**（CDP JS heap），验收 ≤320MB，余量 ~6.7x                                                    |
| 持续变换       | 相机平移/缩放仅重绘脏块（render-engines §3.1）                                                                         | 平移吞吐 **114.3 fps**（8.7ms/帧）、缩放 **174.2 fps**，验收 ≥45fps（吞吐口径，A4）                              |
| 组态 JSON 加载 | 解析→按 tag 实例化→Group.add 批量入树                                                                                  | 10 万 symbol 组态 JSON（11.6 MB）**178.9 ms**（parse 23.4 + 实例化 88.5 + 渲染 ~67，口径 gate-1-review §3.2 #8） |

> **测量口径声明（A4）**：headless 无 vsync，rAF 吞吐 ≠ 显示 fps。≥45fps 判定基于渲染吞吐代理口径；真实指针事件路径实测 17–29fps（输入路径受限、渲染零丢帧），指针端到端口径的 45fps 保证需 **I14 在真实浏览器复测**（gate-1-review §3.3 #3/§4 A4），本引擎实现阶段不固化基准方法。
>
> **I14 复测结论（A4 兑现，详见 benchmark-report.md）**：真实浏览器（Playwright Chromium headless）复测完成——10 万图元拖动：指针路径 rAF 显示帧率 3 采样 69.1/69.9/69.5fps（best 69.9，≥45 达标）；渲染吞吐（命令路径 tree render 事件计数）3 采样 45/42.3/49.9fps（best 49.9，≥45 达标）。测量发现：插件驱动 zoomLayer 平移不发射 tree render 事件（见 §4.4 I14.1 增补）→ 吞吐代理口径以命令路径 render 事件计数固化。首屏创建（组态生成完成→tree render 首帧）344.4ms（spike 165.3ms 口径对照，余量 ~5.8x）；内存 stroke 128.8MB / 无 stroke 126.1MB（CDP JS heap 全页口径，验收 ≤320MB）；1 万点批量刷新端到端 80.1ms + 合帧断言（渲染增量 = 1，验收 <200ms）。

## 5. 字段分类

| 配置                                      | 归属                   | 说明                                                                                                        |
| ----------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `container`/`width`/`height`/`pixelRatio` | 构造参数               | 由 renderer 桥接层从 DOM 与 props 传入（I2.4）                                                              |
| `performance.*`                           | 构造参数               | 透传 leafer config，默认值按 §4.1（注：`changedThreshold` 为自研占位键非 leafer 配置键，gate-3-review m-2） |
| `background.*`                            | 构造参数               | 背景层配置                                                                                                  |
| `interactionLayer`/`exposeTestHandle`     | 构造参数               | dev/test 句柄与交互层开关                                                                                   |
| `onRender`                                | 构造参数               | tree 层 render 帧事件回调（A2）                                                                             |
| 点表/绑定/动画声明                        | 组态 JSON（I2.2/I2.4） | 引擎不解析业务语义，只接收「节点 id → 属性值」写入                                                          |

## 6. 图层与场景树（对应 regions 约定）

> leafer App 三层模型（ground/tree/sky，render-engines §8 #1/§2.2）映射为组态图层：

| 层          | leafer 载体                      | 组态职责                                   | 说明                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------- | -------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 背景层      | `App.ground`                     | 画面底色/网格背景                          | 静态、不参与命中；`background` 配置                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 图元层      | `App.tree`（`type: 'viewport'`） | 全部组态图元子树                           | 世界坐标；受视口矩阵变换；**命中检测/渲染帧事件均挂此层**（A2）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 交互覆盖层  | `App.sky`                        | 运行时 hover 高亮/报警闪烁描边等反馈覆盖物 | 最小化使用；选中/拖拽/控制点等编辑器覆盖物后置 I16（Editor=独立 sky Group，research-summary §4.1 E12）；覆盖物几何：矩形语义图元取 x/y/width/height，line/arrow/polygon 无宽高语义时按 points 包围盒兜底、0 尺寸退化最小框（gate-4-review m-C 落地，I15.1 e2e 补线/多边形 hover 断言）。**P1-7 变换面对齐**：sky 层恒等变换 → 覆盖物以 **screen 坐标**绘制（x/y 经 `engine.getViewportPoint` 换算、宽/高乘当前 scale、rotation 不变、strokeWidth 保持 preset 屏幕像素不除 scale）；视口变更后 `InteractionOverlay.refresh()` 按最新视口重算全部活动覆盖物（命令路径 `applyViewportState` + 插件 zoom/move sync 路径双钩子）；覆盖物 Group `hittable: false`——不参与命中测试，指针事件路径保持落在 tree（否则 sky 覆盖物与图元 screen 几何对齐后吞掉 click/hover 链路） |
| HTML 覆盖层 | React DOM（canvas 外层）         | 弹窗/提示/说明文字等 DOM UI                | 经既有 `dialog`/`drawer` 与 `@nop-chaos/ui`（平台能力复用表）；不进入场景树；`@leafer-in/html` 作 P1 评估项（§2 决策表）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

- 场景树与 leafer 树的映射规则、symbol 实例化细节见 `design-symbols.md`（I2.3）；图层与 renderer 的 DOM 结构关系见 `design-renderer.md`（I2.4）。

## 7. 运行期状态归属

| 状态                      | Owner                  | 说明                                                                                        |
| ------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| 场景树/图层/视口矩阵      | **域内部（引擎实例）** | 不进 flux scope（INV-4「域内部 state 不进 schema-visible scope」）；经 ref 由 renderer 持有 |
| 节点索引 `id → Leaf`      | **域内部**             | 场景打开时构建（对齐 meta2d 反向索引思想，scada-apps §2.1）                                 |
| 渲染帧统计/脏区计数       | **域内部**             | 经 `onRender`/测试句柄投影（不写 scope，避免订阅风暴）                                      |
| 视口浏览状态（平移/缩放） | **域内部**             | fit/center/zoomAt 命令式 API；不持久化（编辑器交互后置）                                    |
| 测试句柄                  | **dev/test 投影**      | `window.__flux_scada_<cid>`（§8.3），e2e `page.evaluate` 读取                               |

## 8. 事件、动作与组件句柄能力

### 8.1 引擎事件

| 事件                                                | 载荷                            | 说明                                                                                                                                                     |
| --------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `symbol:click` / `symbol:dblclick` / `symbol:hover` | `{ symbolId, world, viewport }` | leafer 节点事件（capture/bubble 双阶段，render-engines §2.4/§12 #17）→ 引擎层事件桥；规范化与 flux action 派发属 I2.4                                    |
| `symbol:hover-miss`                                 | `{ symbolId }`                  | I11.2 hover 退出信号：pointer.move 命中为空且前一命中存在时发射（载荷承载前一 symbolId，无 world/viewport）；仅覆盖物消费，不派发 action（事件表外扩展） |
| `render`（tree 层）                                 | `{ frame }`                     | 帧事件（A2），性能测量/测试用                                                                                                                            |

> `scada:ready` / `scada:error` 派发归属（plan 2026-08-04-1558-2 Phase 4 doc drift fix）：
> 这两个事件为 **renderer 层 action 派发**（`helpers.dispatch` 经 `events.onReady`/`events.onError`，design-renderer.md §8.1），
> 不在引擎事件表内。引擎层不发射 ready/error 事件；renderer 在场景构建成功/失败时派发对应 action（载荷 `{ engine }` / `{ code, message }`）。
> 错误码注册表 + i18n 文案见 design-renderer.md §8.5。

### 8.2 引擎命令句柄（renderer/外层可调）

- `applyAttrs(attrsBySymbolId: Record<string, Partial<ScadaSymbolProps>>)`：**批量属性写入入口**（I2.2 刷新流水线帧尾调用；单次调用内合并全部脏属性，遵守 §4.5 合帧义务——引擎侧不再提供逐点写 API；`ScadaSymbolProps` 见 design-symbols.md §4.2）；
- `getSymbol(id)` / `getSymbols()` / `getSymbolProps(id)`：场景树只读访问（图元便捷封装，design-symbols.md §8）；`getSymbolProps` 返回 leafer 节点属性面（经 `toNodePatch` 映射后的键名，如 text 节点 `fontSize`，非 `ScadaSymbolProps` 原始键名——e2e 断言指南 I15.1 需知悉）；`setSymbolProps(id, patch)` = `applyAttrs({ [id]: patch })` 便捷封装；
- `fit()` / `center()` / `setViewport(...)` / `zoomAt(...)`：视口命令（I11.2 画布浏览交互）；
- `setSize(w, h)`：画布尺寸更新（resize 同步，I10.1 ResizeObserver 调用；不重建引擎）；
- `applyDiff(diff: ScadaConfigDiff)`：组态 JSON 增量 diff 应用（I5.3/I2.4 序列化契约；symbol 增删/属性变更增量生效，避免全量重建）；
- `exportConfig()` / `importConfig(json)`：序列化契约转发（I2.4/`design-renderer.md`）；
- `getWorldPoint(viewport)` / `getViewportPoint(world)`：坐标工具；
- `destroy()` / `reset(config)`：生命周期。

### 8.3 测试句柄契约（A2 固化）

- dev/test 构建下，`exposeTestHandle: true` 时引擎创建后写入 `window.__flux_scada_<cid>`（`cid` 为 renderer 实例 id，`RendererResolvedProps.cid`，quick-reference.md），结构：
  ```typescript
  interface ScadaTestHandle {
    engine: ScadaCanvasEngine; // 引擎实例
    tree: Leaf; // Leafer 层引用（A2：render 事件/帧计数挂 tree）
    app: App; // App 实例（三图层）
    getSymbol(id: string): Leaf | undefined;
    getPointValue(pointId: string): unknown;
    getViewport(): { x: number; y: number; scale: number };
    forceRender(): void;
    // 以下两项为 dev/test 专用注入通道（非 scada-canvas 公共契约，仅 exposeTestHandle 时挂载）：
    setPointValues?: (values: Record<string, ScadaPrimitive>) => void; // I14.1 perf-injection-channel 批量注入
    measureAddStrategies?: (count: number) => AddStrategyTiming; // gate-3-review §10 m-8 batch.add 对照探针
  }
  ```
  > **强类型缺失注记（impl drift，2026-08-04）**：上述接口面在 impl `engine/test-handle.ts:9-21` 全部以 `unknown` 出现（`engine`/`tree`/`app`/`getSymbol`/`getPointValue`，仅 `getViewport` 为强类型 `ViewportState`）——根因为 `engine/test-handle.ts` 强类型引用 `ScadaCanvasEngine`/`Leaf`/`App` 会形成与 `scada-engine.ts` 的循环导入。本档保留强类型接口面作契约示意；impl 走 `unknown`，消费方（e2e/单测）按上述结构断言。
- 卸载时移除；e2e 经 `page.evaluate(() => window.__flux_scada_<cid>...)` 程序化断言场景树（roadmap 测试纪律，禁截图判定）；I15 e2e 与本句柄为测试锚点。

## 9. 数据源、表达式、导入能力接入点

- **引擎不接数据源**：点表值由数据层（I2.2）合并帧后经 `applyAttrs` 批量写入图元属性（§8.2）；图元事件 → flux action 联动经 `props.events`/`createNormalizedActionEvent`（I2.4）。
- **图片资源**：图元背景图/纹理经 leafer `ImageManager` URL 引用计数缓存（research-summary §4.1 E6）；URL 加载属外部 IO，由 renderer 桥接层经 `RendererEnv.fetcher`/`importLoader` 归位（INV-1，`new-renderer-introduction-audit.md`），引擎不直调 `fetch`。
- **表达式**：引擎不参与表达式求值；绑定表达式/flux `$xxx` 由数据层（I2.2）消费 flux-formula/flux-compiler 求值后写属性（平台能力复用表）。
- **i18n**：图元文本的 i18n 文案经 `flux-i18n`（I15.1），引擎只渲染最终文本。

## 10. 样式与 DOM marker 约定

- 引擎层**只持有 canvas 容器**（`<canvas>` 或 leafer 自建容器），不渲染 DOM marker；`nop-scada-canvas` 根 marker 与 `data-slot="scada-canvas"` 由 renderer 组件（`design-renderer.md` §10）声明。
- 画布尺寸策略：容器 CSS 尺寸优先（`width: 100%`），`width`/`height` 属性为显式覆盖；resize 由 renderer 桥接层经 ResizeObserver 通知引擎（I2.4 React 桥接）。
- 背景层样式（底色/网格）为引擎内部绘制，不参与主题 token；HTML 覆盖层（弹窗等）使用 `@nop-chaos/ui` 既有样式体系（不新增 token 命名空间，`new-renderer-introduction-audit.md` §3F）。

## 11. 实现拆分建议

```
packages/flux-renderers-industrial/src/engine/          （域核心，无 React 依赖）
├── scada-engine.ts              # ScadaCanvasEngine：生命周期/App 装配/三图层（I5.1）
├── tree-registry.ts             # 节点索引 id→Leaf + z 序管理（I5.1）
├── viewport.ts                  # 纯逻辑坐标工具：worldToViewport/fit/center/zoomAt（I5.2，Vitest 单测）
├── config-adapter.ts            # 组态 JSON → leafer 场景树构建/销毁/重建/applyDiff 增量应用（I5.3，配合 I2.4 序列化）
├── hit.ts                       # 命中封装：getByPoint 事件→symbolId 解析（I6.4）
└── test-handle.ts               # window.__flux_scada_<cid> 挂载/移除（I5.1，A2；cid 经 ScadaEngineOptions.cid 传入，唯一所有权属引擎侧）
```

- 拆分依据：`renderer-implementation-guidelines.md` Case 4（跨 shell 稳定域行为 → 域核心）；纯逻辑模块（viewport/坐标）单测先行（roadmap 测试纪律）。
- 实现阶段映射：I5.1（引擎类/图层/生命周期）、I5.2（视口坐标，纯逻辑单测）、I5.3（JSON 解析/序列化/增量 diff）、I6.4（命中解析）、I10.1（renderer 桥接生命周期）。

## 12. 风险、取舍与后续阶段

### 12.1 I1.2 API 风险清单 → 规避策略映射（gate-1-review §4 逐条回应）

| #   | 风险项                                                                        | 本设计规避/接受                                                                                                                        |
| --- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | viewport 插件需显式 `tree: { type: 'viewport' }`，默认 design 类型无平移/缩放 | **固化**：§4.2 引擎创建参数写死 `type: 'viewport'`，不暴露配置项                                                                       |
| A2  | 渲染帧事件/测试句柄需含 `tree` 引用（App 层不转发 render 计数）               | **固化**：§4.5 帧事件挂 tree 层；§8.3 测试句柄含 `tree` 字段；I14 性能测量基于 tree 事件                                               |
| A3  | 命中 O(候选) 包围盒预检，无空间索引（10 万级 ≤2.4ms 屏内/0ms 屏外）           | **接受并固化**：§4.6 命中策略 10 万级不加索引；百万级（I14 加压）评估裁剪/索引策略                                                     |
| A4  | headless 无 vsync，rAF 吞吐 ≠ 显示 fps                                        | **接受并声明**：§4.6 测量口径声明；I14 固化「渲染吞吐 vs 显示帧率」双口径，真实浏览器抽测指针端到端                                    |
| A5  | 批量更新合帧 ~20ms，上层仍需合并帧 + 脏属性收集                               | **转发约束**：§4.5 上层合帧义务；刷新流水线语义在 `design-data-binding.md`（I2.2）固化，禁逐点 setState 直刷 React（roadmap 性能红线） |

### 12.2 风险与取舍

- **版本锁定**：leafer-ui 锁定 v2.2.9（I4 包基建引入时复核 I0.1 许可 MIT + 体积预算 + pnpm-lock diff，roadmap I4.1）；后续升级需回归 spike 口径（I14）。
- **命中无空间索引**：A3 接受为 10 万级结论；若 I14 百万级加压不达标，启用裁剪/索引策略（record 为 I14.2 优化候选）。
- **HTML 覆盖层自研**：canvas 之上的 DOM 覆盖层无内置（render-engines §8 #1），走 React DOM + 既有 dialog/drawer；`@leafer-in/html` 仅作 P1 评估（需求未确认不引入）。
- **指针端到端口径**：17–29fps 为 CDP 输入路径开销（gate-1-review §3.3 #3），非渲染瓶颈；真实浏览器 45fps 保证需 I14 复测——**验收口径风险**，若 I14 复测不达标按 roadmap「人工确认阈值」处理。
- **内存 +40% 观察项**：100 万对照 448.4MB vs 官方 320MB（推测 stroke 属性 + 软渲染缓冲，gate-1-review §3.3 #4）；10 万验收口径余量 6.7x，不构成选型否定；I14 复测时补无 stroke 对照组。
- **架构冲突记录（I15.2）**：若实现期发现本设计与 `docs/architecture/`（renderer-runtime/模块边界）冲突，按 plan Failure Paths `design-contract-conflict` 记录冲突点与取舍理由，架构文档同步属 I15.2 收尾，不提前修改（本 plan Non-Goals）。

### 12.3 后续阶段

| 阶段  | 内容                                                                            |
| ----- | ------------------------------------------------------------------------------- |
| I5    | 引擎核心实现（Wave 1：场景图适配/视口/序列化），引用本档 §11                    |
| I6    | 数据绑定与动画引擎（Wave 2），引用 `design-data-binding.md`                     |
| I14   | 性能基准固化与优化（吞吐/显示 fps 双口径，A4），复用 spike 工程测量方法         |
| I15.2 | 文档收尾与架构同步（若设计冲突）                                                |
| I16   | 编辑器后继 mission（sky 层 Editor 覆盖物模型已预留，research-summary §4.1 E12） |
