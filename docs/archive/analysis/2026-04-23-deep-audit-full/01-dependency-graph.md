# 维度 01：依赖图与包边界

- 初审发现：1
- 维度复核：完成
- 子项复核：1 组（测试跨包导入）

## 结论

1. [维度复核通过] `apps/playground/src/styles.css` 直接 `@import "../../../packages/ui/src/styles/base.css"`，绕过了 `@nop-chaos/ui/base.css` 公开导出，属于真实跨包内部路径依赖。
   参考：`apps/playground/src/styles.css:3`，`packages/ui/package.json:22-23`

2. [已降级] 测试代码中确有跨包 `src` 路径导入，但整体更像测试导入未收敛而非高等级边界破坏。
   参考：`packages/flux-renderers-form-advanced/src/__tests__/form-double-edit-regression.test.tsx:8`，`packages/flow-designer-renderers/src/index.xyflow.test.tsx:3-8`，`packages/flux-renderers-form/package.json:14-17`

## 复核摘要

- 保留：1
- 降级：1
- 驳回：0

## 备注

- 24 个 workspace package 的 `package.json`、`build` 脚本、`tsconfig.build.json`、root `exports` 主体均通过复核。
- package manifest 级循环依赖本轮未发现。
