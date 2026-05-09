# 01 Dependency Graph

- 深挖轮次: 1
- 深挖发现数: 3

## 第 1 轮初审

### [维度01-01] `flux-react` 仍将仅测试支撑使用的 `flux-compiler` 放在生产依赖

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\package.json:22-35`, `C:\can\nop\nop-chaos-flux\packages\flux-react\src\test-support-runtime.tsx:10-15`, `C:\can\nop\nop-chaos-flux\packages\flux-react\tsconfig.build.json:1-13`
- **行号范围**: `package.json:22-35`; `test-support-runtime.tsx:10-15`; `tsconfig.build.json:1-13`
- **证据片段**:
  ```json
  "dependencies": {
    "@nop-chaos/flux-compiler": "workspace:*",
    "@nop-chaos/flux-core": "workspace:*",
    "@nop-chaos/flux-formula": "workspace:*",
    "@nop-chaos/flux-i18n": "workspace:*",
    "@nop-chaos/flux-runtime": "workspace:*",
    "@nop-chaos/ui": "workspace:*",
  ```
  ```ts
    ScopeRef,
  } from '@nop-chaos/flux-core';
  import { compileDataSource } from '@nop-chaos/flux-compiler';
  import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { createRendererRuntime } from '@nop-chaos/flux-runtime';
  ```
  ```json
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/__tests__", "src/test-support*.tsx"]
  ```
- **严重程度**: P3（可观察）
- **现状**: 当前 live code 中 `@nop-chaos/flux-compiler` 在 `flux-react` 源码内只出现在 `src/test-support-runtime.tsx` 和 `src/__tests__/data-source-and-node-identity.test.tsx`，但 manifest 把它声明为生产 `dependencies`；同时 build 配置明确排除了 `src/test-support*.tsx` 与测试文件。
- **风险**: 依赖图表达比真实生产边界更宽，容易让后续开发误以为 `flux-react` 稳定运行时表面需要直接拥有 compiler，弱化 `flux-compiler -> flux-runtime -> flux-react` 的层次表达。
- **建议**: 复核是否可将 `@nop-chaos/flux-compiler` 从 `dependencies` 移到 `devDependencies`；如 test-support 需要继续作为包内测试工具保留，应保持 build 排除并避免稳定 root surface 依赖 compiler。
- **为什么值得现在做**: 这是低风险 manifest cleanup，可减少维度 01 后续反复报告的噪音，并让生产依赖图更接近实际 build surface。
- **误报排除**: 这不是把 `renderers -> core/runtime` 公开 API 依赖误判为问题；候选点是 `flux-react` 生产 manifest 与实际生产源码使用面不一致。也不是要求移除 test-support 本身，因为 `test-support-runtime.tsx` 仍可保留测试用途。
- **历史模式对应**: 命中 `deep-audit-calibration-patterns.md` 的 “Evolving Intermediate State” 与 “Cross-Package Consistency Ideas” 附近模式，因此降为 P3；历史审计中该项已被降级但 live code 仍存在，`docs/plans/205-doc-boundary-and-test-hardening-closure-plan.md:48-52` 也明确将该收尾排除在外。
- **参考文档**: `AGENTS.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/references/deep-audit-calibration-patterns.md`, `docs/plans/205-doc-boundary-and-test-hardening-closure-plan.md`
- **复核状态**: 未复核

### [维度01-02] `flux-renderers-basic` 的 `flux-formula` 生产依赖只被测试支撑文件使用

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\package.json:15-26`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\test-support.tsx:1-6`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\tsconfig.build.json:12-21`
- **行号范围**: `package.json:15-26`; `test-support.tsx:1-6`; `tsconfig.build.json:12-21`
- **证据片段**:
  ```json
  "dependencies": {
    "@nop-chaos/flux-core": "workspace:*",
    "@nop-chaos/flux-formula": "workspace:*",
    "@nop-chaos/flux-i18n": "workspace:*",
    "@nop-chaos/flux-react": "workspace:*",
    "@nop-chaos/ui": "workspace:*",
  ```
  ```ts
  import { cleanup, render } from '@testing-library/react';
  import { afterEach } from 'vitest';
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import type { ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
  ```
  ```json
  "exclude": [
    "src/**/*.test.ts",
    "src/**/*.test.tsx",
    "src/**/__tests__",
    "src/**/test-support*",
  ```
