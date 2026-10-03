# dom-structure: timeline

> Package: flux-renderers-layout | Source: src/timeline-renderer.tsx:164-217（定义 process-display-definitions.ts:92-104） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-532-dom-structure-layout-plan.md

## 结构图（根 → 首个内容）

- 非空根 `<ol class="nop-timeline" data-slot="timeline-root" data-renderer="timeline" data-testid data-cid>`；空态 div 同 slot（timeline-empty）——双标签根登记（同 steps）；slot：timeline-root/-empty/-item/-axis/-dot/-content/-time/-title/-detail；items 纯 value prop
- 注册结论：单次注册（同 steps）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/dom-structure-contract.test.tsx`（timeline root anchors）
