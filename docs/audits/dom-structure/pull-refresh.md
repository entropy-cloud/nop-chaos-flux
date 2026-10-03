# dom-structure: pull-refresh

> Package: flux-renderers-mobile | Source: src/pull-refresh.tsx:244（根）/ :281/:300（indicator/body） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-534-dom-structure-mobile-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-pull-refresh" data-renderer="pull-refresh" data-testid data-cid data-status data-direction>`（pull-refresh-indicator[aria-live]/-body slot；touchAction pan-x + overscroll contain 手势层为根自身属性）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 指示器/体两层带 slot |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | indicator aria-live |

## Proof

- `src/dom-structure-contract.test.tsx`（pull-refresh root + indicator/body slots）
