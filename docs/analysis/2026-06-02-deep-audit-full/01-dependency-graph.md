# 维度 01: 依赖图与包边界

## 第 1 轮（初审）— 零发现

审计基于当前代码库搜索重建依赖图完成。已核验 25 个包的 package.json、import 语句、exports、tsconfig.build.json、build 脚本。

### 检查范围

- 所有 `packages/*/package.json` 的 `dependencies`/`peerDependencies` 中 `@nop-chaos/*` 引用
- 全仓库跨包 import 语句样例子路径导入
- 每个包的 `exports` 字段、`tsconfig.build.json`、`build` 脚本存在性
- 自动化门禁 `pnpm check:workspace-manifest-deps` 通过

### 结论

零发现。依赖图与 `AGENTS.md` / `docs/architecture/flux-runtime-module-boundaries.md` 描述一致。

- 无 `*-core -> *-renderers` 反向依赖
- 无循环依赖
- 无私有跨包内部路径导入
- `flux-core` 零依赖 `@nop-chaos/*`
- `flux-formula` 仅依赖 `flux-core`
- 所有包均有 `build` 脚本和 `tsconfig.build.json`
- `exports` 字段一致使用 `types + default` 双条件导出

### 完整依赖图

```
flux-core (无 @nop-chaos/* 依赖)
├── flux-formula (→ flux-core)
├── flux-i18n (→ flux-core)
├── flux-compiler (→ flux-core, flux-formula)
├── flux-action-core (→ flux-core)
├── flux-runtime (→ flux-core, flux-formula, flux-compiler, flux-action-core)
├── flux-react (→ flux-core, flux-formula, flux-i18n, flux-runtime, ui)
├── flux-renderers-basic (→ flux-core, flux-i18n, flux-react, ui)
├── flux-renderers-form (→ flux-core, flux-i18n, flux-react, ui)
├── flux-renderers-form-advanced (→ flux-core, flux-i18n, flux-react, flux-renderers-form, flux-runtime, ui)
├── flux-renderers-data (→ flux-core, flux-i18n, flux-react, ui)
├── flux-code-editor (→ flux-core, flux-formula, flux-i18n, flux-react, ui)
├── flux (→ ui)
├── nop-debugger (→ flux-core, flux-formula, flux-i18n, ui)
├── flow-designer-core (→ flux-core)
├── flow-designer-renderers (→ flow-designer-core, flux-core, flux-i18n, flux-react, ui)
├── spreadsheet-core (无 @nop-chaos/* 依赖)
├── spreadsheet-renderers (→ flux-core, flux-i18n, flux-react, spreadsheet-core, ui)
├── report-designer-core (→ flux-core, spreadsheet-core)
├── report-designer-renderers (→ flux-core, flux-i18n, flux-react, report-designer-core, spreadsheet-core, spreadsheet-renderers, ui)
├── word-editor-core (无 @nop-chaos/* 依赖)
├── word-editor-renderers (→ flux-core, flux-i18n, flux-react, ui, word-editor-core)
├── ui (无 @nop-chaos/* 依赖)
├── tailwind-preset (无 @nop-chaos/* 依赖)
└── theme-tokens (无 @nop-chaos/* 依赖)
```

### 合规包清单

全部 25 个包均合规。

## 维度复核结论

独立复核 agent 发现初审遗漏的 2 项违规：

### 复核新增：[维度01-01] 测试文件跨包内部路径导入

- **文件**: `packages/word-editor-renderers/src/__tests__/use-word-editor-save.test.tsx:25`
- **证据**: `import { ... } from '../../../flux-react/src/contexts.js'` — 绕过 `@nop-chaos/flux-react` exports 边界，直接钻入 `flux-react/src/`。
- **严重程度**: P2
- **现状**: 测试文件使用相对路径导入 `flux-react/src/contexts.js`，而非 `@nop-chaos/flux-react/unstable` 官方导出路径。
- **建议**: 改为 `import { ... } from '@nop-chaos/flux-react/unstable'`。
- **复核裁定**: 保留 P2

### 复核新增：[维度01-02] packages 反向依赖 apps/playground

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/array-field-object-items.test.tsx:4`
- **证据**: `import { attachScopeDebugToSchema } from '../../../../apps/playground/src/component-lab/scope-debug.js'` — packages 下包依赖 apps，违反 monorepo 架构规则。
- **严重程度**: P1
- **现状**: 测试文件从 `apps/playground` 反向导入，该测试无法脱离 playground 独立运行。
- **建议**: 将 `attachScopeDebugToSchema` 移入共享测试工具包或内联到测试中。
- **复核裁定**: 保留 P1

### 依赖图声明层合规，源文件层存在 2 处违规

## 最终保留项

| 编号  | 严重程度 | 文件                                                     | 摘要                                               |
| ----- | -------- | -------------------------------------------------------- | -------------------------------------------------- |
| 01-01 | P2       | `word-editor/__tests__/use-word-editor-save.test.tsx:25` | 测试跨包导入 `flux-react/src/contexts.js` 内部路径 |
| 01-02 | P1       | `form-advanced/.../array-field-object-items.test.tsx:4`  | packages 反向依赖 apps/playground                  |
