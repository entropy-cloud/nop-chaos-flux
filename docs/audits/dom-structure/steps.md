# dom-structure: steps

> Package: flux-renderers-layout | Source: src/steps-renderer.tsx:123-166（定义 process-display-definitions.ts:5-17） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-532-dom-structure-layout-plan.md

## 结构图（根 → 首个内容）

- 非空根 `<ol class="nop-steps" data-slot="steps-root" data-renderer="steps" data-testid data-cid>`；空态根 `<div class="nop-steps" data-slot="steps-root">`（steps-empty）——双标签根（ol/div）为列表语义切换，登记；slot：steps-root/-empty/-item/-connector/-indicator/-indicator-circle/-title/-description；items 为纯 value prop（无 region，定义明示）
- 注册结论：定义文件拆分、单次注册（process-display-definitions.ts:5 唯一定义，layout-renderer-definitions.ts:601 聚合一次；test-support 内联定义为测试隔离注册表，非生产双注册）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | ol 语义（列表） |
| D3 包装付租 | pass | 无中间层 |
| D4 区域 slot | pass | 全套 steps-* |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/dom-structure-contract.test.tsx`（steps root anchors + steps-root slot）
