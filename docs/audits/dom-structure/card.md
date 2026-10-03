# dom-structure: card

> Package: flux-renderers-content | Source: src/card.tsx:37 + ui/card.tsx:14-38 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-533-dom-structure-content-plan.md

## 结构图（根 → 首个内容）

- root = ui Card `<div class="nop-card" data-slot="card" data-renderer="card" data-testid data-cid>`（ui 透传三件套；onClick 时 role=button）；card-image/card-header-region/card-title(ui)/card-content(ui)/card-footer-region/card-actions slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 根即 ui 组件元素（stamp 经透传落 DOM） |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 无未标记层 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 card 测试覆盖
