# 维度 11：UI 组件使用合规性

## 审核范围

检查所有渲染器包中的原生 HTML 使用，确保优先使用 `@nop-chaos/ui` 组件。

## 发现清单

### [维度11] crud-renderer-toolbar.tsx 使用原生 `<label>`

- **文件**: `packages/flux-renderers-data/src/crud-renderer-toolbar.tsx`
- **严重程度**: P3
- **原生元素**: `<label>`
- **应替换为**: `<Label>` from `@nop-chaos/ui`
- **所在层**: 渲染器
- **替换可行性**: 高
- **建议**: 替换为 `<Label>` 组件。
- **复核状态**: 维度复核通过

### 合理的原生 HTML 例外

以下原生 HTML 使用经复核确认为合理例外：

1. **input[type=file]** — 浏览器原生文件选择控件，`@nop-chaos/ui` 无等价封装。
2. **input[type=color]** — 浏览器原生颜色选择器，同上。
3. **spreadsheet grid** — 高性能画布宿主表面，需要精确 DOM 控制。
4. **virtual scroll spacers** — 虚拟滚动内部实现需要原生 div 控制。
5. **ui 包内部实现** — ui 包自身使用原生元素构建 shadcn/ui 组件，完全合理。

### 无 radix-ui 绕过

未发现任何包直接依赖 radix-ui 而不通过 `@nop-chaos/ui`。✓

## 总结评估

UI 组件使用合规性极高。仅 1 个 P3（crud-renderer-toolbar 的 `<label>`）。所有原生 HTML 使用都有合理的性能或平台能力解释。无需 P0/P1/P2 修复。
