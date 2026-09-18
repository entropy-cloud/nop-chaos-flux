# 视觉质量证据卡：Report Designer（V7）

> 状态: seeded
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §5（已经三轮独立核实）
> Owner plan: —
> Owner docs: `docs/architecture/report-designer/design.md`、`docs/architecture/report-designer/codec-design.md`

## Findings 清单

- [V7-F1] 画布硬编码：直接复用 spreadsheet-renderers 且写死 30 行×10 列（`report-spreadsheet-canvas.tsx:26-27`）
  - 证据: 普查 §5
  - 裁决: pending
  - 状态: open
- [V7-F2] `TemplateCodecAdapter` 仅抛错占位（`report-designer-core/src/adapters.ts:157-167`）；hucre 对比报告已论证引入路径（真实集成走独立 plan，本域只做方向裁决与接口面）
  - 证据: 普查 §5、`docs/analysis/2026-09-12-hucre-vs-report-designer-comparison.md`
  - 裁决: pending（codec 方向裁决）
  - 状态: open
- [V7-F3] 无报表带区/分组头/分页语义视觉
  - 证据: 普查 §5
  - 裁决: pending（含否决即 deferred 的显式理由）
  - 状态: open
- [V7-F4] fallback 壳只渲染文本摘要（`fallbacks.tsx:57-71`）
  - 证据: 普查 §5
  - 裁决: pending
  - 状态: open
- [V7-F5] e2e 极薄：2 个 spec（report-designer-demo 6 处计算样式 / report-designer-host 0），无 dark、无画布结构视觉断言
  - 证据: 普查 §5 + V0 研究报告 §2
  - 裁决: pending
  - 状态: open

## 视觉证据

待 V7 plan 落地：画布 schema 驱动尺寸（L2 几何）、fallback 壳视觉（L3）、dark（L3）。

## Closure

（V7 closure audit 后回写）
