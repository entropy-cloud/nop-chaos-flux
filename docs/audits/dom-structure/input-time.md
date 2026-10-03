# dom-structure: input-time

> Package: flux-renderers-form | Source: src/input-time-renderer.tsx:184-253 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-input-time">`（steppers 变体带 data-steppers/-disabled；普通变体包 input[type=time]）；StepperButton 走冻结 testid（hour-up 等）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | 双形态根 |
| D3 包装付租 | pass | |
| D4 区域 slot | exempt | 同日期族口径（冻结 testid 锚覆盖） |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 input-time 测试覆盖
