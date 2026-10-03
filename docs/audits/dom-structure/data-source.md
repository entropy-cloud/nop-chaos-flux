# dom-structure: data-source

> Package: flux-renderers-data | Source: src/data-source-renderer.tsx:44-94 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-531-dom-structure-data-plan.md

## 结构图（根 → 首个内容）

- return null（仅注册 dataSource + ComponentHandle 副作用）——null-render 渲染器

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | exempt | null-render 豁免（契约：无输出渲染器豁免） |
| D2 根自然性 | pass | |
| D3 包装付租 | n-a | |
| D4 区域 slot | n-a | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（data-source renders null）
