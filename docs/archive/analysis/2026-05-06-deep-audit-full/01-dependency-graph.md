# 维度 01：依赖图与包边界

## 第 1 轮（初审）

### 基线说明

依赖图基于对 `packages/*/package.json` 中 `dependencies` 和 `devDependencies` 的逐文件读取重建，并与实际源码 import 做交叉验证。

---

## 完整依赖图（文本）

```
flux-core (0 deps)
  |
  +-- flux-formula
  |     deps: flux-core
  |
  +-- flux-compiler
  |     deps: flux-core, flux-formula
  |
  +-- flux-action-core
  |     deps: flux-core, flux-compiler
  |
  +-- flux-i18n
  |     deps: flux-core  (+ react peerDep)
  |
  +-- flux-runtime
  |     deps: flux-core, flux-formula, flux-compiler, flux-action-core  (+ zustand)
  |
  +-- flux-react
  |     deps: flux-core, flux-formula, flux-compiler, flux-i18n, flux-runtime, ui
  |     exports: ".", "./unstable", "./default-spacing.css"
  |
  +-- ui
  |     deps: flux-i18n  (+ many external UI libs; react/react-dom peerDep)
  |     exports: ".", "./chart", "./lib/utils", "./base.css", "./styles.css"
  |
  +-- tailwind-preset
  |     deps: tailwindcss-animate (no @nop-chaos/* deps)
  |
  +-- theme-tokens
  |     deps: (none - standalone CSS)
  |     exports: ".", "./styles.css"
  |
  +-- flux-renderers-basic
  |     deps: flux-core, flux-formula, flux-i18n, flux-react, flux-runtime, ui
  |
  +-- flux-renderers-form
  |     deps: flux-core, flux-formula, flux-i18n, flux-react, flux-runtime,
  |           flux-renderers-basic, ui
  |     devDeps: flux-compiler
  |
  +-- flux-renderers-form-advanced
  |     deps: flux-core, flux-formula, flux-i18n, flux-react, flux-runtime,
  |           flux-renderers-basic, flux-renderers-form, ui  (+ @dnd-kit)
  |
  +-- flux-renderers-data
  |     deps: flux-core, flux-formula, flux-i18n, flux-react, flux-renderers-form,
  |           flux-runtime, ui  (+ @tanstack/react-virtual, recharts)
  |     devDeps: flux-compiler
  |
  +-- flux-code-editor
  |     deps: flux-core, flux-formula, flux-i18n, flux-react, ui  (+ codemirror)
  |     devDeps: flux-renderers-basic, flux-renderers-data, flux-renderers-form
  |     (note: no flux-runtime dep)
  |
  +-- nop-debugger
  |     deps: flux-core, flux-formula, flux-i18n, ui  (+ lucide-react, react)
  |     (note: no flux-react, no flux-runtime dep)
  |
  +-- flow-designer-core
  |     deps: flux-core, flux-formula  (+ elkjs, zustand)
  |
  +-- flow-designer-renderers
  |     deps: flow-designer-core, flux-core, flux-formula, flux-i18n, flux-react,
  |           flux-runtime, ui  (+ @xyflow/react)
  |     exports: ".", "./unstable"
  |
  +-- spreadsheet-core
  |     deps: zustand (no @nop-chaos/* deps)
  |
  +-- spreadsheet-renderers
  |     deps: spreadsheet-core, flux-formula, flux-runtime, flux-react, flux-core,
  |           flux-i18n, ui
  |
  +-- report-designer-core
  |     deps: flux-core, spreadsheet-core  (+ zustand)
  |
  +-- report-designer-renderers
  |     deps: spreadsheet-core, flux-formula, spreadsheet-renderers,
  |           report-designer-core, flux-react, flux-runtime, flux-core, flux-i18n, ui
  |
  +-- word-editor-core
  |     deps: @hufe921/canvas-editor, zustand  (no @nop-chaos/* deps)
  |
  +-- word-editor-renderers
  |     deps: flux-core, flux-i18n, flux-react, flux-runtime, theme-tokens, ui,
  |           word-editor-core  (+ canvas-editor, lucide-react, recharts, use-sync-external-store)
  |     devDeps: flux-formula
  |     exports: ".", "./styles.css"
```

---

## 逐条规则检查结果

### 规则 (a): flux-core 不能依赖任何其他 @nop-chaos/\* 包

**通过。**

### 规则 (b): flux-formula 只能依赖 flux-core

**通过。**

### 规则 (c): flux-runtime 只能依赖 flux-core 和 flux-formula

**偏差。** `flux-runtime` 实际依赖 `flux-core`, `flux-formula`, `flux-compiler`, `flux-action-core`。
**校准判定（Calibration Pattern #5）**：已文档化的架构演进结果，`flux-runtime-module-boundaries.md` 明确记录了协作方。降级处理。

