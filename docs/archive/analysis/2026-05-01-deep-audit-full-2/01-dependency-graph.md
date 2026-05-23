# 维度 01 审核报告：依赖图与包边界（初审）

## 完整依赖图

```
@nop-chaos/flux-core              [无 @nop-chaos 依赖]
  |
  +-- @nop-chaos/flux-formula     [-> flux-core]
  |     |
  |     +-- @nop-chaos/flux-compiler  [-> flux-core, flux-formula]
  |     |     |
  |     |     +-- @nop-chaos/flux-action-core  [-> flux-core, flux-compiler]
  |     |           |
  |     |           +-- @nop-chaos/flux-runtime  [-> flux-core, flux-formula, flux-compiler, flux-action-core]
  |     |                 |
  |     |                 +-- @nop-chaos/flux-react  [-> flux-core, flux-formula, flux-compiler, flux-i18n, flux-runtime, ui]
  |     |                       |
  |     |                       +-- @nop-chaos/flux-renderers-basic       [-> flux-core, flux-formula, flux-i18n, flux-react, flux-runtime, ui]
  |     |                       |     |
  |     |                       |     +-- @nop-chaos/flux-renderers-form  [-> flux-core, flux-formula, flux-compiler, flux-i18n, flux-react, flux-runtime, flux-renderers-basic, ui]
  |     |                       |     |     |
  |     |                       |     |     +-- @nop-chaos/flux-renderers-form-advanced  [-> flux-core, flux-formula, flux-i18n, flux-react, flux-runtime, flux-renderers-basic, flux-renderers-form, ui]
  |     |                       |     |
  |     |                       |     +-- @nop-chaos/flux-renderers-data  [-> flux-core, flux-formula, flux-compiler, flux-i18n, flux-react, flux-runtime, flux-renderers-form, ui]
  |     |                       |
  |     |                       +-- @nop-chaos/flux-code-editor           [-> flux-core, flux-formula, flux-i18n, flux-react, ui]
  |     |                       +-- @nop-chaos/flow-designer-renderers    [-> flux-core, flux-formula, flux-i18n, flux-react, flux-runtime, flow-designer-core, ui]
  |     |                       +-- @nop-chaos/spreadsheet-renderers      [-> flux-core, flux-formula, flux-i18n, flux-react, flux-runtime, spreadsheet-core, ui]
  |     |                       +-- @nop-chaos/report-designer-renderers  [-> flux-core, flux-formula, flux-i18n, flux-react, flux-runtime, spreadsheet-core, spreadsheet-renderers, report-designer-core, ui]
  |     |                       +-- @nop-chaos/word-editor-renderers      [-> flux-core, flux-i18n, flux-react, flux-runtime, word-editor-core, ui]
  |
  +-- @nop-chaos/flux-i18n       [-> flux-core]
  |     |
  |     +-- @nop-chaos/ui        [-> flux-i18n]
  |     +-- (also consumed by flux-react, all renderers, debugger, code-editor)

@nop-chaos/flow-designer-core    [-> flux-core, flux-formula, elkjs, zustand]
@nop-chaos/spreadsheet-core      [-> zustand]  (无 @nop-chaos 依赖)
@nop-chaos/report-designer-core  [-> flux-core, spreadsheet-core, zustand]
@nop-chaos/word-editor-core      [-> canvas-editor, zustand]  (无 @nop-chaos 依赖)

@nop-chaos/tailwind-preset       [-> tailwindcss-animate]  (无 @nop-chaos 依赖)
@nop-chaos/theme-tokens          [无依赖]  (纯 CSS tokens)

@nop-chaos/nop-debugger          [-> flux-core, flux-formula, flux-i18n, ui]

@nop-chaos/flux-playground       [所有包]  (apps/playground，消费者)
```

---

## 发现

### [维度01-F1] AGENTS.md Workspace Packages 描述与 flux-runtime 实际依赖不一致

- **文件**: `AGENTS.md` 第 16 行
- **严重程度**: P2
- **现状**: AGENTS.md 的 "Workspace Packages" 章节描述 flux-runtime 为 "Core runtime (Zustand stores, validation, actions)"，未提及对 flux-compiler 或 flux-action-core 的依赖。但实际 `packages/flux-runtime/package.json` 声明了 4 个 @nop-chaos/\* 依赖：flux-action-core、flux-compiler、flux-formula、flux-core。
- **证据**:

  ```
  # AGENTS.md 第 16 行
  - `@nop-chaos/flux-runtime` - Core runtime (Zustand stores, validation, actions).

  # packages/flux-runtime/package.json 第 15-20 行
  "dependencies": {
    "@nop-chaos/flux-action-core": "workspace:*",
    "@nop-chaos/flux-compiler": "workspace:*",
    "@nop-chaos/flux-formula": "workspace:*",
    "@nop-chaos/flux-core": "workspace:*",
    "zustand": "^5.0.12"
  }
  ```

