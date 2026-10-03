# dom-structure: dropdown-button

> Package: flux-renderers-layout | Source: src/dropdown-button-renderer.tsx:123-150 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-532-dom-structure-layout-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-dropdown-button" data-slot="dropdown-button-root" data-renderer="dropdown-button" data-testid data-cid>`（label region 消费 :43）；DropdownMenu 不落 DOM，菜单内容 portal 到 body（根子树外）；hover 关闭 150ms grace timer

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | portal 为边界职责 |
| D4 区域 slot | pass | 根 slot + label region |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 dropdown-button 测试覆盖
