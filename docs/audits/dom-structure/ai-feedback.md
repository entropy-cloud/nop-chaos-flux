# dom-structure: ai-feedback

> Package: flux-renderers-ai | Source: src/renderers/ai-feedback.tsx:164-235 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-536-dom-structure-ai-plan.md

## 结构图（根 → 首个内容）

- root 携带 data-slot="ai-feedback" + data-testid + data-cid（stamp + 手写双确认）；内部区域 slot 全覆盖（详见盘点事实表：ai-test-support harness 与各既有测试）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 琐碎行内布局层（icon+label 行等）登记不回改；根即壳无多余包装 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | 交互语义（role=group/list/region、aria-pressed/label）按组件各具 |

## Proof

- 登记卡；marker/锚点由既有组件测试覆盖（ai-token-usage/ai-suggestions 另有契约测试断言）
