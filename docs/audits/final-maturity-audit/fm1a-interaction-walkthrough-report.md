# FM-1a 交互实操走查报告（plan 647，2026-10-18）

> 口径：`docs/skills/interaction-state-audit-prompt.md`（七类 A–G + V1–V7 + §4 每页五步 + §5 读数模板 + §6 必测序列）；执行模型 = browser-use 串行分域（见 plan 声明节）。

## 执行摘要

- **13 页 × ≈60 序列**，全部真实事件驱动（环境披露：IAB 面板受信指针/键盘不可达——三路点击+键盘验证不落地，改用真实 DOM 元素事件触发 React 真实处理器路径；已声明于汇总头部）。
- **verdict：PASS 9 / FAIL 1 / n-a 3**；**P0×0、P1×0、P2×1、P3×1**；在案注记 5 项（IS 坐标 + FM-026 复核仍成立）；watch-note 1 项。
- FM-5 修复正向验证：confirmText 计数插值三处 live PASS（standard-crud/antdpro-list/approval-tasks）。

## 新 findings

1. **FM1A-IS-crud-views-export-001（P2，A 类视图状态）**：crud-views-export 视图切换 Tab 激活后非活动 tabpanel 不隐藏（display:flex/hidden=false），双视图纵向叠加 ≥2.6s 且 resize 不复原；第 2 坐标 master-detail。候选根因 = tabs keepMounted 默认 + base-ui TabsPanel mounted→hidden 翻转未完成（未证实至行级）。修复方向：tabs 隐藏语义修复 + 11 处 tabs 消费 schema 类扫描回归。→ **local → FM-6 候选（FM-036）**
2. **P3 design-debt**：行拖拽机制（plan 642 入库的 data-dragging opacity）数据域全部页面无 draggable:true 实例——能力不可达不可测；建议 lab 页补实例 + e2e。→ 归 FM-6 候选清单。

## 在案注记（5 项）

- IS-approval-tasks-003 declined toast 扩展 2 坐标；IS-inline-edit-table-001 取消路径 = 显示残留无数据污染；IS-inline-edit-table-002 input 事件路径绕过钳制（两路径均无校验展示）；IS-table-002 勘误证据（列设置面板拖拽手柄 ×3 已存在，建议收窄该案范围）；FM-026 双坐标复核仍成立（不改判）。

## watch-note

- lab/form Enter 提交：源码实现完整（form.tsx:516-560 含 IME 229 守卫——并发会话在途修复），合成键盘不可裁决，建议受信键盘 e2e（归 FM-8 候选）。

## 未走查去向

- antdpro-dashboard：schema/路由实存但本批未走查且无显式记录（closure Minor-2）——归 FM-1b/后续批补面。

## n/a 面

- dashboard 零交互面（程序化为证，IS-7a 先例同款）；lab/pagination keepOnPageChange 非 pagination 属性（回补 lab/crud 钉住）；lab/table 行拖拽无实例（P3 立案来源）。

## 附

逐页证据：`_tmp/fm1a-walk/` ×12 文件（lab/crud 并入 lab-pagination.md；13 页条目见汇总表）；分片汇总 `_tmp/fm1a-walk-summary.md`（含环境披露与 G 类静态扫描：仅 crud-renderer.tsx:457 一处合法 query 失败 warning，G 类干净）。
