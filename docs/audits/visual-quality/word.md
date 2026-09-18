# 视觉质量证据卡：Word 编辑器（V8b）

> 状态: seeded
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §6（已经三轮独立核实）
> Owner plan: —
> Owner docs: `docs/components/word-editor-page/design.md`

## Findings 清单

- [V8b-F1] 字体/字号硬编码枚举：`toolbar/font-controls.tsx:23-24`，6 字体 16 档，无自定义输入
  - 证据: 普查 §6
  - 裁决: pending
  - 状态: open
- [V8b-F2] 无页眉页脚编辑 UI：bridge 已透传数据、缺编辑 UI（裁决落地或显式 deferred）
  - 证据: 普查 §6
  - 裁决: pending
  - 状态: open
- [V8b-F3] 令牌化边界：自有 CSS 仅 15 行，视觉全托 canvas-editor 默认皮肤（令牌化边界核对，皮肤属第三方面的部分只核对不重构）
  - 证据: 普查 §6
  - 裁决: pending
  - 状态: open
- [V8b-F4] 中文字体族预览待核对（字体名展示是否反映实际字体族）
  - 证据: 路线图 V8b 行
  - 裁决: pending
  - 状态: open
- [V8b-F5] word e2e 全无视觉断言（`word-editor*.spec.ts` 0 计算样式/0 截图）
  - 证据: V0 研究报告 §2
  - 裁决: pending
  - 状态: open

## 视觉证据

待 V8b plan 落地：字体/字号控件（L1/L3）、皮肤令牌边界（L3）。

## Closure

（V8b closure audit 后回写）
