# 维度 01：依赖图与包边界

## 初审

- 初审发现 2 条：1 条保留，1 条降级。

## 维度复核

- 保留：CSS 子路径导出仍指向 `src/`
- 降级：`flux-react` 将仅 test-support 使用的 `@nop-chaos/flux-compiler` 放在 `dependencies`
- 驳回：无

## 最终结论

### [维度01] 公开 CSS 子路径仍指向 `src/`

- **文件**: `packages/flux-react/package.json:16-20`, `packages/theme-tokens/package.json:11-17`, `packages/word-editor-renderers/package.json:11-17`
- **证据片段**:
  ```json
  "./default-spacing.css": "./src/default-spacing.css"
  "./styles.css": "./src/styles.css"
  ```
- **严重程度**: P1
- **现状**: 3 个包的公开 CSS export 直接绑定源码目录。
- **风险**: 与仓库“构建产物进 `dist/`”基线冲突，放大打包与消费边界漂移。
- **建议**: 将 CSS 资源复制到 `dist/` 并把 exports 指向 `dist/*.css`。
- **参考文档**: `AGENTS.md`, `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: `子项复核通过`

### [维度01] `flux-react` 的 compiler 依赖分类偏宽

- **文件**: `packages/flux-react/package.json:22-31`, `packages/flux-react/src/test-support-runtime.tsx:13-15`, `packages/flux-react/tsconfig.build.json:12`
- **证据片段**:
  ```json
  "dependencies": {
    "@nop-chaos/flux-compiler": "workspace:*"
  }
  ```
- **严重程度**: P3
- **现状**: `flux-compiler` 只被 test-support 与测试使用，但仍被放在生产依赖里。
- **风险**: 污染依赖图，弱化真实 build/export 边界表达。
- **建议**: 复核是否可改为 `devDependencies`。
- **参考文档**: `AGENTS.md`
- **复核状态**: `已降级`
