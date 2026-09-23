# [card] page:complex-pages-index

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages` ｜ **载体**: complex-pages 索引页（showcase）
- **矩阵裁剪**: simplified（index-page-slim：默认 light/dark + 1280 + 800 窄视口；裁掉 hover/focus 抽样、弹层、拖拽——纯导航索引页）

## 1. 截图清单

| 状态          | light                                                                                | dark                    |
| ------------- | ------------------------------------------------------------------------------------ | ----------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-09-23/r2-1d/complex-pages-index/default-1280-light.png` | `default-1280-dark.png` |
| 默认 800×900  | `default-800x900-light.png`                                                          | —                       |

## 2. A–H 勾选

- A: slim 裁剪（同 lab-index）
- B: B1✔ B5✔ 其余 slim
- C: C1✔ **C2 warn(C-46)** C3✔ C4✔
- D: D1✔
- E: E1✔ E6✔("从左侧选择一个复杂页面场景…"引导)
- F: F3✔(与 lab-index 同构，宽度/布局一致)
- G n/a ｜ H n/a

## 3. 发现条目

### [R2-1d-C-46] 浮动 debugger 徽标与左上返回链路重叠（P3，lab/complex 索引页同象）

- **页面/路由**: `#/complex-pages` 与 `#/lab`（所有带左上返回链路的页均可能出现）
- **主题/视口/状态**: light / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/complex-pages-index/default-1280-light.png`（左上 "← [迹0] Home"）
- **目视描述**: 固定定位的 debugger launcher 徽标（"迹 0"）压在 "← Home" 返回链接行内，三者挤在一行。
- **程序化证据**: 探针=截图目视 + 元素求交（launcher fixed 坐标与返回链接 boundingRect 相交）；输出=视觉重叠确认（lab-index 同样）。[visual-only 倾向，复核时重测求交]
- **对照基准**: C2 无意外重叠（非有意 overlay）。
- **严重程度**: P3（点击目标仍可命中，观感问题）
- **用户影响**: 返回链路可读性下降，可能误点徽标。
- **修复方向**: launcher 初始位置下移/右移，避开页内左上角固定导航带；或索引页给返回链路让位 padding。
- **归族**: local → R2-4 批（launcher 全局 fixture，若多页复现升 R2-3）
- **复核状态**: 未复核

## 4. 备注

- 46 个导航项（数据列表 6 / 主从详情 3 / 复杂表单 4 / 数据可视化 1 / 外部应用复刻 26）= "40 个真实业务页面 · 5 个分类" 计数吻合。
- 结构探针：overflow=[]、targets=[]。
