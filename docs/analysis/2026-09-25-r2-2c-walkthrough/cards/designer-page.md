# [card] control:designer-page

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/flow-designer` ｜ **载体**: 域 demo 页（workflow-designer-schema 为主载体，四 example tab：工作流/钉钉审批流/Action 编排/节点边摘要；本波控件无 lab 路由，载体 = 域 demo 页，plan 498 载体裁定）
- **契约面**: `designer-page` type 渲染区 = 画布页根（工具栏 + palette + 画布 + inspector + JSON 面板 + create dialog 的页面壳层）。注意：flow-designer **页面级**走查已在 R2-1b 完成（carded）；本卡为**控件契约面**首查，独立台账单元，页面级发现命中同根因时引用原条目
- **矩阵裁剪**: simplified（matrixReason：页面壳层状态大部分与 R2-1b 页面卡重合，本波聚焦控件契约面 + G 维主审查维度复检。裁掉：glass 皮肤抽查（波次统一口径）、钉钉/Action tree 模式深度交互（R2-1b 归 dingtalk-flow-demo 卡）、create dialog 打开态（fixture 未触发入口，保持 R2-1b 口径））
- **探针**: `_tmp/r2-2c-probes/w5-flow1.mjs`、`w5-flow2.mjs`、`w5-flow3.mjs` → `out-w5-flow*.json`

## 1. 截图清单

| 状态                                      | light                                                                          | dark（真 data-mode）                    |
| ----------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------- |
| 默认 1280×800                             | `_tmp/visual-inspection-2026-09-25/r2-2c/designer-page/default-1280-light.png` | `…/designer-page/default-1280-dark.png` |
| 默认 ~800 宽                              | `…/designer-page/default-800-light.png`                                        | `…/designer-page/default-800-dark.png`  |
| G7 面板键入现场                           | `…/designer-page/g7-typed-light.png`                                           | —                                       |
| JSON 面板开（长内容）                     | `…/designer-page/json-panel-light.png`                                         | `…/designer-page/json-panel-dark.png`   |
| 工具栏 disabled 态（撤销/重做/恢复/保存） | 默认图可见（disabled+opacity）                                                 | —                                       |

## 2. A–H 维度勾选表

- A 交互：A1 pass（工具栏按钮 hover/switch 态正常；网格开关死控件 = R2-1b-A1-01 local 既有条目，本波未复测不升级） A2 pass（Tab 首落点 focus ring oklab 3px 实测存在，w5-flow4） A3 pass（`smallTargets: []`，1280 全页零命中） A4 pass（撤销/重做/恢复/保存 `disabled=true` + 置灰正确投影） A5 pass（无异步面） A6 pass（节点拖拽 +60/+60 精确） A7 pass（JSON 面板关闭钮/Esc 可关，R2-1b 口径复检） A8 pass（palette 点击插入替代拖拽） A9 pass（节点计数/inspector 即时反映）
- B 颜色：B1 pass（dark inspector/工具栏文字可读） B2 **warn(R2-2c-B2-151，见 designer-canvas 卡：边线 2.25:1)** B3 pass B4 pass（`--fd-*`/语义令牌） B5 **warn（已知族引用：JSON 面板 dark 亮底 `rgb(251,250,249)` + 节点浮动工具栏 dark 白底白图标——R2-1b-B5-01/宿主 `--popover` dark 亮底族维持，见 §4）** B6 pass（已保存=绿/未保存=警示 badge 语义正确）
- C 布局：C1 pass（1280 与 800 均 docOverX=0；命中项为 xyflow 几何常态与 palette label/switch 微溢出 11–12px，前者白名单、后者见 §4 注） **C2 fail(R2-2c-C2-154)** C3 pass（palette 240/画布/inspector 352 分区清晰） C4 pass（800 视口不塌不挤） C5 pass（inspector 内部滚动正常、无双滚动条） C6 n/a
- D 间隔：D1 pass（工具栏 gap 8×N 落 8pt 栅格，R2-1b 口径复检） D2–D8 pass/n-a
- E 排布：E1 pass（3 秒三问可答） E2 pass（保存 primary） E3 pass E4 pass E5 pass E6 pass（inspector 空态快捷键引导卡 + palette 引导文案）
- F 一致性：F2 pass（palette 240/inspector 352 与 taskflow 同档） F4 pass（本载体四 tab 文案统一；i18n zh 回退族未新增实例）
- G 设计器：G1 **warn（R2-1b-G1-01 维持，designer-canvas 卡 §4）** G2 pass/warn（画布 grab 正常；palette 侧 = R2-1b-G2-01 维持） G3 pass（snapToGrid 量化设计维持 R2-1b 判定） G4 pass（palette 引导文案 + inspector 快捷键卡代判，R2-1b 口径） G5 pass（缩放 2 步选中不漂移、fitView 复位） **G6 pass（R2-1b-G6-01 复检：已消失，见 §4）** **G7 warn（R2-1b-G7-01 维持：面板→画布写路径仍断，新实例证据见 §4）** G8 **warn(R2-2c-G8-155)**
- H 弹层：H1 pass（JSON 面板 w=560 = `--overlay-size-base` 档维持） H3 pass（bottom 764 ≤ 792） H4 pass H8 pass（长 JSON 在 body 内滚） H2/H5/H6/H7 n/a/pass H9 pass

## 3. 发现条目

### [R2-2c-C2-154] 「节点/边摘要」tab 画布连线退化为 6×0px 短桩不可见，边标签堆叠压住节点文本

- **页面/路由**: `#/flow-designer`（「节点/边摘要」example tab 画布区；workflow tab 画布不受影响——对照成立）
- **主题/视口/状态**: light+dark / 1280×800 / 默认态（双主题同象）
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/designer-node-card/summary-default-light.png`、`…/designer-node-card/summary-default-dark.png`（两图连线均不可见；Send Email/End 节点左缘可见边标签与句柄堆叠的 garble 簇）
- **目视描述**: summary tab 画布上三个节点之间看不到任何连线；节点文本旁有细小文字/圆点堆叠（"to●●●c"），系边条件标签（trigger/success）与端点句柄重叠。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w5-flow3.mjs` summaryEdges 段 + `w5-flow4.mjs` 全量 d 复核
  - 输出: 两条边 path bbox 均 **6×0 px**（`edge-start-task` M306,180 C310,180 310,180 314,180——贝塞尔从 x=306 到 x=314 共 8 世界单位、零高度；`edge-task-end` 同构）；stroke `rgb(202,202,202)`/2px 有值但几何退化为短桩；对照 workflow tab 同探针边线为跨节点完整贝塞尔（画布上可见）
