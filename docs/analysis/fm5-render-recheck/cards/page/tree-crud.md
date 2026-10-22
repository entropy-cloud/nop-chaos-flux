# [card] page:tree-crud

- **批次**: FM-5 shard3（A 组改版页回归复检）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/tree-crud` ｜ **载体**: complex-page
- **矩阵裁剪**: simplified（复检口径；light 帧空白 + dark 帧行淡入中间态，均以 settled 探针复核）

## 1. 截图清单

| 状态          | light                                                                                                                                       | dark                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 默认 1280×800 | `tree-crud-default-1280x800-light.png`（**空白帧，采集伪影**）→ settled `_tmp/visual-inspection-2026-10-18/fm5-tree-crud-settled-light.png` | `...-dark.png`（**行淡入中间态**）→ settled `.../fm5-tree-crud-settled-dark.png` |
| 默认 800×900  | `tree-crud-default-800x900-light.png`                                                                                                       | `...-dark.png`                                                                   |
| 探针          | `_tmp/fm5-shard3-treecrud.mjs`（首行 8 单元格 computed 对比度）                                                                             | 同左                                                                             |

## 2. A–H 判定（简）

- A 交互：pass（树焦点环可见——总公司节点 focus ring；A1-01 选中/hover 同色维持登记）｜ **B 颜色：pass——dark 表体 settled 实测 17.08:1**（矩阵帧暗字为行淡入动画中间态，非稳态）；light 20.01:1 ｜ **C 布局：carried——R2-1a-C4-02（窄视口右表区压窄）维持**：800px 下右表仅见 checkbox/ID/姓名 列、余列横滚外，量级与 R2 相当 ｜ D 间隔：pass（分页条与表格底间隔 ≥8px 落栅，D6 锚点达标）｜ E 排布：pass

## 3. 发现

- 矩阵 dark 帧表体暗字初判疑似 dark 回归，经 settled 探针+重截图证伪：表格行带淡入动画，采集命中低透明度帧。**误报排除**，同时登记为矩阵采集口径注意事项（与 pivot/three-canvas/scada-pressure 同批）。

## 4. 结论

**verdict: pass（回归面；C4-02 维持，dark 不可读疑似项证伪）**。
