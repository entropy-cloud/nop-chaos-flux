# 维度 01：依赖图与包边界

## 第 1 轮（初审）

### [维度01-01] `flux-runtime` 直接吸入 `flux-compiler` 与 `flux-action-core`，突破既定运行时边界

- **文件**: `packages/flux-runtime/package.json:15-20`; `packages/flux-runtime/src/runtime-factory.ts:25-29`
- **证据片段**:
  ```ts
  "dependencies": {
    "@nop-chaos/flux-action-core": "workspace:*",
    "@nop-chaos/flux-compiler": "workspace:*",
    "@nop-chaos/flux-formula": "workspace:*",
    "@nop-chaos/flux-core": "workspace:*",
  import { createSchemaCompiler } from '@nop-chaos/flux-compiler';
  import { createCompiledCidState } from '@nop-chaos/flux-core';
  import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
  import type { FormulaRegistry } from '@nop-chaos/flux-formula';
  import { createActionDispatcher } from '@nop-chaos/flux-action-core';
  ```
- **严重程度**: P2
- **现状**: `@nop-chaos/flux-runtime` 的主包清单与主装配入口都直接依赖 `@nop-chaos/flux-compiler`、`@nop-chaos/flux-action-core`，而不是仅停留在 `flux-core`/`flux-formula`。
- **风险**: 运行时主包变成“编译+动作分发+运行时装配”混合边界，后续会放大发布面、测试面和 owner 归属漂移；任何依赖 `flux-runtime` 的上层包也会被动绑定 compiler / action-core 变更。
- **建议**: 把“默认 compiler / dispatcher 装配”抽到更上层 facade / assembly 包，或改为由调用方注入；把 `flux-runtime` 收缩回仅依赖 `flux-core`、`flux-formula` 的边界。
- **为什么值得现在做**: 这是 live main-path 结构，不是未接线草稿；在 v1 / 无兼容负担基线下，继续保留会把当前混合边界固化成事实标准。
- **误报排除**: 这不是 calibration 中“renderers 合法依赖 core/runtime 公共 API”的噪声；这里是 `flux-runtime` 主包本身越层依赖，且 manifest 与运行时代码双重落地，不是理想层级图误读。
- **历史模式对应**: `docs/references/deep-audit-calibration-patterns.md` 的 Pattern 2 不适用；Pattern 5 在本次 v1 基线下不能用“中间态”降级。`docs/references/reopened-design-decisions-and-audit-adjudications.md` 无同类已裁定豁免。
- **参考文档**: `AGENTS.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度01-02] `report-designer-renderers` 测试源文件使用了未声明的 `flux-runtime`

- **文件**: `packages/report-designer-renderers/package.json:20-34`; `packages/report-designer-renderers/src/renderers.integration.test.tsx:5-13`
- **证据片段**:
  ```ts
  import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import {
    createSchemaRenderer,
    createDefaultRegistry,
    useScopeSelector,
  } from '@nop-chaos/flux-react';
  import { createActionScope } from '@nop-chaos/flux-runtime';
  import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
  ```
- **严重程度**: P3
- **现状**: 该测试直接导入 `@nop-chaos/flux-runtime`，但 `package.json` 的 `dependencies` / `devDependencies` 中都未声明它。
- **风险**: 当前 workspace/hoist 可能掩盖问题，但在更严格安装模式、包级隔离测试、未来拆包发布或 PnP 环境下会出现不可重现的测试依赖缺口。
- **建议**: 将 `@nop-chaos/flux-runtime` 明确加入 `devDependencies`；若这是设计上不应出现的测试耦合，则改用本包公开测试支撑层替代。
- **为什么值得现在做**: 这是低成本修复的 manifest 真实缺口；越晚处理，越容易在 CI / 安装策略切换时变成“偶发失败”。
- **误报排除**: 不是风格问题，也不是“未导出源码属于死代码”类误报；这里是活跃测试入口的真实 import 与 manifest 不一致。
- **历史模式对应**: 不属于 reopened adjudications 的已裁定问题；也不属于 calibration 中的跨域 renderer 复用噪声。
- **参考文档**: `AGENTS.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 依赖图

基于 `packages/*/package.json` 的 `dependencies + peerDependencies`：

