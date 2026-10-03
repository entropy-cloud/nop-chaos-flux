# dom-structure: crud

> Package: flux-renderers-data | Source: src/crud-renderer.tsx:548-669 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-531-dom-structure-data-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-crud" data-renderer="crud" data-testid data-cid>` — 职责: 多区域分组（query 区/toolbar/list/footer）
  - crud-query :560 / crud-query-collapse :565 / `nop-crud-toolbar[data-slot=crud-toolbar]` :605 → `<div data-slot="crud-toolbar-row">`（W4 补章，原纯布局 flex-wrap 层）→ crud-toolbar-main/list-actions slot → CrudToolbarBlocks（header slot 系）
  - crud-list-body/carrier/table/footer slot；blocks: `{slot}-toolbar-layout/-list-actions/-statistics/-page-size/-pagination/-polling-toggle`

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | ensure stamp + 手写 testid/cid |
| D2 根自然性 | pass | composite 根 |
| D3 包装付租 | pass（fix landed） | :606 布局行补 `crud-toolbar-row` slot（与 :614 blocks 行并存为上下两行，合并会破坏布局——审计裁定补 slot 不合并） |
| D4 区域 slot | pass | 全区域/全 block 覆盖 |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Actions

- [x] crud-toolbar-row 补 slot

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（crud root + toolbar-row slot）
