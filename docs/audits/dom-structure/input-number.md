# dom-structure: input-number

> Package: flux-renderers-form | Source: src/input-number-renderer.tsx:234-237（契约冻结 :476-488） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套，实例锚唯一落点）；控件输出根 `<div class="nop-input-number">`（prefix/suffix/stepper/-increase/-decrease 条件 slot）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 帧根三件套；marker 无 data-testid/data-cid 为冻结契约（类型级标记不作实例选择器，防同名多实例串扰） |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 条件层带 slot |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（marker uniqueness 语义）；既有 input-number 契约测试（:476-488）
