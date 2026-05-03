# 维度11 UI 组件使用合规性

- 初审发现数: 1
- 复核结果: 保留 0 / 降级 1 / 驳回 0

### [维度11] Playground demo 页仍使用原生 `<button>`

- **文件**: `apps/playground/src/pages/report-designer-demo.tsx:401-408`
- **证据片段**:

```tsx
<button
  type="button"
  aria-label={collapsed ? 'Expand field panel' : 'Collapse field panel'}
>
```

- **严重程度**: P3
- **原生元素**: `<button>`
- **应替换为**: `@nop-chaos/ui` 的 `<Button>`
- **所在层**: app demo 页面
- **替换可行性**: 高
- **现状**: 普通交互按钮仍未统一到 UI 组件库。
- **风险**: 样式/焦点/可访问性基线不一致，但影响面主要在 demo 层。
- **建议**: 改为 `<Button variant="ghost" size="icon">` 一类等价实现。
- **为什么值得现在做**: 改动小，可直接消除 demo 与正式 UI 契约的偏差。
- **误报排除**: 不是 `input[type=file]` / `input[type=color]` 等原生特例。
- **历史模式对应**: demo shell bypasses shared UI library。
- **参考文档**: `AGENTS.md`, `packages/ui/src/index.ts`
- **复核状态**: `已降级`

## 复核备注

- 维度复核额外指出 `spreadsheet-renderers` 和 `ui` 包里仍有值得进一步 scoped audit 的原生元素用法，但它们与“高性能宿主表面例外”的边界还需单独确认，本轮未纳入保留条目。
