# 补充项目浅调研报告 research-supplement.md

> 日期：2026-08-03
> 版本：v1（I0.4 产出）
> 调研项目：Sovit2D / 数维图（含智雨物联核实）、vue-webtopo-svgeditor、mxGraph / maxGraph、OSHMI（含继任者 JSON-SCADA）
> 来源说明：**线上浅调研**（web 阅读 README + GitHub/Gitee 仓库页 + 关键源码文件与 LICENSE 原文，未下载源码、未本地克隆）
> 上游依据：讨论文件 `docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md` §三/§五；roadmap `docs/components/roadmap-industrial-hmi.md` I0.4
> 下游：`research-summary.md`（I0.5）、I1.1 review gate

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent 反复审查直到共识。记录如下：

- **Round 1（2026-08-03）**：独立 agent（fresh session，task `ses_03926a175ffeRanm3cnbf0VVWR`）审查，判定 `REVISE`——1 Major + 3 Minor 修正项（gitee 页脚归属误判/npm 版本号/掘金文引用对应/gitee 搜索结论可复现性），已全部落地（§2-§3 修订后内容），未裁决项 0。
- **Round 2（2026-08-03）**：独立 agent（fresh session，task `ses_03915a6acffeAWDp9EQDxit4ms`）确认轮，判定 `REVISE`——4/4 确认落地；新修正项 2 Minor（搜索结论存疑标注错挂到 GitHub 搜索分句、FUXA 误标"国产"——实为国际团队开源项目）。已全部落地。
- **Round 3（2026-08-03）**：独立 agent（fresh session，task `ses_03908ef90ffeGfCcLWXuWaFP8C`）确认轮，判定 `AGREE`——2 项修正验证落地（搜索存疑标注锚点覆盖双分句、FUXA"国际团队开源"表述），全文通读**零新增修正项，达成共识**（共识循环：R1-R2 修正 2 轮 + R3 确认轮，未超轮次上限）。
- **终轮复核说明**：I1.1 review gate 为本文件「文档共识审查」的终轮复核（不叠加额外审查轮，roadmap Cross-Cutting）。

---

## 1. 调研概要

