# dom-structure: progress

> Package: flux-renderers-content | Source: src/progress.tsx:50 + ui/progress.tsx:9-19 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-533-dom-structure-content-plan.md

## 结构图（根 → 首个内容）

- root = ProgressPrimitive.Root（ui 透传 testid/cid + data-renderer stamp）→ 根内 progress-label/-value slot 直接子节点；ui 内部 progress-track/indicator slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 progress 测试覆盖
