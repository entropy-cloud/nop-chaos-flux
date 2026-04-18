# [维度07] 生命周期与副作用归属 — 初审报告

## 发现清单

### [维度07-01] useResize mouseup 事件缺失清理 (P1)
- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-resize.ts:40-65`
- 缺少 window mouseup 监听，鼠标移出区域后 isResizing 永不重置
- **建议**: 添加 window.addEventListener('mouseup', endResize)

### [维度07-02] ChartRenderer echarts 僵尸实例风险 (P2)
- **文件**: `packages/flux-renderers-data/src/chart-renderer.tsx:52-100`
- 条件渲染切换时 chartInstance 指向已卸载 DOM
- **建议**: isEmpty 切回时 dispose 旧实例

### [维度07-03] DynamicRenderer 使用 mountedRef 而非 AbortController (P2)
- **文件**: `packages/flux-renderers-basic/src/dynamic-renderer.tsx:31-58`
- 与其他异步 effect 的 AbortController 模式不一致
- **建议**: 统一为 AbortController

### [维度07-04] CrudRenderer 两条 scope 写入路径 (P2)
- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:141-145`
- $crud 硬编码路径与 statusPath 机制重叠
- **建议**: 评估合并到 statusPath

### [维度07-05~10] P3 级发现
- use-node-source-props.ts ref 同步可改为渲染阶段赋值
- SchemaRenderer env 依赖稳定性观察
- WordEditorPage dataset 重复加载
- use-dialog-drag cleanup 依赖过宽
- ConditionBuilder modelGeneration 依赖可读性
- SchemaRenderer import preload env 依赖

## 整体评价
- 未发现 runtime 逻辑误放 React effect
- 组件卸载清理整体良好
- React 19 模式正确使用
