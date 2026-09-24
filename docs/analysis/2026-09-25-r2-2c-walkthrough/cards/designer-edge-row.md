# [card] control:designer-edge-row

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/flow-designer`（「节点/边摘要」example tab） ｜ **载体**: 域 demo 页（designer-summary-demo-schema：edge-row 渲染于页面右侧 inspector 自定义区；本波控件无 lab 路由，载体 = 域 demo 页，plan 498 载体裁定）
- **契约面**: `designer-edge-row` type 渲染区 = summary tab inspector 的 EDGES 列表行（`.nop-designer-edge-row`，2 实体行 + 1 missing 空态行）
- **矩阵裁剪**: simplified（matrixReason：单列表行控件，状态面 = 默认/hover/选中(active)/focus/dark/空态；裁掉：disabled（renderer 无 disabled 分支，schema 未声明）、窄视口单独矩阵（inspector 随页面壳层，800 视口表现归 designer-page 卡 C4）、弹层（无））
- **探针**: `_tmp/r2-2c-probes/w5-flow2.mjs`、`w5-flow3.mjs`、`w5-flow4.mjs` → `out-w5-flow*.json`

## 1. 截图清单

| 状态                                 | light                                                                                  | dark（真 data-mode）                           |
| ------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------- |
| summary tab 默认（含 edge-row 列表） | `_tmp/visual-inspection-2026-09-25/r2-2c/designer-node-card/summary-default-light.png` | `…/designer-edge-row/summary-default-dark.png` |
| 行点击选中（active）                 | `…/designer-edge-row/selected-light.png`                                               | —                                              |
| missing 空态行                       | 同默认图（`summary-edge-missing` aria-hidden）                                         | —                                              |

## 2. A–H 维度勾选表

- A 交互：A1 pass（hover bg → accent/60 探针坐实：`rowHover.bg = oklab(0.961…/0.6)`）A2 pass（键盘 Tab 聚焦 `:focus-visible` 命中，ring oklab 3px 存在于 boxShadow 第 4 层——w5-flow4 全值取证；勿以 40 字符截断误判） **A3 warn（cursor 缺 pointer 并入 R2-2c-G2-153，影响可供性非目标尺寸；行高 34px ≥24 达标）** A4 n/a A5 n/a A6 n/a A7 n/a A8 n/a A9 pass（点击行 → `data-active=true` + inspector 快照即变，G7 联动正常）
- B 颜色：B1 pass（dark 行文字白 on 深底，截图复核可读） B2 pass（active ring primary/40 可辨） B3 n/a B4 pass（accent/primary 令牌） B5 pass（dark 行选中态 bg-accent/80 + ring 清晰，summary-default-dark.png） B6 n/a
- C 布局：C1 pass（行内 truncate 兜底，无溢出） C2 pass C3–C5 n/a/pass C6 n/a
- D 间隔：D1 pass（行 py-1.5 + 列表间距 8px 栅格） D2–D8 n/a/pass
- E 排布：E4 pass（source → target 与 badge 两端对齐一致）
- F 一致性：F1 pass（行语义与 node-card 同族同构：同 hover/active/focus 语言）
- G 设计器：n/a（inspector 内列表行，非画布件；选中联动画布高亮归 designer-page 卡）
- H 弹层：n/a

## 3. 发现条目

（本卡无新立项发现。可点行 `cursor: default` 无 pointer 的可供性缺口与 designer-node-card 共根因，统一立项为 **R2-2c-G2-153**，见 designer-node-card 卡；本卡为其第二实例面。）

## 4. 已知族命中（引用，不另立项）

- **R2-2c-G2-153（可点卡片 cursor:default，本卡共根因实例）**：`rowHover.cursor = "default"`。
- 误报排除（重要，防复核误判）：flow2 `summaryDark.rowText.ratio = 1.05（白 on 白）` 为**探针伪值**——edge-row 按钮/祖先链 backgroundColor 全透明或为 oklab 字面量，DOM 组合探针无法解析 oklab 背景落到白色兜底（方法学口径 #3：oklch/渐变底一律 PNG 像素采样）。`summary-default-dark.png` 目视复核：行文字浅色 on 深底、选中行带 accent 底，可读性良好。
- missing 空态行（`summary-edge-missing`）：渲染为 aria-hidden 空壳，为 demo 有意构造的缺失实体用例，非缺陷。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `designer-edge-row` → carded（card 列填本路径）；G2-153 归族 watch → 台账。
