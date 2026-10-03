# dom-structure: chart

> Package: flux-renderers-data | Source: src/chart-renderer.tsx:617-683 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-531-dom-structure-data-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-chart" data-renderer="chart" data-testid data-cid>` — 职责: 多区域分组（chart-title/-empty/-canvas/-data-equivalent(sr-only)/-loading slot）
  - `<div data-slot="chart-canvas" role="img" tabIndex=0 aria-label/labelledby>`（引擎挂载点：recharts SVG 于 ui ChartContainer 内）— canvas 归属明确

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | chart-canvas 为引擎挂载点职责 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | pass | role=img + 可访问名 + 键盘 + sr-only 数据摘要（超出 D6 最低要求） |

## Proof

- 登记卡；行为由既有 chart 测试覆盖
