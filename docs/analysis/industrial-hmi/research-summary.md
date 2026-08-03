# 工业组态（HMI/SCADA）调研汇总 research-summary.md

> 日期：2026-08-03
> 版本：v1（I0.5 产出）
> 上游：`research-download.md`（I0.1）、`research-render-engines.md`（I0.2）、`research-scada-apps.md`（I0.3）、`research-supplement.md`（I0.4）
> 下游：I1.1 review gate（本文件与全部 5 份报告的终轮复核）、I1.2 选型 spike、I2 四份设计文档（design-engine/design-data-binding/design-symbols/design-renderer，命名以 roadmap I2.1-I2.4 为准）
> 依据：讨论文件 `docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md` §八（范围/选型/数据模型/接入形态）；roadmap `docs/components/roadmap-industrial-hmi.md` I0/I1

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent 反复审查直到共识。记录如下：

- **Round 1（2026-08-03）**：独立 agent（fresh session，task `ses_039268c35ffeYaHJjHBjOQhnUF`）审查，判定 `REVISE`——1 Major + 11 Minor 修正项（§6.1 70KB 引注不存在/60fps 引注/FUXA 千级措辞超上游/Konva-Fabric 动画与序列化无上游出处/编辑器生态措辞/meta2d React 推断/V6 依据引注/I2 文档命名对齐 roadmap/§7 措辞），已全部落地（§2-§7 修订后内容），未裁决项 0。
- **Round 2（2026-08-03）**：独立 agent（fresh session，task `ses_039159867ffeE0X2nTxbRKFHg1`）确认轮，判定 `REVISE`——12/12 确认落地；新修正项 3 Minor（meta2d 事件动作数 17→19、Konva shapes 20+→17、§7"判定待回填"措辞过期）。已全部落地。
- **Round 3（2026-08-03）**：独立 agent（fresh session，task `ses_03908e623ffe2qdD59Ehu4Kw6p`）确认轮，判定 `REVISE`——R2 三项确认落地；新修正项 1 Minor（§2 FUXA 事件格 `opendialog`→`ondialog`，与 scada-apps §3.4 及 FUXA 源码 `GaugeEventActionType.ondialog` 对齐）。已落地。
- **Round 4（2026-08-03）**：独立 agent（fresh session，task `ses_038fb48f1ffeC2WD3cEsTddNXG`）确认轮，判定 `REVISE`——R3 一项确认落地；新修正项 2 Minor（§4.3 A2 `LineAnimateType` 行号改 `103-110,318-330`；§4.2 D7 范围对齐 scada-apps 精确行号 `4333-4374,4377-4423,4426-4464,4497-4533`、`event.ts:99-116`）。已全部落地。
- **Round 5（2026-08-03）**：独立 agent（fresh session，task `ses_038dfcb99ffeM6AmNvqMTfH4x2`）确认轮，判定 `AGREE`——R4 两项验证落地（与源码逐项核对），全文档扫描（§3 V1-V8/§4 设计清单/§5 flux 引注/§6 一致性）**零新增修正项，达成共识**（共识循环：R1-R4 修正 4 轮 + R5 确认轮，⚠️ 修正轮超 3 轮上限，与 scada-apps 同源的行号精度类修正，交 I1.1 gate 人工裁定复核）。

---

## 1. 调研结论一句话

**LeaferJS（leafer-ui v2.2.9）作为 Canvas 场景图底座在源码层面成立**：场景图/脏区局部重绘/增量布局/自动视口剔除/两阶段命中/按 tag 注册/JSON 序列化全部有源码实锤（render-engines §2-§7）；「100 万图元 1.28s/320MB/60fps」为官方自报（来源标注与校准见 download §2），机制上可信但需 I1.2 spike 本机复测。**组态语义层（点表绑定/状态机动画/图元符号/组态 JSON 格式/React 桥接）无任何候选项目可直接复用，全部自研**——meta2d.js/FUXA 提供成熟的设计蓝本（借鉴设计，不借代码），SceneV 源码不可获取，Konva/Fabric 在"万级图元+实时刷新"场景架构上不敌 leafer。

