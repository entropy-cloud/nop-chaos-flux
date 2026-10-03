# dom-structure: kanban

> Package: flux-renderers-scheduling | Source: src/kanban/kanban-board.tsx:449-460 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-535-dom-structure-scheduling-plan.md

## 结构图（根 → 首个内容）

- 可见根 `<div class="nop-kanban" data-slot="kanban" role="application" aria-label=t(kanbanCanvasLabel) data-renderer="kanban" data-testid data-cid>`（W8 补 role/label；既有 sr-only boardSummary aria-live :460）；nop-kanban-columns 列容器；loading/empty/columnHeader/columnHeaderToolbar/cardTemplate/columnFooter region

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | pass（fix landed） | 根补 role="application" + i18n aria-label（属性级断言） |

## Actions

- [x] kanban 根补 role="application" + aria-label

## Proof

- `src/dom-structure-contract.test.tsx`（kanban: role/label/三件套）
