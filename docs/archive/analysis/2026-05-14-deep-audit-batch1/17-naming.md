# 维度 17：命名与术语一致性

## 第 1 轮（初审）

### [维度17-01] Flow Designer host scope 同时暴露 `dirty` 与 `runtime.isDirty`，脏态命名未收敛

- **文件**: `packages/flow-designer-renderers/src/designer-context.ts`, `packages/flow-designer-renderers/src/designer-manifest.ts`
- **证据片段**:
  ```ts
  return {
    kind: 'designer',
    dirty: snapshot.isDirty,
    ...
    runtime: {
      canUndo: snapshot.canUndo,
      canRedo: snapshot.canRedo,
      dirty: snapshot.isDirty,
      isDirty: snapshot.isDirty,
    },
  };
  ```
- **严重程度**: P3
- **现状**: root summary 用 `dirty`，runtime bag 同时保留 `dirty` 与 `isDirty`；manifest 又只把 `runtime.isDirty` 记为 contract 字段，命名层次不统一。
- **风险**: host consumer、schema author、probe/test 容易依赖不同别名，后续难以安全裁剪或统一 designer runtime vocabulary。
- **建议**: 选定一个 canonical 名称，另一项降为显式 compatibility alias，并在 manifest、docs、tests 同步标注。
- **误报排除**: 不是内部 core 字段 `snapshot.isDirty` 到 UI 层的正常映射；问题在于 host projection 对外同时发布两套外部命名。
- **复核状态**: 未复核

### [维度17-02] Report Designer 当前选择目标仍同时发布 `selectionTarget` / `selection` / `target` 三套名字

- **文件**: `packages/report-designer-renderers/src/host-data.ts`, `packages/report-designer-renderers/src/renderers.integration.test.tsx`
- **证据片段**:
  ```ts
  return {
    ...
    selectionTarget: snapshot.selectionTarget,
    selection: snapshot.selectionTarget,
    target: snapshot.selectionTarget,
    ...
  };
  ```
- **严重程度**: P2
- **现状**: live host scope 仍把同一对象以三套字段名同时发布；测试也显式按 `selectionTarget ?? target ?? selection` 顺序兼容读取。
- **风险**: report designer host vocabulary 继续扩散，schema/renderer/test 可能各自绑定不同字段，增加后续收敛成本与文档歧义。
- **建议**: 把 `selectionTarget` 明确收敛为唯一 canonical surface；若必须保留 alias，至少降到受控 compatibility layer，并在 owner doc 中注明清理时机。
- **误报排除**: 不是局部变量名差异；这里是实际 host scope 对外发布的 public projection 字段。
- **复核状态**: 未复核

### [维度17-03] `report-designer-page` owner doc 仍写 `reportDocument.document.spreadsheet`，但 live code 的实际字段是 `reportDocument.spreadsheet`

- **文件**: `docs/components/report-designer-page/design.md`, `packages/report-designer-renderers/src/host-data.ts`
- **证据片段**:
  ```md
  - `workbook` / `spreadsheet.workbook` 必须与 `reportDocument.document.spreadsheet` 指向同一条 canonical workbook baseline
  ```
  ```ts
  const reportDocument = spreadsheetSnapshot
    ? { ...snapshot.document, spreadsheet: spreadsheetSnapshot.document }
    : snapshot.document;
  ```
- **严重程度**: P2
- **现状**: owner doc 将 `reportDocument` 描述成还包着一层 `.document`，但 live host scope 发布的是直接的 report template document。
- **风险**: schema author 或 doc reader 会按错误路径读取 workbook baseline，造成 docs 与实际 host scope contract 脱节。
- **建议**: 将文档统一改为 `reportDocument.spreadsheet`，并连同 workbook canonicality 描述一起更新。
- **误报排除**: 不是历史草稿残留可忽略描述；该段位于当前 owner doc 的 canonical host projection contract 中，并使用了“必须”语言。
- **复核状态**: 未复核

## 维度复核结论

- [维度17-01]: 保留为 P3。
- [维度17-02]: 保留为 P2。
- [维度17-03]: 保留为 P2。

## 子项复核结论

- 无需额外子项复核。

## 最终保留项

| 编号  | 严重程度 | 文件                                                       | 一句话摘要                                                                                      |
| ----- | -------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 17-01 | P3       | `packages/flow-designer-renderers/src/designer-context.ts` | Flow Designer host scope 同时暴露 `dirty` 与 `runtime.isDirty`                                  |
| 17-02 | P2       | `packages/report-designer-renderers/src/host-data.ts`      | Report Designer 当前选择目标仍并行发布 `selectionTarget` / `selection` / `target`               |
| 17-03 | P2       | `docs/components/report-designer-page/design.md`           | owner doc 仍写 `reportDocument.document.spreadsheet`，与 live `reportDocument.spreadsheet` 不符 |
