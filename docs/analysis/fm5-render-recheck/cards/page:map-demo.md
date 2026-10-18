# [card] page:map-demo

- **批次**: FM-5 shard3（A 组改版页回归复检）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/map-demo`（domain 路由）｜ **载体**: domain demo 页
- **矩阵裁剪**: simplified（复检口径；交互/缩放态不在本轮矩阵）

## 1. 截图清单

| 状态                 | light                                     | dark           |
| -------------------- | ----------------------------------------- | -------------- |
| 默认 1280×800        | `map-demo-default-1280x800-light.png`     | `...-dark.png` |
| 默认 800×900         | `map-demo-default-800x900-light.png`      | `...-dark.png` |
| interaction 1280×800 | `map-demo-interaction-1280x800-light.png` | `...-dark.png` |

## 2. A–H 判定（简）

- A 交互：pass（空态卡「暂无区域数据」有意义提示，A5 达标；A3-01 维持）｜ B 颜色：pass（B3-01 聚合点计数文本**已可见**：3/3/2 数字渲染；填充色仍为统一蓝，色阶部分维持登记）｜ C 布局：pass ｜ **B5/dark：carried——R2-1c-B5-01 页头 bg-white 硬编码维持**（dark 下页头亮底、标题灰字低对比），属 R2-5 §4 在册「bg-white 模板头部 8 页」R2-4b 首批队列，无恶化 ｜ G：n/a

## 3. 发现

- **R2-1c-C6-01（P1 Region 画布整版空白）修复确认**：Region 卡渲染中国省份 geojson 着色，投影正确。
- R2-1c-A3-01（ol.css 未引入、控件裸排）维持：左上 +/− 与指北针仍为无样式文本态，无恶化。
- B5-01 维持（在册队列），无恶化。

## 4. 结论

**verdict: pass（回归面；R2 P1 修复确认，两项已登记 P2 维持）**。
