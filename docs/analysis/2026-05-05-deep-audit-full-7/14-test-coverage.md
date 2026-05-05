# 维度 14：测试覆盖与质量

## 第1轮初审

### [维度14] `flux-action-core` 核心动作分发包缺少 coverage gate

- **文件**: `packages/flux-action-core/vitest.config.ts:1-5`
- **严重程度**: P1
- **类别**: 覆盖缺口 / 一致性
- **现状**: 有测试但没有 coverage include/thresholds。
- **建议**: 为 action dispatcher / operation-control 等主链路加 coverage gate。

### [维度14] `flux-formula` 的 coverage include 未覆盖公开编译入口与关键实现

- **文件**: `packages/flux-formula/vitest.config.ts:5-18`, `packages/flux-formula/src/index.ts:1-8`
- **严重程度**: P2
- **类别**: 覆盖缺口
- **建议**: 扩大 coverage include 到 `src/**/*` 或至少覆盖公开导出实现文件。

### [维度14] `flow-designer-renderers` 大型测试套件出现 setup 膨胀并重复内联全局 DOM bootstrap

- **文件**: `packages/flow-designer-renderers/src/designer-page.tree.test.tsx:13-66`, `packages/flow-designer-renderers/src/canvas-bridge.test.tsx:46-58`
- **严重程度**: P2
- **类别**: setup 膨胀 / 隔离性
- **建议**: 抽出共享 DOM/i18n/bootstrap helper。

### [维度14] `word-editor-core` 使用 `vi.stubGlobal` 但未回收

- **文件**: `packages/word-editor-core/src/__tests__/document-io.test.ts:36-43`
- **严重程度**: P2
- **类别**: 隔离性
- **建议**: 在 `afterEach` 中恢复全局，或改用显式依赖注入。

### [维度14] 表单关键路径的 E2E 覆盖停留在基础校验

- **文件**: `packages/flux-runtime/src/__tests__/runtime-actions-submit.test.ts:82-135`, `tests/e2e/component-lab/simple-form.spec.ts:103-126`
- **严重程度**: P1
- **类别**: E2E 关键路径缺口
- **建议**: 为重复提交、复杂校验、隐藏字段参与策略补 Playwright 断言。

## 深挖第2轮追加

### [维度14] 多个高交互 host/renderers 包仍未配置 coverage gate

- **文件**: `packages/report-designer-renderers/vitest.config.ts`, `packages/spreadsheet-renderers/vitest.config.ts`, `packages/word-editor-renderers/vitest.config.ts`, `packages/flux-code-editor/vitest.config.ts`, `packages/nop-debugger/vitest.config.ts`
- **严重程度**: P2
- **类别**: 覆盖缺口 / 一致性

### [维度14] `flow-designer`/`spreadsheet`/`report-designer` 渲染包的 Vitest 环境声明与实际测试模式漂移

- **文件**: `packages/flow-designer-renderers/vitest.config.ts`, `packages/spreadsheet-renderers/vitest.config.ts`, `packages/report-designer-renderers/vitest.config.ts`
- **严重程度**: P2
- **类别**: 一致性

### [维度14] `word-editor-renderers` 仍有未恢复的 `localStorage` 全局覆盖

- **文件**: `packages/word-editor-renderers/src/__tests__/editor-canvas.test.tsx:25-41`
- **严重程度**: P2
- **类别**: 隔离性

### [维度14] Report Designer 的 E2E 仍未覆盖已存在的核心写回/命名空间动作链路

- **文件**: `packages/report-designer-renderers/src/renderers.integration.test.tsx:179-236`, `tests/e2e/report-designer-demo.spec.ts:11-116`
- **严重程度**: P1
- **类别**: E2E 关键路径缺口

## 深挖第3轮追加

### [维度14] `word-editor` 存储链路跨包测试不少，但 core/renderers/E2E 三层都没有 coverage gate

- **文件**: `packages/word-editor-core/vitest.config.ts`, `packages/word-editor-renderers/vitest.config.ts`, `tests/e2e/word-editor-persistence.spec.ts`
- **严重程度**: P1
- **类别**: 覆盖缺口 / 一致性

## 深挖第4轮追加

