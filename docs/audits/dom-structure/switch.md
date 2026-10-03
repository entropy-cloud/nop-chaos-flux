# dom-structure: switch

> Package: flux-renderers-form | Source: src/renderers/input-choice-renderers.tsx:465-474（checkbox）/ :517-527（switch） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道（label 帧）：可见根 `.nop-field`（三件套）；控件输出根 `<label class="nop-switch nop-switch-wrapper nop-haptic" data-slot="switch-wrapper">`（checkbox/-label slot）
- `${name}-control` id 钩子按冻结契约落在 wrapper 变体（-control-label，契约测试 :131-138）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 帧根三件套 |
| D2 根自然性 | pass | Label 根 = 语义元素（label 包原生控件为可访问性惯例，非冗余包装） |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | wrapper/checkbox(ui)/label |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（wrapped checkbox；既有 -control-label 契约测试）
