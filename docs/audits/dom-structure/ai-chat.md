# dom-structure: ai-chat

> Package: flux-renderers-ai | Source: src/renderers/ai-chat.tsx:549-614 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-536-dom-structure-ai-plan.md

## 结构图（根 → 首个内容）

- root `<section class="nop-ai-chat" data-slot="ai-chat-root" data-renderer="ai-chat" data-testid data-cid data-state>`（empty/error 分支同根 + data-state；AiChatProvider 为纯逻辑层无 DOM）
- ai-chat-header/-before/-after/-footer/-empty/-error slot；内嵌 message-list/sender 视图自带各自根（testid/cid 留在自家根——单点锚语义）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | section 语义 |
| D3 包装付租 | pass | Provider 无 DOM |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；marker 由既有 ai-chat 测试覆盖
