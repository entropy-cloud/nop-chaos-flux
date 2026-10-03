# dom-structure: select

> Package: flux-renderers-form | Source: src/renderers/input-choice-renderers.tsx:313-320 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-select-wrapper" data-slot="select-wrapper" data-testid data-cid>`（全包唯一手写 cid 的控件根，保留单点）
- combobox 列表 portal 到 body：ui combobox-* slot（契约测试 :308-318 冻结）；select-loading/-error slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 帧根三件套；wrapper 自带 cid 与帧根 cid 并存属既有冻结契约（data-cid 双点为 select 既有行为，非 W2 引入） |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | wrapper 带 slot |
| D4 区域 slot | pass | combobox-*/select-mobile-* 全覆盖 |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（wrapped select）
