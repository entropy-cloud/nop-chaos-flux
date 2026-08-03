# SCADA 组态平台源码调研报告 research-scada-apps.md

> 日期：2026-08-03
> 版本：v1（I0.3 产出）
> 调研项目：meta2d.js（实时数据响应 2D 组态引擎）+ FUXA（MIT 开源 SCADA/HMI 平台）+ SceneV（低代码组态可视化平台，**无源码**，仅 README/在线材料浅层分析）
> 参考仓库：`~/sources/industrial-hmi-research/meta2d.js/`、`~/sources/industrial-hmi-research/FUXA/`、`~/sources/industrial-hmi-research/SceneV/`（及 Gitee 镜像 `scene-v/`，同样无源码）
> 上游：`research-render-engines.md`（I0.2，leafer 引擎层结论）；讨论文件 `docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md`
> 下游：`research-summary.md`（I0.5）、I1.1 review gate、I2.2 数据绑定设计（本文件 §6 衔接点清单）

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent 反复审查直到共识。记录如下：

- **Round 1（2026-08-03）**：独立 agent（fresh session，task `ses_0393571e8ffeu0z120TpJtXiOF`）审查，判定 `REVISE`——7 Major + 11 Minor 修正项（LineAnimateType/CanvasLayer/dataEvents-triggers 行号、echarts 特判行号、dataPoints 行号、画面事件行号、getSvgElements 归属、setDatas/render/bind 转发/onBeforeValue/JetLinks/nextAnimate 行号、hooks 行号、事件执行器注册范围、EventAction 数量、setAlarmAck 行号、掘金文 URL 补充），已全部落地（§2-§4 修订后内容），未裁决项 0。
- **Round 2（2026-08-03）**：独立 agent（fresh session，task `ses_03915afd0ffeXTFcBUZseCTQDl`）确认轮，判定 `REVISE`——18 项中 16 项确认无误；新修正项：批量合并 render 引用行号改为 `setDatas` 尾部 `core.ts:3893`（setValue 自身尾部 :4025）、`CanvasLayer` 成员名 `Main`→`CanvasMain`、StartAnimate 范围 `:426-470`、执行器注册范围 `:357-531`。已全部落地。
- **Round 3（2026-08-03）**：独立 agent（fresh session，task `ses_03908f638ffeX7ejy1x8du2gWr`）确认轮，判定 `REVISE`——R2 四项确认落地；新修正项（§6 #11 LineAnimateType 行号改 `103-110`、`reset`→`clearLifeCycle`（`model.ts:850-876`）、doDataEvent `4497-4533`、realTime.triggers `4333-4374`、globalTriggers `4377-4423`、pen.triggers `4426-4464`、socketCallback 分派 `3796-3800`、frames 分支 `3990-3994`、PenType `6-8`、ChartViewType `29-33`、BindId `715-718`、ProjectData 定义 `:15`、README.md `:247`）。已全部落地。
- **Round 4（2026-08-03）**：独立 agent（fresh session，task `ses_038fb535dffeNHdDJUlwAM8Z7g`）确认轮，判定 `REVISE`——R3 十三项全部验证落地（含 30+ 锚点抽查）；新修正项 3（`lineAnimate*` 系列属性范围 `318-330`、`processValue` 归属 `shapes.component.ts:57`（原文误引 value.component.ts:59+）、`AlarmsManager` 定义 `index.js:14`），已全部落地。
- **Round 5（2026-08-03）**：独立 agent（fresh session，task `ses_038dfd540ffeVMS2IiO31DVpX7`）确认轮，判定 `REVISE`——R4 三项全部验证落地（30+ 锚点抽查）；新修正项 2 Minor（`GaugesManager.Gauges` 注册位 `gauges.component.ts:80,112-121`、`ProjectDataCmdType` 枚举 `project.ts:51-74`），已全部落地。
- **Round 6（2026-08-03）**：独立 agent（fresh session，task `ses_038d77107ffe6UoA5F0YpkbU71`）确认轮，判定 `REVISE`——R5 两项全部验证落地（30+ 锚点抽查）；新修正项 1 Minor（`pen.animateList` 字段 `model.ts:335`，:334 为注释行），已落地。
- **Round 7（2026-08-03）**：独立 agent（fresh session，task `ses_038d3b550ffesrh9cJna2ufXAv`）确认轮，判定 `REVISE`——R6 一项验证落地（90 锚点直查）；新修正项 1 Minor（事件执行器注册范围 `core.ts:357-531`→`initEventFns()` `356-719`，赋值止于 :704 Message），已落地。
- **Round 8（2026-08-03）**：独立 agent（fresh session，task `ses_038cf31e5ffeN5s2rDsHZMkieN`）确认轮，判定 `REVISE`——R7 范围修正验证落地（40+ 锚点复扫）；新修正项 1 Minor（执行器赋值计数 18→19，19 个 `EventAction` 成员各恰一处赋值）。已落地。
- **Round 9（2026-08-03）**：独立 agent（fresh session，task `ses_038c6a423ffeEjey3nz1WpxNpS`）确认轮，判定 `AGREE`——R8 项验证落地（19 执行器各恰一处、止于 :704；80 锚点复扫），**零新增修正项，达成共识**。⚠️ 共识循环修正轮达 8 轮（R1-R8，超 3 轮上限），按 roadmap Cross-Cutting「人工确认阈值」标记为**人工决策观察项**交 I1.1 review gate（本阶段终轮复核）人工裁定——全部修正项均为行号/计数精度类 Minor，无事实/结论争议，I1.1 裁定前本文件仍可作为设计蓝本（结论层面）使用。
- **终轮复核说明（I1.1 review gate，2026-08-03）**：I1.1 gate 已对本文件执行终轮复核（roadmap Cross-Cutting「review gate 执行纪律」+「文档共识审查」不叠加额外审查轮）。裁定：① 超轮观察项（8 轮修正，全部行号/计数精度类 Minor、单调收敛至 AGREE）**维持为非阻断**，无事实/结论争议，不升级人工裁决；② M-1 修正本文件 §6 #9 动画表述（leafer 无帧动画/动画组队列类引擎，但过渡/路径动画原语已有），消除与 render-engines §8 #4 的跨报告矛盾；③ 其余零新增修正项——**终轮复核达成共识（0 新增未落地修正项）**。

