# dom-structure: fieldset

> Package: flux-renderers-form | Source: src/fieldset.tsx:69-76 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- root `<fieldset class="nop-fieldset" data-renderer="fieldset" data-testid data-cid data-collapsible/-collapsed>` — 职责: 多区域分组
  - fieldset-title(legend)/fieldset-collapse-icon/fieldset-body（CollapsibleContent id=`${cid}-body`）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | ensure stamp |
| D2 根自然性 | pass | fieldset 语义元素 |
| D3 包装付租 | pass | Collapsible 层承担折叠交互职责，body 带 slot |
| D4 区域 slot | pass | title/icon/body |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（fieldset owner root）
