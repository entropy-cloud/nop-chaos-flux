# 维度 09：渲染器契约合规性

## 第 1 轮（初审）

## 逐渲染器审计结果

### 完全合规 (A) 的渲染器

page, container, flex, button, text, icon, badge, tabs, dialog, drawer, fragment, loop, recurse, reaction, dynamic-renderer, scope-debug, form, input (all 9 variants), fieldset, table, tree, chart, data-source, crud, object-field, array-field, variant-field, detail-view, detail-field, tree-controls

## 违规发现

### [维度09] condition-builder 根元素未传递 props.meta.className

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:110,142`
- **严重程度**: P2
- **契约条款**: 渲染器样式契约——className 来自 props.meta 应用于根元素
- **现状**: `className={cn('nop-condition-builder')}` 未合并 `props.meta.className`
- **建议**: 改为 `cn('nop-condition-builder', props.meta.className)`

### [维度09] tag-list 根元素未传递 props.meta.className

- **文件**: `packages/flux-renderers-form-advanced/src/tag-list.tsx:85`
- **严重程度**: P2
- **契约条款**: 同上
- **现状**: `className={cn('nop-tag-list', 'flex flex-wrap gap-2.5')}` 未合并
- **建议**: 改为 `cn('nop-tag-list', 'flex flex-wrap gap-2.5', props.meta.className)`

### [维度09] key-value 根元素未传递 props.meta.className

- **文件**: `packages/flux-renderers-form-advanced/src/key-value.tsx:357`
- **严重程度**: P2
- **契约条款**: 同上
- **现状**: `className={cn('nop-key-value', 'grid gap-3')}` 未合并
- **建议**: 改为 `cn('nop-key-value', 'grid gap-3', props.meta.className)`

### [维度09] array-editor 根元素未传递 props.meta.className

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:294`
- **严重程度**: P2
- **契约条款**: 同上
- **现状**: `className={cn('nop-array-editor', 'grid gap-3')}` 未合并
- **建议**: 改为 `cn('nop-array-editor', 'grid gap-3', props.meta.className)`

---

## 总结

| 严重程度 | 数量 | 问题                                                |
| -------- | ---- | --------------------------------------------------- |
| P0       | 0    | —                                                   |
| P1       | 0    | —                                                   |
| P2       | 4    | 4 个 widget 渲染器根元素未合并 props.meta.className |
| P3       | 0    | —                                                   |

**所有违规项为同一模式**：`wrap: true` 的 widget 渲染器在控件根元素上未合并 `props.meta.className`。

**整体合规率**: 35 个渲染器中 31 个完全合规 (A)，4 个有同一模式违规 (B)。
