# dom-structure: input-datetime

> Package: flux-renderers-form | Source: src/renderers/input-datetime-renderer.tsx + date/date-field-control.tsx:227 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-input-datetime">` → 内层 `<div class="nop-date-control">`
- 浮层 portal：ui PopoverContent 自带 data-slot="popover-content"；触发/显示/清除走冻结 testid（date-trigger/date-display/date-popover/date-clear/-inline）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 帧根三件套 |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | date-control 层+浮层为 portal 边界职责 |
| D4 区域 slot | exempt | 区域锚由冻结 testid 体系 + ui popover-content slot 覆盖；自定义 slot 缺席为命名惯例，不回改（冻结 testid 被下游引用） |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 date 族测试覆盖
