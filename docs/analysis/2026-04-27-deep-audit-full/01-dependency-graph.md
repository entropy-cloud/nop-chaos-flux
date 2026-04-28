# 维度 01：依赖图与包边界

## 审核范围

检查所有 `packages/*/package.json` 中的 `dependencies` 和 `peerDependencies`，对照 AGENTS.md 依赖流规则验证包间边界。

## 依赖图

```
flux-core (无 @nop-chaos 依赖)
  ↑
flux-formula → flux-core
  ↑
flux-compiler → flux-core, flux-formula
  ↑
flux-action-core → flux-core, flux-formula, flux-compiler
  ↑
flux-runtime → flux-core, flux-formula, flux-compiler, flux-action-core
  ↑
flux-react → flux-runtime, flux-i18n
  ↑
flux-renderers-basic → flux-react, flux-runtime, flux-core, ui
flux-renderers-form → flux-react, flux-runtime, flux-core, ui
flux-renderers-form-advanced → flux-react, flux-runtime, flux-core, ui
flux-renderers-data → flux-react, flux-runtime, flux-core, ui

flux-i18n → flux-core
ui → flux-i18n (peer), radix-ui/*

flow-designer-core (无 @nop-chaos 依赖)
flow-designer-renderers → flow-designer-core, flux-react, flux-runtime, flux-core

spreadsheet-core (无 @nop-chaos 依赖)
spreadsheet-renderers → spreadsheet-core, flux-react, flux-runtime, flux-core, ui

report-designer-core → spreadsheet-core
report-designer-renderers → report-designer-core, spreadsheet-renderers, spreadsheet-core, flux-react, flux-runtime, flux-core

word-editor-core (无 @nop-chaos 依赖)
word-editor-renderers → word-editor-core, flux-react, flux-runtime, flux-core

flux-code-editor → flux-react, flux-runtime, flux-core
nop-debugger → flux-react, flux-runtime, flux-core

flux-playground → all packages
tailwind-preset (standalone)
theme-tokens (standalone)
```

## 发现清单

### [维度01] flux-runtime 依赖 flux-compiler（文档已声明）

- **文件**: `packages/flux-runtime/package.json`
- **证据片段**:
  ```json
  "@nop-chaos/flux-compiler": "workspace:*"
  ```
- **严重程度**: P3
- **现状**: flux-runtime 的 dependencies 包含 flux-compiler，与 AGENTS.md Dependency Flow 一致（已声明），但与理想分层（runtime 不依赖 compiler）存在张力。
- **风险**: 低。当前设计是编译产物缓存到 runtime，文档已记录此决策。
- **建议**: 保持现状，视为已知架构决策。
- **为什么值得现在做**: 不需要做。仅作为观察项记录。
- **误报排除**: AGENTS.md 明确声明了此依赖关系。
- **历史模式对应**: 编译时-运行时分层逐步收敛中。
- **参考文档**: AGENTS.md Dependency Flow
- **复核状态**: 维度复核通过

### [维度01] ui 依赖 flux-i18n

- **文件**: `packages/ui/package.json`
- **证据片段**:
  ```json
  "@nop-chaos/flux-i18n": "workspace:*"
  ```
- **严重程度**: P3
- **现状**: ui 包依赖 flux-i18n 用于组件内文本国际化。AGENTS.md 依赖流显示 `flux-i18n -> ui`，实际方向正确。
- **风险**: 无。ui 中部分组件（如 Empty）需要 i18n 键值。
- **建议**: 保持现状。
- **误报排除**: AGENTS.md 明确记录了此依赖。
- **历史模式对应**: 无。
- **参考文档**: AGENTS.md Dependency Flow
- **复核状态**: 维度复核通过

### [维度01] 部分 test-only 依赖声明在 dependencies 而非 devDependencies

- **文件**: 多个 `package.json`
- **严重程度**: P4（信息项）
- **现状**: 某些包将仅用于测试的依赖放在 `dependencies` 中。
- **风险**: 极低。pnpm workspace 下不会影响产物。
- **建议**: 不需要立即处理。
- **复核状态**: 维度复核通过

## 合规包清单

所有包均遵守核心规则：
- flux-core 无 @nop-chaos 依赖 ✓
- flux-formula 仅依赖 flux-core ✓
- 无循环依赖 ✓
- 无跨包内部路径导入 ✓
- 无 *-core → *-renderers 反向依赖 ✓
- spreadsheet-core 不依赖 report-designer-core ✓
- tailwind-preset 和 theme-tokens 无运行时包依赖 ✓

## 总结评估

依赖图整体健康。核心分层规则全部遵守，无 P0/P1 问题。仅存在已知的架构决策记录项（flux-runtime → flux-compiler）。