---

## 1. 调研概要

| 项目      | 定位                                                    | 许可                                 | 技术栈                                                            | 数据接入                                       | 动画                                          | 值分发模型                             |
| --------- | ------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------- | -------------------------------------- |
| meta2d.js | 实时数据响应 2D 组态引擎（Web 组态/物联网/数字孪生）    | MIT（`LICENSE`）                     | TS monorepo，Canvas 2D 自绘                                       | WebSocket/MQTT/HTTP/SSE/SQL（`networks` 多源） | 帧动画（`frames`/`animations`）＋连线动画     | dataId/绑定点→pen 批量合并             |
| FUXA      | 开源 SCADA/HMI：设备采集+画面组态+报警+趋势+报表        | MIT（`LICENSE`，README.md:247 标注） | Angular 18（client）+ Node.js（server），SVG 图元 + gridster 卡片 | 协议驱动（Modbus/OPCUA/S7 等）＋socket.io 推送 | SVG 属性动画（闪烁/旋转/位移，`GaugeAction`） | tag id 订阅→Variable 事件→SVG DOM 更新 |
| SceneV    | 低代码组态数据可视化平台（工业组态＋大屏＋3D 数字孪生） | **未声明**（仓库无 LICENSE 文件）    | Vue3+TS+Vite+Element Plus+ECharts（README.en.md:4），Canvas/WebGL | ThingsBoard websocket/HTTP/MQTT/WebSocket      | 数据驱动动画、动态路径动画（README.md:94）    | 未知（无源码）                         |

**引用约定**：meta2d.js 路径简写为 `core/…`（即 `packages/core/src/…`）；FUXA 简写为 `client/…`、`server/…`（即 `client/src/app/…`、`server/…`）。行号已逐一 grep/read 核实。

---

## 2. meta2d.js

### 2.1 数据绑定与订阅消息机制

**绑定模型（双通道，均在 Pen 上声明）**：

| 通道     | 定义位置                                                                                                                                                                                  | 字段                                                                                          | 反向索引（构建于 `open()` 后）                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 表单绑定 | `pen.form[]`（`core/pen/model.ts:382`）→ `FormItem{key, dataIds}`（`model.ts:706-717`）                                                                                                   | 属性 key ↔ 变量 dataId（`BindId{dataId, name}`，`model.ts:715-718`）                          | `initBindDatas()`（`core/core.ts:1423`）→ `store.bindDatas[dataId] = [{id: pen.id, formItem}]`（`core/store/store.ts:225`） |
| 实时绑定 | `pen.realTimes[]`（`model.ts:391`）→ `RealTime{key, bind, triggers, mock, productId/deviceId/propertyId}`（`core/event/event.ts:155-168`；`Bind{id, key, deviceId…}` `event.ts:144-153`） | 属性 key ↔ 绑定 id（通常为"productId#deviceId#propertyId"组合，JetLinks 场景 `core.ts:1497`） | `initBinds()`（`core/core.ts:1451`）→ `store.bind[bindId] = [{id, key}]`                                                    |

**值入口（统一回调 `socketCallback`）**：`core/core.ts:3723` 是 WebSocket/MQTT/HTTP/SSE/SQL/网络层消息的总入口——先经 `net.socketCbJs`/`socketCbJs` 自定义解析函数（`core.ts:2531-2535`，`new Function('e','context',js)`），再 `JSON.parse`；若 `data[0].dataId` 存在则走 `setDatas(data)`，否则逐条 `setValue(_data)`（`core.ts:3796-3800`）。数据源：`connectWebsocket`（`core.ts:2563`，onmessage→socketCallback，自动重连 `reconnetTimes`，`core/options.ts:119,210`）、`connectMqtt`（`core.ts:2615+`）、`connectNetwork`（`core.ts:2779`，协议枚举 `mqtt|websocket|http|iot|sql|ADIIOT|SSE`，`core/store/store.ts:121`）、`connectSSE`（`core.ts:3043`）、SQL（`core.ts:3307`）。

**订阅与节流/去重**：`setDatas`/`setValue` 本身不做节流——**去重合并发生在派发阶段**（见下），**节流发生在渲染层**：动画循环 `canvas.animate()` 以 `requestAnimationFrame` + `animateInterval`（默认 30ms，`core/options.ts:78,165`）限频（`core/canvas/canvas.ts:6921-6945`）。通用 `debounce`/`throttle` 工具在 `core/utils/debounce.ts:1-29`（WeakMap 缓存），`InstanceDebouncer`（`debounce.ts:32-55`）用于实例方法防抖；应用例：sceneContainer 容器平移防抖（`core/diagrams/sceneContainer.ts:113`）。

