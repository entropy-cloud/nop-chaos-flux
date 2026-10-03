# dom-structure: input-file

> Package: flux-renderers-form-advanced | Source: src/upload-field.tsx:510-651（共享）| Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-file" marker nop-input-file data-slot="upload-field-control">`（data-upload-kind/has-value/pending/error/invalid）；`<ul data-slot="upload-field-list">`（W3 补）→ `<li data-slot="upload-field-item">`（W3 补，existing/pending 两分支）；upload-rejection/-item-name/-pending/-cancel/-error slot
- 备注：def 缺 frameRootTag（用 FieldFrame 默认 label 帧），行为既定不回改

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass（fix landed） | ul/li 补 slot（列表/条目结构职责）；序号为 data-testid 动态插值非缺陷 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Actions

- [x] upload-field-list / upload-field-item 补 slot（两个 li 分支）

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（wrapped input-file: frame root + list/item slots）