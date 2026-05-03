# 17 命名与术语一致性

- 初审发现数: 4
- 维度复核: 完成
- 子项复核: 1
- 最终结果: 保留 2 / 降级 2 / 驳回 0

## 保留

### [维度17] active docs/examples 仍把 action `dataPath` 当正式字段

- **文件**: `docs/references/action-payload-matrix.md`, `docs/architecture/api-data-source.md`, `docs/architecture/action-algebra-formal-spec.md`, `docs/architecture/action-graph-authoring.md`, `docs/examples/action-flow-tree.md`, `docs/examples/user-management-schema.md`
- **严重程度**: P1
- **冲突名称**: action `dataPath` vs 当前正式字段 `args.path`
- **冲突位置**: 上述 active docs/examples 与 `packages/flux-core/src/types/actions.ts`
- **统一建议**: 把 action 写入目标统一改回当前 live contract，示例中 `setValue` 使用 `args.path`，删除把 action `dataPath` 标为 `stable` 的表述。
- **误报排除**: 子项复核明确排除了 `DataSourceSchema` 对 `dataPath` 的兼容性说明；问题只针对 action contract。
- **参考文档**: `docs/references/flux-json-conventions.md`, `packages/flux-core/src/types/actions.ts`
- **复核状态**: 子项复核通过

### [维度17] action `dataPath` 的 active reference 与示例共同制造双词汇

- **文件**: `docs/references/action-payload-matrix.md:26-37,53-58,138-150`
- **证据片段**:
  ```md
  ### Targeting Fields

  - `dataPath`
    | `dataPath` | 响应写回目标路径 | **stable** — 保留独立字段 |
  ```
- **严重程度**: P1
- **冲突名称**: `dataPath` vs `path`
- **冲突位置**: active reference 与当前 core type
- **统一建议**: 删除 reference 中将 `dataPath` 视为 action targeting stable field 的表述。
- **误报排除**: 这是 active reference，不是历史草案或归档文档。
- **参考文档**: `docs/references/flux-json-conventions.md`
- **复核状态**: 子项复核通过

## 已降级

- `createFlowDesignerRegistry` 名称与实际 register/extend 语义不符: **已降级**
  - 复核确认这是命名 rough edge，但相关架构文档已明确把它记录为 residual，当前不足以作为主缺陷。
- `flux-code-editor` 公开 source-ref 类型仍暴露 `dataPath`: **已降级**
  - 复核确认它是 public naming rough edge，但 owner docs 还未把 code-editor source-ref 明确收敛到 `path`，不宜直接上升为强违约。
