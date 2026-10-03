# dom-structure: markdown

> Package: flux-renderers-content | Source: src/markdown.tsx:71-129 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-533-dom-structure-content-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-markdown" data-renderer="markdown" data-testid data-cid>`（三态：markdown-loading/-error/-empty slot，均带 testid/cid）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 markdown 测试覆盖
