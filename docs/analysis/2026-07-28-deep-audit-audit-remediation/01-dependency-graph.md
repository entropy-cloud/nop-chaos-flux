# Dimension 01: Dependency Graph & Package Boundaries

## 第 1 轮（初审）

### [D01-01] flux-runtime 依赖超出允许范围 — 规则(c)字面违规

- **文件**: packages/flux-runtime/package.json:15-20
- **严重程度**: P2
- **现状**: flux-runtime 实际依赖 4 个包 (`flux-core`, `flux-formula`, `flux-compiler`, `flux-action-core`)，但规则(c)规定"必须 ONLY 依赖 flux-core 和 flux-formula"。架构文档(AGENTS.md、flux-runtime-module-boundaries.md)明确记录了这种依赖链，所以这是规则文本过时而非实际违规。
- **风险**: 规则文本与实际架构意图不一致，会导致后续审计误判。
- **建议**: 更新规则(c)以允许 `flux-runtime` 依赖 `flux-core`, `flux-formula`, `flux-compiler`, `flux-action-core`。
- **误报排除**: 已知的文档-代码偏差类型，不构成实际行为问题。

### [D01-02] flux-renderers-mobile 缺少 @nop-chaos/flux-react 依赖

- **文件**: packages/flux-renderers-mobile/package.json:20-24
- **严重程度**: P2
- **现状**: mobile 渲染器包在 package.json 中未声明 `@nop-chaos/flux-react` 依赖，而所有其他渲染器包都声明了。虽然生产代码未直接从 flux-react 导入，但违反了渲染器包的标准约定。
- **风险**: 如果未来需要 flux-react 的 hooks（useRendererRuntime、useScopeSelector 等），会缺少明确的解析路径。
- **建议**: 添加 `"@nop-chaos/flux-react": "workspace:*"` 作为依赖。
- **误报排除**: 这是真实的不一致，非校准模式覆盖范围。

### [D01-03] flux-renderers-data 依赖 flux-renderers-basic — 跨渲染器生产耦合

- **文件**: packages/flux-renderers-data/package.json:15-22; src/table-renderer/table-cell-chrome.tsx:9
- **严重程度**: P2
- **现状**: data 包从 basic 包导入 `copyToClipboard`，创建了渲染器包之间的硬生产依赖。
- **风险**: basic 包公共 API 的变化会破坏 data 包。
- **建议**: 将 `copyToClipboard` 提取到 `@nop-chaos/flux-core` 或 `@nop-chaos/ui` 中的共享工具模块。
- **误报排除**: 校准模式#2 需要更强证据——这项发现满足要求，因为它建立了渲染器包之间的生产耦合，而不仅仅是公共 API 依赖。

### [D01-04] flux-renderers-form-advanced 依赖多个渲染器包 — 跨渲染器耦合

- **文件**: packages/flux-renderers-form-advanced/package.json:22-24
- **严重程度**: P2
- **现状**: form-advanced 包生产依赖 `flux-renderers-data`、`flux-renderers-content` 和 `flux-renderers-form`。在生产源文件中使用了这些依赖（如 combo-renderer.tsx 从 form 导入 `formFieldRules`）。
- **风险**: 创建了非正式的"高级渲染器"层，隐式依赖基本渲染器。
- **建议**: 评估将共享表单原语（`formFieldRules`、`useFieldPresentation`）提升到 `@nop-chaos/flux-react` 或记录认可的跨渲染器导出面。
- **误报排除**: 校准模式#2 不适用——这是跨渲染器耦合，不是对核心包的依赖。

### [D01-05] flux-renderers-ai 依赖 flux-renderers-content — 跨渲染器耦合

- **文件**: packages/flux-renderers-ai/package.json:28; src/renderers/ai-bubble/renderers/markdown.tsx:5
- **严重程度**: P2
- **现状**: ai 包从 content 包导入 `sanitizeHtml`。
- **风险**: content 包公共 API 的变化会破坏 ai 包。
- **建议**: 将 `sanitizeHtml` 提升到共享工具模块，或记录有意依赖关系。
- **误报排除**: 同上。

### [D01-06] flux-code-editor 依赖 flux-renderers-form — 跨渲染器耦合

- **文件**: packages/flux-code-editor/package.json:43; src/code-editor-renderer.tsx:6
- **严重程度**: P2
- **现状**: code-editor 包从 form 包导入 `formFieldChromeRules`。
- **风险**: 跨渲染器包耦合。
- **建议**: 将共享表单规则提取到 `@nop-chaos/flux-react/unstable` 或 `@nop-chaos/flux-core`。
- **误报排除**: 同上。

