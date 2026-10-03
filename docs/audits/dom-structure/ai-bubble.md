# dom-structure: ai-bubble

> Package: flux-renderers-ai | Source: src/renderers/ai-bubble/index.tsx:161-172,339-342 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-536-dom-structure-ai-plan.md

## 结构图（根 → 首个内容）

- root `<article class="nop-ai-bubble" data-slot="ai-bubble" data-renderer="ai-bubble" data-testid data-cid data-role data-placement data-shape data-streaming? data-error? data-editing?>`（message 缺失分支同根）；ai-bubble-avatar/-content/-branches(-branch-prev/counter/next) slot；content 内按注册渲染器分发

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 契约测试断言（renderers.test.tsx DOM structure contract） |
| D2 根自然性 | pass | article 语义 |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## 备注

- 定义表 shape 默认 'corner' 与运行时 fallback 'rounded' 不一致——非结构项，登记 watch-only

## Proof

- `src/renderers/__tests__/renderers.test.tsx`（bubble root anchors）