## 2. 对比矩阵（6 组项目 × 9 维）

> 性能档与能力档均标注证据级别：`源码实锤`=clone 源码文件:行 佐证；`官方自报`=官方 README/官网数字；`宣传级`=推广材料，无源码佐证；`—`=无该能力/未公开。

| 维度           | leafer 系列（5 仓）                                                                                      | meta2d.js                                                                                        | FUXA                                                                                 | SceneV                                     | Konva.js                                                                     | Fabric.js                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 许可           | MIT（源码实锤）                                                                                          | MIT（源码实锤）                                                                                  | MIT（源码实锤）                                                                      | 未声明 ⚠️                                  | MIT                                                                          | MIT                                                               |
| 性能档         | 官方自报：100 万矩形首屏 1.28s / 320MB / 拖动 60fps（机制上可信）；万级+局部刷新原生支撑（源码实锤）     | 万级可用（README 定性，无官方数字）；渲染层 rAF+30ms 限频                                        | SVG 图元 + socket.io 推送（无性能数字；SVG-DOM 方案定性边界 ≤千级，supplement §3.4） | 宣传级：万级数据点 / 60fps                 | 中等：万级静态可用，无脏区需手动分层（源码实锤）                             | 中低：整场景每帧重绘，定位编辑器（源码实锤）                      |
| 数据绑定       | **无**（点表/变量概念不存在，需自研）                                                                    | 双通道绑定（form.dataIds 属性级 + realTimes.bind 绑定点级）+ 反向索引 + 批量合并派发（源码实锤） | tag 点表 + variableId 图元主绑定 + 按画面订阅/退订（源码实锤）                       | 宣传级：ThingsBoard 遥测绑定（无源码）     | 无                                                                           | 无                                                                |
| 动画           | 动画原语：`@leafer-in/animate` 过渡/路径动画 + `@leafer-in/state` 状态样式（源码实锤）；业务状态机需自研 | 帧动画（Pen 属性子集插值）+ 连线动画 6 型 + 动画组队列；"1000+"指并发播放指标（源码实锤）        | SVG 属性动画（blink/rotate/move，GaugeAction）（源码实锤）                           | 宣传级：数据触发/路径动画                  | 帧回调工具（`Animation.ts:22-27`，每帧执行回调函数；本 summary 补核）        | 无场景级动画引擎（对象 animate 工具存在，上游未评估——待 I1 复核） |
| 图元体系       | 图形类（Rect/Path/Line/Text/Image/Pen…）+ `@registerUI()` 按 tag 注册表（源码实锤）；符号语义无          | Pen=数据结构+绘制函数表，register 函数注册 + SVG path 注册（源码实锤）                           | SVG element ↔ GaugeSettings（图元 id=SVG element id）（源码实锤）                    | 控件/图表/图形/图元/模板五类扩展（宣传级） | Shape 类体系（17 种，`shapes/`；源码实锤）                                   | FabricObject + Group/ActiveSelection（源码实锤）                  |
| 序列化         | toJSON/toString + add(JSON) 经 tag 工厂重建（源码实锤）；格式为引擎属性直出，无 schema 层                | Meta2dData：pens 平铺 + 视口 + 数据源声明 + 事件/触发器 + dataPoints（源码实锤）                 | View=SVG 源码 + 图元设置表 + 变量表（ProjectData JSON）（源码实锤）                  | —                                          | Node.toObject()/toJSON()（`Node.ts:1673,1718`；上游未评估，本 summary 补核） | toJSON/loadFromJSON + SVG 导入导出（源码实锤）                    |
| 事件           | 节点 on/off + capture/bubble 双阶段 + 交互命中分发（源码实锤）                                           | Event{name,action,where,...} 19 种动作 + Comparison 条件触发器（源码实锤）                       | 图元事件动作（onpage/ondialog/oncard…）+ 脚本命令 + 报警状态机（源码实锤）           | 数据触发/条件触发（宣传级）                | DOM 事件 + 冒泡（源码实锤）                                                  | Observable on/off/fire + 冒泡（源码实锤）                         |
| 编辑器生态     | 官方 Editor 插件（拖拽/缩放/旋转/多选/控制点/成组）（源码实锤）                                          | 在线编辑器 2ds.le5le.com（生态，非仓库内）                                                       | 完整组态编辑器（SVG 编辑器 + gridster 卡片）（源码实锤）                             | 在线编辑器（宣传级）                       | react-konva（独立生态包）                                                    | SVG parser/对象模型成熟的编辑器定位（render-engines §10.4/§10.6） |
| React 集成     | 无官方适配，需自研桥接                                                                                   | 无官方 React 适配（仓库含 `@meta2d/vue` 0.0.1 封装，React 需自行封装——定性推断）                 | Angular 18 原生                                                                      | Vue3 原生                                  | react-konva 生态成熟                                                         | 命令式 ref/effect 范本（README 实锤）                             |
| 值得借鉴优先级 | 引擎底座（选型目标）                                                                                     | ★★★ 组态语义蓝本                                                                                 | ★★★ SCADA 语义蓝本                                                                   | ★（无源码）                                | ★★ 对照/备选                                                                 | ★ 对照/React 桥接范本                                             |

