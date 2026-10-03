# dom-structure: user-select

> Package: flux-renderers-form | Source: src/org/org-select-control.tsx:94-100（注册 org/org-renderer-definitions.ts） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套，data-renderer=user-select 为与 department-select 共根时的唯一类型区分锚）；控件输出根 `<div class="nop-org-select-field" data-invalid data-multiple>`
- OrgSelectPanel portal：org-select-trigger/-value-area/-chip/-value/-clear/-panel(Portal)/-search/-breadcrumb/-list/-node/-node-check/-node-name/-node-loading/-expand/-error/-retry/-loading/-load-more/-empty/-done 全套 slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 共根 class \`nop-org-select-field\` D1 class 命名 exempt（checklist 字段族 class 口径）；类型区分由帧根 data-renderer 承担 |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | 全套 org-select-* |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 org-select 测试覆盖