### 规则 (d): flux-react 不能依赖任何 renderers 包

**通过。**

### 规则 (e): renderers 包对 core/formula/runtime 的依赖是否通过公开 API

**通过。** 未发现通过 `/src/` 内部路径导入。

### 规则 (f): _-core 包不能依赖 _-renderers 包

**通过。**

### 规则 (g): spreadsheet-core 不能依赖 report-designer-core

**通过。**

### 规则 (h): ui 的依赖是否合理

**通过。** 仅依赖 `flux-i18n`。

### 规则 (i): tailwind-preset 和 theme-tokens 不依赖任何运行时包

**通过。**

---

## 发现清单

### [维度01] word-editor-renderers 声明了对 @nop-chaos/theme-tokens 的依赖但未实际使用

- **文件**: `packages/word-editor-renderers/package.json` (line 24)
- **严重程度**: P2
- **现状**: `@nop-chaos/theme-tokens` 在 `dependencies` 中声明，但整个 `word-editor-renderers/src/` 中没有任何 `import` 或引用。
- **风险**: 轻微的幽灵依赖。
- **建议**: 移除未使用的依赖。

### [维度01] AGENTS.md 依赖图与实际 package.json 不完全一致

- **文件**: `AGENTS.md` (Dependency Flow 段落)
- **严重程度**: P2
- **现状**: AGENTS.md 的依赖图声明 `flux-runtime` 只依赖 `flux-core -> flux-formula`，但实际还依赖 `flux-compiler` 和 `flux-action-core`。
- **风险**: 新开发者或 AI agent 阅读后可能对依赖图产生错误理解。
- **建议**: 更新 AGENTS.md 的 Dependency Flow 段落。

---

## 额外检查结果

- **内部路径导入**: 未发现违规。
- **循环依赖**: 未发现。
- **exports 字段一致性**: 全部 24 个包均使用 `types` + `default` 双条件导出。
- **tsconfig.build.json 和 build 脚本**: 全部 24 个包均具有。

---

## 合规的包清单

| 包                           | 状态                           |
| ---------------------------- | ------------------------------ |
| flux-core                    | 完全合规                       |
| flux-formula                 | 完全合规                       |
| flux-compiler                | 完全合规                       |
| flux-action-core             | 完全合规                       |
| flux-i18n                    | 完全合规                       |
| flux-runtime                 | 合规（含文档已记录的扩展依赖） |
| flux-react                   | 完全合规                       |
| ui                           | 完全合规                       |
| tailwind-preset              | 完全合规                       |
| theme-tokens                 | 完全合规                       |
| flux-renderers-basic         | 完全合规                       |
| flux-renderers-form          | 完全合规                       |
| flux-renderers-form-advanced | 完全合规                       |
| flux-renderers-data          | 完全合规                       |
| flux-code-editor             | 完全合规                       |
| nop-debugger                 | 完全合规                       |
| flow-designer-core           | 完全合规                       |
| flow-designer-renderers      | 完全合规                       |
| spreadsheet-core             | 完全合规                       |
| spreadsheet-renderers        | 完全合规                       |
| report-designer-core         | 完全合规                       |
| report-designer-renderers    | 完全合规                       |
| word-editor-core             | 完全合规                       |
| word-editor-renderers        | P2 幽灵依赖                    |

---

## 总结评估

**整体评级：健康。** 无 P0/P1 级问题。2 项 P2 级发现。核心依赖链严格遵守单向流动。

---

## 深挖第 2 轮追加

### [维度01] 4 个包中 @nop-chaos/flux-runtime 声明为 dependency 但无任何导入

- **文件**: word-editor-renderers, flux-renderers-basic, flux-renderers-form-advanced, flux-renderers-data 的 package.json
- **严重程度**: P2
- **现状**: 以上 4 个包的 src/ 中 `@nop-chaos/flux-runtime` 导入为零。通过 flux-react 间接获得类型。
- **建议**: 移除死依赖。

### [维度01] react-dom 在 4 个包中声明但全项目 src/ 无任何导入

- **文件**: word-editor-renderers, flow-designer-renderers, spreadsheet-renderers, report-designer-renderers 的 package.json
- **严重程度**: P2
- **现状**: 这些包不使用 createPortal/flushSync 等 react-dom API。pnpm 通过第三方库 peerDep 自动解析。
- **建议**: 移除死依赖。

### [维度01] 7 个包将仅测试使用的 flux-formula 放于 dependencies

- **文件**: flux-renderers-basic, flux-renderers-form, flux-renderers-data, flux-renderers-form-advanced, flow-designer-renderers, spreadsheet-renderers, report-designer-renderers
- **严重程度**: P3
- **现状**: flux-formula 导入仅来自测试文件，与同包内 flux-compiler 放于 devDependencies 的做法不一致。
- **建议**: 统一将仅测试使用的依赖放于 devDependencies。
