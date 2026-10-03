# dom-structure: status

> Package: flux-renderers-content | Source: src/status.tsx:59-78 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-533-dom-structure-content-plan.md

## 结构图（根 → 首个内容）

- root `<span class="nop-mapping 同款" data-slot="status-root" data-renderer="status" data-testid data-cid>`（status-badge ui Badge；miss 分支无 Badge）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | span 单元素 |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | status-root/-badge |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/dom-structure-contract.test.tsx`（status root anchors）