- **对照基准**: 检查提示词 C2（意外重叠/内容不可见）、G3（连线渲染正确性）；designer-page 契约（edges 渲染）
- **严重程度**: P2（summary example 的画布连线功能整体失效——用户在摘要 demo 页看不到流程拓扑；页面主 tab 工作流不受影响故未到 P1）
- **用户影响**: 打开「节点/边摘要」演示 tab 的用户看不到连线，边标签乱叠在节点文字上，观感明显破版；该 tab 是 node-card/edge-row 控件的官方演示载体，第一印象受损。
- **修复方向**: summary demo 节点未声明 `appearance`（workflow schema 有 minWidth 192/minHeight 112），xyflow 首次测量前句柄位置塌缩——`designer-xyflow-canvas` 在节点未完成测量时应挂起边渲染（xyflow `nodesInitialized`/`onNodesInitialized` 门控）或给未声明 appearance 的 nodeType 兜底 minWidth/minHeight；demo schema 侧可同步补 appearance 声明作双保险。
- **归族**: local → R2-4 批（designer-xyflow-canvas 测量时序；schema fixture 参数为放大器非根因）
- **复核状态**: 已复核（保留 P2，review-b 2026-09-25）：summary 两边 6×0px 短桩、d 属性逐字符同原卡

### [R2-2c-G8-155] summary tab 画布节点无卡片 chrome：classAliases 未定义时 className 别名不解析，节点渲染为裸文本

