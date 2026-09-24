# [card] control:cards

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/cards` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：Basic cards from items / Host cards selection modes + item action (C6.2 bug 73 pattern)（single/multiple/none 三模式同场景）/ Host cards embedded item action (C6.2 bug 73 pattern)）
- **矩阵裁剪**: simplified（matrixReason：数据集合控件，选中态即核心切换态（已全查），无弹层/拖拽。实际裁掉：glass 皮肤、selectionMode=multiple 键盘多选（Shift/Ctrl 组合键走查）、cards-empty 空数据态（fixture 未配置空 items——归 lab 载体族注明 §4）、columns 布局变体（响应式经 800 宽视口覆盖））

## 1. 截图清单

| 状态                                  | light                                                                        | dark（真 data-mode，自采）                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 默认 1280×800（全场景）               | `_tmp/visual-inspection-2026-09-24/r2-2b/cards/default-full-light.png`       | `_tmp/visual-inspection-2026-09-24/r2-2b/cards/default-full-dark.png`       |
| 默认 800×900                          | `_tmp/visual-inspection-2026-09-24/r2-2b/cards/default-narrow-800-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/cards/default-narrow-800-dark.png` |
| 选中态（single 1 张 + multiple 2 张） | `_tmp/visual-inspection-2026-09-24/r2-2b/cards/selection-clicked-light.png`  | `_tmp/visual-inspection-2026-09-24/r2-2b/cards/selection-clicked-dark.png`  |
| 可选卡 hover                          | `_tmp/visual-inspection-2026-09-24/r2-2b/cards/item-hover-light.png`         | —                                                                           |

## 2. A–H 维度勾选表

- A 交互：A1 pass（可选卡 hover `border-primary/60`（oklab(0.57…/0.6)）+ cursor:pointer 可感知）A2 pass（可选卡 tabIndex=0，focus outline 3px 可见）A3 pass（无 <24px 目标，smallTargetScan 空）A4 n/a A5 n/a A6/A8 n/a A7 n/a A9 pass（single `single-report:1`、none 模式 `none-report:pending`（点击不产生选中=正确语义）、Pick 行动作 `window.__c6c2CardsPick === "Beta"` 行作用域无污染）
- B 颜色：B1 pass B2 pass（选中态 border `rgb(28,110,242)` primary + ring-2 ring-primary/40，dark 换 oklab(0.65…) 亮主色，双主题可辨）B3 pass（选中色=primary 语义一致）B4 pass B5 pass（dark 选中态截图可辨，边框/文本全适配）B6 pass（选中态非默认蓝裸奔，走 primary 令牌）
- C 布局：C1 pass（双视口 docOverX=0）C2 pass C3 pass C4 pass（800 宽 `sm:grid-cols-2` 正确降为两列，第三张换行不挤压：item w=213 顺排）C5 n/a C6 n/a
- D 间隔：D1 pass（grid gap-3=12px 落栅格，D7 零间距扫描无命中）D2 pass D3 pass（三行卡高一致 52px）D8 pass
- E 排布：E1 pass E2 pass（选中卡边框强调强于未选）E3 pass E4 pass（三列左缘 301/611/921 等距 310px）E5 pass（grid 分组语言统一）E6 n/a
- F 一致性：F1 pass（选中语言与 table 行选中/单卡 focus 同为 primary 系）F2 n/a F3 n/a F4 pass（无文案）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无——本控件全部维度 pass。走查取证键：selection 三模式状态矩阵、Pick 行作用域、hover/focus 双态、dark 平价，证据落 `_tmp/r2-2b-probes/out-w1-cards.json`。）

## 4. 已知族命中（引用，不另立项）

- **lab 载体与环境基建族**：①cards-empty 空数据路径（cards-renderer.tsx L243 `data-slot="cards-empty"`）无 lab fixture 覆盖，空态渲染面未取证；②场景内附带的 scope-debug 面板（"调试/折叠"中文 chrome）为已知 lab 环境项，非控件缺陷。
- **计划内锚点复检通过**：ARIA 裁决（CR P2-1）落地正确——interactive 卡 `role="button"`（ui Card 强制）配 `aria-pressed`，非交互卡保持 `role="listitem"` 无 pressed；`data-selected` 与 `aria-pressed` 双轨同步（out-w1-cards.json selection.states 三模式全对）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-cards` → carded（卡列填本路径）；findings 归族后 → digested。
