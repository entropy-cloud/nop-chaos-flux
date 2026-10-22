# [card] page:word-editor

- **批次**: FM-5 shard3（B 组存量抽样）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/word-editor`（domain 路由）｜ **载体**: 设计器 demo 页
- **矩阵裁剪**: simplified（抽样口径；undo 粒度 / 800 视口大纲可达性不在本轮矩阵）

## 1. 截图清单

| 状态                 | light                                        | dark           |
| -------------------- | -------------------------------------------- | -------------- |
| 默认 1280×800        | `word-editor-default-1280x800-light.png`     | `...-dark.png` |
| 默认 800×900         | `word-editor-default-800x900-light.png`      | `...-dark.png` |
| interaction 1280×800 | `word-editor-interaction-1280x800-light.png` | `...-dark.png` |

## 2. A–H 判定（简）

- A 交互：pass（ribbon 工具组/字数状态/页眉 tab 正常）｜ B 颜色：pass——**dark 宿主下纸面恒白为 V8a 已裁决豁免**（文档类纸面语义），周边 chrome dark 化正常、正文可读 ｜ **C 布局：pass——R2-1b-C1-01（P2 右大纲面板 1280 被裁 222px / 800 不可达）1280 面改善确认**：大纲面板完整可见（产品发布计划→发布范围/里程碑/风险与预案 三级）｜ D 间隔：pass ｜ G：G6-157（undo 逐字符粒度）交互级未复核（覆盖缺口登记）

## 3. 发现

无新增回归。C1-01 在 1280 视口改善（大纲可达）；800 视口下的面板可达性本轮未复测（登记轻量缺口）；watch R2-2c-G6-157 维持。

## 4. 结论

**verdict: pass（基线维持；C1-01 1280 面改善）**。
