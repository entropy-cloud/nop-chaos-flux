# [card] control:designer-canvas

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/flow-designer` ｜ **载体**: 域 demo 页（workflow-designer-schema，xyflow 桥接画布区；本波控件无 lab 路由，载体 = 域 demo 页，plan 498 载体裁定）
- **契约面**: `designer-canvas` type 渲染区 = 页面中部 xyflow 画布（`.react-flow` / `[data-slot="designer-node-body"]` / `.react-flow__edge`），节点/连线渲染细节归 designer-page 卡交叉引用
- **矩阵裁剪**: simplified（matrixReason：画布区为 designer-page 内嵌区域，页面级状态（弹层/工具栏/undo 工具链）在 designer-page 卡承载；本卡聚焦画布渲染面。裁掉：glass 皮肤、空画布态（demo schema 恒 6 节点，G4 以 palette 引导文案 + inspector 快捷键卡代判，同 R2-1b 口径）、拖拽 ghost 中间帧（HTML5 DnD 无法被 Playwright mouse 原生驱动，落图证据引用 R2-1b G3 判定注）、disabled 态（画布本身无 disabled 语义））
- **探针**: `_tmp/r2-2c-probes/w5-flow1.mjs`、`w5-flow3.mjs`、`w5-flow5.mjs` → `out-w5-flow*.json`

## 1. 截图清单

| 状态                   | light                                                                            | dark（真 data-mode）                       |
| ---------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| 画布默认 1280×800      | `_tmp/visual-inspection-2026-09-25/r2-2c/designer-canvas/default-1280-light.png` | `…/designer-canvas/default-1280-dark.png`  |
| 节点 hover             | `…/designer-canvas/node-hover-light.png`                                         | —                                          |
| 节点选中               | `…/designer-canvas/node-selected-light.png`                                      | `…/designer-canvas/node-selected-dark.png` |
| 连线选中               | `…/designer-canvas/edge-selected-light.png`                                      | —                                          |
| hover vs selected 对照 | `…/designer-canvas/node-hover-vs-selected-light.png`                             | —                                          |
| 缩放 2 步 + 选中保持   | `…/designer-canvas/zoom2x-selected-light.png`                                    | —                                          |
| palette 拖拽落图 mid   | `…/designer-palette/dnd-mid-light.png`（画布侧帧）                               | —                                          |

## 2. A–H 维度勾选表

- A 交互：A1 pass（节点 hover cursor=grab 探针坐实）A2 **warn（家族引用，见 §4：R2-1b-A2-01 维持）** A3 pass（画布可交互子元素 ≥24px；句柄 12px 为连线端点惯例，误报排除） A4 n/a A5 pass（无异步面） A6 pass（节点 pointer 拖拽 +60/+60 精确落位，见 flow1 g6 流程） A7 n/a A8 pass（palette 点击插入 = 拖拽替代，R2-1b A8 口径复检通过） A9 pass（增删节点 inspector 计数即时反映）
- B 颜色：B1 pass（画布文字 text-foreground 双主题可读，dark 截图复核） **B2 fail(R2-2c-B2-151)** B3 pass（类型色 pill 语义稳定） B4 pass（边线 stroke 走 xyflow 默认 + schema appearance，非字面散落） B5 pass（dark 画布文字/边线可读；节点浮动工具栏 dark 白底白图标 = 已知族，归 designer-page 卡 §4） B6 n/a
- C 布局：C1 pass（overflowScan 命中均为 xyflow viewport/句柄几何性常态，同 R2-1b C1 判读） C2 pass（本卡范围无意外重叠；连线标签压节点归 designer-page 卡 R2-2c-C2-154） C3 pass（画布占主区 ~615px） C4 pass（800 视口画布收缩正常，docOverX=0） C5 pass（无双滚动条） C6 n/a（DOM 画布非 canvas 元素）
- D 间隔：D1–D8 n/a/pass（画布内间距由 xyflow 布局引擎决定，节点卡片间距在 designer-page 卡）
- E 排布：E1–E6 n/a/pass（页面级在 designer-page 卡）
- F 一致性：F2 pass（本画布与 taskflow/report 画布分区同构，引用 R2-1b F2 结论）
- G 设计器：G1 **warn（家族引用，见 §4：R2-1b-G1-01 维持）** G2 pass（画布节点 hover cursor=grab + 内部 role=button；微高亮缺失并入 G1-01 同根因） G3 pass（schema 有意 snapToGrid gridSize:16 量化，R2-1b 判定注维持；dragover 无 drop-target 视觉反馈 = R2-1b watch 维持） G4 pass（裁剪说明见上） G5 pass（zoomin×2：节点 94→136px、选中态保持不漂移、fitView 可复位） G6 pass（本卡 undo 经 designer-page 工具栏，R2-2c 复检 redo 滞后已消失，见 designer-page 卡 §4） G7 **warn（家族引用：R2-1b-G7-01 维持，见 designer-page 卡 §4）** G8 pass（dark 画布节点文字/连线可读，node-selected-dark.png 复核）
- H 弹层：n/a

## 3. 发现条目

### [R2-2c-B2-151] 画布边线默认色 light 下对比度 2.25:1，低于 WCAG 1.4.11 的 3:1 非文本件门槛

- **页面/路由**: `#/flow-designer`（workflow tab 画布连线；summary tab 连线 stroke `rgb(202,202,202)` 同险更弱）
- **主题/视口/状态**: light / 1280×800 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/designer-canvas/default-1280-light.png`（灰蓝细线浮于近白网格纸面上）
- **目视描述**: 画布连线为浅灰蓝色 2px 细线，在近白画布纸面上辨识偏弱，缩放拉远（默认 ~0.49）后接近隐没。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w5-flow1.mjs`（computed stroke=`rgb(148,163,184)`/2px）+ `w5-flow5.mjs`（PNG 像素采样画布纸面 4 点均值 rgb(237,240,246) + WCAG 计算）
  - 输出: `edgeVsPaper: 2.25`、`edgeVsWhite: 2.56`——均 < 3:1（WCAG 1.4.11 非文本 UI 件）；dark 下同 stroke 对深底约 6.5:1 无虞
