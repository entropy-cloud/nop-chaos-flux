# 视觉质量证据卡：Spreadsheet（V6）

> 状态: seeded
> 来源: `docs/analysis/2026-09-15-visual-quality-deep-survey.md` §5（已经三轮独立核实）
> Owner plan: —
> Owner docs: `docs/components/spreadsheet-page/design.md`、`docs/architecture/report-designer/spreadsheet-canvas-css.md`

## Findings 清单

- [V6-F1] 浅色硬编码零 dark：`canvas-styles.css`（894 行）29 处浅色 hex 写死（`#1a1a1a/#ffffff/#0f9d58/#1a73e8/#e3f2fd` 等，29-30/80/205/606-678 行），零 dark 变体；以 report 画布共用为约束
  - 证据: 普查 §5 spreadsheet 项（hex 计数 29 经 Round 1 核实）
  - 裁决: pending
  - 状态: open
- [V6-F2] 单元格值无类型区分：`value?: unknown`（`types.ts:50`），数字/日期/文本同渲染（无对齐与格式区分）
  - 证据: 普查 §5
  - 裁决: pending
  - 状态: open
- [V6-F3] 条件格式缺失、筛选仅显隐行（design.md:349-352 自认第一阶段）
  - 证据: 普查 §5（design.md 自认非目标部分按 Non-Goal 处置）
  - 裁决: pending（倾向 deferred，须写理由）
  - 状态: open
- [V6-F4] e2e 极薄：仅 `spreadsheet-demo.spec.ts`（2 处计算样式），无 dark、无冻结/填充柄/选中态视觉断言
  - 证据: 普查 §5 + V0 研究报告 §2
  - 裁决: pending
  - 状态: open

## 视觉证据

待 V6 plan 落地：令牌化后 light/dark 双态计算样式断言（冻结/填充柄/选中态，L3），dark 变体断言以 `expectCssVarResolves` + `expectComputedStyleNot` 为主。

## Closure

（V6 closure audit 后回写）
