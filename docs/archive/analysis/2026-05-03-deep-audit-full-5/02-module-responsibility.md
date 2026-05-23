# 02 模块职责与文件边界

- 初审发现数: 2
- 维度复核: 完成
- 子项复核: 0
- 最终结果: 保留 1 / 降级 0 / 驳回 1

## 保留

### [维度02] `designer-page.tsx` 再次膨胀为多职责宿主页

- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx:61-109,150-450,463-513`
- **证据片段**:

  ```tsx
  function TreeModeLayoutWrapper(...) {
    const [treeDocument, setTreeDocument] = React.useState(...)
    const core = useMemo(() => createDesignerCore(...), ...)
  }

  <WorkbenchShell ... />
  <Dialog open={jsonOpen} ... />
  <Dialog open={Boolean(pendingCreateDialog)} ... />
  ```

- **严重程度**: P2
- **现状**: 同一文件同时承载 tree bootstrap、core/adapter 装配、host wiring、shell 组装、JSON/export dialog、create dialog、测试事件接线。
- **风险**: 继续吸入实现细节会让已有拆分模块失效，增加后续修改和测试定位成本。
- **建议**: 继续收敛为薄 orchestrator，优先拆出 tree wrapper、runtime assembly、dialogs、shell 组合层。
- **为什么值得现在做**: 该文件已超过 500 行，且已有 `designer-page-helpers.tsx`、`designer-toolbar.tsx`、`designer-inspector.tsx` 等拆分基础，却重新回吸了多层职责。
- **误报排除**: 不是单纯因为“大文件”；维度复核确认它命中“拆分后重新膨胀”的校准保留条件。
- **历史模式对应**: 第一轮拆分后宿主页重新回吸实现细节。
- **参考文档**: `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/collaboration.md`
- **复核状态**: 维度复核通过

## 已驳回

- `packages/flow-designer-renderers/src/index.tsx` 根入口泄露 Xyflow/host 实现细节: **已驳回**
  - 复核确认 live 根入口已收敛，相关实现细节已移动到 `packages/flow-designer-renderers/src/unstable.ts`，并由 `package.json` 明确用 `./unstable` 子路径导出。
