# dom-structure: picker

> Package: flux-renderers-form-advanced | Source: src/picker/picker-renderer.tsx:495-574 + picker-dropdown.tsx | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-picker">`（embed 变体 nop-picker-embed；picker-trigger/-selected-label/-clear/-tags/-tag/-tag-remove/-tag-overflow slot）；PickerDropdown portal 三态（picker-confirm/-drawer-content/-popover-content/-dialog-content slot）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | portal 为边界职责 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 picker 测试覆盖
