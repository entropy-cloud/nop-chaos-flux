# dom-structure: recurse

> Package: flux-renderers-basic | Source: src/recurse.tsx:78-133 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-528-dom-structure-basic-plan.md

## 结构图（根 → 首个内容）

- 无根（loop 上下文外 return null）——结构性渲染器

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | exempt | structural/null-render 豁免 |
| D2 根自然性 | pass | |
| D3 包装付租 | n-a | |
| D4 区域 slot | n-a | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记豁免
