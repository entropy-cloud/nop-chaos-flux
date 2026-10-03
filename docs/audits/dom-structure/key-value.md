# dom-structure: key-value

> Package: flux-renderers-form-advanced | Source: src/key-value.tsx:387-390 + key-value-row.tsx:69-76 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-key-value grid gap-3">`；行链 `<div data-slot="key-value-row">`（W3 补）→ `<div data-slot="key-value-row-body">`（W3 补，data-child-field-*）→ key/value Input；key-value-move-up/-down slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 帧根三件套（曾为唯一"根三无且 wrap:true"组件，锚由帧根承担） |
| D2 根自然性 | pass | |
| D3 包装付租 | pass（fix landed） | 行链两层补 slot（与 array-editor 同模式） |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Actions

- [x] key-value-row / key-value-row-body 补 slot

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（wrapped key-value: frame root + row slots）