**值变化→属性更新的派发链**：

```
socketCallback (core.ts:3723) ──> setDatas (core.ts:3806 定义, 3814 参数 doEvent?)
  │  对每个 dataId: 查 bindDatas[dataId]（formItem 通道）与 bind[bindId]（realTime 通道）
  │  按 pen 合并为 penValues: Map<Pen, IValue>（同 pen 多个属性合并成一次 setValue；
  │  支持 pen.onBinds(pen, datas, formItem) 计算函数，core.ts:3830-3835, model.ts:686）
  └─> 每 pen setValue(value, {render:false}) (core.ts:3887)
       └─> setValue (core.ts:3904)
            ├─ data.id 命中 bind 变量 → 转 setDatas（core.ts:3936-3944）
            ├─ data.dataId → setDatas；data.tag → find(tag)；普通对象 → 逐 key 转 binds（core.ts:3936-3965）
            ├─ pen.onBeforeValue 预处理（core.ts:3987-3989）
            ├─ setChildValue(pen, afterData)（core/pen/render.ts:4594）→ 计算性属性落 pen
            ├─ canvas.updateValue(pen, afterData)（core/canvas/canvas.ts:8291）
            ├─ pen.onValue?.(pen)（model.ts:669）
            └─ emitter.emit('valueUpdate', pen)（core.ts:4023）──> 触发 triggers（§2.5）
       最后 render() 一次（批量合并，避免逐点重绘——setDatas 尾部 `render && this.render()`，core.ts:3893；setValue 自身尾部渲染 core.ts:4025）
```

**数据点事件**：`dataEvents`（`core/store/store.ts:83`，条件 = `Comparison` 算子，`event.ts:99-116`）在锁定态值变化时求值并执行动作（`doDataEvent`，`core.ts:4497-4533`）。Mock：`dataset.devices[]` + `enableMock`（`core.ts:3423-3481`）。

### 2.2 动画体系

**对象模型（无独立 Animator 类，动画状态全在 `pen.calculative` + `store.animates`）**：

| 构件                            | 位置                                                                                                                                                                           | 说明                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `pen.animations[]`（动画组）    | `model.ts:389`                                                                                                                                                                 | 每项含 `name/frames/autoPlay/duration`，`currentAnimation` 记录当前索引 |
| `pen.frames[]`（动画帧）        | `model.ts:333`                                                                                                                                                                 | 帧即 Pen 子集（`duration/x/y/scale/rotate/样式…`），帧间线性插值        |
| `pen.animateList`（预置动画组） | `model.ts:335`（:334 为注释行"提前预置的不同效果的动画组"）                                                                                                                    | 提前预置的不同效果的动画组                                              |
| `animateCycle`/`nextAnimate`    | `model.ts:294-295`                                                                                                                                                             | 循环次数（0=无限）/动画结束接续                                         |
| `pen.type` 连线动画             | `LineAnimateType`（`model.ts:103-110`：Normal 水流/Beads/Dot/Arrow/WaterDrop/Custom；字段 `lineAnimateType` 在 `model.ts:326`）＋`lineAnimate*` 系列属性（`model.ts:318-330`） | 管线/流体效果                                                           |
| `store.animates: Set<Pen>`      | `core/store/store.ts:236`                                                                                                                                                      | 正在播放的动画 pen 集合（统计接口 `core.ts:1404`）                      |

**启动**：`startAnimate`（`core.ts:1906`）——无参时按 `autoPlay` 过滤（`core.ts:1908-1917`）；`deepClone(pen.animations[index])` 后 `setValue({id, ...animate})` 把动画帧属性写入 pen（`core.ts:1968-1987`），加入 `store.animates`，最后 `canvas.animate()`（`core.ts:1999`）。

**播放循环**：`canvas.animate()`（`canvas.ts:6921`）——rAF 自驱动，`animateInterval` 限频（30ms）；每个 pen 调 `setNodeAnimate(pen, now)`（`core/pen/render.ts:3319`：按 `(now-start) % duration` 定位帧、跨帧推进 `frameIndex`、`cycleIndex > animateCycle` 时结束）→ 帧内插值 `setNodeAnimateProcess(pen, process)`（`render.ts:3500`：x/y/scale/rotate/样式按 process∈[0,1] 插值，写 `pen.calculative.worldRect`）；连线动画 `setLineAnimate(pen, now)`（`render.ts:3680`）。帧结束 → `nextAnimate`（`canvas.ts:6963`）接续下一动画组；`stopAnimate`（`core.ts:2020`）恢复初始（`restoreNodeAnimate`），`pauseAnimate`（`core.ts:2002`，记录 `calculative.pause`）。

**"1000+ 动画"的来源**：README 宣称"支持 1000+动画播放""可高达 1000 动画同时播放"（`README.CN.md:35,85`）——这是**并发播放性能指标**，而非内置动画资源库；动画效果来自 `frames` 帧动画＋`LineAnimateType` 类型＋`animateList` 预置组合，无独立 fx 包。