- **对照基准**: WCAG 1.4.11（非文本对比度 ≥3:1）；检查提示词 B2/G8；schema `edgeTypes[].appearance.stroke="#94a3b8"`（slate-400）
- **严重程度**: P3（连线仍可辨认，且有选中/悬停辅助手段；但低于标准门槛且 summary tab 同模式加重）
- **用户影响**: 低视力用户与投影/低对比屏场景下流程走向难辨；默认缩放拉远时边线接近消失。
- **修复方向**: workflow-designer-schema `edgeTypes[0].appearance.stroke` 升 slate-500（`#64748b`，对纸面 ≈3.9:1）；或在 designer-edge 渲染层给 appearance.stroke 未声明时的默认值改为 slate-500 并 dark 下平价。
- **归族**: watch-only → 台账（单点样式值；summary tab 同险并案观察）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-25）：自采纸面 2.30:1（原 2.25，同向 <3:1）

## 4. 已知族命中（引用，不另立项）

- **R2-1b-G1-01（画布节点/边选中无视觉标识，systemic→R2-3b）— 复检：维持**。新实例证据：flow1 `nodeSelected` 边框/outline/boxShadow 全 none/0px、edgeSelected 选中边 stroke=`rgb(148,163,184)`/2px 与默认边逐值相同；源码锚点补充：`designer-xyflow-node.tsx` L157 `if (props.selected && appearance.borderColorSelected)`——选中描边仅在 nodeType 显式声明 `appearance.borderColorSelected` 时生效，workflow schema 未声明 → 默认配置下选中态零视觉差。维持原族裁决。
- **R2-1b-A2-01（画布节点键盘焦点环缺失，watch）— 复检：维持**。flow1 `nodeFocus`: wrapper/inner focus 后 outline-style none、boxShadow none。同域 designer-node-card/edge-row 按钮 ring 正常（对照），缺陷仅画布节点层。
- **R2-1b-G2-01（palette 无 grab 光标）**：palette 侧归 designer-palette 卡；画布侧 cursor=grab 正常。
- **G7 双向同步族（R2-3 候选）— 维持**：画布→面板读方向正常（选中后 名称=开始）；面板→画布写方向断（详见 designer-page 卡 §4）。
- dragover 无 drop-target 视觉反馈：R2-1b G3 判定注 watch，维持（本波 dnd-mid 帧未见落点提示元素，`dropHintText` 仅 palette 静态引导文案）。
- 误报排除：`smallTargets=0`；`nodeTitle` 选择器伪 null（classAliases 解析为工具类字面量，无 `node-title` class，元素实际渲染 `text-foreground` 等，dark 截图复核可读）。

## watch 先例复检反转（review-b）

- **复核反转（review-b 2026-09-25）**：本卡对 R2-1b-G6-01「已消失/已修复」的记录系探针前置 undo 造成的假阳性——review-b 全链路验证（拖拽实移→undo 实退→redo 100–1000ms 全 disabled，第二次 undo 才翻红）复现原始 bug，G6-01 应恢复 open（原条目不销项）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `designer-canvas` → carded（card 列填本路径）；B2-151 归族 watch → 台账；family 维持记录并入原条目链路。
