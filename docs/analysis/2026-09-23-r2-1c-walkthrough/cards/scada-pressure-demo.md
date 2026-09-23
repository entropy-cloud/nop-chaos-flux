# [card] page:scada-pressure-demo

- **批次**: R2-1c ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/scada-pressure-demo` ｜ **载体**: 域页面（I13.2 大屏/复杂组态：~20 图元大屏 + 10k 高密度压力画面 tab 切换）
- **矩阵裁剪**: simplified（matrixReason：无弹层面、无拖拽落位语义；缩放交互以逐 tick 截图 + 像素包围盒专项探针深挖替代单张「拖拽进行中」；glass 按波次口径省略。实际裁掉： Dialog/Sheet、玻璃皮肤）
- **探针耗时**: overview ready 117ms；10k 画面 ready 64ms（点击→settle 215ms）——远低于 120s 上限；不度量性能数值（briefing 口径）

## 1. 截图清单

| 状态                           | light                                                                                                               | dark                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 默认 1280×800（overview 大屏） | `…/r2-1c/scada-pressure-demo/scada-pressure-demo-overview-light.png`                                                | `…/scada-pressure-demo-overview-dark.png` |
| 默认 ~800 宽                   | `…/scada-pressure-demo-overview-800-light.png`                                                                      | —（探针 c6/overflow 已复跑）              |
| 10k 压力画面                   | `…/scada-pressure-demo-pressure-light.png`                                                                          | `…/scada-pressure-demo-pressure-dark.png` |
| 缩放交互逐 tick                | `…/zoom-step-overview-0..3.png`、`…/zoom-step-pressure-0..3.png`、`…/scada-pressure-demo-pressure-zoomed-light.png` | —                                         |

## 2. A–H 维度勾选表

- A 交互：A1 ✓（hover 高亮蓝色描边在 indicator 上目视确认）A2 ✓ A3 ✓ A4 n/a A5 ✓（10k 构建期间 loading schema 具备）A6 ✓（拖拽平移正常）A7 n/a A8 n/a A9 ✓（tab 切换重挂载后画面正确）
- B 颜色：B1 ✓（contrastFails=0）B2 ✓ B3 n/a→pass（overview 设备默认态配色正常；10k 矩阵 6 色为压力基体无语义映射，不按语义判）B4 ✓ B5 ✓（dark 平价无新缺陷）B6 n/a
- C 布局：C1 ✓（无溢出，含 800 视口）C2 **warn(R2-1c-C2-01)** C3 ✓ C4 ✓（canvas 1214→734 跟随收缩，c6_800 全 true）C5 n/a C6 ✓（attr=CSS×DPR 全过；两画布高度 264/312 随容器变化证实 resize 链路健康）
- D 间隔：D1 ✓（blockGaps [12,12]）D2 ✓ D3 n/a D4 ✓ D5 n/a D6 n/a D7 ✓ D8 ✓
- E 排布：E1 ✓（tab+状态文案三问可答）E2 ✓（选中 tab default variant vs outline）E3 ✓ E4 ✓ E5 ✓ E6 ✓
- F 一致性：F1 ✓ F2 ✓ F3 ✓ F4 ✓ F5 n/a
- G 设计器：n/a（查看器；缩放交互缺陷归 **R2-1c-G-01**，借 G5 口径）
- H 弹层：n/a

## 3. 发现条目

### [R2-1c-G-01] scada 画布缩放手势失真：滚轮实为垂直平移、ctrl+滚轮仅 X 轴缩放（非等比形变）

- **页面/路由**: `#/scada-pressure-demo`（overview 与 10k 画面均复现；工具栏明示「滚轮缩放 / 拖拽平移 / 悬停高亮」）
- **主题/视口/状态**: light / 1280 / 画布内滚轮与 ctrl+滚轮
- **截图**: `…/scada-pressure-demo/zoom-step-pressure-0..3.png`（逐 tick 内容等大、整体下移、底边裁剪）、`…/scada-pressure-demo-pressure-zoomed-light.png`（滚轮 6 tick 后场景塌为横带）、`…/zoom-step-overview-2.png`（overview 同行为）
- **目视描述**: 滚轮向上滚动时场景不放大，而是整体平移出画布（内容尺寸不变）；按住 ctrl 滚动时场景宽度剧烈变化而高度不变，画面被拉成横带/竖条。
- **程序化证据**: 像素包围盒探针（10k 画面，逐 tick）：wheel-up ×1..4 → 内容 bbox `888×620 → 888×520 → 888×420 → 884×320 → 884×220`（device px，宽恒定、高线性坍缩、minY 0→400 = 平移）；ctrl+wheel-up（overview）→ bbox `660×232 → 1172×236 → 112×236`（高恒 236，宽 ±一个量级 = 仅 X 缩放）。
- **对照基准**: 检查提示词 G5（缩放后内容等比、不漂移）与页面自述交互语义（「滚轮缩放」）；NN/g 直接操作基线（缩放应可预期、可逆）。
- **严重程度**: P2（页面宣称的主交互之一行为不符/失真；拖拽平移与 hover 正常）
- **用户影响**: 组态查看用户无法用滚轮缩放画面；ctrl+滚轮产生非等比畸变，画面不可用需 Fit/重载恢复。
- **修复方向**: `packages/flux-renderers-industrial` viewport 管线：① wheel 缺省行为与提示文案二选一对齐（wheel→zoom 或文案改「滚轮平移」）；② ctrl+wheel 缩放走统一 `scale(s)`（X/Y 同源），排查 X/Y 通道解耦的 clamp/anchor 逻辑；修复后以本卡逐 tick bbox 探针回归（期望等比：w/h 同比值变化）。
- **归族**: local → R2-4 批（疑 scada 查看器全族同根；scada-demo 因画布底色干扰未取得有效 bbox，标注存疑待复核）
- **复核状态**: 未复核

