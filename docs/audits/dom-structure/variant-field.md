# dom-structure: variant-field

> Package: flux-renderers-form-advanced | Source: src/variant-field/variant-field.tsx:101-150 + variant-field-view.tsx:193-245 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md

## 结构图（根 → 首个内容）

- 自管 FieldFrame（def 无 wrap 键）：可见根 = 组件内显式嵌入的 FieldFrame（rootTag div，:222-245），W3 补 `renderer={rendererType}` 后三件套齐全；'none' 模式输出根 `<div class="nop-variant-field" data-slot="variant-field-body">`（data-active-variant/data-frame-wrap，testid/cid）；variant-field-selector/-readonly-body slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass（fix landed） | 自管 FieldFrame 此前缺 renderer → data-renderer null；W3 补 rendererType 贯通（契约测试断言） |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 显式嵌 FieldFrame 走 node-frame-wrapper 契约通道（frameWrapMode 分支），双模式均有锚 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | 显式嵌入即契约通道本身，非自绘替代 |
| D6 canvas a11y | n-a | |

## Actions

- [x] variant-field-view FieldFrame 补 `renderer={rendererType}`（prop 从 variant-field.tsx 贯通）

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（wrapped variant-field: frame root carries anchors）
