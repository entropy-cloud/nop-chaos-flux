# dom-structure: radio-group

> Package: flux-renderers-form | Source: src/renderers/input.tsx:588-609（definition frameWrap:'group' :609） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- FieldFrame group 帧：可见根 \`<fieldset><legend>\`.nop-field（三件套）；控件输出根 \`<div class="nop-radio-group nop-radio-group-wrapper" data-slot="radio-group-wrapper" data-mobile-stack>\`（-loading/-options/-item/-item-label/-error slot）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | group 帧根三件套 |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（wrapped radio-group group frame）
