# dom-structure: carousel

> Package: flux-renderers-content | Source: src/carousel.tsx:241-291（ui carousel.tsx:151-152） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-533-dom-structure-content-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-carousel" data-slot="carousel" data-renderer="carousel" data-testid data-cid>`（根内 ui Carousel 另带同名 data-slot="carousel"——ui 内层导航壳，同名嵌套登记）；链：Carousel(ui) → CarouselContent（vendor 双 div：viewport + 内层 flex，forced wrapper 登记）→ CarouselItem[data-slot=carousel-item] → `<div data-slot="carousel-item-frame">`（W6 补章：caption 定位上下文 + 裁剪圆角 + 占位底色三合一）→ img/placeholder；carousel-item/-item-image/-item-placeholder/-item-caption/-title/-text/-prev/-next/-indicators/-indicator/-indicator-dot slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 根三件套 + 内层 ui 同名 slot 登记 |
| D2 根自然性 | pass | |
| D3 包装付租 | pass（fix landed） | 6 层链逐层归因：vendor 双 div 记 forced wrapper；末端 relative 层补 `carousel-item-frame` slot |
| D4 区域 slot | pass | 全套 carousel-* |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Actions

- [x] carousel-item-frame 补 slot

## Proof

- `src/dom-structure-contract.test.tsx`（carousel root + item-frame ×2）
