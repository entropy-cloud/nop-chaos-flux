# dom-structure: result

> Package: flux-renderers-content | Source: src/result.tsx:54-81 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-533-dom-structure-content-plan.md

## 结构图（根 → 首个内容）

- root `<section class="nop-result" data-slot="result" data-renderer="result" data-testid data-cid>`（纯手写非 ui primitive；result-status-sr(sr-only)/-icon/-title/-description/-actions slot；未知 status 降级 info + dev warn）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | section 语义 |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | sr-only 状态词 |

## Proof

- 登记卡；行为由既有 result 测试覆盖
