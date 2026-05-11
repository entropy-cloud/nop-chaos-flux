# 维度 01：依赖图与包边界

## 第 1 轮（初审）

### [维度01-01] `flux-renderers-form/test-support` 形成 workspace-only 的跨包测试入口

- **文件**: `packages/flux-renderers-form/package.json:11-18`, `packages/flux-renderers-form/tsconfig.build.json:12-21`, `vite.workspace-alias.ts:37-39`, `packages/flux-renderers-form-advanced/src/__tests__/form-runtime-fields.test.tsx:7-10`
- **证据片段**:
  ```ts
  // package.json
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./form-renderers.css": { "default": "./dist/form-renderers.css" }
  }
  // vite.workspace-alias.ts
  '@nop-chaos/flux-renderers-form/test-support': fileURLToPath(
    new URL('./packages/flux-renderers-form/src/test-support.tsx', import.meta.url),
  ),
  ```
- **严重程度**: P2
- **现状**: `@nop-chaos/flux-renderers-form/test-support` 未进入 package `exports`，构建也排除了 test-support，但其他包测试通过 workspace alias 直接跨包导入。
- **风险**: 该入口离开 monorepo alias 后不可解析，测试边界与真实发布面不一致，后续更容易继续扩散为隐式测试契约。
- **建议**: 在“公开 test subpath / 独立 test-support 包 / 改回包内相对路径”三种方案里选一个显式收口，不再依赖隐藏 alias。
- **为什么值得现在做**: 当前已被多处高级表单测试依赖，继续放任会放大后续清理半径。
- **误报排除**: 这不是正常的公开 API 依赖；问题点是“未导出子路径 + 构建排除 + workspace alias 托底”的组合。
- **历史模式对应**: 跨包测试支撑面通过 monorepo 基础设施隐式暴露。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度01-02] `flux-react` 测试真实依赖 `flux-renderers-form`，但 manifest 未声明

- **文件**: `packages/flux-react/src/__tests__/schema-renderer.test.tsx:11-14`, `packages/flux-react/package.json:22-35`
- **证据片段**:
  ```ts
  import { createRendererRuntime } from '@nop-chaos/flux-runtime';
  import { env, pageRenderer, textRenderer } from '../test-support-core.js';
  import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
  import { createDefaultRegistry } from '../defaults.js';
  ```
- **严重程度**: P2
- **现状**: `flux-react` 包内测试直接导入 `@nop-chaos/flux-renderers-form`，但 `package.json` 中没有对应 `devDependencies`。
- **风险**: 包级依赖图失真；隔离测试或更严格依赖校验时会暴露隐式依赖失败。
- **建议**: 将 `@nop-chaos/flux-renderers-form` 补入 `devDependencies`，或把该测试迁到更高层 consumer/workspace 测试位置。
- **为什么值得现在做**: 修复成本低，能让 manifest 与真实测试边界对齐。
- **误报排除**: 这里不是在说 `flux-react` 运行时依赖 renderer 包，而是测试层 manifest 漏记。
- **历史模式对应**: 测试真实导入未回写 manifest。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度01-03] `nop-debugger` 测试依赖多个 renderer 包，但 manifest 完全未声明

- **文件**: `packages/nop-debugger/src/controller-inspect-form-integration.test.tsx:6-10`, `packages/nop-debugger/src/controller-inspect-form-progressive.test.tsx:7-12`, `packages/nop-debugger/package.json:15-23`
- **证据片段**:
  ```ts
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { createDefaultRegistry, createSchemaRenderer } from '@nop-chaos/flux-react';
  import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
  import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
  import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
  ```
- **严重程度**: P2
- **现状**: `nop-debugger` 的集成测试实际依赖 `flux-react` 和多个 renderer 包，但 manifest 中没有对应声明。
- **风险**: 调试器包的真实测试边界被隐藏，后续独立运行或依赖瘦身时容易出现“仓库里能跑，包边界上不成立”的假健康状态。
- **建议**: 把这些测试依赖补入 `devDependencies`，或把跨 renderer 的集成测试迁到 workspace 级测试目录。
- **为什么值得现在做**: `nop-debugger` 本身就是跨层诊断基础设施，manifest 不准确会反向污染依赖图审计。
- **误报排除**: 这里不是把调试器跨层能力本身判为违约，而是 manifest 与 live import 不一致。
- **历史模式对应**: 测试真实导入未回写 manifest。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度01-04] `flux-renderers-form-advanced` 的回归测试依赖 `flux-renderers-data`，但 manifest 未声明

