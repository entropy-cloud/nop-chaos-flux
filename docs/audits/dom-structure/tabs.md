# dom-structure: tabs

> Package: flux-renderers-basic | Source: src/tabs.tsx:464-514 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-528-dom-structure-basic-plan.md

## 结构图（根 → 首个内容/交互元素）

- root `<section class="nop-tabs" data-tabs-mode data-renderer data-testid data-cid>` — 职责: 多区域分组
  - `<div data-slot="tabs-toolbar">` — 职责: 多区域分组（工具栏）
  - ui Tabs（props spread 覆盖为 `data-slot="tabs-root"`）→ tabs-list/tabs-trigger（tab-icon/tab-badge/tabs-trigger-close/tabs-trigger-add）/ tabs-content > tabs-item-toolbar；移动端 tabs-panels-swipe

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | composite |
| D3 包装付租 | pass | 2 层均带 slot（tabs-root 为 ui 受控覆盖） |
| D4 区域 slot | pass | toolbar/list/trigger/content/panels 全覆盖 |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（tabs root anchor triple）
