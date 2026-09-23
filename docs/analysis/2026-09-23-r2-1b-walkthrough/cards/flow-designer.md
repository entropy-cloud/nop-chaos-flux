# [card] page:flow-designer

- **批次**: R2-1b ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/flow-designer` ｜ **载体**: 域页面（designer-page，xyflow 桥接，默认 workflow 图模式；含 钉钉审批流/Action 编排 tabs）
- **矩阵裁剪**: simplified（理由：① 真实空画布态需逐个删除全部节点才能到达，走查以"未选中 inspector 引导 + palette 引导文案"代替 G4 判定；② glass 仅抽查默认态；③ dingflow/Action tab 的深度交互归 `page:dingtalk-flow-demo` 卡；④ 长内容弹层：本页唯一弹层 JSON 面板即长内容，已验 H3/H8）

## 1. 截图清单

| 状态                                     | light                                                                                                                                                                     | dark                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 默认 1280×800                            | `_tmp/visual-inspection-2026-09-23/r2-1b/flow-designer/flow-designer-default-light.png`                                                                                   | `flow-designer-default-dark.png`          |
| 默认 ~800 宽                             | `flow-designer-default-light-narrow800.png`                                                                                                                               | —（800 宽布局与 light 同构，未复检 dark） |
| hover（节点/palette 抽样）               | `flow-designer-node-hover-light.png`、`flow-designer-palette-hover-light.png`                                                                                             | —                                         |
| focus-visible（抽样）                    | `flow-designer-state-selected.png`（含 focus 态，见 A2 发现）                                                                                                             | —                                         |
| 选中（节点/边）                          | `flow-designer-node-selected-light.png`、`flow-designer-edge-selected-light.png`、`flow-designer-selected-zoom3x-light.png`、`flow-designer-state-*.png`（五态对照）      | `flow-designer-node-selected-dark.png`    |
| 弹层打开（JSON 面板 = 唯一弹层，长内容） | `flow-designer-json-dialog-light.png`、`flow-designer-json-yaml-tab-light.png`、`flow-designer-inspector-combobox-open-light.png`                                         | `flow-designer-json-dialog-dark.png`      |
| 拖拽进行中                               | `flow-designer-drag-mid-light.png`、`flow-designer-drag-mid-raf-light.png`、`flow-designer-drag-mid-gridon-light.png`、`flow-designer-after-palette-drop-light.png`       | —                                         |
| undo 前后                                | `flow-designer-after-node-move-light.png` → `flow-designer-after-undo-light.png`                                                                                          | —                                         |
| glass 抽查                               | `flow-designer-default-glass-light.png`                                                                                                                                   | —                                         |
| 局部放大取证                             | `flow-designer-topleft-overlap-light.png`、`flow-designer-inspector-dup-light.png`、`flow-designer-selected-toolbar-dark-dark.png`、`flow-designer-toolbar-dark-zoom.png` |                                           |

## 2. A–H 维度勾选表

- A 交互：A1 **fail(R2-1b-A1-01)** A2 warn(R2-1b-A2-01) A3 pass（toolbar 按钮 26–28px、zoom 26px；palette 加号 28px；网格开关高 14px 见误报注）A4 pass（重做/恢复 disabled+opacity .5 正确）A5 pass（无异步 loading 面；空态引导文案在）A6 pass（拖拽反馈见 G3）A7 pass（JSON 弹层有关闭钮、Esc 可关）A8 pass（palette 点击插入 = 拖拽的替代路径）A9 pass（增删节点后节点计数/inspector 即时反映）
- B 颜色：B1 pass（dark 画布文字可读；探针 ratio 值因渐变背景解析限制偏低，目视+语义核对通过）B2 pass B3 pass（类型色 pill 语义稳定）B4 pass（色彩走 --fd-\*/语义令牌）B5 **fail(R2-1b-B5-01, systemic)** B6 pass
- C 布局：C1 pass（overflowScan 仅 xyflow viewport/句柄几何性裁切，画布渲染常态）C2 **fail(R2-1b-C2-01)** C3 pass（palette 240 / canvas / inspector 352 分区清晰）C4 pass（800 宽画布收缩正常、无塌挤）C5 pass（无双滚动条；inspector 内部滚动正常）C6 n/a（无 canvas 元素，DOM 画布）
- D 间隔：D1 pass（工具栏 gap 序列 [8×9,16,spacer] 落 8pt 栅格）D2 pass D3 n/a D4 pass（toolbar gap 8 一致）D5 warn（见 F4-01 双表单堆叠）D6 n/a（无分页条）D7 pass（plan 490 复检口径复核：无新增 <4px 贴死组合）D8 pass
- E 排布：E1 pass（3 秒可答：流程设计器/模板 tabs/画布+inspector）E2 pass E3 pass E4 pass（工具栏左缘对齐）E5 pass（卡片分组语言统一）E6 pass（inspector 空态有引导 + 快捷键帮助卡）
- F 一致性：F1 pass F2 pass（palette 240 / inspector 352 与 taskflow 同档）F3 pass F4 **fail(R2-1b-F4-01)** F5 n/a
- G 设计器：G1 **fail(R2-1b-G1-01, systemic)** G2 warn(R2-1b-G2-01) G3 pass（详见勾选注）G4 pass（裁剪说明见上）G5 pass G6 **fail(R2-1b-G6-01)** G7 **fail(R2-1b-G7-01)** G8 pass（dark 画布可读；工具栏 pill 缺陷归 B5-01）
- H 弹层：H1 pass（JSON 面板 w=560 = `--overlay-size-base`，plan 490 阶梯健康）H2 n/a H3 pass（bottom 764 ≤ 792）H4 pass H5 n/a（无 footer）H6 pass H7 pass H8 pass（长 JSON 在 body 内滚，`max-h-[calc(100vh-200px)]`）H9 pass

G3 判定注：palette→canvas HTML5 DnD 落图成功（6→7 节点，undo 可回退）；节点 pointer 拖拽为 schema 有意的 `snapToGrid+gridSize:16` 量化跟随（zoom 0.49 下量化步 ≈7.8px、瞬态视觉滞后 ≤14px，属吸附设计而非跟踪缺陷，rAF 对齐后单步偏差 ≤3.6px）；无对齐参考线（设计为栅格量化，非 guide-line 模式，watch 记录）；dragover 无 drop-target 视觉反馈（仅 dropEffect，P3 watch）。

## 3. 发现条目

### [R2-1b-G7-01] 属性面板→画布写路径全线断（workflow 模式）

- **页面/路由**: `#/flow-designer`（workflow 图模式，选中任意节点后的右侧属性面板）
- **主题/视口/状态**: light / 1280×800 / 选中 start-1 节点后编辑面板
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/flow-designer/flow-designer-g7-panel-edit-light.png`、`flow-designer-inspector-combobox-open-light.png`、`flow-designer-json-dialog-light.png`
- **目视描述**: 在面板"名称"输入框中无法输入（值立即回弹）；下方第二个"名称"输入框可输入但画布永远不变；"触发方式"下拉选择后画布节点副标题不变。
- **程序化证据**:
  - 探针 1: `fill(名称)` 后 150ms 读 `input.value` → `"开始"`（回弹，受控值拒绝变更）；Tab/Enter/逐键输入/失焦四种提交方式均不落盘（canvas innerText 恒 `开始|register|…`）
  - 探针 2: 回退表单 `input[name="label"]` fill `"回退通道改名"` → 输入框保留但画布 800ms 后仍 `开始`（无提交路径）
  - 探针 3: combobox 选"定时触发" → 900ms 后画布仍 `register`；打开 JSON 面板全文检索 → 仍含 `register`、无 `schedule`（**document 确未写入**，非渲染滞后）；undo 亦无法回退（本就未提交）
  - 对照组: 画布→面板读方向正常（选中节点后 `名称=开始`、`描述=流程入口`）；`#/flow-designer` 钉钉审批流 tab（tree 模式 inspector）写路径正常（fill→画布即时更新），taskflow 页则双向断（见 R2-1b-G7-02）→ 本发现限定 graph 模式 schema inspector
