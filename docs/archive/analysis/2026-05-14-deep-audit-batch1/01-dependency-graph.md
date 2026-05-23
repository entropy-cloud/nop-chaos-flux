# 维度 01：依赖图与包边界

## 第 1 轮（初审）

未发现需报告问题。

### 检查范围

- 已读取 `docs/index.md`、`AGENTS.md`、`docs/references/deep-audit-calibration-patterns.md`、`docs/references/reopened-design-decisions-and-audit-adjudications.md`、`docs/architecture/flux-runtime-module-boundaries.md`
- 已检查全部 `packages/*/package.json` 与 `packages/*/tsconfig.build.json`
- 已搜索跨包私有路径导入、未导出子路径、明显循环依赖迹象、缺失 build/exports 配置

### 依赖图

- `@nop-chaos/flux-core` -> 无
- `@nop-chaos/flux-formula` -> `@nop-chaos/flux-core`
- `@nop-chaos/flux-compiler` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-formula`
- `@nop-chaos/flux-action-core` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-compiler`
- `@nop-chaos/flux-runtime` -> `@nop-chaos/flux-action-core`, `@nop-chaos/flux-compiler`, `@nop-chaos/flux-formula`, `@nop-chaos/flux-core`
- `@nop-chaos/flux-react` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-formula`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-runtime`, `@nop-chaos/ui`
- `@nop-chaos/flux-renderers-basic` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui`
- `@nop-chaos/flux-renderers-data` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui`
- `@nop-chaos/flux-renderers-form` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/flux-runtime`, `@nop-chaos/ui`
- `@nop-chaos/flux-renderers-form-advanced` -> `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/flux-renderers-form`, `@nop-chaos/ui`
- `@nop-chaos/flow-designer-renderers` -> `@nop-chaos/flow-designer-core`, `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui`
- `@nop-chaos/report-designer-renderers` -> `@nop-chaos/spreadsheet-core`, `@nop-chaos/spreadsheet-renderers`, `@nop-chaos/report-designer-core`, `@nop-chaos/flux-react`, `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/ui`

## 维度复核结论

- 结论：未发现需报告问题。
- 独立复核重新检查了核心包 manifest、公开 subpath、`exports` 对齐、`tsconfig.build.json`、以及跨包导入。
- 复核确认：未发现 `@nop-chaos/*/src/...` 私有路径导入；`@nop-chaos/flux-react/unstable`、`@nop-chaos/flux-renderers-form/definitions`、`@nop-chaos/ui/chart`、`@nop-chaos/spreadsheet-renderers/canvas-styles.css` 都属于已声明导出面。
- 复核确认：当前 `renderers -> flux-core/flux-runtime/flux-react` 的公开依赖符合校准规则，不构成边界缺陷。

## 子项复核结论

- 无需逐项复核；零发现维度已由独立复核 agent 重新核对 live code 和当前文档。

## 最终保留项

| 编号 | 严重程度 | 文件 | 一句话摘要                     |
| ---- | -------- | ---- | ------------------------------ |
| 无   | 无       | 无   | 本维度经独立复核后无可报告问题 |