| 项目                     | 官方仓库（核实后地址）                                                                           | Star（约） | 最近更新（pushed_at）                         | 许可（核实结果）                                                        | 渲染方案                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ---------- | --------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| Sovit2D / 数维图         | [gitee.com/sovitjs/Sovitjs](https://gitee.com/sovitjs/Sovitjs)                                   | 4          | 2023-11-06                                    | **未声明 LICENSE**（README 占位仓，无源码）                             | Canvas + SVG（官方产品页自述，产品为闭源商业） |
| vue-webtopo-svgeditor    | [github.com/yaolunmao/vue-webtopo-svgeditor](https://github.com/yaolunmao/vue-webtopo-svgeditor) | 506        | 2025-01-12（README 声明永久停更）             | **MIT**（自带 SVG 素材除外）                                            | 原生 SVG + Vue3 DOM                            |
| mxGraph                  | [github.com/jgraph/mxgraph](https://github.com/jgraph/mxgraph)                                   | 6913       | 2020-11-13（2021-03-31 归档）                 | **修改版 Apache-2.0**（附 Atlassian 排他条款，GitHub 判定 NOASSERTION） | SVG + HTML（vanilla JS）                       |
| maxGraph（mxGraph 继任） | [github.com/maxGraph/maxGraph](https://github.com/maxGraph/maxGraph)                             | 1131       | 2026-08-01（活跃）                            | **Apache-2.0**（干净）                                                  | SVG（TS 重写）                                 |
| OSHMI                    | [github.com/riclolsen/OSHMI](https://github.com/riclolsen/OSHMI)                                 | 458        | 2026-05-02（README 声明已被 JSON-SCADA 继任） | **GPL-3.0**                                                             | SVG（Inkscape 画面）+ 浏览器 DOM               |

**关键核实结论（先行摘要）**：

1. **Sovit2D 官方仓库为 gitee.com/sovitjs/Sovitjs（数维图科技），不是任务书猜测的 gitee.com/sovitor/sovit2d（已核实 404）**；仓库仅 4 commits、纯 README/图片占位，**不含源码、未声明许可**——无法作为代码借鉴来源，只能参考产品形态。
2. **"Sovit2D 来自智雨物联"未能证实**：智雨物联（北京智雨物联科技有限公司，krmes.com）是独立商业公司，其官网未提及 Sovit2D/数维图；Sovit2D 归属长沙数维图信息科技有限公司（sovitjs.com）。**"对接 ThingsBoard"亦未找到官方证据**（官方简介仅提 MQTT 接入；疑似与 meta2d-thingsboard-designer 等"ThingsBoard 组态对接"项目混淆）。如实记录，均标为未核实。
3. **mxGraph 许可争议属实且比预期更具体**：jgraph/mxgraph 的 LICENSE 是 Apache-2.0 的**修改版**——新增第 4(e) 条禁止 Atlassian 实体使用 + 页脚声明 SEIBERT/MEDIA 为 JGraph 在 Atlassian 生态内的独家被许可人；maxGraph 于 2021-06-02 因该许可问题更名并改用**干净 Apache-2.0**（证据见 §4）。
4. **OSHMI 确为 GPL-3.0**（LICENSE 原文核实），且 README 明示"OSHMI was succeeded by JSON-SCADA"；**"基于 WebSocket"的说法不准确**——OSHMI 本体 web 客户端走 HTTP(fetch) 轮询 + 服务器侧 JSON-over-UDP 接口；WebSocket 实时通道属继任者 JSON-SCADA。商用约束见 §5。

---

## 2. Sovit2D / 数维图（国产组态大屏平台）

### 2.1 定位与核实结论

- **定位**：Sovit2D 是数维图（长沙数维图信息科技有限公司）的 Web 组态在线编辑器产品，面向 SCADA/HMI/仪表板/IIOT 可视化大屏；同族产品 Sovit3D（Web3D）、SovitChart。官方产品页：<https://www.sovitjs.com/>（meta 声明"低代码可视化APaaS平台\_Web组态与Web3D开发平台-长沙数维图信息科技有限公司"）。
- **官方仓库（核实）**：<https://gitee.com/sovitjs/Sovitjs>（数维图科技 org，gitee API 数据：4 stars / 2 watching / 0 forks / 4 commits / 最后推送 2023-11-06）。仓库页面明示"**该仓库未声明开源许可证文件（LICENSE）**"；文件仅 `.gitee/` 图床 + README.md + README.en.md，**无源码**。任务书猜测地址 <https://gitee.com/sovitor/sovit2d> 已核实 404；GitHub 全站搜索 `sovit2d` 为 0 结果、gitee 搜索无其他官方结果（搜索结论均为执行时快照，复核未能复现，标注存疑）。
- **"智雨物联"核实**：智雨物联官网 <https://www.krmes.com/>（北京智雨物联科技有限公司，页面页脚 ©2019-2020）为商业工业物联平台（web组态/设备联网上云/工业大数据），**未发现其与 Sovit2D/数维图存在归属或技术关系**，亦无开源仓库。任务书"Sovit2D 来自智雨物联"判定为**未证实的混淆**（两公司同名业务领域容易混同）。
- **"对接 ThingsBoard"核实**：官方渠道（gitee 简介、sovitjs.com 产品页、腾讯云开发者社区转载的对接教程）仅见 **MQTT 数据源接入**（<https://developer.cloud.tencent.com/article/2023888>）；**未找到任何官方 ThingsBoard 集成声明**。疑似与社区其他"ThingsBoard 组态对接"项目（如 TheXiong/meta2d-thingsboard-designer，13★；以及掘金推广文《SceneV：基于Vue3与ThingsBoard的高性能低代码组态可视化解决方案》<https://juejin.cn/post/7612948192175767567>——该文标题即 SceneV 而非 Sovit2D）混淆。记录为**未能核实**。

### 2.2 技术栈与产品形态（来自官方公开描述）

- 产品页自述（<https://www.sovitjs.com/m/sovit_2d.html>，搜索快照可见正文）："Sovit2D开发工具实现在线可视化web组态的开发，轻松快速制作出**基于 canvas 和 svg 的组态界面**，同时支持在线动态数据绑定，支持实现 Html5 动画效果"。
- gitee 简介：标准 HTML5 技术、B/S 架构、2D/3D 图形组态、**MQTT 协议接入**、行业标准元器件图元库 + 多行业模板（充电站/电厂调峰/垃圾焚烧/污水处理/锅炉监控等）、拖拽式人机交互。
- 公司主体（如实记录）：官网 meta 与搜索页为"长沙数维图信息科技有限公司"，gitee 仓库属主显示名亦为"数维图科技"（og:title），两处一致；gitee 页面底部"深圳市奥思网络科技有限公司版权所有"系 **Gitee 平台自身的版权页脚**（出现于每个 gitee 仓库页，与项目归属无关），不构成主体不一致；产品定位"低代码可视化 APaaS 平台"（含 SaaS/私有化部署商业路径）。

### 2.3 可借鉴设计点

- **产品形态**：面向行业模板 + 图元库的"大屏组态"信息架构（行业模板 → 图元库 → 数据绑定 → 动效），与常见国产组态大屏产品一致，可作为**需求文档/产品原型参考**。
- **数据绑定方式**：组件属性面板绑定"数据集"（MQTT 数据源），即"图元属性 ↔ 变量"直绑模型，与任务通用引擎层设计要点 3（点表/变量表 → 图元属性 → 动画）一致——但仅有产品行为描述，**无源码可核对实现**。
- **边界**：无 LICENSE、无源码 → 仅能看产品演示与宣传材料，不能引用代码、不能验证性能（官方未见万级图元性能声明）。

### 2.4 判定

**仅参考**。官方仓库为 README 占位仓（4 commits、无源码、无 LICENSE），产品闭源商业化；"智雨物联归属"与"ThingsBoard 对接"均未证实。对本任务可借鉴的只有产品形态层面的信息架构，代码与设计细节无从提取；若后续需要组态产品对照，应改看其竞品（FUXA——国际团队开源 SCADA、SceneV、meta2d.js——均已在 I0.1-I0.3 深调研）。

---

## 3. vue-webtopo-svgeditor（Vue3 + 原生 SVG 组态编辑器教学项目）

### 3.1 定位与仓库核实

- **定位**：基于 Vue 3.2 + TS 的 SVG 可视化 web 组态**编辑器**（作者自述"一个低代码（可视化拖拽）教学项目"），核心价值是"svg 文件即组件"——SVG 文件/Vue 组件可直接作为编辑器图形库，无需改代码即可获得拖拽、缩放、旋转与自定义属性。
- **官方仓库**：<https://github.com/yaolunmao/vue-webtopo-svgeditor>（GitHub API：506 stars / 179 forks / 112 commits / 语言 Vue 70.2% + TS 27.4%；最后推送 2025-01-12；gitee 为 GitHub 镜像，PR 只收 GitHub）。
- **⚠️ 停更声明（README 首行）**："该版本永久停止更新 请使用新版本：<https://github.com/yaolunmao/maotu-webtopo>"。继任者 maotu-webtopo（"基于 vue3 的 web 组态引擎库"，134 stars，**LGPL-3.0**，2025-01-12 创建）已从"编辑器"转向"引擎库"方向——说明作者自身也确认 SVG-DOM 编辑器模式的局限，值得注意。
- **npm 发布**：`webtopo-svg-edit`（最新 0.0.10，2023-06-19；0.0.1 于 2023-01 首发；README 中 0.0.8 的 UMD/ES 集成示例），可用作库模式集成参考。

### 3.2 许可（证据）

- **MIT License**：仓库 LICENSE 原文（<https://raw.githubusercontent.com/yaolunmao/vue-webtopo-svgeditor/main/LICENSE>，© 2022 咬轮猫）与 GitHub 页面"MIT license"标识一致。
- **但自带素材不可商用**（README 明示，两个层级）：① "MIT 开源协议 可商用（**自带的 `svg` 文件除外**）"；② "本项目组件库来源均为网络，仅供学习交流使用，**请勿将本项目里面的组件用于商业用途**"。→ 代码 MIT 可借鉴，图元素材库不可用。

### 3.3 架构要点（README + 源码结构）

- **图元/图形模型（config-center 配置驱动）**：`src/config-center/` 按四类组织（<https://github.com/yaolunmao/vue-webtopo-svgeditor/tree/main/src/config-center>）：
  - `svg-file/stateless/`——无状态 SVG 文件，动态属性在 `props`（fill/stroke/stroke-dasharray 等 SVG 公共属性）；
  - `svg-file/stateful/`——有状态 SVG（如 `circuit-breaker/index.ts`：一个状态同时改颜色与把手透明度），状态配置在 `state`，可一态多变；
  - `svg-file/custom-svg/`——Vue template 代码片段，完全可编程；
  - `svg-file/have-animation/`——自带动画的 SVG 文件；
  - `vue/`、`vue/echarts/`、`vue/element-ui/`——Vue 组件作为图元，外层 `foreignObject` 包裹（SVG 内嵌 HTML），echarts 图表图元。
  - 配置文件 `name` 须与 SVG 文件名一致；入口 `src/config-center/index.ts` 按需导入，便于发布为插件后免注册。
- **编辑器交互层（webtopo-svg-edit）**：`src/components/webtopo-svg-edit/` 下 `center-panel`（画布）、`left-panel`（图形库）、`right-panel`（属性面板 + 动画面板 + JSON 编辑）、`top-panel`、`handle-panel`（选中锚点/手柄）、`connection-line` + `connection-panel`（连线：锚点→左键连线段→右键结束，折线可重拖，线段可配动画）、`component-tree`（组件树，可选中隐藏组件）、`export-json`/`import-json`（组态 JSON 序列化）。
- **变换实现（关键源码）**：`src/utils/scale-core.ts`（263 行）——拖拽/缩放/旋转全部用**纯 JS 点坐标数学**（`calculateRotatedPointCoordinate` 等），**不使用 SVG matrix 变换**；状态经 Pinia store 管理（`src/store/`：config / global / svgedit-layout / system）。
- **运行态**：`src/components/webtopo-svg-preview/` 独立预览组件（编辑器与运行态分离，与任务 I0 结论"运行时优先"的分层思路一致）。
- 示例 SVG 规格约定 1024×1024px。

### 3.4 可借鉴设计点（SVG 方案适用边界）

- **图元注册/配置模型**："config-center + SVG 文件即图元"的开放式图元注册机制（无状态/有状态/动画/自定义四类），是**轻量级组态图元库的成熟教学范式**，可对照 flux renderer registry 思路（`registerScadaSymbol`）提炼配置文件 schema。
- **state 状态驱动**：`state` 一份状态联动多个属性（颜色+透明度）的设计，与任务"状态驱动动画（运行/停止/故障/闪烁/流动/旋转）"要点 4 直接对应，实现简单直白，可参考其状态配置格式。
- **连线模型**：锚点(port)→线段→折线的极简实现（`connection-line`），适合拓扑简单（< 数百连线）场景；复杂拓扑（正交路由/吸附/避障）仍需 mxGraph 级模型（见 §4）。
- **SVG 方案适用边界（实证）**：本项目证明原生 SVG-DOM 组态编辑器**实现简单、命中检测与动画天然免费**（DOM 事件 + CSS/SVG 动画），但图元即 DOM 节点——万级图元会面临 DOM 数量上限与重排开销，作者停更并转向"引擎库"也侧面印证此边界。**结论：SVG 方案适合 ≤ 千级图元、中低动画频率、编辑器优先的教学/轻量场景；任务主线（万级图元 + 高频刷新）应维持 Canvas 路线**，SVG 仅作小图元库兜底或导出格式。

### 3.5 判定

**值得深挖（教学/轻量参考层）**。MIT 许可 + 源码完整可读 + 结构清晰，是 SVG 组态编辑器"图元注册/状态驱动/连线/序列化"全链条的最小可读范本，与 I0.2 的 LeaferJS（Canvas 场景图）形成"DOM-SVG vs Canvas"对照样本，对 I0.5 汇总的适用边界论证有直接价值。注意：已停更（继任者 maotu-webtopo 转 LGPL 引擎库路线）；自带 SVG 素材库不可商用；DOM 方案不能作为万级图元主线依据。

---

## 4. mxGraph / maxGraph（流程图/拓扑库，含许可争议史）

### 4.1 定位与仓库核实

- **mxGraph**：<https://github.com/jgraph/mxgraph>——"a fully client side JavaScript diagramming library that uses **SVG and HTML** for rendering"；**2020-11 开发停止、2021-03-31 被 owner 归档（read-only）**；GitHub API：6913 stars / 2080 forks / 147 tags；README 自述"我们 2005 年把它作为商业项目创建，以商业方式运行到 2016 年，之后转向围绕 draw.io 的商业活动……**不建议新项目基于此代码库**"。零第三方依赖、vanilla JS、官方不支持 TS。
- **maxGraph**：<https://github.com/maxGraph/maxGraph>——mxGraph 的现代继任维护分支，**TS 重写**；GitHub API：1131 stars / 201 forks / 1276 commits / 最新 release 0.23.0（2026-03-30）/ 最后推送 2026-08-01（**活跃维护中**）。README："maxGraph continues the legacy of mxGraph (archived in 2020) as its actively maintained successor. It preserves mxGraph's comprehensive features and **XML compatibility** while modernizing with native TypeScript, modular architecture, and smaller bundle sizes."
- **许可争议史（本 Phase 关键产出，均附证据）**：
  1. mxGraph 2005–2016 商业闭源（jgraph/mxgraph README "History" 段）；
  2. 开源后 LICENSE 为 **Apache-2.0 修改版**：原文第 4(e) 条"Neither the Work nor Derivative Works may be used or form any part of a larger work that integrates or is supposed to be integrated with a product or service **owned or marketed by an Atlassian entity**…"，文末附"SEIBERT/MEDIA GmbH, Wiesbaden, Germany is the **exclusive licensee of JGraph** for software products based on this codebase within the **Atlassian ecosystem** of products"（<https://raw.githubusercontent.com/jgraph/mxgraph/master/LICENSE>）；GitHub 将该许可判定为 Other/NOASSERTION（API `license.key=other`）——**即非标准 Apache-2.0，含针对 Atlassian 体系的排他/限制条款**；
  3. maxGraph README "History"："On 2020-11-09, the development on mxGraph stopped… On 2020-11-12, a fork… was created… **The project was then renamed on 2021-06-02 into maxGraph due to licensing issue**"（<https://github.com/maxGraph/maxGraph>）；maxGraph 本体 **Apache-2.0 干净许可**（API `license.key=apache-2.0`）。

### 4.2 技术栈

- mxGraph：vanilla JS + SVG/HTML（无框架绑定、无第三方依赖）。
- maxGraph：**原生 TypeScript**（ES2020、CJS+ESM 双格式、TS ≥3.8 可消费、`@maxgraph/core` npm 包）、零运行时依赖、tree-shakable 架构、框架无关（React/Vue/Angular/原生均可）、支持 Chrome/Edge/Firefox/Safari 桌面与移动端。

### 4.3 架构要点（maxGraph `packages/core/src/`，267 文件）

- **图形模型（mxCell 系）**：`view/cell/Cell.ts`（节点/边共用 cell）、`view/cell/CellState.ts`（视图状态）、`view/geometry/Geometry.ts` + `Point.ts` + `Rectangle.ts`（几何）、`view/image/ImageBox.ts`、`view/cell/CellOverlay.ts`。
- **拓扑连线模型（mxGraphModel 系，本任务最值得借鉴）**：
  - `view/GraphDataModel.ts`（对应 mxGraphModel）：图数据模型，cells 层级树 + 边 terminal（source/target）索引，`add/remove/setTerminal/beginUpdate/endUpdate` 事务式变更；
  - `view/cell/Cell.ts` 中 edge 与 vertex 共用 cell，`view/other/ConnectionConstraint.ts`（连接约束/port）、`view/other/Multiplicity.ts`（连接合法性规则）；
  - `view/handler/EdgeHandler.ts` / `EdgeSegmentHandler.ts` / `ElbowEdgeHandler.ts`（折线/分段/肘形编辑）、`view/plugin/ConnectionHandler.ts`（拖线创建连接）；
  - 边风格：`view/style/edge/`（Orthogonal / Manhattan / Elbow / Segment / EntityRelation / SideToSide / TopToBottom）+ `view/style/perimeter/`（节点边界锚点计算）+ `view/style/marker/`（箭头）。
- **渲染与变换**：`view/GraphView.ts`（坐标/缩放/视口变换）→ `view/canvas/SvgCanvas2D.ts` + `XmlCanvas2D.ts`（SVG 输出与 XML 输出双画布）、`view/cell/CellRenderer.ts`、`view/shape/`（节点 shape + stencil 模板）；`view/animate/`（Morphing/Animation）。
- **事件/交互体系**：`view/event/`（EventObject/EventSource/InternalEvent/InternalMouseEvent）+ `view/mixin/`（Cells/Connections/Edge/Grouping/Folding/Zoom/Snap/Selection/Validation 等 20+ 能力 mixin）+ `view/plugin/`（SelectionHandler/RubberBandHandler/PanningHandler/CellEditorHandler/TooltipHandler/PopupMenuHandler/FitPlugin）+ `view/undoable-change/`（ChildChange/GeometryChange/TerminalChange/ValueChange/VisibleChange…，undo/redo 以**可撤销变更对象**建模）+ `view/handler/`（VertexHandler/KeyHandler/ConstraintHandler）。
- **持久化**：`serialization/`（Codec + ModelXmlSerializer，**mxGraph XML 格式兼容**——draw.io 生态同源）；自动布局：`view/layout/`（Hierarchical/Circle/Organic/CompactTree/RadialTree/Swimlane…）。

### 4.4 可借鉴设计点

- **mxGraphModel/mxCell edge 模型（核心借鉴）**：vertex/edge 统一 cell + source/target terminal + geometry + style 分离、`beginUpdate/endUpdate` 批量事务 + undoable-change 事件化编辑，是**流程/拓扑图数据模型的事实标准**（draw.io 即其产物）；对任务"拓扑连线模型"设计（任务通用要点 5/6）是最佳成熟参照，可提取其模型 API 形态（而非代码）。
- **SVG 适用边界再证**：mxGraph/maxGraph 全 SVG 渲染 + JS 状态管理，在 draw.io 场景（千级图元、用户交互型编辑）成熟可靠；但其性能模型是"SVG DOM 增量更新 + 视图 state 缓存"（GraphView/CellState 缓存），**万级图元高频数据刷新（SCADA 实时变量）不是其设计目标**——与 §3 结论一致：SVG 适合交互密集型编辑器，Canvas 适合数据密集型运行时。
- **许可教训**：mxGraph 的"开源后被改许可 + 仓库突然归档 + 生态被迫 fork 改名"是**选型许可尽调的反面教材**；maxGraph 因干净 Apache-2.0 + 活跃维护，是当前可用的替代。
- **风险提示**：maxGraph API 与 mxGraph 不完全兼容（README "Migrating from mxGraph"）；官方文档仍是 WIP。

### 4.5 判定

**值得深挖**。maxGraph（Apache-2.0、活跃、TS）提供完整可读的经典图模型/连线/布局/序列化实现，是任务"拓扑连线模型"与"图元注册"设计的直接参照源（建议浅读 `GraphDataModel.ts`、`Cell.ts`、`ConnectionHandler.ts`、edge style 目录即可）。mxGraph 本体因已 EOL（2020-11）+ 修改版许可（Atlassian 条款）+ 归档，**不建议采用**，仅作历史对照；选型结论应记录"mxGraph 系许可变故"以固化经验。

---

## 5. OSHMI（老牌开源 SCADA，Open Substation HMI）

### 5.1 定位与仓库核实

- **定位**：Open Substation HMI——面向变电站/控制中心/IoT/一般自动化应用的现代 SCADA HMI 系统（作者 Ricardo L. Olsen）；"has been actually used in dozens of substations up to 230kV level and in control centers"（README 实证声明）。**注意：不是 OpenSCADA 的组件，而是独立项目**（任务书"OSHMI 属 OpenSCADA 体系"的表述不准确，OpenSCADA 体系另有其名；OSHMI 全称是 Open Substation HMI）。
- **官方仓库**：<https://github.com/riclolsen/OSHMI>（GitHub API：458 stars / 170 forks / 1242 文件 / 语言 JavaScript；最后推送 2026-05-02，未归档，仍维护中；SourceForge 同步：<https://sourceforge.net/projects/oshmiopensubstationhmi/>）。
- **⚠️ 继任声明（README 首行）**："**OSHMI was succeeded by JSON-SCADA**: <https://github.com/riclolsen/json-scada>"。JSON-SCADA（412 stars，**GPL-3.0**，最后推送 2026-07-05）是"portable and scalable SCADA/IIoT-I4.0/Gateway platform centered on MongoDB"，即同一作者的**WebSocket 实时通道继任者**——任务书"OSHMI 基于 websocket"的说法对 OSHMI 本体不成立，对 JSON-SCADA 成立（两者需区分）。

### 5.2 许可（证据，本 Phase 关键产出）

- **GPL-3.0**：仓库 LICENSE 原文为 GNU GPL v3（<https://raw.githubusercontent.com/riclolsen/oshmi/master/LICENSE>）；GitHub API `license.key=gpl-3.0`。
- **商用约束（如实记录）**：GPL-3.0 具传染性——基于其代码的派生/修改作品必须以 GPL-3.0 再发布并开放源码；**将 OSHMI 代码嵌入闭源商业产品（含本任务候选的 flux 商业化场景）不符合 GPL 要求**；引用其代码须开源衍生品。但**借鉴设计（点表/画面/事件约定）不受限制**，且其项目构成全部基于开源组件（Chromium/SVG/PHP/Lua/SQLite/Inkscape/Nginx/Vega/PostgreSQL/Grafana——README 自述）。

### 5.3 技术栈与架构要点

- **技术栈**：客户端 = SVG + HTML5 + JavaScript（浏览器直接访问，无需插件）；服务器 = C++（Borland C++ Builder，`webserver/` 179 文件）+ PHP + Lua（自动化脚本）；存储 = SQLite/PostgreSQL/MongoDB（历史/事件库，`db/`）；画面编辑 = **Inkscape**（SVG 原生格式）；图表 = Vega/d3.js（`charts/*.json`）；反向代理 = Nginx。移动/云友好，支持冗余双机（n 客户端）。
- **画面定义模型（XML/SVG）**：画面即 **SVG 文件**（`svg/` 目录：kaw2.svg、kik3.svg、brasil.svg…，即 XML），运行态经 `htdocs/screen.html?SELTELA=../svg/kaw2.svg` 加载（证据：`conf_templates/hmi.ini` 的 RUN/VIEWER 示例，<https://raw.githubusercontent.com/riclolsen/oshmi/master/conf_templates/hmi.ini>）；画面清单 `svg/screen_list.js`；Inkscape 内扩展插件（`inkscape_sage_src/`）生成带 SCADA 动画的 SVG。
- **点表/变量模型**：纯文本配置——`conf_templates/point_list.txt`（点表）、`point_calc.txt`（计算点）；协议客户端配置 `iec61850_client.conf`、`dnp3.ini`、`modbus_queue.ini`、`opc_client.conf`、`s7client/`、`iccp_config.txt`；`conf_templates/config_viewers.js`（前端视图配置）。
- **事件/交互体系**：`htdocs/events.html`（毫秒级事件/报警，两级确认）、`tabular.html`（点表视图）、`trend.html`（实时趋势）、`histwebview/`（历史曲线）；`hmishell/`（替代 Windows Shell 的专用外壳，限制仅 HMI 功能）；桌面通知（断路器保护动作）。
- **实时通道（核实修正）**：主客户端 `htdocs/websage.js`（4954 行）经 **fetch()（HTTP 轮询）** 取数据（源码 grep 证实，无 WebSocket）；README 声明的 **JSON-over-UDP** 是面向 IoT/第三方系统的服务器侧数据/控制接口，非浏览器通道；**WebSocket 实时通道在继任者 JSON-SCADA**。协议驱动：IEC61850 / IEC60870-5-104 / DNP3 / MODBUS / OPC UA-DA / Siemens S7 / ICCP（README 声明 OSHMI 本身**不是协议网关**）。
- **冗余与规模**：双服务器冗余模式；"unlimited points, clients, monitors and viewers"（README 自述）。

### 5.4 可借鉴设计点

- **点表/图元约定（核心借鉴）**：画面=SVG 文件 + 点表=文本配置 + 前端视图配置分离的"三件套"约定，是 SCADA 领域 20 年沉淀的朴素而有效的模型：**图元内嵌变量标识（SVG 元素 → 点 ID 绑定）→ 运行态统一刷新**。任务"点表/变量模型"（要点 3）可对照此约定设计 JSON 版点表 schema（对照 FUXA 的 server 端点表可交叉印证）。
- **画面定义与编辑器解耦**：用 Inkscape（通用 SVG 编辑器）+ 专用扩展产出带动画的画面文件——"通用工具编辑 + 约定式标注"路径，比自研全功能编辑器轻得多；对任务"编辑器后置"（mission Q1 结论）有直接启发：**画面文件格式先行（SVG/JSON 约定），编辑器可后置**。
- **SCADA 功能面清单**：事件 SOE 毫秒级 + 两级确认、报警过滤、趋势/曲线、冗余双机、桌面通知——可作为任务运行时功能清单（roadmap I 阶段）的需求核对表。
- **许可与生态教训**：GPL-3.0 使其代码无法商用闭源集成，但"OpenSCADA 体系可与其生态组件（IEC61850 等）互操作"的思路可借鉴。
- **边界**：技术栈偏老（C++ Builder/PHP/IE 兼容风格），本体又已声明被 JSON-SCADA 继任——**新项目不应基于其代码**；JSON-SCADA（WebSocket + MongoDB）可作为"实时通道 + 点表"设计的当代参照（同为 GPL，仅供阅读）。

### 5.5 判定

**值得深挖（设计层）**。老牌 SCADA 实际运行于数十个 230kV 级变电站的点表/画面/事件"约定"，是工业组态领域最真实的领域知识来源，对任务"点表模型、画面文件格式、SOE/报警设计"有直接借鉴价值；但其 GPL-3.0 传染性 + 老技术栈 + 已被 JSON-SCADA 继任，**代码不可商用集成、不可作为实现基线**——借鉴对象限定在"设计约定 + 配置文件格式"层面。

---

## 6. 横向小结

| 项目                  | 渲染方案                                                                | 许可（核实）                                                                                          | 可借鉴点                                                                                                                                                 | 判定                                                                       |
| --------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Sovit2D / 数维图      | Canvas + SVG（官方自述；无源码）                                        | 未声明（README 占位仓）                                                                               | 产品信息架构/行业模板形态；"智雨物联归属""ThingsBoard 对接"均未证实                                                                                      | **仅参考**——无源码无许可，只能看产品形态                                   |
| vue-webtopo-svgeditor | 原生 SVG + Vue3 DOM                                                     | MIT（素材库除外）                                                                                     | 图元注册四类模型（无状态/有状态/动画/自定义）、state 状态驱动、SVG 连线极简实现；**SVG-DOM 边界实证**                                                    | **值得深挖**（教学/轻量参考；已停更，继任者 maotu-webtopo 转 LGPL 引擎库） |
| mxGraph / maxGraph    | SVG + HTML（vanilla JS / TS）                                           | mxGraph：**修改版 Apache-2.0（Atlassian 条款）**、已归档 EOL；maxGraph：**Apache-2.0 干净许可、活跃** | mxGraphModel/mxCell 的 vertex/edge/terminal/geometry/style 模型、undoable-change 事务编辑、正交/肘形边路由、XML 持久化（draw.io 同源）；许可变故反面教材 | **值得深挖**（maxGraph 为模型/连线设计参照源；mxGraph 本体不采用）         |
| OSHMI                 | SVG 画面（Inkscape 产出）+ 浏览器 DOM；HTTP(fetch) 轮询（非 WebSocket） | **GPL-3.0**（传染性，不可闭源商用）                                                                   | 画面=SVG 文件 + 点表=文本配置的"三件套"约定、SOE 事件/报警两级确认、冗余双机、SCADA 功能清单；"通用工具编辑 + 约定式标注"画面生产路径                    | **值得深挖**（设计约定层；代码不可商用，本体已被 JSON-SCADA 继任）         |

**对主线选型的总体启示（供 I0.5 汇总引用）**：

1. **渲染路线再确认**：三个 SVG 系项目（webtopo/OSHMI/mxGraph）共同证明——SVG-DOM 适合"编辑器交互密集 + 千级图元 + 中低频刷新"，万级图元高频数据刷新应坚持 Canvas 场景图（I0.2 LeaferJS 结论不受动摇），SVG 可作为图元导出格式/小场景兜底。
2. **组态语义层模型**：跨项目收敛为"图元(shape)+连线(edge/port)+点表(变量)+事件"四元模型；mxGraph 的 cell/terminal 模型与 OSHMI 的 SVG+点表约定相互印证，任务自研语义层可直接以其为形态蓝本。
3. **许可尽调经验固化**：mxGraph"开源→改许可→归档→fork 改名"、OSHMI/JSON-SCADA"GPL 传染"、Sovit2D"无许可声明"三种形态均入档，作为选型与商用风险评估的对照案例。