## 3. 选型结论可行性验证点清单（供 I1.2 spike）

> 选型维持讨论文件结论（LeaferJS 底座 + 自研组态语义层），但**每条关键假设必须经 I1.2 spike 实测验证**；任一验证点不成立 → 提出替代方案并标记人工确认（roadmap Cross-Cutting「人工确认阈值」）。

| #   | 关键假设                                                                         | 依据（报告位置）                                                              | I1.2 spike 验证目标                                               | 风险等级       |
| --- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------- |
| V1  | 10 万图元创建 + 可交互 ≥45fps / 首屏 <2s / 内存 ≤320MB                           | download §2.2 校准（官方 100 万口径 1.28s/320MB/60fps，机制可信但无独立复测） | 本机 10 万矩形创建耗时、拖动 fps、内存占用实测；并附测 100 万对照 | 高（性能红线） |
| V2  | 脏区局部重绘在「万级图元 + 每秒多次局部刷新」下稳定                              | render-engines §11（leafer 唯一原生支撑，O(脏块) 重绘）                       | 1 万图元、每帧 200+ 属性变更的刷新耗时与帧率                      | 高             |
| V3  | 组态 JSON（schema 化）可加载进 leafer 并双向一致                                 | render-engines §8 对照 #7（add(JSON) 经 tag 工厂重建，格式层需自研）          | 样例组态 JSON（含自定义字段）加载 + 导出回读一致                  | 中             |
| V4  | 点表绑定模型（绑定声明 in JSON + 运行时反向索引 + 批量合并）可落地于 leafer 之上 | scada-apps §2.1/§6 #1-3（meta2d 模型）                                        | 1 万数据点模拟刷新端到端 <200ms（含绑定索引与合并）               | 高（验收红线） |
| V5  | 图元注册机制（registerScadaSymbol → tag 工厂）与 leafer `@registerUI` 注册表兼容 | render-engines §8 对照 #6、§12 #10                                            | 注册 20+ 工业图元（电机/泵/阀门/仪表/传感器）并加载               | 中             |
| V6  | 状态机动画（运行/停止/故障/闪烁/流动）可在 leafer 动画原语上构建                 | render-engines §8 对照 #4（`@leafer-in/animate` + `@leafer-in/state` 源码）   | 5 种状态动画同时播放的帧率与内存                                  | 中             |
| V7  | Editor 插件能力边界与「本期不做编辑器交互」决策一致（运行时只消费图元事件）      | render-engines §5（Editor 是独立 sky 层 Group，可不启用）                     | 不启用 Editor 时事件/命中/性能无退化                              | 低             |
| V8  | React 桥接（命令式引擎 + 声明式 props）成本可控                                  | render-engines §12 #21（fabric ref/effect 范本）、summary §4                  | spike 中 React 包装 demo（10 万图元加载 + props 更新）            | 中             |

## 4. 可提取设计清单（供 I2 四份设计文档引用）

