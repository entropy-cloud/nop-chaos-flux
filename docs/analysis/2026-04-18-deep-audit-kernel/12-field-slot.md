# 维度12：表单字段与Slot建模 — 初审报告

**审核日期**: 2026-04-18

## 总体统计

41个渲染器中 **38个field metadata完全合规**，3个有问题。

## 问题详情

### [维度12] array-field — P2
- **文件**: packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:346-365
- **违规类别**: field-rule
- **现状**: item区域缺少params声明，但组件实际以参数化方式渲染（bindings: {index, value}）
- **建议**: 显式声明 `{ key: 'item', kind: 'region', regionKey: 'item', params: ['index', 'value'] }`

### [维度12] variant-field — P3
- **文件**: packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:253-274
- **违规类别**: field-frame
- **现状**: 未使用wrap:true，手动构建nop-field结构绕过FieldFrame
- **建议**: 补充hint/description支持或重构为wrap:true

### [维度12] detail-view — P3
- **文件**: packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:280-282
- **违规类别**: field-rule
- **现状**: 使用内联字面量而非共享的formLabelFieldRule
- **建议**: 替换为formLabelFieldRule导入

## 正面发现

- value-or-region编译器决策逻辑正确
- SourceTransientState结构完全一致
- 事件字段通过onXxx正则+显式声明双重保障
- 深区域提取（table columns、tabs items）严格遵循文档
- FieldFrame集成在所有wrap:true渲染器中正确工作

---

## 复核结论

| 发现 | 维度复核 | 子项复核 | 最终严重程度 |
|------|---------|---------|------------|
| F1: array-field item 缺 params | **保留** | **成立**（regions: ['item'] 无 params，实际传 bindings: {index, value}，与 loop/tree 模式不一致） | P2 |
| F2: variant-field 手动构建 nop-field | **保留** | **成立**（唯一手动构建者，需 data-active-variant 部分合理） | P3 |
| F3: detail-view 内联 field rule | **保留** | **成立**（与 formLabelFieldRule 字符级相同，同包9个渲染器均用共享常量） | P3 |
