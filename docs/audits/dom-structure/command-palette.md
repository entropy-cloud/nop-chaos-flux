# dom-structure: command-palette

> Package: flux-renderers-basic | Source: src/command-palette.tsx:469-522 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-528-dom-structure-basic-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-command-palette" data-renderer="command-palette" data-testid data-cid>`（cmdk Command 可见面板，非 DialogContent）— 职责: portal 边界内的自绘根
  - Dialog > DialogContent[data-slot=dialog-content]（portal+overlay）> Command(root)
  - command-input-wrapper/command-list/command-empty/command-group/command-item/command-shortcut（ui command）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass（fix landed） | W1 前无 data-renderer；中央 stamp 不可达（输出根为 Dialog 组件树，非宿主元素），W1 在可见面板手动盖章 |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | Portal/DialogContent 为 portal 边界职责 |
| D4 区域 slot | pass | ui command 全套 slot |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Actions

- [x] command-palette.tsx Command 根补 `data-renderer="command-palette"`（手动盖章，portal 通道豁免登记）

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（command-palette visible panel anchor triple）
