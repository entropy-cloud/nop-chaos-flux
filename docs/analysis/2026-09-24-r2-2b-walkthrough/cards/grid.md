# [card] control:grid

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/grid` ｜ **载体**: lab 页（3 场景：basic colSpan / raw CSS columns / host nested grid + responsiveColumns（C5.1））
- **矩阵裁剪**: simplified（matrixReason：纯结构布局容器——无 hover/focus/disabled/error/值态可查（无交互目标），矩阵聚焦几何（D1/D2）、断点行为（C4）、marker 契约；裁掉：glass 皮肤、autoFlow/alignItems 变体（fixture 未布）、超长内容溢出单元格场景（fixture 无））

## 1. 截图清单

| 状态                               | light                                                                                                        | dark（真 data-mode，自采）                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| 默认 1280×800                      | `_tmp/visual-inspection-2026-09-24/r2-2b/grid/default-1280-light.png`                                        | `_tmp/visual-inspection-2026-09-24/r2-2b/grid/default-1280-dark.png` |
| 默认 800×900                       | `_tmp/visual-inspection-2026-09-24/r2-2b/grid/default-800-light.png`                                         | —                                                                    |
| host 断点 768（lg bucket）         | `_tmp/visual-inspection-2026-09-24/r2-2b/grid/host-768-light.png`                                            | —                                                                    |
| host 断点 767（narrow，sm:1 生效） | `_tmp/visual-inspection-2026-09-24/r2-2b/grid/host-767-light.png`                                            | —                                                                    |
| host 500px 深窄                    | `_tmp/visual-inspection-2026-09-24/r2-2b/grid/host-500-light.png`                                            | —                                                                    |
| host 断点 1023/1024                | `_tmp/visual-inspection-2026-09-24/r2-2b/grid/host-boundary-1023-light.png` / `host-boundary-1024-light.png` | —                                                                    |

## 2. A–H 维度勾选表

- A 交互：A1–A9 n/a（纯结构容器，无交互目标；`smallTargetScan` 零命中佐证无可点元素误植）
- B 颜色：B1–B6 n/a/pass（grid 本体无色面；单元格仅文本，走页面正文令牌；dark 复检无异常）
- C 布局：C1 pass（1280/800 双轮 `overflowScan` docOverX=0 零命中）C2 pass C3 pass C4 **pass（重点项）**（767/768 断点切换干净：768→`repeat(2, minmax(0,1fr))` 195px×2；767→单列 405px 且 `data-responsive="narrow"`、`data-columns="1"`；1023/1024 双列不变符合 sm/lg→768 阈值语义）C5 n/a C6 n/a
- D 间隔：D1 **pass**（gap 全体系落栅格：basic 数字 gap 12px inline；raw `1rem`→16px；host 语义 token `md`→`gap-4` 16px、嵌套 gap 8px）D2 pass（嵌套组内 8px < 组间 16px，邻近原则成立）D3–D8 n/a
- E 排布：E1 pass E2 n/a E3 n/a E4 pass（basic 三轨 298/298/298，colSpan=2 项宽 608=2×298+12 精确；cell x 301/611 无漂移）E5 pass E6 n/a
- F 一致性：F1 pass（gap 解析与 flex/container/form 同机制——number→px、token→类、string→raw）F2–F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无——本控件全维度通过。）

正向基线记录（供复检对照）：

- **marker-only 契约成立**：basic root class 恰为 `nop-grid`，host root `nop-grid gap-4`（token gap 经 schema 解析，非硬编码视觉类），全部布局值走 inline style（`grid-template-columns: repeat(N, minmax(0px, 1fr)); gap: …`），符合 styling-system「Layout renderers emit marker classes only」契约。
- **responsiveColumns 语义**：`useIsMobile()` 单一 768px 阈值（`grid-renderer.tsx` L36-56 注释裁决记录），sm↔md/lg 二桶，`md` 声明会并入 ≥768 桶——schema 作者需知悉，属文档化设计决策非缺陷。
- colSpan 钳制 `clampSpan` 与 `data-columns`/`data-responsive` 调试属性齐备。

## 4. 已知族命中（引用，不另立项）

- 无。布局类控件不命中 dark/弹层/校验各族；lab 载体族不适用（本页 stage 无 host 按钮行溢出）。

## 交互键登记

- 无注册交互键：纯结构容器无交互态；断点行为需 viewport resize 驱动，runner action 集无 resize（closure audit F2 补录 2026-09-24）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-grid` → carded（卡列填本路径）；本卡零 findings，归族后直接 → digested。
