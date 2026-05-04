# 维度 01：依赖图与包边界

## 复核状态：全部通过

### 依赖图

```
[Leaf packages - no @nop-chaos deps]
  flux-core, spreadsheet-core, tailwind-preset, theme-tokens, word-editor-core

[Layer 1]
  flux-formula → flux-core
  flux-i18n → flux-core

[Layer 2]
  flux-compiler → flux-core, flux-formula
  ui → flux-i18n
  flow-designer-core → flux-core, flux-formula
  report-designer-core → flux-core, spreadsheet-core

[Layer 3]
  flux-action-core → flux-core, flux-compiler

[Layer 4]
  flux-runtime → flux-core, flux-formula, flux-compiler, flux-action-core

[Layer 5]
  flux-react → flux-core, flux-formula, flux-compiler, flux-i18n, flux-runtime, ui

[Layer 6 - Renderers]
  flux-renderers-basic → flux-core, flux-formula, flux-i18n, flux-react, flux-runtime, ui
  flux-renderers-form → + flux-renderers-basic
  flux-renderers-form-advanced → + flux-renderers-basic, flux-renderers-form
  flux-renderers-data → + flux-renderers-form
  flux-code-editor → flux-core, flux-formula, flux-i18n, flux-react, ui
  nop-debugger → flux-core, flux-formula, flux-i18n, ui
  flow-designer-renderers → flow-designer-core, flux-core, flux-formula, flux-i18n, flux-react, flux-runtime, ui
  spreadsheet-renderers → spreadsheet-core, flux-core, flux-formula, flux-i18n, flux-react, flux-runtime, ui
  report-designer-renderers → report-designer-core, spreadsheet-core, spreadsheet-renderers, ...
  word-editor-renderers → word-editor-core, flux-core, flux-i18n, flux-react, flux-runtime, theme-tokens, ui
```

### 发现

### [维度01] word-editor-renderers 对 theme-tokens 的直接运行时依赖

- **文件**: `packages/word-editor-renderers/package.json`
- **严重程度**: P3
- **现状**: 唯一直接依赖 theme-tokens 的 renderer 包
- **风险**: 轻微约定不一致，功能无害
- **建议**: 观察项
- **复核状态**: 子项复核通过

### 合规确认

- ✅ 24 个包全部通过规则检查
- ✅ 无循环依赖、无内部路径导入、无反向依赖
- ✅ 所有包具备 tsconfig.build.json 和 build 脚本
- ✅ exports 字段一致使用 types + default 双条件导出
