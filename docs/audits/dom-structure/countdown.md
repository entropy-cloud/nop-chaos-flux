# dom-structure: countdown

> Package: flux-renderers-mobile | Source: src/countdown.tsx:215-231 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-534-dom-structure-mobile-plan.md

## 结构图（根 → 首个内容）

- root `<span class="nop-countdown" data-renderer="countdown" data-testid data-cid>`（countdown-prefix/-value/-suffix slot；缺 time/targetTime 时可见 fallback data-missing-config :215-227）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | span 单元素 |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/dom-structure-contract.test.tsx`（countdown root + value slot）
