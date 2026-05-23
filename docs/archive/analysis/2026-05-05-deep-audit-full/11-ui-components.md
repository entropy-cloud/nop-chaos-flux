# 维度 11：UI 组件使用合规性

## 初审

- 初审仅提出 1 条：playground report designer demo 页面手写原生 `<button>`。

## 维度复核

- 该条被降级为 demo 页面 hygiene 问题，不作为主缺陷。

## 最终结论

### [维度11] playground panel toggle 仍手写原生 `<button>`

- **文件**: `apps/playground/src/pages/report-designer-demo.tsx:401-408`
- **证据片段**:
  ```tsx
  <button
    type="button"
    data-slot="report-demo-panel-toggle"
    onClick={() => setPaletteCollapsed((value) => !value)}
  >
  ```
- **严重程度**: P3
- **现状**: demo 页局部切换按钮没有复用 `@nop-chaos/ui/Button`。
- **风险**: 主要是示例层一致性与维护性偏差，证据不足以升级为主契约问题。
- **建议**: 作为后续 UI hygiene 顺手替换。
- **参考文档**: `AGENTS.md`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: `已降级`