- **文件**: `packages/flux-renderers-form-advanced/src/tag-list.test.tsx:3-6`, `packages/flux-renderers-form-advanced/src/tag-list.test.tsx:174-181`, `packages/flux-renderers-form-advanced/package.json:15-37`
- **证据片段**:
  ```ts
  import { createSchemaRenderer } from '@nop-chaos/flux-react';
  import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
  import { dataRendererDefinitions } from '@nop-chaos/flux-renderers-data';
  import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
  ```
- **严重程度**: P2
- **现状**: `tag-list.test.tsx` 直接导入并注册 `@nop-chaos/flux-renderers-data`，但 `package.json` 未声明该测试依赖。
- **风险**: 该包测试在全量 workspace 下能跑，但在包级隔离场景会暴露隐式依赖。
- **建议**: 将 `@nop-chaos/flux-renderers-data` 补入 `devDependencies`，或把这类跨 renderer 集成测试迁到更高层。
- **为什么值得现在做**: 这是与前几项同类的低成本 manifest 修正。
- **误报排除**: 问题不在于公开 renderer 复用，而在于测试导入存在、manifest 却缺失。
- **历史模式对应**: 测试真实导入未回写 manifest。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度01-05] `flux-react` 把 test-only 的 `flux-compiler` 放在生产 `dependencies`

- **文件**: `packages/flux-react/package.json:22-32`, `packages/flux-react/src/test-support-runtime.tsx:13-15`, `packages/flux-react/tsconfig.build.json:12-12`
- **证据片段**:
  ```ts
  import { compileDataSource } from '@nop-chaos/flux-compiler';
  import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { createRendererRuntime } from '@nop-chaos/flux-runtime';
  ```
- **严重程度**: P3
- **现状**: `@nop-chaos/flux-compiler` 当前只出现在被构建排除的 `src/test-support-runtime.tsx` 和测试路径，却放在生产 `dependencies`。
- **风险**: 生产依赖图被测试支撑路径放宽，弱化真实层级表达。
- **建议**: 将 `@nop-chaos/flux-compiler` 下调到 `devDependencies`。
- **为什么值得现在做**: 这是纯 manifest hygiene，修改成本极低。
- **误报排除**: 这里不是说 `flux-react` 不能依赖 compiler，而是当前生产源码没有这个依赖。
- **历史模式对应**: test-only 依赖混入生产 manifest。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度01-06] `flux-renderers-basic` 把 test-only 的 `flux-formula` 放在生产 `dependencies`

- **文件**: `packages/flux-renderers-basic/package.json:15-23`, `packages/flux-renderers-basic/src/test-support.tsx:2-5`, `packages/flux-renderers-basic/tsconfig.build.json:12-21`
- **证据片段**:
  ```ts
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { createSchemaRenderer } from '@nop-chaos/flux-react';
  import { basicRendererDefinitions } from './index.js';
  ```
- **严重程度**: P3
- **现状**: `@nop-chaos/flux-formula` 的 live 命中集中在被构建排除的 `src/test-support.tsx`。
- **风险**: 基础 renderer 包的生产边界被测试 harness 放宽，增加依赖图噪音。
- **建议**: 将 `@nop-chaos/flux-formula` 移到 `devDependencies`。
- **为什么值得现在做**: 它是直接的 manifest/import 不一致。
- **误报排除**: 不是说 renderer 不能依赖 formula，而是当前生产 import 面并未使用它。
- **历史模式对应**: test-only 依赖混入生产 manifest。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度01-07] `flux-renderers-form` 把 test-only 的 `flux-formula` 与 `flux-renderers-basic` 放在生产 `dependencies`

- **文件**: `packages/flux-renderers-form/package.json:20-30`, `packages/flux-renderers-form/src/__tests__/form-test-support.tsx:13-21`, `packages/flux-renderers-form/src/__tests__/form-markers-contract.test.tsx:3-7`, `packages/flux-renderers-form/tsconfig.build.json:12-21`
- **证据片段**:
  ```ts
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { createSchemaRenderer } from '@nop-chaos/flux-react';
  import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
  ```
