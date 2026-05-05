# 维度 16：文档-代码一致性

## 初审

- 初审命中多份 active docs 仍引用不存在的 `apps/playground/src/app.tsx` 或旧 PascalCase 页面路径。

## 维度复核

- 保留范围收窄为 6 份 active docs。
- logs / archive / plans 中的历史路径不计入当前缺陷。

## 最终结论

### [维度16] active docs 仍引用不存在的 `apps/playground/src/app.tsx`

- **文档路径**: `docs/index.md:115,186`, `docs/architecture/playground-experience.md`, `docs/architecture/theme-compatibility.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/flow-designer/collaboration.md`, `docs/references/maintenance-checklist.md`
- **代码路径**: `apps/playground/src/App.tsx`
- **证据片段**:
  ```md
  apps/playground/src/app.tsx
  ```
- **严重程度**: P1
- **漂移类型**: 路径失效
- **文档描述**: 多份 active owner doc / routing doc 仍把 `app.tsx` 当作当前 playground 入口。
- **代码现状**: live repo 只有 `App.tsx`，不存在 `app.tsx`。
- **建议**: 只修这 6 份 active docs 的失效锚点，不扩散到 logs/archive/plans。
- **参考文档**: `docs/index.md`, `docs/references/maintenance-checklist.md`
- **复核状态**: `子项复核通过`

### [维度16] active docs 仍引用旧 PascalCase 页面路径

- **文档路径**: `docs/architecture/playground-experience.md`, `docs/architecture/theme-compatibility.md`, `docs/architecture/debugger-runtime.md`
- **代码路径**: `apps/playground/src/use-route.ts`, `apps/playground/src/component-lab/component-lab-page.tsx`, `apps/playground/src/pages/home-page.tsx`, `apps/playground/src/pages/flow-designer-page.tsx`, `apps/playground/src/pages/flux-basic-page.tsx`, `apps/playground/src/pages/debugger-lab-page.tsx`
- **证据片段**:
  ```md
  ComponentLabPage.tsx
  HomePage.tsx
  FlowDesignerPage.tsx
  FluxBasicPage.tsx
  DebuggerLabPage.tsx
  ```
- **严重程度**: P2
- **漂移类型**: 路径失效 / 命名失真
- **文档描述**: 文档中的 current code anchor 仍停留在旧 PascalCase 文件名。
- **代码现状**: live repo 已切到 kebab-case 页面与 hook 文件名。
- **建议**: 逐份 active doc 修正具体 anchor，必要时用更语义化的 page/schema 锚点替代单纯入口文件。
- **参考文档**: `docs/architecture/playground-experience.md`
- **复核状态**: `子项复核通过`
