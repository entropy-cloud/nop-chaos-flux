# dom-structure: ai-message-list

> Package: flux-renderers-ai | Source: src/renderers/ai-message-list.tsx:141-174,241,45,63 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-536-dom-structure-ai-plan.md

## 结构图（根 → 首个内容）

- 契约根 `<div class="nop-ai-message-list" data-slot="ai-message-list" role="log" aria-live=polite data-renderer="ai-message-list" data-testid data-cid>`（空态分支同根 + data-empty，不经 wrap）
- wrap 定位层（仅非空态）：`<div data-slot="ai-message-list-wrap" class="relative flex min-h-0 flex-1 flex-col">`——纯定位宿主承载回到底部按钮（ai-scroll-to-bottom slot），无 testid/cid/role（实例锚单点在契约根，W9 豁免口径落卡）
- ai-message-list-loop-limit/-aborted slot（role=status）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 帧根锚 + role=log（a11y.test.tsx 冻结） |
| D2 根自然性 | pass | |
| D3 包装付租 | exempt | wrap 为回到底部按钮的定位宿主（:158-160 注释），带 data-slot；实例锚豁免登记 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | wrap 非帧，为定位层 |
| D6 canvas a11y | n-a | role=log + aria-live |

## Proof

- `src/renderers/__tests__/renderers.test.tsx`（DOM structure contract: message-list 块——role=log + wrap 豁免 + sender 根）
- `src/renderers/__tests__/a11y.test.tsx`（role=log/aria-live/aria-busy）
