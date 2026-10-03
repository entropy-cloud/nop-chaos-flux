# dom-structure: combo

> Package: flux-renderers-form-advanced | Source: src/combo-renderer.tsx:458-505 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道（wrap:true）：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-combo flex flex-col gap-2">`（combo-empty/-item/-item-body/-item-actions/-add/-max-items slot）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 帧根三件套（wrap:true 跳过内层 stamp） |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 无多余层 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（同族 wrapped 通道断言）
