# dom-structure: detail-field

> Package: flux-renderers-form-advanced | Source: src/detail-view/detail-field.tsx:331-383（frameRootTag :419-420） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道（wrap:true）：可见根 `.nop-field`（三件套）；组件输出为 fragment：`<div class="nop-detail-field">`（detail-field-viewer slot）+ DetailSurface portal（bodySlot 动态 data-slot：detail-field-surface-body/-draft-body/-draft-error）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 帧根三件套 |
| D2 根自然性 | pass | fragment 输出 + 帧根 |
| D3 包装付租 | pass | portal bodySlot 动态 slot |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 detail-view 族测试覆盖