### [维度14] `flux-i18n` 公开初始化/重置/Hook 语义仅有 16 行冒烟测试

- **文件**: `packages/flux-i18n/src/i18n.ts:33-79`, `packages/flux-i18n/src/hooks.ts:1-7`, `packages/flux-i18n/src/i18n.test.ts:1-16`
- **严重程度**: P2
- **类别**: 覆盖缺口

### [维度14] 多个 Playwright 用例仍依赖固定 sleep

- **文件**: `tests/e2e/word-editor.spec.ts`, `tests/e2e/word-editor-template-expr.spec.ts`, `tests/e2e/word-editor-dataset.spec.ts`, `tests/e2e/debugger.spec.ts`, `tests/e2e/performance-table.spec.ts`
- **严重程度**: P2
- **类别**: E2E 质量 / 稳定性

## 深挖第5轮追加

### [维度14] `@nop-chaos/ui` 公开组件面很大，但测试覆盖只集中在少数基础控件且无 coverage gate

- **文件**: `packages/ui/vitest.config.ts:1-5`, `packages/ui/src/index.ts:1-67`, `packages/ui/src/hooks/use-mobile.ts:1-29`
- **严重程度**: P2
- **类别**: 覆盖缺口

## 深挖统计

- 第1轮发现数：5
- 第2轮新增：4
- 第3轮新增：1
- 第4轮新增：2
- 第5轮新增：1

## 维度复核结论

- 初审与深挖共 13 项，独立复核后保留 8 项、降级 5 项。
- 最终保留项集中在真实 coverage gate 缺失、全局污染未恢复，以及高风险主链路缺少 E2E/回归覆盖。

## 子项复核结论

- `[维度14] flux-action-core 核心动作分发包缺少 coverage gate`: 保留。`vitest.config.ts` 只有环境配置，确实没有 coverage include/thresholds。
- `[维度14] flux-formula 的 coverage include 未覆盖公开编译入口与关键实现`: 保留。`src/index.ts` 公开导出的关键实现未进入 coverage include。
- `[维度14] flow-designer-renderers 大型测试套件出现 setup 膨胀并重复内联全局 DOM bootstrap`: 降级。问题存在，但更偏测试维护性重复。
- `[维度14] word-editor-core 使用 vi.stubGlobal 但未回收`: 保留。只 stub 不 restore，存在跨用例污染风险。
- `[维度14] 表单关键路径的 E2E 覆盖停留在基础校验`: 保留。未覆盖重复提交、隐藏字段参与策略等高风险路径。
- `[维度14] 多个高交互 host/renderers 包仍未配置 coverage gate`: 保留。多个列出的 `vitest.config.ts` 确实都未声明 coverage gate。
- `[维度14] flow-designer/spreadsheet/report-designer 渲染包的 Vitest 环境声明与实际测试模式漂移`: 降级。默认环境写成 `node` 而大量测试靠文件级 `@vitest-environment jsdom` 覆盖，属配置漂移。
- `[维度14] word-editor-renderers 仍有未恢复的 localStorage 全局覆盖`: 保留。`editor-canvas.test.tsx` 覆盖 `globalThis.localStorage` 后未恢复。
- `[维度14] Report Designer 的 E2E 仍未覆盖已存在的核心写回/命名空间动作链路`: 保留。集成测试已覆盖部分链路，但 Playwright 仍停留在界面可见性与基础交互。
- `[维度14] word-editor 存储链路跨包测试不少，但 core/renderers/E2E 三层都没有 coverage gate`: 降级。core/renderers 两层缺 gate 成立，但把 Playwright E2E 也按 coverage gate 口径要求过宽。
- `[维度14] flux-i18n 公开初始化/重置/Hook 语义仅有 16 行冒烟测试`: 保留。公开语义分支较多，现有测试仅覆盖单键解析冒烟。
- `[维度14] 多个 Playwright 用例仍依赖固定 sleep`: 保留。列出的多个 E2E 文件中确实存在大量 `page.waitForTimeout(...)`。
- `[维度14] @nop-chaos/ui 公开组件面很大，但测试覆盖只集中在少数基础控件且无 coverage gate`: 降级。无 coverage gate 属实，但“只集中在少数基础控件”表述略重。
