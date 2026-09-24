# [card] control:diff-view

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/diff-view` ｜ **载体**: lab 页（MultiScenarioLabPage，5 场景：Host diff in dialog + line click (C6.5 bug 73 pattern) / Host cross-file nav + out-of-range clamp (C6.5) / Host diff reaction wiring + component handles (C6.5) / Host diff expandAll/collapseAll (C6.5) / Host diff empty state (C6.5)）
- **重叠说明**: diff-view 的 **demo 页面**（diff-view / diff-perf-scale）已在 R2-1d 走查；本卡走查 **lab 载体面**，独立台账单元。命中同根因时引用 R2-1d-B-48 族（light-only CSS），不重复立项。
- **矩阵裁剪**: simplified（matrixReason：双栏 split 已全查 + unified 切换实拍；拖拽/弹层深度矩阵归弹层卡。实际裁掉：glass 皮肤、three-column 视图（fixture 未配置三栏数据）、语法高亮 token 级走查（R2-1d 已覆盖 demo 页）、键盘 hunk 导航）

## 1. 截图清单

| 状态                       | light                                                                                                              | dark（真 data-mode，自采）                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| 默认 1280×800（全 5 场景） | `_tmp/visual-inspection-2026-09-24/r2-2b/diff-view/default-full-light.png`                                         | `_tmp/visual-inspection-2026-09-24/r2-2b/diff-view/default-full-dark.png`       |
| 默认 800×900               | `_tmp/visual-inspection-2026-09-24/r2-2b/diff-view/default-narrow-800-light.png`                                   | `_tmp/visual-inspection-2026-09-24/r2-2b/diff-view/default-narrow-800-dark.png` |
| diff 弹层开（split 双栏）  | `_tmp/visual-inspection-2026-09-24/r2-2b/diff-view/diff-dialog-open-light.png`                                     | —                                                                               |
| cross-file 切到第 2 项     | `_tmp/visual-inspection-2026-09-24/r2-2b/diff-view/cross-file-2-light.png`                                         | —                                                                               |
| cross-file 800 宽          | `_tmp/visual-inspection-2026-09-24/r2-2b/diff-view/cross-file-narrow-light.png`                                    | —                                                                               |
| reaction 切 unified        | `_tmp/visual-inspection-2026-09-24/r2-2b/diff-view/reaction-unified-light.png` / `reaction-after-toggle-light.png` | —                                                                               |
| expand 展开态              | —                                                                                                                  | `_tmp/visual-inspection-2026-09-24/r2-2b/diff-view/expand-dark.png`             |
| split 常驻场景             | —                                                                                                                  | `_tmp/visual-inspection-2026-09-24/r2-2b/diff-view/split-dark.png`              |

## 2. A–H 维度勾选表

- A 交互：A1 pass（add/del 行 hover 换 `--nop-diff-*-bg-hover`）A2 pass A3 pass（文件列表/折叠/视图切换均 ≥24px）A4 n/a A5 pass（identical 内容走 noChanges 空态（场景 5，`+0 −0` 0 行不崩））A6/A8 n/a A7 pass（弹层关闭钮存在，Esc 关闭 `afterEscDialogs: 0`）A9 pass（行点击 `window.__c6c5LineClick === "3|old|add"`（payload `${lineNumber}|${side}|${type}` 全解析）；reaction `split→unified→set unified→set split` 全链翻转；expandAll `0→36 行` / collapseAll `36→0 行`）
- B 颜色：B1 pass（light 下 add/del 底与正文对比）B2 pass B3 pass（绿=增、红=删语义一致）B4 pass（全走 `--nop-diff-*` 令牌，无字面散落）B5 **fail（族引用 R2-1d-B-48，见 §4）**：dark 下 diff 面整体亮色块，像素采样 add `rgb(230,248,230)` / del `rgb(255,235,232)` / context `rgb(255,255,255)` / gutter `rgb(243,245,248)`——651 行 diff-view.css 零 `data-mode` dark 覆盖 B6 n/a
- C 布局：C1 pass（docOverX=0；弹层内 overflow 命中为 ui Dialog sr-only，白名单排除）C2 pass（split 双栏 gutter 对齐，行高统一 24px：`lineHeightSet: [24]`）C3 pass C4 pass C5 n/a C6 n/a
- D 间隔：D1 pass（行高 24px 全表一致，无离群行）D2–D8 n/a/pass
- E 排布：E1 pass（旧版/新版栏头、stat badge `+7 −5` 醒目）E2 pass E3 pass E4 pass（双栏左右缘对齐）E5 pass E6 pass（空态有 noChanges 提示非空白）
- F 一致性：F1 n/a F2 n/a F3 n/a F4 warn（见 §4 i18n 族实例："全部/新增/已修改/已删除"、"统一视图"、"旧版/新版"、"折叠"、"搜索文件…"）F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（surface 560×744 md 档）H3 **warn（族引用 R2-2a-H3-08，见 §4）**：`surfBox.bottom 804 > viewportH−8 = 792`（top 60 锚定 + 内容 744 未约束 max-height，与 R2-2a dialog 卡同根因）H4 pass H8 pass（滚动发生在 body 区）H9 pass

## 3. 发现条目

（无新增编号发现——本卡全部命中均落既有族，按任务重叠说明引用不另立项；新实例证据已附于 §4。功能性面（lineClick payload、cross-file 切换 + out-of-range clamp、reaction wiring、expand/collapse、空态）经探针全数验证通过：`_tmp/r2-2b-probes/out-w1-diff-view.json` / `out-w1-diff-view2.json` / `out-w1-diff-view3.json`。）

## 4. 已知族命中（引用，不另立项）

- **R2-1d-B-48 族（diff-view light-only CSS）**：lab 载体面新实例坐实——`diff-view.css` 全文 651 行无任何 `data-mode` dark 块；dark（真 data-mode）下 PNG 像素采样 add 行 `rgb(230,248,230)`、del 行 `rgb(255,235,232)`、context `rgb(255,255,255)`、gutter `rgb(243,245,248)`（`out-w1-diff-view2.json` darkSamples），`default-full-dark.png` 中 diff 面为暗页上的大白块（文件列表侧因走 tailwind 令牌而正确变暗，同屏"半暗半亮"）。文字仍在亮底上保持可读（非 P0/P1 不可读），修复后需本卡 B5 复检。
- **R2-2a-H3-08 族（top 锚定弹层底部越出视口）**：新实例 `surfBox: { top: 60, h: 744, bottom: 804 }` > `innerHeight−8=792`（`out-w1-diff-view.json` dialog 段；`diff-dialog-open-light.png` 底缘被视口裁断无收边）。同根因：`--dialog-top-offset` 未计入 max-height。引用族。
- **i18n zh-CN 回退族**：diff-view 组件 chrome 经 `t('flux.diff.*')` 输出中文（diff-file-list.tsx L79-82/L96-97/L152-156）——"全部 (3)/新增 (1)/已修改 (1)/已删除 (0)"过滤签、"搜索文件…"占位、"统一视图/旧版/新版/折叠"，全英文 lab 页内成片中文 chrome。引用族（本控件为该族高密度实例：一处控件 8+ 条字符串）。
- **lab 载体与环境基建族**：scope-debug 面板（"调试/折叠"）随 5 个场景出现，已知环境项。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-diff-view` → carded（卡列填本路径）；findings 归族后 → digested。