### [R2-1c-C2-01] playground 浮动徽标压住页头 Back 按钮（P3）

- **页面/路由**: `#/scada-pressure-demo`（`#/scada-edge-cases`、`#/scada-perf-scale` 同布局同现；`#/scada-demo`、`#/three-canvas-demo` 因壳层内边距大不命中）
- **主题/视口/状态**: light / 1280 / 默认
- **截图**: `…/scada-pressure-demo/scada-pressure-demo-overview-light.png`（左上角按钮可见文本仅剩「to Home」）
- **程序化证据**: 截图目视 + 布局事实：固定定位徽标（左上角「0」圆标）与 `p-4` 布局页的 Back 按钮 rect 相交，遮盖按钮左侧图标与「← Bac」文本。[visual-only]（遮蔽为静态几何，两张截图可并排复核）
- **对照基准**: WCAG 2.4.11（焦点/控件不得被遮挡）；检查提示词 C2。
- **严重程度**: P3
- **用户影响**: p-4 布局域页面左上返回按钮起始段不可见（仍可点击剩余部分），观感破损。
- **修复方向**: playground 浮动徽标挪位（右下）或给域页面头部让位（`p-4` 页加 `pl-14` 一类起始留白）。
- **归族**: watch-only → watch-pool.md（并入 chip 遮挡族）
- **复核状态**: 未复核（[visual-only]）

## 4. 误报排除记录

- 10k 画面默认 fit 下标注（textSize 10 → 2.4px）不可读：1800×1300 场景 fit 进 1214×312 容器的 contain 语义必然结果，属压力基体设计意图，且工具栏有「滚轮缩放」提示、数据密集中间态豁免（briefing 误报红线：分级加载/大数据量空态豁免）；不按标注缺陷报。标注可读性真正的阻塞在缩放手势（R2-1c-G-01）。
- 巨大空白区（画布下部）：fit-contain 对横纵比失配的正确 letterbox，非渲染缺陷。
- 10k 构建等待：ready <0.5s，无可见 loading 空窗，A5 无发现。

## 5. 台账回写

- 本卡完成后 `ledger.md` 对应行 status → `carded`；findings 归族后 → `digested`。
