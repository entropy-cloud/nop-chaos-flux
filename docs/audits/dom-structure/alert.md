# dom-structure: alert

> Package: flux-renderers-content | Source: src/alert-renderer.tsx:81-116 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-533-dom-structure-content-plan.md

## 结构图（根 → 首个内容）

- root = ui Alert div（透传三件套 + stamp；alert-title/-description/-actions + AlertAction slot）
- 备注（Non-Blocking Follow-up 登记）：close 按钮 testid 硬编码 "alert-close"（:116），非 `${testid}-close` 派生——testid 契约项非结构项

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 alert 测试覆盖
