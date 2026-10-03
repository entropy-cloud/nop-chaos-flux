# dom-structure: stat-tile

> Package: flux-renderers-data | Source: src/stat-tile-renderer.tsx:167-219 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-531-dom-structure-data-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-stat-tile" data-slot="stat-tile-root" data-renderer="stat-tile" data-testid data-cid>`（stat-tile-label/-prefix/-value/-suffix/-delta/-sparkline slot；内联 svg aria-hidden）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | 装饰 svg aria-hidden ✓ |

## Proof

- 登记卡；行为由既有 stat-tile 测试覆盖
