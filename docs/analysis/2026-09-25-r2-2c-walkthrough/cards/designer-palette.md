# [card] control:designer-palette

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/flow-designer` ｜ **载体**: 域 demo 页（workflow-designer-schema palette 配置：3 分组 6 项；本波控件无 lab 路由，载体 = 域 demo 页，plan 498 载体裁定）
- **契约面**: `designer-palette` type 渲染区 = 左侧节点库面板（`data-slot="designer-palette-group-header"` 分组折叠头 + `data-slot="designer-palette-item"` 可拖拽项，项内含点击添加 Button）
- **矩阵裁剪**: simplified（matrixReason：单面板控件，状态面 = 默认/hover/focus/dark/拖拽起始；裁掉：disabled（无 disabled 分支）、搜索态（schema `searchable: false` 未启用）、窄视口单独矩阵（palette 固定 240px 壳层随页面，归 designer-page 卡 C4））
- **探针**: `_tmp/r2-2c-probes/w5-flow1.mjs`（paletteHover/paletteItemRect）、`w5-flow3.mjs`（dndMid）→ `out-w5-flow*.json`

## 1. 截图清单

| 状态              | light                                                                                  | dark（真 data-mode）                  |
| ----------------- | -------------------------------------------------------------------------------------- | ------------------------------------- |
| 面板默认 1280×800 | `_tmp/visual-inspection-2026-09-25/r2-2c/designer-page/default-1280-light.png`（左栏） | `…/designer-palette/default-dark.png` |
| 项 hover          | `…/designer-palette/hover-item1-light.png`                                             | —                                     |
| 拖拽起始 mid 帧   | `…/designer-palette/dnd-mid-light.png`                                                 | —                                     |

## 2. A–H 维度勾选表

- A 交互：A1 **warn（家族引用：hover 无微高亮 = R2-1b-G2-01 维持，见 §4）** A2 pass（分组折叠头/添加按钮 Tab 聚焦 ring 正常，页面级探针旁证） A3 pass（palette 项 192×50、加号按钮 28px，达标） A4 n/a A5 pass（「拖拽放置，或点击在当前选择附近添加」引导文案在） A6 pass（HTML5 DnD `effectAllowed: move` 源码锚点；落图成功链路引用 R2-1b G3 判定：6→7 节点 + undo 可回退——Playwright mouse 无法原生驱动 draggable，本波 mid 帧仅证 mouse 路径不触发 ghost，属取证限制非缺陷） A7 n/a A8 pass（点击添加 = 拖拽替代路径） A9 pass（添加后节点计数即时 +1）
- B 颜色：B1 pass（dark palette 文字对比度 **7.06:1** 探针坐实） B2 pass B3 pass（分组标题/图标色语义稳定） B4 pass（`fd-palette-item` 令牌） B5 pass（dark 底 rgb(80,86,100) 合成系、项文字白，平价） B6 n/a
- C 布局：C1 pass（6 项无溢出） C2 pass C3 pass（分组折叠结构清晰：基础节点/逻辑控制/执行任务） C4 pass（240px 固定档 800 视口不挤） C5–C6 n/a/pass
- D 间隔：D1 pass（项间 `mb-2` = 8px 栅格均一） D2 pass（分组头与项间距大于项间距，邻近原则成立）
- E 排布：E5 pass（分组以折叠头+留白分组，语言统一）
- F 一致性：F2 pass（240px 与 taskflow palette 同档，R2-1b F2 结论维持）
- G 设计器：**G2 warn（家族引用：R2-1b-G2-01 维持，见 §4）** G3 pass/warn（拖拽替代路径齐备；dragover 落点提示缺失 = R2-1b watch 维持）
- H 弹层：n/a

## 3. 发现条目

（本卡无新立项发现。G2 可供性缺口维持 R2-1b-G2-01 原裁决（watch），新实例证据见 §4。）

## 4. 已知族命中（引用，不另立项）

- **R2-1b-G2-01（palette 可拖项无 grab 光标、hover 无微高亮，watch）— 复检：维持**。新实例证据：flow1 `paletteHover` hover 第 2 项后前 5 项 computed 全同——`cursor: "auto"`、bg `rgba(255,255,255,0.75)`、border `rgb(225,231,239)` 逐值相同；项尺寸 192×50。源码锚点补充：`designer-palette.tsx` L123-137 项容器 `fd-palette-item` 无 cursor/hover 类，`draggable` 与 `onDragStart` 在项内层 Button 上。修复方向维持原条目（`.fd-palette-item` 加 `cursor:grab` + hover 微高亮）。
- **dragover 无 drop-target 视觉反馈（R2-1b G3 判定注 watch）— 维持**：本波 dnd-mid 帧无落点提示元素（`ghostPresent: false, dropHintText` 仅静态引导文案）。
- 误报排除：Playwright mouse 不触发 HTML5 draggable → dnd-mid 无 ghost 属取证方式限制（R2-1b 同口径，程序化 DragEvent 已证落图语义），不按 A6/G3 缺陷报。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `designer-palette` → carded（card 列填本路径）；R2-1b-G2-01 维持记录回写 watch-pool 条目链路。
