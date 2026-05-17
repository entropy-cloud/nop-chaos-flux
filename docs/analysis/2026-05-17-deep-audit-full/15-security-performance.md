# 维度 15：安全与性能红线 — 审计报告

## 第 1 轮（初审）

### [维度15-01] action-execution 诊断钩子 catch 块缺乏失败可观测性

- **文件**: `packages/flux-action-core/src/action-dispatcher/action-execution.ts:84,96,114`
- **严重程度**: P2
- **类别**: 安全
- **规则编号**: R3（fail-closed）、R4（observable failure paths）
- **证据片段**:
  ```typescript
  function reportActionError(...) {
    try {
      ctx.onActionError?.(error, actionCtx);
    } catch {
      // Diagnostic hooks must not replace the primary action failure.
    }
  }
  ```
- **现状**: 三处 `catch {}` 分别位于 `reportActionError()`、插件 `onError` 循环、以及 `reportActionEnd()` 中。注释指出"诊断钩子必须不遮蔽主失败"，符合 fail-closed 意图，但 catch 块完全静默无监控/日志。
- **风险**: 如果 `ctx.onActionError` 诊断钩子本身有 bug 或配置错误，该静默 catch 会使其完全不可见。诊断基础设施的静默失效可能隐藏更严重的问题。
- **建议**: 在 catch 块中增加监控/日志调用，如 `console.warn` 或 `ctx.getEnv().monitor?.onDiagnosticFailure?.(...)`。保持不遮蔽主失败的意图，但将"钩子自身失败"升级为可观察的诊断事件。

### [维度15-02] import-stack 模块加载失败 catch 缺乏结构化诊断

- **文件**: `packages/flux-runtime/src/import-stack.ts:120-122`
- **严重程度**: P3
- **类别**: 安全
- **规则编号**: R3/R4
- **证据片段**:
  ```typescript
  try {
    return await existing;
  } catch {
    input.moduleCache.removePending(key);
  }
  ```
- **现状**: `loadModule()` 中从 moduleCache 获取 pending Promise 失败时，仅 `removePending(key)` 清空缓存条目，没有记录或上报失败原因。
- **风险**: 模块加载在等待过程中失败会丢失错误上下文。
- **建议**: 增加 `notifyImportFailure(error, input.spec)` 调用以记录失败原因。

### [维度15-03] 全仓库缺乏 performance.mark/measure 可观测性

- **文件**: 全仓库（`rg "performance\.(mark|measure)"` 返回空结果）
- **严重程度**: P1
- **类别**: 性能
- **规则编号**: P6（observability for performance-sensitive failures）
- **现状**: 没有任何代码路径使用 `performance.mark`/`performance.measure` 或等效的性能标记 API。性能敏感的渲染、action 调度、表单验证、数据源刷新等热路径在运行时完全不可观测。
- **风险**: 生产环境中无法通过标准工具定位性能瓶颈。性能退化只能在症状出现后被动发现。
- **建议**: 在以下关键路径添加 `performance.mark`/`performance.measure` 对：SchemaRenderer 编译路径、action-execution.ts 调度主循环、form-store.ts 批量更新路径。

### [维度15-04] FormStore 订阅扫描在大量字段时可能退化

- **文件**: `packages/flux-runtime/src/form-store.ts:315-330`
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: P1/P7
- **证据片段**:
  ```typescript
  function collectSubscribedChangedPaths(before, after, changedPaths) {
    const candidatePaths = new Set([...pathListeners.keys(), ...descendantPathListeners.keys()]);
    for (const path of candidatePaths) {
      if (getIn(before, path) !== getIn(after, path)) changedPaths.add(path);
    }
  }
  ```
- **现状**: `collectSubscribedChangedPaths` 在每个 `setValues`/`setValue` 时遍历所有注册路径。对数千字段表单可能产生 O(n\*k) 开销。
- **建议**: 考虑为 fieldStates 和 values 添加版本计数器（revision counter）。

### [维度15-05] Flow-Designer 约束检查重复线性扫描

- **文件**: `packages/flow-designer-core/src/core/constraints.ts:59-80`（关联: `core-edge-commands.ts:44-45`, `core-node-commands.ts:62`）
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: P2（O(n^2)）
- **证据片段**:
  ```typescript
  const sourceNode = doc.nodes.find((node) => node.id === source);
  const targetNode = doc.nodes.find((node) => node.id === target);
  ```
- **现状**: 约束检查每次调用线性扫描整个节点/边数组。单条边的创建可触发 4 次线性扫描。
- **建议**: 在 Core 内维护共享 `Map<string, GraphNode>` 用于常数时间节点查找。

### [维度15-06] Source-Registry 回退查找创建临时数组

