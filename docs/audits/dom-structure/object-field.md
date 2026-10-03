# dom-structure: object-field

> Package: flux-renderers-form-advanced | Source: src/object-field.tsx:486-509 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-object-field">`（object-field-body slot；外层 4 个 Provider 为不可见逻辑层）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | Provider 为不可见逻辑边界，无 DOM 层 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

- 备注：def 缺 frameRootTag（用 FieldFrame 默认 label 帧），行为既定登记不回改

## Proof

- 登记卡；行为由既有 object-field 测试覆盖
