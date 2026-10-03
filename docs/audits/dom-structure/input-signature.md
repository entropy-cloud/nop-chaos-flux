# dom-structure: input-signature

> Package: flux-renderers-form | Source: src/signature-renderer.tsx:289-295 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-input-signature-field" data-invalid data-unsupported>`（signature-canvas-wrap/-canvas/-keyboard-hint/-unsupported/-readonly-overlay/-focus-hint/-toolbar/-undo/-clear 全套 slot）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | \`nop-input-signature-field\` class 后缀 D1 exempt（checklist 字段族 class 口径） |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 signature 测试覆盖
