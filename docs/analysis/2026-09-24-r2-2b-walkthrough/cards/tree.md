# [card] control:tree

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/tree` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：expand/collapse org tree / custom node template with depth badge / host tree search filters and auto-expands ancestors（C4.3 Phase 3，fixture `c4c3HostSchemas.treeSearch`））
- **矩阵裁剪**: simplified（matrixReason：树控件已查展开/收起交互态、搜索过滤+自动展开祖先+高亮+清除恢复、自定义节点模板、双主题双视口、guide/缩进层级。裁剪项及理由：①**选中态**：组件内建完整选中通道（`tree-renderer.tsx` L93-95 `selectedKeys`/`onToggleSelect`、L283-284 交互行类含 `hover:bg-muted focus-visible:ring-2` + `bg-accent` 选中、L354 Enter/Space 键盘切换），但 3 个 fixture 均未启用 selectable → 载体无法复现，裁剪并记载体缺口观察（§4）；②**懒加载态**：tree 的 children-more/懒加载通道在 fixture 未配置（table 载体 S6 已覆盖同型 fail+retry 面板）→ 裁剪；③glass 皮肤统一不做）
- **runner dark 列作废声明**：同前——dark 真 data-mode 自采。

## 1. 截图清单

| 状态                                            | light                                                                            | dark（真 data-mode，自采）                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 默认 1280（整页）                               | `_tmp/visual-inspection-2026-09-24/r2-2b/tree/default-1280-light-full.png`       | —                                                                               |
| 场景 1 默认（交互循环后，含行 focus ring 观察） | `_tmp/visual-inspection-2026-09-24/r2-2b/tree/s1-default-light-1280.png`         | `_tmp/visual-inspection-2026-09-24/r2-2b/tree/s1-default-dark-1280.png`         |
| 场景 1 折叠 Engineering 后                      | `_tmp/visual-inspection-2026-09-24/r2-2b/tree/s1-collapsed-light-1280.png`       | `_tmp/visual-inspection-2026-09-24/r2-2b/tree/s1-collapsed-dark-1280.png`       |
| 场景 1 节点行点击后                             | `_tmp/visual-inspection-2026-09-24/r2-2b/tree/s1-node-clicked-light-1280.png`    | `_tmp/visual-inspection-2026-09-24/r2-2b/tree/s1-node-clicked-dark-1280.png`    |
| 场景 2 自定义节点 + depth badge                 | `_tmp/visual-inspection-2026-09-24/r2-2b/tree/s2-custom-node-light-1280.png`     | `_tmp/visual-inspection-2026-09-24/r2-2b/tree/s2-custom-node-dark-1280.png`     |
| 场景 3 搜索过滤中（高亮+自动展开）              | `_tmp/visual-inspection-2026-09-24/r2-2b/tree/s3-search-filtered-light-1280.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/tree/s3-search-filtered-dark-1280.png` |
| 场景 3 清除后恢复                               | `_tmp/visual-inspection-2026-09-24/r2-2b/tree/s3-search-cleared-light-1280.png`  | `_tmp/visual-inspection-2026-09-24/r2-2b/tree/s3-search-cleared-dark-1280.png`  |
| 场景 1 @800                                     | `_tmp/visual-inspection-2026-09-24/r2-2b/tree/s1-default-light-800.png`          | `_tmp/visual-inspection-2026-09-24/r2-2b/tree/s1-default-dark-800.png`          |

## 2. A–H 维度勾选表

- A 交互：A1 pass（非选中树行无 hover 属预期——可选中行才有 `hover:bg-muted`（源码 L283），fixture 未启用 selectable，见裁剪①）A2 pass（折叠触发钮可聚焦，交互循环后 focus 落节点行且 ring 可见——全宽蓝框观感记 watch，见 §4）A3 **已知族命中**（折叠触发钮 20×20，见 §4）A4 n/a A5 n/a（无 loading/empty 面空态场景；`tree-empty` 槽位未触发）A6–A8 n/a A9 pass（折叠 7→4 节点、`aria-expanded` 翻转、再展开恢复 7；搜索“Front”→ 过滤为 Engineering+Frontend、祖先自动展开（expanded=3）、`<mark>` 高亮、清除后节点数恢复——全链路程序化坐实）
- B 颜色：B1 pass（节点文本 light 12.61:1；dark `rgb(230,236,243)` on stage `rgb(20,28,36)` ≈ 14.3:1——dark DOM 合成 1.19 为渐变基线伪象，按 R2-2a 方法学以像素 stage 复算）B2 pass（focus ring 可见）B3 pass（搜索高亮 `mark` 双主题同 amber 系 tint：light `oklab(0.77 0.055 0.155/0.3)`、dark `oklab(0.79 0.030 0.136/0.3)`，语义=“匹配”跨主题一致）B4 pass（颜色走令牌/语义类）B5 pass（dark 无白底块、无不可读文本；高亮 dark 复算 ≈7:1）B6 n/a
- C 布局：C1 pass（1280/800 overflow 零命中）C2 pass C3 pass C4 pass（800 下树满宽不破版，nodeWidth 正常）C5 n/a C6 n/a
- D 间隔：D1 pass（子行 36px 等高、层级缩进等距）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass（折叠钮次级、节点标签主体）E3 pass E4 pass（同级节点左缘对齐）E5 pass（缩进+箭头表达层级；guide-line 槽位未渲染属可选装饰，不判缺）E6 pass
- F 一致性：F1 pass F2 n/a F3 n/a F4 **已知族命中**（aria“展开/折叠”zh-CN，见 §4）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无正式条目——本载体渲染面 0 P0–P3；裁剪态与 watch 观察见下）

- **[watch] 节点行 focus ring 全宽蓝框**：交互循环后 focus 被树焦点导航（`tree-focus-nav.ts`）移回节点行，`:focus-visible` ring 以整行宽度绘制（`s1-default-{light,dark}-1280.png` 首行）。指示本身符合 WCAG 2.4.11（可见、不遮挡），双主题一致；仅“鼠标点击折叠后整行出现键盘样式 ring”的观感偏重，登记 watch 待键盘导航专项复核（需真实键盘事件序列，本波探针以 focus()/Tab 近似）。
- **[裁剪→载体缺口观察]** 选中/懒加载态 fixture 未启用（见矩阵裁剪①②）：组件通道在源码完备（含 `aria-selected`、`bg-accent`、Enter/Space 键控），建议主 session 在后续批次补一条 selectable fixture 或改用 `#/lab/tree-select` 载体复检选中视觉。

## 4. 已知族命中（引用，不另立项）

- **A3 小目标 <24px（R2-2a A3-100/A3-103 族）**：折叠/展开触发钮 `collapsible-trigger` 实测 20×20（双主题 6 处，`w4-tree.json smallTargets`）。引用族。
- **i18n zh-CN 回退（dialog F4-11 族）**：折叠钮 aria-label“展开/折叠”为 zh-CN 默认（`t('flux.crud.*')` 系），英文宿主页面可见；调试面板“调试/折叠”同族。引用。
- **lab 载体与环境基建族**：scope-debug 面板逐场景渲染（中文 chrome）。
- **dark 平价族核对（R2-4 核对点）**：核对通过——文本/高亮/缩进参考线 dark 无专有缺陷（B1/B5 数据同上）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-tree` → carded（卡列填本路径）；findings 归族后 → digested。
