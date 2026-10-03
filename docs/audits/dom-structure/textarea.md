# dom-structure: textarea

> Package: flux-renderers-form | Source: src/textarea-renderer.tsx:127-177 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<textarea data-slot="textarea" class="nop-textarea">`（无 footer）或 `<div data-slot="textarea-wrapper" class="nop-textarea-wrapper">`（clearable/counter 时，textarea-footer/-clear/-counter slot）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | 双形态根均为宿主/带 slot 容器 |
| D3 包装付租 | pass | wrapper 带 slot |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 textarea 测试覆盖
