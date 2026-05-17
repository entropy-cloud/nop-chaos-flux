# 维度 04：状态所有权与单一事实来源 — 审计报告

## 第 1 轮（初审）

### 总体判断：本轮初审未发现新的 P0/P1/P2 双状态缺陷。

**已审范围**：

- 全仓扫描 107 处 useState，分类审查
- 所有 useRef 缓存数据模式审查
- useEffect + setState 同步链审查
- 自动化工具输出的 4 个 suspect 逐一复核
- 复杂表单字段渲染器逐个检查（ArrayEditor、CheckboxGroup、TreeSelect、KeyValue、ConditionBuilder、ObjectField、VariantField）
- Dialog/Drawer/Surface 相关代码检查
- 设计器组件检查（flow-designer、spreadsheet、report-designer）

### 工具 suspect 复核结论

1. **render-nodes.tsx:336** `scope.readOwn()` → 在 useLayoutEffect 中，非渲染路径调用。误报。
2. **detail-field.tsx:146** `store.getState().values` → 在用户交互回调中，非渲染路径。误报。
3. **detail-view.tsx:231** `store.getState().values` → 同上。误报。
4. **scope-debug.tsx:54** `useScopeSelector` 无 paths → 调试器组件，预期行为。误报。

### 已修复确认

- **surface renderer `localOpen`** → 已消除。使用 `useSyncExternalStore` 订阅 `SurfaceRuntime.store.getUncontrolledOpen()`。
- **Word Editor charts/codes 依赖** → 已修复。使用 ref 传递值，useEffect 依赖数组不再包含变化数据。

### 已知 tradeoff（未新增发现）

以下模式已在 2026-05-06 审计中记录为 tradeoff（Adjudication #4），当前代码未变化：

- `object-field` resolvedValue useState（P2）
- `table-quick-edit-controller` draftValue/savedValue（P2）
- `array-editor` itemsRef（P3）
- `key-value` pairsRef（P3）
- `condition-builder` valueRef（P3）
- `field-handlers` adaptedValue（P3）
- `variant-field` activeKey（P3）

### 结论

维度 04 状态所有权整体健康，当前代码库无需要立即介入的双状态缺陷。
