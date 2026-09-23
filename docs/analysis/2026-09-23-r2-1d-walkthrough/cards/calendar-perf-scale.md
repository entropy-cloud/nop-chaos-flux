# [card] page:calendar-perf-scale

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/calendar-perf-scale` ｜ **载体**: perf fixture 页（`apps/playground/src/pages/calendar-perf-scale-demo.tsx`，300 事件 × 31 天资源月视图）
- **矩阵裁剪**: simplified（地板：light+dark、1280+~800、渲染正确性；拖拽/弹层/视图切换引用 `#/scheduling-calendar` 卡同源结论）

## 1. 截图清单

| 状态          | light                                                                                | dark                           |
| ------------- | ------------------------------------------------------------------------------------ | ------------------------------ |
| 默认 1280×800 | `_tmp/visual-inspection-2026-09-23/r2-1d/calendar-perf-scale/default-light-1280.png` | `default-dark-1280.png`        |
| ~800 宽       | `default-light-800.png`                                                              | —（网格收缩 + 截断合规，裁剪） |

## 2. 维度勾选（地板口径）

- 渲染正确性 **pass**：300 事件块/31 天列全渲染，空白块=0；split 并发块收窄 + 红点冲突徽标正确；页头图例与类型色一致。
- C1 pass（事件块 truncate 为有意；~800 宽格内截断合规）；A3 warn（split 块 18.6px 命中区，族口径引用 R2-1d-A3-01）。
- B1 **fail(引用 R2-1d-B1-02：事件白字压 success/warning 底，本页 300 块中占比更高的绿/琥珀块同证)**。
- B5 **fail(引用 R2-1d-B5-01：载体头部，本页 dark 截图同证)**。

## 3. 发现条目

无本页新增发现（渲染正确性全绿；对比度/头部/小目标均为已归族引用）。

**正例记录**: 并发冲突徽标（红点）在 split 块上不遮挡标题；31 列网格在 1280 与 ~800 下均无塌陷；「月/周/日 + 今日」控件与主 calendar 页一致（F1 pass）。

## 4. 台账回写

- ledger.md `calendar-perf-scale` 行 status → `carded`；B1-02/B5-01 引用归族后 → `digested`。
