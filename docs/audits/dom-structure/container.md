# dom-structure: container

> Package: flux-renderers-basic | Source: src/container.tsx:62-118 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-528-dom-structure-basic-plan.md

## 结构图（根 → 首个内容/交互元素）

- root `<div class="nop-container" data-renderer data-testid data-cid>` — 职责: 多区域分组
  - `<div data-slot="container-body" data-flex data-direction...>` — 职责: 组件自身契约要求的布局作用域（direction/wrap/align/gap）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | composite 根承担 header/body/footer 分组 |
| D3 包装付租 | pass | body 层带 slot 且承担布局职责 |
| D4 区域 slot | pass | container-header/container-body/container-footer |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（container root anchor triple）
