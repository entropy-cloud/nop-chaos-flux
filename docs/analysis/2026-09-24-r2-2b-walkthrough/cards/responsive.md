# [card] control:responsive

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/responsive` ｜ **载体**: lab 页（2 场景：named breakpoint variants（mobile max:lg / desktop default）/ numeric bounds variants（tablet 768–1023 / wide ≥1024 / default <768））
- **矩阵裁剪**: simplified（matrixReason：结构切换容器——无交互态/值态；矩阵聚焦断点切换正确性与单子树不变量；裁掉：glass 皮肤、matchMedia 缺失环境降级路径（非浏览器视觉面）、切换动画（契约即"重建子树"，无动画设计））

## 1. 截图清单

| 状态                             | light                                                                        | dark（真 data-mode，自采）                                                 |
| -------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1280（desktop + wide）           | `_tmp/visual-inspection-2026-09-24/r2-2b/responsive/default-1280-light.png`  | `_tmp/visual-inspection-2026-09-24/r2-2b/responsive/default-1280-dark.png` |
| 1023（mobile + tablet，边界 -1） | `_tmp/visual-inspection-2026-09-24/r2-2b/responsive/boundary-1023-light.png` | —                                                                          |
| 800×800（mobile + tablet）       | `_tmp/visual-inspection-2026-09-24/r2-2b/responsive/default-800-light.png`   | —                                                                          |
| 767（mobile + default，边界 -1） | `_tmp/visual-inspection-2026-09-24/r2-2b/responsive/default-767-light.png`   | —                                                                          |

## 2. A–H 维度勾选表

- A 交互：A1–A9 n/a（容器无自交互；断点切换由视口 resize 驱动——interactions.mjs 无 viewport action，交互键无法注册，理由见 §4）
- B 颜色：B1–B6 n/a/pass（容器无色面，子树走正文令牌；dark 复检正常）
- C 布局：C1 pass（800 视口 `overflowScan` docOverX=0）C2 pass **单子树不变量成立**（每实例任意视口仅一个 variant 子树：各视口 leafTexts 恒单项）C3 pass C4 **pass（重点项）**（五点采样全对：1280/1024→desktop+wide；1023/800→mobile+tablet；767→mobile+default；1024 与 1023 边界两侧正确翻转）C5 n/a C6 n/a
- D 间隔：D1–D8 n/a（无自有间隔结构）
- E 排布：E1 pass（当前命中树文本自述明确，3 秒可答）E2–E6 n/a
- F 一致性：F1 pass（named 与 numeric 两套声明语义一致：min 含、max 排他）F2–F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

（无——本控件全维度通过。）

正向基线记录：

- **切换中间态程序化坐实**：`w5-responsive.mjs` 挂 MutationObserver 后连续 resize 1024→1023→800→767，mutation 序列恰为 3 次单点重建（`MOBILE|WIDE` → `MOBILE|TABLET` → `MOBILE|DEFAULT`），无双重子树、无闪烁中间帧、无漏切换；`data-variant-count`/`data-active-variant` 属性随态更新。
- min 含/max 排他语义在 1023/1024 与 767/768 两处边界均精确成立。

## 4. 已知族命中（引用，不另立项）

- 无。交互键注册理由：断点切换的唯一驱动是视口 resize，`scripts/visual-quality/interactions.mjs` 现有 action 集（click/clickText/waitFor/press/setAttribute）无法表达 viewport 变更，故本控件不注册交互键（非元素不可达）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-responsive` → carded（卡列填本路径）；本卡零 findings，归族后直接 → digested。