- **严重程度**: P3（可观察）
- **现状**: `@nop-chaos/flux-formula` 被声明为 `flux-renderers-basic` 的生产 dependency，但当前搜索到的 live source 引用只在 `src/test-support.tsx`，而该文件被 `tsconfig.build.json` 排除在 package build 外。
- **风险**: 基础 renderer 包的生产依赖图被测试支撑工具放宽，后续排查边界时容易误判 basic renderer 运行时需要 formula compiler。
- **建议**: 若生产源码确实不需要公式编译能力，将 `@nop-chaos/flux-formula` 调整到 `devDependencies`；同时保留 `@nop-chaos/flux-core` / `flux-react` / `ui` 等真实生产依赖。
- **为什么值得现在做**: 清理后可减少 renderer 包之间 “看起来比实际更重” 的依赖噪音，且不影响已排除的 test-support build 路径。
- **误报排除**: 已应用 calibration pattern 2：renderer 依赖 `flux-core` / `flux-formula` 的公开 API 本身不是问题；这里保留的原因不是 “renderer 不能依赖 formula”，而是该依赖目前只由 build 排除的 test-support 文件使用。
- **历史模式对应**: 对应历史维度 01 中 “test-only workspace dependencies 位于 production dependencies” 的低严重度 manifest hygiene 模式；按 calibration pattern 10 降级处理，不作为主要 remediation driver。
- **参考文档**: `AGENTS.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度01-03] `flux-renderers-form-advanced` 的部分生产依赖来自测试支撑路径而非生产源码

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\package.json:19-36`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\test-support.tsx:3-9`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\tsconfig.build.json:12-21`
- **行号范围**: `package.json:19-36`; `test-support.tsx:3-9`; `tsconfig.build.json:12-21`
- **证据片段**:
  ```json
  "@nop-chaos/flux-core": "workspace:*",
  "@nop-chaos/flux-i18n": "workspace:*",
  "@nop-chaos/flux-react": "workspace:*",
  "@nop-chaos/flux-formula": "workspace:*",
  "@nop-chaos/flux-renderers-basic": "workspace:*",
  "@nop-chaos/flux-renderers-form": "workspace:*",
  ```
  ```ts
  import { Button } from '@nop-chaos/ui';
  import type { ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { createSchemaRenderer } from '@nop-chaos/flux-react';
  import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
  import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
  ```
  ```json
  "exclude": [
    "src/**/*.test.ts",
    "src/**/*.test.tsx",
    "src/**/__tests__",
    "src/**/test-support*",
  ```