### 4.1 引擎层（→ design-engine.md）

| #   | 设计点                                                                                   | 来源（仓库/文件:行）                                                                                                                |
| --- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| E1  | 三段式调度解耦（Watcher 脏收集 → Layouter 增量布局 → Renderer 局部绘制）                 | `leafer/packages/partner/{watcher,layouter,renderer}/src/*.ts`                                                                      |
| E2  | 属性脏标记位（matrix/bounds/stroke/render/surface 分位）+ `__levelList` 层级排序增量布局 | `leafer/packages/display-module/layout/src/LeafLayout.ts:59-91`、`partner/layouter/src/Layouter.ts:110-118`                         |
| E3  | 脏块合并 + 扩边 10px 防残影 clipRender；帧内节流（changed<100）                          | `leafer/packages/partner/renderer/src/Renderer.ts:160-184`、`partner/watcher/src/Watcher.ts:56-61`                                  |
| E4  | 渲染遍历视口外剔除 + 惰性边界                                                            | `leafer/packages/display-module/helper/src/LeafBoundsHelper.ts:36-40`                                                               |
| E5  | 两阶段命中（bounds 预检 + 逐元素 hitCanvas 缓存池 ≤1000 张）                             | `leafer-ui/packages/hit/src/LeafHit.ts:22-47`、`HitCanvasManager.ts:7-46`                                                           |
| E6  | 同尺寸离屏画布池 + 图像 URL 引用计数缓存                                                 | `leafer/packages/canvas/canvas/src/CanvasManager.ts:13-32`、`image/image/src/ImageManager.ts:12-47`                                 |
| E7  | 按 tag 节点工厂（`UICreator.get(tag,json)`）反序列化 + toJSON/skipJSON 可裁剪            | `leafer/packages/display/src/Branch.ts:75-78`、`Leaf.ts:51,214-221`                                                                 |
| E8  | App 三层（ground/tree/sky）+ topChildren 覆盖物分层模型                                  | `leafer-ui/packages/app/src/App.ts:20-22`、`display/src/Group.ts:30`                                                                |
| E9  | 无效果元素 drawFast 快路径 + 半像素对齐                                                  | `leafer-ui/packages/display-module/render/src/UIRender.ts:119-130`、`leafer/packages/canvas/canvas/src/LeaferCanvasBase.ts:141-144` |
| E10 | 可插拔自动布局钩子（`__updateAutoLayout`）→ 自研布局或 flow 插件                         | `leafer/packages/display-module/display-module/src/LeafBounds.ts:156-182`、`leafer-in/packages/flow/src/`                           |
| E11 | 环境抽象（Platform.origin 注入 web/node 原语）→ Node 测试句柄                            | `leafer/packages/platform/platform/src/Platform.ts:8-71`                                                                            |
| E12 | 编辑器叠加层模型（Editor=独立 Group 挂 sky）——供 I16 编辑器立项参考                      | `leafer-in/packages/editor/src/Editor.ts:96-98`                                                                                     |

### 4.2 数据绑定层（→ design-data-binding.md）

| #   | 设计点                                                                                    | 来源（仓库/文件:行）                                                                   |
| --- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| D1  | 绑定双通道：属性级多对多（form.dataIds）+ 绑定点级（realTimes.bind），绑定声明进场景 JSON | meta2d `core.ts:1423,1451`、`core/pen/model.ts:382,391,706-717`                        |
| D2  | 运行时反向索引表（dataId → [{penId,key}]），场景打开时构建                                | meta2d `core.ts:1423-1448`、`core/store/store.ts:225`                                  |
| D3  | 批量值合并派发：多 dataId 命中同 pen 合并为一次属性更新 + 单次 render                     | meta2d `core.ts:3814-3890`                                                             |
| D4  | 值未变去重（onlyChange/dirty 语义）                                                       | FUXA `client/.../fuxa-view.component.ts:503-521`                                       |
| D5  | 按画面可见 tag 集合订阅/退订协议                                                          | FUXA `client/.../hmi.service.ts:428-451`                                               |
| D6  | 统一值回调入口 + 可插拔解析函数（websocket/mqtt/http/SSE 适配器）                         | meta2d `core.ts:2531-2535,3723-3798`                                                   |
| D7  | 数据事件（数据变化→条件→动作）与状态触发器（条件-动作模型，Comparison 算子）              | meta2d `core.ts:4333-4374,4377-4423,4426-4464,4497-4533`、`core/event/event.ts:99-116` |
| D8  | 报警状态机（阈值-状态-ACK-历史，HH/H/L/INFO 四级）                                        | FUXA `server/runtime/alarms/index.js:255-354`                                          |
| D9  | 趋势分块查询协议（tag 数组+时间窗+6h 分块回传；realtime 走订阅流）                        | FUXA `server/runtime/index.js:255-285`、`api/daq/index.js:25-70`                       |

