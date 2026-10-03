# dom-structure: fragment

> Package: flux-renderers-basic | Source: src/fragment.tsx:7-19 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-528-dom-structure-basic-plan.md

## 结构图（根 → 首个内容）

- 无根（React.Fragment 透传 body）——结构性渲染器

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | exempt | structural 豁免（stamp 通道对 Fragment 输出跳过，auto-renderer.tsx stampRenderedRoot） |
| D2 根自然性 | pass | 无根即最自然形态 |
| D3 包装付租 | n-a | 0 层 |
| D4 区域 slot | n-a | 无内部区域 |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（structural renderers render no wrapper root）
