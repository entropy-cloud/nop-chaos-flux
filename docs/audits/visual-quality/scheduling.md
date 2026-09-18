# 视觉质量证据卡：Scheduling 族（V11a）

> 状态: seeded
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §7.5（已经三轮独立核实，含 Round 2 kanban 二次反转勘误）
> Owner plan: —
> Owner docs: `docs/components/roadmap-scheduling.md`、`docs/components/{gantt,kanban,calendar}/design.md`

## Findings 清单

- [V11a-F1] gantt 无关键路径高亮（grep `critical` 零命中）——落地或显式裁决
  - 证据: 普查 §7.5
  - 裁决: pending
  - 状态: open
- [V11a-F2] calendar 月视图为资源时间轴非 6 周网格，无密度视图——裁决
  - 证据: 普查 §7.5
  - 裁决: pending
  - 状态: open
- [V11a-F3] kanban 拖拽悬停高亮：**链路已接通，非 confirmed defect**（勘误终审口径）——发射端 `use-kanban-board-effects.ts:135-136` drag-over 时 set/remove `data-drop-target`、`calendar.tsx:369/380` 同法，CSS 消费 `kanban.css:144` 在。仅核对实际视觉/dark 表现，核对发现问题才立项修复，否则显式 adjudicated 为 watch-only
  - 证据: 普查 §7.5 勘误、路线图 Round 2/3 审查记录
  - 裁决: pending（核对型）
  - 状态: open
- [V11a-F4] gantt 任务条选中硬编码 `bg-blue-50`
  - 证据: 普查 §7.5
  - 裁决: pending
  - 状态: open
- [V11a-F5] scheduling e2e 视觉断言缺失：calendar-demo/kanban-perf 等零计算样式断言
  - 证据: V0 研究报告 §2
  - 裁决: pending
  - 状态: open

## 视觉证据

待 V11a plan 落地：任务条选中态、拖拽高亮、dark（L3）。

## Closure

（V11a closure audit 后回写）
