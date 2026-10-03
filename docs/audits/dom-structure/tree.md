# dom-structure: tree

> Package: flux-renderers-data | Source: src/tree-renderer.tsx:589-634 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-531-dom-structure-data-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-tree" role="tree" data-renderer="tree" data-testid data-cid>`（空态双 return 结构一致：tree-empty :600/:633）；tree-search/-search-input/-node/-node-row/-node-icon/-guide-line/-children/-children-more/-search-highlight slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | role=tree |
| D3 包装付租 | pass | 无无名层 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | role=tree 语义成立 |

## Proof

- 登记卡；行为由既有 tree 测试覆盖
