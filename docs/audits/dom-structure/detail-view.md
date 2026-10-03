# dom-structure: detail-view

> Package: flux-renderers-form-advanced | Source: src/detail-view/detail-view.tsx:545-552（def :625-651 无 wrap） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md

## 结构图（根 → 首个内容）

- 无帧通道：可见根 = 组件输出根 `<div class="nop-detail-view" data-renderer="detail-view" data-testid data-cid>`（ensure stamp；label 走 FieldLabel:551）；detail-view-viewer slot；DetailSurface portal bodySlot 动态 data-slot（detail-view-surface-body/-draft-body/-draft-error）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 无 wrap → stamp + 手写 testid/cid（契约测试断言） |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | portal 为边界职责，bodySlot 动态 slot |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（detail-view output root anchor-stamped）