- **严重程度**: P3（可观察）
- **现状**: `flux-renderers-form-advanced` 的生产 manifest 包含 `@nop-chaos/flux-formula` 与 `@nop-chaos/flux-renderers-basic`；当前搜索显示 `flux-formula` 只出现在测试、`__tests__`、以及 `src/test-support.tsx`，`flux-renderers-basic` 也主要用于测试支撑和测试注册，而这些路径被 build exclude 覆盖。`@nop-chaos/flux-renderers-form` 则有生产源码使用，不列为问题。
- **风险**: advanced form renderer 的生产依赖图被测试 harness 扩大，容易掩盖真实生产边界，也会让包边界审计把测试注册依赖误读为 runtime 组合依赖。
- **建议**: 将只服务测试 harness 的 `@nop-chaos/flux-formula` 与可能只服务测试注册的 `@nop-chaos/flux-renderers-basic` 复核后移动到 `devDependencies`；保留生产源码直接使用的 `@nop-chaos/flux-renderers-form`。
- **为什么值得现在做**: 该包测试支撑文件较多，manifest 收窄能降低后续依赖图和循环分析成本，且改动主要是 package manifest 级别。
- **误报排除**: 已排除 `@nop-chaos/flux-renderers-form`，因为 live production files 如 `object-field.tsx`、`tree-controls.tsx`、`tag-list.tsx` 等直接依赖其公开 API。也没有把 renderer 之间的公开复用一概视为问题；本条只针对当前仅测试/测试支撑路径可见的依赖。
- **历史模式对应**: 对应 calibration pattern 4 与 10：跨 renderer 复用不是自动违规，因此本条降为 P3，仅作为 manifest hygiene 观察项。
- **参考文档**: `AGENTS.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 完整依赖图

依赖图基于当前 live `packages/*/package.json` 重建；仅列 `dependencies`、`devDependencies`、`peerDependencies` 中的内部 `@nop-chaos/*` 关系。

```text
@nop-chaos/flux-core
  └─ no internal deps

@nop-chaos/flux-formula
  └─ @nop-chaos/flux-core

@nop-chaos/flux-compiler
  ├─ @nop-chaos/flux-core
  └─ @nop-chaos/flux-formula

@nop-chaos/flux-action-core
  ├─ @nop-chaos/flux-core
  └─ @nop-chaos/flux-compiler

@nop-chaos/flux-runtime
  ├─ @nop-chaos/flux-action-core
  ├─ @nop-chaos/flux-compiler
  ├─ @nop-chaos/flux-formula
  └─ @nop-chaos/flux-core

@nop-chaos/flux-i18n
  └─ @nop-chaos/flux-core

@nop-chaos/ui
  └─ @nop-chaos/flux-i18n

@nop-chaos/flux-react
  ├─ @nop-chaos/flux-compiler
  ├─ @nop-chaos/flux-core
  ├─ @nop-chaos/flux-formula
  ├─ @nop-chaos/flux-i18n
  ├─ @nop-chaos/flux-runtime
  └─ @nop-chaos/ui

@nop-chaos/flux-renderers-basic
  ├─ @nop-chaos/flux-core
  ├─ @nop-chaos/flux-formula
  ├─ @nop-chaos/flux-i18n
  ├─ @nop-chaos/flux-react
  ├─ @nop-chaos/ui
  └─ dev: @nop-chaos/flux-runtime

@nop-chaos/flux-renderers-form
  ├─ @nop-chaos/flux-core
  ├─ @nop-chaos/flux-i18n
  ├─ @nop-chaos/flux-react
  ├─ @nop-chaos/flux-runtime
  ├─ @nop-chaos/flux-formula
  ├─ @nop-chaos/flux-renderers-basic
  ├─ @nop-chaos/ui
  └─ dev: @nop-chaos/flux-compiler

@nop-chaos/flux-renderers-form-advanced
  ├─ @nop-chaos/flux-core
  ├─ @nop-chaos/flux-i18n
  ├─ @nop-chaos/flux-react
  ├─ @nop-chaos/flux-formula
  ├─ @nop-chaos/flux-renderers-basic
  ├─ @nop-chaos/flux-renderers-form
  ├─ @nop-chaos/ui
  └─ dev: @nop-chaos/flux-runtime

@nop-chaos/flux-renderers-data
  ├─ @nop-chaos/flux-core
  ├─ @nop-chaos/flux-formula
  ├─ @nop-chaos/flux-i18n
  ├─ @nop-chaos/flux-react
  ├─ @nop-chaos/flux-renderers-form
  ├─ @nop-chaos/ui
  ├─ dev: @nop-chaos/flux-runtime
  └─ dev: @nop-chaos/flux-compiler

@nop-chaos/flux-code-editor
  ├─ @nop-chaos/flux-core
  ├─ @nop-chaos/flux-formula
  ├─ @nop-chaos/flux-i18n
  ├─ @nop-chaos/flux-react
  ├─ @nop-chaos/ui
  ├─ dev: @nop-chaos/flux-renderers-basic
  ├─ dev: @nop-chaos/flux-renderers-data
  └─ dev: @nop-chaos/flux-renderers-form

@nop-chaos/flow-designer-core
  ├─ @nop-chaos/flux-core
  └─ @nop-chaos/flux-formula

@nop-chaos/flow-designer-renderers
  ├─ @nop-chaos/flow-designer-core
  ├─ @nop-chaos/flux-core
  ├─ @nop-chaos/flux-formula
  ├─ @nop-chaos/flux-i18n
  ├─ @nop-chaos/flux-react
  ├─ @nop-chaos/flux-runtime
  └─ @nop-chaos/ui

@nop-chaos/spreadsheet-core
  └─ no internal deps

@nop-chaos/spreadsheet-renderers
  ├─ @nop-chaos/spreadsheet-core
  ├─ @nop-chaos/flux-formula
  ├─ @nop-chaos/flux-runtime
  ├─ @nop-chaos/flux-react
  ├─ @nop-chaos/flux-core
  ├─ @nop-chaos/flux-i18n
  └─ @nop-chaos/ui

@nop-chaos/report-designer-core
  ├─ @nop-chaos/flux-core
  └─ @nop-chaos/spreadsheet-core

@nop-chaos/report-designer-renderers
  ├─ @nop-chaos/spreadsheet-core
  ├─ @nop-chaos/flux-formula
  ├─ @nop-chaos/spreadsheet-renderers
  ├─ @nop-chaos/report-designer-core
  ├─ @nop-chaos/flux-react
  ├─ @nop-chaos/flux-runtime
  ├─ @nop-chaos/flux-core
  ├─ @nop-chaos/flux-i18n
  └─ @nop-chaos/ui

@nop-chaos/word-editor-core
  └─ no internal deps

@nop-chaos/word-editor-renderers
  ├─ @nop-chaos/flux-core
  ├─ @nop-chaos/flux-i18n
  ├─ @nop-chaos/flux-react
  ├─ @nop-chaos/ui
  ├─ @nop-chaos/word-editor-core
  ├─ dev: @nop-chaos/flux-runtime
  └─ dev: @nop-chaos/flux-formula

@nop-chaos/nop-debugger
  ├─ @nop-chaos/flux-core
  ├─ @nop-chaos/flux-formula
  ├─ @nop-chaos/flux-i18n
  └─ @nop-chaos/ui

@nop-chaos/tailwind-preset
  └─ no internal deps

@nop-chaos/theme-tokens
  └─ no internal deps
```

## 违规清单

1. P3 `[维度01-01]` `@nop-chaos/flux-react` 将仅测试支撑使用的 `@nop-chaos/flux-compiler` 放在生产 `dependencies`。
2. P3 `[维度01-02]` `@nop-chaos/flux-renderers-basic` 将当前只由 `src/test-support.tsx` 使用的 `@nop-chaos/flux-formula` 放在生产 `dependencies`。
3. P3 `[维度01-03]` `@nop-chaos/flux-renderers-form-advanced` 的 `@nop-chaos/flux-formula` / `@nop-chaos/flux-renderers-basic` 依赖主要来自测试支撑路径，生产 manifest 偏宽。

未作为违规报告的已核对项：

- `renderers -> flux-core / flux-formula / flux-runtime / flux-react` 的公开 API 依赖按 calibration pattern 2 不自动视为问题。
- `@nop-chaos/flux-react/unstable` 是 `packages/flux-react/package.json` 明确导出的子路径，并由 `docs/architecture/flux-runtime-module-boundaries.md:435-447` 说明，不视为跨包内部路径导入。
- `@nop-chaos/ui/chart`、`@nop-chaos/ui/lib/utils`、CSS 子路径、locale 子路径均有 package exports 或 workspace alias 支撑；本轮未发现 private `src` 子路径 import。
- `report-designer-renderers -> spreadsheet-renderers` 属于 calibration pattern 4 中需要更强证据的共享 renderer 复用；当前有 package manifest 声明与公开 exports，不作为问题。
- `spreadsheet-core` 未依赖 `report-designer-core`，满足反向边界规则。
- `tailwind-preset` 与 `theme-tokens` 未依赖运行时包。

## 合规包清单

以下包在本轮维度 01 初审中未发现需报告的包边界问题：

- `C:\can\nop\nop-chaos-flux\packages\flux-core`
- `C:\can\nop\nop-chaos-flux\packages\flux-formula`
- `C:\can\nop\nop-chaos-flux\packages\flux-compiler`
- `C:\can\nop\nop-chaos-flux\packages\flux-action-core`
- `C:\can\nop\nop-chaos-flux\packages\flux-runtime`
- `C:\can\nop\nop-chaos-flux\packages\flux-i18n`
- `C:\can\nop\nop-chaos-flux\packages\ui`
- `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form`
- `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data`
- `C:\can\nop\nop-chaos-flux\packages\flux-code-editor`
- `C:\can\nop\nop-chaos-flux\packages\flow-designer-core`
- `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers`
- `C:\can\nop\nop-chaos-flux\packages\spreadsheet-core`
- `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers`
- `C:\can\nop\nop-chaos-flux\packages\report-designer-core`
- `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers`
- `C:\can\nop\nop-chaos-flux\packages\word-editor-core`
- `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers`
- `C:\can\nop\nop-chaos-flux\packages\nop-debugger`
- `C:\can\nop\nop-chaos-flux\packages\tailwind-preset`
- `C:\can\nop\nop-chaos-flux\packages\theme-tokens`

带 P3 manifest hygiene 观察项但无硬性边界违规的包：

- `C:\can\nop\nop-chaos-flux\packages\flux-react`
- `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic`
- `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced`

## 总结评估

本轮基于 live code 重建依赖图后，未发现 P0/P1 级别的包边界破坏、循环依赖、`*-core -> *-renderers` 反向依赖、`spreadsheet-core -> report-designer-core` 反向依赖、运行时包污染 `tailwind-preset` / `theme-tokens`、或未声明的跨包私有 `src` 导入。

主要剩余问题是低严重度 manifest hygiene：若某些 workspace 依赖只服务测试或 test-support，而 build 已明确排除这些文件，生产 `dependencies` 可进一步收窄。此类问题不影响当前运行正确性，但会增加依赖图噪音，建议作为后续低风险 cleanup 批量处理。

## 深挖第 2 轮追加

### [维度01-04] `flux-renderers-form` 的 `flux-formula` / `flux-renderers-basic` 生产依赖仅由测试路径使用

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\package.json:20-39`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\__tests__\form-test-support.tsx:11-20`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\__tests__\slot-classname.test.tsx:4-8`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\tsconfig.build.json:12-21`
- **行号范围**: `package.json:20-39`; `form-test-support.tsx:11-20`; `slot-classname.test.tsx:4-8`; `tsconfig.build.json:12-21`
- **证据片段**:
  ```json
  "@nop-chaos/flux-runtime": "workspace:*",
  "@nop-chaos/flux-formula": "workspace:*",
  "@nop-chaos/flux-renderers-basic": "workspace:*",
  "@nop-chaos/ui": "workspace:*",
  ```
  ```ts
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import {
    useAggregateError,
    useCurrentForm,
    useCurrentFormState,
  ```
  ```ts
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { createSchemaRenderer } from '@nop-chaos/flux-react';
  import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
  import { formRendererDefinitions } from '../index.js';
  ```
- **严重程度**: P3（可观察）
- **现状**: `flux-renderers-form` 的生产 manifest 声明了 `@nop-chaos/flux-formula` 与 `@nop-chaos/flux-renderers-basic`，但当前源码搜索显示二者只出现在 `src/__tests__` 和测试支撑路径；`tsconfig.build.json` 排除了测试目录与 test-support 模式。`@nop-chaos/flux-runtime` 有生产文件使用，不列入本条。
- **风险**: form renderer 的生产依赖图被测试注册和测试编译器需求放宽，后续依赖图审计会误以为基础表单渲染器运行时必须组合 basic renderers 与 formula compiler。
- **建议**: 复核后将 `@nop-chaos/flux-formula` 与 `@nop-chaos/flux-renderers-basic` 移到 `devDependencies`，保留生产源码实际使用的 `flux-core` / `flux-i18n` / `flux-react` / `flux-runtime` / `ui`。
- **为什么值得现在做**: 该包是 form 层基础包，依赖图噪音会向 data、advanced、code-editor 等包的边界判断继续传导；manifest cleanup 成本低。
- **误报排除**: 不是把 renderer 复用 basic renderer 一概判错；本条只针对当前 live production files 未引用、且 build exclude 覆盖的测试用途依赖。
- **历史模式对应**: 对应 `deep-audit-calibration-patterns.md` pattern 2 / 10，按 manifest hygiene 降为 P3；与已有 `[维度01-02]`、`[维度01-03]` 是同族但不同包的新残留。
- **参考文档**: `AGENTS.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度01-05] `flux-renderers-data` 的 `flux-formula` / `flux-renderers-form` 生产依赖来自测试支撑路径

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\package.json:15-36`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\test-support.tsx:1-17`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\schema-validator.test.ts:1-5`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\tsconfig.build.json:1-13`
- **行号范围**: `package.json:15-36`; `test-support.tsx:1-17`; `schema-validator.test.ts:1-5`; `tsconfig.build.json:1-13`
- **证据片段**:
  ```json
  "@nop-chaos/flux-formula": "workspace:*",
  "@nop-chaos/flux-i18n": "workspace:*",
  "@nop-chaos/flux-react": "workspace:*",
  "@nop-chaos/flux-renderers-form": "workspace:*",
  ```
  ```ts
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
  import {
    createSchemaRenderer,
    useCurrentComponentRegistry,
  ```
  ```json
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/__tests__", "src/test-support*.tsx"]
  ```
- **严重程度**: P3（可观察）
- **现状**: `@nop-chaos/flux-formula` 与 `@nop-chaos/flux-renderers-form` 位于 `flux-renderers-data` 生产 `dependencies`，但当前引用分别只在 `schema-validator.test.ts` / `test-support.tsx`，后者也被 build exclude 覆盖。`flux-compiler` 已在 devDependencies，处理方式反而更准确。
- **风险**: data renderer 包的生产边界被测试 harness 扩大，容易把“测试组合 form renderer 以构造场景”误读成数据渲染器运行时依赖表单渲染器。
- **建议**: 将 `@nop-chaos/flux-formula` 与 `@nop-chaos/flux-renderers-form` 复核后移动到 `devDependencies`；保留 `flux-core` / `flux-react` / `flux-i18n` / `ui` 等生产源码直接使用依赖。
- **为什么值得现在做**: data 包是高复用 renderer 包，收窄 manifest 能减少 renderer 间耦合误判，并与该包已把 `flux-compiler` 放 devDependencies 的做法保持一致。
- **误报排除**: 不是否定 renderer 包之间可共享公开 API；当前证据点是生产源码没有引用该 cross-renderer dependency，只有测试支撑引用。
- **历史模式对应**: 命中 calibration pattern 4 / 10，按低风险 manifest hygiene 观察项处理。
- **参考文档**: `AGENTS.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度01-06] `flow-designer-renderers` 的 `flux-formula` / `flux-runtime` 生产依赖只在测试与测试支撑中可见

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\package.json:30-42`, `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\index-test-support.tsx:1-5`, `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page.resolved-props.test.ts:1-6`, `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\tsconfig.build.json:12-21`
- **行号范围**: `package.json:30-42`; `index-test-support.tsx:1-5`; `designer-page.resolved-props.test.ts:1-6`; `tsconfig.build.json:12-21`
- **证据片段**:
  ```json
  "@nop-chaos/flux-formula": "workspace:*",
  "@nop-chaos/flux-i18n": "workspace:*",
  "@nop-chaos/flux-react": "workspace:*",
  "@nop-chaos/flux-runtime": "workspace:*",
  ```
  ```ts
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { createRendererEnv, createTestConfig, ensureResizeObserverMock } from './test-support.js';
  ```
  ```ts
  import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { createRendererRuntime } from '@nop-chaos/flux-runtime';
  import { flowDesignerRendererDefinitions } from './index.js';
  ```
- **严重程度**: P3（可观察）
- **现状**: `flow-designer-renderers` 生产 `dependencies` 包含 `@nop-chaos/flux-formula` 与 `@nop-chaos/flux-runtime`；当前搜索命中显示二者仅在 `.test.*` 和 `index-test-support.tsx` 这类测试路径出现，build 配置排除测试与 test-support 模式。
- **风险**: Flow Designer renderer 的生产 manifest 暗示其运行时直接需要 formula/runtime 组装能力，削弱 `flux-react` 作为 renderer-facing host surface 的边界表达。
- **建议**: 复核生产源码确无引用后，将 `@nop-chaos/flux-formula` 与 `@nop-chaos/flux-runtime` 移到 `devDependencies`；保留真实生产依赖 `flow-designer-core`、`flux-core`、`flux-react`、`flux-i18n`、`ui`。
- **为什么值得现在做**: 该包已有公开 `./unstable` 子路径，边界本身较复杂；减少 manifest 噪音有助于后续区分稳定 renderer surface 与测试 runtime assembly。
- **误报排除**: `flow-designer-renderers -> flow-designer-core` 和 `flux-react/unstable` 已有文档支撑，不作为问题；本条只针对测试-only runtime/formula 依赖声明。
- **历史模式对应**: 对应 calibration pattern 2、5、10；降为 P3，不作为核心架构违规。
- **参考文档**: `AGENTS.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度01-07] `spreadsheet-renderers` 的 `flux-formula` / `flux-runtime` 生产依赖当前只由集成测试使用

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\package.json:20-31`, `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\__tests__\schema-integration.test.tsx:1-18`, `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\tsconfig.build.json:12-21`
- **行号范围**: `package.json:20-31`; `schema-integration.test.tsx:1-18`; `tsconfig.build.json:12-21`
- **证据片段**:
  ```json
  "@nop-chaos/spreadsheet-core": "workspace:*",
  "@nop-chaos/flux-formula": "workspace:*",
  "@nop-chaos/flux-runtime": "workspace:*",
  "@nop-chaos/flux-react": "workspace:*",
  ```
  ```ts
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import {
    createSchemaRenderer,
    createDefaultRegistry,
    useScopeSelector,
  } from '@nop-chaos/flux-react';
  import { createActionScope } from '@nop-chaos/flux-runtime';
  ```
- **严重程度**: P3（可观察）
- **现状**: `spreadsheet-renderers` 的 production manifest 声明 `@nop-chaos/flux-formula` 与 `@nop-chaos/flux-runtime`，但当前搜索仅在 `src/__tests__/schema-integration.test.tsx` 命中，且 build exclude 排除了 `src/**/__tests__`。
- **风险**: spreadsheet renderer 包看起来比真实生产 surface 更重，容易让下游误判 spreadsheet 渲染层必须直接拥有 runtime assembly / formula compiler。
- **建议**: 将 `@nop-chaos/flux-formula` 与 `@nop-chaos/flux-runtime` 复核后移动到 `devDependencies`；保留 `spreadsheet-core`、`flux-core`、`flux-react`、`flux-i18n`、`ui` 等生产依赖。
- **为什么值得现在做**: spreadsheet-renderers 被 report-designer-renderers 复用，manifest 噪音会沿跨 domain renderer 复用链传播。
- **误报排除**: 不是把 `report-designer-renderers -> spreadsheet-renderers` 复用视为违规；本条只针对 spreadsheet 包自身测试-only 的 runtime/formula 依赖。
- **历史模式对应**: 对应 calibration pattern 4 / 10 的跨包一致性与共享 renderer 复用降级模式。
- **参考文档**: `AGENTS.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度01-08] `report-designer-renderers` 的 `flux-formula` / `flux-runtime` 生产依赖只在测试文件中使用

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\package.json:20-31`, `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\renderers.integration.test.tsx:1-16`, `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\tsconfig.build.json:12-21`
- **行号范围**: `package.json:20-31`; `renderers.integration.test.tsx:1-16`; `tsconfig.build.json:12-21`
- **证据片段**:
  ```json
  "@nop-chaos/spreadsheet-core": "workspace:*",
  "@nop-chaos/flux-formula": "workspace:*",
  "@nop-chaos/spreadsheet-renderers": "workspace:*",
  "@nop-chaos/report-designer-core": "workspace:*",
  "@nop-chaos/flux-react": "workspace:*",
  "@nop-chaos/flux-runtime": "workspace:*",
  ```
  ```ts
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import {
    createSchemaRenderer,
    createDefaultRegistry,
    useScopeSelector,
  } from '@nop-chaos/flux-react';
  import { createActionScope } from '@nop-chaos/flux-runtime';
  ```
- **严重程度**: P3（可观察）
- **现状**: `report-designer-renderers` production dependencies 包含 `@nop-chaos/flux-formula` 与 `@nop-chaos/flux-runtime`；当前命中均在测试文件，如 `renderers.integration.test.tsx`、toolbar/inspector/field-panel 测试，build exclude 覆盖 `.test.tsx`。
- **风险**: 报表设计器 renderer 的生产边界被集成测试 runtime harness 放宽，后续会把测试用 SchemaRenderer 组装误读为运行时依赖需求。
- **建议**: 复核无生产源码引用后，把 `@nop-chaos/flux-formula` 与 `@nop-chaos/flux-runtime` 移到 `devDependencies`；保留 domain core、spreadsheet renderer、flux-react、flux-core、flux-i18n、ui 等真实依赖。
- **为什么值得现在做**: 该包处在 report-designer 与 spreadsheet-renderers 的跨域复用链上，manifest 收窄可减少维度 01 后续循环分析成本。
- **误报排除**: 已避开 calibration pattern 4 的常见误报：`report-designer-renderers -> spreadsheet-renderers` 本身有 manifest 与 exports 支撑，不报告；本条仅报告测试-only runtime/formula 依赖。
- **历史模式对应**: 对应 `deep-audit-calibration-patterns.md` pattern 4 / 10，按 P3 hygiene 处理。
- **参考文档**: `AGENTS.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度01-09] `flow-designer-core` 声明了当前源码未使用的 `flux-formula` 生产依赖

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\package.json:21-26`, `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\types.ts:1-3`
- **行号范围**: `package.json:21-26`; `types.ts:1-3`
- **证据片段**:

  ```json
  "dependencies": {
    "@nop-chaos/flux-core": "workspace:*",
    "@nop-chaos/flux-formula": "workspace:*",
    "elkjs": "^0.11.1",
    "zustand": "^5.0.12"
  }
  ```

  ```ts
  import type { ActionSchema, DomainHostStatusSummary, SchemaInput } from '@nop-chaos/flux-core';

  export interface GraphDocument {
  ```

- **严重程度**: P3（可观察）
- **现状**: `flow-designer-core` manifest 声明 `@nop-chaos/flux-formula`，但当前 `src` 搜索未发现任何 `@nop-chaos/flux-formula` import；可见内部 Flux 依赖只有 `types.ts` 对 `flux-core` 类型的引用。
- **风险**: domain core 包的生产依赖图包含未使用依赖，会让核心层看起来需要公式编译能力，增加后续判断 core/renderers 边界时的噪音。
- **建议**: 复核是否存在非 import 方式的隐式使用；若没有，移除 `@nop-chaos/flux-formula` 依赖声明。
- **为什么值得现在做**: 这是纯 manifest cleanup，且 `flow-designer-core` 是 renderer 包的上游核心包，收窄后依赖图更容易解释。
- **误报排除**: 不是要求 `flow-designer-core` 不能依赖 `flux-formula`；若未来核心表达式能力需要公式 API 可以重新声明。本条仅基于当前 live source 未使用。
- **历史模式对应**: 命中 calibration pattern 5 / 10 的演进中间态与一致性清理模式，因此降为 P3。
- **参考文档**: `AGENTS.md`, `docs/architecture/flow-designer/design.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度01-10] `flux-renderers-form-advanced` 测试依赖未在 package exports 声明的 `flux-renderers-form/test-support` 子路径

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\__tests__\form-runtime-fields.test.tsx:4-10`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\package.json:11-18`, `C:\can\nop\nop-chaos-flux\vite.workspace-alias.ts:37-41`
- **行号范围**: `form-runtime-fields.test.tsx:4-10`; `package.json:11-18`; `vite.workspace-alias.ts:37-41`
- **证据片段**:
  ```ts
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
  import { createSchemaRenderer } from '@nop-chaos/flux-react';
  import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
  import { formAdvancedRendererDefinitions } from '../index.js';
  import { buttonRenderer, env, submitCalls } from '@nop-chaos/flux-renderers-form/test-support';
  ```
  ```json
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./form-renderers.css": {
      "default": "./dist/form-renderers.css"
    }
  ```
  ```ts
  '@nop-chaos/flux-renderers-form/test-support': fileURLToPath(
    new URL('./packages/flux-renderers-form/src/test-support.tsx', import.meta.url),
  ),
  '@nop-chaos/flux-renderers-form': fileURLToPath(
    new URL('./packages/flux-renderers-form/src/index.tsx', import.meta.url),
  ```
