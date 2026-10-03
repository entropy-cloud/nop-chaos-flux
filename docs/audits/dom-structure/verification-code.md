# dom-structure: verification-code

> Package: flux-renderers-form | Source: src/verification-code-renderer.tsx:74-79 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- FieldFrame 通道：可见根 `.nop-field`（三件套）；控件输出根 `<div class="nop-verification-code-field" data-invalid>`（ui InputOTP slot=input-otp；slot 级 testid=verification-code-slot-<i>；InputOTP 带 data-testid+data-masked）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | \`nop-verification-code-field\` class 后缀 D1 exempt（checklist 字段族 class 口径） |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | ui input-otp + slot 级 testid |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 verification-code 测试覆盖
