# dom-structure: input-email

> Package: flux-renderers-form | Source: src/renderers/input.tsx:376-393 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道（wrap:true）：可见根 `<label class="nop-field" data-field data-renderer="input-email" data-cid>`；控件输出根 `<input data-slot="input" class="nop-input-email">`（无 addon 时）或 `<div class="nop-input-group nop-input-email">`（prefix/suffix/counter/clearable/reveal 时，带 input-group/-addon/-text/-counter slot）；suggest 启用时外裹 Popover（data-slot=input-suggest-list/-item/-empty）
- 实例锚单点：控件输出根不重复携带 data-renderer/data-cid（input-number.test.tsx 契约）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | FieldFrame 帧根三件套（wrap:true 跳过内层 stamp） |
| D2 根自然性 | pass | 输入类控件输出即交互元素 |
| D3 包装付租 | pass | input-group 层带 slot 承担 addon 分组；suggest 层为 portal 边界 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（wrapped input-text: frame root full anchors + control root clean + name-control id hook）
