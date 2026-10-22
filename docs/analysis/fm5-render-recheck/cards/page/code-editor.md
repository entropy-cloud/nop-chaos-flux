# [card] page:code-editor

- **批次**: FM-5 shard3（B 组存量抽样）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/code-editor`（domain 路由）｜ **载体**: domain demo 页
- **矩阵裁剪**: simplified（抽样口径；全屏弹层态不在本轮矩阵）

## 1. 截图清单

| 状态          | light                                    | dark           |
| ------------- | ---------------------------------------- | -------------- |
| 默认 1280×800 | `code-editor-default-1280x800-light.png` | `...-dark.png` |
| 默认 800×900  | `code-editor-default-800x900-light.png`  | `...-dark.png` |

## 2. A–H 判定（简）

- A 交互：pass（默认态）｜ **B 颜色：pass——R2-1d-B5-51（P1 dark 宿主编辑器保持 light、代码不可读）修复确认**：dark 帧编辑器 chrome/行号槽随 data-mode 翻转，语法高亮文本亮字可读 ｜ C 布局：pass ｜ D 间隔：pass ｜ E 排布：pass ｜ H：A7-51（全屏弹层语义）维持登记、本轮未复核

## 3. 发现

无新增回归。B5-51 修复确认（plan 500 deferred 面已落地）；A7-51/C3-51/D8-51/A9-51 维持登记，本轮矩阵未覆盖其状态。

## 4. 结论

**verdict: pass（基线维持 + B5-51 改善）**。
