# 维度 18：跨包模式一致性

## 复核状态：2×Low 保留

### 合规确认

- ✅ Renderer 注册模式 7 个包完全一致
- ✅ Domain core/renderers 分层 3 个领域包一致
- ✅ Store 创建模式一致
- ✅ Hook 使用模式一致

### 发现

### [维度18] 硬编码英文 aria-label

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:60`
- **严重程度**: Low
- **现状**: `'Collapse node'` / `'Expand node'` / `"Clear tree selection"` 未经 t()
- **说明**: 同包中 condition-builder 和 key-value 已使用 @nop-chaos/flux-i18n
- **建议**: 替换为 `t('flux.tree.collapseNode')` 等
- **复核状态**: 子项复核通过

### [维度18] 硬编码英文 fallback "Add entry"

- **文件**: `packages/flux-renderers-form-advanced/src/key-value.tsx:376`
- **严重程度**: Low
- **现状**: 当 props.props.addLabel 未设置时回退为硬编码 'Add entry'
- **建议**: 改为 `t('flux.keyValue.addEntry')`
- **复核状态**: 子项复核通过
