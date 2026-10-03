# dom-structure: slider

> Package: flux-renderers-form | Source: src/slider-renderer.tsx:41 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-slider-field">`（slider-value slot；thumb 走 ui slider-thumb slot）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 根 class \`nop-slider-field\` 与 nop-<type> 后缀不一致——D1 class 命名 exempt（checklist 字段族 class 口径：类型锚由 data-renderer 承担） |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 slider 测试覆盖
