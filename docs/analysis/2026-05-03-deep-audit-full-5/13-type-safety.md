# 13 类型安全与动态边界

- 初审发现数: 4
- 维度复核: 完成
- 子项复核: 1
- 最终结果: 保留 2 / 降级 2 / 驳回 0

## 保留

### [维度13] `runtime-overlay` 错误通过 `rule: 'custom' as any` 绕过核心验证契约

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/value-adaptation-helper.ts:104-110`
- **证据片段**:
  ```ts
  errors: issues.map((issue) => ({
    path: issue.path ?? fieldPath,
    message: issue.message,
    rule: 'custom' as any,
  }));
  ```
- **严重程度**: P2
- **分类**: 可疑
- **现状**: `ValidationError.rule` 仍绑定 `ValidationRule['kind']`，但 live code 已注入 `'custom'`，只能靠 `as any` 绕过。
- **真实风险**: 下游若对 `ValidationError.rule` 做穷举映射或文档生成，会漏掉 runtime-overlay 错误分支。
- **建议**: 为 external/runtime-overlay 错误补正式 rule 建模，或单独引入可扩展错误 kind。
- **误报排除**: 这不是低代码动态 schema 边界；它把未建模的运行时值塞进了核心公开验证契约。
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: 维度复核通过

### [维度13] `useSpreadsheetInteractions` 返回值仍用 `currentCell as any`

- **文件**: `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts:289-291,369`
- **证据片段**:

  ```ts
  const currentCell = selectedCell
    ? snapshot.activeSheet?.cells?.[cellAddress(selectedCell.row, selectedCell.col)]
    : undefined;

  currentCell: currentCell as any,
  ```

- **严重程度**: P3
- **分类**: 可疑
- **现状**: hook 已声明了相对精确的 `currentCell` 类型，但返回时仍用 `as any` 擦除。
- **真实风险**: 实现与导出契约漂移时，编译器无法再帮忙兜底。
- **建议**: 让局部变量显式对齐导出类型，移除最后一跳 `as any`。
- **误报排除**: 这不是第三方透传或 schema 动态边界，而是库级导出 hook 的类型逃生口。
- **参考文档**: `docs/components/spreadsheet-page/design.md`
- **复核状态**: 维度复核通过

## 已降级

- `condition-builder/types.ts` 对外仍暴露 `fields?: any[]` / `operators?: any`: **已降级**
  - 复核认为它更像 `BaseSchema extends SchemaObject` 索引签名导致的上层 typing 基线问题，不适合继续作为单组件缺陷追打。
- `report-designer-renderers/src/inspector-shell-renderer.tsx` 用 `props as any`: **已降级**
  - 复核认为这属于局部 renderer 复用时的类型偷懒，运行时风险有限。
