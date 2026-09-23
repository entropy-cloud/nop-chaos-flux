# [card] page:scada-perf-scale

- **批次**: R2-1c ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/scada-perf-scale` ｜ **载体**: lab 页（I14.1 性能基准测量页：占位画面 / 10 万图元 ×2 变体 / 1 万点刷新）
- **矩阵裁剪**: simplified（matrixReason：briefing 明示聚焦渲染正确性与图例/标注可读性、**不度量性能数值**；「无 stroke 对照」变体与 stroke 同视觉类（仅描边差异）由 e2e 内存口径覆盖，本卡视觉走查裁剪；glass 按波次口径省略。实际裁掉：scale-nostroke 分屏、弹层（无）、拖拽（平移同 R2-1c-G-01 已覆盖））
- **探针耗时**: 占位 ready 103ms；**10 万图元（含 stroke）ready 102ms / settle 801ms**；1 万点刷新 ready 63ms——全部远低于 120s 上限（仅记录耗时，不作性能结论）

## 1. 截图清单

| 状态                   | light                                                             | dark                                       |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| 占位画面 1280×800      | `…/r2-1c/scada-perf-scale/scada-perf-scale-placeholder-light.png` | —                                          |
| 10 万图元（含 stroke） | `…/scada-perf-scale-scale-stroke-light.png`                       | `…/scada-perf-scale-scale-stroke-dark.png` |
| 1 万点实时刷新场景     | `…/scada-perf-scale-refresh-light.png`                            | —                                          |
| 占位 ~800 宽           | `…/scada-perf-scale-placeholder-800-light.png`                    | —                                          |

## 2. A–H 维度勾选表

- A 交互：A1 n/a（画布图元无 hover 语义）A2 ✓ A3 ✓ A4 n/a A5 ✓（10 万构建期间 loading schema 具备，ready 快无空窗感知）A6 n/a A7 n/a A8 n/a A9 ✓（分屏切换重挂载正确）
- B 颜色：B1 ✓（contrastFails=0，控制条/页头全过）B2 ✓ B3 n/a（6 色 RECT_PALETTE 为性能基体无语义映射）B4 ✓ B5 ✓（10 万 dark 截图正常）B6 n/a
- C 布局：C1 ✓（无溢出）C2 warn（playground 徽标压 Back，族引用 R2-1c-C2-01）C3 ✓ C4 ✓（c6_800 全 true）C5 n/a C6 ✓（三 canvas 层 attr 2428×528 = CSS 1214×264 ×DPR2，10 万构建后同值——**10 万图元下 C6 仍过**）
- D 间隔：D1 ✓（blockGaps [12,12]）D2 ✓ D3 n/a D4 ✓ D5 n/a D6 n/a D7 ✓ D8 ✓
- E 排布：E1 ✓（分屏按钮+测量入口说明三问可答）E2 ✓（选中 tab default vs outline）E3 ✓ E4 ✓ E5 ✓ E6 ✓
- F 一致性：F1 ✓ F2 ✓ F3 ✓ F4 ✓（与 pressure 页 tab/文案句式一致）F5 n/a
- G 设计器：n/a（滚轮/缩放行为同 scada 查看器族，见 R2-1c-G-01，本页不重复立条）
- H 弹层：n/a

## 3. 发现条目

（本页无新立 findings；命中族引用两条如下，判级与修复方向以族主条目为准）

- **R2-1c-C2-01（族引用，P3）**: playground 浮动徽标压住 Back 按钮左侧（截图 `…/scada-perf-scale-placeholder-light.png` 左上角「to Home」残段）。归族 local → R2-4。
- **R2-1c-G-01（族引用，P2）**: scada 查看器缩放手势失真（滚轮=垂直平移、ctrl+滚轮仅 X 缩放）在本页同样适用；本页未单独取证，判级见 pressure 卡主条目。归族 local → R2-4。

## 4. 渲染正确性记录（本页核心走查项，全过）

- 10 万图元（含 stroke）首帧渲染完整：像素探针 nonBlankRatio 0.339 / 119 个颜色桶（6 色 palette + stroke 暗描边 + 抗锯齿过渡），截图目视矩阵均匀、letterbox 居中、无丢块/花屏/错位。
- 1 万点刷新场景（opacity ← 点值绑定）渲染正常（nonBlank 0.327），分屏切换后画布 C6 仍过。
- 控制条可读性：4 个分屏按钮 12.8px 标签对比度全过（contrastFails=0），选中态蓝底白字清晰。
- 10 万构建全程未见不可恢复的中间空态（loading schema 就位，探针未捕获持续空白帧）。

## 5. 误报排除记录

- 10 万画面「密集噪点式」观感：性能基体设计意图（固定种子随机矩形），不按布局/美学判。
- 本卡不记录任何性能数值结论（briefing 口径）；探针耗时仅为环境记录（≪120s 上限）。
- dark 下画布观感与 light 一致（画布无背景配置、透明叠加页面深底）：fit 语义，非 dark 缺陷。

## 6. 台账回写

- 本卡完成后 `ledger.md` 对应行 status → `carded`；族引用 findings 随主条目归族后 → `digested`。
