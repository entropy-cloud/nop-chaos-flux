# 维度04：状态所有权与单一事实来源

## 审核日期: 2026-04-20

## 发现清单（经初审+维度复核+子项复核）

### [P2→P3] CrudRenderer 双重写入 statusPath + $crud

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:154-160`
- **严重程度**: P3（子项复核降级）
- **现状**: CrudRenderer 有两种独立机制将 CRUD summary 写入 scope：(1) `useCrudStatusPublisher` 向可配置 statusPath 写入（带 shallow-equal guard）；(2) 一个裸 useEffect 向硬编码 `$crud` 写入（无 guard）。JSDoc 在 `crud-schema.ts:131` 明确说明两个路径并存是有意设计。
- **风险**: 当 statusPath === '$crud' 时产生幂等的重复写入。内联 effect 缺少 equality guard 是轻微效率问题。
- **建议**: 将 `'$crud'` 提取为命名常量；为内联 effect 添加与 useCrudStatusPublisher 相同的 shallow-equal guard。

### [P3] array-editor itemsRef 桥接 store 数据

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:142-170`
- **严重程度**: P3
- **现状**: `itemsRef` 通过 `useEffect`(166-170) 从 store 派生的 `items` 同步，同时 `syncItems`(180) 和 add 按钮回调中直接写入。ref 存在原因是 `RuntimeFieldRegistration` 的 `getValue()` 需要同步读取。
- **风险**: ref 仅在 useEffect 提交后与 store 同步。验证或外部 store mutation（form.reset()）后可能暂时陈旧。
- **建议**: 长期：改进 registration API 支持同步接受最新值。当前：已知技术债务，有测试覆盖。

### [P3] key-value pairsRef 桥接 store 数据

- **文件**: `packages/flux-renderers-form-advanced/src/key-value.tsx:207-242`
- **严重程度**: P3
- **现状**: 与 array-editor 完全相同的 ref 桥接模式。
- **建议**: 同上。

### [P3] condition-builder valueRef 桥接 store 数据

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:58-66`
- **严重程度**: P3
- **现状**: 同上模式。validateChild 是 no-op，实际影响最小。
- **建议**: 同上。

### [P2→P3] variant-field userSelectedKey + detectedKey

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:86-94`
- **严重程度**: P3（维度复核降级）
- **现状**: `userSelectedKey` 和 `detectedKey` 是 UI 交互状态（tab 高亮选择），`matchedKey`（从 store 值推导）有最高优先级。实际字段值由 `parentForm.setValue` 单一管理。`userSelectedKey` 仅在 `matchedKey` 为空时作为回退。
- **风险**: 轻微陈旧状态风险——外部改变表单值后 userSelectedKey 不会被重置。
- **建议**: 可选优化——考虑纯从 store 值派生 activeKey。

### [P3] useEditing useState+useRef 双重维护

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:12-15`
- **严重程度**: P3（合理模式）
- **现状**: `editingCell`(useState) + `editingCellRef`(useRef) 跟踪相同数据。ref 用于 `handleEditSave` 中避免陈旧闭包。每次更新同步写入两者。
- **建议**: 标准 React 模式，无需修改。

### [P3] crud-renderer loading stub

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:132`
- **严重程度**: P3
- **现状**: `const [loading] = useState(false)` 永远为 false，setter 未取出。
- **建议**: CRUD 数据加载尚未实现，当实现时接线到此状态。

### [P3] report-designer inspector-shell 提交状态

- **文件**: `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:36-37`
- **严重程度**: P3（合理）
- **现状**: `submittingPanelId` 和 `submitResult` 是纯瞬态 UI 状态。
- **建议**: 无需修改。

### [P3] word-editor-page charts/codes 本地状态

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:38-45`
- **严重程度**: P3（过渡期）
- **现状**: 自包含编辑器页面的本地编辑模型，投影到 hostScope。
- **建议**: 接受为过渡性结构，未来可迁移到编辑器 store。

### [P3] flow-designer layoutBusy

- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx:176`
- **严重程度**: P3（合理）
- **现状**: 纯瞬态异步操作 UI 状态。
- **建议**: 无需修改。

## 统计

| 严重程度 | 数量 |
| -------- | ---- |
| P2       | 0    |
| P3       | 10   |

**注意**: 初审 2 个 P2 项在复核/子项复核后均降级为 P3。
