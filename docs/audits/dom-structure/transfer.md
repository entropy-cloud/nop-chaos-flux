# dom-structure: transfer

> Package: flux-renderers-form-advanced | Source: src/transfer.tsx:292-614 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-transfer grid">`（transfer-pane-candidate/-selected/-toggle-all/-clear-all/-option-*/-actions/-select/-deselect slot）；TransferPane 内 4 层布局 div（pane 头/搜索/滚动/ul）无自定义 slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | exempt | pane 内布局分组层的功能锚由 transfer-pane-*/-option-* 覆盖；不回改避免扰动既有样式选择器（卡面登记） |
| D4 区域 slot | pass | 双 pane/操作/选项全覆盖 |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 transfer 测试覆盖