- **对照基准**: 检查提示词 G7（改面板画布变）；`docs/architecture/flow-designer/design.md` §9.1"schema inspector 的写路径已经可以稳定复用 designer:\* action"——实况与 owner doc 矛盾
- **严重程度**: P1
- **用户影响**: 用户在主工作面（图模式属性面板）编辑任何节点属性均无效且无错误提示；面板形同只读摘要。设计器核心闭环（选中→改属性→画布更新）断裂。
- **修复方向**: 排查 `designer-page` graph 模式下 schema inspector（`nodeTypes[].inspector.body` 渲染的 flux form）到 `designer:updateNodeData` 的提交链：受控 value 未接 onChange 回写（回弹）、回退表单未接 action、combobox onValueChange 未 dispatch；以 tree 模式 inspector（已验证可用）为参照对齐。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1b-G1-01] 画布节点/边选中无任何视觉标识（三设计器画布同模式）

- **页面/路由**: `#/flow-designer`（workflow tab 实证；钉钉审批流 tab 与 `#/taskflow-designer` 同模式复现，见对应卡）
- **主题/视口/状态**: light+dark / 1280×800 / 节点 selected（`.react-flow__node.selected` 已置）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/flow-designer/flow-designer-state-hover.png` vs `flow-designer-state-selected.png`、`flow-designer-edge-selected-zoom-light.png`、`flow-designer-node-selected-dark.png`
- **目视描述**: 点选节点后画布上节点外观与 hover 时完全一致；点选连线后连线颜色/粗细/虚线与默认完全一致；唯一"选中"感知来自右侧 inspector 与浮动工具栏（hover 也出现）。
- **程序化证据**:
  - 探针 1: hover vs selected 两态对节点子树全部元素 diff `border/outline/boxShadow/background/filter` → **diff 为空**（0 项差异）
  - 探针 2: 两态对节点卡片边缘像素采样（5×3+3 点）→ RGB 逐点相同（无环、无描边变化）
  - 探针 3: 选中边 `.react-flow__edge.selected` stroke=`rgb(148,163,204)`/2px 与默认边完全相同；无 dash/animation 差异
  - 探针 4: 伪元素 `::before/::after`、wrapper/inner outline、node-toolbar 外覆盖元素均排除
  - 佐证: `aria-pressed` 已正确翻转（契约在），纯视觉层缺失
- **对照基准**: 检查提示词 G1（选中框+手柄可见、与 hover 可区分）；NN/g 直接操作——selection state must be perceivable；Figma/dingflow 对标均有明确选中描边
- **严重程度**: P2
- **用户影响**: 画布上无法辨识当前操作对象；多节点编辑时极易改错节点；连选中与否都不可见，undo/删除操作缺乏对象确认。
- **修复方向**: 在 `designer-xyflow-canvas` 节点卡（`.nop-designer-node` 或其 wrapper）为 `.selected` 态补 2px `--primary` 描边或 ring（dark 同步适配）；为 `.react-flow__edge.selected` 增加颜色/宽度差分（如 `--primary` + 2.5px）。
- **归族**: systemic → R2-3b 候选（同一 xyflow 桥接层，三页同根因；designer 域专用，建议在 R2-3b 与其他设计器页合并裁定）
- **复核状态**: 未复核

### [R2-1b-C2-01] 调试器固定 chip 遮挡"返回"按钮与页标题

- **页面/路由**: `#/flow-designer`（最重；`#/taskflow-designer` 同源压标题，见该卡）
- **主题/视口/状态**: light / 1280×800 与 800×800 / 默认态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/flow-designer/flow-designer-topleft-overlap-light.png`
- **目视描述**: 页面左上角"返回"按钮被"106"调试器入口 chip 整体盖住，chip 同时压住 "Customer onboarding" 标题前 19px。
- **程序化证据**:
  - 探针: chip `position:fixed; z-index:9998` rect(24,24,68,28)；返回按钮 rect(37,36,28,28)；`document.elementFromPoint(返回中心)` → chip 按钮（`covered: true`，1280 与 800 视口双复现）
  - 影响: 返回按钮在鼠标路径上完全不可点（chip 拦截全部 pointer events）
- **对照基准**: 检查提示词 C2（绝对定位元素压操作）/ WCAG 2.4.11（焦点与可交互目标不得被遮挡）
- **严重程度**: P1（高频导航按钮被功能遮挡）
- **用户影响**: 设计器页内无法用鼠标返回主页（仅剩浏览器后退）；视觉上标题被截断。
- **修复方向**: playground 全局调试器 chip 下移（如 `top: 56px`+）或改挂右下角；或设计器页 header 预留 chip 位（`padding-left` 补偿）。至少不得覆盖 header 可交互元素。
- **归族**: systemic → R2-3b 候选（playground 全局壳层 vs 页面 header 碰撞，taskflow 页标题同被压；其他波次页面如有同象请并案）
- **复核状态**: 未复核

### [R2-1b-G6-01] 重做按钮可用性滞后一步（undo 后 redo 仍禁用）

- **页面/路由**: `#/flow-designer`（workflow tab 工具栏）
- **主题/视口/状态**: light / 1280×800 / 添加或移动节点后撤销
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/flow-designer/flow-designer-after-undo-light.png`
- **目视描述**: 点击"撤销"后画布正确回退，但"重做"按钮保持灰色禁用；再撤销一步后"重做"才点亮。
- **程序化证据**:
  - 探针（两轮复现）: 单次 add→undo → `重做.disabled=true`（500ms 后仍 true）；双 add→undo→undo → `重做.disabled=false` → redo×2 节点数 6→7→8 正确重放；节点移动→undo 后 redo 同样禁用
  - 结论: `canRedo` 快照发布滞后一个历史条目（撤销最近一步不翻转）
- **对照基准**: 检查提示词 G6（操作可逆且状态即时回退）；NN/g 增量可逆操作反馈
- **严重程度**: P2
- **用户影响**: "撤销→重做"这一最高频 reversible 路径在第一步就表现为"重做丢了"，用户误以为操作不可恢复。
- **修复方向**: 排查 `designer-page` 工具栏 `canRedo` 快照订阅（`designer-toolbar.tsx` 状态投影）与 undo 提交后的 publish 时序；对照 `#/taskflow-designer` 自绘工具栏（redo 即时可用）修正。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1b-F4-01] 属性面板渲染两套堆叠表单（一套拒绝输入、一套空置）