- **严重程度**: P3
- **现状**: `flux-formula` 与 `flux-renderers-basic` 当前命中集中在 `__tests__` 与 test support，生产路径未见直接使用。
- **风险**: form 包生产 manifest 比真实运行时表面更宽，向下游传播依赖噪音。
- **建议**: 将这两个依赖降到 `devDependencies`；保留真实运行时需要的 `flux-runtime` 等依赖不动。
- **为什么值得现在做**: form 包是高复用包，边界噪音会沿依赖链继续传播。
- **误报排除**: 这里不是按包名一刀切；只针对已证实属于测试路径的具体依赖名。
- **历史模式对应**: test-only 依赖混入生产 manifest。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度01-08] `flux-renderers-data` 把 test-only 的 `flux-formula` 与 `flux-renderers-form` 放在生产 `dependencies`

- **文件**: `packages/flux-renderers-data/package.json:15-26`, `packages/flux-renderers-data/src/test-support.tsx:9-17`, `packages/flux-renderers-data/tsconfig.build.json:12-12`
- **证据片段**:
  ```ts
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
  import { createSchemaRenderer } from '@nop-chaos/flux-react';
  ```
- **严重程度**: P3
- **现状**: `flux-formula` 与 `flux-renderers-form` 当前只在被构建排除的 test-support 路径命中。
- **风险**: data 包生产依赖图被测试路径放宽，增加 renderer 间耦合噪音。
- **建议**: 将这两个依赖下调到 `devDependencies`。
- **为什么值得现在做**: data 包复用面广，清理后有助于后续边界审计。
- **误报排除**: 问题不在于 data 可否复用 form，而在于生产 import 面当前没有使用这两项依赖。
- **历史模式对应**: test-only 依赖混入生产 manifest。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度01-09] `flux-renderers-form-advanced` 把 test-only 的 `flux-formula` 与 `flux-renderers-basic` 放在生产 `dependencies`

- **文件**: `packages/flux-renderers-form-advanced/package.json:19-28`, `packages/flux-renderers-form-advanced/src/test-support.tsx:5-9`, `packages/flux-renderers-form-advanced/src/test-support.tsx:60-71`, `packages/flux-renderers-form-advanced/tsconfig.build.json:12-21`
- **证据片段**:
  ```ts
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { createSchemaRenderer } from '@nop-chaos/flux-react';
  import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
  import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
  ```
- **严重程度**: P3
- **现状**: `flux-formula` 与 `flux-renderers-basic` 当前主要出现在被构建排除的 `src/test-support.tsx` 和测试路径。
- **风险**: advanced form 包的生产边界被测试注册逻辑放宽。
- **建议**: 将 `flux-formula` 与 `flux-renderers-basic` 调整到 `devDependencies`。
- **为什么值得现在做**: 这与前面的测试依赖问题同族，适合一起收敛。
- **误报排除**: 这里不否认 `flux-renderers-form` 的运行时依赖；只处理 test-only 的具体依赖名。
- **历史模式对应**: test-only 依赖混入生产 manifest。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度01-10] `flow-designer-renderers` 把 test-only 的 `flux-formula` 与 `flux-runtime` 放在生产 `dependencies`

- **文件**: `packages/flow-designer-renderers/package.json:30-42`, `packages/flow-designer-renderers/src/index-test-support.tsx:2-5`, `packages/flow-designer-renderers/src/designer-page.resolved-props.test.ts:2-6`, `packages/flow-designer-renderers/tsconfig.build.json:12-21`
- **证据片段**:
  ```ts
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { createRendererEnv, createTestConfig } from './test-support.js';
  import { createRendererRuntime } from '@nop-chaos/flux-runtime';
  ```
