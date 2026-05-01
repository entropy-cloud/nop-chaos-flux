# 维度 05：响应式订阅精度（初审 + 复核）

## 复核结果摘要

| 发现 | 初审 | 复核 | 理由 |
|------|------|------|------|
| F1 word-editor editorRuntime | P0 | **降级 P1** | 独立 store，非全局 scope，同组件已有 3 个细粒度 selector |
| F2 useSurfaceScopeSnapshot | P0 | **保留 P0** | 框架级 hook，影响所有 dialog/drawer |
| F3 useTablePagination | P1 | **保留 P1** | scope 模式缺 equalityFn |
| F4 useCrudRuntimeState | P1 | **保留 P1** | 已有 equalityFn 缓解，但架构不精细 |
| F5 defaultQuery 依赖 | P1 | **保留 P1** | 对象引用可能频繁触发 |
| F6 word-editor hostScope | P1 | **保留 P1** | 确认每次渲染 scope.replace |
| F7 spreadsheet hostScope | P1 | **保留 P1** | 同 F6 模式 |
| F8 useDesignerHostScope | P1 | **保留 P1** | useMemo 依赖 input 对象 |
| F9 渲染器无 React.memo | P2 | **保留 P2** | nice-to-have |
| F10 非 form 模式全 scope | P2 | **保留 P2** | 架构限制 |
| F11 dialog-host 内联函数 | P2 | **保留 P2** | 影响小 |
| F12 fallbackSelector | P2 | **驳回** | useCallback 依赖正确 |

## 最终有效发现：P0 x1, P1 x7, P2 x3, 驳回 x1