### 4.3 动画与图元（→ design-symbols.md / 动画设计）

| #   | 设计点                                                             | 来源（仓库/文件:行）                                                       |
| --- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| A1  | 帧动画模型（帧=图元属性子集，帧间线性插值，动画组队列 + autoPlay） | meta2d `core/pen/model.ts:333,389,294-295`、`core/pen/render.ts:3319-3540` |
| A2  | 连线动画类型（水流/点阵/箭头/水滴，Path 局部更新）                 | meta2d `core/pen/model.ts:103-110,318-330`、`render.ts:3680`               |
| A3  | rAF + interval 限频动画循环（30ms），与渲染循环分离                | meta2d `core/canvas/canvas.ts:6921-6945`、`core/options.ts:165`            |
| A4  | 状态样式（hover/press 等状态映射）                                 | leafer-in `packages/state/src/index.ts:17-31`                              |
| A5  | 图元注册四类模型（无状态/有状态/动画/自定义）                      | vue-webtopo-svgeditor `src/config-center/`（线上，MIT）                    |
| A6  | 图元=svg path 字符串直接注册                                       | meta2d `core/diagrams/svgPath.ts`                                          |

### 4.4 序列化（→ design-renderer.md，roadmap I2.4「序列化与 renderer 契约设计」）

| #   | 设计点                                                                                     | 来源（仓库/文件:行）                                            |
| --- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| S1  | 场景 JSON 根结构：视口 + 数据源声明 + 图元树平铺 + 事件/触发器 + 数据点（Meta2dData 蓝本） | meta2d `core/store/store.ts:12-114`                             |
| S2  | 图元字段：id/type/name/children[]/canvasLayer + 自定义扩展字段分层                         | meta2d `core/pen/model.ts:124-128,270,381`                      |
| S3  | SVG 画面 + 点表 + 视图配置"三件套"约定（SCADA 领域 20 年验证）                             | OSHMI `conf_templates/*`（线上，GPL 仅参考设计）                |
| S4  | mxGraph XML 兼容序列化（Codec + ModelXmlSerializer）——拓扑连线格式参照                     | maxGraph `packages/core/src/serialization/`（线上，Apache-2.0） |

## 5. 差距分析：与 flux 现有架构的衔接与差距

> flux 平台能力复用表（roadmap Cross-Cutting「平台能力复用」）为硬约束：既有能力禁止重复实现。

### 5.1 flux 集成

