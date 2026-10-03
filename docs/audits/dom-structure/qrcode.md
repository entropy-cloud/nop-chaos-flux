# dom-structure: qrcode

> Package: flux-renderers-content | Source: src/qrcode.tsx:75-115 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-533-dom-structure-content-plan.md

## 结构图（根 → 首个内容）

- root `<figure class="nop-qrcode" data-renderer="qrcode" data-testid data-cid>`（qrcode-canvas/qrcode-label/qrcode-fallback slot；canvas role=img + aria-label :114-115）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | figure 语义元素 |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | pass | canvas role=img + i18n aria-label（契约测试断言 fallback 路径） |

## Proof

- `src/dom-structure-contract.test.tsx`（qrcode root anchors + fallback 路径）