**状态/数据驱动衔接**：事件动作 `StartAnimate/PauseAnimate/StopAnimate`（`core.ts:426-470`，StartAnimate 执行器于 :426）；`valueUpdate` → `realTime.triggers` 条件命中 → 执行动作（`core.ts:4333-4374`）；`setValue` 携带 `frames` 时自动 `stopAnimate` 并重算 `showDuration`（frames 分支 `core.ts:3990-3994`）——**数据可动态替换动画帧**。

### 2.3 图元注册机制

- **注册表**：`globalStore`（`core/store/global.ts:4-24`）四张表：`path2dDraws`（Path2D 绘制函数）、`canvasDraws`（ctx 绘制函数）、`lineAnimateDraws`、`anchors`；注册 API：`register/registerCanvasDraw/registerAnchors/registerLineAnimateDraws`（`global.ts:26-48`）。
- **Pen 模型**：`Pen extends Rect`（`model.ts:123`）——通用属性（id/tags/parentId/type/name，`model.ts:124-128`）＋样式/事件/数据/动画字段；`PenType.Node|Line`（`model.ts:6-8`）。图元即"name → 绘制函数"，`svgPath` 支持 SVG path 字符串直接注册（`core/diagrams/svgPath.ts`，README 宣称"支持 SVG path" `README.CN.md:89`）。
- **内置分类**：`commonPens()`（`core/diagrams/index.ts:44-73`）：基础几何（rectangle/circle/diamond/triangle/pentagon/hexagon…）、箭头、连线（line）、DOM 型（iframe/video/gif）、脑图（mindNode/mindLine）、表单（form）、组合（combine=rectangle 别名）、场景容器（sceneContainer）。聚合包再注册 8 个图元包：`meta2d.js/src/index.ts:19-39`（class/sequence/activity/flow/chart/form/fta/le5le-charts，`registerCommonDiagram`）。
- **自定义扩展**：无独立 `registerPen` API——扩展 = `register({penName: drawFn})`＋（可选）`registerCanvasDraw`＋`registerAnchors`（构造器先注册 `commonPens()`，`core.ts:129`；实例方法 `register = register`，`core.ts:1823`）。

### 2.4 JSON 序列化格式

- **无 toJson/fromJson**：序列化入口是 `data()`（`core/core.ts:2478`）——`deepClone(store.data)` 后补 `dataPoints`（= `store.bind` + `store.bindDatas` 的 key 集合，`core.ts:2493-2495`）、清理未引用 `paths`；反序列化是 `open(data)`（`core.ts:1196`）——`Object.assign(store.data, data)`、补 pen.id（`s8()`）、`canvas.makePen(pen)`（`core.ts:1215-1224`）。
- **文档根结构 `Meta2dData`**（`core/store/store.ts:12-114`）：`pens[]` 平铺数组 + `x/y/scale/origin/center`（视口）+ `locked`（运行态锁定）+ `websocket/mqtt/networks`（数据源声明，`store.ts:21-63`）+ `triggers`（全局状态，`store.ts:78`）+ `dataEvents`（数据点事件，`store.ts:83`）+ `dataset`（mock 数据）+ `http` 轮询 + `dataPoints`（运行时推导）。
- **Pen 字段**：`id/tags/parentId/type/name`（`model.ts:124-128`）、`children: string[]`（子树 id 列表，`model.ts:270`）、`canvasLayer`（分层，`model.ts:381`）、`events/triggers/realTimes/form/animations`（`model.ts:348,392,391,382,389`）。
- **图层/分组**：`CanvasLayer` 枚举（CanvasTemplate/CanvasImageBottom/CanvasMain/CanvasImage，`model.ts:34-39`）；组合（combine）以 parentId/children 表达父子树；`pens[]` 平铺 + `paths{}`（svg path 资源）分离存储——**组态文件 ≈ 场景 JSON（视口+数据源+图元树）+ 外部 svg path 资源**。

### 2.5 生命周期 hooks

- **Pen 级函数 hooks**（`core/pen/model.ts:668-693`）：创建/销毁 `onAdd/onDestroy`；更新 `onValue/onBeforeValue/onBinds/onRenderPenRaw`；几何 `onMove/onResize/onRotate/onScale`；交互 `onClick/onMouseEnter/onMouseLeave/onMouseDown/onMouseMove/onMouseUp/onKeyDown/onMouseWheel/onContextmenu`（`onKeyDown/onWheel/onContextmenu` 于 `model.ts:691-693`）；输入 `onShowInput/onInput`；其他 `onSetTheme/onChangeId/onStartVideo/onPauseVideo/onStopVideo`。清除逻辑 `clearLifeCycle` 置 undefined（`model.ts:850-876`）。README 宣称"画笔全生命周期事件（创建、更新、销毁）"（`README.CN.md:45`）。
- **Schema 事件**：`Event{name, action, where, value, params, timeout, confirm, conditions, actions…}`（`core/event/event.ts:24-58`；事件名列表 `event.ts:7-22`，动作枚举 `EventAction` 含 Link/SetProps/JS/Emit/Navigator/Dialog/Message 等 19 种 `event.ts:60-80`）；执行器 `this.events[EventAction.*]`（注册于构造器 `initEventFns()`，`core.ts:356-719`，19 个枚举成员各恰一处赋值、止于 :704（Message），含 StartAnimate 于 :426，`timeout` 延时、`confirm` 弹窗确认）。
- **状态触发器**：值更新事件链上按条件（`judgeCondition`，Comparison 算子 `event.ts:99-116`）求值 `realTime.triggers`（`core.ts:4333-4374`）、全局 `globalTriggers`（`core.ts:4377-4423`）、`pen.triggers` 状态机（`core.ts:4426-4464`）——**条件-动作模型是组态"动态响应"的主干**。

