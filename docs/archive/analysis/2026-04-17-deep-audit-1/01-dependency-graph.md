# 维度01：依赖图与包边界

- 审核日期：2026-04-17
- 初审发现：1
- 维度复核结论：保留 1，补充 1

## 已通过独立复核

### [维度01-01] `@nop-chaos/ui` 直接依赖 `@nop-chaos/flux-i18n`

- 严重程度：P2
- 复核判定：暂不处理
- 文件：`packages/ui/package.json`, `packages/ui/src/components/ui/dialog.tsx`, `sheet.tsx`, `sidebar-layout.tsx`, `pagination.tsx`, `carousel.tsx`, `breadcrumb.tsx`
- 现状：共享 UI 包直接依赖并调用 `t(...)`。
- 风险：基础 UI 层与 Flux i18n 运行时绑定，后续拆分或复用成本上升。
- 建议：把默认文案注入上移，或让 `ui` 使用无依赖默认文本。

### [维度01-02] `@nop-chaos/theme-tokens` 的 CSS export 仍指向 `src`

- 严重程度：P3
- 复核判定：暂不处理
- 文件：`packages/theme-tokens/package.json`, `packages/theme-tokens/tsconfig.build.json`
- 现状：`./styles.css` 导出指向 `./src/styles.css`，未落在 `dist/`。
- 风险：包导出与仓库构建产物约束不一致。
- 建议：把可发布 CSS 收敛到 `dist/` 或明确记录这是源码直出例外。

## 复核后排除

- 无。

## 备注

- 未发现跨包内部路径导入。
- 未发现 package 级循环依赖。
- 未发现缺失 `build` 脚本或 `tsconfig.build.json` 的包。
