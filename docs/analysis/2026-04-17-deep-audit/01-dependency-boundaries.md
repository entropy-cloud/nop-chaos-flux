# 01 依赖图与包边界

- Task ID: `ses_2690a309fffeSqRo7YpWUWrvpS`
- Source prompt: `docs/skills/deep-audit-prompts.md`
- Calibration note: this file was revised on `2026-04-17` after clarifying that public `renderers -> flux-core/flux-formula/flux-runtime` dependencies are acceptable by default, and that shared-package reuse such as `report-designer-renderers -> spreadsheet-renderers` is not itself a boundary defect.

# 维度01审计结果：依赖图与包边界

## 发现列表

### [维度01] flux-code-editor 的生产源码使用 flux-formula，但 package.json 仅将其列为 devDependency
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\package.json:15-43`; `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\extensions\expression\linter.ts:1-7`
- **严重程度**: P1
- **现状**: `src/extensions/expression/linter.ts` 在生产源码中 `import { createFormulaCompiler } from '@nop-chaos/flux-formula'`，但 `package.json` 仅在 `devDependencies` 中声明 `@nop-chaos/flux-formula`。
- **风险**: 该包的真实运行时依赖与清单不一致；在严格安装、裁剪依赖、单包构建或未来发布场景下，可能出现解析失败或错误的依赖图。
- **建议**: 将 `@nop-chaos/flux-formula` 提升到 `dependencies`。
- **参考文档**: `C:\can\nop\nop-chaos-flux\AGENTS.md`（Dependency Flow）；`C:\can\nop\nop-chaos-flux\docs\architecture\flux-runtime-module-boundaries.md`

### [维度01] tailwind-preset 未遵循统一包导出/构建约定，且缺少 build 基础设施
- **文件**: `C:\can\nop\nop-chaos-flux\packages\tailwind-preset\package.json:7-17`; `C:\can\nop\nop-chaos-flux\packages\tailwind-preset\tsconfig.build.json`（缺失）
- **严重程度**: P2
- **现状**: `@nop-chaos/tailwind-preset` 的 `main/types/exports` 直接指向 `src/index.ts`，没有 `build` 脚本，也没有 `tsconfig.build.json`，与工作区其余包的 `dist + types/default` 双条件导出模式不一致。
- **风险**: 该包成为 monorepo 中的特殊构建例外，增加工具链分支逻辑，也使“统一打包/验证”规则失去一致性。
- **建议**: 若该包应作为正式 workspace 包参与统一构建，补齐 `tsconfig.build.json`、`build` 脚本与 `dist` 导出；若要保留源码直出模式，需在架构/构建文档中明确把它列为例外。
- **参考文档**: `C:\can\nop\nop-chaos-flux\AGENTS.md`；`C:\can\nop\nop-chaos-flux\docs\architecture\flux-runtime-module-boundaries.md`

### [维度01] theme-tokens 的 exports 仅暴露 CSS 子路径，未与统一根导出模式保持一致
- **文件**: `C:\can\nop\nop-chaos-flux\packages\theme-tokens\package.json:7-15`; `C:\can\nop\nop-chaos-flux\packages\theme-tokens\src\index.ts:1`
- **严重程度**: P3
- **现状**: `@nop-chaos/theme-tokens` 只导出 `./styles.css`，没有根入口 `.` 的 `types + default` 双条件导出；同时仓库内仍存在空的 `src/index.ts`。
- **风险**: 包元数据表达不完整，容易让消费方和工具链同时面对“有 JS 入口文件但无根导出”的不一致状态。
- **建议**: 若该包是永久 CSS-only 包，建议明确标注为 asset-only 例外并移除无意义的 JS 入口；否则补齐根导出并统一到常规包模板。
- **参考文档**: `C:\can\nop\nop-chaos-flux\AGENTS.md`

## 1. 完整依赖图

以下依赖图基于 `packages/*/package.json` 中 `dependencies` 与 `peerDependencies` 的 `@nop-chaos/*` 引用提取：

```text
@nop-chaos/flow-designer-core -> @nop-chaos/flux-core, @nop-chaos/flux-formula
@nop-chaos/flow-designer-renderers -> @nop-chaos/flow-designer-core, @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-react, @nop-chaos/flux-runtime, @nop-chaos/ui
@nop-chaos/flux-code-editor -> @nop-chaos/flux-core, @nop-chaos/flux-react, @nop-chaos/flux-runtime, @nop-chaos/ui
@nop-chaos/flux-core -> (none)
@nop-chaos/flux-formula -> @nop-chaos/flux-core
@nop-chaos/flux-react -> @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-runtime, @nop-chaos/ui
@nop-chaos/flux-renderers-basic -> @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-react, @nop-chaos/flux-runtime, @nop-chaos/ui
@nop-chaos/flux-renderers-data -> @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-react, @nop-chaos/flux-runtime, @nop-chaos/ui
@nop-chaos/flux-renderers-form -> @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-react, @nop-chaos/flux-renderers-basic, @nop-chaos/flux-runtime, @nop-chaos/ui
@nop-chaos/flux-renderers-form-advanced -> @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-react, @nop-chaos/flux-renderers-basic, @nop-chaos/flux-renderers-form, @nop-chaos/flux-runtime, @nop-chaos/ui
@nop-chaos/flux-runtime -> @nop-chaos/flux-core, @nop-chaos/flux-formula
@nop-chaos/nop-debugger -> @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/ui
@nop-chaos/report-designer-core -> @nop-chaos/spreadsheet-core
@nop-chaos/report-designer-renderers -> @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-react, @nop-chaos/flux-runtime, @nop-chaos/report-designer-core, @nop-chaos/spreadsheet-core, @nop-chaos/spreadsheet-renderers, @nop-chaos/ui
@nop-chaos/spreadsheet-core -> (none)
@nop-chaos/spreadsheet-renderers -> @nop-chaos/flux-core, @nop-chaos/flux-formula, @nop-chaos/flux-react, @nop-chaos/flux-runtime, @nop-chaos/spreadsheet-core, @nop-chaos/ui
@nop-chaos/tailwind-preset -> (none)
@nop-chaos/theme-tokens -> (none)
@nop-chaos/ui -> (none)
@nop-chaos/word-editor-core -> (none)
@nop-chaos/word-editor-renderers -> @nop-chaos/flux-react, @nop-chaos/ui, @nop-chaos/word-editor-core
```

## 2. 问题清单

| 包 | 问题类型 | 说明 |
|---|---|---|
| `@nop-chaos/flux-code-editor` | 依赖声明不一致 | 生产源码使用 `flux-formula`，但仅声明为 `devDependency` |
| `@nop-chaos/tailwind-preset` | 规则 7/8 | exports 与统一模式不一致，且缺少 `build` 脚本和 `tsconfig.build.json` |
| `@nop-chaos/theme-tokens` | 规则 7 | 仅暴露 CSS 子路径，未采用统一根导出模式 |

## 3. 非问题但需要说明的依赖

- `renderers -> flux-core / flux-formula / flux-runtime`
  - 当前代码依赖的是稳定公开 API 和共享类型，未发现跨包内部路径导入或循环依赖。
  - 因此这不是本维度下需要报告的问题。
- `report-designer-renderers -> spreadsheet-renderers`
  - 当前源码中这是明确的生产级 bridge / renderer 复用关系。
  - 这更像共享公共包的正常复用，而不是边界违规。
- `flux-renderers-form-advanced -> flux-renderers-form`
  - 结合 shared field chrome 现实，这条依赖目前是可解释的，不单独报告为问题。

## 4. 合规包清单

以下包在本次维度01检查下未发现需要报告的问题：

- `@nop-chaos/flux-core`
- `@nop-chaos/flux-formula`
- `@nop-chaos/flux-runtime`
- `@nop-chaos/flux-react`
- `@nop-chaos/flux-renderers-basic`
- `@nop-chaos/flux-renderers-data`
- `@nop-chaos/flux-renderers-form`
- `@nop-chaos/flux-renderers-form-advanced`
- `@nop-chaos/flow-designer-core`
- `@nop-chaos/flow-designer-renderers`
- `@nop-chaos/spreadsheet-core`
- `@nop-chaos/spreadsheet-renderers`
- `@nop-chaos/report-designer-core`
- `@nop-chaos/report-designer-renderers`
- `@nop-chaos/word-editor-core`
- `@nop-chaos/word-editor-renderers`
- `@nop-chaos/ui`
- `@nop-chaos/nop-debugger`

## 5. 总结评估

- **总体结论**: 依赖图主干方向总体成立。当前真正需要关注的不是 renderer 包是否直接依赖 `flux-core` / `flux-formula` / `flux-runtime` 的公开 API，而是 package manifest 正确性、导出约定一致性、跨包内部路径导入和循环依赖。
- **最突出问题**:
  1. `flux-code-editor` 的运行时依赖声明错误
  2. `tailwind-preset` / `theme-tokens` 的包导出与构建约定不一致
- **未发现需要报告的问题**:
  - 未发现 `flux-core` 反向依赖其他 `@nop-chaos/*`
  - 未发现 `flux-formula` 超出 `flux-core` 的内部依赖
  - 未发现 `flux-runtime` 超出 `flux-core` / `flux-formula` 的内部依赖
  - 未发现 `flux-react` 依赖任何 renderer 包
  - 未发现 `ui` 依赖任何 `@nop-chaos/*`
  - 未发现 `tailwind-preset` / `theme-tokens` 依赖运行时包
  - 未发现 `spreadsheet-core -> report-designer-core` 反向依赖
  - **未发现跨包内部路径导入违规**（未命中 `@nop-chaos/*/src/...`、`/dist/...`、`/internal/...` 形式；唯一子路径使用为 `@nop-chaos/ui/chart`，该路径已在 `@nop-chaos/ui` 的 `exports` 中正式导出）
  - **未发现循环依赖迹象**（基于 package.json 依赖图与 source-level import graph 扫描，均未发现环）
  - `report-designer-renderers -> spreadsheet-renderers` 属于合理共享复用，不视为违规
- **自动化 vs 人工判断**:
  - **已自动化核查**: `package.json` 内部依赖提取、source import 图扫描、内部路径导入扫描、循环依赖扫描、`exports`/`build`/`tsconfig.build.json` 存在性检查
  - **需人工判断的例外**: `theme-tokens` / `tailwind-preset` 是否应被明确标注为 asset/tooling 特殊包 rather than 统一构建包

**综合评级**: `轻度偏离（P1/P2 以 manifest 和构建元数据问题为主）`。
