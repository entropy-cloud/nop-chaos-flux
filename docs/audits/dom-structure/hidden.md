# dom-structure: hidden

> Package: flux-renderers-form | Source: src/hidden-renderer.tsx:17-29 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- root `<input type="hidden" data-slot="hidden-input" data-renderer="hidden">` — 刻意裸输出（无 wrap 通道）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | data-renderer 由 ensure stamp 落裸输入（W2）；data-cid/data-field 豁免——裸输入单点锚语义，实例锚不落在 hidden 输入（契约测试冻结） |
| D2 根自然性 | pass | 自然元素直出（合规范本） |
| D3 包装付租 | pass | 0 层 |
| D4 区域 slot | pass | hidden-input |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（hidden bare input）