- **严重程度**: P3
- **现状**: `flux-formula` 与 `flux-runtime` 当前命中集中在 `.test.*` 与 `index-test-support.tsx`，构建已排除这些路径。
- **风险**: flow designer renderer 的生产 manifest 暗示其运行时需要更多装配层依赖，模糊真实边界。
- **建议**: 将这两个依赖移到 `devDependencies`。
- **为什么值得现在做**: 该包已有稳定分层，继续保留测试依赖在生产面会弱化层次表达。
- **误报排除**: 不是把 `flow-designer-renderers -> flow-designer-core` 或 `flux-react` 的真实运行时依赖误报成问题。
- **历史模式对应**: test-only 依赖混入生产 manifest。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度01-11] `spreadsheet-renderers` 把 test-only 的 `flux-formula` 与 `flux-runtime` 放在生产 `dependencies`

- **文件**: `packages/spreadsheet-renderers/package.json:20-31`, `packages/spreadsheet-renderers/src/__tests__/schema-integration.test.tsx:5-13`, `packages/spreadsheet-renderers/tsconfig.build.json:12-21`
- **证据片段**:
  ```ts
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { createSchemaRenderer } from '@nop-chaos/flux-react';
  import { createActionScope } from '@nop-chaos/flux-runtime';
  ```
- **严重程度**: P3
- **现状**: 这两个依赖当前命中只在集成测试路径，生产源码未见对应 import。
- **风险**: spreadsheet renderer 的生产边界被测试 runtime harness 放宽。
- **建议**: 将二者移到 `devDependencies`。
- **为什么值得现在做**: spreadsheet 包被其他 domain 复用，依赖噪音会沿复用链传播。
- **误报排除**: 这里不是把跨 domain 复用本身视为错误。
- **历史模式对应**: test-only 依赖混入生产 manifest。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度01-12] `report-designer-renderers` 把 test-only 的 `flux-formula` 与 `flux-runtime` 放在生产 `dependencies`

- **文件**: `packages/report-designer-renderers/package.json:20-31`, `packages/report-designer-renderers/src/renderers.integration.test.tsx:5-14`, `packages/report-designer-renderers/tsconfig.build.json:12-21`
- **证据片段**:
  ```ts
  import { createFormulaCompiler } from '@nop-chaos/flux-formula';
  import { createSchemaRenderer } from '@nop-chaos/flux-react';
  import { createActionScope } from '@nop-chaos/flux-runtime';
  ```
- **严重程度**: P3
- **现状**: `flux-formula` 与 `flux-runtime` 的 live 命中集中在测试文件，生产源码未见对应 import。
- **风险**: report designer renderer 的生产依赖图被测试组装路径放宽。
- **建议**: 将二者移到 `devDependencies`。
- **为什么值得现在做**: 这是跨 domain renderer 复用链上的低成本 manifest 清理。
- **误报排除**: 这里不否认 `report-designer-renderers -> spreadsheet-renderers` 的公开复用。
- **历史模式对应**: test-only 依赖混入生产 manifest。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度01-13] `flow-designer-core` 保留了当前源码未使用的 `flux-formula` 生产依赖

- **文件**: `packages/flow-designer-core/package.json:21-26`, `packages/flow-designer-core/src/types.ts:1-1`
- **证据片段**:
  ```json
  "dependencies": {
    "@nop-chaos/flux-core": "workspace:*",
    "@nop-chaos/flux-formula": "workspace:*",
    "elkjs": "^0.11.1"
  }
  ```