- **文件**: `packages/flux-runtime/src/async-data/source-registry.ts:342`
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: P2
- **证据片段**:
  ```typescript
  const entry =
    bucket?.get(args.id) ??
    Array.from(bucket?.values() ?? []).find((candidate) => candidate.name === args.id);
  ```
- **现状**: 回退路径使用 `Array.from(bucket?.values() ?? []).find(...)` 创建中间数组。
- **建议**: 直接迭代 `bucket.values()` 而不是通过 `Array.from`。

### [维度15-07] 生命周期效应 dispatch 缺少 AbortController

- **文件**: `packages/flux-react/src/node-renderer-effects.ts:85-107`
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: P5
- **证据片段**:
  ```typescript
  useEffect(() => {
    if (lifecycleActions?.onMount) {
      void latestHelpersRef.current.dispatch(lifecycleActions.onMount, {...});
    }
    return () => {
      if (currentLifecycleActions?.onUnmount) {
        void latestHelpersRef.current.dispatch(currentLifecycleActions.onUnmount, {...});
      }
    };
  }, [input.enabled, input.nodeInstance]);
  ```
- **现状**: `node-renderer-effects.ts` 中 lifecycle action dispatch 没有 AbortController。
- **风险**: 组件卸载后 action 仍可能继续执行，导致已卸载组件的状态更新。
- **建议**: 为 dispatch 调用添加 AbortController 并将 signal 传入。

### [维度15-08] 非表格大数据组件缺少虚拟化 (P3)

## 深挖第 2 轮追加

### [维度15-09] validateFormPath catch 块使用 console.error 而非结构化诊断 (P3)

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:399-412`
- **现状**: catch 块使用 `console.error`，未使用 `reportRuntimeHostIssue` 或 `monitor.onError`
- **建议**: 使用结构化诊断替换 console.error

### [维度15-10] collectSubtreePaths 全量扫描 runtimeFieldRegistrations (P3)

- **文件**: `packages/flux-runtime/src/form-runtime-subtree.ts:28-40`
- **现状**: 每次调用迭代所有条目
- **建议**: 引入基于前缀的索引

### [维度15-11] captureSideEffectErrors 全量扫描 fieldStates (P3)

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:371-384`
- **现状**: 每次被调用时全量扫描 Object.entries(currentFieldStates)，在 validateForm 中被调用 6 次
- **建议**: 添加前缀树索引

## 维度复核结论

| 编号  | 原定 | 复核结果      | 理由                                       |
| ----- | ---- | ------------- | ------------------------------------------ |
| 15-01 | P2   | **保留 P2**   | 三处空 catch 无观测                        |
| 15-02 | P3   | **保留 P3**   | 事实准确，有 notifyImportFailure 而不调用  |
| 15-03 | P1   | **降级 Info** | 前序 4 次审计均降级，已有 monitor 钩子替代 |
| 15-04 | P3   | **保留 P3**   | 事实准确                                   |
| 15-05 | P3   | **保留 P3**   | 事实准确                                   |
| 15-06 | P3   | **保留 P3**   | 事实准确                                   |
| 15-07 | P3   | **保留 P3**   | 事实准确                                   |
| 15-08 | P3   | **降级 Info** | 前瞻建议                                   |
| 15-09 | P3   | **保留 P3**   | 事实准确                                   |
| 15-10 | P3   | **保留 P3**   | 事实准确                                   |
| 15-11 | P3   | **保留 P3**   | 事实准确                                   |

## 最终保留项

| 编号  | 程度 | 文件                              | 摘要                        |
| ----- | ---- | --------------------------------- | --------------------------- |
| 15-01 | P2   | `action-execution.ts:84,96,114`   | 诊断钩子 catch 无观测       |
| 15-02 | P3   | `import-stack.ts:120`             | 加载 catch 无结构化诊断     |
| 15-04 | P3   | `form-store.ts:315-330`           | 订阅扫描退化                |
| 15-05 | P3   | `constraints.ts:59-80`            | 约束线性扫描                |
| 15-06 | P3   | `source-registry.ts:342`          | 回退数组                    |
| 15-07 | P3   | `node-renderer-effects.ts:85-107` | dispatch 缺 AbortController |
| 15-09 | P3   | `form-runtime-owner.ts:399-412`   | catch 用 console.error      |
| 15-10 | P3   | `form-runtime-subtree.ts:28-40`   | 全量扫描 registrations      |
| 15-11 | P3   | `form-runtime-owner.ts:371-384`   | 全量扫描 fieldStates        |

- **文件**: 全仓库（仅 `table-body-rows.tsx` 使用 `@tanstack/react-virtual`）
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: P7
- **现状**: 仅 table-renderer 使用虚拟化。未来组件（select、tree、input-tree）大数据集渲染缺少虚拟化准备。
- **建议**: 创建共享 `useVirtualList` hook，将虚拟化要求纳入架构基线。
