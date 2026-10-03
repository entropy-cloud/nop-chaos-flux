# dom-structure: ai-sender

> Package: flux-renderers-ai | Source: src/renderers/ai-sender.tsx:134-226 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-536-dom-structure-ai-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-ai-sender" data-slot="ai-sender" data-renderer="ai-sender" data-testid data-cid data-extension?>`（extension/Textarea 双分支同根）；ai-sender-input/-count(aria-live)/-actions/-cancel/-submit slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/renderers/__tests__/renderers.test.tsx`（DOM structure contract: sender 根）
