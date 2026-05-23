# 维度 09：渲染器契约合规性 — 审计报告

## 第 1 轮（初审）

### 总体评估：合规评分 B

审核范围：41 个渲染器组件（flux-renderers-basic ~15, flux-renderers-form ~12, flux-renderers-data ~4, flux-renderers-form-advanced ~10）
自动门：`check:audit-missing-renderer-markers` 通过 | `check:audit-fieldframe-bypasses` 通过

### [维度09-01] ObjectFieldRenderer 模块级全局弱引用状态 (P2)

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:30-53`
- **契约条款**: 禁止在渲染器中直接访问 store（使用标准 hooks）
- **现状**: `transformOutSequences` 和 `pendingTransformOutByOwner` 是模块顶层 WeakMap，多个 ObjectField 实例通过 `transformOutOwner` 隐式链接共享可变状态
- **风险**: 如果两个实例引用同一个 parentForm，它们的转换序列会相互冲突
- **建议**: 将序列状态迁移到 React `useRef` 中

### [维度09-02] CrudRenderer 合成 RendererComponentProps 用于 TableRenderer 组合 (P2)

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:372-396`
- **契约条款**: 不应手动构建对方契约合成的 Props 对象
- **现状**: 使用 5 处 `as unknown as` 类型断言 + `satisfies` 守卫构建完整合成 props
- **风险**: RendererComponentProps 契约变更时静默编译为错误的值
- **建议**: 将 TableRenderer 分解为共享 hook 或子组件 API

### [维度09-03] VariantFieldRenderer 活动键的三源状态级联 (P2)

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:232-244`
- **契约条款**: 单一数据源原则
- **现状**: `activeKey` 从 matchedKey/detectedKey/userSelectedKey/initialKey 四个来源派生，通过三个独立 useState 追踪
- **风险**: 当 matchKey 在异步检测仍悬停时发生变化，可能出现竞争条件
- **建议**: 重构为单一 useReducer 统一仲裁逻辑

### [维度09-04] DetailField/DetailView 事件处理器中直接 Store 读取 (P2)

- **文件**: `detail-field.tsx:145-152`, `detail-view.tsx:229-244`
- **契约条款**: "禁止在渲染器中直接访问 stores。使用标准 hooks。"
- **现状**: 在 handleConfirm 事件处理器中直接调用 `store.getState()`
- **建议**: 添加注释说明或通过 hooks 捕获打开时的原始值

### [维度09-05] ChartRenderer No-op handleResize (P3)

- **文件**: `packages/flux-renderers-data/src/chart-renderer.tsx:140-142`
- **契约条款**: 渲染器应在渲染函数中保持无副作用
- **现状**: `handleResize` 是空操作（`void chartRef.current`），但已注册在 ComponentHandle capabilities 中
- **建议**: 实现实际 resize 逻辑，或从 capabilities 中移除

### [维度09-06] createInputRenderer 无根标记容器 (P3)

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:46-73`
- **契约条款**: 小部件渲染器应发出根标记类
- **现状**: 直接渲染 `<Input>` 无包装 div/nop 标记类，与其他表单控件不一致
- **建议**: 添加包装 div 或记录原因

### [维度09-07] DetailFieldRenderer / KeyValueRenderer 在效果中使用 mutation-style API (P3)

- **建议**: 添加简短注释说明这些直接 scope 操作的原因

### [维度09-08] TabsRenderer 将 regionKey 解析推迟到渲染时 (P3)

- **判定**: 设计特征，非违规

### [维度09-09] LoopRenderer 和 RecurseRenderer 行内导入类型转换 (P3)

- **文件**: `loop.tsx:65-67`, `recurse.tsx:86-88`
- **建议**: 在 flux-core 中添加命名导出类型，避免重复的行内类型查询

### 综合评分

- RendererComponentProps 类型: A
- 数据源使用: A
- 直接 store 访问: B
- Ad-hoc React contexts: A
- 渲染器注册: A
- 样式契约: B
- 本地状态合理性: B
- data-testid/data-cid 传递: A
- void 返回事件模式: A

## 深挖第 2 轮追加

### [维度09-10] DesignerCanvasContent 模块级 WeakMap (P2)

- **文件**: `packages/flow-designer-renderers/src/designer-canvas.tsx:14-22`
- **保留**: P2 — 模块级可变状态作为 plusButtonHandlers 注册表

### [维度09-11] FormRenderer 在 useMemo 闭包中直接访问 store.getState() (P3)

- **文件**: `packages/flux-renderers-form/src/renderers/form.tsx:206,215`
- **保留**: P3 — 非渲染路径 store 读取

### [维度09-12] ReportInspectorShellRenderer 合成 RendererComponentProps (P2)

- **文件**: `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:32-41`
- **保留**: P2 — 硬编码 meta 绕过运行时解析

### [维度09-13] ReportToolbarRenderer 完整身份选择器过宽订阅 (P3)

- **文件**: `packages/report-designer-renderers/src/report-designer-toolbar.tsx:17`
- **保留**: P3 — 选择器返回整个 scope 数据

## 维度复核结论

| 编号  | 原定 | 结果        | 理由                         |
| ----- | ---- | ----------- | ---------------------------- |
| 09-01 | P2   | **保留 P2** | 模块级 WeakMap               |
| 09-02 | P2   | **保留 P2** | 合成 props                   |
| 09-03 | P2   | **保留 P2** | 三源状态                     |
| 09-04 | P2   | **降级 P3** | 命令式 handler 中 store 读取 |
| 09-05 | P3   | **保留 P3** | no-op handleResize           |
| 09-06 | P3   | **保留 P3** | 无标记容器                   |
| 09-07 | P3   | **保留 P3** | mutation-style API           |
| 09-08 | P3   | **保留 P3** | 设计特征                     |
| 09-09 | P3   | **保留 P3** | 类型转换                     |
| 09-10 | P2   | **保留 P2** | 模块级 WeakMap               |
| 09-11 | P3   | **保留 P3** | useMemo 中 store 读取        |
| 09-12 | P2   | **保留 P2** | 合成 props                   |
| 09-13 | P3   | **保留 P3** | 过宽订阅                     |

## 最终保留项

| 编号  | 程度 | 文件                                 | 摘要               |
| ----- | ---- | ------------------------------------ | ------------------ |
| 09-01 | P2   | `object-field.tsx:30-53`             | 模块级 WeakMap     |
| 09-02 | P2   | `crud-renderer.tsx:372-396`          | 合成 props         |
| 09-03 | P2   | `variant-field.tsx:232-244`          | 三源状态级联       |
| 09-10 | P2   | `designer-canvas.tsx:14-22`          | 模块级 WeakMap     |
| 09-12 | P2   | `inspector-shell-renderer.tsx:32-41` | 合成 props         |
| 09-04 | P3   | `detail-field.tsx:145-152`           | 命令式 store 读取  |
| 09-05 | P3   | `chart-renderer.tsx:140-142`         | no-op resize       |
| 09-06 | P3   | `input.tsx:46-73`                    | 无标记容器         |
| 09-07 | P3   | `detail-field.tsx, key-value.tsx`    | mutation API       |
| 09-09 | P3   | `loop.tsx, recurse.tsx`              | 类型转换           |
| 09-11 | P3   | `form.tsx:206,215`                   | useMemo store 读取 |
| 09-13 | P3   | `report-designer-toolbar.tsx:17`     | 过宽订阅           |