- **严重程度**: P2
- **现状**: `flux-renderers-form-advanced` 有多处测试直接导入 `@nop-chaos/flux-renderers-form/test-support`，但 `flux-renderers-form` 的 package `exports` 只声明 root 与 CSS 子路径；该测试子路径仅靠 `tsconfig.base.json` / `vite.workspace-alias.ts` 的 workspace alias 指到 `src/test-support.tsx`。
- **风险**: 这形成了绕过 package manifest 的跨包私有测试 API。当前仓库内测试能通过 alias 解析，但真实 package boundary 并不承认该子路径；一旦测试配置、workspace alias、或外部消费者按 package exports 解析，测试支撑依赖会失效，同时也会让后续包边界审计误以为该子路径是稳定公开面。
- **建议**: 二选一收口：如果跨包复用 test support 是有意契约，则在 `packages/flux-renderers-form/package.json` 明确导出 `./test-support` 并保证 build 产物存在；如果只是私有测试实现，则把 advanced 包测试所需 helper 下沉/复制到本包测试支撑，或改为通过已公开 root API 组装。
- **为什么值得现在做**: 前两轮已经暴露多个 test-support 扩大 manifest 的问题；这条是同一盲区下更具体的“alias 可用但 package exports 不承认”的真实边界缺口，后续迁移测试解析或发布包时会变成硬失败。
- **误报排除**: 这不是 `@nop-chaos/flux-react/unstable` 一类已由 package exports 和架构文档承认的子路径；`flux-renderers-form/package.json` 没有 `./test-support`，且该路径指向 `src/test-support.tsx` 再 re-export `src/__tests__` 内部 helper，因此不是稳定公开 API。
- **历史模式对应**: 对应 `deep-audit-calibration-patterns.md` 的 “Unwired Or Non-Barrel Code Treated As Dead Code” 与 “Evolving Intermediate State” 附近模式；这里不报告死代码，而报告 live test import 与 manifest exports 不一致的包边界缺陷。
- **参考文档**: `docs/skills/deep-audit-prompts.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/references/deep-audit-calibration-patterns.md`, `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- **复核状态**: 未复核
