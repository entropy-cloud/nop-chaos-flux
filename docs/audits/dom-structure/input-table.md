# dom-structure: input-table

> Package: flux-renderers-form-advanced | Source: src/input-table.tsx:340-426 + input-table-row.tsx | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-input-table">`（input-table-scroll/-table/-header/-empty-row/-add/-max-items/-footer slot；行 input-table-row/-row-body/-row-actions slot）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 无无名层 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 input-table 测试覆盖