- **严重程度**: P3
- **现状**: 当前 `src/` 下未发现 `@nop-chaos/flux-formula` 的 live import，但 manifest 仍保留该依赖。
- **风险**: core 包依赖图包含未使用项，扩大上游核心层边界噪音。
- **建议**: 若无隐式构建用途，移除 `@nop-chaos/flux-formula`。
- **为什么值得现在做**: 这是纯 manifest cleanup，收益明确、风险低。
- **误报排除**: 不是说 core 包永远不能依赖 formula，而是当前 live code 未使用。
- **历史模式对应**: 未使用依赖残留在生产 manifest。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度01-01]: 保留为 P2。即使它当前由 workspace alias 显式维护，未导出且不参与构建的跨包测试入口仍然是错误边界，不符合 v1 直接收敛原则。
- [维度01-02]: 保留为 P2。测试真实导入未回写 manifest 会持续制造错误依赖图与错误包边界认知。
- [维度01-03]: 保留为 P2。与 [维度01-02] 同类，但影响面更大，跨多个 renderer 包。
- [维度01-04]: 保留为 P2。跨 renderer 测试真实依赖未声明，是现行包边界错误，不因“只是测试”降级。
- [维度01-05]: 保留为 P2。test-only 依赖混入生产 `dependencies` 直接污染主 manifest。
- [维度01-06]: 保留为 P2。`flux-formula` 当前只在 test-support 路径使用，却留在生产依赖中。
- [维度01-07]: 保留为 P2。`flux-formula`/`flux-renderers-basic` 当前属于 test-only 依赖，应从主 manifest 收口出去。
- [维度01-08]: 保留为 P2。`flux-formula`/`flux-renderers-form` 混入生产依赖会持续放宽 data 包主边界。
- [维度01-09]: 保留为 P2。`flux-formula`/`flux-renderers-basic` 的 test-only 残留不应继续停留在主依赖面。
- [维度01-10]: 保留为 P2。`flux-formula`/`flux-runtime` 当前仅命中测试路径，保留在生产依赖属于主边界污染。
- [维度01-11]: 保留为 P2。spreadsheet renderer 的 test-only 依赖残留同样属于主 manifest 设计错误。
- [维度01-12]: 保留为 P2。report designer renderer 的 test-only 依赖残留同样属于主 manifest 设计错误。
- [维度01-13]: 保留为 P2。未使用依赖仍是错误主边界，不再因“只是 cleanup”驳回。

## 子项复核结论

- [维度01-01]: 保留。单独复核确认它不是偶发误用，而是被主仓基础设施主动维持的错误测试入口设计。
- [维度01-02]、[维度01-03]、[维度01-04]: 保留。三条都属于“测试真实导入未回写 manifest”的同类现行边界错误，可批量修复但不再降级。
- [维度01-05] ~ [维度01-12]: 保留。都属于“test-only 依赖混入生产 manifest”的同类现行边界错误。
- [维度01-13]: 保留。未使用依赖同样应从主 manifest 移除。

## 最终保留项

| 编号  | 严重程度 | 文件                                                 | 一句话摘要                                                       |
| ----- | -------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| 01-01 | P2       | `packages/flux-renderers-form/package.json`          | `test-support` 通过 workspace alias 形成跨包测试入口             |
| 01-02 | P2       | `packages/flux-react/package.json`                   | 测试真实依赖 `flux-renderers-form` 但 manifest 未声明            |
| 01-03 | P2       | `packages/nop-debugger/package.json`                 | 调试器测试真实依赖多个 renderer 包但 manifest 未声明             |
| 01-04 | P2       | `packages/flux-renderers-form-advanced/package.json` | `tag-list` 测试依赖 `flux-renderers-data` 但 manifest 未声明     |
| 01-05 | P2       | `packages/flux-react/package.json`                   | `flux-compiler` 仅供 test-support 使用却放在生产依赖             |
| 01-06 | P2       | `packages/flux-renderers-basic/package.json`         | `flux-formula` 仅供 test-support 使用却放在生产依赖              |
| 01-07 | P2       | `packages/flux-renderers-form/package.json`          | `flux-formula`/`flux-renderers-basic` 仅供测试使用却放在生产依赖 |
| 01-08 | P2       | `packages/flux-renderers-data/package.json`          | `flux-formula`/`flux-renderers-form` 仅供测试使用却放在生产依赖  |
| 01-09 | P2       | `packages/flux-renderers-form-advanced/package.json` | `flux-formula`/`flux-renderers-basic` 仅供测试使用却放在生产依赖 |
| 01-10 | P2       | `packages/flow-designer-renderers/package.json`      | `flux-formula`/`flux-runtime` 仅供测试使用却放在生产依赖         |
| 01-11 | P2       | `packages/spreadsheet-renderers/package.json`        | `flux-formula`/`flux-runtime` 仅供测试使用却放在生产依赖         |
| 01-12 | P2       | `packages/report-designer-renderers/package.json`    | `flux-formula`/`flux-runtime` 仅供测试使用却放在生产依赖         |
| 01-13 | P2       | `packages/flow-designer-core/package.json`           | `flux-formula` 已未使用却仍保留在生产依赖                        |
