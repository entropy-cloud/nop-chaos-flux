# dom-structure: input-color

> Package: flux-renderers-form | Source: src/input-color-renderer.tsx:43 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-input-color" data-invalid>`（ui ColorPicker slot=color-picker）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | ui color-picker |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 input-color 测试覆盖
