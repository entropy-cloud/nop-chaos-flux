# 维度 07：生命周期与副作用归属

> Historical Note: This audit predates the compile-time import-preparation convergence work. References to `useNodeImports` describe the old node-local async import-loading path, not the current baseline.

## 发现清单

### [维度07-01] DynamicRenderer 在 effect 中执行 API 获取

- **文件**: `packages/flux-renderers-basic/src/dynamic-renderer.tsx:31-58`
- **严重程度**: P2
- **effect 职责**: 从 API 获取动态 schema
- **应归属层级**: runtime 层
- **分析**: 直接在 useEffect 中调用 `executeApiObject(schemaApi, ...)`，没有缓存机制
- **建议**: 将 schema 获取逻辑移到 runtime 层，提供 `runtime.fetchDynamicSchema(api)` 方法

### [维度07-02] source-resolvers 在 effect 中执行 API 获取

- **文件**: `packages/flux-code-editor/src/source-resolvers.ts:58-120`
- **严重程度**: P2
- **effect 职责**: 从 API 获取 variables/functions/tables 配置
- **应归属层级**: runtime 层
- **分析**: 缺乏缓存和去重机制
- **建议**: 考虑将配置获取逻辑移到 runtime 层

### [维度07-06] use-node-source-props 缺少依赖项

- **文件**: `packages/flux-react/src/use-node-source-props.ts:26-28, 30-32`
- **严重程度**: P2
- **effect 职责**: 同步 ref 值
- **分析**: effect 没有依赖数组，每次渲染都执行
- **建议**: 改为带依赖的 effect 或直接在渲染时赋值

---

## P3 级发现

### [维度07-03] useSourceValue 在 effect 中执行 source 请求

- **文件**: `packages/flux-react/src/useSourceValue.ts:32-63`
- **说明**: 边界案例，实际请求逻辑已在 runtime 层

### [维度07-04] useNodeImports 在 effect 中加载 import namespace

- **文件**: `packages/flux-react/src/useNodeImports.ts:62-135`
- **说明**: effect 触发，runtime 管理，设计合理

### [维度07-05] CrudRenderer 在 effect 中同步 $crud 状态

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:141-145`
- **说明**: 低优先级优化

---

## 合规的 effect 模式

### 订阅管理 (正确归属 React 层)

- `node-renderer.tsx:259-269` — 字段隐藏通知 form runtime
- `schema-renderer.tsx:91-98` — 组件注册表变更回调
- `useNodeDebugData.ts:18-37` — 调试数据同步到注册表

### DOM 操作 / 外部系统同步 (正确归属 React 层)

- `chart-renderer.tsx:52-99` — ECharts 实例初始化
- `use-code-mirror.ts:59-126` — CodeMirror 实例同步
- `designer-page.tsx:348-402` — 全局键盘快捷键监听

### 生命周期 action 触发 (正确归属 React 层)

- `node-renderer-effects.ts:65-79` — onMount/onUnmount lifecycle dispatch
- `form.tsx:239-250` — initAction 触发

---

## 已修复的历史问题

### Bug 15 — RenderNodes render 阶段写 store

- **状态**: 已修复
- `render-nodes.tsx:257-275` 将 `setSnapshot` 移入 effect

---

## 总结

| 严重程度 | 数量 |
| -------- | ---- |
| P0       | 0    |
| P1       | 0    |
| P2       | 3    |
| P3       | 3    |

**整体评价**: useEffect 使用总体符合架构规范，主要改进方向是统一数据获取模式。
