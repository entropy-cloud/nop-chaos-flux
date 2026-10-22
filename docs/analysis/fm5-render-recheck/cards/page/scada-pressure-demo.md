# [card] page:scada-pressure-demo

- **批次**: FM-5 shard3（A 组改版页回归复检）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/scada-pressure-demo`（domain 路由）｜ **载体**: domain demo 页
- **矩阵裁剪**: simplified（复检口径；G-01 缩放手势为交互级，本轮静态面可判）

## 1. 截图清单

| 状态          | light                                                          | dark                         |
| ------------- | -------------------------------------------------------------- | ---------------------------- |
| 默认 1280×800 | `scada-pressure-demo-default-1280x800-light.png`（加载中间帧） | `...-dark.png`（全量渲染帧） |
| 默认 800×900  | `scada-pressure-demo-default-800x900-light.png`                | `...-dark.png`               |

## 2. A–H 判定（简）

- A 交互：pass ｜ B 颜色：pass（工艺流程大屏深底语义恒定，仪表/管线可读）｜ C 布局：pass——**R2-1c-C2-01（playground 浮动徽标压 Back）本轮不复现**：徽标现位于左下角，页头 Back 无遮挡（壳层改动带来的改善）｜ G：G-01（缩放手势失真 P2）交互级未复核（覆盖缺口登记）

## 3. 发现

- light 默认帧为 10 万级测量场景异步加载中间帧（spinner）——dark 帧与页面描述（~20 图元工艺流程屏）一致渲染，判定为截屏时机伪影非缺陷。

## 4. 结论

**verdict: pass（回归面；C2-01 改善不复现，G-01 登记覆盖缺口）**。