- **缓解因素**: AGENTS.md 的 "Dependency Flow" 章节（第 40 行）已正确记录了完整链路：`flux-core -> flux-formula -> flux-compiler -> flux-action-core -> flux-runtime`。两处自相矛盾。
- **风险**: 新开发者只读 Workspace Packages 列表时会误判 flux-runtime 的依赖范围。
- **建议**: 在 Workspace Packages 列表中为 flux-runtime 补充依赖说明。

---

### [维度01-F2] ui 包生产依赖 @nop-chaos/flux-i18n

- **文件**: `packages/ui/package.json` 第 32 行
- **严重程度**: P3
- **现状**: `@nop-chaos/ui` 在 dependencies 中声明了 `@nop-chaos/flux-i18n: workspace:*`。6 个 UI 组件文件导入了 `t` 函数用于国际化。
- **证据**:

  ```
  # packages/ui/package.json 第 32 行
  "@nop-chaos/flux-i18n": "workspace:*",

  # 实际使用（6 处）
  packages/ui/src/components/ui/sidebar-layout.tsx:4
  packages/ui/src/components/ui/sheet.tsx:3
  packages/ui/src/components/ui/pagination.tsx:2
  packages/ui/src/components/ui/dialog.tsx:5
  packages/ui/src/components/ui/carousel.tsx:3
  packages/ui/src/components/ui/breadcrumb.tsx:4
  ```

- **缓解因素**: AGENTS.md Dependency Flow 章节已明确记录了 `flux-i18n -> ui`。
- **风险**: ui 是共享组件库，对 flux-i18n 的耦合意味着 ui 无法独立于 Flux i18n 基础设施使用。当前 monorepo 范围内可接受。
- **建议**: 当前维持不变。

---

### [维度01-F3] flux-renderers-data 和 flux-renderers-form 将 flux-compiler 声明为生产依赖，但仅在测试中使用

- **文件**: `packages/flux-renderers-data/package.json` 第 16 行; `packages/flux-renderers-form/package.json` 第 22 行
- **严重程度**: P3
- **现状**: 这两个包在 `dependencies` 中声明了 `@nop-chaos/flux-compiler: workspace:*`，但生产代码中无任何 import 引用 flux-compiler；仅测试文件使用。
- **风险**: manifest 不准确可能误导依赖分析工具。风险极低。
- **建议**: 将两个包中的 `@nop-chaos/flux-compiler` 从 `dependencies` 移至 `devDependencies`。

---

## 合规检查总结

| 规则                                             | 结果          | 备注                                                 |
| ------------------------------------------------ | ------------- | ---------------------------------------------------- |
| a. flux-core 不依赖其他 @nop-chaos/\*            | **PASS**      | 零内部依赖                                           |
| b. flux-formula 只依赖 flux-core                 | **PASS**      |                                                      |
| c. flux-runtime 只依赖 flux-core 和 flux-formula | **DEVIATION** | 实际还依赖 flux-compiler、flux-action-core，已文档化 |
| d. flux-react 不依赖 renderers 包                | **PASS**      |                                                      |
| e. renderers 包依赖合理                          | **PASS**      |                                                      |
| f. _-core 不依赖 _-renderers                     | **PASS**      |                                                      |
| g. spreadsheet-core 不依赖 report-designer-core  | **PASS**      |                                                      |
| h. ui 不依赖 @nop-chaos/\*                       | **DEVIATION** | ui 依赖 flux-i18n，已文档化                          |
| i. tailwind-preset / theme-tokens 不依赖运行时包 | **PASS**      |                                                      |

| 检查项                   | 结果     |
| ------------------------ | -------- |
| 内部路径导入 (`/src/`)   | **PASS** |
| 循环依赖                 | **PASS** |
| tsconfig.build.json 覆盖 | **PASS** |
| build 脚本覆盖           | **PASS** |
| exports 字段一致性       | **PASS** |
| 未声明的 import          | **PASS** |

## 维度复核结果

| 编号    | 初审 | 复核        | 理由                                                                                  |
| ------- | ---- | ----------- | ------------------------------------------------------------------------------------- |
| F1      | P2   | **驳回**    | Workspace Packages 描述粒度是职责级别，Dependency Flow 章节已正确记录，文档无实质错误 |
| F2      | P3   | **保留 P3** | 事实完全确认，已文档化但属于包边界耦合技术债                                          |
| F3      | P3   | **保留 P3** | 事实确认，仅测试文件使用 flux-compiler                                                |
| 合规 x4 | PASS | **均 PASS** | 抽查验证通过                                                                          |

最终发现：F2 (P3)、F3 (P3)。F1 驳回。
