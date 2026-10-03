# dom-structure: wizard

> Package: flux-renderers-layout | Source: src/wizard-renderer.tsx:515-527（契约 :25-42） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-532-dom-structure-layout-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-wizard" data-slot="wizard-root" data-renderer="wizard" data-testid data-cid>`；slot 全家桶：wizard-step-nav/-item/-button/-marker/-title/-description、wizard-body-region、wizard-step-body、wizard-empty、wizard-actions、wizard-step-actions-region、wizard-prev/next-button、wizard-committing/-status/-step-error；未激活 step body return null

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 无 wrap → ensure stamp + 手写锚 |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 无无名层 |
| D4 区域 slot | pass | 全包 slot 最多的组件 |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/dom-structure-contract.test.tsx`（wizard root anchors）
