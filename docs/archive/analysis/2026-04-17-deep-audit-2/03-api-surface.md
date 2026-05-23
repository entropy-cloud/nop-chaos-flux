# [维度03] API 表面积与契约一致性 — 初审报告

## 发现清单

### [维度03] validation-model.ts 通过 export \* 全量导出内部构建函数 (P2)

- **文件**: `packages/flux-core/src/index.ts:3` + validation-model.ts:153-196
- buildCompiledValidationOrder 等 3 个内部函数不应公共暴露
- **建议**: 改为按需导出

### [维度03] word-editor-renderers 大量导出内部 UI 组件 (P2)

- **文件**: `packages/word-editor-renderers/src/index.ts:12-27`
- 16 个细粒度 UI 组件（FontControls、ExprInsertDialog 等）被公共导出
- **建议**: 仅导出外部需要的组件（如 DocPreviewPage），其余收归内部

### P3 级发现（共 9 项）

- chart 重复导出（index + 子路径）
- createNextCompositeItemId 内部工具泄露
- flux-formula AST 类型未导出
- test-support 未对齐 exports map（3 个包）
- theme-tokens 空模块
- spreadsheet-renderers 导出交互 hooks 类型
- report-designer-renderers 导出 toolbar helper
- flux-renderers-data index 含私有函数
- renderer-hooks.ts 导入 React 类型

## 跨包契约一致性

- RendererComponentProps 类型导入一致
- exports map 对齐良好
- 依赖方向正确