| 能力                                                                                                                           | 复用点                                                                                                                         | 差距 / 需要新增                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 响应式取值 `useScopeSelector`（`@nop-chaos/flux-react`，quick-reference.md:521,526，options 含 `paths` 精细化失效）            | 双轨数据模型的外部通道：flux 表达式 `$xxx` 桥接——组件内 `useScopeSelector` 订阅外部 scope 数据，变化 → 组态点表写入            | 组态内点表（自包含）不在 flux scope 内，需自建点表 store；两条通道（scope 订阅 vs 点表订阅）需统一为一条刷新管线（合并帧 + 脏属性收集，性能红线）         |
| 动作派发 `useActionDispatcher()` + `createNormalizedActionEvent`（renderer-helpers.ts:98）                                     | 图元事件 → flux action：点击/双击/悬停事件载荷经 `createNormalizedActionEvent` 规范化 → dispatch（对齐 props.events 现有体系） | leafer 事件 → 图元事件声明（组态 JSON 内 events 字段）→ flux action 的映射层需自研（I11）                                                                 |
| renderer 注册与定义（`registerRendererDefinitions`，@nop-chaos/flux-core；RendererComponentProps 契约，quick-reference.md:66） | `scada-canvas` 按既有 renderer-definitions + registry 模式注册；`props.props`/`meta`/`regions`/`events`/`helpers` 契约         | 组态引擎实例管理（生命周期）不在既有契约内，需 ref 桥接层；`examples.manifest.json`/playground registry/i18n/quick-reference 同步（roadmap 组件注册条款） |
| 表达式编译（flux-formula/flux-compiler）                                                                                       | 图元属性值直接绑 flux 表达式 `$xxx` 时复用编译器                                                                               | 点表引用语法（如 `@{pointId}`）需定义并与编译器衔接（I6.2）                                                                                               |
| UI 组件/样式（@nop-chaos/ui）                                                                                                  | HTML 覆盖层（弹窗/提示）复用                                                                                                   | 无                                                                                                                                                        |

### 5.2 React 桥接

- **形态**：命令式引擎 + 声明式 props（讨论 §八 4）；fabric 官方 README 的 `useRef + useEffect + dispose` 范本可直接参照（render-engines §12 #21，fabric.js/README.md:179-193）。
- **需要自研**：① 引擎实例生命周期（挂载创建 Leafer、卸载 destroy 释放 canvas/事件/动画循环——leafer 无 React 适配，render-engines §8 对照 #8）；② props 更新同步（组态 JSON/点表变更 → 引擎增量更新，避免全量重建——配合 useScopeSelector 订阅）；③ 测试句柄 `window.__flux_scada_<cid>`（dev/test 下暴露引擎实例，roadmap 测试纪律）。
- **差距**：React Compiler 基线下的命令式副作用管理（useEffectEvent 用于事件桥接注册/注销）。

### 5.3 测试策略

| 层                                               | 方案                                                                                         | 差距                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 纯逻辑层（点表/绑定/动画状态机/序列化/坐标变换） | Vitest 单测（对齐既有包测试模式）                                                            | 无——需新建测试文件                              |
| canvas 渲染                                      | Playwright e2e 程序化断言：`page.evaluate` 读 `window.__flux_scada_<cid>` 场景树，禁截图判定 | 测试句柄机制需在桥接层实现（dev/test 构建暴露） |
| 性能验收                                         | I14 benchmark 对标校准后数字                                                                 | 无 node-canvas 依赖（禁引）——e2e 在真实浏览器跑 |

### 5.4 与既有架构的总体衔接结论

1. `scada-canvas` 是**新渲染域**（Canvas 场景图）但不是新集成模式：renderer 注册、事件派发、scope 响应全部走既有通道（平台能力复用表）。
2. **点表刷新性能红线**（禁逐点 setState 直刷 React）要求点表 store 与 React 渲染解耦——leafer 引擎实例持有场景树，点表变化 → 合并帧批处理写入引擎（不经过 React 状态）；React 只负责容器级 props 与事件回调。
3. 组态 JSON（场景 schema）与 flux 既有 schema 体系的关系：`scada-canvas` 的 props 内嵌组态 JSON（字符串或对象）作为单一字段承载，图元级字段不进 renderer-definitions（图元级 type `scada-symbol` 后置 I8/I9 评估，讨论 §九 待定事项）。

## 6. 跨报告一致性核对（I0.5 汇总核对项）

### 6.1 数字一致性（同一性能数字在各报告标注一致）

