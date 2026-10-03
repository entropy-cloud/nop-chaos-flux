# dom-structure: image

> Package: flux-renderers-content | Source: src/image.tsx:179-251 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-533-dom-structure-content-plan.md

## 结构图（根 → 首个内容）

- 三态根（均三件套齐全）：loading `<div>`(image-loading)/fallback `<div>`(image-fallback)/成功 = 裸 `<img>`（根即交互/媒体元素）；preview 走 Dialog portal :239-251

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 三态根均带三件套（stamp + 手写） |
| D2 根自然性 | pass | 成功态根即 img（合规范本） |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | 三态 slot |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 image 测试覆盖
