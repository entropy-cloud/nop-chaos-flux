# [card] page:env-stream

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/env-stream` ｜ **载体**: 域页面（env.stream / env.openSocket 注入演示）
- **矩阵裁剪**: simplified（light/dark × 1280 + 800 + 流式中间态必查：Start/Abort/协议切换全链路；裁掉拖拽/弹层——无此面）

## 1. 截图清单

| 状态                  | light                                                                       | dark                                     |
| --------------------- | --------------------------------------------------------------------------- | ---------------------------------------- |
| 默认 1280×800（空态） | `_tmp/visual-inspection-2026-09-23/r2-1d/env-stream/default-1280-light.png` | `default-1280-dark.png`                  |
| 流式中间态（500ms）   | `streaming-mid-light.png`（按钮 "Streaming…"、Abort 启用、badge=3）         | —                                        |
| 流结束                | `streaming-end-light.png`（5 chunks + "stream completed"）                  | `stream-end-dark.png`（ndjson 3 chunks） |
| 默认 800×900          | `default-800x900-light.png`                                                 | —                                        |

## 2. A–H 勾选

- A: A1✔ A2✔ A3✔（Start/Abort/select 均 ≥24px） **A4✔（Abort 初始 disabled+opacity .5，流中启用——探针 abort-before/abortDisabled）** **A5✔（空态 "No chunks yet." 明示；流中有逐 chunk 列表）** **A9✔（Streaming… 按钮态/badge 计数/完成态文案三段反馈完整）**
- B: B1✔ **B5 warn(B-58 dark 徽标数字不可见)** B4✔
- C: C1✔（1280/800 均无溢出）C4✔
- D: D1✔ E: E1✔（标题+协议说明+计数徽标可答三问）
- F: F1✔
- G n/a ｜ H n/a

## 3. 发现条目

### [R2-1d-B-58] dark 下 chunk 计数徽标数字不可见（P3）

- **页面/路由**: `#/env-stream`（Received chunks 卡右上角计数徽标）
- **主题/视口/状态**: dark / 1280 / 流结束后
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/env-stream/stream-end-dark.png`（徽标为空紫点）
- **目视描述**: light 下徽标数字（如 "5"）清晰；dark 下徽标变纯色紫点，数字与底色融合不可见。
- **程序化证据**: 探针=双主题同元素截图对照（light `streaming-end-light.png` 徽标 "5" 可读；dark `stream-end-dark.png` 徽标无可见字形）；输出=视觉对照坐实。[visual-only 倾向，复核时读徽标 color/badge-bg 两 token]
- **对照基准**: B5 dark 平价 / WCAG 1.4.3。
- **严重程度**: P3（计数仍在 DOM，仅视觉缺失）
- **用户影响**: dark 用户丢失"收到几条"的即时量化反馈。
- **修复方向**: Badge 组件 dark 分支的 badge-foreground 令牌核对（疑似数字色与 badge 底同源）。
- **归族**: local → R2-4 批（若 ui Badge dark 分支共性成立升 R2-4 族条目）
- **复核状态**: 未复核

## 4. 通过项存档（流式链路，波简化矩阵重点）

- SSE：5 JSON token + [DONE] 自动终结，badge 0→3→5，状态行 `response.status=200 — stream completed (5 chunks)`。
- NDJSON：切换协议后重跑 3 chunks（文档承诺一致）——同时证明本页协议 select 切换生效（与 diff-view 死控件形成对照：本页 select 为页面级 React 受控，不经 SchemaRenderer schema 交换路径）。
- Abort：初始禁用、流中启用，视觉 opacity 0.5 可感知。
- 800 视口无溢出。
