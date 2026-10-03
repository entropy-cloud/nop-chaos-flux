# dom-structure: sparkline

> Package: flux-renderers-data | Source: src/sparkline-renderer.tsx:70-86 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-531-dom-structure-data-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-sparkline" data-slot="sparkline-root" data-renderer="sparkline" data-testid data-cid>`（内层 svg sparkline-canvas/sparkline-empty slot，装饰性 aria-hidden）；W2 盘点的"div 包 svg"复核裁定：根承担 slot+状态属性+身份锚，非冗余

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 根即壳 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | 装饰 svg aria-hidden ✓ |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（sparkline root anchors）