- **页面/路由**: `#/flow-designer`（workflow tab，选中节点后的 inspector）
- **主题/视口/状态**: light / 1280×800 / 选中 start-1
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/flow-designer/flow-designer-inspector-dup-light.png`
- **目视描述**: 面板中"名称/描述"出现两组：第一组有值（开始/流程入口）但输入即回弹；第二组为空但可输入（不落盘）。
- **程序化证据**:
  - 探针: inspector 内 label 序列 = `[名称, 描述, 名称, 描述, 触发方式]`；input 值序列 = `["开始","流程入口","", ""]`，第二组带 `name="label"/"description"`（renderer 回退表单特征）
  - 对照 `designer.md` §9.1："默认 inspector 优先渲染 nodeType.inspector.body，仅保留名称/描述 fallback"——fallback 与 body 同时渲染，与契约矛盾
- **对照基准**: 检查提示词 F4（同一概念不混用两种叫法/重复呈现）、D5
- **严重程度**: P2
- **用户影响**: 面板出现成对重复字段，用户不知道该编辑哪组；配合 G7-01 的写断链，编辑体验混乱。
- **修复方向**: `designer-inspector.tsx` 渲染分支加互斥：`nodeType.inspector.body` 存在时不渲染 名称/描述 fallback 表单。
- **归族**: local → R2-4 批（与 R2-1b-G7-01 同修复域）
- **复核状态**: 未复核

### [R2-1b-B5-01] 节点快捷工具栏 dark 下白底白图标（systemic 归族引用）

- **页面/路由**: `#/flow-designer`（workflow + 钉钉 tab）、`#/taskflow-designer` 同现
- **主题/视口/状态**: dark / 1280×800 / 选中节点出现浮动快捷工具栏
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/flow-designer/flow-designer-selected-toolbar-dark-dark.png`、`flow-designer-toolbar-dark-zoom.png`
- **目视描述**: dark 模式下节点浮动工具栏（编辑/复制/删除）仍为白色圆角 pill，三个图标为浅白色，几乎不可见。
- **程序化证据**:
  - 探针: pill `bg-popover/96` computed `oklab(0.985…)`（≈白，dark 未翻转）；按钮 color=`rgb(248,250,252)`（白 on 白）；light 下同元素为白底深图标（正常）
  - 同根因确认面: `#/flow-designer` JSON 弹层 dark 下 `dialogBg=rgb(251,250,249)`（亮底，560px 宽正常）
