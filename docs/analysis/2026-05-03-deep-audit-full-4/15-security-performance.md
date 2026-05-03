# 维度15 安全与性能红线

- 初审发现数: 2
- 复核结果: 保留 1 / 降级 1 / 驳回 0

### [维度15] Flow Designer 图编辑命令在高扇出/高扇入场景存在 O(n^2) 热路径

- **文件**: `packages/flow-designer-renderers/src/designer-command-adapter.ts:275-295,325-342,369-408`, `packages/flow-designer-core/src/core-edge-commands.ts:123-187,207-234`, `packages/flow-designer-core/src/core/edge-operations.ts:26-48`
- **证据片段**:

```ts
const outgoingEdges = doc.edges.filter(...)
for (const edge of outgoingEdges) {
  core.deleteEdge(edge.id)
}
```

- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P2
- **现状**: 先线性收集边，再循环调用内部仍会再次线性扫描的 core 操作。
- **风险**: graph-mode 插入链路节点/merge 前插入/分支插入在大图上会明显退化。
- **建议**: 引入批量边变更 API 或预建索引，避免循环内重复全表扫描。
- **为什么值得现在做**: 这是交互热路径，性能退化会直接影响画布手感。
- **误报排除**: 不是单次 `filter/find` 的机械误报；问题在“扫描后循环再扫描”。
- **历史模式对应**: hot path nested linear scans。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `维度复核通过`

### [维度15] spreadsheet `ProtectSheetCommand.password` 暗示的安全语义未实现

- **文件**: `packages/spreadsheet-core/src/commands-base.ts:121-126`, `packages/spreadsheet-core/src/command-handlers/sheet-handlers.ts:101-109`, `packages/spreadsheet-core/src/core/sheet-operations.ts:192-202`
- **证据片段**:

```ts
export function applyProtectSheet(..., password?: string) {
  void password;
  ...
}
```

- **严重程度**: P3
- **类别**: 安全
- **规则编号**: R5
- **现状**: 公开命令契约接受 `password`，实现却完全忽略。
- **风险**: 调用方会误以为已启用密码保护，形成伪安全感。
- **建议**: 要么移除公开 `password` 字段，要么在传入时显式失败，避免 silent no-op。
- **为什么值得现在做**: 这是低成本的契约澄清修复。
- **误报排除**: 不是已存在的高危绕过；当前问题是“功能未实现但参数仍公开”。
- **历史模式对应**: misleading security parameter.
- **参考文档**: `docs/architecture/security-design-requirements.md`
- **复核状态**: `已降级`
