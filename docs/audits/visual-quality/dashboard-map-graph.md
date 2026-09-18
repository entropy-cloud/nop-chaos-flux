# 视觉质量证据卡：Dashboard/Map/Graph（V11b）

> 状态: seeded
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §7.5（已经三轮独立核实）
> Owner plan: —
> Owner docs: `docs/components/{dashboard-filter,dashboard-editor,map,graph}/design.md`

## Findings 清单

- [V11b-F1] dashboard `canvasWidth=1200` 解硬编码（08-11 followups 登记项）+ 画布无方向键移动
  - 证据: 普查 §7.5、`docs/backlog/audit-followups-2026-08-11-1929.md`
  - 裁决: pending
  - 状态: open
- [V11b-F2] map 无 heatmap/轨迹/围栏 schema 通道——裁决
  - 证据: 普查 §7.5
  - 裁决: pending
  - 状态: open
- [V11b-F3] graph 无数据驱动着色 schema 字段（G-K）——裁决（落地进 plan，否决进 Deferred But Adjudicated）
  - 证据: 普查 §7.5、`docs/analysis/ui-review/D2-closure.md`
  - 裁决: pending
  - 状态: open
- [V11b-F4] 三域 e2e 视觉断言缺失（pivot-table-demo 等零计算样式断言）
  - 证据: V0 研究报告 §2
  - 裁决: pending
  - 状态: open

## 视觉证据

待 V11b plan 落地：canvasWidth 几何（L2）、着色 schema（L3/L4）。

## Closure

（V11b closure audit 后回写）
