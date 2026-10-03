# dom-structure: echarts

> Package: flux-renderers-data | Source: src/echarts-renderer.tsx:234-393 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-531-dom-structure-data-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-echarts" data-renderer="echarts" data-testid data-cid data-empty>`（echarts-loading/-empty/-error/-canvas slot）
  - `<div data-slot="echarts-canvas" role="img" aria-label={t('flux.common.chart')}>`（echarts.init 挂载点 :234，dispose :252；canvas 由 echarts 生成于 div 内）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | echarts-canvas 为引擎挂载点职责 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | pass | role=img + i18n aria-label（D6 最低要求达成）；数据派生可访问名与 sr-only 数据等价物为增强项，登记 Non-Blocking Follow-up |

## Proof

- 登记卡；行为由既有 echarts 测试覆盖
