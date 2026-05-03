# 11 UI 组件使用合规性

- 初审发现数: 1
- 维度复核: 完成
- 子项复核: 0
- 最终结果: 保留 1 / 降级 0 / 驳回 0

### [维度11] report designer playground 面板折叠开关仍使用原生 `<button>`

- **文件**: `apps/playground/src/pages/report-designer-demo.tsx:401-408`
- **证据片段**:
  ```tsx
  <button
    type="button"
    aria-label={paletteCollapsed ? 'Expand palette' : 'Collapse palette'}
    onClick={() => setPaletteCollapsed((value) => !value)}
  >
  ```
- **严重程度**: P2
- **原生元素**: `<button>`
- **应替换为**: `@nop-chaos/ui` 的 `Button`
- **所在层**: `apps/playground` 页面层
- **替换可行性**: 高
- **现状**: 该按钮不属于 UI 包内部实现，也不属于 file/color input 或 spreadsheet host surface 例外。
- **建议**: 改为 `Button variant="ghost" size="icon"`，并复用现有可访问性标签。
- **为什么值得现在做**: 这是仓库显式 UI 组件规则的单点违约，替换收益明确且成本低。
- **误报排除**: 维度复核已排除 `packages/ui` 内部实现、`input[type=file]`、`input[type=color]`、spreadsheet host surface 等合理例外。
- **参考文档**: `AGENTS.md` UI Component Usage, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 维度复核通过