- **页面/路由**: `#/flow-designer`（「节点/边摘要」example tab 画布区）
- **主题/视口/状态**: light+dark / 1280×800 / 默认态（双主题同象）
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/designer-node-card/summary-default-light.png`（"Start/Send Email/End" 裸文本节点 + 独立小图标，无卡片底/圆角/边框）、`…/designer-node-card/summary-default-dark.png`（dark 同构，文字浮于网格）
- **目视描述**: workflow tab 画布节点是带渐变图标、卡片底、徽标的玻璃卡片；summary tab 同一套 node body schema 渲染出的却是裸文本行，两者观感断裂。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w5-flow3.mjs` summaryNodeCards 段
  - 输出: 三节点 `hasGlass: false`、bodyRect 176×32（workflow tab 对照 `nop-glass-card` 卡片 ~192×112）；机制 = summary schema 无 `config.classAliases`，body className `node-card`/`node-title` 等别名键不解析为工具类，元素仅携带无样式的字面 class
- **对照基准**: 检查提示词 G8（画布内元素渲染质量）；已知族「schema 动态响应性缺口」；designer-page 契约（config.classAliases 解析）
- **严重程度**: P3（文字双主题可读、无功能损失；属渲染器对缺省 config 无兜底的健壮性缺口 + demo fixture 参数缺口）
- **用户影响**: 演示页观感未完成；schema 作者沿用 node-card 别名但漏配 classAliases 时静默得到无样式节点，无报错无提示。
- **修复方向**: `designer-xyflow-node` 对 className 别名解析失败（命中不到 classAliases 的 `node-card` 键）时输出开发态 console.warn；或 designer-page 为缺省 config 提供最小默认 classAliases（node-card → nop-glass-card 基础卡）。demo schema 补 classAliases 为速效兜底。
- **归族**: watch-only → 台账（fixture 参数级 + 渲染器静默降级；与「schema 动态响应性缺口」族同域）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-25）：hasGlass:false + classAliases 0 命中坐实

## 4. 已知族命中（引用，不另立项）与复检裁定

- **R2-1b-G1-01（systemic）— 维持**：designer-canvas 卡 §4 已记录（含 `appearance.borderColorSelected` 机制锚点）。
- **R2-1b-G7-01（graph 模式面板→画布写路径断，local；G7 双向同步族 R2-3 候选）— 维持**。新实例证据：flow1 `g7AfterType`: 首个名称输入框三击全选后 `pressSequentially('XYZ')` → 400ms 后 `firstInputValue: "开始"`（键入被受控值回弹），画布节点文本恒 `开始|register`。与 R2-1b 探针结果逐字一致。
- **R2-1b-G6-01（重做可用性滞后一步，local）— 复检：已消失**。flow1 `g6`: 节点拖动 → 撤销一次 → `redoDisabled: false`（500ms 内），重做即时可用。原条目建议闭环（待独立复核确认）。
- **复核反转（review-b 2026-09-25）**：本卡对 R2-1b-G6-01「已消失/已修复」的记录系探针前置 undo 造成的假阳性——review-b 全链路验证（拖拽实移→undo 实退→redo 100–1000ms 全 disabled，第二次 undo 才翻红）复现原始 bug，G6-01 应恢复 open（原条目不销项）。
- **R2-1b-C2-01 / chip 遮挡族 — 维持**。新实例证据：flow2 `chip`: 返回按钮 rect(37,36,28,28)，`elementFromPoint` 命中调试 chip 文本 "106"，`hitIsBack: false`——返回按钮鼠标路径仍被 chip 整体遮断；dark 1280 截图左上「选 109」压「返回」同框；summary tab chip 压英文标题。归 R2-3 候选族，不另立项。
- **宿主级 `--popover` dark 亮底族 — 维持**：flow2 `jsonPanelDark.panelBg: rgb(251,250,249)`（JSON 面板 dark 亮底，560px 宽正常）；节点浮动工具栏 dark `bg oklab(0.985…)+图标 rgb(248,250,252)` 白底白图标（R2-1b-B5-01 同族实例）。归 R2-4 dark 族，不另立项。
- **误报排除**：① dark inspector 文字探针 1.05 = oklab 背景解析伪值（方法学口径 #3），dark 截图复核面板深底白字可读；② narrow palette `label/switch` overX 11–12px：palette 固定 240px 壳层内的 sr-only/过渡态测量噪声，无可见溢出（800 截图复核）；③ `node-title` 选择器伪 null（别名解析为工具类字面量）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `designer-page` → carded（card 列填本路径）；C2-154 → local（R2-4）、G8-155 → watch、A5-152（field 卡）/G2-153（node-card 卡）/B2-151（canvas 卡）各自归族；family 维持/已消失记录回写原条目链路（G6-01 建议 closure 复核）。
