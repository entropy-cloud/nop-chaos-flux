# dom-structure: grid

> Package: flux-renderers-layout | Source: src/grid-renderer.tsx:113-122（契约 :240-245） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-532-dom-structure-layout-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-grid" data-slot="grid-root" data-renderer="grid" data-testid data-cid>`（inline style 承载 grid 模板）；每 item `<div data-slot="grid-item">` 包 region 内容

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | grid-item 层带 slot（定位/模板职责） |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 grid 测试覆盖
