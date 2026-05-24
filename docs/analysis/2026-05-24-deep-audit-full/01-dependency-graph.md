# 维度 01：依赖图与包边界

## 第 1 轮（初审）

### [维度01-01] `flux-renderers-form-advanced` 的运行时代码依赖 `flux-runtime`，但 manifest 仅放在 `devDependencies`

- **文件**: `packages/flux-renderers-form-advanced/package.json:35-40`; `packages/flux-renderers-form-advanced/src/detail-view/projected-scope.ts:1`
- **证据片段**:
  ```json
  "devDependencies": {
    "@nop-chaos/flux-formula": "workspace:*",
    "@nop-chaos/flux-renderers-basic": "workspace:*",
    "@nop-chaos/flux-renderers-data": "workspace:*",
    "@nop-chaos/flux-runtime": "workspace:*",
    "lucide-react": "^1.7.0",
  ```
  ```ts
  export { createProjectedScopeStore as createProjectedScopeHelpers } from '@nop-chaos/flux-runtime';
  ```
- **严重程度**: P2
- **现状**: `src/detail-view/projected-scope.ts` 是非测试源码，直接从 `@nop-chaos/flux-runtime` root public API re-export `createProjectedScopeStore`，并被 `src/projected-owner-scope.ts` 主路径使用；但 `@nop-chaos/flux-runtime` 在该包 manifest 中只声明为 `devDependencies`。
- **风险**: 该包构建产物会保留对 `@nop-chaos/flux-runtime` 的运行时 import。若该 renderer 包被作为独立包消费、裁剪安装、或进入 facade 之外的组合发布路径，依赖解析可能依赖工作区偶然存在的 dev 依赖，导致打包/运行时缺包或 release manifest 失真。
- **建议**: 将 `@nop-chaos/flux-runtime` 移到 `dependencies`，或改走当前文档认可的 renderer-facing convenience surface `@nop-chaos/flux-react/unstable` 导入 `createProjectedScopeStore/createProjectedScopeHelpers`，从而让 manifest 与实际运行时边界一致。
- **为什么值得现在做**: 这是低成本 manifest/边界收口；不会改变行为，却能避免后续 package facade、按需发布或依赖裁剪时出现隐性缺包。
- **误报排除**: 不是重复报告 `pnpm check:workspace-manifest-deps`，该 hard gate 已通过且只证明“已在某个 manifest 区段声明”；本发现关注的是非测试源码的运行时依赖被放在 devDependencies。也不是把 renderer -> runtime public API 本身当作违规；问题在 manifest 区段与发布运行时依赖不一致。
- **历史模式对应**: 对应 calibration pattern 2 “Public Renderer Dependencies On Core Runtime Packages”需更强证据；本条以生产源码 import + devDependencies 错位作为证据，而非仅以 renderer 依赖 runtime 为问题。
- **参考文档**: `docs/references/audit-tooling.md`; `docs/references/deep-audit-calibration-patterns.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 完整内部依赖图

基于当前 live code 与 `packages/*/package.json` 重建；`dependencies` 为运行时主图，`devDependencies` 仅在备注中列出关键测试/构建依赖。

```text
@nop-chaos/flux-core
  -> 无内部运行时依赖

@nop-chaos/flux-formula
  -> @nop-chaos/flux-core

@nop-chaos/flux-compiler
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-formula

@nop-chaos/flux-action-core
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-compiler

@nop-chaos/flux-runtime
  -> @nop-chaos/flux-action-core
  -> @nop-chaos/flux-compiler
  -> @nop-chaos/flux-formula
  -> @nop-chaos/flux-core

@nop-chaos/flux-i18n
  -> @nop-chaos/flux-core

@nop-chaos/ui
  -> 无 @nop-chaos/* 运行时依赖

@nop-chaos/flux-react
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-formula
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-runtime
  -> @nop-chaos/ui
  dev -> @nop-chaos/flux-compiler

@nop-chaos/flux-renderers-basic
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-react
  -> @nop-chaos/ui
  dev -> @nop-chaos/flux-compiler, @nop-chaos/flux-formula, @nop-chaos/flux-runtime

@nop-chaos/flux-renderers-form
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-react
  -> @nop-chaos/ui
  dev -> @nop-chaos/flux-compiler, @nop-chaos/flux-formula, @nop-chaos/flux-renderers-basic

@nop-chaos/flux-renderers-form-advanced
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-react
  -> @nop-chaos/flux-renderers-form
  -> @nop-chaos/ui
  dev -> @nop-chaos/flux-runtime, @nop-chaos/flux-formula, @nop-chaos/flux-renderers-basic, @nop-chaos/flux-renderers-data
  注意：源码运行时 import 实际使用 @nop-chaos/flux-runtime，见 [维度01-01]

@nop-chaos/flux-renderers-data
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-react
  -> @nop-chaos/ui
  dev -> @nop-chaos/flux-formula, @nop-chaos/flux-runtime, @nop-chaos/flux-compiler, @nop-chaos/flux-renderers-form

@nop-chaos/flux-code-editor
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-formula
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-react
  -> @nop-chaos/flux-renderers-form
  -> @nop-chaos/ui
  dev -> @nop-chaos/flux-renderers-basic, @nop-chaos/flux-renderers-data

@nop-chaos/flux
  peer -> @nop-chaos/ui
  dev/build composition -> @nop-chaos/flux-core, @nop-chaos/flux-i18n, @nop-chaos/flux-formula, @nop-chaos/flux-react,
                           @nop-chaos/flux-renderers-basic, @nop-chaos/flux-renderers-data,
                           @nop-chaos/flux-renderers-form, @nop-chaos/ui

@nop-chaos/flow-designer-core
  -> @nop-chaos/flux-core

@nop-chaos/flow-designer-renderers
  -> @nop-chaos/flow-designer-core
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-react
  -> @nop-chaos/ui
  dev -> @nop-chaos/flux-formula, @nop-chaos/flux-runtime

@nop-chaos/spreadsheet-core
  -> 无内部运行时依赖

@nop-chaos/spreadsheet-renderers
  -> @nop-chaos/spreadsheet-core
  -> @nop-chaos/flux-react
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/ui
  dev -> @nop-chaos/flux-formula, @nop-chaos/flux-runtime

@nop-chaos/report-designer-core
  -> @nop-chaos/flux-core
  -> @nop-chaos/spreadsheet-core

@nop-chaos/report-designer-renderers
  -> @nop-chaos/spreadsheet-core
  -> @nop-chaos/spreadsheet-renderers
  -> @nop-chaos/report-designer-core
  -> @nop-chaos/flux-react
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/ui
  dev -> @nop-chaos/flux-runtime, @nop-chaos/flux-formula

@nop-chaos/word-editor-core
  -> 无 @nop-chaos/* 运行时依赖

@nop-chaos/word-editor-renderers
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/flux-react
  -> @nop-chaos/ui
  -> @nop-chaos/word-editor-core
  dev -> @nop-chaos/flux-runtime, @nop-chaos/flux-formula

@nop-chaos/nop-debugger
  -> @nop-chaos/flux-core
  -> @nop-chaos/flux-formula
  -> @nop-chaos/flux-i18n
  -> @nop-chaos/ui
  dev -> @nop-chaos/flux-react, @nop-chaos/flux-renderers-basic,
         @nop-chaos/flux-renderers-data, @nop-chaos/flux-renderers-form

@nop-chaos/tailwind-preset
  -> 无 @nop-chaos/* 运行时依赖

@nop-chaos/theme-tokens
  -> 无 @nop-chaos/* 运行时依赖
```

## 违规清单

- P2: `[维度01-01]` `@nop-chaos/flux-renderers-form-advanced` 非测试源码运行时 import `@nop-chaos/flux-runtime`，但 manifest 仅放在 `devDependencies`。
- 未发现跨包 `src/` / `dist/` / `internal` 私有路径 import。
- 未发现 `*-core -> *-renderers` 反向运行时依赖。
- 未发现 `spreadsheet-core -> report-designer-core` 反向依赖。
- 未发现内部运行时依赖循环。
- 未发现缺少 `tsconfig.build.json` 或缺少 `build` script 的 package。
- CSS exports 仅 default 的情况与 `pnpm check:package-css-exports` 通过结果一致，本轮不报告为维度 01 问题。

## 合规包清单

以下包在本轮检查范围内未发现新的维度 01 高价值问题：

`@nop-chaos/flux-core`、`@nop-chaos/flux-formula`、`@nop-chaos/flux-compiler`、`@nop-chaos/flux-action-core`、`@nop-chaos/flux-runtime`、`@nop-chaos/flux-i18n`、`@nop-chaos/ui`、`@nop-chaos/flux-react`、`@nop-chaos/flux-renderers-basic`、`@nop-chaos/flux-renderers-form`、`@nop-chaos/flux-renderers-data`、`@nop-chaos/flux-code-editor`、`@nop-chaos/flux`、`@nop-chaos/flow-designer-core`、`@nop-chaos/flow-designer-renderers`、`@nop-chaos/spreadsheet-core`、`@nop-chaos/spreadsheet-renderers`、`@nop-chaos/report-designer-core`、`@nop-chaos/report-designer-renderers`、`@nop-chaos/word-editor-core`、`@nop-chaos/word-editor-renderers`、`@nop-chaos/nop-debugger`、`@nop-chaos/tailwind-preset`、`@nop-chaos/theme-tokens`。

## 总结评估

第 1 轮初审重建了 package manifest 图、源码 import 图、subpath import、exports/build 配置和循环迹象。整体依赖层次与 owner 文档一致；主问题集中在一个 manifest 区段错位，而不是架构方向性循环或私有路径耦合。

`renderers -> flux-core/flux-react/flux-runtime` 的公开 API 依赖按校准规则保持克制，未因公开 API 依赖本身报告。`@nop-chaos/flux-react/unstable` 的使用也与 owner 文档中“renderer-facing convenience surface”说明一致，本轮不作为违规。

## 建议第 2 轮深挖方向

- 重点复查所有 `devDependencies` 中的 `@nop-chaos/*` 是否也被非测试源码 import，确认是否还有类似 `[维度01-01]` 的“已声明但声明区段错误”。
- 对 `@nop-chaos/flux-react/unstable` 使用点做边界抽样：只确认是否都对应 owner 文档列出的 unstable-only examples，不要把 unstable surface 本身机械视为违规。
- 复查 `@nop-chaos/flux` facade 的 bundle composition 是否仍不把内部 packages 暴露为 host-install requirements；主 agent 已提供 `pnpm check:flux-bundle-pack` 通过，本轮不重复报告。

## 深挖第 2 轮追加

### [维度01-02] `flux-code-editor` 运行时代码依赖 `flux-renderers-form`，但 manifest 仅放在 `devDependencies`

- **文件**: `packages/flux-code-editor/package.json:45-48`; `packages/flux-code-editor/src/code-editor-renderer.tsx:3-7`; `packages/flux-code-editor/src/index.ts:4-7`
- **证据片段**:
  ```json
  "devDependencies": {
    "@nop-chaos/flux-renderers-basic": "workspace:*",
    "@nop-chaos/flux-renderers-data": "workspace:*",
    "@nop-chaos/flux-renderers-form": "workspace:*",
  ```
  ```ts
  import type { RendererDefinition, SchemaFieldRule } from '@nop-chaos/flux-core';
  import { t } from '@nop-chaos/flux-i18n';
  import { resolveRendererSlotContent, useRenderScope } from '@nop-chaos/flux-react';
  import { formFieldChromeRules } from '@nop-chaos/flux-renderers-form';
  import { cn } from '@nop-chaos/ui';
  ```
- **严重程度**: P2
- **现状**: `src/code-editor-renderer.tsx` 是非测试生产源码，并被 `src/index.ts` 主入口直接导入；它运行时读取 `@nop-chaos/flux-renderers-form` 的 `formFieldChromeRules`，但该依赖在 `flux-code-editor` manifest 中只声明为 `devDependencies`。
- **风险**: 构建产物会保留对 `@nop-chaos/flux-renderers-form` 的运行时 import。若 `flux-code-editor` 被独立消费、按需发布或裁剪安装，依赖解析会依赖工作区 dev 依赖偶然存在，导致 release manifest 与真实运行时需求不一致。
- **建议**: 将 `@nop-chaos/flux-renderers-form` 移到 `dependencies`；或把 `formFieldChromeRules` 这类跨包共享字段规则下沉到更合适的稳定基础包/公开 surface，再由双方依赖该 surface。
- **为什么值得现在做**: 这是与 `[维度01-01]` 同类的发布 manifest 错位，修复低成本，且能避免独立消费 code-editor 包时出现缺包。
- **误报排除**: 不是重复 `[维度01-01]`，该条涉及 `flux-code-editor -> flux-renderers-form` 的另一处 manifest 区段错位；也不是把 renderer 间公开 API 复用本身当问题，问题在生产源码运行时 import 与 manifest 依赖区段不一致。`pnpm check:workspace-manifest-deps` 只能确认“已声明”，不能区分运行时依赖是否误放在 `devDependencies`。
- **历史模式对应**: 对应 calibration pattern 2/4 的“公开 renderer 依赖需更强证据”门槛；本条以生产入口可达 import + devDependencies 错位作为证据，而非仅以跨 renderer 依赖作为违规。
- **参考文档**: `docs/references/audit-tooling.md`; `docs/references/deep-audit-calibration-patterns.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度01-03] `flux-action-core` 运行时反向依赖 `flux-compiler`，把编译所有权拉入 action 执行层

- **文件**: `packages/flux-action-core/src/action-dispatcher/program-utils.ts:1-8`; `packages/flux-action-core/package.json:15-18`
- **证据片段**:
  ```ts
  import type {
    ActionSchema,
    CompiledActionNode,
    CompiledActionProgram,
    OperationControlConfig,
  } from '@nop-chaos/flux-core';
  import { compileActions } from '@nop-chaos/flux-compiler';
  import type { ActionDispatcherContext } from './types.js';
  ```
  ```json
  "dependencies": {
    "@nop-chaos/flux-core": "workspace:*",
    "@nop-chaos/flux-compiler": "workspace:*"
  }
  ```
- **严重程度**: P1
- **现状**: `flux-action-core` 的生产源码在 action dispatch 路径中直接导入 `@nop-chaos/flux-compiler`，并在 `normalizeCompiledActionProgram()` 内对未编译的 `ActionSchema` 执行 `compileActions(...)`；同时 manifest 将 `flux-compiler` 固化为运行时依赖。
- **风险**: owner 文档把 `compileAction(...) / compileActions(...)` 归属给 `flux-compiler`，而 `flux-action-core` 归属 action execution / selector classification / control-flow。当前实现让执行层承担即时编译职责，使核心运行时执行包必须携带 compiler，后续若要保持“compile-once/runtime execution”边界、裁剪运行时包、或单独复用 action-core，都会被反向耦合阻塞。
- **建议**: 将 “raw `ActionSchema` → `CompiledActionProgram`” 的 fallback 编译移出 `flux-action-core`：由 `flux-runtime`/schema compiler 在进入 dispatcher 前完成编译，或通过 `ActionDispatcherConfig` 注入可选 `compileActions` adapter，使 `flux-action-core` 只消费 `CompiledActionProgram` 与已编译节点；随后移除 `@nop-chaos/flux-compiler` 运行时依赖。
- **误报排除**: 这不是重复已有 `[维度01-01]` / `[维度01-02]` 的 manifest 区段错位；这里的依赖声明本身存在且在 `dependencies` 中，问题是包边界方向与 owner 文档不一致。也不是“flux-runtime 依赖 compiler”的已知允许路径，而是更底层的 `flux-action-core` 在执行层直接依赖 compiler。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/flux-core.md`; `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度01-04] `pnpm audit:deps` 当前仍失败，`flux-react` 主渲染链存在模块循环

- **文件**: `packages/flux-react/src/hooks.ts:24-28`; `packages/flux-react/src/helpers.tsx:14-16`; `packages/flux-react/src/render-nodes.tsx:15-23`; `packages/flux-react/src/node-renderer.tsx:18-25`; `packages/flux-react/src/node-renderer-resolved.tsx:33-40`
- **证据片段**:
  ```ts
  // hooks.ts
  import { createHelpers } from './helpers.js';
  ```
  ```tsx
  // helpers.tsx
  import { RenderNodes } from './render-nodes.js';
  ```
  ```tsx
  // render-nodes.tsx
  import {
    useRendererRuntime,
    useRenderScope,
    useCurrentActionScope,
    useCurrentComponentRegistry,
  } from './hooks.js';
  import { NodeRenderer } from './node-renderer.js';
  ```
- **严重程度**: P1
- **现状**: `pnpm audit:deps` 按 `.dependency-cruiser.cjs` 的 `no-circular` 规则失败；其中 `flux-react` 主渲染链形成 `hooks -> helpers -> render-nodes -> hooks`，并通过 `render-nodes -> node-renderer -> node-renderer-resolved -> helpers/render-nodes/use-node-source-props` 扩展成多条循环。
- **风险**: 这些文件不是测试或边缘模块，而是 renderer runtime 的主入口 hook/helper/render tree。循环会让模块初始化顺序变脆弱，增加拆分 hooks、SSR/测试加载、tree-shaking、以及后续 React runtime refactor 时的回归概率；同时 `frontend-baseline` 已将 `pnpm audit:deps` 记录为 circular/package-boundary 基线，当前失败说明依赖图健康基线不可用。
- **建议**: 优先切断 `hooks -> helpers -> render-nodes -> hooks`：将 `createHelpers` 中需要 `RenderNodes` 的 fragment rendering 依赖改为注入或移到不反向导入 hooks 的独立模块；将 `RenderNodes` 所需 hooks 与通用 helper 拆到单向依赖的 leaf 模块；最后重新运行 `pnpm audit:deps` 确认主渲染链循环消失。
- **误报排除**: 这不是已有 `[维度01-01]` / `[维度01-02]` 的 manifest 问题，也不是类型层面噪声；`dependency-cruiser` 报告的是生产 `.tsx` 值导入循环，且命中主渲染路径。虽然 `pnpm audit:deps` 是 audit 脚本而非默认 CI hard gate，但维度 01 明确要求检查循环依赖迹象，且 `frontend-baseline` 将其列为依赖巡检基线。
- **参考文档**: `.dependency-cruiser.cjs`; `docs/architecture/frontend-baseline.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度01-05] `flux-formula` 表达式求值与 scope helper 存在生产值导入循环

- **文件+行号**: `packages/flux-formula/src/evaluate.ts:13-16,264`; `packages/flux-formula/src/scope.ts:7-8,102-108`
- **证据片段**:
  ```ts
  // evaluate.ts
  import { shallowEqual } from '@nop-chaos/flux-core';
  import { createScopeDependencyCollector } from './scope.js';
  export { createEvalContext, createStateFromNode, evaluateNode };
  // scope.ts
  import { getIn, normalizeRootPath, parsePath } from '@nop-chaos/flux-core';
  import { createEvalContext } from './evaluate.js';
  ```
- **严重程度**: P2
- **现状**: `evaluate.ts` 生产代码值导入 `scope.ts` 的 `createScopeDependencyCollector`，同时 `scope.ts` 值导入 `evaluate.ts` 的 `createEvalContext`。`pnpm audit:deps` 报告 `packages/flux-formula/src/evaluate.ts -> packages/flux-formula/src/scope.ts -> packages/flux-formula/src/evaluate.ts`。
- **风险**: 这是表达式执行基础层的运行时值循环，不是测试或类型噪声。当前函数声明可能暂时可用，但后续把函数改为 const、拆分初始化逻辑、或增加模块级状态时，容易引入 ESM 初始化顺序问题，并持续阻断依赖图审计基线恢复。
- **建议**: 将 `createEvalContext` 与 `createScopeDependencyCollector` 拆到无反向依赖的 leaf 模块，例如 `eval-context.ts` / `scope-dependencies.ts`；`evaluate.ts` 与 `scope.ts` 均只向 leaf 依赖，避免互相导入。
- **误报排除**: 不是已覆盖的 `flux-react` 循环；也不是 type-only cycle。两个文件之间是生产值导入，且位于 `flux-formula` 核心表达式求值路径。
- **参考文档**: `.dependency-cruiser.cjs`; `docs/architecture/flux-core.md`; `docs/architecture/frontend-baseline.md`
- **复核状态**: 未复核

### [维度01-06] `flux-core` foundation contract 类型文件互相导入，形成大量 precompile 依赖环

- **文件+行号**: `packages/flux-core/src/types/actions.ts:1-12`; `packages/flux-core/src/types/schema.ts:1-8`; `packages/flux-core/src/types/runtime.ts:1-27`
- **证据片段**:
  ```ts
  // actions.ts
  import type { ApiSchema, SchemaObject, SchemaValue, SchemaPath } from './schema.js';
  import type { ComponentHandleRegistry, RendererRuntime, RendererEnv } from './renderer.js';
  import type { FormRuntime, PageRuntime, SurfaceRuntime } from './runtime.js';
  import type { CompiledRuntimeValue } from './compilation.js';
  // schema.ts
  import type { ActionSchema, ActionShapeFields } from './actions.js';
  import type { CompileSymbolTable, CompiledRuntimeValue } from './compilation.js';
  ```
- **严重程度**: P2
- **现状**: `pnpm audit:deps` 当前除已覆盖的 `flux-react` 外，还报告大量 `flux-core/src/types/*` 循环，例如 `actions.ts <-> schema.ts`、`actions.ts <-> runtime.ts`、`renderer.ts -> renderer-plugin/hooks/core -> actions/schema/... -> renderer.ts`。
- **风险**: `flux-core` 文档定义为最低层 foundation contracts。当前类型所有权相互穿透会让“核心契约拆分/下沉”越来越困难，并使 dependency-cruiser 的 circular 基线即使修复 `flux-react` 后仍无法恢复。虽为 type-only，但 `tsPreCompilationDeps: true` 已把声明层依赖健康纳入审计范围。
- **建议**: 按所有权拆分契约：将纯 schema primitive、action selector/payload、runtime host ports、renderer registry contracts 分层；避免低层 schema types 反向引用 actions/compiler options；必要时抽出 `action-schema-types.ts`、`runtime-ports.ts`、`renderer-contracts.ts` 等 leaf contract 文件。
- **误报排除**: 不是运行时初始化循环，也不重复 `flux-react` 主渲染链循环；本条关注 `flux-core` 自身 foundation contract 的 precompile 依赖图不可收敛，且由当前 `.dependency-cruiser.cjs` 明确作为 error 检查。
- **参考文档**: `.dependency-cruiser.cjs`; `docs/architecture/flux-core.md`; `docs/architecture/frontend-baseline.md`
- **复核状态**: 未复核

### [维度01-07] `nop-debugger` diagnostics 与 failures 模块互相依赖，调试诊断入口形成生产循环

- **文件+行号**: `packages/nop-debugger/src/diagnostics.ts:17-23`; `packages/nop-debugger/src/diagnostics-failures.ts:13-18`
- **证据片段**:
  ```ts
  // diagnostics.ts
  export {
    getLatestFailedRequest,
    getLatestFailedAction,
    getNodeAnomalies,
    getRecentFailures,
    buildSessionExport,
  } from './diagnostics-failures.js';
  // diagnostics-failures.ts
  import {
    applyEventQuery,
    buildInteractionTrace,
    buildNodeDiagnostics,
    buildOverview,
  } from './diagnostics.js';
  ```
- **严重程度**: P2
- **现状**: `diagnostics.ts` 作为诊断聚合入口 re-export `diagnostics-failures.ts`，但 `diagnostics-failures.ts` 又从 `diagnostics.ts` 导入查询/overview/trace 构建函数。`pnpm audit:deps` 报告 `diagnostics-failures.ts -> diagnostics.ts -> diagnostics-failures.ts`。
- **风险**: 调试器诊断导出面存在运行时值循环；后续若在任一模块加入非函数声明初始化、缓存、默认报告构建或 side-effect 初始化，容易出现 partially initialized binding。它也会在修复更大的循环后继续阻断依赖审计恢复。
- **建议**: 把 `applyEventQuery`、`buildInteractionTrace`、`buildNodeDiagnostics`、`buildOverview` 等公共无状态诊断构建函数拆到 `diagnostics-core.ts` / `diagnostics-query.ts`；`diagnostics.ts` 只做单向 barrel 聚合，`diagnostics-failures.ts` 依赖 leaf helper，不反向依赖入口。
- **误报排除**: 不是测试文件循环，也不是已覆盖的 `flux-react` 循环；两个文件均为 `nop-debugger` 生产源码，且命中 dependency-cruiser `no-circular` error。
- **参考文档**: `.dependency-cruiser.cjs`; `docs/architecture/frontend-baseline.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度01-01]`: 保留（P2）。live manifest 确认 `flux-renderers-form-advanced` 仅在 `devDependencies` 声明 `@nop-chaos/flux-runtime`，而生产源码 `src/detail-view/projected-scope.ts` 值 re-export 并由 `src/projected-owner-scope.ts` 主路径使用。
- `[维度01-02]`: 保留（P2）。live manifest 确认 `flux-code-editor` 仅在 `devDependencies` 声明 `@nop-chaos/flux-renderers-form`，而 `src/code-editor-renderer.tsx` 生产入口值导入 `formFieldChromeRules`，且 `src/index.ts` 直接导入该 renderer。
- `[维度01-03]`: 保留（P1）。live code 确认 `flux-action-core` 在 `dependencies` 中运行时依赖 `flux-compiler`，`program-utils.ts` 值导入 `compileActions`，并在 dispatch 路径把 raw `ActionSchema` 即时编译，和文档中 action execution 与 action precompile ownership 的边界存在实质耦合。
- `[维度01-04]`: 保留（P1）。重新运行 `pnpm audit:deps` 失败，dependency-cruiser 仍报告 `flux-react` 主渲染链多条生产值导入循环，包括 `hooks -> helpers -> render-nodes -> hooks` 及 `render-nodes/node-renderer/node-renderer-resolved` 扩展循环。
- `[维度01-05]`: 保留（P2）。live code 确认 `flux-formula/src/evaluate.ts` 值导入 `createScopeDependencyCollector`，同时 `scope.ts` 值导入 `createEvalContext`，`pnpm audit:deps` 仍报告 `evaluate.ts -> scope.ts -> evaluate.ts`。
- `[维度01-06]`: 保留（P2）。live `flux-core/src/types/*` 仍存在多组 type-only/precompile 循环，`.dependency-cruiser.cjs` 启用 `tsPreCompilationDeps: true` 且 `pnpm audit:deps` 将这些 foundation contract 循环作为 error 报出。
- `[维度01-07]`: 保留（P2）。live code 确认 `diagnostics.ts` re-export `diagnostics-failures.ts`，而 `diagnostics-failures.ts` 值导入 `diagnostics.ts` 的诊断构建函数，`pnpm audit:deps` 仍报告该生产循环。

## 子项复核建议

`[维度01-01]`、`[维度01-02]`、`[维度01-03]`、`[维度01-04]`、`[维度01-05]`、`[维度01-06]`、`[维度01-07]`。这些项均涉及跨包边界、文档-代码边界、P1 循环/耦合或会驱动实际改代码的 manifest/refactor。

## 子项复核结论

- `[维度01-01]`: 子项复核通过（P2）。live manifest 仍将 `@nop-chaos/flux-runtime` 放在 `devDependencies`，生产源码仍从该包值 re-export。
- `[维度01-02]`: 子项复核通过（P2）。`flux-code-editor` 生产入口仍值导入 `@nop-chaos/flux-renderers-form`，但 manifest 仅在 `devDependencies` 声明。
- `[维度01-03]`: 子项复核通过（P1）。`flux-action-core` 仍在运行时依赖 `flux-compiler` 并在 dispatch 路径调用 `compileActions`，与执行层/编译层边界不一致。
- `[维度01-04]`: 子项复核通过（P1）。重新运行 `pnpm audit:deps` 仍失败，且继续报告 `flux-react` 主渲染链生产循环。
- `[维度01-05]`: 子项复核通过（P2）。`flux-formula` 的 `evaluate.ts` 与 `scope.ts` 仍互相值导入，依赖审计仍报告该循环。
- `[维度01-06]`: 子项复核通过（P2）。`flux-core/src/types/*` 仍存在大量 precompile type 循环，且 `.dependency-cruiser.cjs` 明确将其纳入 error。
- `[维度01-07]`: 子项复核通过（P2）。`nop-debugger` 的 `diagnostics.ts` 与 `diagnostics-failures.ts` 仍形成生产值导入循环，依赖审计仍报错。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                                                                         | 摘要                                                                                                                  |
| --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 维度01-01 | P2       | `packages/flux-renderers-form-advanced/package.json`; `packages/flux-renderers-form-advanced/src/detail-view/projected-scope.ts` | `flux-renderers-form-advanced` 生产源码值 re-export `@nop-chaos/flux-runtime`，但 manifest 仅放在 `devDependencies`。 |
| 维度01-02 | P2       | `packages/flux-code-editor/package.json`; `packages/flux-code-editor/src/code-editor-renderer.tsx`                               | `flux-code-editor` 生产入口值导入 `@nop-chaos/flux-renderers-form`，但 manifest 仅放在 `devDependencies`。            |
| 维度01-03 | P1       | `packages/flux-action-core/src/action-dispatcher/program-utils.ts`; `packages/flux-action-core/package.json`                     | `flux-action-core` 运行时依赖 `flux-compiler` 并在 dispatch 路径调用 `compileActions`。                               |
| 维度01-04 | P1       | `packages/flux-react/src/hooks.ts`; `packages/flux-react/src/helpers.tsx`; `packages/flux-react/src/render-nodes.tsx`            | `flux-react` 主渲染链仍存在生产值导入循环，`pnpm audit:deps` 仍失败。                                                 |
| 维度01-05 | P2       | `packages/flux-formula/src/evaluate.ts`; `packages/flux-formula/src/scope.ts`                                                    | `flux-formula` 的 `evaluate.ts` 与 `scope.ts` 仍互相值导入。                                                          |
| 维度01-06 | P2       | `packages/flux-core/src/types/actions.ts`; `packages/flux-core/src/types/schema.ts`; `packages/flux-core/src/types/runtime.ts`   | `flux-core/src/types/*` 仍存在大量 precompile type 循环。                                                             |
| 维度01-07 | P2       | `packages/nop-debugger/src/diagnostics.ts`; `packages/nop-debugger/src/diagnostics-failures.ts`                                  | `nop-debugger` 的 diagnostics 与 failures 模块仍形成生产值导入循环。                                                  |