### 2.6 直接复用 vs 仅借鉴边界

| 维度                                                 | 判定                                                                                                                                         | 依据                                    |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 许可                                                 | 可复用（MIT，`LICENSE`；FUXA 亦 MIT）                                                                                                        | 无需授权成本                            |
| 数据绑定模型（bindDatas/bind 双通道 + 批量合并派发） | **借鉴设计**（实现细节与引擎耦合：`setValue` 直接写 `pen.calculative`/worldRect，绑定 `store.pens` 扁平表）                                  | `core.ts:3814-3901, 3904-4028`          |
| 动画（帧插值/动画组/连线动画）                       | **借鉴模型**（帧=Pen 子集插值、`animates` 集合、rAF+interval 限频）；meta2d 动画与 rect/calculative 强耦合，leafer 需自建                    | `render.ts:3319-3700`、`canvas.ts:6921` |
| 事件-条件-动作模型（Comparison/Trigger/EventAction） | **直接借鉴**（与渲染层解耦的纯数据模型）                                                                                                     | `event.ts:24-168`                       |
| 序列化（pens 平铺+数据源+事件）                      | **借鉴字段布局**；`data()/open()` 直接读写 `store.data`，与引擎生命周期粘连                                                                  | `store/store.ts:12-114`、`core.ts:1196` |
| 注册机制（register 函数表）                          | 可借鉴函数注册表思想；meta2d 的 Pen 是"数据结构+绘制函数"耦合体，leafer 场景图应直接注册绘制对象                                             | `global.ts:26-48`                       |
| 不建议直接复用                                       | 网络层（websocket/mqtt/http/sql 内嵌 core）、mock、JetLinks 业务（`core.ts:1497`）、echarts 特判（`core.ts:3983-3986`）——与业务/平台绑定过深 | `core.ts:2520-3720`                     |

---

## 3. FUXA

### 3.1 点表/变量绑定模型

- **点表（tags）数据结构**：`Device{id,name,enabled,type,polling,property,tags:{id:Tag}}`（`client/_models/device.ts:19-52`）；`Tag{id(GUID), name, type, memaddress, address, divisor, format, init, scale, deadband, daq, sysType…}`（`device.ts:58-133`）；`TagDaq{enabled, interval, changed, restored}`（`device.ts:140-156`）；`TagScale` 线性/时间/表达式换算（`device.ts:1085-1102`）；`TagSystemType`（设备连接状态系统点，`device.ts:1104-1105`）。设备协议枚举 17 种（Modbus/OPCUA/S7/BACnet/MQTT…，`device.ts:238-257`），CSV 导入导出（`device.ts:445-828`）。
- **项目模型**：`ProjectData{server, hmi, devices, charts, alarms, scripts, reports…}`（`client/_models/project.ts:15` 起），增量命令 `ProjectDataCmdType`（`project.ts:51-74`）。
- **实时值管道**：socket.io（`client/_services/hmi.service.ts:186-322`）——`initSocket` 带 token 连接；**按 tag 订阅**：`DEVICE_TAGS_SUBSCRIBE`（合并 `viewsTagsSubscription + homeTagsSubscription` 后 `new Set` 去重上报，`hmi.service.ts:428-451`）→ 服务端按订阅列表推 `DEVICE_VALUES`（`hmi.service.ts:248-272`，含 value/timestamp/quality，并做 device-adapter id 重映射）→ 缓存进 `variables[id]` 并 `onVariableChanged.emit`（`hmi.service.ts:249-257`）。写入：`putSignalValue` → `socket.emit('device-values', {cmd:'set'})`（`hmi.service.ts:94-118`）。事件类型枚举 `IoEventTypes`（`hmi.service.ts:737-759`）。
- **绑定到图元的机制**：`GaugeProperty.variableId`（`client/_models/hmi.ts:221-240`）＝图元→tag 主绑定；`fuxa-view.handleSignal(sig)` 查 `ViewSignalGaugeMap`（domViewId→signalId→GaugeSettings[]，`hmi.service.ts:693-735`）→ 每图元 `checkStatusValue`（`onlyChange` 去重：值未变不刷新，`fuxa-view.component.ts:503-521`）→ `processValue` 写 SVG DOM。tag id 约定 `src + '^~^' + name`（`HmiService.toVariableId`，`hmi.service.ts:41,654-656`）。跨画面变量映射 `variablesMapping`（`fuxa-view.component.ts:149-160, 480-500`）。

### 3.2 报警