- `@nop-chaos/flow-designer-core` -> `@nop-chaos/flux-core`
- `@nop-chaos/flow-designer-renderers` -> `@nop-chaos/flow-designer-core`, `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui`
- `@nop-chaos/flux` -> `@nop-chaos/ui`
- `@nop-chaos/flux-action-core` -> `@nop-chaos/flux-compiler`, `@nop-chaos/flux-core`
- `@nop-chaos/flux-code-editor` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-formula`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui`
- `@nop-chaos/flux-compiler` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-formula`
- `@nop-chaos/flux-core` -> `(none)`
- `@nop-chaos/flux-formula` -> `@nop-chaos/flux-core`
- `@nop-chaos/flux-i18n` -> `@nop-chaos/flux-core`
- `@nop-chaos/flux-react` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-formula`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-runtime`, `@nop-chaos/ui`
- `@nop-chaos/flux-renderers-basic` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui`
- `@nop-chaos/flux-renderers-data` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui`
- `@nop-chaos/flux-renderers-form` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/flux-runtime`, `@nop-chaos/ui`
- `@nop-chaos/flux-renderers-form-advanced` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/flux-renderers-form`, `@nop-chaos/ui`
- `@nop-chaos/flux-runtime` -> `@nop-chaos/flux-action-core`, `@nop-chaos/flux-compiler`, `@nop-chaos/flux-core`, `@nop-chaos/flux-formula`
- `@nop-chaos/nop-debugger` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-formula`, `@nop-chaos/flux-i18n`, `@nop-chaos/ui`
- `@nop-chaos/report-designer-core` -> `@nop-chaos/flux-core`, `@nop-chaos/spreadsheet-core`
- `@nop-chaos/report-designer-renderers` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/report-designer-core`, `@nop-chaos/spreadsheet-core`, `@nop-chaos/spreadsheet-renderers`, `@nop-chaos/ui`
- `@nop-chaos/spreadsheet-core` -> `(none)`
- `@nop-chaos/spreadsheet-renderers` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/spreadsheet-core`, `@nop-chaos/ui`
- `@nop-chaos/tailwind-preset` -> `(none)`
- `@nop-chaos/theme-tokens` -> `(none)`
- `@nop-chaos/ui` -> `(none)`
- `@nop-chaos/word-editor-core` -> `(none)`
- `@nop-chaos/word-editor-renderers` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui`, `@nop-chaos/word-editor-core`

补充核查结论：

- 未发现包级 SCC / 循环依赖
- 未发现 `@nop-chaos/*/src/*` 跨包内部路径 import
- 未发现源码中使用 `@nop-chaos/*/dist/*`
- 发现的跨包子路径 import 均落在已声明导出面上：`@nop-chaos/flux-react/unstable`、`@nop-chaos/ui/chart`、`@nop-chaos/flux-renderers-form/definitions`、`@nop-chaos/flux-renderers-form/test-support`

## 违规清单

- `@nop-chaos/flux-runtime`：违反本次审计规则中“`flux-runtime` 只能依赖 `flux-core` 和 `flux-formula`”
- `@nop-chaos/report-designer-renderers`：测试文件存在未声明的 `@nop-chaos/flux-runtime` 依赖

## 合规的包清单

- `@nop-chaos/flow-designer-core`
- `@nop-chaos/flow-designer-renderers`
- `@nop-chaos/flux`
- `@nop-chaos/flux-action-core`
- `@nop-chaos/flux-code-editor`
- `@nop-chaos/flux-compiler`
- `@nop-chaos/flux-core`
- `@nop-chaos/flux-formula`
- `@nop-chaos/flux-i18n`
- `@nop-chaos/flux-react`
- `@nop-chaos/flux-renderers-basic`
- `@nop-chaos/flux-renderers-data`
- `@nop-chaos/flux-renderers-form`
- `@nop-chaos/flux-renderers-form-advanced`
- `@nop-chaos/nop-debugger`
- `@nop-chaos/report-designer-core`
- `@nop-chaos/spreadsheet-core`
- `@nop-chaos/spreadsheet-renderers`
- `@nop-chaos/tailwind-preset`
- `@nop-chaos/theme-tokens`
- `@nop-chaos/ui`
- `@nop-chaos/word-editor-core`
- `@nop-chaos/word-editor-renderers`

## 总结评估

本轮维度 01 审计中，主问题不是 cross-package internal path 或循环，而是：

1. `flux-runtime` 的 live 依赖边界已实质扩张到 compiler/action-core；
2. 个别包的测试 manifest 依赖声明不完整。

其余规则项整体较干净：未见 `*-core -> *-renderers` 反向依赖、未见 `spreadsheet-core -> report-designer-core`、未见 `ui`/`tailwind-preset`/`theme-tokens` 对 runtime 包耦合、未见内部源码路径穿透。

## 维度复核结论

- [维度01-01]: 驳回。现行 owner 文档与 `AGENTS.md` 都把 `flux-runtime` 定义为运行时装配层，允许位于 `flux-action-core` 与 `flux-react` 之间；当前依赖并非未文档化越层。
- [维度01-02]: 保留 (P3)。`report-designer-renderers` 的测试源码直接导入 `@nop-chaos/flux-runtime`，但 manifest 未声明该依赖，属于真实的 workspace manifest 缺口。

## 子项复核结论

本维度无需要继续逐条复核的条目。

## 最终保留项

| 编号  | 严重程度 | 文件                                                    | 一句话摘要                                                  |
| ----- | -------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| 01-02 | P3       | `packages/report-designer-renderers/package.json:20-34` | 测试源码导入 `@nop-chaos/flux-runtime` 但未在 manifest 声明 |
