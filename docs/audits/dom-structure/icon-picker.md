# dom-structure: icon-picker

> Package: flux-renderers-form-advanced | Source: src/icon-picker.tsx:189-297 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-icon-picker">`（icon-picker-trigger/-clear slot，根带 testid/cid）；Popover portal 分区（:220/:238）无自定义 slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | Popover 为 portal 边界职责 |
| D4 区域 slot | exempt | trigger/clear 已锚；popover 内分区为小型选择器内部结构，不回改 |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 icon-picker 测试覆盖
