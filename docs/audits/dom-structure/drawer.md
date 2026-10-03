# dom-structure: drawer

> Package: flux-renderers-basic（host 在 flux-react） | Source: surface-renderer-definitions.ts:202 + flux-react/src/dialog-host.tsx:526-534 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-528-dom-structure-basic-plan.md

## 结构图（根 → 首个内容）

- portal 通道：drawer.tsx:5-8 return null；DOM 根在 host
  - Portal > viewport > popup[data-slot=drawer-popup] > root `<div class="nop-drawer" data-slot="drawer-surface" data-renderer="drawer" data-testid data-cid>`
  - drawer-header/drawer-body/drawer-footer/drawer-title/drawer-close/drawer-resize-handle（ui）+ drawer-confirm-bar（dialog-host.tsx:578-596）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | host 根三件套齐全 |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | Portal/viewport/popup 为 portal 边界职责 |
| D4 区域 slot | pass | 全覆盖 |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（drawer portal root anchor triple）
