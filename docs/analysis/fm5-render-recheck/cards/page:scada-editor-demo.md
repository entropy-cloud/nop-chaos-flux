# [card] page:scada-editor-demo

- **批次**: FM-5 shard3（A 组改版页回归复检）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/scada-editor-demo`（domain 路由）｜ **载体**: 设计器 demo 页
- **矩阵裁剪**: simplified（复检口径；G7 inspector 键入链路为交互级，本轮静态面可判）

## 1. 截图清单

| 状态                 | light                                              | dark           |
| -------------------- | -------------------------------------------------- | -------------- |
| 默认 1280×800        | `scada-editor-demo-default-1280x800-light.png`     | `...-dark.png` |
| 默认 800×900         | `scada-editor-demo-default-800x900-light.png`      | `...-dark.png` |
| interaction 1280×800 | `scada-editor-demo-interaction-1280x800-light.png` | `...-dark.png` |

## 2. A–H 判定（简）

- A 交互：pass（默认态；A9-01 Save 零反馈维持登记，未恶化）｜ B 颜色：pass（双主题编辑器 chrome 一致，画布白底为纸面语义）｜ C 布局：carried——**R2-1b-C4-02（800 视口横溢 ~298px）维持**：窄视口下工具栏右侧按钮与右侧面板越界、依赖 body 横滚，量级与 R2 相当 ｜ D 间隔：pass ｜ E 排布：pass ｜ G 设计器：G1 选中态/画布结构默认态正常；G7-01（inspector 数值错提交 P1）为交互链路，本轮矩阵不可复核（覆盖缺口登记）

## 3. 发现

无新增回归。G7-01 未复核（需脚本化键入序列，超出本轮矩阵口径）；C4-02/A9-01 维持。

## 4. 结论

**verdict: pass（回归面；C4-02 维持，G7-01 登记覆盖缺口）**。