- **定义**：`Alarm{name, property{variableId}, highhigh/high/low/info: AlarmSubProperty, actions}`（`client/_models/alarm.ts:3-12`）；`AlarmSubProperty{enabled, min/max, checkdelay/timedelay, text, group, ackmode, color}`（`alarm.ts:52-59`）；确认模式 float/ackactive/ackpassive（`alarm.ts:84-88`）；状态 N(激活)/NF(恢复)/NA(已确认)（`alarm.ts:166-170`）。
- **触发状态机（服务端）**：`AlarmsManager`（`server/runtime/alarms/index.js:14`）每秒 `_checkStatus()`（`index.js:36-38`）跑状态机 `INIT→LOAD→IDLE`（`index.js:255-290`）；`_checkAlarms` 按变量读 `devices.getDeviceValue` 后对每条 alarm `check(time, ts, value)`（bitmask 支持，`index.js:297-354`）；变化写库 + `_emitAlarmsChanged` 推送（`index.js:509+`）。
- **确认/历史**：`setAlarmAck`（`index.js:182-215`，权限校验，写 acktime/userack）；历史存取 sqlite（`server/runtime/alarms/alarmstorage.js:33` 建库、`:131 getAlarms`、`:151 getAlarmsHistory`、`:173 setAlarms`）；API 层 `server/api/alarms/index.js`。
- **数据流**：触发→sqlite→socket `ALARMS_STATUS`（`hmi.service.ts:298-300`）→报警视图/表；动作 `popup/setView/setValue/runScript/toastMessage`（`alarm.ts:146-153`）。

### 3.3 趋势曲线

- **客户端**：`Chart{lines: ChartLine{device,id,color,zones…}}`（`client/_models/chart.ts:1-31`）；视图模式 `realtime1/history/custom`（`ChartViewType`，`chart.ts:29-33`）；渲染 uPlot（`client/gauges/controls/html-chart/chart-uplot/chart-uplot.component.ts:281`），history 模式按 `refreshInterval` 定时重查（`chart-uplot.component.ts:270-275`），realtime 模式直接消费订阅值 `addValue`（`chart-uplot.component.ts:415-434`）。
- **查询协议**：socket `DAQ_QUERY`（`DaqQuery{sids, from, to, chunked}`，`hmi.service.ts:421-426`；模型 `hmi.ts:680-696`）→ 服务端按 6 小时块切片 `chunkTimeRange` 逐块返回 `DAQ_RESULT`（`server/runtime/index.js:255-285`）；另有 REST `GET /api/daq?query=`（`server/api/daq/index.js:25-70`，`from===to` 时返回当前值）。
- **历史存储**：`daqstorage`（`server/runtime/storage/daqstorage.js:26` init、`:91 getNodesValues`）抽象多后端：sqlite/questdb/influxdb/tdengine（目录 `runtime/storage/{sqlite,questdb,influxdb,tdengine}`）；InfluxDB 支持 1.8/2.x FLUX（`runtime/storage/influxdb/index.js:8-71`）。

### 3.4 画面导航

- **路由**：`home`/`home/:viewName` 承载运行时画面（`client/app.routing.ts:27-56`）。
- **View 模型**：`View{id, name, profile(尺寸/背景), items(图元设置表), variables(画面变量表), svgcontent(SVG 源码), property(开/关事件)}`（`client/_models/hmi.ts:13-41`）；全局布局 `LayoutSettings{start(首页), navigation(侧栏菜单), header}`（`hmi.ts:44-100`）。
- **画面切换与传参**：图元事件动作 `onpage/onOpenTab/ondialog/oncard`（`hmi.ts:410-415`）；脚本命令 `SETVIEW/OPENCARD`（`hmi.service.ts:660-673`）；`loadPage(viewref, options.variablesMapping)` 带变量映射打开画面、`openDialog` 弹窗、卡片 `zIndex` 浮层管理（`fuxa-view.component.ts:842-930`）。

### 3.5 图元组织

- **Widget 模型**：`GaugeSettings{id, type, property: GaugeProperty}`（`hmi.ts:206-219`）；`WidgetProperty extends GaugeProperty` 追加 `type/svgContent/scriptContent/varsToBind`（`hmi.ts:242-253`）；`GaugeProperty{ranges, events, actions, options, readonly…}`（`hmi.ts:221-240`）。
- **SVG 画面布局**：运行时画面 = SVG 字符串（`view.svgcontent`），**图元 id ↔ SVG element id** 一一对应；`getSvgElements` 为 `fuxa-view.component.ts` 的静态方法（调用点 346/404/733），编辑器侧经 `getGaugeSettings`（`client/app/editor/editor.component.ts:413-458`）维护图元↔SVG 元素关联；卡片式画面 = gridster 布局 `[{x,y,cols,rows,card}]`（`client/app/cards-view/cards-view.component.ts:70-90`，gridster 配置 `GridType` 来自 `profile.gridType`，`cards-view.component.ts:62-68`）。
- **属性面板 schema**：`gauge-property` 组件族（`flex-variable/flex-event/flex-action/flex-auth/flex-input/…`，`client/gauges/gauge-property/`）；控件注册以静态 `TypeTag`（如 `svg-ext-value`）为 key 注册进 `GaugesManager.Gauges`（`gauges.component.ts:80,112-121`），运行时分发到具体控件组件 `processValue`（`shapes.component.ts:57`）。

### 3.6 可提取的 SCADA 平台语义设计点

