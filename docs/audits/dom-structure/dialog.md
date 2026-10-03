# dom-structure: dialog

> Package: flux-renderers-basic（host 在 flux-react） | Source: surface-renderer-definitions.ts:152 + flux-react/src/dialog-host.tsx:373-381 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-528-dom-structure-basic-plan.md

## 结构图（根 → 首个内容）

- portal 通道：basic 内组件 return null（dialog.tsx:5-8），DOM 根在 host
  - Portal > DialogOverlay > root `<div class="nop-dialog" data-slot="dialog-surface" data-renderer="dialog" data-testid data-cid>`（host 盖章）— 职责: portal 边界 + 多区域分组
  - dialog-header/dialog-body/dialog-footer/dialog-close（ui）+ dialog-confirm-bar > surface-confirm-cancel/submit（dialog-host.tsx:425-443）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | host 根三件套齐全（W0 注入 + 528 契约测试确认） |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | Portal/Overlay 为 portal 边界职责；content 根带 slot |
| D4 区域 slot | pass | header/body/footer/close/confirm-bar 全覆盖 |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## 口径（portal/surface 通道，供全路线图引用）

- 关闭态组件 return null：D1 记 n-a（不渲染即无根）；挂载后由 host 根承担三件套
- host 通道（dialog-host）负责盖章；组件侧不自绘根

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（dialog portal root anchor triple）
