# 维度11：UI 组件使用合规性

- 审核日期：2026-04-17
- 初审发现：0
- 维度复核结论：补充 1

## 已通过独立复核

### [维度11-01] `json-viewer` 内部仍直接使用原生 `<button>`

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/ui/src/components/ui/json-viewer.tsx`, `packages/ui/src/index.ts`, `AGENTS.md`
- 现状：JSON/YAML 切换直接使用原生按钮。
- 建议：改为本包已提供的 `Button`。

## 复核确认的合理例外

- `input[type=file]`
- `input[type=color]`
- spreadsheet 高性能 grid / table / editor 宿主表面
