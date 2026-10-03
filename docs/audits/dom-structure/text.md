# dom-structure: text

> Package: flux-renderers-basic | Source: src/text.tsx:141-156 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-528-dom-structure-basic-plan.md

## 结构图（根 → 首个内容）

- root `<span class="nop-text" data-renderer data-testid data-cid>`（tag 可配）— leaf 直出；条件内联 affordance（text-copy-button/text-maxline-toggle）带 slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | leaf 单元素 |
| D3 包装付租 | pass | 0 层 |
| D4 区域 slot | pass | 条件 affordance 带 slot |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（text root anchor triple）