### [D01-07] flux-code-editor 渲染器包作为 devDependencies（测试用 — 正确用法）

- **文件**: packages/flux-code-editor/package.json:53-54
- **严重程度**: P3
- **现状**: basic 和 data 渲染器在测试文件中导入，作为 devDependencies 正确声明。
- **风险**: 低。仅测试代码。
- **建议**: 无紧急措施。

### [D01-09] report-designer-renderers 依赖 spreadsheet-renderers — 跨领域渲染器耦合

- **文件**: packages/report-designer-renderers/package.json:20-23
- **严重程度**: P2
- **现状**: 报告设计器在电子表格渲染器上构建，创建了跨领域依赖。
- **风险**: 架构设计使然，但未在边界文档中明确记录。
- **建议**: 在 `docs/architecture/flux-runtime-module-boundaries.md` 中记录此有意的跨领域引用。
- **误报排除**: 校准模式#4 要求更强证据——这项发现满足，因为这是一个真实的边界交叉，需要文档记录。

### [D01-10] exports 字段缺少 import/require 条件

- **文件**: 所有 30 个 packages/\*/package.json
- **严重程度**: P3
- **现状**: 所有包使用 `types` + `default` 双条件导出，但缺少 `import`/`require` 区分。
- **风险**: 在混合环境中可能影响树摇优化。
- **建议**: 添加 `"import": "./dist/index.js"` 作为 `default` 的补充。

### [D01-11] flux-renderers-form-advanced 依赖 flux-runtime — 渲染器依赖运行时

- **文件**: packages/flux-renderers-form-advanced/package.json:25; src/detail-view/projected-scope.ts:1
- **严重程度**: P2
- **现状**: form-advanced 包从 flux-runtime 导入 `createProjectedScopeStore`。规则(e)明确允许渲染器依赖 flux-runtime 公共 API，但此具体函数是否意向公开需要确认。
- **风险**: 如果 `createProjectedScopeStore` 非公开 API，则路径被覆盖。
- **建议**: 验证 `createProjectedScopeStore` 是否有意向作为公共 API 的一部分。

### [D01-12] flux-bundle 使用 vite build，其他包使用 tsc

- **文件**: packages/flux-bundle/package.json:53
- **严重程度**: P3
- **现状**: flux-bundle 是面向主机的 facade 包，使用 `vite build`；其他包使用 `tsc -p tsconfig.build.json`。
- **风险**: 零。设计如此。
- **建议**: 无。

## 维度复核结论

- [D01-01]: 保留 P2。规则(c)文本确实过时，需要更新。
- [D01-02]: 保留 P2。缺少标准依赖是不一致问题。
- [D01-03]: 保留 P2。跨渲染器生产耦合是真实维护负担。
- [D01-04]: 保留 P2。同上。
- [D01-05]: 保留 P2。同上。
- [D01-06]: 保留 P2。同上。
- [D01-07]: 保留 P3。测试依赖，正确分类。
- [D01-09]: 保留 P2。有意但未记录，需要文档化。
- [D01-10]: 保留 P3。非阻塞性改进。
- [D01-11]: 保留 P2。需要验证 API 公开意图。
- [D01-12]: 保留 P3。设计使然。

## 最终保留项

| 编号  | 严重程度 | 文件                                              | 一句话摘要                                    |
| ----- | -------- | ------------------------------------------------- | --------------------------------------------- |
| 01-01 | P2       | `flux-runtime/package.json:15-20`                 | 规则(c)文本过时，与实际依赖不符               |
| 01-02 | P2       | `flux-renderers-mobile/package.json:20-24`        | 缺少标准 flux-react 依赖                      |
| 01-03 | P2       | `flux-renderers-data/package.json:15-22`          | 跨渲染器耦合：data 依赖 basic                 |
| 01-04 | P2       | `flux-renderers-form-advanced/package.json:22-24` | 跨渲染器耦合：form-advanced 依赖 3 个渲染器包 |
| 01-05 | P2       | `flux-renderers-ai/package.json:28`               | 跨渲染器耦合：ai 依赖 content                 |
| 01-06 | P2       | `flux-code-editor/package.json:43`                | 跨渲染器耦合：code-editor 依赖 form           |
| 01-09 | P2       | `report-designer-renderers/package.json:20-23`    | 跨领域耦合：report-designer 依赖 spreadsheet  |
| 01-11 | P2       | `flux-renderers-form-advanced/package.json:25`    | 运行时依赖需验证公开意图                      |
