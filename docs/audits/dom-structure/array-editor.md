# dom-structure: array-editor

> Package: flux-renderers-form-advanced | Source: src/array-editor.tsx:88-95,531-535 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-array-editor" data-slot="array-editor-control">`；行链 `<div data-slot="array-editor-row">`（W3 补）→ `<div data-slot="array-editor-row-body">`（W3 补，data-child-field-* 状态）→ Input/FieldHint；array-editor-move-up/-down/-remove/-max-items slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass（fix landed） | 行链两层补 slot（grid 布局 + 子域状态职责） |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Actions

- [x] array-editor-row / array-editor-row-body 补 slot

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（wrapped array-editor: frame root + row slots）
