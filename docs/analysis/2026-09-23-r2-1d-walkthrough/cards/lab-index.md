# [card] page:lab-index

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab` ｜ **载体**: lab 索引页（ComponentLabPage）
- **矩阵裁剪**: simplified（index-page-slim：默认 light/dark + 1280 + 800 窄视口；裁掉 hover/focus 抽样、弹层、拖拽——纯导航索引页，无控件交互面）

## 1. 截图清单

| 状态          | light                                                                      | dark                    |
| ------------- | -------------------------------------------------------------------------- | ----------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-09-23/r2-1d/lab-index/default-1280-light.png` | `default-1280-dark.png` |
| 默认 800×900  | `default-800x900-light.png`                                                | —                       |

## 2. A–H 勾选

- A: A1–A9 抽样裁剪（slim 理由见上）
- B: B1✔ B5✔(dark 无溢出/无异常) 其余 slim 裁剪
- C: C1✔(1280/800 无溢出) **C2 warn(C-46 见 complex-pages-index 卡,浮动徽标与左上返回链路重叠)** C3✔(空态引导语清楚) C4✔
- D: D1✔(导航行距均匀) 其余✔/n/a
- E: E1✔ E6✔(空态有"Select a renderer from the left panel"引导)
- F: F3✔(与 complex-pages-index 同构同布局)
- G n/a ｜ H n/a

## 3. 发现条目

（本页无独立发现；共享发现 C-46 记录在 complex-pages-index 卡，双页同象。）

## 4. 备注

- 129 个导航项（LAYOUT 22 / CONTENT 23 / …共 9 组）+ "124 renderers available" 计数一致，无断项。
- 结构探针：overflow=[]、targets<24px=[]。
