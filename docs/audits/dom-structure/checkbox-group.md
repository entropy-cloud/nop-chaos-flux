# dom-structure: checkbox-group

> Package: flux-renderers-form | Source: src/checkbox-group-renderer.tsx:144-160（definition frameWrap:'group' input.tsx:631） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- FieldFrame group 帧：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-checkbox-group nop-checkbox-group-wrapper" role="group" data-slot="checkbox-group-wrapper">`（-loading/-checkall-item/-checkall/-checkall-label/-item/-item-label/-limit-hint/-error slot）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | group 帧根三件套 |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 checkbox-group 测试覆盖
