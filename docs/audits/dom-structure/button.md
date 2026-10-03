# dom-structure: button

> Package: flux-renderers-basic | Source: src/button.tsx:190-307 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-528-dom-structure-basic-plan.md

## 结构图（根 → 首个内容）

- root `<button data-slot="button" class="nop-button ..." data-renderer data-testid data-cid>`（ui Button 透传）— leaf 直出；icon 用 data-icon=inline-start/end
- anchor 分支 `<a data-slot="button" class="nop-button ...">`（W1 fix：补 nop-button + data-slot）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass（fix landed） | W1 前根无 nop-button（违反契约，旧约定"ui data-slot 即身份"被新契约取代）；W1 补 `nop-button` class |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 0 层 |
| D4 区域 slot | pass | data-slot="button"（两分支）；icon 用 data-icon |
| D5 无自带 frame | pass | tooltip 经 render={button} 根不变 |
| D6 canvas a11y | n-a | |

## Actions

- [x] button.tsx 两分支补 `nop-button` class；anchor 分支补 `data-slot="button"`

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（button anchor branch identity contract）
- `src/__tests__/widget-markers-contract.test.tsx`（旧"无标记"断言按新契约更新）
