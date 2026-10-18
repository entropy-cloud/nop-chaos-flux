# [card] page:text-icon-visual-fields

- **批次**: FM-5 shard3（B 组存量抽样）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/text-icon-visual-fields`（domain 路由）｜ **载体**: E3 组件族 demo 页
- **矩阵裁剪**: simplified（抽样口径；copy 点击 toast 为交互态，不在矩阵）

## 1. 截图清单

| 状态          | light                                                | dark           |
| ------------- | ---------------------------------------------------- | -------------- |
| 默认 1280×800 | `text-icon-visual-fields-default-1280x800-light.png` | `...-dark.png` |
| 默认 800×900  | `text-icon-visual-fields-default-800x900-light.png`  | `...-dark.png` |

## 2. A–H 判定（简）

- A 交互：pass（copyable 图标随文渲染；A9-30 toast 反馈为交互态未复核——页面未挂 Toaster 的登记维持）｜ B 颜色：pass（双主题可读）｜ C 布局：pass（maxLine=2/3 截断生效、toggle 区正常）｜ D 间隔：pass ｜ **E 排布：R2-1d-E2-32（tag:h2 经 preflight 重置与正文层级不可辨）维持**：小节标题与正文同貌，无恶化

## 3. 发现

无新增回归。E2-32/A9-30 维持登记。

## 4. 结论

**verdict: pass（基线维持）**。
