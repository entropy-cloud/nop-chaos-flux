# 02 Module Responsibility

- 深挖轮次: 3
- 深挖发现数: 17
- 维度复核: 9 保留 / 5 降级 / 3 驳回
- 子项复核: 已完成 3 项 `>700` 文件逐项复核，全部成立

## 第 1 轮初审

- `packages/flux-renderers-basic/src/__tests__/basic-page-layout.test.tsx` 超过 700 行且混合 page/layout/tabs/dialog/drawer 多主题
- `packages/flux-renderers-form/src/__tests__/form-submit-actions.test.tsx` 超过 700 行且混合 submit/init/valuesPath/form.data/surface scope
- `packages/flux-renderers-data/src/__tests__/use-table-controls.test.tsx` 超过 700 行且混合 pagination/selection/sort/filter/expand
- `packages/flux-react/src/hooks.ts` 混合 scope/form/page/render 多类 hooks
- `packages/flux-react/src/node-renderer.tsx` 混合节点解析、regions/events、hidden-field、prepared import、namespace action
- `packages/flux-runtime/src/form-store.ts` 同文件承载 form/page/surface 三类 store
- `packages/word-editor-renderers/src/word-editor-page.tsx` 混合 bridge、保存、dataset CRUD、host scope、shell

## 深挖第 2 轮追加

- `packages/flux-runtime/src/runtime-factory.ts` 重新膨胀为 assembly + cache + import + action adapter 混合体
- `packages/flux-renderers-form/src/renderers/input.tsx` 混合 8 类控件与 definitions 注册表
- `packages/flow-designer-renderers/src/designer-command-adapter.test.ts` 混合 graph command 与 tree owner 测试
- `packages/flow-designer-renderers/src/designer-page.tree.test.tsx` 混合 tree render、runtime props、continuity 回归
- `packages/flux-compiler/src/schema-compiler-diagnostics.test.ts` 混合多套 diagnostics 子域

## 深挖第 3 轮追加

- `packages/flux-compiler/src/schema-compiler.ts` 职责仍偏宽
- `packages/flow-designer-renderers/src/designer-page.tsx` 同时承担 mode 装配、namespace、shell、dialogs
- `packages/flux-runtime/src/form-runtime-validation.ts` 候选职责过宽
- `packages/flux-runtime/src/async-data/reaction-runtime.ts` 候选职责过宽
- `packages/flux-renderers-data/src/table-renderer.tsx` 候选职责过宽

## 维度复核结论

保留:

- `basic-page-layout.test.tsx`
- `form-submit-actions.test.tsx`
- `hooks.ts`
- `node-renderer.tsx`
- `form-store.ts`
- `word-editor-page.tsx`
- `designer-command-adapter.test.ts`
- `schema-compiler-diagnostics.test.ts`
- `designer-page.tsx`

降级:

- `use-table-controls.test.tsx`
- `runtime-factory.ts`
- `renderers/input.tsx`
- `designer-page.tree.test.tsx`
- `schema-compiler.ts`

驳回:

- `form-runtime-validation.ts`
- `reaction-runtime.ts`
- `table-renderer.tsx`

## 子项复核结论

成立:

- `packages/flux-renderers-basic/src/__tests__/basic-page-layout.test.tsx`
- `packages/flux-renderers-form/src/__tests__/form-submit-actions.test.tsx`
- `packages/flux-renderers-data/src/__tests__/use-table-controls.test.tsx`

依据:

- `pnpm check:oversized-code-files`
- `eslint.config.js` `max-lines`
- `docs/skills/deep-audit-prompts.md` 中 `>700` 必拆规则

## 最终保留项

注: 本节才是 2026-05-07 在维度 02 下进入 remediation / successor routing 的最终 retained closure set。上方 `维度复核结论` 中个别条目属于复核阶段曾保留、但在汇总裁定时未进入最终 retained set 的过渡候选；计划 owner routing 以本节和 `summary.md` 为准，不再把这些过渡候选视为需要单独 successor ownership 的 confirmed closure item。

### [维度02] 三个超过 700 行的测试文件仍违反仓库硬阈值

- **文件**: `packages/flux-renderers-basic/src/__tests__/basic-page-layout.test.tsx`, `packages/flux-renderers-form/src/__tests__/form-submit-actions.test.tsx`, `packages/flux-renderers-data/src/__tests__/use-table-controls.test.tsx`
- **严重程度**: P1
- **现状**: 三个文件都已超过 `>700` 行硬阈值，且测试主题明显跨域
- **风险**: 继续堆叠会放大回归定位成本，并持续绕过仓库 guardrail
- **建议**: 按测试主题拆分为更小的按域文件
- **复核状态**: 子项复核通过

### [维度02] `packages/flux-react/src/hooks.ts` 仍混合多类公开 hooks

- **严重程度**: P2
- **现状**: scope/form/page/render hooks 共置于一个 540 行文件
- **风险**: 公开 surface 与内部实现耦合，后续继续扩张
- **建议**: 拆成 `hooks-scope` / `hooks-form` / `hooks-page-node` / `hooks-render`
- **复核状态**: 维度复核通过

### [维度02] `packages/flux-react/src/node-renderer.tsx` 仍混合渲染热路径与多类运行时 glue

- **严重程度**: P2
- **现状**: 节点订阅、event/regions 组装、hidden-field 通知、prepared import、namespace action 仍集中
- **风险**: 热路径文件持续吸收子职责，增加维护与复核成本
- **建议**: 继续下沉到 focused helper/controller 模块
- **复核状态**: 维度复核通过

### [维度02] `packages/flux-runtime/src/form-store.ts` 同文件承载 form/page/surface store 工厂

- **严重程度**: P2
- **现状**: 三种 owner store 共置
- **风险**: owner 边界混淆，后续状态模型演进互相干扰
- **建议**: 按 `form/page/surface` 拆分
- **复核状态**: 维度复核通过

### [维度02] `packages/word-editor-renderers/src/word-editor-page.tsx` 页面级 renderer 职责过宽

- **严重程度**: P2
- **现状**: bridge、save、datasets、host scope、shell、dialogs 均在单文件
- **风险**: 继续扩张后难以为 controller/UI/owner 边界补测试
- **建议**: 拆出 controller、panels、dialogs、header 等子模块
- **复核状态**: 维度复核通过
