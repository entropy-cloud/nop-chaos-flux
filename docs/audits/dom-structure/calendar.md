# dom-structure: calendar

> Package: flux-renderers-scheduling | Source: src/calendar/calendar.tsx:478-491 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-535-dom-structure-scheduling-plan.md

## 结构图（根 → 首个内容）

- 可见根 `<div class="nop-calendar" data-slot="calendar" role="application" aria-label=t(calendarCanvasLabel) data-renderer="calendar" data-testid data-cid data-view data-date>`（W8 补 role/label；既有 sr-only viewSummary aria-live :491；周/日视图矩阵自带 role=grid+label，calendar-week-view.tsx:128/calendar-day-view.tsx:101）
- loading/empty/body/eventTemplate region

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | pass（fix landed） | 根补 role="application" + i18n aria-label；视图矩阵 role=grid 既有 |

## Actions

- [x] calendar 根补 role="application" + aria-label

## Proof

- `src/dom-structure-contract.test.tsx`（calendar: role/label/三件套）