| 语义         | 实现位置                                             | 要点                                                                                               |
| ------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 点表结构     | `device.ts:58-133`                                   | tag=设备+地址+类型+格式+量程换算+DAQ 采样配置（`TagDaq`）＋死区（`deadband`，`device.ts:158-161`） |
| 实时订阅推送 | `hmi.service.ts:186-322,428-451`                     | 前端按 tag 集合订阅/退订；服务端按订阅表推送 value+timestamp+quality；adapter id 重映射            |
| 报警状态机   | `alarms/index.js:255-354`                            | 1s 轮询 + 状态机（初始化/装载/运行）+ 4 级阈值（HH/H/L/INFO）+ 恢复/确认状态位                     |
| 趋势查询协议 | `runtime/index.js:255-285`、`api/daq/index.js:25-70` | 按 tag 数组+时间窗查询、6h 分块回传、realtime 走订阅流                                             |
| 画面组织模型 | `hmi.ts:13-41,206-253`                               | View=SVG 源码+图元设置表+画面变量表；Widget=属性(变量绑定/范围/事件/动作)                          |
| 值分发去重   | `fuxa-view.component.ts:503-521`                     | `GaugeStatus.onlyChange` 值未变跳过刷新（类似 dirty 标记）                                         |

---

## 4. SceneV（浅层分析，非源码级）

> **标注**：`~/sources/industrial-hmi-research/SceneV/`（及 Gitee 镜像 `scene-v/`）仅含 README + assets 占位，**无源码、无许可声明**；本节约定仅引用 README 与在线材料，信息有限，所有结论为"宣称/宣传"级别，待获取源码后复核。

| 设计点        | 已知信息（引用）                                                                                                                                                                                                              | 判定                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 定位/技术栈   | 低代码组态＋数据可视化大屏；Vue3+TS+Vite+Element Plus+ECharts（`SceneV/README.en.md:4`；README.md:120-127）                                                                                                                   | 参考（技术选型与我们无关，leaper 层不依赖）                                  |
| 渲染          | "基于 Canvas 的高性能渲染引擎，支持万级数据点"（README.md:88）；"Canvas & WebGL 渲染引擎…60fps"（掘金推广文《SceneV：基于Vue3与ThingsBoard的高性能低代码组态可视化解决方案》§二，https://juejin.cn/post/7612948192175767567） | 参考——与我们自研 leafer 路线一致，无新增语义                                 |
| 数据源        | ThingsBoard websocket 无缝接入（README.md:85-89,124）+ HTTP/MQTT/WebSocket 多源（README.md:85）；"数据变化毫秒级响应"（掘金文 §三.1，同上链接）                                                                               | **值得深挖（若获源码）**——TB 遥测→组态绑定映射方案是 I2.2 数据绑定的直接对标 |
| 组件/图元扩展 | 控件/图表/图形/图元/模板五类扩展（README.md:102-109）                                                                                                                                                                         | 值得深挖——图元模型与属性面板 schema                                          |
| 交互事件      | 拖拽/点击/缩放/平移（掘金文 §三.3，同上链接）；"数据触发、条件触发"（如温度超阈值弹窗/变色，掘金文 §三.3）；系统消息/自定义消息/生命周期 Hook/系统接口（README.md:114-118）                                                   | 值得深挖——事件-条件体系与 meta2d `Trigger` 同构性验证                        |
| 组态效果      | "动态路径动画，模拟物流或数据流向"（README.md:94）                                                                                                                                                                            | 参考——与我们规划的数据流动画一致                                             |
| 多端          | 跨浏览器+移动端 webview+全平台（README.md:96-100）                                                                                                                                                                            | 参考                                                                         |
| 3D 数字孪生   | 官方文档站宣称 3D 场景（https://api.meta2dthingsboard.cn）                                                                                                                                                                    | 仅参考（超出 leafer 2D 组态范围）                                            |
| 许可          | **未声明**（仓库无 LICENSE 文件）                                                                                                                                                                                             | ⚠️ 若复用需先联系作者确认                                                    |

---

## 5. 三大项目设计对比速览

| 维度     | meta2d.js                                         | FUXA                                                               | SceneV（宣传级）       |
| -------- | ------------------------------------------------- | ------------------------------------------------------------------ | ---------------------- |
| 图元模型 | Pen（数据结构+绘制函数表）                        | SVG element + GaugeSettings 属性                                   | 未知                   |
| 绑定粒度 | 属性级（form.dataIds）/绑定点级（realTimes.bind） | 图元级 variableId（1 主绑定点+多 action/range 引用）               | 未知                   |
| 值分发   | dataId 反向索引→按 pen 合并→单次 render           | tag 订阅→Variable 事件→逐图元 DOM 更新（onlyChange 去重）          | 数据驱动视图（毫秒级） |
| 动画     | 帧动画（属性插值）+连线动画                       | SVG 属性动画（blink/rotate/move，`GaugeAction`，`hmi.ts:334-370`） | 数据触发/路径动画      |
| 报警     | 无内置（靠 triggers 条件动作）                    | 完整（状态机+ACK+历史）                                            | 告警联动（宣传）       |
| 趋势     | 无内置（图表走 echarts 数据通道）                 | 完整（DAQ+分块查询）                                               | 大屏图表（宣传）       |
| 许可     | MIT                                               | MIT                                                                | 未声明                 |

---

## 6. 衔接点清单（Follow-up，供 I2.2 数据绑定设计引用）

> 衔接方式中的"leafer 层"指 I0.2 调研结论（leafer-ui 场景图：Leaf 树 + watcher/layouter/renderer 调度，`research-render-engines.md` §2）。

