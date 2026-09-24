# [card] control:designer-node-card

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/flow-designer`（「节点/边摘要」example tab） ｜ **载体**: 域 demo 页（designer-summary-demo-schema：node-card 渲染于页面右侧 inspector 自定义区；本波控件无 lab 路由，载体 = 域 demo 页，plan 498 载体裁定）
- **契约面**: `designer-node-card` type 渲染区 = summary tab inspector 的 NODES 卡片列表（`.nop-designer-node-card`，3 实体卡 + 1 missing 空态卡）
- **矩阵裁剪**: simplified（matrixReason：单列表卡片控件，状态面 = 默认/hover/选中(active)/focus-visible/dark/空态；裁掉：disabled（renderer 无 disabled 分支）、窄视口单独矩阵（随页面壳层，归 designer-page 卡）、弹层（无）。注意：本控件是 inspector 摘要卡，非画布节点本体——画布节点归 designer-canvas 卡）
- **探针**: `_tmp/r2-2c-probes/w5-flow2.mjs`、`w5-flow3.mjs`、`w5-flow4.mjs` → `out-w5-flow*.json`

## 1. 截图清单

| 状态                                                   | light                                                                                  | dark（真 data-mode）                            |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------- |
| summary tab 默认（NODES 卡片列表）                     | `_tmp/visual-inspection-2026-09-25/r2-2c/designer-node-card/summary-default-light.png` | `…/designer-node-card/summary-default-dark.png` |
| 卡片点击选中（active：border-primary + ring + ● 态点） | `…/designer-node-card/selected-light.png`                                              | `…/designer-node-card/selected-dark.png`        |
| hover                                                  | 探针读值坐实（bg 恒 card、border → foreground/30），不另截帧                           | —                                               |

## 2. A–H 维度勾选表

- A 交互：A1 pass（hover border-foreground/30 变化探针坐实；bg 不变属卡片语言设计） **A2 pass（键盘 Tab → `:focus-visible` 命中，3px oklab ring 在 boxShadow 第 4 层实测存在——`oklab(0.572…/0.5) 0 0 0 3px`，w5-flow4 全值取证）** A3 pass（卡片 326×62、行 34px，达标） A4 n/a A5 pass（missing 空态卡 aria-hidden 有意构造，非引导缺失） A6–A8 n/a A9 pass（点击 → `data-active=true` + `__state` 状态点出现 + 画布同步选中，联动正常）
- B 颜色：B1 pass（dark 卡标题对比度 **17.08:1**、meta **9.36:1**，探针坐实） B2 pass（active ring primary/40 ≥3:1 视觉可辨） B3–B4 pass（border-primary/accent/primary 令牌） B5 pass（dark 卡面 slate-900 底 + 白字平价） B6 n/a
- C 布局：C1 pass（title truncate、meta flex-wrap 兜底） C2 pass C3–C6 n/a/pass
- D 间隔：D1 pass（卡间 gap-3 = 12px 栅格；卡内 gap-1/gap-2 均一） D2 pass（图标-信息-状态三组分明）
- E 排布：E2 pass（类型 label 强于 meta badge） E4 pass（三卡左缘对齐）
- F 一致性：F1 pass（与 edge-row 同 hover/active/focus 语言，同面板同构）
- G 设计器：n/a（inspector 摘要卡；与画布选中态的双向联动经 A9 验证通过——**面板侧选中→画布侧选中即达，是 G7 读方向的旁证**）
- H 弹层：n/a

## 3. 发现条目

### [R2-2c-G2-153] 可点卡片/行 cursor 为 default 无 pointer 可供性（designer-node-card + designer-edge-row 共根因）

- **页面/路由**: `#/flow-designer`（「节点/边摘要」tab inspector；`summary-node-*` 卡与 `summary-edge-*` 行）
- **主题/视口/状态**: light+dark / 1280×800 / hover 态
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/designer-node-card/summary-default-light.png`（卡片列表现场；cursor 为 computed 探针值，截帧不保留 hover 光标）
- **目视描述**: 悬停节点摘要卡与连线行时光标保持系统箭头；卡片仅有边框微变、行仅有底色微变，无手型光标提示可点。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w5-flow2.mjs` cardHover/rowHover 段（真实 mouse hover 后 computed 读取）
  - 输出: `cardHover.cursor: "default"`、`rowHover.cursor: "default"`；对照同页面具 Button（ui Button 有 pointer 惯例的变体）与画布节点 `cursor: grab`（flow1 canvasNodeHover）
- **对照基准**: 检查提示词 G2（悬停可供性：cursor 变化）；WCAG/NN/g 可供性惯例（可点元素手型光标）；误报排除表中「ghost variant/icon-xs 行内按钮」不适用本例
- **严重程度**: P3（仍有 hover 边框/底色微高亮兜底，任务无碍；可供性弱化）
- **用户影响**: 新用户不易察觉摘要卡整卡可点（尤其卡片内含 badge/坐标文本，易被当作纯展示）。
- **修复方向**: `packages/flow-designer-renderers/src/designer-node-card.tsx` L73 与 `designer-edge-row.tsx` L76 的 className 追加 `cursor-pointer`（两文件同批；ui Button 若统一补 cursor-pointer 则随组件族收敛）。
- **归族**: watch-only → 台账（微可供性；若 R2-3 做「可点元素 cursor 契约」则并入 systemic）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-25）：card/row cursor default 复现

## 4. 已知族命中（引用，不另立项）

- 选中态视觉分化**通过**（与画布节点 R2-1b-G1-01 相反）：active 卡有 `border-primary/60 + ring-1 ring-primary/40 + ●` 三重标识，`data-active` 契约在——说明 G1-01 缺陷限于 xyflow 节点层，非设计器全局。
- chip 遮挡族：summary tab 下调试 chip 压工具栏标题「Node/Edge Summary Demo」（summary-default-light.png 可见「选 238」压标题前缀）——R2-1b-C2-01 同族新受害点，引用不立项。
- 误报排除：`el.focus()` 程序化聚焦后 ring「不可见」为浏览器 `:focus-visible` 启发式（点击后程序聚焦不触发），键盘 Tab 路径实测 ring 存在（w5-flow4），勿据此误报 A2。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `designer-node-card` → carded（card 列填本路径）；G2-153 归族 watch → 台账。
