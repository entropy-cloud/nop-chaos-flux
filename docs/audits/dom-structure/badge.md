# dom-structure: badge

> Package: flux-renderers-basic | Source: src/basic-renderer-definitions.ts:397 + ui badge.tsx:37-45 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-528-dom-structure-basic-plan.md

## 结构图（根 → 首个内容）

- root `<span class="nop-badge" data-renderer data-testid data-cid>`（ui Badge useRender）— leaf 直出；ui Badge 无 data-slot，身份由 nop-badge 承担

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 0 层 |
| D4 区域 slot | n-a | 单元素（ui Badge 无 slot，无需） |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（badge root anchor triple）
