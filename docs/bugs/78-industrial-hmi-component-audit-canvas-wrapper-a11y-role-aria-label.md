# 78 Industrial HMI Component Audit — Canvas Wrapper a11y `role`/`aria-label` (scada-canvas + scada-editor-canvas)

> Source: HCA1 P2-1 + HCA7 P2-2 审计卡（dim 8 a11y）；共性 work item HCAX-2（roadmap `done`）。归档 plan `docs/plans/2026-08-08-1430-1-*.md`。

## Problem

- scada-canvas 与 scada-editor-canvas 的画布交互面（leafer 渲染容器 div）缺少 `role` 与 `aria-label`。
- 屏幕阅读器无法识别画布区域用途；canvas（leafer）渲染到无原生语义的 div，wrapper 暴露的 ARIA 信息为空。
- 两个 renderer 同型缺陷（跨包）。

## Diagnostic Method

- 诊断难度：a11y 缺陷在纯逻辑单测里不可见，需 DOM 属性级断言或屏幕阅读器视角才能发现。
- 调查路径：HCA1 dim 8（a11y）+ HCA7 dim 8 审计，分别核对两 renderer 根 wrapper div 的 ARIA 属性 → 均无 `role`/`aria-label`。
- 决定性证据：closure audit 复核（fresh session）确认两 wrapper 落地后 `role="application"` + `aria-label` DOM 属性存在（`scada-canvas-smoke.test.tsx:98-99`）。

## Root Cause

- canvas 场景由 leafer 在一个普通 div 上渲染，该 div 无原生 landmark / region 语义。
- wrapper 未显式赋予 `role="application"`（告知辅助技术这是富交互应用区）与 `aria-label`（可达名称）。
- 跨包：scada-canvas（runtime）与 scada-editor-canvas（editor）两个独立 renderer 同型遗漏。

## Fix

- 两 renderer wrapper 加 `role="application"` + `aria-label={t('industrial.scada.canvasLabel')}` + i18n key（zh-CN / en-US）。
- runtime：`scada-canvas.tsx:298-299` + i18n `zh-CN.ts:935` / `en-US.ts:936`。
- editor：`scada-editor-canvas.tsx:217,270-273` + editor `canvasLabel` key（与 runtime 一致）。
- 对应共性 work item HCAX-2（roadmap `done`）。

## Tests

- `src/scada-canvas-smoke.test.tsx:86-99` — `emits a11y role/aria-label on the canvas wrapper (HCA1 P2-1 / HCAX-2)`：断言 `role="application"` + `aria-label`（结果值）。
- `src/editor/scada-editor-canvas-disabled-meta.test.tsx` — editor wrapper a11y + disabled 守护（+3 测）。
- e2e：`tests/e2e/scada-demo.spec.ts` / `tests/e2e/scada-editor-interaction-correctness.spec.ts` 复用通过。

## Affected Files

- `packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx`
- `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx`
- i18n locale（`zh-CN.ts` / `en-US.ts`）

## Notes For Future Refactors

- canvas 交互面无原生 a11y 语义，wrapper 必须显式 `role="application"` + `aria-label` + i18n key。
- 新增 canvas 类 renderer 时，复制此 a11y 契约；closure 时以 DOM 属性级断言（非仅 not.toThrow）守护。
- **Lesson 回链（HCA-LL）**：已沉淀为 industrial 专项检查点——`docs/audits/component-audit-checklist.md` §2.1 IND-1（canvas wrapper a11y）+ `docs/skills/deep-audit-prompts.md` 维度 20 industrial 包级提示 + `docs/architecture/renderer-markers-and-selectors.md`「Canvas / scene-graph interaction surfaces」节。catalog 终态见 `docs/plans/2026-08-08-1527-2` §裁定结果 L-A11Y-1。
