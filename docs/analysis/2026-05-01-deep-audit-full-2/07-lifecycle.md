# 维度 07：生命周期与副作用归属（初审）

## 总体评价

项目在生命周期与副作用归属方面**质量良好**。没有发现 "runtime 逻辑误放在 React effect" 的严重问题。Bug 15 的教训已内化到代码中。

## 关键确认

1. **Render 阶段无 setState 违规** -- Bug 15 修复到位，setSnapshot 已移入 useEffect
2. **所有异步操作均有 AbortController 清理**
3. **所有注册操作均有 unregister/dispose 清理**
4. **useLayoutEffect 选择均合理**（scope 同步、namespace 注册需在 paint 前完成）

## useEffect 职责分类

全部 useEffect 正确归属于 React 层：
- 组件注册/卸载 ✓
- 状态发布 (statusPath) ✓
- 异步数据获取 + AbortController ✓
- DOM 集成 (CodeMirror, resize, keyboard) ✓
- Lifecycle actions ✓
- Ref 同步 ✓
- 表单字段注册 ✓

## 低优先级建议

1. use-node-source-props.ts L26, L30 -- 无 deps effect 可加注释说明执行顺序
2. render-nodes.tsx L92-106 -- 可在 runtime.dispose() 时清理 fragmentScopeCacheByRuntime
3. crud-renderer-state.ts L272 -- defaultQuery 引用稳定性依赖上层 useMemo

## 复核状态: 未复核
