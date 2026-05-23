# 14 测试覆盖与质量

- Task ID: `ses_268e2be72ffeZkORV4FIongYPl`
- Source prompt: `docs/skills/deep-audit-prompts.md`

> Historical Note: File/path references in this audit reflect the repo state at audit time. `packages/flux-react/src/useNodeImports.ts` was later renamed and ultimately removed when the import lifecycle moved to schema preparation plus synchronous prepared-import installation.

# 1. 测试覆盖统计（按包）

| 包                                        | 测试文件数 | 测试代码行数 |
| ----------------------------------------- | ---------: | -----------: |
| `@nop-chaos/flow-designer-core`           |          8 |         1945 |
| `@nop-chaos/flow-designer-renderers`      |          6 |         1816 |
| `@nop-chaos/flux-code-editor`             |          5 |          717 |
| `@nop-chaos/flux-core`                    |          8 |          422 |
| `@nop-chaos/flux-formula`                 |         10 |          914 |
| `@nop-chaos/flux-react`                   |         11 |         1334 |
| `@nop-chaos/flux-renderers-basic`         |          5 |          347 |
| `@nop-chaos/flux-renderers-data`          |          5 |          507 |
| `@nop-chaos/flux-renderers-form`          |          9 |         1635 |
| `@nop-chaos/flux-renderers-form-advanced` |         33 |         7421 |
| `@nop-chaos/flux-runtime`                 |         44 |        12103 |
| `@nop-chaos/nop-debugger`                 |         11 |         3159 |
| `@nop-chaos/report-designer-core`         |          5 |         1260 |
| `@nop-chaos/report-designer-renderers`    |          8 |         1680 |
| `@nop-chaos/spreadsheet-core`             |          8 |         1811 |
| `@nop-chaos/spreadsheet-renderers`        |          4 |          721 |
| `@nop-chaos/tailwind-preset`              |          0 |            0 |
| `@nop-chaos/theme-tokens`                 |          0 |            0 |
| `@nop-chaos/ui`                           |          2 |          200 |
| `@nop-chaos/word-editor-core`             |         11 |         2151 |
| `@nop-chaos/word-editor-renderers`        |          8 |          772 |

**测试文件数量为 0 的包**

- `packages/tailwind-preset`
- `packages/theme-tokens`

## 主要覆盖缺口

### [维度14] flux-runtime 核心运行时存在大面积无对应测试模块

- **文件**: `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/action-runtime-core.ts`, `packages/flux-runtime/src/action-runtime-handlers.ts`, `packages/flux-runtime/src/action-scope.ts`, `packages/flux-runtime/src/scope.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/validation-runtime.ts`, `packages/flux-runtime/src/validation/rules.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/imports.ts`, `packages/flux-runtime/src/page-runtime.ts`, `packages/flux-runtime/src/projected-scope-store.ts`, `packages/flux-runtime/src/request-runtime-adaptor.ts`
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 运行时最核心的 action/scope/compiler/validation/form 子模块仍主要依赖集成测试侧打，缺少与实现文件一一对应的直接测试入口。
- **建议**: 先补 `action-runtime*`、`scope.ts`、`schema-compiler.ts`、`validation-runtime.ts`、`form-runtime*.ts` 的直连单测，再保留现有集成测试做回归兜底。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/form-validation.md`

### [维度14] flux-formula 的编译器与 AST 定义缺少对应测试文件

- **文件**: `packages/flux-formula/src/compile.ts`, `packages/flux-formula/src/ast.ts`
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 表达式系统已有 lexer/parser/evaluator 侧测试，但 `compile.ts` 与 `ast.ts` 没有对应测试文件。
- **建议**: 为编译入口补充 imported alias、pipe rewrite、template compile、异常回退等直连用例；AST 至少加稳定性/导出契约测试。
- **参考文档**: `docs/architecture/flux-core.md`

### [维度14] flux-react 关键渲染装配层缺少对应测试文件

- **文件**: `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/useNodeScopes.ts`, `packages/flux-react/src/useNodeImports.ts`, `packages/flux-react/src/useSourceValue.ts`, `packages/flux-react/src/node-renderer-effects.ts`, `packages/flux-react/src/node-renderer-providers.tsx`
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: React 层已有 schema-renderer 系列集成测试，但渲染主通道和核心 hooks 仍无对应测试文件。
- **建议**: 为 node renderer 生命周期、provider 装配、imports/scope/source hook 行为建立直接测试，避免问题只能靠端到端或大集成用例发现。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md`

