# dom-structure: barcode-input

> Package: flux-renderers-scheduling | Source: src/barcode-input/barcode-input.tsx:287-333（def scheduling-renderer-definitions.ts:350 wrap:false） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-535-dom-structure-scheduling-plan.md

## 结构图（根 → 首个内容）

- 可见根（自绘字段 chrome）`<div class="nop-barcode-input nop-input-text" data-slot="barcode-input" data-renderer="barcode-input" data-testid data-cid>`（barcode-clear-button/-scan-button/-validation-error slot）；wrap:false → 无 FieldFrame 帧，data-renderer 由 ensure stamp 落根

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | stamp + 手写 testid/cid（双通道合规：无帧即无双层） |
| D2 根自然性 | pass | 自绘字段 chrome 为表单域控件惯例 |
| D3 包装付租 | pass | |
| D4 区域 slot | pass | clear/scan/validation-error |
| D5 无自带 frame | pass | wrap:false 即无帧 |
| D6 canvas a11y | n-a | 非 canvas/引擎容器（自绘字段 chrome），W6 轮已定 n-a 口径 |

## Proof

- 登记卡；行为由既有 barcode-input 测试覆盖