- **对照基准**: 检查提示词 B5（dark 平价）；R2-1a 已裁定 systemic 首批族
- **严重程度**: P2
- **用户影响**: dark 用户在画布上看到的选中工具栏近乎空白，快捷操作不可发现。
- **修复方向**: （既有族）R2-3b 统一修复宿主/组件 dark 下 `--popover` 翻转；本页确认影响面 = 画布节点工具栏 + JSON 弹层。
- **归族**: systemic → R2-3b 既有族（R2-1a 裁定：dark 弹层亮底 = 宿主 --popover 已知项）
- **复核状态**: 未复核

### [R2-1b-A1-01] 工具栏"网格"开关为死控件且与画布实况矛盾

- **页面/路由**: `#/flow-designer`（workflow tab 工具栏）
- **主题/视口/状态**: light / 1280×800 / 默认态点击开关
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/flow-designer/flow-designer-default-light.png`（网格线可见 + 开关未勾选同框）
- **目视描述**: 点击"网格"开关无任何反应（不翻转、画布背景不变、无错误提示）；且开关显示未勾选，画布网格线却可见。
- **程序化证据**:
  - 探针 1: `[role="switch"]`（base-ui Switch，`data-unchecked`，tabindex=0，非 disabled）→ 鼠标 click、键盘 Space、直接 click input 三种方式后 `aria-checked` 恒 `false`（时序埋点：pointerdown/up/click 均到达）
  - 探针 2: `.react-flow__background-pattern.lines` `display:inline; opacity:1` 恒可见；与 `designer-xyflow-canvas.tsx` 的 `showBackground = gridEnabled && backgroundType !== 'none'` 及开关 `active=${gridEnabled}` 语义互相矛盾（三态互斥：开关 false、背景可见、toggle 无效）
- **对照基准**: 检查提示词 A1（hover/激活态存在且可感知）、A9（交互后反馈可见）
- **严重程度**: P2
- **用户影响**: 工具栏存在一个怎么点都没反应的控件，且其显示状态与画布事实相反，损害整个工具栏的可信度。
- **修复方向**: 排查 toolbar schema `"action": "designer:toggle-grid"` 的 switch 渲染分支（`designer-toolbar.tsx` switch item）action 绑定与 `gridEnabled` 初始投影；统一 `gridEnabled` 初值与 `canvas.background` 的关系。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1b-G2-01] palette 可拖项无 grab 光标、hover 无微高亮

- **页面/路由**: `#/flow-designer`（左侧节点库）
- **主题/视口/状态**: light / 1280×800 / hover palette 项
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/flow-designer/flow-designer-palette-hover-light.png`
- **目视描述**: 鼠标悬停节点库条目时光标保持文本箭头，边框/背景与未 hover 项无差别。
- **程序化证据**:
  - 探针: hover 第 3 项后取 4 项 computed → 均 `cursor:auto`、bg `rgba(255,255,255,0.75)`、border `rgb(225,231,239)` 全同（含被 hover 项）；节点拖拽侧（画布内）cursor=grab 正常
- **对照基准**: 检查提示词 G2（可拖元素 hover cursor 变化 + 微高亮）
- **严重程度**: P3
- **用户影响**: 拖拽可供性弱，新用户不易发现节点库支持拖放（仍有"拖拽放置…"文案与点击添加兜底）。
- **修复方向**: `.fd-palette-item` 加 `cursor:grab` + `hover:border-primary/40 hover:bg-accent/40`。
- **归族**: watch-only → 台账（低影响、单点样式）
- **复核状态**: 未复核

### [R2-1b-A2-01] 画布节点无可见焦点环

- **页面/路由**: `#/flow-designer`（xyflow 节点为键盘可达元素：wrapper tabindex=0、inner role=button）
- **主题/视口/状态**: light / 1280×800 / `node.focus()` 与点击选中（focus 落点）两路
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1b/flow-designer/flow-designer-state-selected.png`（focused=true 无环）
- **目视描述**: 节点获得焦点时无 outline/ring。
- **程序化证据**: 探针: wrapper 与 inner `[role=button]` computed `outline: none|3px`、`boxShadow: none`；hover vs selected 全子树 style diff 为空（focus 态亦无差异）。工具栏按钮 focus-visible ring 正常（对照组）。
- **对照基准**: WCAG 2.4.7（键盘可达控件需可见焦点指示）；design.md 键盘契约
- **严重程度**: P3
- **用户影响**: 键盘用户在画布节点间 Tab 时无法定位焦点位置。
- **修复方向**: 为 `.react-flow__node:focus-visible`（或 inner role=button）补 ring 样式。
- **归族**: watch-only → 台账
- **复核状态**: 未复核

## 4. 台账回写

- 本卡完成后：`ledger.md` `page:flow-designer` 行 status → `carded`（card 列填本路径）；
  findings 归族：G1-01/B5-01/C2-01 → systemic（R2-3b 批）；G7-01/F4-01/G6-01/A1-01 → local（R2-4 批）；G2-01/A2-01 → watch-only；
  批内复检通过后 → `verified`。
