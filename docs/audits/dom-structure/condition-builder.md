# dom-structure: condition-builder

> Package: flux-renderers-form-advanced | Source: src/condition-builder/condition-builder.tsx:382-479 + condition-group.tsx:357-370 + condition-item.tsx:129 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-condition-builder">`（无根 slot；condition-group/-if-formula/-if-input、condition-item 语义 slot 在内层）；group 外框 chrome（:368/:370）无 slot；picker 模式 Popover portal

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | exempt | group 外框为布局 chrome，语义锚由 condition-group/condition-item 覆盖（卡面登记，不回改） |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 condition-builder 测试覆盖
