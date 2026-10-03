# dom-structure: input-tree

> Package: flux-renderers-form-advanced | Source: src/tree-controls.tsx:147-215 + tree-option-list.tsx | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-input-tree" data-slot="input-tree-control">`（input-tree-options/-clear-row/-clear/-source-error/-source-loading；TreeOptionList：tree-option-list/-search-row/-search/-items/-node/-group/-lazy-error/-lazy-retry/-virtual-*/-empty slot）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 input-tree 测试覆盖
