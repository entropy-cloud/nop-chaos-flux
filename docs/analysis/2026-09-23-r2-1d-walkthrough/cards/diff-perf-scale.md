# [card] page:diff-perf-scale

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/diff-perf-scale` ｜ **载体**: 域页面（1500+ 行 diff 压测）
- **矩阵裁剪**: simplified（压测页：light/dark × 1280 + 中段滚动抽样；裁掉 800 视口与元素态抽样——页面与 diff-view 同渲染器，控件/焦点面已由该页覆盖）

## 1. 截图清单

| 状态      | light                                                                            | dark                    |
| --------- | -------------------------------------------------------------------------------- | ----------------------- |
| 默认 1280 | `_tmp/visual-inspection-2026-09-23/r2-1d/diff-perf-scale/default-1280-light.png` | `default-1280-dark.png` |
| 中段滚动  | `mid-scroll-light.png` / `settled-1280-light.png`                                | `settled-1280-dark.png` |

## 2. A–H 勾选

- A: A9 n/a（无工具栏交互承诺）；A5 注意项见 C-50
- B: B3✔(+2253/-1 语义色正确) **B5 族确认（B-48 同根因：dark 不可读，`rgb(230,236,243)` 叠 light 底，不另立）**
- C: **C5 warn(C-50)** C6 n/a
- D: **D3✔(14,492 可见行 heightHist 全部=24px，无离群行)**
- E: **E4✔(gutter x 唯一值，无漂移)**
- F: F1✔（与 diff-view 同渲染器同 token）
- G n/a ｜ H n/a

## 3. 发现条目

### [R2-1d-C-50] 14k 行全量挂载且无内部滚动容器（watch）

- **页面/路由**: `#/diff-perf-scale`（`@@ -1,4993 +1,7245 @@` 单 hunk）
- **主题/视口/状态**: light / 1280 / 加载后 3s + 中段滚动
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/diff-perf-scale/settled-1280-light.png`
- **目视描述**: 渲染正常（split 对齐、24px 行距），但整页无独立滚动区，靠文档级长页滚动。
- **程序化证据**: 探针=`document.querySelectorAll('.nop-diff-line')` 计数 + 滚动容器扫描；输出=`count:14492, scrollContainers:0`（无 overflow-y:auto 且 scrollHeight>clientHeight 的容器）→ 文档高约 14492×24≈34.8 万 px，全量 DOM 无虚拟化。
- **对照基准**: C5（滚动归属/双滚动条）；性能域边界（检查提示词误报表：性能问题归性能域，仅无 loading 指示时按 A5 报——本页首帧 3s 内可渲染出可见内容，无 loading 骨架但有即时内容，不触 A5）。
- **严重程度**: P3（watch-only：压测页本身以大 DOM 为目的，但滚动发生在文档层使 sticky pane header 的滚动语境错位，且低端机滚动必卡）
- **用户影响**: 压测用户滚动整页时浏览器主线程压力大；普通用户少见。
- **修复方向**: 给 diff 内容区套 `flex-1 min-h-0 overflow-auto` 滚动容器（与 diff-view 的 h-screen 壳统一）；中期评估按需渲染/虚拟化。
- **归族**: watch-only → 台账（性能域 + R2-3 候选滚动容器契约）
- **复核状态**: 未复核

## 4. 备注

- B5 dark 不可读与 diff-view 的 R2-1d-B-48 同根因（同一渲染器 CSS、同一页面 chrome 模式），按简报"确认影响面一句话"口径归并，不重复立项。
- 波重点三项（E4 对齐 / B3+B6 语义色 / D3 行高一致性）在本页全部 pass——大规模下渲染质量稳定。