| 数字                                                 | download                               | render-engines                                                          | scada-apps                        | supplement  | 一致性                                   |
| ---------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------- | --------------------------------- | ----------- | ---------------------------------------- |
| 首屏 1.28s（100 万矩形，官方自报）                   | ✓ §2.1（来源 leafer-ui README L58-68） | ✓ §3.6/§13（同源引用）                                                  | —（不涉及）                       | —（不涉及） | ✅ 一致（含"官方自报待 spike 复测"标注） |
| 内存 320MB（官方自报；官方文档站点 350MB=9.4% 差异） | ✓ §2.1-2.2（校准口径）                 | ✓ §3.6（含无独立复测注记）                                              | —（不涉及）                       | —（不涉及） | ✅ 一致                                  |
| 拖拽 60fps                                           | ✓ §2.1                                 | ✓ §3.6（"60 FPS"大小写差异仅排版；§1 概要表无此数字）                   | —（不涉及）                       | —（不涉及） | ✅ 一致（数值一致）                      |
| 70KB min+gzip / 零依赖                               | ✓ §2.1（70KB 与零依赖，含依赖核对）    | ✓ 仅零依赖（§8 #8 "核心为零依赖、平台无关"）；70KB 由 download 单侧承载 | —（不涉及）                       | —（不涉及） | ✅ 一致（70KB 单一承载，无跨报告冲突）   |
| meta2d"1000+ 动画"=并发指标非内置库                  | —                                      | —                                                                       | ✓ §2.2（README.CN.md:35,85 核实） | —           | ✅ 单报告承载，无跨报告冲突              |
| SceneV"万级数据点/60fps"宣传级                       | ✓ §2.3（标注第三方转述）               | —                                                                       | ✓ §4（标注宣传级）                | —           | ✅ 一致（均标宣传级/非源码）             |

### 6.2 来源链接可访问性抽查（2026-08-03 实测）

- **可访问（HTTP 200）**：leaferjs.com 官网 `#performance`、官方基准站 `benchmark.leaferjs.com/leafer/`、官方文档性能页 `book/leafer-ui/start/performance.html`、gitee `le5le/meta2d.js`、gitee `sovitjs/Sovitjs`。
- **本机网络不可达（TCP 000，环境限制非死链）**：全部 github.com 链接（leafer-ui/FUXA/SceneV/konva/fabric/vue-webtopo/mxgraph/maxGraph/OSHMI 等）——本机 github.com 域名 TCP 被阻断，但已通过 clone 实测仓库存在且内容与报告引用一致（download §1 网络环境记录）；无死链证据。
- **结论**：无失效链接；github 系链接的可达性为执行环境网络限制，不构成报告错误。

### 6.3 报告间引用完整性

- 5 份报告互相引用的路径均存在（download → render-engines/scada-apps/supplement → summary；文件均落地 `docs/analysis/industrial-hmi/`）。
- 讨论文件 §八/§九 决策（运行时优先、leafer 底座、双轨数据模型、scada-canvas 单容器、测试纪律、4 gate）与 5 份报告结论无冲突项；唯一差异为 SceneV（讨论文件列为"深度分析"对象，实际源码不可获取 → 已降级为浅层分析并记录，download §1.2）。

## 7. 共识状态与收口说明

- 5 份报告各自的「文档共识审查」Round 1 均由独立子 agent（fresh session）执行，修正项已全部落地并回填各文档头部记录；各报告进入 Round 2 确认轮（判据：连续一轮 0 新增修正项，≤3 轮）；本文件 Round 1 判定已回填（见本文件头部记录）。
- 按 roadmap Cross-Cutting，I1.1 review gate 为本阶段调研文档共识审查的**终轮复核**（不叠加额外审查轮）；本 plan 收口前须 5 份报告全部达成共识（含 I1.1 作为终轮的预留说明已写入各报告头部）。
- **性能数字人工确认触发**：无不安全方向 >30% 差异（download §2.2 结论 3），无人工确认项新增；观察项（首屏 -36% 方向有利、内存 0% 零余量）交 I1.1/I1.2 复核。

## 8. 对 I1 review gate 的交接说明

I1.1 输入 = 任务范围（讨论文件 §八）+ 本 5 份报告 + 与 roadmap 的差异清单（唯一差异：SceneV 源码不可获取降级浅层；许可矩阵 FUXA/SceneV/meta2d 如实记录，选型影响留 I1.2 裁定）。I1.2 spike 验证点见 §3（V1-V8），任一不成立即触发人工确认。
