# 维度 01: 依赖图与包边界

## 第 1 轮（初审）

### [维度01-Z0] 初审零发现结论

- **检查范围**: `packages/*/package.json` 全量内部依赖；`@nop-chaos/*/src/` 私有子路径导入 grep；package `exports` / `build` / `tsconfig.build.json` 摘要。
- **读取文档**: `AGENTS.md`、`docs/architecture/flux-runtime-module-boundaries.md`、`docs/references/audit-tooling.md`、`docs/references/deep-audit-calibration-patterns.md`。
- **依赖图摘要**:
  ```text
  flux-core
    -> flux-formula
    -> flux-compiler
    -> flux-action-core
    -> flux-runtime
    -> flux-react
    -> flux-renderers-*
  report-designer-core -> spreadsheet-core
  report-designer-renderers -> report-designer-core + spreadsheet-renderers
  ```
- **现状**: 本轮根据 manifest 基线未发现 `*-core -> *-renderers` 反向依赖、`flux-core` 反向依赖、`spreadsheet-core -> report-designer-core` 违约、或跨包 `@nop-chaos/.../src/...` 私有路径导入。
- **复核前结论**: 当前可见内部依赖与 owner 文档一致；`report-designer-renderers -> spreadsheet-renderers` 命中 calibration pattern 4，但属于文档允许的共享 bridge 复用，不构成边界违规。

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度01-Z0]: 维度复核通过。重新核对 manifest 摘要与 owner docs 后，未发现需报告的 live 边界违约；`vite.workspace-alias.ts` 中的 `packages/ui/src/index.ts` 是工作区构建别名，不属于跨包源码私有导入缺陷。

## 子项复核结论

- 本维度无保留项，无需逐条子项复核。

## 最终保留项

| 编号 | 严重程度 | 文件 | 一句话摘要                   |
| ---- | -------- | ---- | ---------------------------- |
| 无   | -        | -    | 本维度经复核未发现需报告问题 |
