# [维度01] 依赖图与包边界 — 初审 + 复核报告

## 复核结论

| 发现 | 判定 | 核心依据 |
|------|------|----------|
| F1 | **保留 P1** | ui 依赖 flux-i18n 确认存在，6 个生产文件使用 t()，违反文档依赖层级 |
| F2 | **保留 P2** | 4 个包在 playground 中被直接 import 但未声明，属隐式依赖 |
| F3 | **保留 P3** | 仅测试文件引用，不应为生产依赖 |
| F4 | **保留 P3** | workspace:^ 与其他 15 个依赖的 workspace:* 风格不一致 |

## 1. 完整内部依赖图

基于所有 `packages/*/package.json` 中的 `dependencies`（不含 `devDependencies`/`peerDependencies`）：

```
┌───────────────────────────── Level 0 (leaf, no @nop-chaos deps) ─────────────────────────────┐
│  flux-core          (types, constants, pure utils)                                          │
│  flux-i18n          (i18next integration, peerDep: react)                                    │
│  spreadsheet-core   (zustand model, no @nop-chaos deps)                                     │
│  word-editor-core   (canvas-editor + zustand, no @nop-chaos deps)                           │
│  tailwind-preset    (tailwind config, no @nop-chaos deps)                                    │
│  theme-tokens       (CSS variables, no @nop-chaos deps)                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────── Level 1 ────────────────────────────────────────────────────────┐
│  flux-formula         → flux-core                                                           │
│  flow-designer-core   → flux-core, flux-formula                                             │
│  report-designer-core → spreadsheet-core                                                    │
│  ui                   → flux-i18n  ⚠ (见发现 #1)                                            │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────── Level 2 ────────────────────────────────────────────────────────┐
│  flux-runtime  → flux-core, flux-formula                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────── Level 3 ────────────────────────────────────────────────────────┐
│  flux-react  → flux-core, flux-formula, flux-i18n, flux-runtime, ui                         │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────── Level 4 (renderer packages) ────────────────────────────────────┐
│  flux-renderers-basic        → flux-core, flux-formula, flux-i18n,                          │
│                                 flux-react, flux-runtime, ui                                │
│  flux-renderers-form         → flux-core, flux-formula, flux-i18n,                          │
│                                 flux-react, flux-runtime, flux-renderers-basic, ui           │
│  flux-renderers-form-advanced → flux-core, flux-formula, flux-i18n,                         │
│                                 flux-react, flux-runtime,                                    │
│                                 flux-renderers-basic, flux-renderers-form, ui                │
│  flux-renderers-data         → flux-core, flux-formula, flux-i18n,                          │
│                                 flux-react, flux-runtime, ui                                │
│  flux-code-editor            → flux-core, flux-formula, flux-i18n,                          │
│                                 flux-react, flux-runtime, ui                                │
│  nop-debugger                → flux-core, flux-formula, flux-i18n, ui                       │
│  flow-designer-renderers     → flow-designer-core, flux-core, flux-formula, flux-i18n,      │
│                                 flux-react, flux-runtime, ui                                │
│  spreadsheet-renderers       → spreadsheet-core, flux-core, flux-formula, flux-i18n,        │
│                                 flux-react, flux-runtime, ui                                │
│  report-designer-renderers   → report-designer-core, spreadsheet-core,                      │
│                                 spreadsheet-renderers, flux-core, flux-formula, flux-i18n,   │
│                                 flux-react, flux-runtime, ui                                │
│  word-editor-renderers       → word-editor-core, flux-core, flux-i18n,                      │
│                                 flux-react, flux-runtime, ui                                │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────── Level 5 (app) ──────────────────────────────────────────────────┐
│  flux-playground  → flow-designer-core, flow-designer-renderers, flux-code-editor,           │
│                      flux-core, flux-react, flux-renderers-form-advanced, flux-runtime,       │
│                      nop-debugger, report-designer-core, report-designer-renderers,           │
│                      spreadsheet-core, spreadsheet-renderers, theme-tokens, ui,              │
│                      word-editor-core, word-editor-renderers                                 │
│                      ⚠ 缺少 4 个直接导入但未声明的包 (见发现 #2)                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. 发现清单

### [维度01-F1] ui 包依赖 @nop-chaos/flux-i18n（违反规则 h）

- **文件**: `packages/ui/package.json:30`
- **严重程度**: P1
- **现状**: `@nop-chaos/ui` 在 `dependencies` 中声明了 `"@nop-chaos/flux-i18n": "workspace:*"`。6 个 UI 组件文件直接调用 `import { t } from "@nop-chaos/flux-i18n"`，用于翻译无障碍标签和默认按钮文本。
- **风险**: ui 作为基础组件库与 flux 专属 i18n 实现耦合，非 flux 宿主需要安装并初始化 flux-i18n 才能使用这些组件。
- **建议**: 将 `@nop-chaos/flux-i18n` 移至 `peerDependencies`，或将硬编码翻译文本改为通过 props 接收。

### [维度01-F2] playground 缺少 4 个直接使用但未声明的 workspace 依赖

- **文件**: `apps/playground/package.json`
- **严重程度**: P2
- **现状**: playground 直接 `import` 了以下 4 个包但未在 `dependencies` 中声明：
  - `@nop-chaos/flux-formula` — 10 处导入
  - `@nop-chaos/flux-renderers-basic` — 13 处导入
  - `@nop-chaos/flux-renderers-form` — 13 处导入
  - `@nop-chaos/flux-renderers-data` — 13 处导入
- **风险**: 当前通过 `vite.workspace-alias.ts` 绕过了 pnpm 严格解析，但依赖图不准确。
- **建议**: 在 `apps/playground/package.json` 的 `dependencies` 中补充声明这 4 个包。

### [维度01-F3] flux-renderers-form 将 flux-renderers-basic 声明为生产依赖，但仅测试代码使用

- **文件**: `packages/flux-renderers-form/package.json:25`
- **严重程度**: P3
- **现状**: `@nop-chaos/flux-renderers-form` 在 `dependencies` 中声明了 `flux-renderers-basic`，但唯一导入是测试文件 `src/__tests__/form-submit-actions.test.tsx`。
- **风险**: 声明误导，实际运行时无依赖。
- **建议**: 移至 `devDependencies`。

### [维度01-F4] playground 使用 workspace:^ 而非 workspace:* 的不一致

- **文件**: `apps/playground/package.json:28`
- **严重程度**: P3
- **现状**: playground 对 `@nop-chaos/ui` 使用了 `"workspace:^"`，其他 21 个包统一使用 `"workspace:*"`。
- **风险**: 风格不一致，对 private 应用无实际影响。
- **建议**: 统一改为 `"workspace:*"`。

## 3. 合规检查矩阵

| 规则 | 状态 |
|------|------|
| a. flux-core 不依赖其他 @nop-chaos/* | **PASS** |
| b. flux-formula 只依赖 flux-core | **PASS** |
| c. flux-runtime 只依赖 flux-core 和 flux-formula | **PASS** |
| d. flux-react 不依赖任何 renderers 包 | **PASS** |
| e. renderers 依赖公开 API，无内部路径导入 | **PASS** |
| f. *-core 不依赖 *-renderers | **PASS** |
| g. spreadsheet-core 不依赖 report-designer-core | **PASS** |
| h. ui 不依赖 @nop-chaos/*（peerDeps 除外） | **FAIL** |
| i. tailwind-preset 和 theme-tokens 不依赖运行时包 | **PASS** |

## 4. 附加检查

- **内部路径导入**: 零匹配
- **循环依赖**: 未检测到
- **exports 字段**: 全部一致
- **tsconfig.build.json 和 build 脚本**: 22 个包全部拥有

## 5. 总结评估

**整体评级：良好 (A-)**。22 个包中 19 个完全合规。F1 是唯一具有结构性影响的发现。
