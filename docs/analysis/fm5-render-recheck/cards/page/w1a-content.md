# [card] page:w1a-content

- **批次**: FM-5 shard3（B 组存量抽样）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/w1a-content`（domain 路由）｜ **载体**: W1a 组件族 demo 页
- **矩阵裁剪**: simplified（抽样口径）

## 1. 截图清单

| 状态          | light                                    | dark           |
| ------------- | ---------------------------------------- | -------------- |
| 默认 1280×800 | `w1a-content-default-1280x800-light.png` | `...-dark.png` |
| 默认 800×900  | `w1a-content-default-800x900-light.png`  | `...-dark.png` |

## 2. A–H 判定（简）

- A 交互：pass ｜ **B 颜色：carried——R2-1d-B5-20（dark 下 json-view 整块白底）维持**：dark 帧 json 查看器仍白底黑字（react-json-view-lite 硬编码），无恶化；B1-23（missing image 错误 pill 对比）维持 ｜ **C 布局：carried——R2-1d-C1-21（markdown GFM 表格零样式塌缩为「ab/12」裸文本）维持** ｜ D 间隔：pass ｜ **E 排布：carried——R2-1d-A1-22（link 无链接可供性，「View detail」同正文色）维持**

## 3. 发现

无新增回归。四项 R2 登记项（B5-20/C1-21/A1-22/B1-23）全部原样维持，无恶化。

## 4. 结论

**verdict: pass（基线维持）**。