### [维度14] flux-renderers-form 基础表单渲染实现缺少对应测试文件

- **文件**: `packages/flux-renderers-form/src/renderers/form.tsx`, `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form/src/field-utils.tsx`
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 表单包有不少 UI/规则测试，但真正的 `form.tsx`/`input.tsx`/field utils 仍无对应测试文件。
- **建议**: 把字段注册、错误展示、hint/help text、disabled/hidden/meta 传递拆到模块级测试中。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/architecture/renderer-runtime.md`

### [维度14] flux-renderers-form-advanced 高复杂度模块仍有直测缺口

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx`, `packages/flux-renderers-form-advanced/src/condition-builder/ConditionBuilder.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.ts`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field-runtime.ts`
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 高级表单包测试量很大，但仍有若干高复杂度 runtime/投影视图模块没有对应测试文件。
- **建议**: 优先补 `projected-form-runtime`、`variant-field-runtime` 等最容易引入“复杂字段独立状态”回归的模块。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/architecture/renderer-runtime.md`

### [维度14] E2E 中多处关键场景已退化为“页面稳定/元素可见”而非行为断言

- **文件**: `tests/e2e/component-lab/action-logic.spec.ts`, `tests/e2e/component-lab/layout-content.spec.ts`, `tests/e2e/component-lab/data-renderers.spec.ts`, `tests/e2e/component-lab/complex-form.spec.ts`
- **严重程度**: P1
- **类别**: 覆盖缺口
- **现状**: 多个关键场景只断言“stage 仍可见/有交互元素/文本存在”，没有验证 counter 更新、schema 切换、loop item scope、table row/sort、tree-select 选择等目标行为。
- **建议**: 把这些场景升级为真正的行为断言；若当前产品行为未完成，应改为带 `fixme`/专门缺陷用例，而不是长期保留弱断言。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/form-validation.md`

## 测试质量问题

### [维度14] flux-runtime 的入口测试文件同时承担 registry/compiler/runtime-host-scope 多类职责

- **文件**: `packages/flux-runtime/src/index.test.ts:71-514`
- **严重程度**: P2
- **类别**: 跨域
- **现状**: 一个 514 行文件同时覆盖 registry duplicate、schema compile、event/lifecycle extraction、template id、host projection scope。
- **建议**: 按 registry、schema compiler、host projection scope 拆分，避免入口测试继续膨胀。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`

### [维度14] schema-compiler-diagnostics 大文件混合诊断、host action validation 与 standalone adapter

- **文件**: `packages/flux-runtime/src/schema-compiler-diagnostics.test.ts:36-552`
- **严重程度**: P2
- **类别**: 跨域
- **现状**: 同一文件既测 unknown property/namespaced property，又测 host capability validation，再测 standalone validateSchema adapter。
- **建议**: 拆分为 `schema-compiler-diagnostics.test.ts`、`host-action-validation.test.ts`、`validate-schema-adapter.test.ts`。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`, `docs/architecture/flux-runtime-module-boundaries.md`

### [维度14] flux-code-editor 没有接入共享 Vitest workspace 配置，测试执行路径不一致

- **文件**: `vitest.workspace.ts:3-5`, `packages/flux-code-editor/package.json:47`
- **严重程度**: P2
- **类别**: 一致性
- **现状**: workspace 只收集 `packages/*/vitest.config.ts`，而 `flux-code-editor` 有测试脚本和测试文件但没有包级 `vitest.config.ts`，未纳入共享配置模式。
- **建议**: 为 `flux-code-editor` 增加包级 `vitest.config.ts` 并明确 `node/jsdom` 默认环境，统一到 shared config。
- **参考文档**: `AGENTS.md`

## 未发现需要报告的问题

- 未发现 `jest.fn()`/Jest 测试框架混用。
- 未发现 `describe` 嵌套超过 3 层需要单独上报的案例。
- 未发现 `.only`、空测试名或明显顺序依赖需要单独上报的案例。

## 优先级排序的测试改进建议

1. 先补 `flux-runtime` / `flux-formula` / `flux-react` 的直接测试。
2. 把已退化为 smoke 的 E2E 升级为真实行为断言。
3. 拆分超过 400 行的大测试文件。
4. 统一 Vitest 包配置。
5. 为高复用 UI 与 renderer 基础组件建立最小契约测试集。
6. 为基础设施包补轻量 smoke test。
