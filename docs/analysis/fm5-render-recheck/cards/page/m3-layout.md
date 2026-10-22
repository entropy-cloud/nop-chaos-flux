# [card] page:m3-layout

- **批次**: FM-5 shard3（B 组存量抽样）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/m3-layout`（domain 路由）｜ **载体**: mobile 骨架 demo 页
- **矩阵裁剪**: simplified（抽样口径；fixed/sticky 视口行为需 <768px 模拟，不在矩阵）

## 1. 截图清单

| 状态          | light                                  | dark           |
| ------------- | -------------------------------------- | -------------- |
| 默认 1280×800 | `m3-layout-default-1280x800-light.png` | `...-dark.png` |
| 默认 800×900  | `m3-layout-default-800x900-light.png`  | `...-dark.png` |

## 2. A–H 判定（简）

- A 交互：pass ｜ B 颜色：pass ｜ **C 布局：carried + 新实例**——§14.2 描述行左端「Nav」被 playground 浮动徽标（第 378）遮挡（shell 层悬浮件压内容，与 R2-1a-C2-01 / R2-1c-C2-01 同族，P3）｜ D 间隔：pass ｜ E 排布：**R2-1d-A5-02（P2 Tabbar icon 不渲染、按钮退化纯文字）维持**：首页/分类仍为纯文字，无恶化

## 3. 发现

- A5-02 维持登记（未修复未恶化）。
- 浮动徽标遮挡实例：shell 层、面积小、滚动可避开——并入既有悬浮件遮挡族（P3，不新立项）。

## 4. 结论

**verdict: pass（基线维持；A5-02 维持，悬浮件遮挡族新实例）**。
