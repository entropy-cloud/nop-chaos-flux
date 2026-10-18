# [card] page:performance-table

- **批次**: FM-5 shard3（B 组存量抽样）｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/performance-table`（domain 路由）｜ **载体**: performance fixture 页
- **矩阵裁剪**: simplified（抽样口径；表格本体在折下，密度档项以 R2 登记为准）

## 1. 截图清单

| 状态          | light                                          | dark           |
| ------------- | ---------------------------------------------- | -------------- |
| 默认 1280×800 | `performance-table-default-1280x800-light.png` | `...-dark.png` |
| 默认 800×900  | `performance-table-default-800x900-light.png`  | `...-dark.png` |

## 2. A–H 判定（简）

- A 交互：pass（scenario pills / Run 按钮正常）｜ B 颜色：pass（指标卡数值双主题可读；B5-01 secondary 徽章档未在视口出现，维持登记）｜ **C 布局：carried——R2-1c-C1-01（P2 页面 min-content 1333px、1280 视口右缘裁切）维持**：简介段落「through/compar…」及 Live Render Metrics 面板右缘越界裁切，双主题同现，量级与 R2 相当 ｜ D 间隔：pass（视口内）｜ E 排布：pass

## 3. 发现

无新增回归。C1-01 维持；watch-pool R2-1c-D3-01（583px 行高 fixture 设计）维持。

## 4. 结论

**verdict: pass（基线维持；C1-01/D3-01 维持）**。