| #   | 设计点                                                                 | 来自项目（文件:行）                                               | 与 leafer 层的衔接方式                                                                                                                                                                            |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 绑定双通道：属性级 `form.dataIds`（多对多）＋绑定点级 `realTimes.bind` | meta2d `core.ts:1423,1451`；`model.ts:382,391,706-717`            | leafer 节点上挂绑定声明（节点自定义数据），flux 数据层建反向索引表；leafer 不感知                                                                                                                 |
| 2   | 绑定表反向索引 `dataId → [{penId, key}]`（构建于场景打开时）           | meta2d `core.ts:1423-1448`（`bindDatas`）                         | 场景加载后由 flux store 构建（非 leafer 树内），支持运行时按需重算                                                                                                                                |
| 3   | 批量值合并派发：多 dataId 命中同 pen 合并为一次属性更新，单次 render   | meta2d `core.ts:3814-3890`（`penValues: Map`）                    | 对应 leafer `batchUpdate`/dirty 合并，避免逐点触发 watcher                                                                                                                                        |
| 4   | 值未变去重（onlyChange/dirty 语义）                                    | FUXA `fuxa-view.component.ts:503-521`（`GaugeStatus.onlyChange`） | flux 数据层做值比较去重，减少 leafer 属性写入                                                                                                                                                     |
| 5   | tag 级订阅/退订协议（按当前画面可见 tag 集合订阅）                     | FUXA `hmi.service.ts:428-451`（`viewsTagsSubscription`）          | 与 leafer 无关：画面切换时 flux 数据层维护订阅集；leafer 仅渲染                                                                                                                                   |
| 6   | 统一值回调入口 + 自定义解析函数（`socketCbJs`）                        | meta2d `core.ts:2531-2535,3723-3798`                              | flux 数据层协议适配器（websocket/mqtt/http/SSE），与 leafer 解耦                                                                                                                                  |
| 7   | 数据事件（`dataEvents`：数据变化→条件→动作）                           | meta2d `core.ts:4497-4533`；`event.ts:99-116`（Comparison 算子）  | 动作若改节点属性 → leafer setAttr；动作若播动画 → 上层动画控制器                                                                                                                                  |
| 8   | 状态触发器（`realTime.triggers`/`pen.triggers` 条件-动作）             | meta2d `core.ts:4333-4374,4426-4464`                              | 条件求值在 flux 表达式层，命中后经 API 驱动 leafer 节点/动画                                                                                                                                      |
| 9   | 帧动画模型（帧=Pen 属性子集，插值写 calculative）                      | meta2d `render.ts:3319-3540`（`setNodeAnimate/Process`）          | leafer 无帧动画/动画组队列类引擎（I0.2 §8 #4：`@leafer-in/animate` 过渡/路径动画原语已有），帧动画与动画组队列语义需自研 Animator（I1.1 gate M-1 修正，消除与 render-engines §8 #4 的跨报告矛盾） |
| 10  | rAF + interval 限频动画循环（`animateInterval` 30ms）                  | meta2d `canvas.ts:6921-6945`；`options.ts:165`                    | 动画循环与 leafer 渲染循环分离，经 `leafer.requestRender` 触发重绘，避免双 rAF                                                                                                                    |
| 11  | 连线动画类型（水流/点/箭头，`LineAnimateType`，`model.ts:103-110`）    | meta2d `model.ts:103-110,318-330`；`render.ts:3680`               | leafer `Pen` 路径对象上实现 dash-offset/点阵动画（Path 局部更新）                                                                                                                                 |
| 12  | 序列化：场景 JSON = 视口+数据源声明+图元树+事件/触发器（`Meta2dData`） | meta2d `store/store.ts:12-114`；`core.ts:2478,1196`               | leafer 场景树序列化（`research-render-engines.md`）+ flux 扩展字段（绑定/事件/动画）分层存储                                                                                                      |
| 13  | 报警状态机（阈值-状态-ACK-历史）与画面/趋势解耦                        | FUXA `alarms/index.js:255-354`、`alarm.ts:52-99`                  | 独立数据层服务，报警状态经绑定通道驱动图元变色/闪烁                                                                                                                                               |
| 14  | 趋势分块查询协议（tag 数组+时间窗+分块回传）                           | FUXA `runtime/index.js:255-285`、`api/daq/index.js:25-70`         | flux 数据层服务；曲线组件（DOM/图表库）消费，不进 leafer 场景树                                                                                                                                   |
| 15  | 图元注册表（函数表：绘制/锚点/自定义）                                 | meta2d `global.ts:26-48`；`diagrams/index.ts:44-73`               | leafer 直接用自有图形类注册；仅借鉴"按 name 查绘制实现"的 schema 化思想                                                                                                                           |

---

## 7. 对 I2.2 数据绑定设计的初步建议（来自本次调研）

1. **绑定声明进场景 JSON，索引表进运行时 store**（meta2d 模型）：图元只声明"绑什么"，运行时构建 `dataId→pen` 反向索引；leafer 层只接收最终属性值。
2. **批量合并是性能关键**：高频点表刷新时按 pen 合并 + 单次渲染/批更新（meta2d `setDatas` 模式 + FUXA `onlyChange` 去重的组合）。
3. **"条件-动作"事件链应独立成数据层模块**（meta2d `Trigger`/FUXA `AlarmStatus` 都验证了该模式），渲染层只响应最终动作。
4. **动画与数据绑定解耦**：动画控制器消费绑定值，经 leafer 属性接口驱动，不复用引擎内部状态。
